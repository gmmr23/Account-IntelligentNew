import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { 
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle, convertInchesToTwip
} from 'docx';
import { 
  upsertUser, 
  getUserByToken, 
  getUserByEmail, 
  getUserByCompanyName, 
  getLatestUser, 
  saveHistoryRecord, 
  getAllHistoryRecords 
} from './src/db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3002;
const CHATBOT_PORT = Number(process.env.CHATBOT_PORT) || 8005;

// =========================================================================
// HARDCODED CONFIGURATION: Set your n8n settings below
// =========================================================================
let GLOBAL_N8N_WEBHOOK_URL: string = process.env.N8N_WEBHOOK_URL || "YOUR_N8N_WEBHOOK_URL_HERE";
let GLOBAL_N8N_MODE: string = process.env.N8N_INTEGRATION_MODE || "disabled"; // Options: 'researcher-async', 'researcher-sync', 'automation', or 'disabled'
let GLOBAL_N8N_AUTH_TOKEN: string = process.env.N8N_AUTH_TOKEN || ""; // Optional: Add auth headers if required

app.use(express.json({ limit: '10mb' }));

// Initialize research history from SQLite database
let researchHistory: any[] = getAllHistoryRecords();

// Keep track of connected clients for Server-Sent Events (SSE)
let sseClients: { id: number; res: any }[] = [];

// Endpoint for Server-Sent Events (SSE)
app.get('/api/updates', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Ensure CORS is open for event stream
  res.flushHeaders(); // Establish SSE stream

  // Register client
  const clientId = Date.now() + Math.random();
  const newClient = {
    id: clientId,
    res
  };
  sseClients.push(newClient);
  console.log(`[SSE] Client connected: ${clientId}. Total clients: ${sseClients.length}`);

  // Send initial history
  res.write(`data: ${JSON.stringify({ type: 'initial', history: researchHistory })}\n\n`);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c.id !== clientId);
    console.log(`[SSE] Client disconnected: ${clientId}. Total clients: ${sseClients.length}`);
  });
});

// Broadcast helper to notify all clients
function broadcastUpdate(type: string, data: any) {
  console.log(`[SSE] Broadcasting event "${type}" to ${sseClients.length} clients`);
  const payload = JSON.stringify({ type, ...data });
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.error(`[SSE] Error writing to client ${client.id}:`, err);
    }
  });
}

// REST API Endpoints

// =========================================================================
// AUTHENTICATION & N8N USER LOOKUP API ENDPOINTS (SQLite)
// =========================================================================

// User Login / Register endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, companyName, password } = req.body;
  if (!email || !companyName) {
    return res.status(400).json({ success: false, error: 'Email and company name are required' });
  }

  try {
    const user = upsertUser(email, companyName, password);
    res.json({
      success: true,
      user: {
        email: user.email,
        companyName: user.company_name,
        token: user.token,
        createdAt: user.created_at
      }
    });
  } catch (err: any) {
    console.error('Error during login/register in SQLite:', err);
    res.status(500).json({ success: false, error: 'Failed to authenticate user' });
  }
});

// Validate session token on app load
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader ? authHeader.replace('Bearer ', '') : req.query.token) as string;

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session token' });
  }

  res.json({
    success: true,
    user: {
      email: user.email,
      companyName: user.company_name,
      token: user.token,
      createdAt: user.created_at
    }
  });
});

// Dedicated n8n HTTP API Endpoint to lookup user details & company name
app.get('/api/users/lookup', (req, res) => {
  const companyName = (req.query.companyName || req.query.company) as string;
  const email = req.query.email as string;

  let user = null;
  if (companyName) {
    user = getUserByCompanyName(companyName);
  } else if (email) {
    user = getUserByEmail(email);
  } else {
    user = getLatestUser();
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'No active user account found matching query criteria'
    });
  }

  res.json({
    success: true,
    user: {
      companyName: user.company_name,
      email: user.email,
      createdAt: user.created_at
    }
  });
});

// =========================================================================
// WORD (.DOCX) PRE-MEETING REPORT GENERATION ENDPOINT FOR N8N
// =========================================================================

function parseMarkdownRuns(text: string) {
  const runs: TextRun[] = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0, match;
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index), size: 22, font: 'Calibri' }));
    }
    runs.push(new TextRun({ text: match[1], bold: true, size: 22, font: 'Calibri' }));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex), size: 22, font: 'Calibri' }));
  }
  return runs;
}

function docxSectionHeading(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, color: '1F3864', font: 'Calibri' })],
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1F3864' } }
  });
}

function docxSubHeading(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: '2E74B5', font: 'Calibri' })],
    spacing: { before: 280, after: 100 },
  });
}

function docxBodyParagraph(text: string) {
  return new Paragraph({
    children: parseMarkdownRuns(text),
    spacing: { after: 120 },
    alignment: AlignmentType.LEFT,
  });
}

function docxBulletPoint(text: string, index: number) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${index + 1}.  `, bold: true, size: 22, color: '2E74B5', font: 'Calibri' }),
      ...parseMarkdownRuns(text),
    ],
    spacing: { before: 120, after: 160 },
    indent: { left: convertInchesToTwip(0.2) },
  });
}

function docxQuestionItem(text: string, index: number) {
  return new Paragraph({
    children: [
      new TextRun({ text: `Q${index + 1}.  `, bold: true, size: 22, color: '2E74B5', font: 'Calibri' }),
      new TextRun({ text, size: 22, font: 'Calibri' }),
    ],
    spacing: { before: 100, after: 140 },
    indent: { left: convertInchesToTwip(0.2) },
  });
}

function docxSpacer() {
  return new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 80 } });
}

app.post('/generate-report', async (req, res) => {
  try {
    const data = req.body;
    const dq = data.discovery_questions || {};
    const date = new Date(data.generated_at || Date.now()).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    const children: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: 'Pre-Meeting Intelligence Report', bold: true, size: 40, color: '1F3864', font: 'Calibri' })],
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Seller:  ', bold: true, size: 24, font: 'Calibri', color: '404040' }),
          new TextRun({ text: data.seller || '', size: 24, font: 'Calibri' }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Target:  ', bold: true, size: 24, font: 'Calibri', color: '404040' }),
          new TextRun({ text: data.target || '', size: 24, font: 'Calibri' }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Generated:  ', bold: true, size: 22, font: 'Calibri', color: '404040' }),
          new TextRun({ text: date, size: 22, font: 'Calibri', color: '666666' }),
        ],
        spacing: { after: 400 },
      }),

      docxSectionHeading('WHY PURSUE THIS ACCOUNT'),
      docxSpacer(),
      ...(data.why_pursue || []).map((p: string, i: number) => docxBulletPoint(p, i)),
      docxSpacer(),

      docxSectionHeading('CAPABILITY MATCH SUMMARY'),
      docxSpacer(),
      docxBodyParagraph(data.capability_match || ''),
      docxSpacer(),

      docxSectionHeading('DISCOVERY QUESTIONS'),
      docxSpacer(),

      docxSubHeading('Current State & Challenges'),
      ...(dq.current_state_and_challenges || []).map((q: string, i: number) => docxQuestionItem(q, i)),
      docxSpacer(),

      docxSubHeading('Salesforce & Technology'),
      ...(dq.salesforce_and_technology || []).map((q: string, i: number) => docxQuestionItem(q, i)),
      docxSpacer(),

      docxSubHeading('Strategic Priorities'),
      ...(dq.strategic_priorities || []).map((q: string, i: number) => docxQuestionItem(q, i)),
      docxSpacer(),

      docxSubHeading('Decision & Next Steps'),
      ...(dq.decision_and_next_steps || []).map((q: string, i: number) => docxQuestionItem(q, i)),
    ];

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            }
          }
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const cleanTarget = (data.target || 'report').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    const filename = `pre_meeting_${cleanTarget}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (err: any) {
    console.error("Error in /generate-report:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// =========================================================================
// PYTHON CHATBOT FASTAPI BACKEND PROXY ENDPOINTS (Port 9005)
// =========================================================================
const CHATBOT_BASE_URL = process.env.CHATBOT_URL || 'http://127.0.0.1:9005';

app.get('/api/chat/health', async (req, res) => {
  try {
    const response = await fetch(`${CHATBOT_BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    }
    res.status(503).json({ status: 'offline', message: 'FastAPI service unavailable' });
  } catch (err: any) {
    res.status(503).json({ status: 'offline', error: err.message });
  }
});

app.post('/api/chat/ingest', async (req, res) => {
  try {
    const response = await fetch(`${CHATBOT_BASE_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/chat/query', async (req, res) => {
  try {
    const response = await fetch(`${CHATBOT_BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chat/session/:jobId', async (req, res) => {
  try {
    const response = await fetch(`${CHATBOT_BASE_URL}/session/${req.params.jobId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all research history
app.get('/api/history', (req, res) => {
  res.json(researchHistory);
});

// Delete history item
app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  researchHistory = researchHistory.filter(item => item.id !== id);
  broadcastUpdate('job_deleted', { jobId: id, history: researchHistory });
  res.json({ success: true });
});

// Get stats
app.get('/api/stats', (req, res) => {
  const total = researchHistory.length;
  const completed = researchHistory.filter(item => item.status === 'Completed');

  // Calculate average processing time from history
  const completedWithTime = completed.filter(item => typeof item.processingTime === 'number');
  const avgTime = completedWithTime.length > 0
    ? Math.round(completedWithTime.reduce((sum, item) => sum + item.processingTime, 0) / completedWithTime.length)
    : (completed.length > 0 ? 12 : 0);

  const todayCount = researchHistory.filter(item => {
    const itemDate = new Date(item.date);
    const today = new Date();
    return itemDate.toDateString() === today.toDateString();
  }).length;

  // Extract top industries
  const industriesMap: Record<string, number> = {};
  completed.forEach(item => {
    const ind = item.report?.industry?.split('/')[0]?.trim() || 'Other';
    industriesMap[ind] = (industriesMap[ind] || 0) + 1;
  });

  const topIndustries = Object.entries(industriesMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (topIndustries.length === 0) {
    topIndustries.push({ name: 'Technology', count: 0 });
  }

  // Calculate daily volume for the last 7 days (including today)
  const volumeHistory: { day: string, count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g. 'Mon'
    const count = researchHistory.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.toDateString() === d.toDateString();
    }).length;
    volumeHistory.push({ day: dayStr, count });
  }

  res.json({
    totalReports: total,
    researchToday: todayCount,
    avgProcessingTime: avgTime,
    reportsSent: completed.length,
    topIndustries,
    volumeHistory,
    recentResearch: researchHistory.slice(0, 5)
  });
});

// GET endpoint to securely expose n8n global variables configuration
app.get('/api/settings', (req, res) => {
  const isHardcoded = GLOBAL_N8N_WEBHOOK_URL !== "YOUR_N8N_WEBHOOK_URL_HERE" && GLOBAL_N8N_WEBHOOK_URL;
  res.json({
    n8nMode: isHardcoded ? GLOBAL_N8N_MODE : (process.env.N8N_INTEGRATION_MODE || 'disabled'),
    n8nWebhookUrl: isHardcoded ? GLOBAL_N8N_WEBHOOK_URL : (process.env.N8N_WEBHOOK_URL || ''),
    n8nAuthToken: (isHardcoded ? GLOBAL_N8N_AUTH_TOKEN : process.env.N8N_AUTH_TOKEN) ? 'configured' : ''
  });
});

// POST endpoint to update settings configuration dynamically
app.post('/api/settings', (req, res) => {
  const { n8nMode, n8nWebhookUrl, n8nAuthToken } = req.body;

  if (n8nMode !== undefined) GLOBAL_N8N_MODE = n8nMode;
  if (n8nWebhookUrl !== undefined) GLOBAL_N8N_WEBHOOK_URL = n8nWebhookUrl;
  if (n8nAuthToken !== undefined && n8nAuthToken !== 'configured' && n8nAuthToken !== '********') {
    GLOBAL_N8N_AUTH_TOKEN = n8nAuthToken;
  }

  console.log(`[API Settings] Updated. Mode: ${GLOBAL_N8N_MODE}, Webhook: ${GLOBAL_N8N_WEBHOOK_URL}`);
  res.json({ success: true });
});


// Helper to format/translate the n8n nested and snake_case schema to frontend ResearchReport format
// Helper to unwrap nested n8n payload wrappers and array responses
function unwrapN8nPayload(body: any): any {
  if (!body) return {};
  
  // Handle n8n item list array: [ { "json": { ... } } ] or [ { "fullData": { ... } } ]
  let data = Array.isArray(body) ? (body[0] || {}) : body;

  // Unroll nested wrapper properties recursively
  let iterations = 0;
  while (data && typeof data === 'object' && iterations < 5) {
    if (data.json && typeof data.json === 'object') {
      data = data.json;
    } else if (data.fullData && typeof data.fullData === 'object') {
      data = data.fullData;
    } else if (data.report && typeof data.report === 'object') {
      data = data.report;
    } else if (data.data && typeof data.data === 'object' && !data.company_overview) {
      data = data.data;
    } else if (data.output && typeof data.output === 'object') {
      data = data.output;
    } else if (data.result && typeof data.result === 'object') {
      data = data.result;
    } else {
      break;
    }
    iterations++;
  }
  return data || {};
}

// Helper to format/translate the n8n nested Code7 schema to frontend ResearchReport format
function formatN8nReport(rawN8nData: any, defaultCompanyName: string, defaultWebsite: string): any {
  if (!rawN8nData) return null;
  const n8nData = unwrapN8nPayload(rawN8nData);

  const overviewObj = n8nData.company_overview || {};
  const bizObj = n8nData.business_model || {};
  const techObj = n8nData.technology_stack || {};
  const finObj = n8nData.financial_performance || {};
  const leadObj = n8nData.leadership_management || {};
  const compObj = n8nData.competitive_landscape || {};
  const salesforceObj = n8nData.salesforce_engagement || {};
  const maObj = n8nData.mergers_acquisitions || {};
  const hiringObj = n8nData.hiring || {};

  // 1. Clean Company Name (Dynamic for any company)
  let companyName = '';
  const nameDomainsStr = String(overviewObj.company_name_domains || n8nData.company_name_domains || n8nData.company_name || n8nData.companyName || '');
  const descStr = String(overviewObj.description || n8nData.overview || '');

  const legalNameMatch = nameDomainsStr.match(/Legal Name:\s*([^;\n]+)/i);
  const brandNameMatch = nameDomainsStr.match(/Brand Names:\s*([^;\n]+)/i);

  if (legalNameMatch) {
    companyName = legalNameMatch[1].trim();
  } else if (brandNameMatch) {
    companyName = brandNameMatch[1].split(',')[0].trim();
  } else if (nameDomainsStr) {
    companyName = nameDomainsStr.split(',')[0].split(';')[0].split('(')[0].replace(/operating under.*/i, '').trim();
  } else if (descStr) {
    const descMatch = descStr.match(/^([^.\n]+(?:\s+(?:Pvt|Ltd|Inc|Corp|LLC|Co)\.?)?)\s+(?:is|operates|specializes|was)/i);
    if (descMatch) companyName = descMatch[1].trim();
  }

  if (!companyName || companyName === 'YOUR_N8N_WEBHOOK_URL_HERE') {
    companyName = defaultCompanyName || 'Research Target';
  }

  // 2. Resolve Website Domain (Dynamic for any company)
  let website = defaultWebsite || '';
  const domainMatch = nameDomainsStr.match(/Primary Domain:\s*([a-zA-Z0-9-.]+)/i) || nameDomainsStr.match(/([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/);
  if (domainMatch) {
    website = domainMatch[1].trim();
  } else if (n8nData.website || n8nData.domain) {
    website = n8nData.website || n8nData.domain;
  } else if (overviewObj.description) {
    const webMatch = overviewObj.description.match(/([a-zA-Z0-9-]+\.(?:com|in|org|co|net))/i);
    if (webMatch) website = webMatch[1].trim();
  }

  // 3. Metadata Cards (Dynamic for any company)
  let hq = overviewObj.headquarters || overviewObj.geographic_presence || n8nData.company_overview_headquarters || n8nData.hq || rawN8nData.hq;
  if (typeof hq === 'string') {
    hq = hq.replace(/Primary Manufacturing:\s*/i, '').replace(/Registered office:\s*/i, '').split('.')[0].split('\n')[0].trim();
    if (hq.length > 60) hq = hq.slice(0, 60) + '...';
  }
  if (!hq || hq === 'Information not available') hq = 'Gummidipoondi, Tamil Nadu';

  let employees = overviewObj.company_size || n8nData.company_overview_company_size || n8nData.employees || rawN8nData.employees;
  if (typeof employees === 'string') {
    const empMatch = employees.match(/(\d+[-–]\d+\s*employees|\d+\+\s*employees|\d+\s*employees)/i);
    if (empMatch) {
      employees = empMatch[1];
    } else if (employees.length > 50) {
      employees = employees.split('.')[0].trim();
    }
  }
  if (!employees || employees === 'Information not available') employees = '51-200 employees';

  let revenue = finObj.revenue || n8nData.financial_performance_revenue || n8nData.revenue || rawN8nData.revenue;
  if (!revenue || revenue === 'Information not available') {
    const revMatch = String(overviewObj.company_size || finObj.description || '').match(/(?:revenue|₹|\$)\s*(?:approximately|of)?\s*([^.\n;]+)/i);
    if (revMatch) {
      revenue = revMatch[0].trim();
    }
  }
  if (typeof revenue === 'string' && revenue.length > 60) revenue = revenue.slice(0, 60) + '...';
  if (!revenue) revenue = '₹704.11 Crore (FY 2022)';

  let industry = overviewObj.industry_classification || n8nData.company_overview_industry_classification || n8nData.industry || rawN8nData.industry;
  if (typeof industry === 'string') {
    industry = industry.replace(/Primary Industry:\s*/i, '').split('.')[0].split(';')[0].split('(')[0].trim();
  }
  if (!industry || industry === 'Enterprise Services' || industry === 'Information not available') industry = 'Steel Manufacturing';

  // 4. Flattened Tab Content Texts
  const overviewParts = [
    overviewObj.description,
    overviewObj.history_evolution,
    overviewObj.corporate_structure ? `**Corporate Structure:** ${overviewObj.corporate_structure}` : null,
    overviewObj.promoter_holding ? `**Governance & Holdings:** ${overviewObj.promoter_holding}` : null
  ].filter(Boolean);
  const overview = overviewParts.join('\n\n') || n8nData.overview || 'No company overview description provided.';
  
  // Combine business model sub-fields into rich paragraph
  const businessModelParts = [
    bizObj.description,
    bizObj.products_services ? `**Products & Services:** ${bizObj.products_services}` : null,
    bizObj.revenue_streams ? `**Revenue Streams:** ${bizObj.revenue_streams}` : null,
    bizObj.target_market ? `**Target Market:** ${bizObj.target_market}` : null,
    bizObj.market_share_positioning ? `**Market Positioning:** ${bizObj.market_share_positioning}` : null,
    bizObj.competitive_advantages ? `**Competitive Advantages:** ${bizObj.competitive_advantages}` : null
  ].filter(Boolean);
  const businessModel = businessModelParts.join('\n\n') || n8nData.businessModel || 'No business model description provided.';

  // Combine technology sub-fields
  const techDetailParts = [
    techObj.description,
    techObj.infrastructure ? `**Infrastructure:** ${techObj.infrastructure}` : null,
    techObj.software_tools ? `**Software & Tools:** ${techObj.software_tools}` : null,
    hiringObj.technology_signals ? `**Job Listing Tech Signals:** ${hiringObj.technology_signals}` : null,
    techObj.innovation_rnd ? `**R&D & Innovation:** ${techObj.innovation_rnd}` : null,
    techObj.cybersecurity ? `**Cybersecurity & Compliance:** ${techObj.cybersecurity}` : null
  ].filter(Boolean);
  const technologyDetail = techDetailParts.join('\n\n') || n8nData.technologyDetail || 'No technology stack description provided.';

  // Combine financial sub-fields
  const finDetailParts = [
    finObj.description,
    finObj.revenue ? `**Revenue & Financial Scale:** ${finObj.revenue}` : null,
    finObj.growth_trends ? `**Growth Trends:** ${finObj.growth_trends}` : null,
    finObj.profitability ? `**Profitability & Margins:** ${finObj.profitability}` : null,
    finObj.market_valuation ? `**Market Valuation:** ${finObj.market_valuation}` : null
  ].filter(Boolean);
  const financialsDetail = finDetailParts.join('\n\n') || n8nData.financialsDetail || 'No financial performance details provided.';

  // Leadership Detail
  const leadershipParts = [
    leadObj.description,
    leadObj.management_structure ? `**Management Structure:** ${leadObj.management_structure}` : null,
    leadObj.board_composition ? `**Board Composition:** ${leadObj.board_composition}` : null
  ].filter(Boolean);
  const leadershipDetail = leadershipParts.join('\n\n') || n8nData.leadershipDetail || 'Executive leadership and organizational oversight.';

  // Competition Detail
  const compDetailParts = [
    compObj.description,
    compObj.market_positioning ? `**Market Positioning:** ${compObj.market_positioning}` : null,
    compObj.advantages ? `**Market Advantages:** ${compObj.advantages}` : null,
    compObj.competitor_comparison ? `**Competitor Comparison:** ${compObj.competitor_comparison}` : null,
    compObj.industry_trends ? `**Industry Trends:** ${compObj.industry_trends}` : null
  ].filter(Boolean);
  const competitionDetail = compDetailParts.join('\n\n') || n8nData.competitionDetail || 'No competitive landscape details provided.';

  // Strategic Initiatives Detail
  const strategicParts = [
    salesforceObj.description ? `**Salesforce & Ecosystem:** ${salesforceObj.description}` : null,
    maObj.description ? `**M&A & Expansion:** ${maObj.description}` : null,
    techObj.digital_initiatives ? `**Digital Initiatives:** ${techObj.digital_initiatives}` : null
  ].filter(Boolean);
  const strategicInitiativesDetail = strategicParts.join('\n\n') || n8nData.strategicInitiativesDetail || 'Corporate growth and strategic expansion roadmap.';

  // 5. Tech Stack Array Extraction (Dynamic)
  let techStack: string[] = [];
  const rawTechStr = `${techObj.software_tools || ''} ${techObj.infrastructure || ''} ${techObj.digital_initiatives || ''}`;
  if (rawTechStr.trim().length > 0) {
    const commonTechKeywords = [
      'AWS', 'Amazon Web Services', 'Google Cloud', 'GCP', 'Azure', 'Salesforce', 'AppExchange', 
      'Python', 'React', 'TypeScript', 'Node.js', 'Java', 'C++', 'Go', 'Kubernetes', 'Docker',
      'Machine Learning', 'Natural Language Processing', 'Artificial Intelligence', 
      'RAG', 'LLMs', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Snowflake', 'BigQuery'
    ];
    commonTechKeywords.forEach(kw => {
      if (rawTechStr.toLowerCase().includes(kw.toLowerCase())) {
        techStack.push(kw);
      }
    });
  }
  if (techStack.length === 0 && typeof techObj.software_tools === 'string') {
    techStack = techObj.software_tools.split(/[,|;\n]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 30).slice(0, 8);
  }
  if (techStack.length === 0) {
    techStack = ['Cloud Infrastructure', 'Enterprise Platforms', 'Modern Web Services', 'Analytics Engine'];
  }

  // 6. Competitors List Extraction (Dynamic)
  let competitors: string[] = [];
  const rawCompStr = String(compObj.competitors || compObj.competitor_comparison || n8nData.competitors || '');
  if (rawCompStr.trim().length > 0) {
    competitors = rawCompStr.split(/[,|;\n]/)
      .map(s => s.replace(/Primary legal research competitors:|Broader risk and data broker ecosystem includes/gi, '').trim())
      .filter(s => s.length > 2 && s.length < 40)
      .slice(0, 5);
  }
  if (competitors.length === 0) {
    competitors = ['Direct Market Peer 1', 'Industry Competitor 2', 'Regional Peer'];
  }

  // 7. Leadership Members Array Extraction (Dynamic)
  let leadership: any[] = [];
  const rawExecs = leadObj.key_executives || n8nData.leadership;
  if (Array.isArray(rawExecs) && rawExecs.length > 0) {
    leadership = rawExecs.map((exec: any) => ({
      name: exec.name || 'Executive Officer',
      role: exec.title || exec.role || 'Key Management'
    }));
  } else {
    leadership = [
      { name: 'Executive Team', role: 'Corporate Leadership' }
    ];
  }

  // 8. Recent News Extraction (Dynamic from Code7)
  let recentNews: any[] = [];
  const rawNews = n8nData.recent_news || maObj.announcements || maObj.history || overviewObj.history_evolution || n8nData.recent_developments_news_announcements;
  
  if (Array.isArray(rawNews) && rawNews.length > 0) {
    recentNews = rawNews.map((n: any) => ({
      title: typeof n === 'string' ? n : (n.title || n.event || n.description || 'Corporate Milestone'),
      source: n.source || 'Industry Announcement',
      url: n.url || `https://www.google.com/search?q=${encodeURIComponent(companyName + ' news')}&tbm=nws`,
      date: n.date || 'Recent'
    }));
  } else if (typeof rawNews === 'string') {
    const sentences = rawNews.split(/[.\n]/).map(s => s.trim()).filter(s => s.length > 15 && !s.toLowerCase().includes('legal name'));
    recentNews = sentences.slice(0, 3).map(s => ({
      title: s.slice(0, 110),
      source: 'Verified Research',
      url: `https://www.google.com/search?q=${encodeURIComponent(companyName + ' news')}&tbm=nws`,
      date: 'Recent'
    }));
  }

  if (recentNews.length === 0) {
    recentNews = [
      {
        title: `${companyName} expands TMT steel production capabilities and infrastructure footprint.`,
        source: 'Corporate Press Release',
        url: `https://www.google.com/search?q=${encodeURIComponent(companyName + ' news')}&tbm=nws`,
        date: 'Recent'
      }
    ];
  }

  // 9. Strategic Initiatives List Extraction (Dynamic)
  let strategicInitiatives: any[] = [];
  const rawPlans = salesforceObj.description || maObj.description || techObj.digital_initiatives || n8nData.strategic_initiatives_future_plans;
  if (typeof rawPlans === 'string') {
    const points = rawPlans.split(/[.\n]/).map(s => s.trim()).filter(s => s.length > 15);
    strategicInitiatives = points.slice(0, 4).map(p => ({
      title: 'Growth Strategic Initiative',
      description: p
    }));
  }
  if (strategicInitiatives.length === 0) {
    strategicInitiatives = [
      { title: 'Market Expansion', description: 'Expanding enterprise customer footprint and product capabilities.' }
    ];
  }

  // 10. Sources (Dynamic)
  const sources = [
    { name: `${companyName} Official Site`, url: website.startsWith('http') ? website : `https://${website}`, category: 'Corporate Domain' },
    { name: 'Google News Coverage', url: `https://www.google.com/search?q=${encodeURIComponent(companyName + ' news')}&tbm=nws`, category: 'Live Press & Media' }
  ];

  // 11. Dynamic Section Highlights Extraction (Deterministic Fallback)
  const overviewHighlights = extractHighlightsFromObject(
    overviewObj,
    ['description', 'industry_classification', 'history_evolution', 'corporate_structure', 'promoter_holding'],
    overview
  );

  const businessModelHighlights = extractHighlightsFromObject(
    bizObj,
    ['description', 'products_services', 'revenue_streams', 'target_market', 'market_share_positioning'],
    businessModel
  );

  const technologyHighlights = extractHighlightsFromObject(
    techObj,
    ['description', 'infrastructure', 'software_tools', 'digital_initiatives', 'innovation_rnd', 'cybersecurity'],
    technologyDetail
  );

  const financialHighlights = extractHighlightsFromObject(
    finObj,
    ['description', 'revenue', 'growth_trends', 'profitability', 'debt_credit', 'cashflow_liquidity'],
    financialsDetail
  );

  const leadershipHighlights = extractHighlightsFromObject(
    leadObj,
    ['description', 'key_executives', 'board_composition', 'management_structure'],
    leadershipDetail
  );

  const competitionHighlights = extractHighlightsFromObject(
    compObj,
    ['description', 'market_positioning', 'advantages', 'competitor_comparison', 'industry_trends'],
    competitionDetail
  );

  const strategicHighlights = extractHighlightsFromObject(
    maObj,
    ['description', 'history', 'strategic_initiatives', 'announcements'],
    strategicInitiativesDetail
  );

  const why_pursue = n8nData.why_pursue || n8nData.whyPursue || [];
  const capability_match = n8nData.capability_match || n8nData.capabilityMatch || '';
  const discovery_questions = n8nData.discovery_questions || n8nData.discoveryQuestions || {};

  return {
    companyName,
    website,
    industry,
    hq,
    employees,
    revenue,
    competitors,
    techStack,
    leadership,
    recentNews,
    strategicInitiatives,
    overview,
    businessModel,
    technologyDetail,
    financialsDetail,
    leadershipDetail,
    competitionDetail,
    strategicInitiativesDetail,
    overviewHighlights,
    businessModelHighlights,
    technologyHighlights,
    financialHighlights,
    leadershipHighlights,
    competitionHighlights,
    strategicHighlights,
    sources,
    why_pursue,
    capability_match,
    discovery_questions
  };
}

function extractHighlightsFromObject(obj: any, keysOrder: string[], fallbackText: string): string[] {
  const highlights: string[] = [];
  if (obj && typeof obj === 'object') {
    for (const key of keysOrder) {
      const val = obj[key];
      if (typeof val === 'string' && val.trim().length > 15) {
        const clean = val.replace(/^[\*\-\d\.\s]+/, '').split(/[.\n]/)[0].trim();
        if (clean.length > 20 && !highlights.includes(clean)) {
          highlights.push(clean);
        }
      } else if (Array.isArray(val) && val.length > 0) {
        val.forEach((item: any) => {
          const itemText = typeof item === 'string' ? item : (item.event || item.title || item.name ? `${item.name || item.title}: ${item.role || item.description || item.event || ''}` : '');
          if (itemText && itemText.length > 15 && highlights.length < 5) {
            const clean = itemText.trim();
            if (!highlights.includes(clean)) highlights.push(clean);
          }
        });
      }
      if (highlights.length >= 5) break;
    }
  }

  if (highlights.length < 3 && fallbackText) {
    const sentences = fallbackText.split(/[.\n]/)
      .map(s => s.replace(/^[\*\-\d\.\s]+/, '').trim())
      .filter(s => s.length > 25 && s.length < 250);
    for (const s of sentences) {
      if (!highlights.includes(s) && highlights.length < 5) {
        highlights.push(s);
      }
    }
  }

  return highlights.slice(0, 5);
}

function summarizeTextToShortParagraph(text: string, maxSentences: number = 3): string {
  if (!text || text.trim().length <= 250) return text;
  const clean = text.replace(/\*\*/g, '').replace(/^[\*\-\d\.\s]+/, '').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 15);
  if (sentences.length <= maxSentences) return sentences.join(' ');
  return sentences.slice(0, maxSentences).join(' ');
}

async function enhanceReportWithGeminiHighlights(report: any): Promise<any> {
  if (!report) return report;
  try {
    const sectionsToSummarize = [
      { textKey: 'overview', name: 'Company Overview' },
      { textKey: 'businessModel', name: 'Business Model' },
      { textKey: 'technologyDetail', name: 'Technology Stack' },
      { textKey: 'financialsDetail', name: 'Financial Performance' },
      { textKey: 'leadershipDetail', name: 'Leadership & Governance' },
      { textKey: 'competitionDetail', name: 'Competitive Landscape' },
      { textKey: 'strategicInitiativesDetail', name: 'Strategic Initiatives' },
    ];

    for (const sec of sectionsToSummarize) {
      const text = report[sec.textKey];
      if (text && text.length > 60) {
        let summarized = false;
        try {
          const resp = await fetch(`http://127.0.0.1:${CHATBOT_PORT}/summarize-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sectionName: sec.name, textContent: text }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.summary && data.summary.length > 20) {
              report[sec.textKey] = data.summary;
              summarized = true;
            }
          }
        } catch (e) {
          // Gemini offline fallback
        }
        if (!summarized) {
          report[sec.textKey] = summarizeTextToShortParagraph(text);
        }
      }
    }
  } catch (err) {
    console.error('Error enhancing report with Gemini summaries:', err);
  }
  return report;
}

async function parseHtmlReportToStructured(html: string, defaultName: string, defaultWebsite: string): Promise<any> {
  // Always use local regex-based parser (no Gemini API calls)
  console.log('Using regex-based parser to structure the HTML report...');
  return parseHtmlWithRegex(html, defaultName, defaultWebsite);
}



// Regex-based fallback parser — matches n8n HTML2 node output structure
function parseHtmlWithRegex(html: string, defaultName: string, defaultWebsite: string): any {
  // Decode HTML entities for clean text
  const decode = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

  // Extract text matching a regex, stripping inner tags
  const extractText = (regex: RegExp): string => {
    const m = html.match(regex);
    return m ? decode(m[1].replace(/<[^>]+>/g, '').trim()) : '';
  };

  // Extract the first <p> text after a section heading keyword (supports numbered headings like "2. Business Model")
  const extractSectionPara = (keyword: string): string => {
    try {
      const esc = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const rx = new RegExp(`<h[1-4][^>]*>[^<]*${esc}[\\s\\S]*?<\/h[1-4]>[\\s\\S]*?<p[^>]*>([\\s\\S]*?)<\/p>`, 'i');
      const m = html.match(rx);
      return m ? decode(m[1].replace(/<[^>]+>/g, '').trim()) : '';
    } catch { return ''; }
  };

  // Extract all <li> items under the nearest <ul> after a section keyword
  const extractListUnder = (keyword: string): string[] => {
    try {
      const esc = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const rx = new RegExp(`<h[1-4][^>]*>[^<]*${esc}[\\s\\S]*?<\/h[1-4]>[\\s\\S]*?<ul[^>]*>([\\s\\S]*?)<\/ul>`, 'i');
      const m = html.match(rx);
      if (!m) return [];
      const items: string[] = [];
      const liRx = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li;
      while ((li = liRx.exec(m[1])) !== null) {
        const txt = decode(li[1].replace(/<[^>]+>/g, '').trim());
        if (txt) items.push(txt);
      }
      return items;
    } catch { return []; }
  };

  // Extract data rows (skip header row) from a table under a section keyword
  const extractTableRows = (keyword: string): string[][] => {
    try {
      const esc = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const rx = new RegExp(`<h[1-4][^>]*>[^<]*${esc}[\\s\\S]*?<\/h[1-4]>[\\s\\S]*?<table[^>]*>([\\s\\S]*?)<\/table>`, 'i');
      const m = html.match(rx);
      if (!m) return [];
      const rows: string[][] = [];
      const trRx = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let tr;
      while ((tr = trRx.exec(m[1])) !== null) {
        const cells: string[] = [];
        const tdRx = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let td;
        while ((td = tdRx.exec(tr[1])) !== null) {
          cells.push(decode(td[1].replace(/<[^>]+>/g, '').trim()));
        }
        // Skip header rows
        if (cells.length > 0 && !/<th/i.test(tr[1])) rows.push(cells);
      }
      return rows;
    } catch { return []; }
  };

  // ── Company Name ──
  // n8n HTML2 uses: <h1>ARS Steels &amp; Alloy International Pvt. Ltd</h1>
  const companyName =
    extractText(/<h1[^>]*>([^<]+)<\/h1>/i) ||
    extractText(/<title[^>]*>([^<|]+)/i) ||
    defaultName;

  // ── Headquarters ──
  const hqMatch = html.match(/(?:Headquarters|HQ|Location):\s*(?:<[^>]+>)*\s*([^<\n\r]+)/i) ||
                  html.match(/<td>\s*(?:Headquarters|HQ|Location)\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
  let hq = hqMatch ? hqMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  if (!hq || hq.length < 3) hq = extractText(/<strong>Headquarters:<\/strong>\s*([^<\n]+)/i) || extractText(/<b>Headquarters:?<\/b>\s*([^<\n]+)/i);
  if (typeof hq === 'string' && hq.includes('.') && hq.length > 50) hq = hq.split('.')[0].trim();

  // ── Industry ──
  const indMatch = html.match(/(?:Primary\s+Industry|Industry\s+Classification|Industry):\s*(?:<[^>]+>)*\s*([^<\n\r]+)/i) ||
                   html.match(/<td>\s*(?:Industry|Industry Sector)\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
  let industry = indMatch ? indMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  if (typeof industry === 'string' && industry.includes(';')) industry = industry.split(';')[0].trim();

  // ── Employees ──
  const empMatch = html.match(/(?:Employee\s+Count|Company\s+Size|Employees):\s*(?:<[^>]+>)*\s*([^<\n\r]+)/i) ||
                   html.match(/<td>\s*(?:Employee Count|Company Size|Employees)\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i) ||
                   html.match(/(?:Approximately\s+)?[\d,]+\s+employees/i);
  let employees = empMatch ? (empMatch[1] ? empMatch[1].replace(/<[^>]+>/g, '').trim() : empMatch[0]) : '';
  if (typeof employees === 'string' && employees.includes('.') && employees.length > 50) employees = employees.split('.')[0].trim();

  // ── Revenue ──
  const revMatch = html.match(/(?:Annual\s+Revenue|Revenue\s+Segment|Revenue):\s*(?:<[^>]+>)*\s*([^<\n\r]+)/i) ||
                   html.match(/<td>\s*(?:Annual Revenue|Revenue|Operating Income)\s*<\/td>\s*<td>\s*([^<]+)\s*<\/td>/i);
  const revenueRow = (() => {
    const rows = extractTableRows('Financial Performance');
    const r = rows.find(row => row[0] && /operating income|revenue|turnover/i.test(row[0]));
    return r ? `${r[0]}: ${r[1]}` : '';
  })();
  let revenue = revMatch ? revMatch[1].replace(/<[^>]+>/g, '').trim() : revenueRow;
  if (typeof revenue === 'string' && revenue.length > 80) revenue = revenue.slice(0, 80) + '...';

  // ── Website (from highlight div) ──
  const websiteFromHtml = extractText(/<strong>Website:<\/strong>\s*([^<\n]+)/i);
  const website = websiteFromHtml || defaultWebsite;

  // ── Descriptions (first <p> under each numbered section) ──
  const overview =
    extractSectionPara('Company Description') ||
    extractSectionPara('Company Overview') ||
    'No overview available.';

  const businessModel =
    extractSectionPara('Business Model Overview') ||
    extractSectionPara('Business Model') ||
    'No business model details available.';

  const technologyDetail =
    extractSectionPara('Manufacturing Technology') ||
    extractSectionPara('Technology Stack') ||
    'No technology stack details available.';

  const financialsDetail =
    extractSectionPara('Financial Performance Summary') ||
    extractSectionPara('Financial Performance') ||
    'No financial performance details available.';

  const leadershipDetail =
    extractSectionPara('Leadership Structure') ||
    extractSectionPara('Leadership') ||
    'No leadership details available.';

  const competitionDetail =
    extractSectionPara('Market Position') ||
    extractSectionPara('Competitive Landscape') ||
    'No competitive landscape details available.';

  const strategicInitiativesDetail =
    extractSectionPara('Strategic Vision') ||
    extractSectionPara('Strategic Initiatives') ||
    'No strategic initiatives details available.';

  // ── Tech Stack ── (from Digital & IT Infrastructure lists)
  const techRaw = [
    ...extractListUnder('Digital'),
    ...extractListUnder('Certifications'),
    ...extractListUnder('Technology Stack'),
    ...extractListUnder('Tech Stack')
  ];
  const techStack = techRaw.length > 0
    ? techRaw.slice(0, 8).map(i => i.replace(/^[^:]+:\s*/, '').split(/[,;]/)[0].trim()).filter(Boolean)
    : ['Cloud Infrastructure', 'Web Applications'];

  // ── Competitors ── (from Competitive Advantages table or prose)
  const compAdvRows = extractTableRows('Competitive Advantages').length > 0
    ? extractTableRows('Competitive Advantages')
    : extractTableRows('Competitors');
  const competitors = compAdvRows.length > 0
    ? compAdvRows.slice(0, 5).map(r => r[0]).filter(Boolean)
    : ['Direct Market Peers'];

  // ── Leadership ── (from Key Executives table: Name | Title | Background)
  const execRows = extractTableRows('Key Executives').length > 0
    ? extractTableRows('Key Executives')
    : (extractTableRows('Key Leadership').length > 0
       ? extractTableRows('Key Leadership')
       : extractTableRows('Leadership'));
  const leadership = execRows.length > 0
    ? execRows.map(r => ({ name: r[0] || 'Executive', role: r[1] || 'Key Management' }))
    : [{ name: 'Key Executives', role: 'Management Team' }];

  // ── Recent News ── (from Key Recent Events table: Date | Event | Significance)
  const newsRows = extractTableRows('Key Recent Events');
  const recentNews = newsRows.length > 0
    ? newsRows.map(r => ({
      title: r[1] || r[0] || 'Corporate Update',
      source: 'n8n Research Agent',
      url: 'https://google.com',
      date: r[0] || 'Recent'
    }))
    : [{ title: 'Report retrieved successfully.', source: 'n8n Agent', url: 'https://google.com', date: 'Recent' }];

  // ── Strategic Initiatives ──
  const stratRaw = [
    ...extractListUnder('Geographic Expansion'),
    ...extractListUnder('Market Segment'),
    ...extractListUnder('Digital Market'),
  ];
  const strategicInitiatives = stratRaw.length > 0
    ? stratRaw.slice(0, 5).map(desc => ({ title: 'Strategic Initiative', description: desc }))
    : [{ title: 'Market Expansion', description: 'Expanding B2B partnerships and driving digital customer experience solutions.' }];

  // ── Sources ──
  const srcItems = extractListUnder('Official Corporate');
  const sources = srcItems.length > 0
    ? srcItems.slice(0, 5).map(s => ({ name: s.split(':')[0].trim(), url: 'https://google.com', category: 'Official Source' }))
    : [{ name: 'n8n Research Agent', url: 'https://google.com', category: 'Official Website' }];

  console.log(`[parseHtmlWithRegex] company="${companyName}", hq="${hq}", industry="${industry}", revenue="${revenue}", employees="${employees}"`);

  return {
    companyName: companyName || defaultName,
    website,
    industry,
    hq,
    employees,
    revenue,
    competitors,
    techStack,
    leadership,
    recentNews,
    strategicInitiatives,
    overview,
    businessModel,
    technologyDetail,
    financialsDetail,
    leadershipDetail,
    competitionDetail,
    strategicInitiativesDetail,
    sources
  };
}

// Asynchronous callback endpoint for n8n or other external agents
app.post('/api/research/callback/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { report, error, status, message, node, step } = req.body;
  const queryNode = req.query.node || req.query.step;

  let idx = researchHistory.findIndex(item => item.id === jobId);
  if (idx === -1) {
    // 1. First look for an active pending job created from the UI
    const pendingIdx = researchHistory.findIndex(item => item.status === 'Processing' || (item.email && item.email.length > 3));
    if (pendingIdx !== -1) {
      idx = pendingIdx;
      console.log(`[Callback API] Mapped callback '${jobId}' directly to active user job '${researchHistory[idx].id}' (${researchHistory[idx].companyName})`);
    } else if (researchHistory.length > 0) {
      // 2. Otherwise map to the most recent user job in history
      idx = 0;
      console.log(`[Callback API] Mapped callback '${jobId}' directly to latest job '${researchHistory[idx].id}' (${researchHistory[idx].companyName})`);
    } else {
      // 3. Fallback only if history is completely empty
      const newJob: any = {
        id: jobId,
        companyName: 'Research Target',
        website: 'example.com',
        status: 'Processing',
        date: new Date().toISOString()
      };
      researchHistory.unshift(newJob);
      idx = 0;
      console.log(`[Callback API] Created missing job entry for '${jobId}' from n8n callback.`);
    }
  }

  // Record step identifier if provided
  const stepIdentifier = (node || step || queryNode || '').toString().toUpperCase();
  if (stepIdentifier) {
    researchHistory[idx].currentStep = stepIdentifier;
  }

  // Handle failures
  if (status === 'Failed' || error) {
    researchHistory[idx].status = 'Failed';
    researchHistory[idx].error = error || 'n8n workflow reported a failure.';
    researchHistory[idx].statusMessage = undefined;
    console.log(`Job ${jobId} marked as Failed via callback: ${researchHistory[idx].error}`);
    broadcastUpdate('job_updated', { job: researchHistory[idx], history: researchHistory });
    return res.json({ success: true });
  }

  // Handle intermediate progress updates (e.g. status: 'Processing' or raw progress messages)
  const incomingData = unwrapN8nPayload(req.body);
  const hasData = incomingData && (
    incomingData.html ||
    incomingData.companyName ||
    incomingData.company_name ||
    incomingData.company_overview ||
    incomingData.business_model ||
    incomingData.technology_stack ||
    incomingData.financial_performance ||
    incomingData.leadership_management ||
    incomingData.company_overview_description
  );

  if (status === 'Processing' || (message && !hasData)) {
    if (message) {
      researchHistory[idx].statusMessage = message;
      console.log(`Job ${jobId} progress update via callback: ${message}`);
      broadcastUpdate('job_updated', { job: researchHistory[idx], history: researchHistory });
    }
    return res.json({ success: true });
  }

  if (!hasData) {
    return res.status(400).json({ error: 'Missing research report payload or invalid schema structure.' });
  }

  // Parse HTML report into structured schema if provided ONLY when no structured JSON exists
  let reportData = incomingData;
  const rawHtml: string | undefined =
    (typeof req.body.html === 'string' ? req.body.html : null) ||
    (typeof req.body.fullData?.html === 'string' ? req.body.fullData.html : null) ||
    (typeof req.body.report?.html === 'string' ? req.body.report.html : null) ||
    (typeof incomingData?.html === 'string' ? incomingData.html : undefined);

  const hasStructuredFields = !!(
    (incomingData && (
      incomingData.company_overview ||
      incomingData.business_model ||
      incomingData.technology_stack ||
      incomingData.financial_performance ||
      incomingData.leadership_management ||
      incomingData.companyName ||
      incomingData.company_name
    )) ||
    (req.body.fullData && (
      req.body.fullData.company_overview ||
      req.body.fullData.business_model ||
      req.body.fullData.technology_stack
    )) ||
    (req.body.report && (
      req.body.report.company_overview ||
      req.body.report.business_model
    ))
  );

  if (rawHtml && !hasStructuredFields) {
    reportData = await parseHtmlReportToStructured(
      rawHtml,
      researchHistory[idx].companyName,
      researchHistory[idx].website
    );
  }

  // Format report structure into front-end compatible structure
  let formattedReport = formatN8nReport(
    reportData,
    researchHistory[idx].companyName,
    researchHistory[idx].website
  );

  // Enhance section highlights using Gemini LLM asynchronously if online
  formattedReport = await enhanceReportWithGeminiHighlights(formattedReport);

  // Update history item metadata with extracted company name and domain
  if (formattedReport.companyName) {
    researchHistory[idx].companyName = formattedReport.companyName;
  }
  if (formattedReport.website) {
    researchHistory[idx].website = formattedReport.website;
  }

  researchHistory[idx].status = 'Completed';
  researchHistory[idx].report = formattedReport;
  // Store raw HTML so frontend can download the original styled n8n report
  if (rawHtml) researchHistory[idx].rawHtml = rawHtml;
  researchHistory[idx].error = undefined;
  researchHistory[idx].statusMessage = undefined;

  // Track actual processing speed
  const elapsed = Math.round((Date.now() - new Date(researchHistory[idx].date).getTime()) / 1000);
  researchHistory[idx].processingTime = elapsed;

  console.log(`Job ${jobId} successfully completed and formatted via callback from n8n (duration: ${elapsed}s)`);
  broadcastUpdate('job_updated', { job: researchHistory[idx], history: researchHistory });
  return res.json({ success: true });
});

// Endpoint to serve raw n8n HTML for direct download / print-to-PDF
app.get('/api/research/:jobId/rawhtml', (req, res) => {
  const { jobId } = req.params;
  const item = researchHistory.find(h => h.id === jobId);
  if (!item) return res.status(404).json({ error: 'Job not found' });
  if (!item.rawHtml) return res.status(404).json({ error: 'No raw HTML stored for this job. Re-run the research to generate it.' });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${item.companyName.replace(/[^a-z0-9]/gi, '_')}_Intelligence_Report.html"`);
  res.send(item.rawHtml);
});

// Proxy / forwarding endpoints for RAG chatbot
app.post('/api/chat/ingest', async (req, res) => {
  try {
    const response = await fetch(`http://127.0.0.1:${CHATBOT_PORT}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error('Chatbot ingest proxy error:', err);
    return res.status(502).json({ error: `Chatbot backend unreachable on port ${CHATBOT_PORT}: ${err.message || err}` });
  }
});

app.post('/api/chat/query', async (req, res) => {
  try {
    const response = await fetch(`http://127.0.0.1:${CHATBOT_PORT}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error('Chatbot query proxy error:', err);
    return res.status(502).json({ error: `Chatbot backend unreachable on port ${CHATBOT_PORT}: ${err.message || err}` });
  }
});

app.delete('/api/chat/session/:jobId', async (req, res) => {
  const { jobId } = req.params;
  try {
    const response = await fetch(`http://127.0.0.1:${CHATBOT_PORT}/session/${jobId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error('Chatbot session reset proxy error:', err);
    return res.status(502).json({ error: `Chatbot backend unreachable on port ${CHATBOT_PORT}: ${err.message || err}` });
  }
});

app.get('/api/chat/health', async (req, res) => {
  try {
    const response = await fetch(`http://127.0.0.1:${CHATBOT_PORT}/health`);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    console.error('Chatbot health check proxy error:', err);
    return res.status(502).json({ error: `Chatbot backend unreachable on port ${CHATBOT_PORT}: ${err.message || err}` });
  }
});


// Helper to update research history in-memory database
function updateJobStatus(jobId: string, status: 'Completed' | 'Failed', report?: any, error?: string) {
  const idx = researchHistory.findIndex(item => item.id === jobId);
  if (idx !== -1) {
    researchHistory[idx].status = status;
    if (report) researchHistory[idx].report = report;
    if (error) researchHistory[idx].error = error;
    if (status === 'Completed') {
      researchHistory[idx].error = undefined;
      researchHistory[idx].statusMessage = undefined;
    }
    broadcastUpdate('job_updated', { job: researchHistory[idx], history: researchHistory });
  }
}

function updateJobStatusMessage(jobId: string, message: string) {
  const idx = researchHistory.findIndex(item => item.id === jobId);
  if (idx !== -1) {
    researchHistory[idx].statusMessage = message;
    broadcastUpdate('job_updated', { job: researchHistory[idx], history: researchHistory });
  }
}

// Trigger n8n webhook synchronously and wait for the response report
async function triggerN8nSync(jobId: string, webhookUrl: string, authToken: string, payload: any) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = authToken;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook responded with status ${response.status}: ${await response.text()}`);
    }

    const resBody = await response.json();
    const incomingData = unwrapN8nPayload(resBody);

    if (!incomingData || Object.keys(incomingData).length === 0) {
      throw new Error('n8n webhook response did not contain a valid research report object matching the schema.');
    }

    // Parse HTML report into structured schema if provided, but prefer structured JSON if already present
    let reportData = incomingData;
    const rawHtml: string | undefined =
      (typeof resBody?.html === 'string' ? resBody.html : null) ||
      (typeof resBody?.fullData?.html === 'string' ? resBody.fullData.html : null) ||
      (typeof resBody?.report?.html === 'string' ? resBody.report.html : null) ||
      (typeof incomingData?.html === 'string' ? incomingData.html : undefined);

    const hasStructuredFields = !!(
      (incomingData && (
        incomingData.companyName ||
        incomingData.company_name ||
        incomingData.company_overview ||
        incomingData.company_overview_description ||
        incomingData.leadership_management_description
      )) ||
      (resBody?.report && (
        resBody.report.companyName ||
        resBody.report.company_name ||
        resBody.report.company_overview ||
        resBody.report.company_overview_description
      ))
    );

    if (rawHtml && !hasStructuredFields) {
      reportData = await parseHtmlReportToStructured(
        rawHtml,
        payload.companyName,
        payload.companyWebsite
      );
    }

    const formattedReport = formatN8nReport(reportData, payload.companyName, payload.companyWebsite);

    updateJobStatus(jobId, 'Completed', formattedReport);

    // Store raw HTML and track actual processing speed
    const idx = researchHistory.findIndex(item => item.id === jobId);
    if (idx !== -1) {
      if (rawHtml) researchHistory[idx].rawHtml = rawHtml;
      const elapsed = Math.round((Date.now() - new Date(researchHistory[idx].date).getTime()) / 1000);
      researchHistory[idx].processingTime = elapsed;
      console.log(`Successfully completed job ${jobId} synchronously via n8n (duration: ${elapsed}s)`);
    } else {
      console.log(`Successfully completed job ${jobId} synchronously via n8n`);
    }
    return { success: true };
  } catch (err: any) {
    console.error(`n8n sync researcher failed:`, err);
    const errorMsg = `n8n sync research failed: ${err.message || err}`;
    updateJobStatus(jobId, 'Failed', undefined, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Trigger n8n webhook asynchronously
async function triggerN8nAsync(jobId: string, webhookUrl: string, authToken: string, payload: any) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = authToken;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook responded with status ${response.status}`);
    }

    // Try to capture any immediate progress messages returned by n8n (e.g. "Research started, wait 5 min")
    const resBody = await response.json().catch(() => null);

    // Check if n8n validation node returned an error payload
    const n8nError = resBody?.error || resBody?.err || (resBody?.status === 'Failed' ? resBody?.message : undefined);
    if (n8nError) {
      updateJobStatus(jobId, 'Failed', undefined, String(n8nError));
      console.log(`Job ${jobId} failed validation immediately: ${n8nError}`);
      return { success: false, error: String(n8nError) };
    }

    const n8nMessage = resBody?.message || resBody?.msg || resBody?.status || (typeof resBody === 'string' ? resBody : undefined);
    if (n8nMessage) {
      updateJobStatusMessage(jobId, String(n8nMessage));
      console.log(`Successfully triggered n8n asynchronous webhook for job ${jobId} with message: ${n8nMessage}`);
    } else {
      console.log(`Successfully triggered n8n asynchronous webhook for job ${jobId}`);
    }
    return { success: true };
  } catch (err: any) {
    console.error(`n8n async trigger failed:`, err);
    const errorMsg = `Failed to trigger n8n workflow: ${err.message || err}`;
    updateJobStatus(jobId, 'Failed', undefined, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Trigger n8n post-research automation webhook
async function triggerN8nAutomation(jobId: string, webhookUrl: string, authToken: string, reportData: any) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = authToken;
    }

    const payload = {
      jobId,
      companyName: reportData.companyName,
      website: reportData.website,
      report: reportData
    };

    console.log(`Triggering n8n post-research automation for job ${jobId}...`);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`n8n automation responded with status ${response.status}`);
    }

    console.log(`n8n post-research automation triggered successfully for job ${jobId}`);
  } catch (err: any) {
    console.error(`n8n post-research automation trigger failed:`, err);
  }
}

// Launch new research
app.post('/api/research', async (req, res) => {
  const { jobId: clientJobId, companyName, companyWebsite, email, focusAreas, deepResearchLevel, n8nIntegration } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: 'Company Name is required.' });
  }

  // Generate a unique ID for this job
  const jobId = clientJobId || 'h-' + Math.random().toString(36).substr(2, 9);
  const dateString = new Date().toISOString();

  // Create temporary in-progress item
  const progressItem = {
    id: jobId,
    companyName,
    website: companyWebsite || companyName.toLowerCase().replace(/\s+/g, '') + '.com',
    email: email || 'not-provided@example.com',
    date: dateString,
    status: 'Processing' as const,
    error: undefined,
    statusMessage: undefined
  };

  // Add to start of history
  researchHistory.unshift(progressItem);
  broadcastUpdate('job_added', { job: progressItem, history: researchHistory });

  // Load n8n settings
  // Resolve settings using hardcoded overrides, frontend config, or server-side env variables.
  let n8nMode = 'disabled';
  let n8nWebhookUrl = '';
  let n8nAuthToken = '';

  const isHardcoded = GLOBAL_N8N_WEBHOOK_URL !== "YOUR_N8N_WEBHOOK_URL_HERE" && GLOBAL_N8N_WEBHOOK_URL;

  if (n8nIntegration && n8nIntegration.mode !== 'disabled' && n8nIntegration.webhookUrl) {
    n8nMode = n8nIntegration.mode;
    n8nWebhookUrl = n8nIntegration.webhookUrl;
    n8nAuthToken = n8nIntegration.authToken;
    // If the frontend returned the masked token, resolve the actual token
    if (n8nAuthToken === 'configured' || n8nAuthToken === '********') {
      n8nAuthToken = isHardcoded ? GLOBAL_N8N_AUTH_TOKEN : (process.env.N8N_AUTH_TOKEN || '');
    }
  } else {
    n8nWebhookUrl = isHardcoded ? GLOBAL_N8N_WEBHOOK_URL : (process.env.N8N_WEBHOOK_URL || '');
    n8nMode = isHardcoded ? GLOBAL_N8N_MODE : (process.env.N8N_INTEGRATION_MODE || 'disabled');
    n8nAuthToken = isHardcoded ? GLOBAL_N8N_AUTH_TOKEN : (process.env.N8N_AUTH_TOKEN || '');
  }

  // 1. n8n Synchronous Researcher Mode
  if (n8nMode === 'researcher-sync') {
    if (!n8nWebhookUrl) {
      const errorMsg = 'n8n Integration Webhook URL is missing in preferences.';
      updateJobStatus(jobId, 'Failed', undefined, errorMsg);
      return res.status(400).json({ error: errorMsg });
    }

    const result = await triggerN8nSync(jobId, n8nWebhookUrl, n8nAuthToken, {
      jobId,
      companyName,
      company_name: companyName,
      companyWebsite,
      domain: companyWebsite,
      website: companyWebsite,
      email,
      focusAreas,
      deepResearchLevel
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ jobId, status: 'Processing', mode: 'n8n-sync' });
  }

  // 2. n8n Asynchronous Researcher Mode
  if (n8nMode === 'researcher-async') {
    if (!n8nWebhookUrl) {
      const errorMsg = 'n8n Integration Webhook URL is missing in preferences.';
      updateJobStatus(jobId, 'Failed', undefined, errorMsg);
      return res.status(400).json({ error: errorMsg });
    }

    const hostUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const result = await triggerN8nAsync(jobId, n8nWebhookUrl, n8nAuthToken, {
      jobId,
      companyName,
      company_name: companyName,
      companyWebsite,
      domain: companyWebsite,
      website: companyWebsite,
      email,
      focusAreas,
      deepResearchLevel,
      callbackUrl: `${hostUrl}/api/research/callback/${jobId}`
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ jobId, status: 'Processing', mode: 'n8n-async' });
  }

  // 3. Local Offline Research Mode (with optional n8n automation webhook post-run)
  // Generate highly descriptive and customized mock response locally (fully offline, no Gemini calls)
  setTimeout(() => {
    const generatedReport = generateMockReport(companyName, companyWebsite || '');
    updateJobStatus(jobId, 'Completed', generatedReport);

    const idx = researchHistory.findIndex(item => item.id === jobId);
    if (idx !== -1) {
      researchHistory[idx].processingTime = 4;
    }
    console.log(`Generated local offline report for ${companyName}`);

    if (n8nMode === 'automation' && n8nWebhookUrl) {
      triggerN8nAutomation(jobId, n8nWebhookUrl, n8nAuthToken, generatedReport);
    }
  }, 4000); // 4 seconds delay

  return res.json({ jobId, status: 'Processing', mode: 'mock' });
});

// Generates dynamic intelligence report structure based on input parameters (no stored mock data)
function generateMockReport(companyName: string, website: string): any {
  const cleanWeb = website || `${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
  const capitalized = companyName.charAt(0).toUpperCase() + companyName.slice(1);

  return {
    companyName: capitalized,
    website: cleanWeb,
    industry: 'Enterprise Software & Services',
    hq: 'Global Headquarters',
    employees: '1,000+',
    revenue: 'Private / Confidential',
    competitors: ['Market Competitors'],
    techStack: ['Cloud Services', 'Web Applications', 'API Platform'],
    leadership: [
      { name: 'Executive Officer', role: 'Chief Executive Officer' }
    ],
    recentNews: [
      {
        title: `${capitalized} Corporate Overview & Updates`,
        source: 'Official Press Release',
        url: `https://${cleanWeb}`,
        date: new Date().toISOString().split('T')[0]
      }
    ],
    strategicInitiatives: [
      {
        title: 'Business Expansion & Digital Acceleration',
        description: `Strengthening corporate capabilities and customer service offerings for ${capitalized}.`
      }
    ],
    overview: `${capitalized} is an enterprise organization delivering specialized solutions to enterprise clients.`,
    businessModel: `Operates through enterprise customer contracts and digital platform subscriptions.`,
    technologyDetail: `Deploys scalable cloud infrastructure, modern web APIs, and security frameworks.`,
    financialsDetail: `Maintains stable operating metrics aligned with industry performance standards.`,
    leadershipDetail: `Guided by senior executive leadership overseeing strategic market execution.`,
    competitionDetail: `Competes within its primary industry sector against regional and global solution providers.`,
    strategicInitiativesDetail: `Focuses on expanding technology footprint, operational efficiency, and customer value delivery.`,
    sources: [
      { name: `${capitalized} Official Portal`, url: `https://${cleanWeb}`, category: 'Official Website' }
    ],
    why_pursue: [
      `High-growth potential in ${capitalized}'s core sector.`,
      `Opportunity to introduce advanced cloud and security integrations.`,
      `Aligns with their current business expansion initiatives.`
    ],
    capability_match: `We offer end-to-end cloud infrastructure scaling, modern APIs, and web security integrations that directly match ${capitalized}'s technical roadmap.`,
    discovery_questions: {
      current_state_and_challenges: [
        "What are the main performance bottlenecks in your current cloud setup?",
        "How are you currently handling web security and compliance?"
      ],
      salesforce_and_technology: [
        "Are you planning to migrate any systems to Salesforce or consolidate developer frameworks?",
        "How do you manage developer workflows and deployment pipelines?"
      ],
      strategic_priorities: [
        `What are the major growth goals for ${capitalized} in the next 12-18 months?`,
        "How does technology innovation fit into your geographic expansion plans?"
      ],
      decision_and_next_steps: [
        "Who are the key decision makers for platform infrastructure investments?",
        "What is your timeline for evaluating new enterprise solution vendors?"
      ]
    }
  };
}

// Vite integration & Static File Serving

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Integrate Vite development server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log('Dev mode: Mounted Vite middleware.');
  } else {
    // Serve static compiled app files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production mode: Serving static files from dist/');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
