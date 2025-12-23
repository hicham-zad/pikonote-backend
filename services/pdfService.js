import puppeteer from 'puppeteer';
import { Buffer } from 'buffer';
import htmlTemplateService, { summaryToHTML } from './htmlTemplateService.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const officeParser = require('officeparser');

// Extract text from PDF buffer
export const extractTextFromBuffer = async (buffer) => {
  try {
    console.log(`📄 Extracting text from PDF buffer (Size: ${buffer.length} bytes)...`);

    // Debug: Check if buffer is valid
    if (!Buffer.isBuffer(buffer)) {
      console.error('❌ Input is not a buffer!');
      throw new Error('Input is not a valid buffer');
    }

    const data = await pdfParse(buffer);

    console.log('✅ PDF Parse Result:');
    console.log(`   - Pages: ${data.numpages}`);
    console.log(`   - Info: ${JSON.stringify(data.info)}`);
    console.log(`   - Text Length: ${data.text.length}`);

    return data.text;
  } catch (error) {
    console.error('❌ PDF extraction error details:', error);
    if (error.name === 'FormatError') {
      console.error('   - Reason: Invalid PDF format or corrupted file.');
    }
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

// Extract text from Word buffer
export const extractTextFromWordBuffer = async (buffer) => {
  try {
    console.log(`📄 Extracting text from Word buffer (Size: ${buffer.length} bytes)...`);

    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Input is not a valid buffer');
    }

    const result = await mammoth.extractRawText({ buffer: buffer });
    const text = result.value;

    console.log('✅ Word Parse Result:');
    console.log(`   - Text Length: ${text.length}`);

    if (result.messages.length > 0) {
      console.log('   - Messages:', result.messages);
    }

    return text;
  } catch (error) {
    console.error('❌ Word extraction error details:', error);
    throw new Error(`Failed to extract text from Word file: ${error.message}`);
  }
};

// Extract text from PowerPoint buffer  
export const extractTextFromPowerPointBuffer = async (buffer) => {
  try {
    console.log(`📄 Extracting text from PowerPoint buffer (Size: ${buffer.length} bytes)...`);

    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Input is not a valid buffer');
    }

    // officeparser requires a file path, so write buffer to temp file
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pptx`);

    // Write buffer to temp file
    fs.writeFileSync(tempFilePath, buffer);

    try {
      // Extract text using officeparser
      const text = await officeParser.parseOfficeAsync(tempFilePath);

      console.log('✅ PowerPoint Parse Result:');
      console.log(`   - Text Length: ${text.length}`);

      // Clean up temp file
      fs.unlinkSync(tempFilePath);

      return text;
    } catch (parseError) {
      // Clean up temp file even if parsing fails
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw parseError;
    }
  } catch (error) {
    console.error('❌ PowerPoint extraction error details:', error);
    throw new Error(`Failed to extract text from PowerPoint file: ${error.message}`);
  }
};

// Generate PDF from HTML using Puppeteer
export const generatePDFFromHTML = async (html) => {
  let browser;

  try {
    console.log('🚀 Launching browser for PDF generation...');

    // Launch browser with better error handling
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    console.log('📄 Generating PDF...');

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    console.log('✅ PDF generated successfully!');

    return Buffer.from(pdfBuffer);

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Convert summary JSON to HTML
export const convertSummaryToHTML = (summary, title, difficulty) => {
  return summaryToHTML(summary, title, difficulty);
};

export default {
  generatePDFFromHTML,
  convertSummaryToHTML,
  convertSummaryToHTML,
  extractTextFromBuffer,
  extractTextFromWordBuffer,
  extractTextFromPowerPointBuffer
};