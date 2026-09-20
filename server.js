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

// Same args as before, unchanged -- --disable-dev-shm-usage is load-bearing
// on a container with limited /dev/shm and must stay.
const LAUNCH_ARGS = [
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
];

// ─── Shared browser instance ────────────────────────────────────────────
// Launched once at boot and reused across requests. Each request gets its
// own page (browser.newPage()), which is closed when the request finishes
// -- the browser itself is never closed except on crash/disconnect, when
// it is transparently relaunched.
class QueueTimeoutError extends Error {}
class WorkTimeoutError extends Error {}

// page.goto's own { timeout: 45000 } is NOT sufficient on its own -- observed
// live under concurrent load (5 simultaneous requests, MAX_CONCURRENT=2)
// that a navigation can hang well past its own stated 45s timeout with no
// error ever thrown, silently holding a concurrency slot forever and
// eventually dying only when Express's blunt 55s req/res timeout destroys
// the socket -- by then the client sees a bare connection failure, not a
// clean error, and the slot never gets released via the normal finally path.
// This wraps the whole per-request browser work (page creation through
// screenshot capture) in an independent deadline that does not trust
// Puppeteer's internal timeout to actually fire.
const WORK_TIMEOUT_MS = 40000;

async function withWorkTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new WorkTimeoutError(`Work exceeded ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

let browser = null;
let browserLaunchedAt = null;
let browserRelaunchCount = 0;
let browserLaunchPromise = null; // in-flight launch/relaunch, so concurrent
                                  // callers that all see a dead browser at
                                  // once share ONE relaunch instead of each
                                  // starting their own (a relaunch storm).

async function launchBrowser() {
  const b = await puppeteer.launch({
    headless: 'new',
    // Falls back to the exact same path the container has always used.
    // Overridable via env so this can be tested outside the container
    // (e.g. against puppeteer's own bundled Chromium) without touching
    // production, which already sets this same env var in render.yaml.
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
    args: LAUNCH_ARGS
  });
  browser = b;
  browserLaunchedAt = Date.now();
  return b;
}

async function ensureBrowser() {
  if (browser && browser.isConnected()) return browser;
  if (browserLaunchPromise) return browserLaunchPromise;
  const isRelaunch = browser !== null;
  browserLaunchPromise = (async () => {
    try {
      const b = await launchBrowser();
      if (isRelaunch) {
        browserRelaunchCount++;
        console.error(`[browser] relaunched (relaunch #${browserRelaunchCount})`);
      }
      return b;
    } finally {
      browserLaunchPromise = null;
    }
  })();
  return browserLaunchPromise;
}

// ─── Concurrency limit + FIFO queue ─────────────────────────────────────
// Starts at 2 in-flight screenshots; tunable via env without a code change.
// Queued requests wait rather than fail outright, but a request that would
// wait long enough to blow the 55s request budget gets a clear 503 +
// Retry-After instead of hanging until the connection times out silently.
const MAX_CONCURRENT = parseInt(process.env.SCREENSHOT_CONCURRENCY || '2', 10);
const QUEUE_TIMEOUT_MS = 45000; // leaves headroom inside the 55s req/res timeout for the work itself once a slot is granted
let inFlight = 0;
const queue = [];
let totalServed = 0;

function acquireSlot() {
  return new Promise((resolve, reject) => {
    if (inFlight < MAX_CONCURRENT) {
      inFlight++;
      resolve();
      return;
    }
    const enqueuedAt = Date.now();
    console.log(`[queue] enqueued, depth now ${queue.length + 1}`);
    const entry = { settled: false };
    entry.timer = setTimeout(() => {
      if (entry.settled) return;
      entry.settled = true;
      const idx = queue.indexOf(entry);
      if (idx !== -1) queue.splice(idx, 1);
      console.error(`[queue] timed out after ${Date.now() - enqueuedAt}ms waiting, rejecting with 503`);
      reject(new QueueTimeoutError('Queue wait exceeded budget'));
    }, QUEUE_TIMEOUT_MS);
    entry.grant = () => {
      if (entry.settled) return;
      entry.settled = true;
      clearTimeout(entry.timer);
      console.log(`[queue] granted after ${Date.now() - enqueuedAt}ms wait`);
      inFlight++;
      resolve();
    };
    queue.push(entry);
  });
}

function releaseSlot() {
  inFlight--;
  while (queue.length > 0 && inFlight < MAX_CONCURRENT) {
    const entry = queue.shift();
    entry.grant();
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'DemoBoosterz Screenshot Server' });
});
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DemoBoosterz Screenshot Server',
    timestamp: new Date().toISOString(),
    browser: {
      connected: !!(browser && browser.isConnected()),
      uptimeMs: browserLaunchedAt ? Date.now() - browserLaunchedAt : null,
      relaunches: browserRelaunchCount
    },
    concurrency: {
      inFlight,
      queueDepth: queue.length,
      maxConcurrent: MAX_CONCURRENT
    },
    totalRequestsServed: totalServed
  });
});

app.post('/screenshot', async (req, res) => {
  const startedAt = Date.now();
  // Set request/response timeouts for full page screenshots
  req.setTimeout(55000);
  res.setTimeout(55000);
  const token = req.headers['x-auth-token'];
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { url, html } = req.body;
  if (!url && !html) return res.status(400).json({ error: 'URL or HTML is required' });

  let slotAcquired = false;
  let page = null;
  try {
    await acquireSlot();
    slotAcquired = true;

    const doWork = async () => {
      const activeBrowser = await ensureBrowser();
      page = await activeBrowser.newPage();
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
      return page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 800 }
      });
    };

    const workPromise = doWork();
    let screenshot;
    try {
      screenshot = await withWorkTimeout(workPromise, WORK_TIMEOUT_MS);
    } catch (workError) {
      if (workError instanceof WorkTimeoutError) {
        // doWork() is still running in the background and this request has
        // already moved on -- the finally block below will close `page` if
        // it was assigned before the timeout won, but if the hang is inside
        // newPage() itself (page still null right now), that finally does
        // nothing. Make sure whatever page doWork() eventually opens still
        // gets closed once it resolves, instead of leaking.
        workPromise.then(
          () => { if (page) page.close().catch(() => {}); },
          () => { if (page) page.close().catch(() => {}); }
        );
      }
      throw workError;
    }
    totalServed++;
    // Return raw binary JPEG — no base64 encoding, no JSON wrapper
    res.set('Content-Type', 'image/jpeg');
    res.send(screenshot);
  } catch (error) {
    if (error instanceof QueueTimeoutError) {
      res.set('Retry-After', '5');
      return res.status(503).json({ error: 'Server busy, please retry', retryAfterSeconds: 5 });
    }
    if (error instanceof WorkTimeoutError) {
      console.error(`[work] ${url || 'html'} exceeded ${WORK_TIMEOUT_MS}ms, releasing slot`);
      return res.status(504).json({ error: 'Screenshot timed out' });
    }
    console.error('Screenshot failed:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    if (page) await page.close().catch(() => {});
    if (slotAcquired) releaseSlot();
    console.log(`[screenshot] ${url || 'html'} status=${res.statusCode} durationMs=${Date.now() - startedAt}`);
  }
});

ensureBrowser().catch((err) => {
  console.error('Initial browser launch failed:', err.message);
});

app.listen(PORT, () => console.log(`Screenshot server running on port ${PORT}`));
