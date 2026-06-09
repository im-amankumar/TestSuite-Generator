import { GeneratedSuite } from "./types";

/**
 * Triggers a web-browser physical target file download of any text content.
 */
export function downloadFile(filename: string, content: string, contentType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const element = document.createElement("a");
  element.href = url;
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}

/**
 * Custom ultra-safe clipboard writing utility
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error("Clipboard failure:", err);
    return false;
  }
}

/**
 * Converts a generated suite to a clean human-readable Markdown specification report.
 */
export function exportToMarkdown(suite: GeneratedSuite): string {
  let md = `# QA Test Specification: Generated Test Cases\n`;
  md += `*Generated on: ${suite.timestamp}*\n\n`;
  
  md += `## 🎯 Test Suite Objective\n`;
  md += `${suite.testObjective}\n\n`;
  
  md += `## 📋 Test cases (${suite.testCases.length})\n\n`;
  
  suite.testCases.forEach((tc) => {
    md += `### [${tc.id}] ${tc.name}\n`;
    md += `- **Type**: ${tc.scenarioType}\n`;
    md += `- **Focus Objective**: ${tc.testObjective}\n\n`;
    md += `**Execution Steps:**\n`;
    tc.testSteps.forEach((step, idx) => {
      md += `${step.trim().match(/^\d+\./) ? step : `${idx + 1}. ${step}`}\n`;
    });
    md += `\n**Expected Outcome:**\n`;
    md += `> ${tc.expectedOutput}\n\n`;
    md += `---\n\n`;
  });
  
  return md;
}

/**
 * Converts a generated suite into a standard CSV formatted text block.
 */
export function exportToCSV(suite: GeneratedSuite): string {
  const headers = ["Test Case ID", "Test Name", "Scenario Type", "Target Objective", "Test Steps", "Expected Output"];
  
  const escapeCSV = (val: string) => {
    const clean = val.replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = suite.testCases.map((tc) => {
    const stepsJoined = tc.testSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
    return [
      escapeCSV(tc.id),
      escapeCSV(tc.name),
      escapeCSV(tc.scenarioType),
      escapeCSV(tc.testObjective),
      escapeCSV(stepsJoined),
      escapeCSV(tc.expectedOutput)
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Converts a generated suite to a clean JSON backup.
 */
export function exportToJSON(suite: GeneratedSuite): string {
  return JSON.stringify(suite, null, 2);
}

/**
 * Converts a generated suite into a fully responsive, print-friendly, beautiful standalone HTML report.
 */
export function exportToHTML(suite: GeneratedSuite): string {
  const casesHTML = suite.testCases.map((tc, idx) => {
    const stepsLI = tc.testSteps.map((step, sIdx) => `
      <li class="step-item">
        <span class="step-num">${sIdx + 1}</span>
        <span class="step-text">${step.replace(/^\d+\.\s*/, "")}</span>
      </li>
    `).join("");

    let badgeClass = "badge-standard";
    if (tc.scenarioType.toLowerCase().includes("happy")) badgeClass = "badge-happy";
    else if (tc.scenarioType.toLowerCase().includes("bound") || tc.scenarioType.toLowerCase().includes("limit")) badgeClass = "badge-boundary";
    else if (tc.scenarioType.toLowerCase().includes("exception") || tc.scenarioType.toLowerCase().includes("negative")) badgeClass = "badge-negative";

    return `
      <div class="test-card">
        <div class="card-header">
          <div class="header-left">
            <span class="case-id">${tc.id}</span>
            <span class="scenario-badge ${badgeClass}">${tc.scenarioType}</span>
          </div>
          <h3 class="case-name">${tc.name}</h3>
        </div>
        <div class="card-body">
          <div class="section-block">
            <h4 class="section-title">🎯 Target Objective</h4>
            <p class="section-content">${tc.testObjective}</p>
          </div>
          <div class="section-block">
            <h4 class="section-title">📋 Action Steps</h4>
            <ol class="steps-list">
              ${stepsLI}
            </ol>
          </div>
          <div class="section-block highlight-block">
            <h4 class="section-title text-accent">✅ Expected Outcome</h4>
            <p class="section-content text-semibold">${tc.expectedOutput}</p>
          </div>
        </div>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Test Suite Report: TestSuiteGen</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    
    :root {
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #1e293b;
      --text-muted: #64748b;
      --happy: #10b981;
      --happy-bg: #ecfdf5;
      --boundary: #3b82f6;
      --boundary-bg: #eff6ff;
      --negative: #f97316;
      --negative-bg: #fff7ed;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 40px 20px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    header {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 32px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
    }

    .app-brand {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }

    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 12px;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      padding-top: 16px;
      margin-top: 16px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-label {
      font-weight: 600;
    }

    .suite-objective {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
    }

    .suite-objective h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .test-cases-section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 20px;
      color: var(--text);
    }

    .test-card {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      margin-bottom: 24px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
      transition: transform 0.2s ease;
    }

    .card-header {
      background-color: #fafbfc;
      border-bottom: 1px solid var(--border);
      padding: 20px 24px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .case-id {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 12px;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }

    .scenario-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-standard {
      background-color: #f1f5f9;
      color: var(--text-muted);
    }

    .badge-happy {
      background-color: var(--happy-bg);
      color: var(--happy);
    }

    .badge-boundary {
      background-color: var(--boundary-bg);
      color: var(--boundary);
    }

    .badge-negative {
      background-color: var(--negative-bg);
      color: var(--negative);
    }

    .case-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
    }

    .card-body {
      padding: 24px;
    }

    .section-block {
      margin-bottom: 20px;
    }

    .section-block:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .section-title.text-accent {
      color: var(--primary);
    }

    .section-content {
      font-size: 13.5px;
      color: #334155;
    }

    .text-semibold {
      font-weight: 500;
    }

    .highlight-block {
      background-color: #f8fafc;
      border-left: 3px solid var(--primary);
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
    }

    .steps-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .step-item {
      display: flex;
      gap: 12px;
      font-size: 13.5px;
    }

    .step-num {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: var(--primary);
      background-color: var(--boundary-bg);
      min-width: 22px;
      height: 22px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
    }

    .step-text {
      color: #334155;
      padding-top: 2px;
    }

    .print-btn-container {
      margin-top: 40px;
      display: flex;
      justify-content: center;
    }

    .print-btn {
      background-color: var(--primary);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgb(37 99 235 / 0.2);
      transition: background-color 0.2s;
    }

    .print-btn:hover {
      background-color: var(--primary-dark);
    }

    footer {
      text-align: center;
      margin-top: 48px;
      font-size: 12px;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      padding-top: 24px;
    }

    footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }

    footer a:hover {
      text-decoration: underline;
    }

    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .test-card, header, .suite-objective {
        box-shadow: none;
        page-break-inside: avoid;
      }
      .print-btn-container {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="app-brand">TestSuiteGen Report</div>
      <h1>QA Test Specification Specification</h1>
      <div class="meta-row">
        <div class="meta-item">
          <span class="meta-label">Generated:</span>
          <span>${suite.timestamp}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Total Cases:</span>
          <span>${suite.testCases.length}</span>
        </div>
      </div>
    </header>

    <div class="suite-objective">
      <h2>🎯 Core Test Objectives</h2>
      <p class="section-content">${suite.testObjective.replace(/\n/g, "<br/>")}</p>
    </div>

    <h2 class="test-cases-section-title">✨ Test Scenarios Details</h2>
    <div class="test-cases-list">
      ${casesHTML}
    </div>

    <div class="print-btn-container">
      <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
    </div>

    <footer>
      Created with TestSuiteGen &bull; Created by <a href="https://www.linkedin.com/in/im-aman-kumar/" target="_blank">Aman Kumar</a>
    </footer>
  </div>
  <script>
    // Self-trigger standard print / save to PDF dialog on load
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.warn("Auto-print on load intercepted by browser", e);
        }
      }, 500);
    });
  </script>
</body>
</html>`;
}

