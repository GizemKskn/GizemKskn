/*
 * ELLERİM SİZDE! ✋ — sohbet, sunucunun kameradaki GERÇEK ELLERİNE ne yapacağını söyler.
 *
 * ─── OBS KURULUMU (ÖNEMLİ) ────────────────────────────────────────────────────────────────
 *  Bu sayfa bir ÜST KATMANDIR (overlay). Sayfa şeffaftır ve ortadaki büyük yuvarlak
 *  "KAMERA PENCERESİ" (x 60..1020, y 444..1084 — 1080x1920 tuvalde) her karede tamamen
 *  şeffaf bırakılır (her karede tuval temizlenir, dekor sadece pencerenin ÇEVRESİNE çizilir;
 *  pencere hiç boyanmaz). Pencerenin çevresine dekor + arayüz çizilir.
 *    1) OBS'te önce eller kameranı (Video Yakalama Aygıtı) ekle.
 *    2) Bu sayfayı "Tarayıcı Kaynağı" olarak 1080x1920 ekle ve kaynak listesinde kameranın
 *       ÜSTÜNE taşı (yani kamera bu sayfanın ALTINDA kalsın).
 *    3) Kamerayı pencereye denk gelecek şekilde büyüt/kırp. Oylama ve jüri sırasında pencere
 *       kısalır; kameranın alt kısmı oy kartlarının arkasında kalır, bu normaldir.
 *  OBS YOKSA (ör. TikTok LIVE Studio + pencere yakalama):
 *    ?kamera=1  sayfa eller kamerasını KENDİSİ açıp pencereye çizer (tarayıcı izin ister). Birden çok
 *               kamera varsa adından bir parça yaz: ?kamera=logitech  ·  ?ayna=1 görüntüyü aynalar.
 *    ?krom=1    pencere düz yeşil (#00ff00) boyanır → yayın programında "renk anahtarı (chroma key)"
 *               filtresiyle yeşili sil, kamerayı alta koy.
 *  URL parametreleri:
 *    ?bg=1      pencerenin içine örnek masa + iki çizgi film eli çizer (tanıtım / ekran görüntüsü).
 *               ?demo=1 veya ?sim=1 açıkken de otomatik çizilir. Canlı yayında KULLANMA.
 *    ?dolgu=0   pencerenin dışı da şeffaf olur (sadece paneller çizilir; tam ekran kamera için).
 *    ?malzemesiz=1  sadece malzeme gerektirmeyen görevler (eller, kağıt, kalem).
 *  Hediye afişleri pencerenin ALTINDAKİ satırların üstüne çıkar; görev sırasında eller hiç kapanmaz.
 * ───────────────────────────────────────────────────────────────────────────────────────────
 *
 * Akış: OYLAMA (20 sn — 1 / 2 / 3 yaz) → SEÇİLDİ (hazırlan, 3·2·1) → GÖREV (30–120 sn; her yorum
 *       ve beğeni DESTEK barını doldurur, yorumlar baloncuk olur) → JÜRİ (15 sn — E / H yaz)
 *       → SONUÇ (✅ BAŞARDI! / ❌ OLMADI 😅) → otomatik yeni oylama. Skor: "Görevler: 7 ✅ / 2 ❌".
 * Hediyeler — sadece kutlama / sunucunun kabul edip etmemekte serbest olduğu eğlenceli twist; ödül YOK:
 *   1: alkış eli yağmuru + teşekkür     2: ZORLAŞTIR çıkartması (Sol elle!, Yavaş çekim!, …)
 *   3: +30 SANİYE ya da BONUS GÖREV     4+: ALKIŞ YAĞMURU + adı sıradaki görevde "Görev Sponsoru"
 *   5+: havai fişek çerçeve + "Efsane Destekçi"
 * Takip: "Yeni takipçiler" rozet satırı · Paylaşım: teşekkür bildirimi
 * Kısayollar: N sonraki aşama · B başardım · F başaramadım · R seçenekleri yenile · T +30 sn
 *             X çıkartmaları kaldır · Z skoru sıfırla
 */
(function () {
  'use strict';
  var ui = LG.ui;
  var W = LG.W, H = LG.H, TAU = Math.PI * 2;
  var DATA = window.ES_DATA;

  // Şeffaf üst katman: kamera bu sayfanın altında.
  document.documentElement.classList.add('lg-transparent');
  var SHOW_BG = LG.qb('bg', false) || LG.config.demo || LG.config.sim;
  var FILL = LG.qb('dolgu', true);
  var PERSIST = !(LG.config.demo || LG.config.sim || LG.config.source === 'sim');

  ui.celebrateEnabled = false; // kendi hediye kutlamamız var

  // ---------------------------------------------------------------------------
  // Yerleşim (1080x1920; önemli her şey y 230..1300 içinde)
  // ---------------------------------------------------------------------------
  var WX = 60, WW = 960, WY = 444, WBOT = 1084, WR = 44;
  var WH_FULL = WBOT - WY;                       // 640
  var WIN_H = { vote: 286, reveal: WH_FULL, task: WH_FULL, jury: 416, result: WH_FULL };
  var win = { x: WX, y: WY, w: WW, h: WH_FULL };
  var TITLE_Y = 262;
  var HEAD = { x: 60, y: 314, w: 960, h: 116 };
  var RING = { x: 962, y: 372, r: 48 };
  var BAR_Y = 1096, INFO_Y = 1156, HINT_Y = 1214;
  var ROW_H = 110, ROW_GAP = 8;

  var DUR = { vote: 20, reveal: 6, jury: 15, result: 6.5 };
  var BANNER_CY = 1190, BANNER_H = 196;          // hediye afişi: pencerenin ALTINDAKİ satırların üstüne (kamera açık kalır)
  var OPT_COL = ['#3a86ff', '#ff9f1c', '#ff006e'];
  var OPT_DARK = ['#1d4fb8', '#b5650a', '#a3004a'];
  var DIFF = [null, { t: 'Kolay', c: '#06a77d' }, { t: 'Orta', c: '#e07a00' }, { t: 'Zor', c: '#e5174f' }];
  var PHASE = {
    vote: { t: '🗳️ OYLAMA', c: '#3a86ff' },
    reveal: { t: '🎬 SEÇİLDİ', c: '#8338ec' },
    task: { t: '✋ GÖREV', c: '#ff006e' },
    jury: { t: '⚖️ JÜRİ', c: '#e09c00' },
    result: { t: '🎉 SONUÇ', c: '#06a77d' },
  };
  // İpucu şeridi: o anki aşamanın komutu daha sık görünür
  var H_VOTE = '🗳️ 1, 2 ya da 3 yaz → görevi seç', H_SUP = '💪 Yorum yaz → destek ver', H_LIKE = '❤️ Beğen → destek barı dolar';
  var H_JURY = '✅ E / ❌ H → başardı mı?', H_GIFT = '🎁 Hediye → görevi zorlaştır';
  var HINTS = {
    vote: [H_VOTE, H_SUP, H_VOTE, H_LIKE, H_VOTE, H_GIFT],
    reveal: [H_SUP, H_LIKE, H_GIFT],
    task: [H_SUP, H_LIKE, '💪 "hadi", "yaparsın" yaz → süper destek', H_GIFT, '⚖️ Görev bitince jüri sizsiniz: E / H'],
    jury: [H_JURY, H_SUP, H_JURY, H_GIFT],
    result: [H_SUP, '🗳️ Birazdan yeni oylama: 1, 2 ya da 3', H_GIFT],
  };

  // ---------------------------------------------------------------------------
  // Durum
  // ---------------------------------------------------------------------------
  var S = {
    phase: 'vote', t: 0, dur: DUR.vote, round: 0,
    options: [], optLayout: [], votes: new Map(), counts: [0, 0, 0], shown: [0, 0, 0], bump: [0, 0, 0],
    recent: [[], [], []], lastVoter: [null, null, null], lastVoters: [],
    task: null, winIdx: 0, choosers: [], chooseVotes: 0, twists: [], sponsor: null, bonusBy: null,
    extraAdded: 0, taskLayout: null,
    jury: new Map(), jc: { e: 0, h: 0 }, jshow: 0.5, jbump: { e: 0, h: 0 }, jrecent: { e: [], h: [] }, jlast: { e: null, h: null },
    result: null, simFav: 0, simYes: 0.75,
  };
  var score = { ok: 0, fail: 0, streak: 0 };
  var energy = { v: 0, shown: 0, level: 0, target: 30, flash: 0, rate: 3, acc: 0, accT: 0, lastUp: -9 };
  var supporters = new Map();
  var topSup = [], topSupT = 0;
  var pendingTwists = [], sponsorQ = [], bonusQ = [], pendingExtra = 0;
  var followers = [];
  var legends = [];
  var recentTitles = [];
  var bubbles = [], bubbleQ = [], bubbleSide = 0;
  var banners = [], banner = null;
  var fireworksT = 0, fwCD = 0;
  var tlane = [];
  var timers = [];
  var lastTick = -1;
  var lastLikeFx = 0, lastApplause = 0, lastWelcome = 0;
  var infoItems = [], infoSlot = -999, infoT = 0, followFocus = 0;
  var sparkles = [];
  var lastTen = false;
  var pops = [];                                   // büyük "pat" yazıları (BAŞLA!, SÜPER DESTEK…)
  var laneLast = [null, null];                     // baloncuk şeritleri (sol / sağ) — üst üste binmesin
  var activity = [];                               // oylamada son yorum yazanlar (oy + sohbet)

  // ---------------------------------------------------------------------------
  // Yardımcılar
  // ---------------------------------------------------------------------------
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  var mctx = mk(4, 4).getContext('2d');
  function measure(text, size, weight) { mctx.font = ui.font(size, weight || 800); return mctx.measureText(text).width; }
  function wrap(text, size, maxW) {
    var words = String(text).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (cur && measure(test, size) > maxW) { lines.push(cur); cur = words[i]; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function clip(text, n) { var a = Array.from(String(text)); return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function later(d, fn) { timers.push({ t: d, fn: fn }); }
  function approach(cur, target, dt, k) { return cur + (target - cur) * (1 - Math.exp(-dt * k)); }
  function star(ctx, x, y, r, fill) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.46 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  }
  function stars(ctx, x, y, n, r, empty) {
    for (var i = 0; i < 3; i++) star(ctx, x + r + i * r * 2.15, y, r, i < n ? '#ffc300' : (empty || 'rgba(0,0,0,0.18)'));
    return r * 2.15 * 3;
  }
  function phaseLeft() { return Math.max(0, S.dur - S.t); }

  // Önbellekli yazı: strokeText her karede pahalı (300+ izleyicide FPS düşürüyor). Her farklı yazı
  // bir kez küçük bir tuvale çizilir, sonra drawImage ile basılır (ui.text ile aynı seçenekler).
  var tcache = new Map();
  function textCanvas(str, size, weight, color, stroke, strokeColor, strokeWidth, mode) {
    var key = str + '|' + size + '|' + weight + '|' + color + '|' + (stroke ? strokeColor + '|' + strokeWidth : '-') + '|' + (mode || '');
    var c = tcache.get(key);
    if (c) return c;
    if (tcache.size > 350) tcache.clear();
    var font = ui.font(size, weight);
    mctx.font = font;
    var tw = Math.ceil(mctx.measureText(str).width);
    var pad = Math.ceil((stroke ? strokeWidth : 0) / 2 + 3);
    c = mk(Math.max(1, tw + pad * 2), Math.ceil(size * 1.45) + pad * 2);
    var g = c.getContext('2d');
    g.font = font; g.textAlign = 'left'; g.textBaseline = 'middle';
    if (stroke && mode !== 'fill') { g.lineJoin = 'round'; g.lineWidth = strokeWidth; g.strokeStyle = strokeColor; g.strokeText(str, pad, c.height / 2); }
    if (mode !== 'stroke') { g.fillStyle = color; g.fillText(str, pad, c.height / 2); }
    c._tw = tw; c._pad = pad;
    tcache.set(key, c);
    return c;
  }
  function ctext(ctx, str, x, y, o) {
    o = o || {};
    str = String(str);
    if (!str) return;
    var size = Math.round(o.size || 40), weight = o.weight || 800;
    var stroke = o.stroke !== false;
    var sw = Math.round(o.strokeWidth || Math.max(3, size * 0.16));
    var c = textCanvas(str, size, weight, o.color || '#fff', stroke, o.strokeColor || 'rgba(0,0,0,0.85)', sw);
    var k = o.maxWidth && c._tw > o.maxWidth ? o.maxWidth / c._tw : 1;
    var w = c.width * k, h = c.height * k;
    var align = o.align || 'center';
    var x0 = align === 'left' ? x - c._pad * k : align === 'right' ? x - (c._tw + c._pad) * k : x - w / 2;
    var y0 = y - h / 2;
    if (k === 1) { x0 = Math.round(x0); y0 = Math.round(y0); }
    var ga = ctx.globalAlpha;
    if (o.alpha != null) ctx.globalAlpha = ga * o.alpha;
    ctx.drawImage(c, x0, y0, w, h);
    ctx.globalAlpha = ga;
  }
  // Sık değişen sayılar (%57, +184, sayaç) karakter karakter önbellekten basılır → her oyda yeni tuval oluşmaz.
  function ctextNum(ctx, str, x, y, o) {
    o = o || {};
    str = String(str);
    var size = Math.round(o.size || 40), weight = o.weight || 800, stroke = o.stroke !== false;
    var sw = Math.round(o.strokeWidth || Math.max(3, size * 0.16));
    var col = o.color || '#fff', sc = o.strokeColor || 'rgba(0,0,0,0.85)';
    var total = 0, i, c;
    for (i = 0; i < str.length; i++) total += textCanvas(str[i], size, weight, col, stroke, sc, sw, 'fill')._tw;
    var align = o.align || 'center';
    var x0 = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
    var ga = ctx.globalAlpha;
    if (o.alpha != null) ctx.globalAlpha = ga * o.alpha;
    for (var pass = stroke ? 0 : 1; pass < 2; pass++) {
      var xx = x0;
      for (i = 0; i < str.length; i++) {
        c = textCanvas(str[i], size, weight, col, stroke, sc, sw, pass === 0 ? 'stroke' : 'fill');
        ctx.drawImage(c, Math.round(xx - c._pad), Math.round(y - c.height / 2));
        xx += c._tw;
      }
    }
    ctx.globalAlpha = ga;
  }
  function timerRing(ctx, x, y, r, frac, label, col) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fill();
    ctx.lineWidth = r * 0.18; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, TAU); ctx.stroke();
    ctx.strokeStyle = frac < 0.25 ? '#ff4d6d' : col;
    ctx.beginPath(); ctx.arc(x, y, r * 0.85, -Math.PI / 2, -Math.PI / 2 + TAU * clamp01(frac)); ctx.stroke();
    ctx.restore();
    ctextNum(ctx, label, x, y + 2, { size: r * 0.75 });
  }
  function hintBar(ctx) {
    var lines = HINTS[S.phase] || HINTS.vote;
    var per = 3.2, tt = Math.max(0, S.t);
    var i = Math.floor(tt / per) % lines.length, p = (tt % per) / per;
    var a = p < 0.08 ? p / 0.08 : p > 0.92 ? (1 - p) / 0.08 : 1;
    if (S.t < per && i === 0) a = Math.max(a, clamp01(S.t / 0.2));
    ui.panel(ctx, WX, HINT_Y, WW, 72, { r: 36, fill: 'rgba(32,8,64,0.8)', border: 'rgba(255,255,255,0.4)' });
    ctext(ctx, lines[i], W / 2, HINT_Y + 38, { size: 36, alpha: a, maxWidth: WW - 40 });
  }

  // Kendi bildirim şeridimiz (pencerenin sol üstü). Ortak kütüphanenin ui.toast çağrıları da buraya gelir.
  function toast(text, o) {
    o = o || {};
    if (o.key) {
      for (var i = 0; i < tlane.length; i++) if (tlane[i].key === o.key) { tlane[i].text = text; tlane[i].t = Math.min(tlane[i].t, 0.3); tlane[i].w = measure(text, 28) + 84; return; }
    }
    tlane.unshift({ text: text, icon: o.icon || '•', color: o.color || '#fff', t: 0, life: o.life || 3.6, key: o.key || '', w: measure(text, 28) + 84 });
    if (tlane.length > 3) tlane.length = 3;
  }
  ui.toast = toast;

  // Büyük "pat" yazısı: hızlıca büyüyerek gelir, TAM opak bekler, sonda söner (ui.float baştan
  // solmaya başladığı için kamera üstünde soluk/gri görünüyordu).
  function pop(text, x, y, o) {
    o = o || {};
    if (o.key) for (var i = pops.length - 1; i >= 0; i--) if (pops[i].key === o.key) pops.splice(i, 1);
    var size = o.size || 64;
    // aynı yerde başka bir yazı varsa altına diz (ör. jüri başında "BAŞARDI MI?" + "SÜPER DESTEK")
    for (var tries = 0; tries < 3; tries++) {
      var hit = null;
      for (var j = 0; j < pops.length; j++) {
        var q = pops[j], qy = q.y + q.vy * q.t;
        if (q.t < q.life * 0.8 && Math.abs(qy - y) < (q.size + size) * 0.6) { hit = q; break; }
      }
      if (!hit) break;
      y = hit.y + hit.vy * hit.t + (hit.size + size) * 0.7;
    }
    pops.push({ text: text, x: x, y: y, size: size, color: o.color || '#ffe14d', dark: o.dark || '#3b0a5e', t: 0, life: o.life || 1.6, vy: o.vy != null ? o.vy : -24, key: o.key || '' });
    if (pops.length > 4) pops.shift();
  }
  function updatePops(dt) { for (var i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t >= pops[i].life) pops.splice(i, 1); } }
  function drawPops(ctx) {
    for (var i = 0; i < pops.length; i++) {
      var p = pops[i], k = p.t / p.life;
      var sc = p.t < 0.28 ? 0.35 + 0.65 * LG.ease.outBack(p.t / 0.28) : 1 + (p.t - 0.28) * 0.03;
      var a = k > 0.75 ? (1 - k) / 0.25 : 1;
      ctx.save();
      ctx.globalAlpha *= clamp01(a);
      ctx.translate(p.x, p.y + p.vy * p.t); ctx.scale(sc, sc);
      ctext(ctx, p.text, 5, 8, { size: p.size, weight: 900, color: 'rgba(30,0,50,0.5)', stroke: false });
      ctext(ctx, p.text, 0, 0, { size: p.size, weight: 900, color: p.color, strokeColor: p.dark, strokeWidth: Math.round(p.size * 0.2) });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Kamera seçenekleri (OBS dışı kurulumlar için)
  //   ?kamera=1        kamerayı tarayıcı açar ve pencereye kendisi çizer (TikTok LIVE Studio'da
  //                    "pencere yakalama" ile tek kaynak). ?kamera=logitech → adında "logitech" geçen kamera.
  //   ?ayna=1          kamera görüntüsünü yatay aynala
  //   ?krom=1          pencereyi düz yeşil (#00ff00) boyar → yayın programında "renk anahtarı" ile kamerayı alta koy
  //   ?malzemesiz=1    sadece malzemesiz görevler (eller, kağıt, kalem)
  // ---------------------------------------------------------------------------
  var CAM_PARAM = new URLSearchParams(location.search).get('kamera');
  var CAM_ON = CAM_PARAM !== null && ['0', 'false', 'hayir', 'hayır'].indexOf(CAM_PARAM) < 0;
  var MIRROR = LG.qb('ayna', false);
  var KROM = LG.qb('krom', false);
  var cam = { video: null, ready: false, failed: false };
  function startCamera() {
    var md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) { cam.failed = true; toast('Kamera açılamadı — tarayıcı izin vermiyor', { icon: '📷', color: '#ff8fa3', life: 8 }); return; }
    var want = CAM_PARAM && ['', '1', 'true', 'evet'].indexOf(CAM_PARAM) < 0 ? LG.cmd.norm(CAM_PARAM) : '';
    var size = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    function open(extra) { return md.getUserMedia({ video: Object.assign({}, size, extra || {}), audio: false }); }
    open().then(function (stream) {
      if (!want || !md.enumerateDevices) return stream;
      return md.enumerateDevices().then(function (devs) {
        var d = devs.filter(function (x) { return x.kind === 'videoinput' && LG.cmd.norm(x.label).indexOf(want) >= 0; })[0];
        if (!d) return stream;
        stream.getTracks().forEach(function (tr) { tr.stop(); });
        return open({ deviceId: { exact: d.deviceId } });
      });
    }).then(function (stream) {
      var v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.autoplay = true; v.srcObject = stream;
      v.onloadedmetadata = function () { try { v.play(); } catch (err) { /* yok say */ } cam.ready = true; };
      cam.video = v;
    }).catch(function (err) {
      cam.failed = true;
      toast('Kamera açılamadı (' + ((err && err.name) || 'hata') + ')', { icon: '📷', color: '#ff8fa3', life: 8 });
    });
  }
  function drawCamera(ctx) {
    var v = cam.video, vw = v.videoWidth, vh = v.videoHeight;
    if (!vw || !vh) return false;
    // kamera her zaman TAM pencereye oturur (OBS'teki gibi); pencere kısalınca alt kısmı kartların arkasında kalır
    var s = Math.max(WW / vw, WH_FULL / vh), dw = vw * s, dh = vh * s;
    ctx.save();
    ui.roundRect(ctx, win.x, win.y, win.w, win.h, WR); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(win.x, win.y, win.w, win.h);
    if (MIRROR) { ctx.translate(WX + WW / 2, 0); ctx.scale(-1, 1); ctx.translate(-(WX + WW / 2), 0); }
    ctx.drawImage(v, WX + (WW - dw) / 2, WY + (WH_FULL - dh) / 2, dw, dh);
    ctx.restore();
    return true;
  }
  var TASKS = DATA.TASKS;
  if (LG.qb('malzemesiz', false)) {
    var NOPROPS = /^(sadece eller( \+ ışık)?|kağıt|kalem|kağıt \+ kalem|kağıt \+ kurşun kalem)$/;
    var few = DATA.TASKS.filter(function (t) { return NOPROPS.test(t.p); });
    if (few.length >= 12) TASKS = few;
  }

  // ---------------------------------------------------------------------------
  // Skor (aynı gün içinde sayfa yenilense de korunur; demo/sim'de kaydedilmez)
  // ---------------------------------------------------------------------------
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  (function loadScore() {
    if (!PERSIST) return;
    var s = LG.store.get('ellerim-sizde:skor', null);
    if (s && s.d === today()) { score.ok = s.ok | 0; score.fail = s.fail | 0; }
  })();
  function saveScore() { if (PERSIST) LG.store.set('ellerim-sizde:skor', { d: today(), ok: score.ok, fail: score.fail }); }

  // ---------------------------------------------------------------------------
  // Görev seçimi
  // ---------------------------------------------------------------------------
  function pickOptions() {
    var pool = TASKS.filter(function (t) { return recentTitles.indexOf(t.t) < 0; });
    if (pool.length < 6) { recentTitles = []; pool = TASKS.slice(); }
    LG.shuffle(pool);
    var out = [], want = LG.shuffle([1, 2, 3]);
    function ok(t) { for (var k = 0; k < out.length; k++) if (out[k] === t || out[k].e === t.e) return false; return true; }
    for (var i = 0; i < want.length; i++) {
      for (var j = 0; j < pool.length; j++) if (pool[j].d === want[i] && ok(pool[j])) { out.push(pool[j]); break; }
    }
    for (var m = 0; out.length < 3 && m < pool.length; m++) if (ok(pool[m])) out.push(pool[m]);
    out.forEach(function (t) { recentTitles.push(t.t); });
    var keep = Math.min(45, Math.max(6, TASKS.length - 9));
    if (recentTitles.length > keep) recentTitles.splice(0, recentTitles.length - keep);
    return out;
  }
  function pickBonusTask() {
    var pool = TASKS.filter(function (t) { return t.d <= 2 && t.s <= 60 && recentTitles.indexOf(t.t) < 0; });
    if (!pool.length) pool = TASKS;
    var t = LG.pick(pool);
    recentTitles.push(t.t);
    return t;
  }
  function layoutOption(t) {
    var maxW = WW - 194 - 236;
    var one = measure(t.t, 38) <= maxW;
    return one ? { lines: [t.t], size: 38 } : { lines: wrap(t.t, 31, maxW).slice(0, 2), size: 31 };
  }

  // ---------------------------------------------------------------------------
  // Aşamalar
  // ---------------------------------------------------------------------------
  function setPhase(p, dur) { S.phase = p; S.t = 0; S.dur = dur; lastTick = -1; lastTen = false; }

  function resetVotes() {
    S.votes.clear(); S.counts = [0, 0, 0]; S.bump = [0, 0, 0];
    S.recent = [[], [], []]; S.lastVoter = [null, null, null]; S.lastVoters = [];
    activity = []; S.part = new Set();
  }
  function noteActivity(u) {
    var k = activity.indexOf(u); if (k >= 0) activity.splice(k, 1);
    activity.push(u); if (activity.length > 12) activity.shift();
    if (S.part) S.part.add(u.id);
  }
  function resetEnergy() {
    supporters.clear(); topSup = [];
    energy.v = 0; energy.shown = 0; energy.level = 0;
    energy.target = desiredTarget();
  }
  function desiredTarget() { return Math.round(LG.clamp(energy.rate * 9, 25, 500) * (1 + energy.level * 0.12)); }
  function startVote() {
    S.round++;
    resetEnergy();
    S.options = pickOptions();
    S.optLayout = S.options.map(layoutOption);
    S.shown = [0, 0, 0];
    S.simFav = LG.randi(0, 2);
    resetVotes();
    setPhase('vote', DUR.vote);
    LG.music.play('quiz');
    LG.sfx('whoosh');
  }
  function rerollOptions() {
    S.options = pickOptions();
    S.optLayout = S.options.map(layoutOption);
    S.shown = [0, 0, 0];
    resetVotes();
    S.t = 0;
    LG.sfx('whoosh');
    toast('Yeni seçenekler geldi — tekrar oy verin!', { icon: '🔄', color: '#ffd166' });
  }
  function endVote() {
    var max = Math.max(S.counts[0], S.counts[1], S.counts[2]);
    var cands = [0, 1, 2].filter(function (i) { return S.counts[i] === max; });
    var w = LG.pick(cands);
    var choosers = [];
    S.votes.forEach(function (v) { if (v.i === w) choosers.push(v.user); });
    beginTask(S.options[w], { idx: w, choosers: choosers, votes: S.counts[w], tie: cands.length > 1 && max > 0 });
  }
  function beginTask(task, o) {
    S.task = task;
    S.winIdx = o.idx != null ? o.idx : -1;
    S.choosers = o.choosers || [];
    S.chooseVotes = o.votes || 0;
    S.bonusBy = o.bonusBy || null;
    S.twists = pendingTwists.splice(0, 3);
    S.twists.forEach(function (tw) { tw.born = LG.time + 1.2; });
    S.sponsor = sponsorQ.shift() || null;
    S.extraAdded = pendingExtra;
    pendingExtra = 0;
    S.taskLayout = (function () {
      var one = measure(task.t, 44) <= 690;
      return one ? { lines: [task.t], size: 44 } : { lines: [task.t], size: 44 };
    })();
    if (o.bonusBy) resetEnergy();
    setPhase('reveal', DUR.reveal);
    LG.music.stop();
    LG.sfx('drum');
    later(0.12, function () { LG.sfx('levelup'); });
    ui.burst(W / 2, WY + 260, { count: 50, speed: 700 });
    if (o.tie) toast('Berabere! Kura ile seçildi 🎲', { icon: '⚖️', color: '#ffd166' });
  }
  function startTask() {
    setPhase('task', S.task.s + S.extraAdded);
    LG.sfx('go');
    LG.music.play('party');
    LG.music.setTempo(1);
    pop('BAŞLA!', W / 2, WY + WH_FULL * 0.45, { size: 150, color: '#ffe14d', life: 1.25, vy: -30 });
    ui.burst(W / 2, WY + WH_FULL * 0.5, { count: 70, speed: 900 });
    ui.shake(8, 0.25);
  }
  function startJury() {
    S.jury.clear(); S.jc = { e: 0, h: 0 }; S.jshow = 0.5; S.jbump = { e: 0, h: 0 };
    S.jrecent = { e: [], h: [] }; S.jlast = { e: null, h: null };
    S.simYes = LG.rand(0.55, 0.9);
    setPhase('jury', DUR.jury);
    LG.music.play('tension');
    LG.sfx('bell');
    pop('⚖️ BAŞARDI MI?', W / 2, WY + 190, { size: 80, color: '#ffe14d', life: 1.7, vy: -20 });
  }
  function juryVerdict() {
    var e = S.jc.e, h = S.jc.h;
    finish(e >= h, 'jury');
  }
  function finish(ok, how) {
    var tot = S.jc.e + S.jc.h;
    S.result = {
      ok: ok, how: how, e: S.jc.e, h: S.jc.h, task: S.task,
      tie: how === 'jury' && S.jc.e === S.jc.h, quiet: how === 'jury' && tot === 0,
      top: computeTopSupporters(1)[0] || null, level: energy.level, twists: S.twists.length,
    };
    if (ok) { score.ok++; score.streak++; } else { score.fail++; score.streak = 0; }
    saveScore();
    setPhase('result', DUR.result);
    LG.music.stop();
    var cx = W / 2, cy = WY + WH_FULL * 0.42;
    if (ok) {
      LG.sfx('fanfare');
      later(0.5, function () { LG.sfx('win'); });
      for (var i = 0; i < 5; i++) later(0.65 + i * 0.13, function () { LG.sfx('clap'); });
      later(0.3, function () {
        ui.shake(18, 0.5); ui.flash('#fff', 0.25);
        ui.burst(cx, cy, { count: 150, speed: 1200 });
        ui.burst(cx, cy, { count: 16, shape: 'emoji', emoji: '👏', speed: 900, size: 22 });
      });
      later(0.6, function () { ui.rain({ count: 90 }); });
    } else {
      LG.sfx('honk');
      later(0.3, function () { LG.sfx('honk'); });
      later(0.7, function () { LG.sfx('laugh'); });
      later(0.3, function () {
        ui.shake(12, 0.4);
        ui.burst(cx, cy, { count: 14, shape: 'emoji', emoji: '😅', speed: 700, size: 24 });
        ui.burst(cx, cy, { count: 40, speed: 600, colors: ['#ff4d6d', '#ffd166', '#ffffff'] });
      });
    }
  }
  function afterResult() {
    if (bonusQ.length) {
      var by = bonusQ.shift();
      beginTask(pickBonusTask(), { bonusBy: by, choosers: [] });
    } else startVote();
  }
  function nextPhase() {
    switch (S.phase) {
      case 'vote': endVote(); break;
      case 'reveal': startTask(); break;
      case 'task': startJury(); break;
      case 'jury': juryVerdict(); break;
      case 'result': afterResult(); break;
    }
  }

  // ---------------------------------------------------------------------------
  // Oylar, jüri, destek
  // ---------------------------------------------------------------------------
  var NUM_WORDS = { bir: 0, iki: 1, uc: 2, one: 0, two: 1, three: 2 };
  function voteChoice(raw) {
    var words = LG.cmd.words(raw);
    if (!words.length || words.length > 4) return -1;
    for (var i = 0; i < words.length; i++) {
      var w = words[i].replace(/[^a-z0-9]/g, '');
      if (w === '1' || w === '2' || w === '3') return +w - 1;
    }
    var f = words[0].replace(/[^a-z0-9]/g, '');
    if (words.length <= 2 && NUM_WORDS[f] != null) return NUM_WORDS[f];
    return -1;
  }
  var YES = ['e', 'evet', 'yes', 'y', 'basardi', 'basardin', 'oldu', 'tamam', 'evt'];
  var NO = ['h', 'hayir', 'no', 'n', 'olmadi', 'basaramadi', 'hayr', 'yok'];
  function juryChoice(raw) {
    if (raw.indexOf('✅') >= 0 || raw.indexOf('✔') >= 0) return 'e';
    if (raw.indexOf('❌') >= 0 || raw.indexOf('✖') >= 0) return 'h';
    var words = LG.cmd.words(raw);
    if (!words.length || words.length > 4) return null;
    var f = words[0].replace(/[^a-z0-9]/g, '');
    if (YES.indexOf(f) >= 0) return 'e';
    if (NO.indexOf(f) >= 0) return 'h';
    // "bence evet", "kesin başardı", "maalesef olmadı" — uzun kelimeler cümle içinde de sayılır
    for (var i = 1; i < words.length; i++) {
      var w = words[i].replace(/[^a-z0-9]/g, '');
      if (w.length < 3) continue;
      if (YES.indexOf(w) >= 0) return 'e';
      if (NO.indexOf(w) >= 0) return 'h';
    }
    return null;
  }
  function castVote(u, i) {
    var prev = S.votes.get(u.id);
    if (prev && prev.i === i) return;
    if (prev) S.counts[prev.i]--;
    S.votes.set(u.id, { i: i, user: u });
    S.counts[i]++;
    S.bump[i] = 1;
    var rec = S.recent[i];
    var k = rec.indexOf(u); if (k >= 0) rec.splice(k, 1);
    rec.push(u); if (rec.length > 5) rec.shift();
    if (prev) { var pr = S.recent[prev.i], pk = pr.indexOf(u); if (pk >= 0) pr.splice(pk, 1); }
    S.lastVoter[i] = { u: u, t: LG.time };
    var lv = S.lastVoters, lk = lv.indexOf(u); if (lk >= 0) lv.splice(lk, 1);
    lv.push(u); if (lv.length > 10) lv.shift();
    LG.sfx('pop');
  }
  function castJury(u, j) {
    var prev = S.jury.get(u.id);
    if (prev === j) return;
    if (prev) { S.jc[prev]--; var pr = S.jrecent[prev], pk = pr.indexOf(u); if (pk >= 0) pr.splice(pk, 1); }
    S.jury.set(u.id, j); S.jc[j]++;
    S.jbump[j] = 1;
    var rec = S.jrecent[j]; var k = rec.indexOf(u); if (k >= 0) rec.splice(k, 1);
    rec.push(u); if (rec.length > 4) rec.shift();
    S.jlast[j] = { u: u, t: LG.time };
    LG.sfx(j === 'e' ? 'correct' : 'wrong', { gap: 140 });
  }
  function isCheer(e) {
    if (/[👏💪🔥❤💖🙌✨⭐🥳]/u.test(e.raw)) return true;
    var words = e.norm.split(' ');
    for (var i = 0; i < words.length; i++) if (DATA.CHEER_WORDS.indexOf(words[i]) >= 0) return true;
    return false;
  }
  function addEnergy(v, u, pts) {
    energy.v += v; energy.acc += v;
    if (u && pts) {
      var s = supporters.get(u.id);
      if (!s) { s = { user: u, pts: 0 }; supporters.set(u.id, s); }
      s.pts += pts;
    }
    if (energy.v >= energy.target) {
      if (LG.time - energy.lastUp > 4) levelUp();
      else energy.v = energy.target;

    }
  }
  function levelUp() {
    energy.v = Math.min(energy.v - energy.target, energy.target * 0.3);
    energy.level++;
    energy.lastUp = LG.time;
    energy.target = desiredTarget();
    energy.flash = 1;
    LG.sfx('levelup');
    var txt = '💪 SÜPER DESTEK x' + (energy.level + 1) + '!';
    // "seçildi" kartı ve sonuç damgası sırasında yazı çıkmaz (bar parlar, ses çalar)
    if (S.phase !== 'reveal' && S.phase !== 'result') pop(txt, W / 2, win.y + Math.min(150, win.h * 0.42), { size: 60, color: '#ffe14d', life: 1.5, vy: -30, key: 'lvl' });
    for (var i = 0; i < 6; i++) ui.burst(WX + 80 + i * 160, BAR_Y + 26, { count: 12, speed: 500, up: 400 });
    if (S.phase === 'task') LG.music.setTempo(Math.min(1.3, 1 + energy.level * 0.05));
  }
  function computeTopSupporters(n) {
    var arr = Array.from(supporters.values());
    arr.sort(function (a, b) { return b.pts - a.pts; });
    return arr.slice(0, n).map(function (s) { return s.user; });
  }

  // ---------------------------------------------------------------------------
  // Baloncuklar (yorumlar pencere kenarında yükselir)
  // ---------------------------------------------------------------------------
  function queueBubble(u, text, cheer) {
    for (var i = 0; i < bubbleQ.length; i++) if (bubbleQ[i].u === u) { bubbleQ[i].text = text; bubbleQ[i].cheer = cheer; return; }
    bubbleQ.push({ u: u, text: text, cheer: cheer });
    if (bubbleQ.length > 8) bubbleQ.shift();
  }
  var BUB_SP = 125, BUB_H = 76;                     // sabit hız → aynı şeritteki baloncuklar birbirine yetişmez
  function makeBubble(q, side) {
    var text = clip(q.text, 20);
    var tw = measure(text, 26), nw = measure(q.u.name, 22);
    var w = Math.ceil(Math.max(tw, nw) + 96), h = BUB_H;
    var c = mk(w, h), g = c.getContext('2d');
    ui.roundRect(g, 3, 3, w - 6, h - 6, 34);
    g.fillStyle = q.cheer ? '#fff7d6' : 'rgba(255,255,255,0.96)'; g.fill();
    g.lineWidth = 4; g.strokeStyle = 'hsl(' + q.u.hue + ',80%,55%)'; g.stroke();
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = ui.font(22, 900); g.fillStyle = 'hsl(' + q.u.hue + ',70%,38%)';
    g.fillText(q.u.name, 76, 25);
    g.font = ui.font(26, 800); g.fillStyle = '#2a1650';
    g.fillText(text, 76, 53);
    return { u: q.u, c: c, w: w, h: h, side: side, t: 0, life: 3, sp: BUB_SP, ph: Math.random() * TAU, dx: LG.rand(0, 36), y0: 0, top: 0 };
  }
  function laneFree(side) {
    var b = laneLast[side];
    return !b || bubbles.indexOf(b) < 0 || b.t * b.sp >= b.h + 10;
  }
  function updateBubbles(dt) {
    if (S.phase === 'vote') bubbleQ.length = 0;
    if (bubbleQ.length && win.h > 380 && bubbles.length < 12) {
      var side = laneFree(bubbleSide) ? bubbleSide : laneFree(1 - bubbleSide) ? 1 - bubbleSide : -1;
      if (side >= 0) {
        var b = makeBubble(bubbleQ.shift(), side);
        b.y0 = win.y + win.h - 50;
        b.top = win.y + (win.h > 560 ? 250 : 175);       // üstte bildirimlere/çıkartmalara değmesin
        b.life = LG.clamp((b.y0 - b.top) / b.sp, 1.2, 4);
        bubbles.push(b);
        laneLast[side] = b;
        bubbleSide = 1 - side;
      }
    }
    for (var i = bubbles.length - 1; i >= 0; i--) {
      bubbles[i].t += dt;
      if (bubbles[i].t >= bubbles[i].life) bubbles.splice(i, 1);
    }
  }
  function drawBubbles(ctx) {
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      var p = b.t / b.life;
      var a = p < 0.08 ? p / 0.08 : p > 0.8 ? (1 - p) / 0.2 : 1;
      var sc = b.t < 0.25 ? LG.ease.outBack(b.t / 0.25) : 1;
      var y = b.y0 - b.t * b.sp;
      if (y > win.y + win.h - 30) continue;              // pencere kısaldıysa (jüri) kartların üstüne taşma
      var x = b.side === 0 ? win.x - 14 + b.dx : win.x + win.w + 14 - b.w - b.dx;
      x += Math.sin(b.t * 2.2 + b.ph) * 7;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(x + b.w / 2, y);
      ctx.scale(sc, sc);
      ctx.drawImage(b.c, -b.w / 2, -b.h / 2);
      ui.avatar(ctx, b.u, -b.w / 2 + 38, 0, 26, { ring: 'hsl(' + b.u.hue + ',80%,55%)', ringWidth: 3 });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Olaylar
  // ---------------------------------------------------------------------------
  LG.on('chat', function (e) {
    var u = e.user;
    var handled = false;
    if (S.phase === 'vote') {
      var c = voteChoice(e.raw);
      if (c >= 0) { castVote(u, c); handled = true; }
    } else if (S.phase === 'jury') {
      var j = juryChoice(e.raw);
      if (j) { castJury(u, j); handled = true; }
    }
    var cheer = isCheer(e);
    addEnergy(handled ? 1 : cheer ? 4 : 2, u, cheer ? 3 : 1);
    if (S.phase === 'vote') noteActivity(u);           // oy veren de sohbet eden de alt satırda anında görünür
    else if (!handled && !e.flagged && e.text) queueBubble(u, e.text, cheer);
    if (e.isNew && !handled && LG.time - lastWelcome > 4) {
      lastWelcome = LG.time;
      LG.sfx('join');
    }
  });
  LG.on('like', function (e) {
    var n = Math.min(e.count, 15);
    addEnergy(n * 0.18, e.user, n * 0.2);
    if (LG.time - lastLikeFx > 0.22) {
      lastLikeFx = LG.time;
      var side = Math.random() < 0.5;
      ui.float('', side ? win.x + LG.rand(30, 120) : win.x + win.w - LG.rand(30, 120), win.y + win.h - 20, { emoji: LG.pick(['❤️', '💖', '💗', '💪']), size: 34, vy: -160, life: 1.3 });
    }
  });
  LG.on('follow', function (e) {
    var u = e.user;
    for (var i = followers.length - 1; i >= 0; i--) if (followers[i].u === u) followers.splice(i, 1);
    followers.unshift({ u: u, t: LG.time });
    if (followers.length > 8) followers.length = 8;
    // art arda takipler tek bildirimde birleşir
    var fresh = followers.filter(function (f) { return LG.time - f.t < 4; });
    var ftxt = fresh.length <= 1 ? u.name + ' takip etti — hoş geldin!'
      : fresh.length === 2 ? fresh[0].u.name + ' ve ' + fresh[1].u.name + ' takip etti — hoş geldiniz!'
      : fresh[0].u.name + ', ' + fresh[1].u.name + ' +' + (fresh.length - 2) + ' kişi takip etti — hoş geldiniz!';
    toast(ftxt, { icon: '➕', color: '#7dffcf', key: 'follow' });
    LG.sfx('heart');
    infoSlot = -999;
    followFocus = LG.time + 4.5;
  });
  LG.on('share', function (e) {
    toast(e.user.name + ' paylaştı — çok teşekkürler!', { icon: '↗️', color: '#9be7ff' });
    LG.sfx('whoosh');
  });

  // --- Hediyeler ---------------------------------------------------------------
  function applause(n) {
    if (LG.time - lastApplause < 0.3) return;
    lastApplause = LG.time;
    for (var i = 0; i < n; i++) {
      ui.burst(LG.rand(win.x + 120, win.x + win.w - 120), win.y + 10, {
        count: 5, shape: 'emoji', emoji: LG.pick(['👏', '🙌', '👏', '💖']), speed: 260, up: 0, gravity: 650,
        size: 18, angle: Math.PI / 2, spread: 1.8, life: 1.5,
      });
    }
  }
  function thanks(u, gname, icon) {
    toast(u.name + ' · ' + gname + ' — teşekkürler! 💖', { icon: icon || '🎁', color: '#ffd166', key: 'g:' + u.id + ':' + gname.split(' x')[0] });
  }
  function addTwist(u, gname) {
    var target = S.phase === 'task' || S.phase === 'reveal' ? S.twists : pendingTwists;
    var used = target.map(function (x) { return x.tw.t; });
    var free = DATA.TWISTS.filter(function (x) { return used.indexOf(x.t) < 0; });
    var mine = target.some(function (x) { return x.by === u; });   // seri hediyede herkes 1 çıkartma
    if (mine || target.length >= 3 || !free.length) { thanks(u, gname); applause(2); LG.sfx('coin'); return; }
    var tw = LG.pick(free);
    target.push({ tw: tw, by: u, born: LG.time, w: measure(tw.t, 30, 900) + 74, rot: LG.rand(-0.09, 0.09) });
    var later2 = target === pendingTwists && S.phase !== 'vote';
    toast('ZORLAŞTIR: ' + tw.t + (later2 ? ' (sıradaki görev)' : '') + ' · ' + u.name + ' — teşekkürler!', { icon: '🔥', color: '#ffb347' });
    LG.sfx('zap');
    ui.burst(win.x + win.w - 160, win.y + 10, { count: 30, speed: 500 });
  }
  function tier3(u, gname) {
    var canBonus = bonusQ.length < 2 && bonusQ.indexOf(u) < 0;
    var cur = S.phase === 'task' || S.phase === 'reveal';
    var canExtra = (cur ? S.extraAdded : pendingExtra) < 120;
    if (canBonus && (!canExtra || Math.random() < 0.5)) {
      bonusQ.push(u);
      toast('BONUS GÖREV sıraya eklendi · ' + u.name + ' — teşekkürler!', { icon: '⭐', color: '#ffd166', life: 4.5 });
      LG.sfx('levelup');
    } else if (canExtra) {
      if (S.phase === 'task') {
        S.dur += 30; S.extraAdded += 30;
        pop('+30 SN', RING.x - 90, win.y + 70, { size: 56, color: '#7dffcf', dark: '#04573f', life: 1.6, vy: 10, key: 't30' });
      } else if (S.phase === 'reveal') S.extraAdded += 30;
      else pendingExtra += 30;
      toast('+30 SANİYE' + (cur ? '' : ' (sıradaki görev)') + ' · ' + u.name + ' — teşekkürler!', { icon: '⏱️', color: '#7dffcf', life: 4 });
      LG.sfx('levelup');
    } else { thanks(u, gname); LG.sfx('coin'); }
    ui.burst(W / 2, win.y + 40, { count: 60, speed: 800 });
  }
  function bigGift(u, g, tier) {
    if (sponsorQ.indexOf(u) < 0 && (!S.sponsor || S.sponsor !== u || S.phase !== 'vote')) { sponsorQ.push(u); if (sponsorQ.length > 6) sponsorQ.shift(); }
    var legend = tier >= 5;
    if (legend) {
      var li = legends.indexOf(u); if (li >= 0) legends.splice(li, 1);
      legends.unshift(u); if (legends.length > 8) legends.length = 8;
    }
    banners.push({ u: u, g: g, tier: tier, legend: legend, t: 0, dur: legend ? 5.2 : 3.8, emoji: LG.giftEmoji(g) });
    if (banners.length > 4) banners.shift();
  }
  function startBanner(b) {
    // ALKIŞ YAĞMURU
    LG.sfx(b.legend ? 'mega' : 'fanfare');
    for (var i = 0; i < 6; i++) later(0.25 + i * 0.12, function () { LG.sfx('clap'); });
    ui.rain({ count: b.legend ? 22 : 18, shape: 'emoji', emoji: '👏', size: 24 });
    ui.rain({ count: b.legend ? 80 : 70 });
    ui.shake(b.legend ? 18 : 12, 0.6);
    ui.flash(b.legend ? '#ffe28a' : '#ffffff', 0.3);
    if (b.legend) fireworksT = 10;
  }
  LG.on('gift', function (e) {
    var u = e.user, g = e.gift, tier = g.tier;
    var gname = g.name + (g.count > 1 ? ' x' + g.count : '');
    var icon = LG.giftEmoji(g);
    if (tier >= 3 && !ui.spotlightAllowed(u, tier)) { thanks(u, gname, icon); applause(1); LG.sfx('coin'); return; }
    if (tier === 1) { applause(Math.min(3, g.count)); thanks(u, gname, icon); LG.sfx('clap'); }
    else if (tier === 2) { addTwist(u, gname); applause(2); }
    else if (tier === 3) { tier3(u, gname); }
    else { bigGift(u, g, tier); thanks(u, gname, icon); }
  });

  // ---------------------------------------------------------------------------
  // Sunucu kısayolları
  // ---------------------------------------------------------------------------
  LG.onKey('n', 'Sonraki aşamaya geç', function () { nextPhase(); });
  LG.onKey('b', 'Başardım! (görevi başarılı say)', function () {
    if (S.phase === 'task' || S.phase === 'jury' || S.phase === 'reveal') finish(true, 'host');
  });
  LG.onKey('f', 'Başaramadım (görevi başarısız say)', function () {
    if (S.phase === 'task' || S.phase === 'jury' || S.phase === 'reveal') finish(false, 'host');
  });
  LG.onKey('r', '3 seçeneği yenile (oylamada)', function () {
    if (S.phase === 'vote') rerollOptions();
    else toast('Seçenekler oylama sırasında yenilenir', { icon: '🔄' });
  });
  LG.onKey('t', '+30 saniye', function () {
    if (S.phase === 'result') return;
    if (S.phase === 'reveal') S.extraAdded += 30;          // geri sayım uzamaz, görev süresi uzar
    else { S.dur += 30; if (S.phase === 'task') S.extraAdded += 30; }
    pop('+30 SN', RING.x - 90, win.y + 70, { size: 56, color: '#7dffcf', dark: '#04573f', life: 1.6, vy: 10, key: 't30' });
    LG.sfx('coin');
  });
  LG.onKey('x', 'Zorlaştırma çıkartmalarını kaldır', function () {
    S.twists = []; pendingTwists = [];
    toast('Çıkartmalar kaldırıldı', { icon: '🧽' });
  });
  LG.onKey('z', 'Görev skorunu sıfırla', function () {
    score.ok = 0; score.fail = 0; score.streak = 0; saveScore();
    toast('Skor sıfırlandı', { icon: '🔁' });
  });

  // ---------------------------------------------------------------------------
  // Simülatör yorumları (aşamaya göre gerçekçi komutlar)
  // ---------------------------------------------------------------------------
  LG.sim.comments = [['hadi', 3], ['yaparsın', 2], ['bravo', 2], ['selam', 2], ['1', 2], ['2', 2], ['3', 2], ['E', 2], ['H', 1], ['👏👏', 1]];
  LG.sim.genComment = function () {
    var r = Math.random();
    switch (S.phase) {
      case 'vote':
        if (r < 0.72) {
          var i = Math.random() < 0.45 ? S.simFav : LG.randi(0, 2);
          var n = String(i + 1);
          return LG.pick([n, n, n, n + '!!', n + ' olsun', 'bence ' + n, ['bir', 'iki', 'üç'][i], n + ' 🙏']);
        }
        if (r < 0.86) return LG.pick(['hangisi daha zor?', 'zor olanı yap 😂', 'kolay olanı seçin', 'merhaba', 'selam 👋', 'ilk kez geldim']);
        return null;
      case 'reveal':
        return LG.pick(['hadi', 'oley', 'yaparsın', 'bu zor 😂', 'hadi bakalım', '👏👏', 'heyecanlandım']);
      case 'task':
        if (r < 0.78) return LG.pick(DATA.CHEERS);
        return null;
      case 'jury':
        if (r < 0.78) return Math.random() < S.simYes ? LG.pick(['E', 'e', 'evet', 'evet ✅', 'E!!', 'başardı', 'e']) : LG.pick(['H', 'h', 'hayır', 'olmadı 😂', 'H']);
        return LG.pick(['çok iyiydi', 'emeğine sağlık', '😂😂', 'tekrar']);
      case 'result':
        return LG.pick(['bravo', 'helal', '👏👏👏', 'bir daha!', '😂😂', 'efsane', 'sıradaki gelsin']);
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // Önceden çizilen görseller
  // ---------------------------------------------------------------------------
  var bgCanvas = null, tableCanvas = null, handCanvas = null, titleW = 0;

  function buildBackground() {
    var c = mk(W, H), g = c.getContext('2d');
    var gr = g.createLinearGradient(0, 0, W * 0.35, H);
    gr.addColorStop(0, '#5b21b6');
    gr.addColorStop(0.38, '#c026d3');
    gr.addColorStop(0.7, '#ec4899');
    gr.addColorStop(1, '#fb923c');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // çapraz şeritler
    g.save();
    g.globalAlpha = 0.07; g.fillStyle = '#fff';
    g.translate(W / 2, H / 2); g.rotate(-0.5);
    for (var s = -1600; s < 1600; s += 120) g.fillRect(s, -1400, 46, 2800);
    g.restore();
    // ışık lekeleri
    var spots = [[120, 380, 420, 'rgba(255,214,102,0.30)'], [980, 700, 460, 'rgba(76,201,240,0.22)'], [200, 1250, 520, 'rgba(255,255,255,0.16)'], [900, 1500, 500, 'rgba(255,214,102,0.22)']];
    spots.forEach(function (sp) {
      var rg = g.createRadialGradient(sp[0], sp[1], 10, sp[0], sp[1], sp[2]);
      rg.addColorStop(0, sp[3]); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    });
    // soluk el emojisi deseni
    var hands = ['✋', '🤚', '✌️', '👌', '🙌', '👏', '🤞', '🖐️'];
    g.save();
    g.globalAlpha = 0.13;
    g.font = '58px ' + ui.EMOJI_FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    var k = 0;
    for (var y = 40; y < H; y += 150) {
      for (var x = (Math.floor(y / 150) % 2) * 75 + 40; x < W; x += 150) {
        g.save(); g.translate(x, y); g.rotate(((k * 37) % 60 - 30) * Math.PI / 180);
        g.fillText(hands[k % hands.length], 0, 0); g.restore(); k++;
      }
    }
    g.restore();
    // konfeti noktaları
    var cols = ['#ffd166', '#06d6a0', '#4cc9f0', '#ffffff', '#ff9f1c'];
    for (var i = 0; i < 160; i++) {
      var px = (LG.hash('x' + i) % W), py = (LG.hash('y' + i) % H);
      g.globalAlpha = 0.35; g.fillStyle = cols[i % cols.length];
      g.beginPath(); g.arc(px, py, 3 + (i % 4), 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    bgCanvas = c;
  }

  function buildTable() {
    var w = WW, h = WH_FULL;
    var c = mk(w, h), g = c.getContext('2d');
    // açık ahşap masa
    var plank = 120;
    for (var x = 0, i = 0; x < w; x += plank, i++) {
      var l = 66 + ((LG.hash('p' + i) % 9) - 4);
      var gr = g.createLinearGradient(x, 0, x + plank, 0);
      gr.addColorStop(0, 'hsl(32,55%,' + (l + 3) + '%)');
      gr.addColorStop(0.5, 'hsl(30,58%,' + l + '%)');
      gr.addColorStop(1, 'hsl(28,55%,' + (l - 4) + '%)');
      g.fillStyle = gr; g.fillRect(x, 0, plank, h);
      for (var k = 0; k < 9; k++) {
        var gx = x + 8 + (LG.hash('g' + i + '_' + k) % (plank - 16));
        g.strokeStyle = k % 3 ? 'rgba(120,70,30,0.13)' : 'rgba(255,240,210,0.2)';
        g.lineWidth = 1.5 + (k % 3);
        g.beginPath(); g.moveTo(gx, 0);
        for (var y = 0; y <= h; y += 40) g.lineTo(gx + Math.sin(y * 0.012 + k + i) * 4, y);
        g.stroke();
      }
      g.fillStyle = 'rgba(90,50,20,0.35)'; g.fillRect(x + plank - 3, 0, 3, h);
    }
    // yeşil kesim matı
    var mw = 600, mh = 360, mx = (w - mw) / 2, my = 120;
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.18)'; ui.roundRect(g, mx + 8, my + 10, mw, mh, 22); g.fill();
    g.fillStyle = '#1f9d6b'; ui.roundRect(g, mx, my, mw, mh, 22); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.5;
    for (var gx2 = mx + 30; gx2 < mx + mw; gx2 += 30) { g.beginPath(); g.moveTo(gx2, my + 10); g.lineTo(gx2, my + mh - 10); g.stroke(); }
    for (var gy2 = my + 30; gy2 < my + mh; gy2 += 30) { g.beginPath(); g.moveTo(mx + 10, gy2); g.lineTo(mx + mw - 10, gy2); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
    ui.roundRect(g, mx + 14, my + 14, mw - 28, mh - 28, 14); g.stroke();
    g.restore();
    // ışık + kenar gölgesi
    var vg = g.createRadialGradient(w / 2, h * 0.45, 100, w / 2, h * 0.45, w * 0.75);
    vg.addColorStop(0, 'rgba(255,250,230,0.18)'); vg.addColorStop(1, 'rgba(40,10,0,0.35)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
    tableCanvas = c;
  }

  // Çizgi film eli (sol el, üstten görünüm; parmaklar yukarı). Sağ el aynalanır.
  function buildHand() {
    var w = 330, h = 540;
    var c = mk(w, h), g = c.getContext('2d');
    var skin = '#f7c9a6', line = '#b9765a';
    function shapes(fn) {
      // bilek / ön kol
      fn(function () { ui.roundRect(g, 104, 300, 116, 200, 40); });
      // avuç
      fn(function () { ui.roundRect(g, 74, 178, 172, 160, 62); });
      // parmaklar
      var fx = [96, 136, 176, 214], fl = [104, 124, 118, 92], fw = 36;
      for (var i = 0; i < 4; i++) (function (i) {
        fn(function () { ui.roundRect(g, fx[i] - fw / 2, 200 - fl[i], fw, fl[i] + 40, fw / 2); });
      })(i);
      // başparmak
      fn(function () {
        g.save(); g.translate(236, 296); g.rotate(0.62);
        ui.roundRect(g, -20, -110, 40, 120, 20); g.restore();
      });
    }
    // dış çizgi
    g.lineJoin = 'round';
    shapes(function (path) { path(); g.lineWidth = 9; g.strokeStyle = line; g.stroke(); });
    shapes(function (path) { path(); g.fillStyle = skin; g.fill(); });
    // başparmak yeniden (çizgisi avucun üstünde kalmasın diye hafif)
    // tırnaklar
    var fx = [96, 136, 176, 214], fl = [104, 124, 118, 92];
    for (var i = 0; i < 4; i++) {
      g.fillStyle = '#ffe3d6'; ui.roundRect(g, fx[i] - 11, 200 - fl[i] + 6, 22, 24, 10); g.fill();
      g.strokeStyle = 'rgba(185,118,90,0.55)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(fx[i] - 9, 200 - fl[i] + 58); g.quadraticCurveTo(fx[i], 200 - fl[i] + 64, fx[i] + 9, 200 - fl[i] + 58); g.stroke();
    }
    g.save(); g.translate(236, 296); g.rotate(0.62);
    g.fillStyle = '#ffe3d6'; ui.roundRect(g, -11, -104, 22, 24, 10); g.fill();
    g.restore();
    // eklem çizgileri + gölge
    g.strokeStyle = 'rgba(185,118,90,0.45)'; g.lineWidth = 3;
    for (var j = 0; j < 4; j++) { g.beginPath(); g.arc(fx[j], 214, 9, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    var sh = g.createLinearGradient(74, 0, 246, 0);
    sh.addColorStop(0, 'rgba(200,120,90,0.18)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(200,120,90,0.2)');
    g.fillStyle = sh; ui.roundRect(g, 74, 178, 172, 160, 62); g.fill();
    // kol (kazak)
    g.fillStyle = '#7c3aed'; ui.roundRect(g, 84, 420, 156, 140, 34); g.fill();
    g.fillStyle = '#a78bfa'; ui.roundRect(g, 80, 410, 164, 34, 16); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
    for (var s = 0; s < 5; s++) { g.beginPath(); g.moveTo(96 + s * 32, 450); g.lineTo(96 + s * 32, 540); g.stroke(); }
    handCanvas = c;
  }

  function drawPlaceholder(ctx, t) {
    ctx.save();
    ui.roundRect(ctx, win.x, win.y, win.w, win.h, WR);
    ctx.clip();
    // masa, pencerenin altına hizalı (pencere kısalınca masa da kayar)
    ctx.drawImage(tableCanvas, win.x, win.y + win.h - WH_FULL);
    var sc = LG.clamp(win.h / WH_FULL, 0.5, 1) * 0.92;
    var baseY = win.y + win.h + 70 * sc;
    var cx = win.x + win.w / 2;
    // aşamaya göre el hareketi
    var ph = S.phase, lx = 0, ly = 0, la = 0.16, spread = 0;
    if (ph === 'vote') { ly = Math.sin(t * 2) * 10; la = 0.16 + Math.sin(t * 3) * 0.06; }
    else if (ph === 'reveal') { ly = 30 - Math.min(1, S.t / 0.6) * 30; la = 0.14; }
    else if (ph === 'task') { lx = Math.sin(t * 5) * 14; ly = Math.abs(Math.sin(t * 4)) * -16 - 24; la = 0.2 + Math.sin(t * 6) * 0.07; spread = -20; }
    else if (ph === 'jury') { ly = Math.sin(t * 1.5) * 8 - 10; spread = 24; la = 0.1; }
    else if (ph === 'result') {
      if (S.result && S.result.ok) { spread = -Math.abs(Math.sin(t * 9)) * 90; ly = -36; la = 0.26; }
      else { ly = 40 + Math.sin(t * 2) * 6; la = 0.04; lx = Math.sin(t * 14) * 4; }
    }
    // pervane: ortadaki görev eşyası
    var prop = null;
    if (ph === 'vote') prop = null;
    else if (S.task) prop = S.task.e;
    if (ph === 'vote' && S.options.length) {
      for (var i = 0; i < 3; i++) {
        var ox = cx + (i - 1) * 170 * sc, oy = win.y + win.h * 0.5 + Math.sin(t * 2 + i) * 6;
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(ox, oy + 44 * sc, 50 * sc, 12 * sc, 0, 0, TAU); ctx.fill();
        ui.emoji(ctx, S.options[i].e, ox, oy, 84 * sc);
      }
    } else if (prop) {
      var py = win.y + win.h * 0.42 + Math.sin(t * 2.4) * 8;
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(cx, py + 70 * sc, 80 * sc, 18 * sc, 0, 0, TAU); ctx.fill();
      ui.emoji(ctx, prop, cx, py, 130 * sc);
    }
    // eller
    var hw = handCanvas.width * sc, hh = handCanvas.height * sc;
    ctx.save();
    ctx.translate(cx - 305 * sc - spread * sc + lx, baseY + ly);
    ctx.rotate(la);
    ctx.drawImage(handCanvas, -hw / 2, -hh, hw, hh);
    ctx.restore();
    ctx.save();
    ctx.translate(cx + 305 * sc + spread * sc - lx, baseY + ly);
    ctx.rotate(-la);
    ctx.scale(-1, 1);
    ctx.drawImage(handCanvas, -hw / 2, -hh, hw, hh);
    ctx.restore();
    // bilgi yazısı
    if (ph === 'result' || ph === 'reveal') { ctx.restore(); return; }
    var ly2 = win.y + win.h - 58;
    ctx.globalAlpha = 0.92;
    ui.panel(ctx, cx - 330, ly2 - 40, 660, 80, { r: 40, fill: 'rgba(20,10,40,0.62)', border: 'rgba(255,255,255,0.35)', lineWidth: 3 });
    var camL1 = !CAM_ON ? '📷 Kamera buraya' : cam.failed ? '📷 Kamera açılamadı' : '📷 Kamera açılıyor…';
    var camL2 = !CAM_ON ? '(OBS\'te bu sayfanın ALTINA kamerayı koy)' : cam.failed ? '(izin ver ve sayfayı yenile ya da OBS kurulumunu kullan)' : '(tarayıcı sorarsa kameraya izin ver)';
    ctext(ctx, camL1, cx, ly2 - 14, { size: 32, color: '#fff' });
    ctext(ctx, camL2, cx, ly2 + 20, { size: 22, color: '#ffd166', strokeWidth: 3, maxWidth: 620 });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Çerçeve
  // ---------------------------------------------------------------------------
  function perimeterPoint(f, x, y, w, h) {
    // yuvarlak köşeleri yok sayan basit dikdörtgen çevresi
    var P = 2 * (w + h), d = ((f % 1) + 1) % 1 * P;
    if (d < w) return [x + d, y];
    d -= w; if (d < h) return [x + w, y + d];
    d -= h; if (d < w) return [x + w - d, y + h];
    d -= w; return [x, y + h - d];
  }
  function drawFrame(ctx, t) {
    var x = win.x, y = win.y, w = win.w, h = win.h;
    var gold = fireworksT > 0;
    var urgent = S.phase === 'task' && phaseLeft() <= 10;
    var pulse = urgent ? 0.5 + 0.5 * Math.sin(t * 10) : 0;
    ctx.save();
    // dış koyu çizgi
    ui.roundRect(ctx, x - 13, y - 13, w + 26, h + 26, WR + 13);
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(40,0,70,0.55)'; ctx.stroke();
    // gökkuşağı
    var cx = x + w / 2, cy = y + h / 2, g;
    var ang = t * 0.9;
    if (ctx.createConicGradient) {
      g = ctx.createConicGradient(ang, cx, cy);
      for (var i = 0; i <= 6; i++) {
        var hue = gold ? 38 + (i % 2) * 14 : (i * 60) % 360;
        g.addColorStop(i / 6, gold ? 'hsl(' + hue + ',100%,' + (i % 2 ? 72 : 55) + '%)' : 'hsl(' + hue + ',95%,62%)');
      }
    } else {
      g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#ff4d6d'); g.addColorStop(0.5, '#ffd166'); g.addColorStop(1, '#4cc9f0');
    }
    ui.roundRect(ctx, x - 6, y - 6, w + 12, h + 12, WR + 6);
    ctx.lineWidth = 14 + energy.flash * 8;
    ctx.strokeStyle = urgent ? 'rgba(255,40,80,' + (0.6 + pulse * 0.4) + ')' : g;
    ctx.stroke();
    // iç beyaz çizgi
    ui.roundRect(ctx, x + 2, y + 2, w - 4, h - 4, WR - 2);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 + energy.flash * 0.3) + ')'; ctx.stroke();
    if (energy.flash > 0) {
      ctx.globalAlpha = energy.flash * 0.6;
      ui.roundRect(ctx, x - 16, y - 16, w + 32, h + 32, WR + 16);
      ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // lamba ampulleri (sahne aynası gibi, kovalamaca)
    var n = 44, speed = 5 + energy.level * 2 + (gold ? 6 : 0);
    var step = Math.floor(t * speed);
    for (var b = 0; b < n; b++) {
      var p = perimeterPoint(b / n + 0.004, x - 6, y - 6, w + 12, h + 12);
      // köşelerde yuvarlak hatta yaklaştır
      var px = LG.clamp(p[0], x - 6 + 14, x + w + 6 - 14), py = LG.clamp(p[1], y - 6 + 14, y + h + 6 - 14);
      if ((p[0] <= x + 10 || p[0] >= x + w - 10) && (p[1] <= y + 10 || p[1] >= y + h - 10)) continue;
      px = p[0]; py = p[1];
      var lit = (b + step) % 3 === 0;
      var col = gold ? '#fff3b0' : urgent ? '#ffd0da' : '#fffbe6';
      ctx.fillStyle = lit ? (gold ? 'rgba(255,215,0,0.55)' : 'rgba(255,255,255,0.45)') : 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(px, py, lit ? 11 : 7, 0, TAU); ctx.fill();
      ctx.fillStyle = lit ? col : 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.arc(px, py, lit ? 6 : 4, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // köşe çıkartmaları
    var corners = [[x + 14, y + 14, '✋', -0.25], [x + w - 14, y + 14, '⭐', 0.2], [x + 14, y + h - 14, '💖', 0.15], [x + w - 14, y + h - 14, '🎬', -0.18]];
    for (var c = 0; c < 4; c++) {
      var k = corners[c];
      var bob = Math.sin(t * 2.4 + c * 1.7);
      ctx.save();
      ctx.translate(k[0], k[1]);
      ctx.rotate(k[3] + bob * 0.12);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(0, 0, 33, 0, TAU); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = gold ? '#ffc300' : 'hsl(' + ((t * 60 + c * 90) % 360) + ',90%,60%)'; ctx.stroke();
      ui.emoji(ctx, k[2], 0, 2, 40);
      ctx.restore();
    }
  }

  function pendingOrCurTwists() { return S.phase === 'vote' ? pendingTwists : S.twists; }
  function drawStickers(ctx, t) {
    // zorlaştırma çıkartmaları: pencerenin üst kenarına, sağdan sola
    var list = pendingOrCurTwists();
    var xr = win.x + win.w - 64;
    var total = 0;
    for (var q = 0; q < list.length; q++) total += list[q].w + 14;
    var k = Math.min(1, (win.w - 150) / Math.max(1, total));
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var w = s.w, h = 70;
      var x = xr - w * k / 2, y = win.y + 40;           // pencerenin içinde: başlık paneli üstünü kesmesin
      xr -= (w + 14) * k;
      var age = LG.time - s.born;
      if (age < 0) continue;
      var sc = (age < 0.4 ? LG.ease.outBack(age / 0.4) * (1 + (1 - age / 0.4) * 0.6) : 1) * k;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s.rot + Math.sin(t * 2 + i) * 0.02);
      ctx.scale(sc, sc);
      if (S.phase === 'vote') ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ui.roundRect(ctx, -w / 2 + 5, -h / 2 + 7, w, h, 18); ctx.fill();
      ctx.fillStyle = '#ffe14d'; ui.roundRect(ctx, -w / 2, -h / 2, w, h, 18); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ui.emoji(ctx, s.tw.e, -w / 2 + 34, -6, 34);
      ctext(ctx, s.tw.t, -w / 2 + 58, -8, { size: 30, weight: 900, align: 'left', color: '#2a1650', stroke: false });
      ctext(ctx, '— ' + s.by.name, -w / 2 + 58, 21, { size: 18, align: 'left', color: '#7a4a00', stroke: false, maxWidth: w - 70 });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Başlık + aşama paneli
  // ---------------------------------------------------------------------------
  function drawTitle(ctx, t) {
    if (!titleW) titleW = measure('ELLERİM SİZDE!', 56, 900);
    ctext(ctx, 'ELLERİM SİZDE!', 66, TITLE_Y, { size: 56, weight: 900, align: 'left', color: '#ffe14d', strokeColor: '#3b0a5e', strokeWidth: 10 });
    ctx.save();
    ctx.translate(66 + titleW + 44, TITLE_Y);
    ctx.rotate(Math.sin(t * 5) * 0.3);
    ui.emoji(ctx, '✋', 0, 0, 56);
    ctx.restore();
    // skor
    var txt = 'Görevler: ' + score.ok + ' ✅ / ' + score.fail + ' ❌' + (score.streak >= 2 ? '  🔥' + score.streak : '');
    var tw = Math.min(400, measure(txt, 30) + 44);
    var x = 1020 - tw;
    ui.panel(ctx, x, TITLE_Y - 27, tw, 54, { r: 27, fill: 'rgba(255,255,255,0.95)', border: '#3b0a5e', lineWidth: 4 });
    ctext(ctx, txt, x + tw / 2, TITLE_Y + 2, { size: 30, color: '#2a1650', stroke: false, maxWidth: tw - 30 });
  }

  function drawHeader(ctx, t) {
    var ph = PHASE[S.phase];
    var isBonus = S.bonusBy && S.phase !== 'vote';
    var tabTxt = isBonus && (S.phase === 'task' || S.phase === 'reveal') ? '⭐ BONUS GÖREV' : ph.t;
    var tabCol = isBonus && (S.phase === 'task' || S.phase === 'reveal') ? '#e09c00' : ph.c;
    ui.panel(ctx, HEAD.x, HEAD.y, HEAD.w, HEAD.h, { r: 30, fill: 'rgba(32,8,64,0.84)', border: 'rgba(255,255,255,0.4)', lineWidth: 4 });
    // sekme
    var tw = measure(tabTxt, 24, 900) + 36;
    ui.panel(ctx, HEAD.x + 22, HEAD.y - 18, tw, 36, { r: 18, fill: tabCol, border: '#fff', lineWidth: 3 });
    ctext(ctx, tabTxt, HEAD.x + 22 + tw / 2, HEAD.y + 1, { size: 24, weight: 900, color: '#fff', strokeWidth: 4 });
    // Görev Sponsoru sekmesi (görev kartının sağ üst kenarı). Oylamada sıradaki sponsor gösterilir;
    // talimat satırı ("1 · 2 · 3 yaz") hiç değişmez.
    var spU = S.phase === 'vote' ? sponsorQ[0] : S.sponsor;
    if (spU) {
      var spTxt = (S.phase === 'vote' ? '🎗️ Sıradaki sponsor: ' : '🎗️ Görev Sponsoru: ') + spU.name;
      var spW = Math.min(560, measure(spTxt, 24, 900) + 40);
      var spX = RING.x - RING.r - 18 - spW;
      var glow = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.save();
      var sg = ctx.createLinearGradient(spX, 0, spX + spW, 0);
      sg.addColorStop(0, '#ffd166'); sg.addColorStop(1, '#ff9f1c');
      ui.roundRect(ctx, spX, HEAD.y - 18, spW, 36, 18);
      ctx.fillStyle = sg; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 + glow * 0.3) + ')'; ctx.stroke();
      ctx.restore();
      ctext(ctx, spTxt, spX + spW / 2, HEAD.y + 1, { size: 24, weight: 900, color: '#3a1d00', stroke: false, maxWidth: spW - 24 });
    }

    var mx = HEAD.x + 30, my = HEAD.y + 44, sy = HEAD.y + 90;
    var maxW = RING.x - RING.r - 24 - mx;
    if (S.phase === 'vote') {
      ctext(ctx, 'Hangi görevi yapayım?', mx, my, { size: 46, align: 'left', color: '#fff', maxWidth: maxW });
      ctext(ctx, '1 · 2 · 3 yaz — en çok oy alanı yaparım!', mx, sy, { size: 28, align: 'left', color: '#ffd166', maxWidth: maxW, strokeWidth: 5 });
    } else if (S.phase === 'reveal' || S.phase === 'task') {
      var task = S.task;
      ui.emoji(ctx, task.e, mx + 36, HEAD.y + 58, 66);
      var tx = mx + 84, tmax = RING.x - RING.r - 24 - tx;
      ctext(ctx, task.t, tx, my, { size: 44, align: 'left', color: '#fff', maxWidth: tmax });
      var x = tx;
      x += stars(ctx, x, sy, task.d, 12, 'rgba(255,255,255,0.25)') + 10;
      var d = DIFF[task.d];
      var rest = d.t + '  ·  ⏱️ ' + Math.round(S.task.s + S.extraAdded) + ' sn  ·  🧰 ' + task.p;
      ctext(ctx, rest, x, sy, { size: 26, align: 'left', color: '#e9dcff', maxWidth: RING.x - RING.r - 20 - x, strokeWidth: 5 });
    } else if (S.phase === 'jury') {
      ctext(ctx, 'BAŞARDI MI?', mx, my, { size: 50, align: 'left', color: '#ffe14d', maxWidth: maxW });
      ctext(ctx, 'E yaz ✅  ·  H yaz ❌  — ' + S.task.t, mx, sy, { size: 28, align: 'left', color: '#fff', maxWidth: maxW, strokeWidth: 5 });
    } else if (S.phase === 'result') {
      var r = S.result;
      ctext(ctx, r.ok ? '✅ BAŞARDI!' : '❌ OLMADI 😅', mx, my, { size: 50, align: 'left', color: r.ok ? '#7dffcf' : '#ff8fa3', maxWidth: maxW });
      var nxt = bonusQ.length ? 'Sıradaki: ⭐ BONUS GÖREV (' + bonusQ[0].name + ')' : 'Sıradaki oylama birazdan…';
      ctext(ctx, nxt, mx, sy, { size: 28, align: 'left', color: '#ffd166', maxWidth: maxW, strokeWidth: 5 });
    }
    // sayaç halkası
    var left = phaseLeft();
    var frac = S.dur > 0 ? left / S.dur : 0;
    var urgent = (S.phase === 'task' && left <= 10) || ((S.phase === 'vote' || S.phase === 'jury') && left <= 5);
    var rs = urgent ? 1 + 0.08 * Math.max(0, Math.sin(t * 12)) : 1;
    ctx.save();
    ctx.translate(RING.x, RING.y); ctx.scale(rs, rs);
    timerRing(ctx, 0, 0, RING.r, frac, String(Math.ceil(left)), ph.c);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Oylama kartları
  // ---------------------------------------------------------------------------
  function drawVoteRows(ctx, t, alpha) {
    var y0 = win.y + win.h + 12;
    var total = S.counts[0] + S.counts[1] + S.counts[2];
    var max = Math.max(S.counts[0], S.counts[1], S.counts[2]);
    for (var i = 0; i < 3; i++) {
      var opt = S.options[i]; if (!opt) continue;
      var lay = S.optLayout[i];
      var x = WX, y = y0 + i * (ROW_H + ROW_GAP), w = WW, h = ROW_H;
      var appear = clamp01((S.t - i * 0.12) / 0.45);
      if (S.phase !== 'vote') appear = 1;
      var ea = LG.ease.outBack(appear);
      var lead = total > 0 && S.counts[i] === max;
      var col = OPT_COL[i];
      ctx.save();
      ctx.globalAlpha = alpha * clamp01(appear * 2);
      ctx.translate((1 - ea) * 300, 0);
      var bump = S.bump[i];
      if (bump > 0) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(1 + bump * 0.025, 1 + bump * 0.025); ctx.translate(-x - w / 2, -y - h / 2); }
      // gölge + kart
      ctx.fillStyle = 'rgba(30,0,60,0.35)'; ui.roundRect(ctx, x + 4, y + 7, w, h, 30); ctx.fill();
      ui.roundRect(ctx, x, y, w, h, 30);
      ctx.fillStyle = '#fffaf2'; ctx.fill();
      // oy dolgusu
      var share = S.shown[i];
      if (share > 0.002) {
        ctx.save(); ui.roundRect(ctx, x, y, w, h, 30); ctx.clip();
        var fg = ctx.createLinearGradient(x, 0, x + w * share, 0);
        fg.addColorStop(0, col + '30'); fg.addColorStop(1, col + '66');
        ctx.fillStyle = fg; ctx.fillRect(x, y, w * share, h);
        ctx.fillStyle = col; ctx.fillRect(x + w * share - 4, y, 4, h);
        ctx.restore();
      }
      ui.roundRect(ctx, x, y, w, h, 30);
      ctx.lineWidth = lead ? 6 + Math.sin(t * 8) * 1.5 : 3;
      ctx.strokeStyle = lead ? col : 'rgba(60,20,90,0.18)';
      ctx.stroke();
      // numara rozeti
      var bx = x + 56, by = y + h / 2;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, 38, 0, TAU); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctext(ctx, String(i + 1), bx, by + 3, { size: 52, weight: 900, color: '#fff', strokeColor: OPT_DARK[i], strokeWidth: 7 });
      if (lead) ui.emoji(ctx, '👑', bx - 30, by - 36 + Math.sin(t * 5) * 3, 30);
      // emoji
      ui.emoji(ctx, opt.e, x + 146, by + 2, 58);
      // başlık
      var tx = x + 194;
      if (lay.lines.length === 1) {
        ctext(ctx, lay.lines[0], tx, y + 40, { size: lay.size, align: 'left', color: '#2a1650', stroke: false });
      } else {
        ctext(ctx, lay.lines[0], tx, y + 26, { size: lay.size, align: 'left', color: '#2a1650', stroke: false });
        ctext(ctx, lay.lines[1], tx, y + 57, { size: lay.size, align: 'left', color: '#2a1650', stroke: false });
      }
      var sy = lay.lines.length === 1 ? y + 81 : y + 88;
      var sx = tx;
      sx += stars(ctx, sx, sy, opt.d, 11) + 8;
      var d = DIFF[opt.d];
      ctext(ctx, d.t, sx, sy + 1, { size: 24, align: 'left', color: d.c, stroke: false });
      sx += measure(d.t, 24) + 14;
      ctext(ctx, '⏱️ ' + opt.s + ' sn  ·  🧰 ' + opt.p, sx, sy + 1, { size: 22, align: 'left', color: '#6b5b8a', stroke: false, maxWidth: x + w - 236 - sx });
      // yüzde + sayılar
      var pct = total ? Math.round(S.counts[i] / total * 100) : 0;
      var rx = x + w - 22;
      ctextNum(ctx, '%' + pct, rx, y + 36, { size: 46, weight: 900, align: 'right', color: col, strokeColor: '#fff', strokeWidth: 6 });
      // küçük avatarlar
      var rec = S.recent[i];
      var ax = rx - 14;
      var more = S.counts[i] - rec.length;
      if (more > 0) { var mtxt = '+' + LG.fmt(more); ctextNum(ctx, mtxt, ax, y + 82, { size: 22, align: 'right', color: '#6b5b8a', stroke: false }); ax -= measure(mtxt, 22) + 18; }
      for (var k = rec.length - 1; k >= 0; k--) {
        ui.avatar(ctx, rec[k], ax, y + 82, 15, { ringWidth: 2.5, ring: '#fff' });
        ax -= 22;
      }
      // son oy veren ismi
      var lv = S.lastVoter[i];
      if (lv && LG.time - lv.t < 2.2) {
        var age = LG.time - lv.t;
        var pa = age < 0.2 ? age / 0.2 : age > 1.8 ? (2.2 - age) / 0.4 : 1;
        var ps = age < 0.25 ? LG.ease.outBack(age / 0.25) : 1;
        var nt = ui.nameTag(lv.u, 22, '#fff', col);
        ctx.save();
        ctx.globalAlpha *= pa;
        ctx.translate(rx - 200, y + 2); ctx.scale(ps, ps);
        ctx.drawImage(nt, -nt.width / 2, -nt.height / 2);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Jüri paneli
  // ---------------------------------------------------------------------------
  function drawJury(ctx, t, alpha) {
    var x = WX, y = win.y + win.h + 12, w = WW, h = WBOT - y;
    if (h < 120) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ui.panel(ctx, x, y, w, h, { r: 30, fill: 'rgba(32,8,64,0.86)', border: 'rgba(255,255,255,0.45)', lineWidth: 4 });
    var e = S.jc.e, hh = S.jc.h, tot = e + hh;
    var bw = (w - 42) / 2, bh = h - 86;
    var sides = [
      { k: 'e', x: x + 14, col: '#06d6a0', dark: '#047a5b', em: '✅', lab: 'EVET', cmd: 'E yaz', n: e },
      { k: 'h', x: x + 28 + bw, col: '#ff4d6d', dark: '#a3173a', em: '❌', lab: 'HAYIR', cmd: 'H yaz', n: hh },
    ];
    for (var i = 0; i < 2; i++) {
      var s = sides[i];
      var bump = S.jbump[s.k];
      ctx.save();
      ctx.translate(s.x + bw / 2, y + 14 + bh / 2); ctx.scale(1 + bump * 0.04, 1 + bump * 0.04); ctx.translate(-(s.x + bw / 2), -(y + 14 + bh / 2));
      ui.panel(ctx, s.x, y + 14, bw, bh, { r: 24, fill: s.col, border: '#fff', lineWidth: 4 });
      ui.emoji(ctx, s.em, s.x + 46, y + 14 + bh / 2 - 14, 50);
      ctext(ctx, s.lab, s.x + 84, y + 14 + bh * 0.34, { size: 42, weight: 900, align: 'left', color: '#fff', strokeColor: s.dark, strokeWidth: 7 });
      ui.panel(ctx, s.x + 84, y + 14 + bh * 0.62, 104, 36, { r: 18, fill: 'rgba(255,255,255,0.92)', border: false });
      ctext(ctx, s.cmd, s.x + 136, y + 14 + bh * 0.62 + 19, { size: 24, color: s.dark, stroke: false });
      ctextNum(ctx, LG.fmt(s.n), s.x + bw - 22, y + 14 + bh * 0.36, { size: 58, weight: 900, align: 'right', color: '#fff', strokeColor: s.dark, strokeWidth: 8 });
      var rec = S.jrecent[s.k], ax = s.x + bw - 34;
      for (var k = rec.length - 1; k >= 0; k--) { ui.avatar(ctx, rec[k], ax, y + 14 + bh * 0.76, 14, { ringWidth: 2.5 }); ax -= 22; }
      var lv = S.jlast[s.k];
      if (lv && LG.time - lv.t < 2.2) {
        var age = LG.time - lv.t, pa = age > 1.8 ? (2.2 - age) / 0.4 : 1;
        var nt = ui.nameTag(lv.u, 20, '#fff', 'rgba(0,0,0,0.45)');
        var room = bw - 200 - 34 - Math.max(1, rec.length) * 22 - 14, nk = Math.min(1, room / nt.width);
        ctx.globalAlpha *= pa;
        ctx.drawImage(nt, Math.round(s.x + 200), Math.round(y + 14 + bh * 0.62 + 18 - nt.height * nk / 2), nt.width * nk, nt.height * nk);
      }
      ctx.restore();
    }
    // halat çekme çubuğu
    var ty = y + h - 56, tx = x + 20, tw = w - 40, th = 38;
    var sh = S.jshow;
    ctx.save();
    ui.roundRect(ctx, tx, ty, tw, th, th / 2); ctx.clip();
    ctx.fillStyle = '#06d6a0'; ctx.fillRect(tx, ty, tw * sh, th);
    ctx.fillStyle = '#ff4d6d'; ctx.fillRect(tx + tw * sh, ty, tw * (1 - sh), th);
    ctx.restore();
    ui.roundRect(ctx, tx, ty, tw, th, th / 2); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
    var kx = LG.clamp(tx + tw * sh, tx + 100, tx + tw - 100);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(kx, ty + th / 2, 26, 0, TAU); ctx.fill();
    ui.emoji(ctx, '✋', kx, ty + th / 2 + 1, 32);
    var pe = tot ? Math.round(e / tot * 100) : 50;
    ctextNum(ctx, '%' + pe, tx + 46, ty + th / 2 + 2, { size: 26, color: '#fff', strokeWidth: 5 });
    ctextNum(ctx, '%' + (100 - pe), tx + tw - 46, ty + th / 2 + 2, { size: 26, color: '#fff', strokeWidth: 5 });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Seçildi kartı + sonuç damgası + hediye afişi
  // ---------------------------------------------------------------------------
  function drawReveal(ctx, t) {
    var task = S.task; if (!task) return;
    var p = clamp01(S.t / 0.55);
    var sc = LG.ease.outBack(p);
    var cx = W / 2, cy = win.y + win.h * 0.46;
    var cw = 860, ch = 340;
    ctx.save();
    ctx.globalAlpha = clamp01(p * 2) * (S.t > S.dur - 0.25 ? clamp01((S.dur - S.t) / 0.25) : 1);
    ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.rotate((1 - p) * -0.15);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ui.roundRect(ctx, -cw / 2 + 8, -ch / 2 + 12, cw, ch, 40); ctx.fill();
    var gg = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
    gg.addColorStop(0, '#fffdf5'); gg.addColorStop(1, '#ffeec2');
    ctx.fillStyle = gg; ui.roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 40); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = S.bonusBy ? '#ffb703' : (OPT_COL[S.winIdx] || '#8338ec'); ctx.stroke();
    // başlık sekmesi
    var tab = S.bonusBy ? '⭐ BONUS GÖREV' : '🎬 SEÇİLEN GÖREV';
    var tabW = measure(tab, 30, 900) + 50;
    ui.panel(ctx, -tabW / 2, -ch / 2 - 26, tabW, 52, { r: 26, fill: S.bonusBy ? '#e09c00' : '#8338ec', border: '#fff', lineWidth: 4 });
    ctext(ctx, tab, 0, -ch / 2 + 1, { size: 30, weight: 900, color: '#fff', strokeWidth: 5 });
    // içerik
    ui.emoji(ctx, task.e, -cw / 2 + 110, -24, 120 + Math.sin(t * 4) * 6);
    var tmaxW = cw - 250, tsize = 50, lines;
    if (measure(task.t, 50, 900) <= tmaxW) lines = [task.t];
    else if (measure(task.t, 42, 900) <= tmaxW) { lines = [task.t]; tsize = 42; }
    else { tsize = 44; lines = wrap(task.t, 44, tmaxW - 20).slice(0, 2); }
    var ty = lines.length > 1 ? -70 : -48;
    for (var i = 0; i < lines.length; i++) ctext(ctx, lines[i], -cw / 2 + 210, ty + i * 54, { size: tsize, weight: 900, align: 'left', color: '#2a1650', stroke: false, maxWidth: tmaxW });
    var sy = lines.length > 1 ? 50 : 22;
    var sx = -cw / 2 + 214;
    sx += stars(ctx, sx, sy, task.d, 14) + 10;
    var d = DIFF[task.d];
    ctext(ctx, d.t + '  ·  ⏱️ ' + (task.s + S.extraAdded) + ' sn', sx, sy + 1, { size: 28, align: 'left', color: d.c, stroke: false });
    ctext(ctx, '🧰 Hazırla: ' + task.p, -cw / 2 + 214, sy + 46, { size: 28, align: 'left', color: '#6b5b8a', stroke: false, maxWidth: cw - 300 });
    var foot = S.bonusBy ? '⭐ ' + S.bonusBy.name + ' sayesinde — teşekkürler!' : S.chooseVotes ? '🗳️ ' + LG.fmt(S.chooseVotes) + ' kişi bu görevi seçti' : '🎲 Kimse oy vermedi — sürpriz görev!';
    ctext(ctx, foot, 0, ch / 2 - 34, { size: 28, color: '#8338ec', stroke: false, maxWidth: cw - 60 });
    ctx.restore();
    // geri sayım
    var intro = DUR.reveal - 3;
    if (S.t > intro) {
      var k = Math.min(2, Math.floor(S.t - intro));
      var f = (S.t - intro) - k;
      var num = String(3 - k);
      var nsc = 1.6 - LG.ease.outCubic(clamp01(f / 0.35)) * 0.6;
      ctx.save();
      ctx.globalAlpha = f > 0.8 ? (1 - f) / 0.2 : 1;
      ctx.translate(cx + cw / 2 - 40, cy - ch / 2 + 10);
      ctx.scale(nsc, nsc);
      ctx.fillStyle = '#ff006e'; ctx.beginPath(); ctx.arc(0, 0, 62, 0, TAU); ctx.fill();
      ctx.lineWidth = 7; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctext(ctx, num, 0, 4, { size: 84, weight: 900, color: '#fff', strokeColor: '#7a0036', strokeWidth: 8 });
      ctx.restore();
    }
  }

  function drawResult(ctx, t) {
    var r = S.result; if (!r) return;
    var cx = W / 2, cy = win.y + win.h * 0.4;
    var p = clamp01((S.t - 0.05) / 0.32);
    if (p <= 0) return;
    var sc = 2.4 - LG.ease.outCubic(p) * 1.4;
    var wob = S.t > 0.4 ? Math.sin(t * 3) * 0.015 : 0;
    var outA = S.t > S.dur - 0.4 ? clamp01((S.dur - S.t) / 0.4) : 1;
    var col = r.ok ? '#06c48f' : '#ff3d68';
    var dark = r.ok ? '#04573f' : '#7a0a28';
    var main = r.ok ? 'BAŞARDI!' : 'OLMADI';
    var em = r.ok ? '✅' : '❌';
    var bw = 760, bh = 196;
    ctx.save();
    ctx.globalAlpha = clamp01(p * 1.5) * outA;
    ctx.translate(cx, cy); ctx.rotate(-0.1 + wob); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ui.roundRect(ctx, -bw / 2 + 10, -bh / 2 + 14, bw, bh, 36); ctx.fill();
    ctx.fillStyle = col; ui.roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 36); ctx.fill();
    ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = dark; ui.roundRect(ctx, -bw / 2 + 16, -bh / 2 + 16, bw - 32, bh - 32, 26); ctx.stroke();
    ui.emoji(ctx, em, -bw / 2 + 100, 4, 104);
    ctext(ctx, main, 60, 6, { size: 118, weight: 900, color: '#fff', strokeColor: dark, strokeWidth: 14, maxWidth: bw - 230 });
    if (!r.ok) ui.emoji(ctx, '😅', bw / 2 - 30, -bh / 2 + 10, 84);
    ctx.restore();
    // alt bilgi
    var q = clamp01((S.t - 0.5) / 0.4);
    if (q > 0) {
      var y = cy + 170;
      ctx.save();
      ctx.globalAlpha = q * outA;
      var head = r.ok ? 'Ellerine sağlık! 👏' : 'Bir dahakine! 💪';
      ui.panel(ctx, cx - 400, y - 46, 800, r.top ? 224 : 168, { r: 32, fill: 'rgba(32,8,64,0.96)', border: 'rgba(255,255,255,0.45)', lineWidth: 4 });
      ctext(ctx, head, cx, y - 6, { size: 48, weight: 900, color: r.ok ? '#7dffcf' : '#ffd166' });
      var jl = r.how === 'host' ? (r.ok ? '✋ Sunucu: "Başardım!"' : '✋ Sunucu: "Olmadı!"') : r.quiet ? '⚖️ Jüri sessiz — iyi niyet kazandı' : '⚖️ Jüri: ' + r.e + ' ✅  ·  ' + r.h + ' ❌' + (r.tie ? '  (berabere → başarılı)' : '');
      ctext(ctx, jl, cx, y + 50, { size: 30, color: '#fff', maxWidth: 740, strokeWidth: 5 });
      if (r.top) {
        ctext(ctx, '💪 En çok destek:', cx - 40, y + 112, { size: 30, align: 'right', color: '#ffd166', strokeWidth: 5 });
        ui.avatar(ctx, r.top, cx + 2, y + 112, 24, { ring: '#ffd166', ringWidth: 3 });
        ctext(ctx, r.top.name + (r.level ? '  · x' + (r.level + 1) : ''), cx + 36, y + 112, { size: 32, align: 'left', color: '#fff', maxWidth: 360, strokeWidth: 5 });
      }
      ctx.restore();
    }
  }

  // Hediye afişi pencerenin ALTINDAKİ satırların (destek / bilgi / ipucu) üstüne çıkar: kameradaki
  // eller, oy kartları ve jüri paneli hiç kapanmaz. Efsane'de altın ışınlar pencereye alttan vurur.
  function drawBanner(ctx, t) {
    var b = banner; if (!b) return;
    var inA = clamp01(b.t / 0.3), outA = clamp01((b.dur - b.t) / 0.4);
    var sc = LG.ease.outBack(clamp01(b.t / 0.45));
    var cx = W / 2, cy = BANNER_CY;
    var bw = 960, bh = BANNER_H;
    ctx.save();
    ctx.globalAlpha = Math.min(inA, outA);
    if (b.legend) {
      ctx.save();
      ui.roundRect(ctx, win.x, win.y, win.w, win.h, WR); ctx.clip();
      ctx.translate(cx, cy); ctx.rotate(t * 0.5);
      ctx.fillStyle = 'rgba(255,215,0,0.2)';
      for (var ri = 0; ri < 12; ri++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -70); ctx.lineTo(900, 70); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    var gg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    if (b.legend) { gg.addColorStop(0, '#3b0a5e'); gg.addColorStop(0.5, '#7a2a9e'); gg.addColorStop(1, '#3b0a5e'); }
    else { gg.addColorStop(0, '#ff006e'); gg.addColorStop(1, '#8338ec'); }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ui.roundRect(ctx, -bw / 2 + 8, -bh / 2 + 10, bw, bh, 40); ctx.fill();
    ctx.fillStyle = gg; ui.roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 40); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = b.legend ? '#ffd166' : '#fff'; ctx.stroke();
    // parıltı süpürmesi
    ctx.save(); ui.roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 40); ctx.clip();
    var sx = -bw / 2 - 200 + ((b.t * 900) % (bw + 400));
    var sg = ctx.createLinearGradient(sx - 90, 0, sx + 90, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.22)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.restore();
    ui.avatar(ctx, b.u, -bw / 2 + 100, 0, 70, { ring: '#ffd166', ringWidth: 7 });
    var title = b.legend ? '👑 EFSANE DESTEKÇİ!' : '👏 ALKIŞ YAĞMURU!';
    ctext(ctx, title, -bw / 2 + 196, -52, { size: 48, weight: 900, align: 'left', color: '#ffe14d', maxWidth: bw - 360, strokeColor: '#2a0040', strokeWidth: 8 });
    ctext(ctx, b.u.name, -bw / 2 + 196, 6, { size: 44, align: 'left', color: '#fff', maxWidth: bw - 360 });
    ctext(ctx, '🎗️ Sıradaki görevin sponsoru · Teşekkürler! 💖', -bw / 2 + 196, 58, { size: 27, align: 'left', color: '#ffd8f0', maxWidth: bw - 300, strokeWidth: 5 });
    ui.emoji(ctx, b.emoji, bw / 2 - 82, Math.sin(t * 6) * 8, 100);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Alt satırlar: destek barı, bilgi satırı, ipucu
  // ---------------------------------------------------------------------------
  function drawEnergy(ctx, t) {
    var x = WX, y = BAR_Y, w = WW, h = 52;
    var f = clamp01(energy.shown / Math.max(1, energy.target));
    ctx.save();
    ui.roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(32,8,64,0.82)'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = energy.flash > 0 ? '#fff' : 'rgba(255,255,255,0.45)'; ctx.stroke();
    var lx = x + 190;
    var fw = (w - 190 - 6) * f;
    if (fw > 4) {
      ui.roundRect(ctx, lx, y + 6, Math.max(h - 12, fw), h - 12, (h - 12) / 2);
      var g = ctx.createLinearGradient(lx, 0, x + w, 0);
      g.addColorStop(0, '#ff4d6d'); g.addColorStop(0.5, '#ff9f1c'); g.addColorStop(1, '#ffe14d');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      var sx = lx + ((t * 380) % (w + 200)) - 100;
      var sg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.45)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(lx, y, w, h);
      ctx.restore();
    }
    ctx.restore();
    // etiket
    ui.panel(ctx, x + 6, y + 6, 176, h - 12, { r: (h - 12) / 2, fill: '#ff006e', border: false });
    ctext(ctx, '💪 DESTEK', x + 94, y + h / 2 + 2, { size: 28, weight: 900, color: '#fff', strokeWidth: 4 });
    var lvl = energy.level > 0 ? '🔥 SÜPER DESTEK x' + (energy.level + 1) : 'Yorum + beğeni ile doldur!';
    ctext(ctx, lvl, lx + (w - 190) / 2, y + h / 2 + 2, { size: 26, color: '#fff', strokeWidth: 5 });
  }

  function buildInfoItems() {
    var items = [];
    if (S.phase === 'vote' && activity.length) items.push({ id: 'act', label: '💬 Son yorumlar:', users: activity.slice().reverse(), more: S.part ? S.part.size : activity.length });
    if (S.phase !== 'vote' && S.choosers.length) items.push({ label: '🗳️ Görevi seçenler:', users: S.choosers.slice(-10).reverse(), more: S.choosers.length });
    if (S.phase !== 'vote' && S.bonusBy) items.push({ label: '⭐ Bonus görev:', users: [S.bonusBy] });
    if (topSup.length) items.push({ label: '💪 En çok destek:', users: topSup });
    var fl = followers.filter(function (f) { return LG.time - f.t < 150; }).map(function (f) { return f.u; });
    if (fl.length) items.push({ id: 'follow', label: '➕ Yeni takipçiler:', users: fl, col: '#06a77d' });
    if (legends.length) items.push({ label: '👑 Efsane Destekçi:', users: legends, col: '#c9900a' });
    if (!items.length) items.push({ text: '👋 Hoş geldin! Yorum yazarak oyuna katıl 💬' });
    return items;
  }
  function drawInfo(ctx, t) {
    var x = WX, y = INFO_Y, w = WW, h = 48;
    var slot = Math.max(0, Math.floor(LG.time / 4.5));
    if (slot !== infoSlot || LG.time - infoT > 0.3 || !infoItems.length) {
      if (slot !== infoSlot) infoSlot = slot;
      infoT = LG.time;
      infoItems = buildInfoItems();
    }
    var it = infoItems[slot % infoItems.length];
    // oylamada "Son yorumlar" ana satırdır: her 2 dilimden 1'i (isim 1 sn içinde görünsün)
    if (infoItems[0].id === 'act' && infoItems.length > 1) it = slot % 2 === 0 ? infoItems[0] : infoItems[1 + ((slot >> 1) % (infoItems.length - 1))];
    var ph = (Math.max(0, LG.time) % 4.5) / 4.5;
    var a = ph < 0.06 ? ph / 0.06 : ph > 0.94 ? (1 - ph) / 0.06 : 1;
    if (LG.time < followFocus) {
      for (var fi = 0; fi < infoItems.length; fi++) if (infoItems[fi].id === 'follow') { it = infoItems[fi]; a = 1; }
    }
    ui.panel(ctx, x, y, w, h, { r: h / 2, fill: 'rgba(32,8,64,0.7)', border: 'rgba(255,255,255,0.25)', lineWidth: 3 });
    ctx.save();
    ctx.globalAlpha = a;
    if (it.text) {
      ctext(ctx, it.text, x + w / 2, y + h / 2 + 2, { size: 26, color: '#fff', maxWidth: w - 40, strokeWidth: 5 });
    } else {
      var lw = measure(it.label, 25) + 14;
      ctext(ctx, it.label, x + 22, y + h / 2 + 2, { size: 25, align: 'left', color: '#ffd166', strokeWidth: 5 });
      var cx = x + 22 + lw, maxX = x + w - 80, shown = 0;
      for (var i = 0; i < it.users.length; i++) {
        var u = it.users[i];
        var c = ui.nameTag(u, 22, '#fff', it.col || 'rgba(255,255,255,0.16)');
        if (cx + c.width + 34 > maxX) break;
        ui.avatar(ctx, u, cx + 15, y + h / 2, 15, { ringWidth: 2 });
        ctx.drawImage(c, Math.round(cx + 34), Math.round(y + h / 2 - c.height / 2));
        cx += c.width + 44; shown++;
      }
      var more = (it.more || it.users.length) - shown;
      if (more > 0) ctextNum(ctx, '+' + LG.fmt(more), x + w - 22, y + h / 2 + 2, { size: 24, align: 'right', color: '#e9dcff', strokeWidth: 4 });
    }
    ctx.restore();
  }

  function drawToasts(ctx) {
    var x = win.x + 34, y0 = win.y + (pendingOrCurTwists().length ? 112 : 66);
    var maxN = win.h < 360 ? 2 : 3;
    for (var i = 0; i < tlane.length && i < maxN; i++) {
      var to = tlane[i];
      var a = to.t < 0.25 ? to.t / 0.25 : to.t > to.life - 0.4 ? (to.life - to.t) / 0.4 : 1;
      var sl = to.t < 0.3 ? (1 - LG.ease.outCubic(to.t / 0.3)) * -80 : 0;
      var y = y0 + i * 58;
      var tw = Math.min(win.w - 60, to.w);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ui.panel(ctx, x + sl, y - 25, tw, 50, { r: 25, fill: 'rgba(20,6,44,0.78)', border: 'rgba(255,255,255,0.3)', lineWidth: 2 });
      ui.emoji(ctx, to.icon, x + sl + 30, y, 28);
      ctext(ctx, to.text, x + sl + 54, y + 2, { size: 28, align: 'left', color: to.color, maxWidth: tw - 70, strokeWidth: 4 });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Döngü
  // ---------------------------------------------------------------------------
  function update(dt, t) {
    S.t += dt;
    for (var ti = timers.length - 1; ti >= 0; ti--) {
      timers[ti].t -= dt;
      if (timers[ti].t <= 0) { var fn = timers[ti].fn; timers.splice(ti, 1); try { fn(); } catch (err) { console.error(err); } }
    }
    // geri sayım sesleri
    var left = phaseLeft(), sec = Math.ceil(left);
    var tickFrom = S.phase === 'task' ? 10 : (S.phase === 'vote' || S.phase === 'jury') ? 5 : 0;
    if (sec !== lastTick && sec <= tickFrom && sec > 0) { LG.sfx(sec <= 3 ? 'countdown' : 'tick'); lastTick = sec; }
    if (S.phase === 'task' && left <= 10 && !lastTen && S.dur > 15) {
      lastTen = true;
      pop('⏰ SON 10 SANİYE!', W / 2, win.y + 150, { size: 66, color: '#ffffff', dark: '#b0003a', life: 1.7, vy: -16 });
    }
    if (S.phase === 'reveal') {
      var intro = DUR.reveal - 3;
      var k = Math.floor(S.t - intro);
      if (S.t > intro && k !== S.revealK && k < 3) { S.revealK = k; LG.sfx('countdown'); }
    } else S.revealK = -1;
    if (S.t >= S.dur) nextPhase();

    // pencere boyu
    var targetH = WIN_H[S.phase] || WH_FULL;
    win.h = approach(win.h, targetH, dt, 7);

    // oy animasyonları
    var total = S.counts[0] + S.counts[1] + S.counts[2];
    for (var i = 0; i < 3; i++) {
      S.shown[i] = approach(S.shown[i], total ? S.counts[i] / total : 0, dt, 6);
      if (S.bump[i] > 0) S.bump[i] = Math.max(0, S.bump[i] - dt * 4);
    }
    var jt = S.jc.e + S.jc.h;
    S.jshow = approach(S.jshow, jt ? S.jc.e / jt : 0.5, dt, 5);
    S.jbump.e = Math.max(0, S.jbump.e - dt * 4); S.jbump.h = Math.max(0, S.jbump.h - dt * 4);

    // destek
    energy.shown = approach(energy.shown, energy.v, dt, 8);
    if (energy.flash > 0) energy.flash = Math.max(0, energy.flash - dt * 1.5);
    energy.accT += dt;
    if (energy.accT >= 1) {
      energy.rate = energy.rate * 0.85 + (energy.acc / energy.accT) * 0.15; energy.acc = 0; energy.accT = 0;
      // hedef, sohbetin hızına uyar (kalabalık dağılınca bar takılı kalmasın)
      energy.target = Math.max(Math.round(energy.v + 5), Math.round(LG.lerp(energy.target, desiredTarget(), 0.25)));
    }
    if (energy.v >= energy.target && LG.time - energy.lastUp > 4) levelUp();
    topSupT -= dt;
    if (topSupT <= 0) { topSupT = 0.6; topSup = computeTopSupporters(4); }

    updateBubbles(dt);
    updatePops(dt);
    for (var j = tlane.length - 1; j >= 0; j--) { tlane[j].t += dt; if (tlane[j].t > tlane[j].life) tlane.splice(j, 1); }

    // hediye afişleri
    // büyük anlarla çakışmasın: "seçildi" kartı ve sonuç damgası sırasında afiş bekler
    var busy = (S.phase === 'reveal' && S.t < 1.5) || (S.phase === 'result' && S.t < 2.6);
    if (!banner && banners.length && !busy) { banner = banners.shift(); banner.t = 0; startBanner(banner); }
    if (banner) { banner.t += dt; if (banner.t >= banner.dur) banner = null; }
    // havai fişek çerçeve
    if (fireworksT > 0) {
      fireworksT -= dt; fwCD -= dt;
      if (fwCD <= 0) {
        fwCD = 0.34;
        var p = perimeterPoint(Math.random(), win.x, win.y, win.w, win.h);
        ui.burst(p[0], p[1], { count: 18, shape: 'circle', speed: 420, up: 120, gravity: 380, life: 1, size: 12, colors: ['#ffd166', '#fff3b0', '#ff9f1c', '#ffffff', '#ff4d6d'] });
        if (Math.random() < 0.35) LG.sfx('boom', { gap: 400 });
      }
    }
    // dekor ışıltıları
    if (FILL && sparkles.length < 14 && Math.random() < dt * 4) {
      var side = Math.random();
      var sx = side < 0.5 ? LG.rand(10, 1070) : LG.rand(10, 1070);
      var sy = side < 0.5 ? LG.rand(1300, 1900) : LG.rand(20, 220);
      sparkles.push({ x: sx, y: sy, t: 0, life: LG.rand(1, 2), s: LG.rand(8, 18) });
    }
    for (var s2 = sparkles.length - 1; s2 >= 0; s2--) { sparkles[s2].t += dt; if (sparkles[s2].t > sparkles[s2].life) sparkles.splice(s2, 1); }
  }

  // Arka planı sadece pencerenin ÇEVRESİNE çiz (pencere hiç boyanmaz → şeffaf kalır).
  // 4 şerit + 4 köşe parçası; tam ekran birleştirme (destination-out) gerekmez, daha hızlı.
  function drawBgAround(ctx) {
    var x = Math.round(win.x), y = Math.round(win.y), w = Math.round(win.w), h = Math.round(win.h);
    var b = y + h, rr = x + w, r = Math.min(WR, w / 2, h / 2);
    ctx.drawImage(bgCanvas, 0, 0, W, y, 0, 0, W, y);
    ctx.drawImage(bgCanvas, 0, b, W, H - b, 0, b, W, H - b);
    ctx.drawImage(bgCanvas, 0, y, x, h, 0, y, x, h);
    ctx.drawImage(bgCanvas, rr, y, W - rr, h, rr, y, W - rr, h);
    var cs = [[x, y, x + r, y + r], [rr - r, y, rr - r, y + r], [rr - r, b - r, rr - r, b - r], [x, b - r, x + r, b - r]];
    for (var i = 0; i < 4; i++) {
      var c = cs[i];
      ctx.save();
      ctx.beginPath(); ctx.rect(c[0], c[1], r, r); ctx.arc(c[2], c[3], r, 0, TAU); ctx.clip('evenodd');
      ctx.drawImage(bgCanvas, c[0], c[1], r, r, c[0], c[1], r, r);
      ctx.restore();
    }
  }

  function render(ctx, t) {
    ctx.clearRect(0, 0, W, H);
    if (FILL) {
      drawBgAround(ctx);
      for (var i = 0; i < sparkles.length; i++) {
        var sp = sparkles[i], a = Math.sin(sp.t / sp.life * Math.PI);
        ctx.save(); ctx.globalAlpha = a * 0.9; ctx.translate(sp.x, sp.y); ctx.rotate(sp.t * 2);
        star(ctx, 0, 0, sp.s, '#fff7c2');
        ctx.restore();
      }
    }
    // KAMERA PENCERESİ: hiç boyanmadı → şeffaf. (?kamera=1 → tarayıcının kendi kamerası,
    // ?krom=1 → düz yeşil, örnek masa + eller sadece ?bg=1 / demo / sim)
    var camDrawn = CAM_ON && cam.ready && drawCamera(ctx);
    if (!camDrawn) {
      if (KROM) { ctx.save(); ui.roundRect(ctx, win.x, win.y, win.w, win.h, WR); ctx.fillStyle = '#00ff00'; ctx.fill(); ctx.restore(); }
      else if (SHOW_BG || CAM_ON) drawPlaceholder(ctx, t);
    }
    drawFrame(ctx, t);
    ctx.save();
    ui.applyShake(ctx);

    // pencere altı paneller
    if (S.phase === 'vote') drawVoteRows(ctx, t, 1);
    else if (S.phase === 'reveal' && S.t < 0.35) drawVoteRows(ctx, t, 1 - S.t / 0.35);
    if (S.phase === 'jury') drawJury(ctx, t, clamp01(S.t / 0.3));
    else if (S.phase === 'result' && S.t < 0.3 && WBOT - (win.y + win.h) > 130) drawJury(ctx, t, 1 - S.t / 0.3);

    drawBubbles(ctx);
    drawStickers(ctx, t);
    drawToasts(ctx);

    if (S.phase === 'reveal') drawReveal(ctx, t);
    if (S.phase === 'result') drawResult(ctx, t);

    drawTitle(ctx, t);
    drawHeader(ctx, t);
    drawEnergy(ctx, t);
    drawInfo(ctx, t);
    hintBar(ctx);
    drawBanner(ctx, t);
    drawPops(ctx);
    ctx.restore();
  }

  // Test / hata ayıklama için salt-okunur durum (sadece ?debug=1)
  if (LG.config.debug) window.__ES = { S: S, score: score, energy: energy, bonusQ: bonusQ, sponsorQ: sponsorQ, pendingTwists: function () { return pendingTwists; } };

  LG.start({
    id: 'ellerim-sizde',
    title: 'Ellerim Sizde! ✋',
    init: function () {
      buildBackground();
      buildTable();
      buildHand();
      if (CAM_ON) startCamera();
      startVote();
    },
    update: update,
    render: render,
  });
})();
