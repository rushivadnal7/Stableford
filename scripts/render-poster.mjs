/**
 * Renders the hero's opening frame (the same shot the 3D scene starts on) to two WebP stills, one for
 * portrait phones and one for wide screens. These are the <img> the page paints first and largest, so
 * they must exist before anything about the hero can be measured (LCP, CLS). Run after models:optimize:
 *
 *   npm run models:poster
 *
 * esbuild bundles the actual scene code (story.ts, stage.ts, world.ts, colors.ts, assets.ts) into one
 * browser module, and real headless Chrome renders it, so the poster can never drift from the shot the
 * live 3D scene opens on.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { start as startStatic } from './lib/static-server.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const OUT = path.join(ROOT, 'public', 'models');
const SIZES = [
  { name: 'poster-tall', width: 1000, height: 1500 }, // portrait phones and tablets
  { name: 'poster-wide', width: 2200, height: 1500 }, // landscape and desktop half-screen
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const found = candidates.find((p) => p);
  if (!found) throw new Error('Chrome not found. Set CHROME_PATH.');
  return found;
}

const ENTRY = `
  import { readSceneColors } from '${ROOT.replaceAll('\\', '/')}/src/lib/scene/colors.ts';
  import { createStage } from '${ROOT.replaceAll('\\', '/')}/src/lib/scene/stage.ts';
  import { shotAt } from '${ROOT.replaceAll('\\', '/')}/src/lib/scene/story.ts';
  import { createWorld } from '${ROOT.replaceAll('\\', '/')}/src/lib/scene/world.ts';

  window.renderPoster = async function renderPoster(width, height) {
    const canvas = document.getElementById('c');
    const stage = createStage(canvas, { maxPixelRatio: 2, onLost: () => {} });
    stage.resize(width, height);
    // The four roles below are set on <body> (see the page markup), so read the theme from there:
    // a custom property set on an element is only visible to that element and its descendants.
    const world = createWorld(stage.scene, readSceneColors(document.body));
    await world.loadCore();
    world.update(0);
    stage.pose(shotAt(0));
    stage.frame(0);
    return true;
  };
`;

const PAGE = `<!doctype html>
<meta charset="utf-8">
<style>html,body{margin:0;background:#f6f2f1}canvas{display:block}</style>
<body style="--bg:#f6f2f1;--accent:#91a673;--warm:#ae8f60;--fg:#2a2725">
<canvas id="c"></canvas>
<script type="module" src="/scratch/poster-bundle.js"></script>
</body>`;

async function build() {
  const scratch = path.join(ROOT, 'scripts', '.poster-scratch');
  mkdirSync(scratch, { recursive: true });
  const entryFile = path.join(scratch, 'entry.js');
  writeFileSync(entryFile, ENTRY);
  const result = await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    write: false,
    loader: { '.ts': 'ts' },
    absWorkingDir: ROOT,
    conditions: ['import', 'module', 'browser'],
  });
  return { bundle: result.outputFiles[0].text, page: PAGE };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { bundle, page } = await build();

  const server = await startStatic(path.join(ROOT, 'public'), {
    '/scratch/poster.html': { body: page, type: 'text/html' },
    '/scratch/poster-bundle.js': { body: bundle, type: 'text/javascript' },
  });
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });

  try {
    for (const { name, width, height } of SIZES) {
      const page2 = await browser.newPage();
      const errors = [];
      page2.on('pageerror', (e) => errors.push(String(e)));
      await page2.setViewport({ width, height, deviceScaleFactor: 1 });
      await page2.goto(`${server.url}/scratch/poster.html`, { waitUntil: 'load' });
      await page2.evaluate((w, h) => window.renderPoster(w, h), width, height);
      if (errors.length) throw new Error(errors.join('\n'));
      const png = await page2.screenshot({ type: 'png' });
      await page2.close();

      const webp = await sharp(png).webp({ quality: 82, effort: 6 }).toBuffer();
      const out = path.join(OUT, `${name}.webp`);
      writeFileSync(out, webp);
      console.log(`${name.padEnd(11)} ${width}x${height} -> ${(webp.length / 1024).toFixed(0)} KB`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
