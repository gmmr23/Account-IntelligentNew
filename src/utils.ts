import { ResearchReport } from './types';

// Helper to generate full standalone HTML report string for download
export const generateClientHtmlReport = (report: ResearchReport): string => {
  const safeLeadership = Array.isArray(report?.leadership) ? report.leadership : [];
  const safeTechStack = Array.isArray(report?.techStack) ? report.techStack : [];
  const safeCompetitors = Array.isArray(report?.competitors) ? report.competitors : [];
  const safeStrategicInitiatives = Array.isArray(report?.strategicInitiatives) ? report.strategicInitiatives : [];
  const safeRecentNews = Array.isArray(report?.recentNews) ? report.recentNews : [];
  const safeSources = Array.isArray(report?.sources) ? report.sources : [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Intelligence Report: ${report.companyName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.6; max-width: 900px; margin: 40px auto; padding: 20px; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    h2 { color: #2563eb; margin-top: 30px; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
    .meta-value { font-size: 16px; font-weight: bold; color: #0f172a; }
    .chip { inline-block; background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 9999px; font-size: 12px; margin-right: 5px; margin-bottom: 5px; font-weight: 500; }
    .news-item { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #f1f5f9; }
    .news-title { font-weight: bold; color: #0f172a; text-decoration: none; }
    .news-meta { font-size: 12px; color: #64748b; }
    .sources { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
  </style>
</head>
<body>
  <h1>Account Intelligence Report: ${report.companyName}</h1>
  <p>Website: <a href="https://${report.website}" target="_blank">${report.website}</a></p>

  <div class="meta-grid">
    <div class="meta-item"><span class="meta-label">Industry</span><span class="meta-value">${report.industry}</span></div>
    <div class="meta-item"><span class="meta-label">Headquarters</span><span class="meta-value">${report.hq}</span></div>
    <div class="meta-item"><span class="meta-label">Employees</span><span class="meta-value">${report.employees}</span></div>
    <div class="meta-item"><span class="meta-label">Revenue / Funding</span><span class="meta-value">${report.revenue}</span></div>
  </div>

  <h2>Company Overview</h2>
  <p>${report.overview}</p>

  <h2>Business Model &amp; Monetization</h2>
  <p>${report.businessModel}</p>

  <h2>Technology Stack &amp; Systems</h2>
  <div>
    ${safeTechStack.map(t => `<span class="chip">${t}</span>`).join('')}
  </div>
  <p>${report.technologyDetail}</p>

  <h2>Financial Health &amp; Analysis</h2>
  <p>${report.financialsDetail}</p>

  <h2>Leadership</h2>
  <ul>
    ${safeLeadership.map(l => `<li><strong>${l.name}</strong> - ${l.role}</li>`).join('')}
  </ul>
  <p>${report.leadershipDetail}</p>

  <h2>Competitor Landscapes</h2>
  <div>
    ${safeCompetitors.map(c => `<span class="chip">${c}</span>`).join('')}
  </div>
  <p>${report.competitionDetail}</p>

  <h2>Strategic Initiatives</h2>
  <ul>
    ${safeStrategicInitiatives.map(i => `<li><strong>${i.title}</strong>: ${i.description}</li>`).join('')}
  </ul>
  <p>${report.strategicInitiativesDetail}</p>

  <div class="sources">
    <h2>Sources Consulted</h2>
    <ul>
      ${safeSources.map(s => `<li><a href="${s.url}" target="_blank">${s.name}</a> (${s.category})</li>`).join('')}
    </ul>
  </div>
</body>
</html>
  `.trim();
};

export const downloadHtmlReport = (companyName: string, report: ResearchReport, rawHtml?: string) => {
  const htmlContent = rawHtml ? rawHtml : generateClientHtmlReport(report);
  const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${companyName.replace(/[^a-z0-9]/gi, '_')}_AIR_Report.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Open the report HTML in a new window and auto-trigger the browser print dialog.
 * User selects "Save as PDF" → produces a PDF that exactly matches the n8n HTML2 node output.
 * Falls back to downloading as HTML if the popup is blocked.
 */
export const printAsPdf = (companyName: string, report: ResearchReport, rawHtml?: string): void => {
  const baseHtml = rawHtml ?? generateClientHtmlReport(report);

  // Inject a print-media style + auto-print script
  const printExtras = `
<style>
  @media print {
    body { background: white !important; }
    h1, h2, h3 { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .data-gap { display: none; }
  }
</style>
<script>
  window.onload = function() {
    window.focus();
    setTimeout(function() { window.print(); }, 400);
  };
<\/script>`;

  const finalHtml = baseHtml.includes('</head>')
    ? baseHtml.replace('</head>', `${printExtras}</head>`)
    : baseHtml + printExtras;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    // Popup blocked — fall back to HTML download
    downloadHtmlReport(companyName, report, rawHtml);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(finalHtml);
  printWindow.document.close();
};
