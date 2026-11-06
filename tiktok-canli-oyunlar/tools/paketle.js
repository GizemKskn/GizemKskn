#!/usr/bin/env node
/*
 * Satış paketi oluşturucu
 *
 *   node tools/paketle.js --ad canli-oyunlar-v1 [--oyunlar dolmus,cay-ocagi] [--iletisim "Instagram @hesabin"]
 *
 * dist/<ad>/ klasörü ve dist/<ad>.zip oluşturur:
 *   - seçilen oyunlar (varsayılan: katalogdaki tüm görünür oyunlar)
 *   - ortak altyapı + LİSANS KONTROLÜ (lisanssız kullanımda "DEMO" filigranı)
 *   - köprü (node_modules ve ayarlar.json HARİÇ)
 *   - müşteri kurulum rehberi
 * Önce bir kez: node tools/lisans.js anahtar-olustur
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const name = opt('ad', 'canli-oyunlar-paketi');
const contact = opt('iletisim', '');
const SECRET_FILE = process.env.LISANS_GIZLI || path.join(__dirname, '.lisans-gizli.json');
if (!fs.existsSync(SECRET_FILE)) {
  console.error('❌ Önce lisans anahtarı oluştur: node tools/lisans.js anahtar-olustur');
  process.exit(1);
}
const pub = JSON.parse(fs.readFileSync(SECRET_FILE, 'utf8')).pub;

// Katalogu oku
const sandbox = { window: {} };
new Function('window', fs.readFileSync(path.join(ROOT, 'games', 'oyunlar.js'), 'utf8'))(sandbox.window);
const all = (sandbox.window.LG_GAMES || []).filter((g) => !g.hidden);
const wanted = opt('oyunlar', '') ? opt('oyunlar', '').split(',').map((s) => s.trim()) : all.map((g) => g.id);
const games = all.filter((g) => wanted.includes(g.id));
if (!games.length) { console.error('❌ Paketlenecek oyun bulunamadı.'); process.exit(1); }

const OUT = path.join(ROOT, 'dist', name);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function copyDir(src, dst, filter) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (filter && !filter(s, e)) continue;
    if (e.isDirectory()) copyDir(s, d, filter);
    else fs.copyFileSync(s, d);
  }
}

// Ortak altyapı
copyDir(path.join(ROOT, 'shared'), path.join(OUT, 'shared'));
let lis = fs.readFileSync(path.join(ROOT, 'shared', 'lg-lisans.js'), 'utf8');
lis = lis.replace('__LISANS_PUB__', pub).replace('__LISANS_ILETISIM__', contact.replace(/'/g, "\\'"));
fs.writeFileSync(path.join(OUT, 'shared', 'lg-lisans.js'), lis);

// Oyunlar + lisans scriptini ekle
const INJECT = '<script src="../../shared/vendor/nacl.min.js"></script>\n  <script src="../../shared/lg-lisans.js"></script>\n';
for (const g of games) {
  const dst = path.join(OUT, 'games', g.id);
  copyDir(path.join(ROOT, 'games', g.id), dst);
  const idx = path.join(dst, 'index.html');
  let html = fs.readFileSync(idx, 'utf8');
  const marker = /(<script src="\.\.\/\.\.\/shared\/lg-sim\.js"><\/script>\s*)/;
  if (!marker.test(html)) { console.error('❌ ' + g.id + '/index.html içinde lg-sim.js satırı bulunamadı'); process.exit(1); }
  html = html.replace(marker, '$1' + INJECT + '  ');
  fs.writeFileSync(idx, html);
}
// Katalog
fs.mkdirSync(path.join(OUT, 'games'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'games', 'oyunlar.js'), '/* Oyun kataloğu */\nwindow.LG_GAMES = ' + JSON.stringify(games.map(({ hostTips, ...g }) => ({ ...g, hostTips })), null, 2) + ';\n');
fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(OUT, 'index.html'));
if (fs.existsSync(path.join(ROOT, 'docs', 'kapaklar'))) {
  copyDir(path.join(ROOT, 'docs', 'kapaklar'), path.join(OUT, 'docs', 'kapaklar'), (s) => games.some((g) => s.includes(g.id)) || fs.statSync(s).isDirectory());
}
// Köprü (node_modules ve kişisel ayarlar hariç)
copyDir(path.join(ROOT, 'bridge'), path.join(OUT, 'bridge'), (s) => !s.includes('node_modules') && !s.endsWith('ayarlar.json'));
// Müşteri belgeleri
fs.mkdirSync(path.join(OUT, 'docs'), { recursive: true });
for (const f of ['KURULUM.md', 'MUSTERI-REHBERI.md']) {
  const s = path.join(ROOT, 'docs', f);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(OUT, 'docs', f));
}
fs.writeFileSync(path.join(OUT, 'BENİ-OKU.txt'),
  'Canlı Yayın Oyunları\n====================\n\n' +
  '1) index.html dosyasını aç → oyunları Demo ile dene.\n' +
  '2) docs/KURULUM.md rehberini izle (köprü + OBS).\n' +
  '3) Lisans anahtarını oyun linkinin sonuna ekle: &lisans=ANAHTAR\n\n' +
  'Bu oyunlar TikTok veya ByteDance ile bağlantılı değildir.\n' + (contact ? '\nDestek: ' + contact + '\n' : ''));

// Zip
try {
  const zipPath = path.join(ROOT, 'dist', name + '.zip');
  fs.rmSync(zipPath, { force: true });
  execFileSync('zip', ['-qr', zipPath, name], { cwd: path.join(ROOT, 'dist') });
  console.log('✅ Paket hazır: ' + zipPath);
} catch (e) {
  console.log('✅ Paket klasörü hazır (zip aracı yok, klasörü elle sıkıştır): ' + OUT);
}
console.log('   Oyunlar: ' + games.map((g) => g.id).join(', '));
