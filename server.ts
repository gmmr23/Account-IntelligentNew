import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

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

// Memory database for research history
let researchHistory: any[] = [];

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
function formatN8nReport(n8nData: any, defaultCompanyName: string, defaultWebsite: string): any {
  if (!n8nData) return null;

  const overviewObj = n8nData.company_overview || {};
  const bizObj = n8nData.business_model || {};
  const techObj = n8nData.technology_stack || {};
  const finObj = n8nData.financial_performance || {};

  // Clean company name
  let companyName = overviewObj.company_name_domains || n8nData.company_name || n8nData.companyName || defaultCompanyName;
  if (typeof companyName === 'string' && companyName.includes('(')) {
    companyName = companyName.split('(')[0].trim();
  }

  // Resolve website
  let website = defaultWebsite;
  const webMatch = String(overviewObj.company_name_domains || n8nData.company_name_domains || '').match(/([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/);
  if (webMatch) {
    website = webMatch[1];
  } else if (n8nData.website || n8nData.companyWebsite || n8nData.domain) {
    website = n8nData.website || n8nData.companyWebsite || n8nData.domain;
  }

  // Flattened texts
  const overview = overviewObj.description || n8nData.company_overview_description || n8nData.overview || 'No overview available.';
  const businessModel = bizObj.description || n8nData.business_model_description || n8nData.businessModel || 'No business model description available.';
  const technologyDetail = techObj.description || n8nData.technology_stack_description || n8nData.technologyDetail || 'No technology stack description available.';
  const financialsDetail = finObj.description || n8nData.financial_performance_description || n8nData.financialsDetail || 'No financial performance description available.';
  const leadershipDetail = n8nData.leadership_management_description || n8nData.leadershipDetail || 'No leadership details available.';
  const competitionDetail = n8nData.competitive_landscape_description || n8nData.competitionDetail || 'No competitive landscape details available.';
  const strategicInitiativesDetail = n8nData.strategic_initiatives_description || n8nData.strategicInitiativesDetail || 'No strategic initiatives details available.';

  // Metadata
  const hq = overviewObj.headquarters || n8nData.company_overview_headquarters || n8nData.hq || 'Information not available';
  const employees = overviewObj.company_size || n8nData.company_overview_company_size || n8nData.employees || n8nData.company_size || 'Information not available';
  const revenue = finObj.revenue || n8nData.financial_performance_revenue || n8nData.revenue || 'Information not available';
  const industry = overviewObj.industry_classification || n8nData.company_overview_industry_classification || n8nData.industry || 'Enterprise Services';

  // Process tech stack (from comma/semicolon/pipe list or array)
  let techStack: string[] = [];
  const rawTech = techObj.software_tools || techObj.infrastructure || n8nData.technology_stack_software_tools || n8nData.technology_stack_infrastructure || n8nData.techStack;
  if (typeof rawTech === 'string') {
    techStack = rawTech.split(/[,|;\n]/).map((s: string) => s.trim()).filter(Boolean);
  } else if (Array.isArray(rawTech)) {
    techStack = rawTech;
  }
  if (techStack.length === 0) {
    techStack = ['Cloud Infrastructure', 'Web Applications'];
  }

  // Process competitors
  let competitors: string[] = [];
  const rawComp = n8nData.competitive_landscape_competitors || n8nData.competitive_landscape_competitor_comparison || n8nData.competitors;
  if (typeof rawComp === 'string') {
    competitors = rawComp.split(/[,|;\n]/).map((s: string) => s.trim()).filter(Boolean);
  } else if (Array.isArray(rawComp)) {
    competitors = rawComp;
  }
  if (competitors.length === 0) {
    competitors = ['Direct Market Peers'];
  }

  // Process leadership members
  let leadership: any[] = [];
  const rawExecs = n8nData.leadership_management_key_executives || n8nData.leadership;
  if (Array.isArray(rawExecs)) {
    leadership = rawExecs.map((exec: any) => ({
      name: exec.name || 'Executive',
      role: exec.title || exec.role || 'Key Management'
    }));
  }
  if (leadership.length === 0) {
    leadership = [
      { name: 'Key Executives', role: 'Management Team' }
    ];
  }

  // Process recent news
  let recentNews: any[] = [];
  const rawNews = n8nData.recent_developments_news_announcements || n8nData.recentNews;
  if (Array.isArray(rawNews)) {
    recentNews = rawNews.map((n: any) => ({
      title: n.event || n.title || 'Corporate Update',
      source: 'Verified Report',
      url: n.url || 'https://google.com',
      date: n.date || 'Recent'
    }));
  }
  if (recentNews.length === 0) {
    recentNews = [
      { title: 'Grounded intelligence update retrieved.', source: 'Research Agent', url: 'https://google.com', date: 'Recent' }
    ];
  }

  // Process strategic initiatives
  let strategicInitiatives: any[] = [];
  const rawPlans = n8nData.strategic_initiatives_future_plans || n8nData.recent_developments_product_launches || n8nData.strategic_initiatives_digital_transformation_goals || n8nData.strategicInitiatives;
  if (typeof rawPlans === 'string') {
    strategicInitiatives = rawPlans.split(/[.\n]/).map((s: string) => s.trim()).filter(s => s.length > 5).map((desc: string) => ({
      title: 'Growth Objective',
      description: desc
    }));
  } else if (Array.isArray(rawPlans)) {
    strategicInitiatives = rawPlans.map((p: any) => ({
      title: p.title || 'Strategic Goal',
      description: p.description || JSON.stringify(p)
    }));
  }
  if (strategicInitiatives.length === 0) {
    strategicInitiatives = [
      { title: 'Market Expansion', description: 'Expanding B2B partnerships and driving digital customer experience solutions.' }
    ];
  }

  // Process sources
  let sources: any[] = [];
  const rawSrcs = n8nData.references_sources || n8nData.sources;
  if (typeof rawSrcs === 'string') {
    sources = rawSrcs.split(/[,|;\n]/).map((s: string) => s.trim()).filter(s => s.startsWith('http')).map((url: string) => ({
      name: url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0],
      url: url,
      category: 'Research Citation'
    }));
  } else if (Array.isArray(rawSrcs)) {
    sources = rawSrcs;
  }
  if (sources.length === 0) {
    sources = [
      { name: 'Research Database', url: 'https://google.com', category: 'Official Website' }
    ];
  }

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
    sources
  };
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
  // n8n HTML2 uses: <strong>Headquarters:</strong> Chennai...
  const hq =
    extractText(/<strong>Headquarters:<\/strong>\s*([^<\n]+)/i) ||
    extractText(/<b>Headquarters:?<\/b>\s*([^<\n]+)/i) ||
    'Information not available';

  // ── Industry ──
  // n8n HTML2 uses: <li><strong>Primary Industry:</strong> Steel and Alloy Manufacturing</li>
  const industry =
    extractText(/<strong>Primary Industry:<\/strong>\s*([^<\n]+)/i) ||
    extractText(/<strong>Industry:<\/strong>\s*([^<\n]+)/i) ||
    extractText(/<b>Industry:?<\/b>\s*([^<\n]+)/i) ||
    'Enterprise Services';

  // ── Employees ──
  const employees =
    extractText(/<strong>Employee Count:<\/strong>\s*([^<\n]+)/i) ||
    extractText(/<strong>Company Size:<\/strong>\s*([^<\n]+)/i) ||
    extractText(/<b>Employee Count:?<\/b>\s*([^<\n]+)/i) ||
    extractText(/<b>Company Size:?<\/b>\s*([^<\n]+)/i) ||
    'Information not available';

  // ── Revenue ──
  // n8n HTML2 has table row: "Operating Income (FY 2025) | Rs. 939.87 crore"
  const revenueRow = (() => {
    const rows = extractTableRows('Financial Performance');
    const r = rows.find(row => row[0] && /operating income|revenue|turnover/i.test(row[0]));
    return r ? `${r[0]}: ${r[1]}` : '';
  })();
  const revenue =
    revenueRow ||
    extractText(/<strong>Annual Revenue:<\/strong>\s*([^<\n]+)/i) ||
    extractText(/<b>Annual Revenue:?<\/b>\s*([^<\n]+)/i) ||
    'Information not available';

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

  const idx = researchHistory.findIndex(item => item.id === jobId);
  if (idx === -1) {
    return res.status(404).json({ error: `Research job ${jobId} not found.` });
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
  const incomingData = req.body.fullData || req.body.report || req.body;
  const hasData = incomingData && (
    incomingData.html ||
    incomingData.companyName ||
    incomingData.company_name ||
    incomingData.company_overview ||
    incomingData.company_overview_description ||
    incomingData.leadership_management_description
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

  // Parse HTML report into structured schema if provided, but prefer structured JSON if already present
  let reportData = incomingData;
  const rawHtml: string | undefined =
    (typeof req.body.html === 'string' ? req.body.html : null) ||
    (typeof req.body.fullData?.html === 'string' ? req.body.fullData.html : null) ||
    (typeof req.body.report?.html === 'string' ? req.body.report.html : null) ||
    (typeof incomingData?.html === 'string' ? incomingData.html : undefined);

  const hasStructuredFields = !!(
    (incomingData && (
      incomingData.companyName ||
      incomingData.company_name ||
      incomingData.company_overview ||
      incomingData.company_overview_description ||
      incomingData.leadership_management_description
    )) ||
    (req.body.report && (
      req.body.report.companyName ||
      req.body.report.company_name ||
      req.body.report.company_overview ||
      req.body.report.company_overview_description
    )) ||
    (req.body.fullData && (
      req.body.fullData.companyName ||
      req.body.fullData.company_name ||
      req.body.fullData.company_overview ||
      req.body.fullData.company_overview_description
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
  const formattedReport = formatN8nReport(
    reportData,
    researchHistory[idx].companyName,
    researchHistory[idx].website
  );

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
    const incomingData = resBody?.report || resBody?.fullData || (
      resBody?.companyName || resBody?.company_name || resBody?.company_overview || resBody?.html ? resBody : null
    );

    if (!incomingData) {
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
    ]
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
