#!/usr/bin/env node
/*
 * Oyun duman testi: oyunu headless Chromium'da simülatörle çalıştırır,
 * konsol hatalarını toplar, FPS ölçer ve ekran görüntüsü alır.
 *   node tools/test-game.js games/horon-halkasi [--seconds 12] [--flood 300] [--out shots/]
 * Çıkış kodu: hata varsa 1.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const gameDir = args.find(a => !a.startsWith('--'));
if (!gameDir) { console.error('kullanım: node tools/test-game.js games/<oyun>'); process.exit(2); }
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const seconds = +opt('seconds', 12);
const flood = +opt('flood', 300);
const root = path.resolve(__dirname, '..');
const abs = path.resolve(root, gameDir);
const outDir = path.resolve(root, opt('out', path.join('tools', 'shots')));
fs.mkdirSync(outDir, { recursive: true });
const name = path.basename(abs);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => { if (!r.url().startsWith('ws')) errors.push('requestfailed: ' + r.url()); });
  const url = 'file://' + path.join(abs, 'index.html') + '?source=sim&demo=1&bots=80&rate=3&music=0&mute=1&debug=1';
  await page.goto(url);
  await page.waitForFunction(() => window.__LG_READY === true, null, { timeout: 10000 }).catch(() => errors.push('LG.start çağrılmadı (__LG_READY yok)'));
  // Etkileşim karışımı
  await page.evaluate(() => {
    const s = LG.sim;
    for (let i = 0; i < 20; i++) s.chat();
    s.gift(null, 'Gül', 5); s.gift(null, 'Donut', 1); s.gift(null, 'Kalp Eller', 1); s.like(null, 50); s.follow(); s.share();
  });
  await page.waitForTimeout(seconds * 500);
  await page.screenshot({ path: path.join(outDir, name + '-1.png') });
  await page.evaluate((n) => { LG.sim.flood(n, 4); LG.sim.gift(null, 'Galaksi', 1); }, flood);
  await page.waitForTimeout(4500);
  await page.screenshot({ path: path.join(outDir, name + '-2-kalabalik.png') });
  await page.waitForTimeout(seconds * 500);
  const info = await page.evaluate(() => ({ fps: Math.round(LG.fps), users: LG.users.size, stats: LG.stats, title: document.title }));
  await page.screenshot({ path: path.join(outDir, name + '-3.png') });
  await browser.close();
  const ok = errors.length === 0;
  console.log(JSON.stringify({ game: name, ok, fps: info.fps, users: info.users, title: info.title, stats: info.stats, errors: errors.slice(0, 20), shots: [name + '-1.png', name + '-2-kalabalik.png', name + '-3.png'].map(f => path.join(outDir, f)) }, null, 1));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
