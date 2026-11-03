import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const WAIT = Number(process.env.WAIT_MS || 61_000);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

const index = () => page.evaluate(() => {
  const items = JSON.parse(localStorage.getItem('@@storyImages') || '[]');
  const dialog = document.querySelector('[data-testid="is-dialog"]');
  const overlay = document.querySelector('[data-testid="story-viewer-overlay"]');
  const open = !!overlay && overlay.getClientRects().length > 0;
  const srcs = [...document.querySelectorAll('[data-testid="is-dialog"] img')]
    .filter((i) => i.getClientRects().length > 0)
    .map((i) => i.getAttribute('src'));
  const idx = srcs.length ? items.findIndex((it) => srcs[0] === `data:image/jpeg;base64,${it.base64}`) : -1;
  return { open, dialog: !!dialog, idx, count: items.length };
});

await page.goto(BASE);
await page.evaluate(() => {
  const mk = (color) => {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 300;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 200, 300);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  };
  const now = Date.now();
  localStorage.setItem('@@storyImages', JSON.stringify([
    { id: 'aaa', base64: mk('#ff0000'), timestamp: now },
    { id: 'bbb', base64: mk('#00ff00'), timestamp: now },
  ]));
});
await page.reload();
await page.waitForTimeout(600);

await page.click('[data-testid="story-circle-0"]');
await page.waitForTimeout(500);
console.log('t=0   ', JSON.stringify(await index())); // expect open, idx 0

console.log(`waiting ${WAIT / 1000}s for auto-advance...`);
await page.waitForTimeout(WAIT);
console.log('t=60s ', JSON.stringify(await index())); // expect open, idx 1

console.log(`waiting ${WAIT / 1000}s more (last story → should close)...`);
await page.waitForTimeout(WAIT);
console.log('t=120s', JSON.stringify(await index())); // expect closed

await browser.close();
