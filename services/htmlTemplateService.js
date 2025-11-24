// Convert structured summary to beautiful HTML
export const summaryToHTML = (summary, title, difficulty) => {
  const difficultyColor = {
    easy: '#27AE60',
    medium: '#F39C12',
    hard: '#E74C3C'
  }[difficulty] || '#F39C12';

  // Validate summary structure
  if (!summary || !summary.introduction || !summary.sections) {
    throw new Error('Invalid summary structure');
  }

  // Separate "Conclusion" section from regular sections
  const regularSections = summary.sections.filter(
    section => section.title.toLowerCase() !== 'conclusion'
  );
  
  const conclusionSection = summary.sections.find(
    section => section.title.toLowerCase() === 'conclusion'
  );

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #2C3E50;
      background: white;
      padding: 30px 20px;
    }
    
    .container {
      max-width: 850px;
      margin: 0 auto;
    }
    
    /* Header */
    .header {
      text-align: center;
      padding: 40px 25px;
      background: linear-gradient(135deg, #00BCD4 0%, #4A90E2 100%);
      color: white;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
      page-break-after: avoid;
    }
    
    .header .icon {
      font-size: 36px;
      margin-bottom: 12px;
    }
    
    .header h1 {
      font-size: 32px;
      margin-bottom: 12px;
      font-weight: 700;
      line-height: 1.2;
    }
    
    .header .badge {
      display: inline-block;
      padding: 6px 16px;
      background: ${difficultyColor};
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .header .meta {
      margin-top: 12px;
      font-size: 13px;
      opacity: 0.95;
    }
    
    /* Sections */
    .section {
      margin: 20px 0;
      page-break-inside: avoid;
    }
    
    /* Reduce margin before special boxes */
    .section:has(.key-takeaways),
    .section:has(.conclusion-box) {
      margin-top: 15px;
    }
    
    h2 {
      color: #00BCD4;
      font-size: 24px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 3px solid #00BCD4;
      font-weight: 700;
      page-break-after: avoid;
    }
    
    h3 {
      color: #4A90E2;
      font-size: 18px;
      margin: 15px 0 10px;
      font-weight: 600;
      page-break-after: avoid;
    }
    
    p {
      margin: 10px 0;
      text-align: justify;
      font-size: 14px;
      line-height: 1.7;
    }
    
    /* Introduction Box */
    .intro-box {
      background: linear-gradient(135deg, #F8F9FA 0%, #E8F5F9 100%);
      padding: 18px;
      border-left: 4px solid #00BCD4;
      border-radius: 8px;
      margin: 15px 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      page-break-inside: avoid;
    }
    
    .intro-box strong {
      font-size: 16px;
      color: #00BCD4;
      display: block;
      margin-bottom: 8px;
    }
    
    /* Table of Contents */
    .toc {
      background: #FFFFFF;
      border: 2px solid #E9ECEF;
      border-radius: 10px;
      padding: 18px 22px;
      margin: 15px 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      page-break-inside: avoid;
    }
    
    .toc h2 {
      border-bottom: none;
      margin-bottom: 12px;
      font-size: 22px;
    }
    
    .toc ol {
      padding-left: 20px;
      counter-reset: item;
      list-style: none;
    }
    
    .toc li {
      margin: 8px 0;
      font-weight: 500;
      font-size: 14px;
      line-height: 1.5;
      counter-increment: item;
      padding-left: 8px;
    }
    
    .toc li:before {
      content: counter(item) ".";
      color: #00BCD4;
      font-weight: 700;
      margin-right: 8px;
    }
    
    /* Lists */
    ul, ol {
      padding-left: 30px;
      margin: 12px 0;
    }
    
    li {
      margin: 8px 0;
      line-height: 1.6;
      font-size: 14px;
    }
    
    ul li {
      list-style-type: disc;
      color: #2C3E50;
    }
    
    /* Key Takeaways */
    .key-takeaways {
      background: linear-gradient(135deg, #FFF9E6 0%, #FFF3CD 100%);
      border-left: 4px solid #F39C12;
      padding: 18px;
      border-radius: 8px;
      margin: 15px 0 20px 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      page-break-inside: avoid;
    }
    
    .key-takeaways h2 {
      color: #F39C12;
      border-bottom: none;
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 22px;
    }
    
    .key-takeaways ul {
      margin-top: 8px;
    }
    
    .key-takeaways li {
      font-weight: 500;
      margin: 8px 0;
      line-height: 1.7;
    }
    
    /* Conclusion */
    .conclusion-box {
      background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
      border-left: 4px solid #27AE60;
      padding: 18px;
      border-radius: 8px;
      margin: 15px 0 20px 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      page-break-inside: avoid;
    }
    
    .conclusion-box strong {
      font-size: 16px;
      color: #27AE60;
      display: block;
      margin-bottom: 8px;
    }
    
    /* Code Blocks */
    pre {
      background: #2C3E50;
      border-left: 4px solid #00BCD4;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 12px 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    code {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    pre code {
      color: #F8F9FA;
      background: transparent;
      padding: 0;
    }
    
    /* Inline code */
    p code, li code {
      background: #FFE5E5;
      color: #E74C3C;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 13px;
      font-family: 'Monaco', 'Courier New', monospace;
      white-space: nowrap;
    }
    
    /* Strong text */
    strong {
      color: #2C3E50;
      font-weight: 600;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      margin-top: 35px;
      padding-top: 18px;
      border-top: 2px solid #E9ECEF;
      color: #7F8C8D;
      font-size: 12px;
    }
    
    /* Print Styles */
    @media print {
      body { 
        padding: 15px; 
      }
      .header { 
        border-radius: 8px; 
        page-break-after: avoid; 
      }
      .section { 
        page-break-inside: avoid; 
      }
      h2, h3 { 
        page-break-after: avoid; 
      }
      .intro-box, .toc, .key-takeaways, .conclusion-box { 
        page-break-inside: avoid;
        margin-top: 10px;
      }
      /* Prevent orphaned special boxes */
      .key-takeaways::before,
      .conclusion-box::before {
        content: "";
        display: block;
        height: 1px;
        page-break-before: auto;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="icon">📚</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="badge">${difficulty.toUpperCase()}</div>
      <div class="meta">
        Generated: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>
    </div>

    <!-- Introduction -->
    ${summary.introduction ? `
    <div class="section">
      <div class="intro-box">
        <strong>Introduction</strong>
        <p>${escapeHtml(summary.introduction)}</p>
      </div>
    </div>
    ` : ''}

    <!-- Table of Contents -->
    ${summary.tableOfContents && summary.tableOfContents.length > 0 ? `
    <div class="section">
      <div class="toc">
        <h2>📋 Table of Contents</h2>
        <ol>
          ${summary.tableOfContents
            .filter(item => !item.toLowerCase().includes('conclusion'))
            .map(item => 
              `<li>${escapeHtml(item.replace(/^\d+\.\s*/, ''))}</li>`
            ).join('')}
        </ol>
      </div>
    </div>
    ` : ''}

    <!-- Regular Sections (excluding Conclusion) -->
    ${regularSections && regularSections.length > 0 ? 
      regularSections.map((section) => `
        <div class="section">
          <h2>${escapeHtml(section.title)}</h2>
          ${formatContent(section.content)}
        </div>
      `).join('') 
    : ''}

    <!-- Key Takeaways -->
    ${summary.keyTakeaways && summary.keyTakeaways.length > 0 ? `
    <div class="section">
      <div class="key-takeaways">
        <h2>💡 Key Takeaways</h2>
        <ul>
          ${summary.keyTakeaways.map(point => 
            `<li>${escapeHtml(point)}</li>`
          ).join('')}
        </ul>
      </div>
    </div>
    ` : ''}

    <!-- Conclusion -->
    ${conclusionSection || summary.conclusion ? `
    <div class="section">
      <div class="conclusion-box">
        <strong>Conclusion</strong>
        <p>${escapeHtml(conclusionSection?.content || summary.conclusion)}</p>
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <strong>Generated by EduReact</strong><br>
      Smart Notes • ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>
  `;

  return html;
};

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// Format markdown content to HTML
function formatContent(content) {
  if (!content) return '';

  let html = '';
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeLines = [];
  let inList = false;

  lines.forEach(line => {
    const trimmedLine = line.trim();

    // Skip empty lines (but not in code blocks)
    if (!trimmedLine && !inCodeBlock) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      return;
    }

    // Code blocks
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`;
        codeLines = [];
        inCodeBlock = false;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    // Headers
    if (trimmedLine.startsWith('###')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${escapeHtml(trimmedLine.replace(/^###\s*/, ''))}</h3>`;
    } else if (trimmedLine.startsWith('##')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${escapeHtml(trimmedLine.replace(/^##\s*/, ''))}</h3>`;
    }
    // Lists
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      const listContent = formatInlineMarkdown(trimmedLine.substring(2));
      html += `<li>${listContent}</li>`;
    }
    // Regular text
    else {
      if (inList) { html += '</ul>'; inList = false; }
      const formatted = formatInlineMarkdown(trimmedLine);
      html += `<p>${formatted}</p>`;
    }
  });

  if (inList) html += '</ul>';

  return html;
}

// Format inline markdown (bold, code, etc)
function formatInlineMarkdown(text) {
  // First escape HTML
  let formatted = text;
  
  // Handle inline code FIRST (before bold) to preserve backticks
  formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
    return `<code>${escapeHtml(code)}</code>`;
  });
  
  // Then handle bold text
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  return formatted;
}

export default {
  summaryToHTML
};