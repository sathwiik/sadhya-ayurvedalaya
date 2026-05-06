// Run with: node generate-spec-pdf-final.js
// Generates: SaadhyaAyurvedalaya_TechSpec.pdf using system Chrome via puppeteer

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const htmlPath = path.resolve(__dirname, 'SaadhyaAyurvedalaya_TechSpec.html');
  const pdfPath = path.resolve(__dirname, 'SaadhyaAyurvedalaya_TechSpec.pdf');

  if (!fs.existsSync(htmlPath)) {
    console.error('HTML file not found. Run: node generate-spec-pdf.js first');
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    printBackground: true,
  });

  await browser.close();
  console.log('Done! PDF saved to:', pdfPath);
})();
