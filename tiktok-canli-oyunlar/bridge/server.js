/*
 * TikTok LIVE köprüsü
 * ------------------
 * TikTok canlı yayınındaki yorum/beğeni/hediye/takip olaylarını okur ve
 * oyunlara yerel WebSocket üzerinden (ws://localhost:8787) iletir.
 * Ayrıca oyun dosyalarını http://localhost:8787/ adresinden sunar.
 *
 * Kullanım:
 *   npm install            (ilk seferde bir kez)
 *   node server.js kullaniciadi
 *   node server.js --test  (TikTok'a bağlanmadan sahte olaylar gönderir)
 *
 * Ayarlar (isteğe bağlı) bridge/ayarlar.json:
 *   { "kullanici": "kullaniciadi", "port": 8787, "eulerApiKey": "" }
 *
 * NOT: TikTok'un resmi bir canlı yayın API'si yoktur. Bu köprü açık kaynaklı,
 * resmi olmayan tiktok-live-connector kütüphanesini kullanır; TikTok bir şey
 * değiştirdiğinde geçici olarak çalışmayabilir. Alternatif: TikFinity uygulaması
 * (oyunlar ?source=tikfinity ile doğrudan ona da bağlanabilir).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Ayarlar
// ---------------------------------------------------------------------------
let cfg = { kullanici: '', port: 8787, eulerApiKey: '' };
try {
  const f = path.join(__dirname, 'ayarlar.json');
  if (fs.existsSync(f)) cfg = { ...cfg, ...JSON.parse(fs.readFileSync(f, 'utf8')) };
} catch (e) {
  console.error('ayarlar.json okunamadı:', e.message);
}
const argv = process.argv.slice(2);
const TEST = argv.includes('--test');
const portArg = argv.indexOf('--port');
if (portArg >= 0) cfg.port = +argv[portArg + 1];
const userArg = argv.find((a, i) => !a.startsWith('--') && !(portArg >= 0 && i === portArg + 1));
if (userArg) cfg.kullanici = userArg;
cfg.kullanici = String(cfg.kullanici || '').replace(/^@/, '').replace(/^https?:\/\/(www\.)?tiktok\.com\/@/, '').replace(/\/live.*$/, '').trim();
const EULER_KEY = process.env.EULER_API_KEY || cfg.eulerApiKey || undefined;

// ---------------------------------------------------------------------------
// HTTP: oyun dosyalarını sun
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8',
};
const status = { kullanici: cfg.kullanici, durum: TEST ? 'test' : 'başlıyor', bagli: false, olaylar: 0, istemciler: 0, sonHata: '' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/durum') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(status));
  }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.resolve(ROOT, '.' + p);
  if (!file.startsWith(ROOT) || file.includes(`${path.sep}node_modules${path.sep}`)) { res.writeHead(403); return res.end('yasak'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('bulunamadı: ' + p); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------------------------------------------------------------------------
// WebSocket: oyunlara olay yayını
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server });
function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
}
wss.on('connection', (ws) => {
  status.istemciler = wss.clients.size;
  ws.send(JSON.stringify({ type: 'status', ...status }));
  ws.on('close', () => { status.istemciler = wss.clients.size; });
  // Sunucu panelinden gelen kontrol mesajlarını (ör. "yeni tur" tuşu) tüm oyunlara ilet
  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(String(raw)); } catch (e) { return; }
    if (!m || m.type !== 'control') return;
    const msg = JSON.stringify(m);
    for (const c of wss.clients) if (c !== ws && c.readyState === 1) c.send(msg);
  });
});
function setStatus(patch) {
  Object.assign(status, patch);
  broadcast({ type: 'status', ...status });
}

// ---------------------------------------------------------------------------
// TikTok olaylarını birleşik biçime çevir (oyunlar bu biçimi bekler)
// ---------------------------------------------------------------------------
function pic(img) {
  if (!img) return '';
  return (img.url && img.url[0]) || (img.urls && img.urls[0]) || (img.urlList && img.urlList[0]) || '';
}
function user(d) {
  const u = (d && d.user) || d || {};
  const id = u.uniqueId || u.displayId || u.userId;
  if (!id && !u.nickname) return null;
  return {
    id: String(id || u.nickname),
    name: String(u.uniqueId || u.displayId || id || ''),
    nick: String(u.nickname || id || ''),
    avatar: u.profilePictureUrl || pic(u.profilePicture) || pic(u.profilePictureMedium) || '',
  };
}
const streaks = new Map();
function gift(d) {
  const det = d.giftDetails || {};
  const ext = d.extendedGiftInfo || {};
  const giftType = det.giftType ?? ext.type ?? d.giftType;
  const coins = det.diamondCount ?? ext.diamond_count ?? d.diamondCount ?? 1;
  const name = det.giftName || ext.name || d.giftName || 'Hediye';
  const id = d.giftId || det.id || name;
  const u = user(d);
  const repeat = d.repeatCount || 1;
  const key = `${u ? u.id : '?'}:${id}:${d.groupId || ''}`;
  let delta = repeat;
  if (giftType === 1) {
    const prev = streaks.get(key) || 0;
    delta = Math.max(0, repeat - prev);
    if (d.repeatEnd) streaks.delete(key); else streaks.set(key, repeat);
    if (streaks.size > 5000) streaks.clear();
  }
  if (delta <= 0) return null;
  return {
    type: 'gift',
    user: u,
    gift: { id, name, en: name, coins: Number(coins) || 1, count: delta, image: pic(det.giftImage) || pic(ext.image) || '' },
  };
}
// ---------------------------------------------------------------------------
// Oturum istatistikleri: her yayın için bridge/oturumlar/ altına özet (JSON) ve
// dakikalık döküm (CSV) yazılır. Böylece gerçek jeton/saat değerini görebilirsin.
// ---------------------------------------------------------------------------
const SESS_DIR = path.join(__dirname, 'oturumlar');
let sess = null;
function newSession() {
  const d = new Date();
  const id = d.toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  sess = {
    id, kullanici: cfg.kullanici, baslangic: d.toISOString(), bitis: null,
    yorum: 0, begeni: 0, hediye: 0, jeton: 0, takip: 0, paylasim: 0, katilim: 0,
    izleyiciMaks: 0, izleyiciToplam: 0, izleyiciOrnek: 0,
    yorumcular: new Set(), begenenler: new Set(), hediyeVerenler: new Set(), hediyeTurleri: {},
    dakika: { yorum: 0, begeni: 0, jeton: 0, izleyici: 0 }, satirlar: ['zaman,yorum,begeni,jeton,izleyici'],
  };
}
function track(evt) {
  if (!sess) newSession();
  const uid = evt.user && evt.user.id;
  switch (evt.type) {
    case 'chat': sess.yorum++; sess.dakika.yorum++; if (uid) sess.yorumcular.add(uid); break;
    case 'like': sess.begeni += evt.count || 1; sess.dakika.begeni += evt.count || 1; if (uid) sess.begenenler.add(uid); break;
    case 'gift': {
      const c = (evt.gift.coins || 0) * (evt.gift.count || 1);
      sess.hediye += evt.gift.count || 1; sess.jeton += c; sess.dakika.jeton += c;
      if (uid) sess.hediyeVerenler.add(uid);
      sess.hediyeTurleri[evt.gift.name] = (sess.hediyeTurleri[evt.gift.name] || 0) + c;
      break;
    }
    case 'follow': sess.takip++; break;
    case 'share': sess.paylasim++; break;
    case 'join': sess.katilim++; break;
    case 'viewers': sess.dakika.izleyici = evt.count || 0; sess.izleyiciMaks = Math.max(sess.izleyiciMaks, evt.count || 0); break;
  }
}
function saveSession(final) {
  if (!sess || (!sess.yorum && !sess.begeni && !sess.hediye)) return;
  try {
    fs.mkdirSync(SESS_DIR, { recursive: true });
    const now = new Date();
    if (final) sess.bitis = now.toISOString();
    const saat = Math.max(1 / 60, (now - new Date(sess.baslangic)) / 3600000);
    const ozet = {
      kullanici: sess.kullanici, baslangic: sess.baslangic, bitis: sess.bitis || now.toISOString(), sureSaat: +saat.toFixed(2),
      yorum: sess.yorum, begeni: sess.begeni, hediye: sess.hediye, jeton: sess.jeton, takip: sess.takip, paylasim: sess.paylasim,
      tekilYorumcu: sess.yorumcular.size, tekilBegenen: sess.begenenler.size, tekilHediyeVeren: sess.hediyeVerenler.size,
      izleyiciMaks: sess.izleyiciMaks, ortIzleyici: sess.izleyiciOrnek ? Math.round(sess.izleyiciToplam / sess.izleyiciOrnek) : 0,
      jetonSaat: Math.round(sess.jeton / saat),
      tahminiTL: +(sess.jeton * 0.0038 * 49.7).toFixed(0), // yaklaşık; TikTok gerçek oranı yayınlamıyor, %15 stopaj hariç
      hediyeTurleri: sess.hediyeTurleri,
    };
    fs.writeFileSync(path.join(SESS_DIR, sess.id + '.json'), JSON.stringify(ozet, null, 2));
    fs.writeFileSync(path.join(SESS_DIR, sess.id + '.csv'), sess.satirlar.join('\n') + '\n');
    if (final) console.log(`📊 Oturum özeti kaydedildi: bridge/oturumlar/${sess.id}.json (jeton/saat: ${ozet.jetonSaat}, tahmini ₺${ozet.tahminiTL})`);
  } catch (e) { console.error('Oturum kaydedilemedi:', e.message); }
}
setInterval(() => {
  if (!sess) return;
  const m = sess.dakika;
  sess.satirlar.push([new Date().toISOString().slice(11, 16), m.yorum, m.begeni, m.jeton, m.izleyici].join(','));
  if (m.izleyici) { sess.izleyiciToplam += m.izleyici; sess.izleyiciOrnek++; }
  sess.dakika = { yorum: 0, begeni: 0, jeton: 0, izleyici: m.izleyici };
  saveSession(false);
}, 60000);
process.on('SIGINT', () => { saveSession(true); process.exit(0); });
process.on('SIGTERM', () => { saveSession(true); process.exit(0); });

function emit(evt) {
  if (!evt) return;
  status.olaylar++;
  track(evt);
  broadcast(evt);
}

// ---------------------------------------------------------------------------
// TikTok bağlantısı (yeniden bağlanmalı)
// ---------------------------------------------------------------------------
async function startTikTok() {
  if (!cfg.kullanici) {
    console.log('\n⚠️  TikTok kullanıcı adı verilmedi.');
    console.log('   Örnek:  node server.js kullaniciadi');
    console.log('   ya da bridge/ayarlar.json içine "kullanici" yazın.\n');
    setStatus({ durum: 'kullanıcı adı yok' });
    return;
  }
  let mod;
  try {
    mod = await import('tiktok-live-connector');
  } catch (e) {
    console.error('\n❌ tiktok-live-connector yüklü değil. Önce bu klasörde "npm install" çalıştırın.\n');
    setStatus({ durum: 'kütüphane yok', sonHata: e.message });
    return;
  }
  const { TikTokLiveConnection, WebcastEvent, ControlEvent } = mod;
  let retryMs = 5000;
  let conn = null;

  const connect = async () => {
    conn = new TikTokLiveConnection(cfg.kullanici, { enableExtendedGiftInfo: true, signApiKey: EULER_KEY });
    conn.on(WebcastEvent.CHAT, (d) => emit({ type: 'chat', user: user(d), text: d.comment || '' }));
    conn.on(WebcastEvent.LIKE, (d) => emit({ type: 'like', user: user(d), count: d.likeCount || 1, total: d.totalLikeCount || 0 }));
    conn.on(WebcastEvent.GIFT, (d) => emit(gift(d)));
    conn.on(WebcastEvent.MEMBER, (d) => emit({ type: 'join', user: user(d) }));
    conn.on(WebcastEvent.FOLLOW, (d) => emit({ type: 'follow', user: user(d) }));
    conn.on(WebcastEvent.SHARE, (d) => emit({ type: 'share', user: user(d) }));
    conn.on(WebcastEvent.ROOM_USER, (d) => emit({ type: 'viewers', count: d.viewerCount || 0 }));
    if (WebcastEvent.SUBSCRIBE) conn.on(WebcastEvent.SUBSCRIBE, (d) => emit({ type: 'sub', user: user(d) }));
    conn.on(WebcastEvent.STREAM_END, () => {
      saveSession(true); sess = null;
      console.log('📴 Yayın bitti. Yeniden yayına girmeniz bekleniyor...');
      setStatus({ bagli: false, durum: 'yayın bitti' });
      setTimeout(connect, 15000);
    });
    conn.on(ControlEvent.DISCONNECTED, () => {
      if (!status.bagli) return;
      console.log('🔌 Bağlantı koptu, yeniden deneniyor...');
      setStatus({ bagli: false, durum: 'koptu' });
      setTimeout(connect, retryMs);
    });
    conn.on(ControlEvent.ERROR, (e) => { status.sonHata = String((e && (e.message || e.info)) || e); });

    try {
      const st = await conn.connect();
      retryMs = 5000;
      console.log(`✅ @${cfg.kullanici} yayınına bağlandı (oda ${st.roomId}). Oyunlar ws://localhost:${cfg.port} adresinden olayları alıyor.`);
      setStatus({ bagli: true, durum: 'bağlı', sonHata: '' });
    } catch (e) {
      const msg = (e && e.message) || String(e);
      const offline = /offline|not live|UserOffline|isn't online/i.test(msg) || (e && e.constructor && e.constructor.name === 'UserOfflineError');
      console.log(offline ? `⏳ @${cfg.kullanici} şu an canlı yayında değil. 20 sn sonra tekrar denenecek...` : `⚠️ Bağlanılamadı: ${msg}`);
      setStatus({ bagli: false, durum: offline ? 'yayında değil' : 'hata', sonHata: msg });
      retryMs = Math.min(60000, offline ? 20000 : retryMs * 1.5);
      setTimeout(connect, retryMs);
    }
  };
  connect();
}

// ---------------------------------------------------------------------------
// Test modu: TikTok olmadan sahte olaylar (OBS bağlantısını denemek için)
// ---------------------------------------------------------------------------
function startTest() {
  const names = ['ayse_34', 'mehmet.06', 'zeynep🌸', 'kral_ali', 'deniz_61', 'elif.k', 'cay_ocagi', 'lucas_br'];
  const comments = ['selam', 'kız', 'erkek', 'horon', 'çay', 'ankara', '34', 'a', 'b', 'harika', 'katıl'];
  const gifts = [['Rose', 1], ['Finger Heart', 5], ['Doughnut', 30], ['Hand Hearts', 100], ['Galaxy', 1000]];
  setStatus({ durum: 'test', bagli: true });
  console.log('🧪 Test modu: her saniye sahte olay gönderiliyor (TikTok bağlantısı yok).');
  setInterval(() => {
    const n = names[Math.floor(Math.random() * names.length)];
    const u = { id: 'test_' + n, name: n, nick: n, avatar: '' };
    const r = Math.random();
    if (r < 0.6) emit({ type: 'chat', user: u, text: comments[Math.floor(Math.random() * comments.length)] });
    else if (r < 0.85) emit({ type: 'like', user: u, count: 5 });
    else {
      const g = gifts[Math.floor(Math.random() * gifts.length)];
      emit({ type: 'gift', user: u, gift: { id: g[0], name: g[0], en: g[0], coins: g[1], count: 1 } });
    }
  }, 1000);
}

server.listen(cfg.port, () => {
  console.log('');
  console.log('🎮 TikTok Canlı Oyun Köprüsü');
  console.log(`   Oyun listesi:   http://localhost:${cfg.port}/`);
  console.log(`   Olay akışı:     ws://localhost:${cfg.port}`);
  console.log(`   Durum:          http://localhost:${cfg.port}/durum`);
  console.log('');
  if (TEST) startTest(); else startTikTok();
});
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`❌ ${cfg.port} portu kullanımda. Köprü zaten açık olabilir ya da --port 8788 deneyin.`);
  else console.error(e);
  process.exit(1);
});
