const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json({ limit: '50mb' }));
// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-auth-token');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
const PORT = process.env.PORT || 8080;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'demoboosterz-screenshots-2024';
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'DemoBoosterz Screenshot Server' });
});
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DemoBoosterz Screenshot Server',
    timestamp: new Date().toISOString()
  });
});
app.post('/screenshot', async (req, res) => {
  // Set request/response timeouts for full page screenshots
  req.setTimeout(55000);
  res.setTimeout(55000);
  const token = req.headers['x-auth-token'];
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { url, html } = req.body;
  if (!url && !html) return res.status(400).json({ error: 'URL or HTML is required' });
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--safebrowsing-disable-auto-update',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 2400 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
 if (html) {
  console.log('Rendering HTML directly');
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  // Force scroll to absolute top before capturing
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
  await new Promise(r => setTimeout(r, 500));
} else {
      console.log(`Taking screenshot of: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await new Promise(r => setTimeout(r, 5000));
    }
   const screenshot = await page.screenshot({
  type: 'jpeg',
  quality: 80,
  fullPage: false,
  clip: { x: 0, y: 0, width: 1280, height: 800 }
});
    await browser.close();
    browser = null;
    // Return raw binary JPEG — no base64 encoding, no JSON wrapper
    res.set('Content-Type', 'image/jpeg');
    res.send(screenshot);
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    console.error('Screenshot failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});
app.listen(PORT, () => console.log(`Screenshot server running on port ${PORT}`));


