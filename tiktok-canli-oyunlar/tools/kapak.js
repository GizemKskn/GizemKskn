#!/usr/bin/env node
/*
 * Katalog kapak görselleri: her oyunu simülatörle çalıştırıp bir ekran görüntüsü alır.
 *   node tools/kapak.js                 (katalogdaki tüm oyunlar)
 *   node tools/kapak.js dolmus cay-ocagi
 * Çıktı: docs/kapaklar/<oyun>.jpg (540×960). Katalogda "thumb" alanı bu dosyayı gösterir.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'kapaklar');
fs.mkdirSync(OUT, { recursive: true });

const sandbox = { window: {} };
new Function('window', fs.readFileSync(path.join(ROOT, 'games', 'oyunlar.js'), 'utf8'))(sandbox.window);
let ids = process.argv.slice(2);
if (!ids.length) ids = (sandbox.window.LG_GAMES || []).filter((g) => !g.hidden).map((g) => g.id);

(async () => {
  const browser = await chromium.launch();
  for (const id of ids) {
    const file = path.join(ROOT, 'games', id, 'index.html');
    if (!fs.existsSync(file)) { console.log('atlandı (yok): ' + id); continue; }
    const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
    await page.goto('file://' + file + '?source=sim&demo=1&bots=60&rate=3&mute=1&music=0&bg=1&hidestatus=1');
    await page.waitForFunction(() => window.__LG_READY === true, null, { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => {
      const s = LG.sim;
      for (let i = 0; i < 25; i++) s.chat();
      s.like(null, 40); s.gift(null, 'Parmak Kalp', 2); s.gift(null, 'Donut', 1);
    });
    await page.waitForTimeout(9000);
    const dst = path.join(OUT, id + '.jpg');
    await page.screenshot({ path: dst, type: 'jpeg', quality: 82 });
    await page.close();
    console.log('✓ ' + path.relative(ROOT, dst));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
