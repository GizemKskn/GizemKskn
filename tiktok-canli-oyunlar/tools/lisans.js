#!/usr/bin/env node
/*
 * Lisans aracı (satıcı tarafı — bu dosyayı ve gizli anahtarı ALICIYA VERME)
 *
 *   node tools/lisans.js anahtar-olustur
 *       Bir kez çalıştır. tools/.lisans-gizli.json oluşturur (GİZLİ — yedekle, kimseyle paylaşma,
 *       git'e ekleme). Kaybedersen eski lisanslar geçersiz kalmaz ama yenilerini üretemezsin.
 *
 *   node tools/lisans.js uret <tiktok_kullanici> [--gun 30] [--oyunlar dolmus,cay-ocagi] [--not "Ayşe, Shopier #123"]
 *       Alıcıya verilecek lisans anahtarını üretir. --gun verilmezse süresiz.
 *
 *   node tools/lisans.js dogrula <anahtar>
 *       Bir anahtarın içeriğini ve geçerliliğini gösterir.
 *
 * Gizli anahtar yolu LISANS_GIZLI ortam değişkeniyle değiştirilebilir.
 */
const fs = require('fs');
const path = require('path');
const nacl = require(path.join(__dirname, '..', 'shared', 'vendor', 'nacl.min.js'));

const SECRET_FILE = process.env.LISANS_GIZLI || path.join(__dirname, '.lisans-gizli.json');
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function loadSecret() {
  if (!fs.existsSync(SECRET_FILE)) {
    console.error('❌ Gizli anahtar yok. Önce: node tools/lisans.js anahtar-olustur');
    process.exit(1);
  }
  const j = JSON.parse(fs.readFileSync(SECRET_FILE, 'utf8'));
  return { pub: fromB64u(j.pub), sec: fromB64u(j.sec) };
}

function sign(payload) {
  const { sec } = loadSecret();
  const head = 'TCO1.' + b64u(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = nacl.sign.detached(Buffer.from(head, 'utf8'), new Uint8Array(sec));
  return head + '.' + b64u(sig);
}

function verify(key) {
  const { pub } = loadSecret();
  const parts = key.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'TCO1') return { ok: false, reason: 'biçim hatalı' };
  const ok = nacl.sign.detached.verify(Buffer.from(parts[0] + '.' + parts[1], 'utf8'), new Uint8Array(fromB64u(parts[2])), new Uint8Array(pub));
  const payload = JSON.parse(fromB64u(parts[1]).toString('utf8'));
  return { ok, payload };
}

const [cmd, ...rest] = process.argv.slice(2);
const opt = (n, d) => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : d; };

if (cmd === 'anahtar-olustur') {
  if (fs.existsSync(SECRET_FILE) && !rest.includes('--zorla')) {
    console.error('⚠️ ' + SECRET_FILE + ' zaten var. Üzerine yazmak için --zorla ekle (eski lisanslar geçersiz olur!).');
    process.exit(1);
  }
  const kp = nacl.sign.keyPair();
  fs.writeFileSync(SECRET_FILE, JSON.stringify({ pub: b64u(kp.publicKey), sec: b64u(kp.secretKey), olusturma: new Date().toISOString() }, null, 2));
  console.log('✅ Anahtar çifti oluşturuldu: ' + SECRET_FILE);
  console.log('   Açık anahtar (paketlere gömülür): ' + b64u(kp.publicKey));
  console.log('   ⚠️ Bu dosyayı yedekle ve KİMSEYLE paylaşma.');
} else if (cmd === 'uret') {
  const user = (rest.find((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--'))) || '').replace(/^@/, '').toLowerCase();
  if (!user) { console.error('kullanım: node tools/lisans.js uret <tiktok_kullanici> [--gun 30] [--oyunlar a,b]'); process.exit(2); }
  const days = +opt('gun', 0);
  let e = '';
  if (days > 0) { const d = new Date(Date.now() + days * 86400000); e = d.toISOString().slice(0, 10); }
  const payload = { u: user, e, g: opt('oyunlar', '*'), n: opt('not', ''), t: new Date().toISOString().slice(0, 10) };
  const key = sign(payload);
  console.log('\n🔑 Lisans (@' + user + (e ? ', son gün ' + e : ', süresiz') + ', oyunlar: ' + payload.g + '):\n');
  console.log(key + '\n');
  console.log('Alıcı, oyun linkinin sonuna şunu ekler:  &lisans=' + key + '\n');
} else if (cmd === 'dogrula') {
  const r = verify(rest[0] || '');
  console.log(JSON.stringify(r, null, 2));
} else {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 16).join('\n'));
}
