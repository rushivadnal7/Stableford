/**
 * Responsive check: drives the production build in real Chrome at nine screen widths and fails on the
 * things that make a layout feel broken on a phone.
 *
 *   npm run build && npm run test:responsive
 *
 * Needs Chrome or Chromium (set CHROME_PATH if it is not in a usual place). Starts its own server unless
 * BASE_URL is set. Screenshots go to tests/responsive/out/ (git-ignored) for a quick visual review.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const OUT = path.resolve('tests/responsive/out');
const PORT = process.env.PORT ?? '3200';
const BASE = process.env.BASE_URL ?? `http://localhost:${PORT}`;
const ROUTES = ['/', '/signup', '/login', '/charities', '/this-page-does-not-exist'];
const VIEWPORTS = [
  [320, 640], [360, 780], [390, 844], [430, 932], // phones
  [768, 1024], // tablet
  [1024, 768], [1280, 800], [1440, 900], [1920, 1080], // laptops and desktops
];
const TOUCH_BELOW = 1024; // widths under this are checked for tap-target size
const MIN_TAP = 44;
const MIN_FONT = 12;

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) throw new Error('Chrome not found. Set CHROME_PATH to its executable.');
  return found;
}

async function startServer() {
  if (process.env.BASE_URL) return null;
  const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
  const server = spawn(process.execPath, [nextBin, 'start', '-p', PORT], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return server;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error('The server did not start. Did you run "npm run build"?');
}

/** Runs inside the page. Returns a list of problems. */
function audit({ width, touchBelow, minTap, minFont }) {
  const problems = [];
  const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).slice(0, 3).join('.') : ''} "${(el.textContent || '').trim().slice(0, 28)}"`;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };
  const clippedByAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o !== 'visible') return true;
    }
    return false;
  };

  // 1. The page must not scroll sideways.
  if (document.documentElement.scrollWidth > window.innerWidth) {
    problems.push(`page scrolls sideways (${document.documentElement.scrollWidth}px wide in a ${window.innerWidth}px window)`);
  }

  // 2. Nothing may poke out of the screen unless a parent clips or scrolls it.
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el) || getComputedStyle(el).position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if ((r.right > window.innerWidth + 1 || r.left < -1) && !clippedByAncestor(el)) {
      problems.push(`sticks out of the screen: ${label(el)} (${Math.round(r.left)} to ${Math.round(r.right)})`);
      if (problems.length > 12) break;
    }
  }

  // 3. Things you tap must be big enough to tap (phones and tablets).
  if (width < touchBelow) {
    const selector = 'a[href], button, summary, input:not([type=hidden]), select, textarea, [role=button]';
    for (const el of document.querySelectorAll(selector)) {
      if (!visible(el) || el.closest('p')) continue; // links inside a sentence are exempt
      if (el.matches('a[href="#main"]')) continue; // skip link is off-screen until focused
      // A visually-hidden shim kept only for native form/autofill support (e.g. Radix's bubble
      // <select> behind a custom dropdown) is not something a real user can tap; aria-hidden and
      // tabindex="-1" together are how that pattern says so.
      if (el.getAttribute('aria-hidden') === 'true' && el.tabIndex === -1) continue;
      // A small native radio/checkbox is exempt when its own <label> wrap is big enough: clicking
      // anywhere in that label activates the input (standard, accessible HTML), so the real tap
      // target is the label, not the little box the browser draws.
      if (el.matches('input[type=radio], input[type=checkbox]')) {
        const label = el.closest('label');
        if (label && label.getBoundingClientRect().height >= minTap - 0.5) continue;
      }
      const r = el.getBoundingClientRect();
      const iconOnly = !(el.textContent || '').trim();
      if (r.height < minTap - 0.5 || (iconOnly && r.width < minTap - 0.5) || r.width < 24) {
        problems.push(`tap target too small: ${label(el)} is ${Math.round(r.width)}x${Math.round(r.height)}px (need ${minTap}px tall)`);
      }
    }
  }

  // 4. No tiny text.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || seen.has(el) || !(node.textContent || '').trim() || !visible(el)) continue;
    seen.add(el);
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < minFont - 0.01) problems.push(`text under ${minFont}px: ${label(el)} is ${size}px`);
  }

  // 5. Headings must fit their box (a long word must not overflow).
  for (const el of document.querySelectorAll('h1, h2, h3, h4')) {
    if (visible(el) && el.scrollWidth > el.clientWidth + 1) problems.push(`heading overflows its box: ${label(el)}`);
  }

  // 6. The sticky header must stay a sensible height.
  const header = document.querySelector('header');
  if (header && header.getBoundingClientRect().height > 100) problems.push(`header is ${Math.round(header.getBoundingClientRect().height)}px tall`);

  return problems;
}

// `--selftest` proves the checks can fail: it audits a deliberately broken page and expects problems.
if (process.argv.includes('--selftest')) {
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setContent(
    '<body><div style="width:2000px;height:20px">too wide</div><button style="width:20px;height:20px">x</button>' +
      '<p style="font-size:8px">tiny text</p><h2 style="width:100px;overflow:visible;white-space:nowrap">Averyveryverylongheadingword</h2></body>',
  );
  const found = await page.evaluate(audit, { width: 390, touchBelow: TOUCH_BELOW, minTap: MIN_TAP, minFont: MIN_FONT });
  await browser.close();
  const kinds = ['sideways', 'sticks out', 'tap target', 'text under'].filter((k) => found.some((p) => p.includes(k)));
  console.log(found.map((p) => `  caught: ${p}`).join('\n'));
  console.log(kinds.length === 4 ? '\nSelf-test passed: every kind of problem was caught.' : `\nSelf-test FAILED: only caught ${kinds.join(', ') || 'nothing'}.`);
  process.exit(kinds.length === 4 ? 0 : 1);
}

mkdirSync(OUT, { recursive: true });
const server = await startServer();
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--no-sandbox'] });
let failures = 0;

try {
  for (const route of ROUTES) {
    for (const [width, height] of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < TOUCH_BELOW });
      await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 1500)); // let React hydrate
      // Reveal everything so measurements see the final layout.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo({ top: y, behavior: 'instant' });
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await new Promise((r) => setTimeout(r, 900));

      const problems = await page.evaluate(audit, { width, touchBelow: TOUCH_BELOW, minTap: MIN_TAP, minFont: MIN_FONT });
      const routeSlug = route === '/' ? 'home' : route === '/this-page-does-not-exist' ? '404' : route.replace(/\//g, '') || 'home';
      const slug = `${routeSlug}-${width}`;
      await page.screenshot({ path: path.join(OUT, `${slug}.png`), fullPage: true });
      await page.close();

      failures += problems.length;
      console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${route.padEnd(28)} ${String(width).padStart(4)}px${problems.length ? '' : ''}`);
      for (const p of [...new Set(problems)].slice(0, 8)) console.log(`        ${p}`);
    }
  }
} finally {
  await browser.close();
  server?.kill();
}

console.log(failures ? `\n${failures} problem(s). Screenshots: tests/responsive/out/` : '\nAll responsive checks passed. Screenshots: tests/responsive/out/');
process.exit(failures ? 1 : 0);
