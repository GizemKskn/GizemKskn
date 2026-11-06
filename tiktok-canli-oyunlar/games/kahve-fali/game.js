/*
 * FAL MASASI ☕ — canlı yayında izleyicilere kahve falı (eğlence amaçlı).
 *
 * Akış: "fal" yazan sıraya girer → fincanı masada demlenir → sırası gelince fincan
 * ortadaki dantel örtüye gelir, çevrilir, kapatılır, soğur → büyük FAL KARTI açılır
 * (sunucu yüksek sesle okur) → sıradaki fincan.
 *   Yorum  : fal / falıma bak → sıraya gir; aşk, para, okul, yol → konu seç;
 *            doğru / yalan → okunan falı oyla
 *   Beğeni : köpük hedefi → KÖPÜKLÜ KAHVE (60 sn boyunca tüm fallar köpüklü/şanslı)
 *   Hediye : 1. kademe lokum serpme; 2–3 altın fincan (öncelikli); 4+ büyük açılım;
 *            5+ masa parlar, konfeti
 *   Takip  : lambaya isimli nazar boncuğu; Paylaşım: bildirim
 * Kısayollar: N sıradaki, R son falı tekrar, C sırayı temizle, F hızlı mod,
 *             B kartı beklet, K köpüklü kahve
 */
(function () {
  'use strict';
  var ui = LG.ui;
  var W = LG.W, H = LG.H, SAFE = LG.SAFE;
  var TAU = Math.PI * 2;
  var GEN = window.FAL_GEN, DATA = window.FAL_DATA;
  var FONT = ui.FONT;

  ui.celebrateEnabled = false; // kendi kutlamamızı çiziyoruz
  ui.toastsEnabled = false;    // kendi bildirim şeridimiz var

  // ---------------------------------------------------------------------------
  // Yerleşim (1080x1920, önemli her şey y 230..1300 içinde)
  // ---------------------------------------------------------------------------
  var CX = 540;
  var DOILY = { x: 540, y: 640, r: 248 };
  var CENTER = { x: 540, y: 700, s: 2.0 };       // ortadaki okuma fincanının tabak merkezi
  var GRID_S = 0.85;
  var SLOTS = [];
  for (var r0 = 0; r0 < 2; r0++) for (var c0 = 0; c0 < 5; c0++) SLOTS.push({ x: 140 + c0 * 200, y: 1003 + r0 * 118 });
  var PANEL = { x: 796, y: 402, w: 244, h: 478 };
  var LAMP = { x: 150, y: 268 };
  var CEZVE = { x: 150, y: 846 };
  var CARD = { x: 100, y: 388, w: 880, h: 728 };
  var HINT_Y = 1194;
  var TICK_Y = 381;
  var NEXT_PILL_Y = 1153;

  var HINTS = [
    '💬 fal yaz → fincanın gelsin',
    '💘 aşk / 💰 para yaz → konuyu seç',
    '❤️ Beğen → köpüklü kahve',
    '🎯 doğru / yalan yaz → falı oyla',
    '🎁 Hediye → altın fincan / büyük açılım',
    '➕ Takip → lambaya nazar boncuğu 🧿',
  ];

  // ---------------------------------------------------------------------------
  // Durum
  // ---------------------------------------------------------------------------
  var Q = [];                 // sıradaki girişler
  var inQueue = new Map();    // user.id -> giriş
  var active = null;          // şu an okunan giriş
  var card = null;            // şu an gösterilen fal kartı
  var exp = null;             // ekspres fal (6 fincan birden)
  var lastShown = null;       // son gösterilen kart (R ile tekrar)
  var replay = null;          // { card | exp, t }
  var st = { name: 'idle', t: 0 };
  var fast = false, hold = false;
  var seq = 0, goldSeq = 0, goldStreak = 0;
  var sinceExpress = 0;
  var readToday = 0;
  var readTotal = LG.store.get('kahve-fali:toplam', 0) || 0;

  var foam = { v: 45, target: 300, shown: 45 };   // %15 dolu başlar (ilk adım kolay hissettirsin)
  var kopukT = 0, kopukMoment = 0, kopukCount = 0;
  var megaT = 0;
  var panelBump = 0;
  var beads = [];             // takip edenlerin nazar boncukları
  var lokums = [];            // masaya serpilen lokumlar
  var tokens = [];            // sıraya uçan fincan jetonları
  var bubbles = [];           // cezveden yükselen köpük kabarcıkları
  var poofs = [];             // buhar bulutları
  var banners = [], banner = null; // hediye teşekkür şeridi
  var tickQ = [], tick = null;      // bildirim şeridi
  var lastLikeFloat = 0, lastChatFloat = 0, lastPop = 0, lastVoteFx = 0, lastReact = 0;
  var dupNotice = new Map();

  function brewDur(e) { return e.gold ? 3.5 : fast ? 4.5 : 9; }
  function D(normal, quick) { return fast || Q.length > 12 ? quick : normal; }

  // ---------------------------------------------------------------------------
  // Yardımcılar
  // ---------------------------------------------------------------------------
  var shortCache = new Map();
  function shortUser(u, n) {
    var k = u.id + '|' + n;
    var s = shortCache.get(k);
    if (!s) {
      var chars = Array.from(u.name);
      s = { id: u.id + '~' + n, name: chars.length > n ? chars.slice(0, n - 1).join('') + '…' : u.name };
      if (shortCache.size > 2000) shortCache.clear();
      shortCache.set(k, s);
    }
    return s;
  }
  function easeIO(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function wrap(ctx, text, maxW, font) {
    ctx.save();
    ctx.font = font;
    var words = String(text).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (cur && ctx.measureText(test).width > maxW) { lines.push(cur); cur = words[i]; } else cur = test;
    }
    if (cur) lines.push(cur);
    ctx.restore();
    return lines;
  }
  function topicOf(words) {
    var T = DATA.TOPICS;
    for (var k in T) {
      if (!T[k].words) continue;
      for (var i = 0; i < words.length; i++) if (T[k].words.indexOf(words[i]) >= 0) return k;
    }
    return null;
  }
  var NOT_FAL = { falan: 1, falanca: 1, falso: 1, false: 1, fall: 1, falls: 1, falling: 1, falcon: 1, falaka: 1 };
  function wantsFal(words) {
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w.indexOf('fal') === 0 && !NOT_FAL[w]) return true;
      if (w.indexOf('fincan') === 0) return true;
    }
    return false;
  }
  var YES = ['dogru', 'aynen', 'tuttu', 'evet', 'bildin', 'dogrudur', 'kesin'];
  var NO = ['yalan', 'tutmadi', 'hayir', 'alakasiz', 'yanlis'];
  function posOf(entry) { return Q.indexOf(entry); }

  // ---------------------------------------------------------------------------
  // Önceden çizilen görseller (performans)
  // ---------------------------------------------------------------------------
  var bgCanvas = null, glowCanvas = null, groundsCanvas = null, globeCanvas = null, beadCanvas = null;
  var lokumSprites = [];
  var cupSprites = new Map();
  var symSprites = new Map();
  var titleCanvas = null, titleW = 0, haloCanvas = null;
  var paperCache = {};

  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function seeded(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function buildBackground() {
    var c = mk(W, H), g = c.getContext('2d');
    var rnd = seeded(42);
    // Ahşap masa: yatay tahtalar
    var plankH = 150;
    for (var y = 0, i = 0; y < H; y += plankH, i++) {
      var l = 21 + rnd() * 7;
      var grad = g.createLinearGradient(0, y, 0, y + plankH);
      grad.addColorStop(0, 'hsl(24,48%,' + (l + 3) + '%)');
      grad.addColorStop(0.5, 'hsl(22,50%,' + l + '%)');
      grad.addColorStop(1, 'hsl(20,52%,' + (l - 3) + '%)');
      g.fillStyle = grad; g.fillRect(0, y, W, plankH);
      // damarlar
      for (var k = 0; k < 16; k++) {
        var gy = y + 8 + rnd() * (plankH - 16);
        g.strokeStyle = rnd() < 0.5 ? 'rgba(0,0,0,' + (0.06 + rnd() * 0.08) + ')' : 'rgba(255,200,140,' + (0.03 + rnd() * 0.05) + ')';
        g.lineWidth = 1 + rnd() * 2.5;
        g.beginPath(); g.moveTo(0, gy);
        var amp = 2 + rnd() * 6, fr = 0.004 + rnd() * 0.01, ph = rnd() * 6;
        for (var x = 0; x <= W; x += 30) g.lineTo(x, gy + Math.sin(x * fr + ph) * amp);
        g.stroke();
      }
      // budak
      if (rnd() < 0.7) {
        var kx = 80 + rnd() * (W - 160), ky = y + 30 + rnd() * (plankH - 60);
        for (var rr = 4; rr > 0; rr--) {
          g.strokeStyle = 'rgba(40,18,6,' + (0.12 + rr * 0.03) + ')'; g.lineWidth = 2;
          g.beginPath(); g.ellipse(kx, ky, 10 + rr * 9, 4 + rr * 3, 0, 0, TAU); g.stroke();
        }
        g.fillStyle = 'rgba(40,18,6,0.35)'; g.beginPath(); g.ellipse(kx, ky, 9, 4, 0, 0, TAU); g.fill();
      }
      // tahta arası çizgi
      g.fillStyle = 'rgba(20,8,2,0.55)'; g.fillRect(0, y + plankH - 3, W, 3);
      g.fillStyle = 'rgba(255,210,160,0.06)'; g.fillRect(0, y, W, 2);
    }
    // Lamba ışığı
    var lg = g.createRadialGradient(DOILY.x, DOILY.y + 40, 40, DOILY.x, DOILY.y + 40, 820);
    lg.addColorStop(0, 'rgba(255,196,120,0.30)');
    lg.addColorStop(0.5, 'rgba(255,170,90,0.12)');
    lg.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    // Kahve çekirdekleri (dekor; üst/alt bölgeler ve kenarlar)
    for (var b = 0; b < 70; b++) {
      var bx, by;
      var zone = rnd();
      if (zone < 0.25) { bx = rnd() * W; by = 40 + rnd() * 160; }
      else if (zone < 0.8) { bx = rnd() * W; by = 1330 + rnd() * 560; }
      else { bx = rnd() < 0.5 ? 10 + rnd() * 30 : W - 40 + rnd() * 30; by = 300 + rnd() * 1000; }
      drawBean(g, bx, by, 13 + rnd() * 5, rnd() * TAU);
    }
    // Dantel örtü
    drawDoily(g);
    // Su bardağı ve lokum tabağı (ikram)
    drawWaterGlass(g, 352, 640);
    drawLokumPlate(g, 732, 660);
    // Vinyet
    var vg = g.createRadialGradient(W / 2, 760, 320, W / 2, 760, 1250);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.78)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return c;
  }

  function drawBean(g, x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(3, 4, s, s * 0.68, 0, 0, TAU); g.fill();
    var gr = g.createLinearGradient(-s, -s, s, s);
    gr.addColorStop(0, '#7a4524'); gr.addColorStop(1, '#3a1c0c');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, s, s * 0.68, 0, 0, TAU); g.fill();
    g.strokeStyle = '#22100a'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(-s * 0.8, 0); g.bezierCurveTo(-s * 0.3, -s * 0.3, s * 0.3, s * 0.3, s * 0.8, 0); g.stroke();
    g.restore();
  }

  function drawDoily(g) {
    var d = DOILY, R = d.r;
    var lc = mk(R * 2 + 80, R * 2 + 80), l = lc.getContext('2d');
    var o = R + 40;
    l.translate(o, o);
    // ana şekil + fistolu kenar
    l.fillStyle = '#fbf3e4';
    l.beginPath(); l.arc(0, 0, R - 14, 0, TAU); l.fill();
    var n = 44;
    for (var i = 0; i < n; i++) {
      var a = i / n * TAU;
      l.beginPath(); l.arc(Math.cos(a) * (R - 14), Math.sin(a) * (R - 14), 21, 0, TAU); l.fill();
    }
    // delikler (ahşap görünsün)
    l.globalCompositeOperation = 'destination-out';
    function ring(rad, count, size, off) {
      for (var j = 0; j < count; j++) {
        var a2 = (j + (off || 0)) / count * TAU;
        l.beginPath(); l.arc(Math.cos(a2) * rad, Math.sin(a2) * rad, size, 0, TAU); l.fill();
      }
    }
    function petals(rad, count, len, wid, off) {
      for (var j = 0; j < count; j++) {
        var a3 = (j + (off || 0)) / count * TAU;
        l.save(); l.rotate(a3); l.beginPath(); l.ellipse(rad, 0, len, wid, 0, 0, TAU); l.fill(); l.restore();
      }
    }
    for (var s = 0; s < n; s++) { // fisto içi delikler
      var a4 = s / n * TAU;
      l.beginPath(); l.arc(Math.cos(a4) * (R - 8), Math.sin(a4) * (R - 8), 6, 0, TAU); l.fill();
    }
    ring(R - 40, 56, 5.5);
    petals(R - 74, 22, 20, 7, 0.5);
    ring(R - 106, 40, 4.5);
    petals(R - 140, 16, 18, 8);
    ring(R - 172, 28, 5, 0.5);
    petals(46, 8, 16, 7, 0.5);
    l.beginPath(); l.arc(0, 0, 9, 0, TAU); l.fill();
    l.globalCompositeOperation = 'source-over';
    // nakış çizgileri
    l.strokeStyle = 'rgba(190,160,120,0.55)'; l.lineWidth = 2;
    [R - 24, R - 56, R - 92, R - 124, R - 158, R - 188].forEach(function (rad) { l.beginPath(); l.arc(0, 0, rad, 0, TAU); l.stroke(); });
    // hafif gölgelendirme
    var sh = l.createRadialGradient(0, 0, R * 0.2, 0, 0, R + 20);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(120,80,40,0.18)');
    l.globalCompositeOperation = 'source-atop';
    l.fillStyle = sh; l.fillRect(-o, -o, o * 2, o * 2);
    l.globalCompositeOperation = 'source-over';
    // gölgeyle masaya koy
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 24; g.shadowOffsetY = 10;
    g.drawImage(lc, d.x - o, d.y - o);
    g.restore();
  }

  function drawWaterGlass(g, x, y) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 6, y + 8, 34, 11, 0, 0, TAU); g.fill();
    // gövde
    var gr = g.createLinearGradient(x - 30, 0, x + 30, 0);
    gr.addColorStop(0, 'rgba(220,240,255,0.55)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(180,210,230,0.5)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 30, y - 110); g.lineTo(x - 25, y); g.lineTo(x + 25, y); g.lineTo(x + 30, y - 110); g.closePath(); g.fill();
    // su
    g.fillStyle = 'rgba(160,210,240,0.35)';
    g.beginPath(); g.moveTo(x - 28.5, y - 78); g.lineTo(x - 25, y); g.lineTo(x + 25, y); g.lineTo(x + 28.5, y - 78); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y - 78, 28.5, 7, 0, 0, TAU); g.stroke();
    g.beginPath(); g.ellipse(x, y - 110, 30, 8, 0, 0, TAU); g.stroke();
    g.beginPath(); g.ellipse(x, y, 25, 7, 0, 0, Math.PI); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x - 20, y - 100, 5, 85);
    g.restore();
  }

  function lokumSprite(i) {
    var cols = [['#ff8fab', '#ffc2d1'], ['#fff1e6', '#ffffff'], ['#a7d676', '#d4f0b0'], ['#ffd166', '#ffe9a8']];
    var c = mk(48, 48), g = c.getContext('2d');
    var col = cols[i % cols.length];
    g.translate(24, 24);
    g.fillStyle = 'rgba(0,0,0,0.25)'; ui.roundRect(g, -14, -10, 32, 30, 7); g.fill();
    var gr = g.createLinearGradient(-16, -16, 16, 16);
    gr.addColorStop(0, col[1]); gr.addColorStop(1, col[0]);
    g.fillStyle = gr; ui.roundRect(g, -16, -16, 32, 30, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)'; // pudra şekeri
    var rnd = seeded(i * 77 + 3);
    for (var k = 0; k < 26; k++) { g.beginPath(); g.arc(-14 + rnd() * 28, -14 + rnd() * 26, 0.8 + rnd() * 1.4, 0, TAU); g.fill(); }
    return c;
  }

  function drawLokumPlate(g, x, y) {
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + 6, y + 8, 62, 21, 0, 0, TAU); g.fill();
    g.fillStyle = '#e9e1d4'; g.beginPath(); g.ellipse(x, y + 3, 60, 20, 0, 0, TAU); g.fill();
    g.fillStyle = '#fbf8f2'; g.beginPath(); g.ellipse(x, y, 60, 20, 0, 0, TAU); g.fill();
    g.strokeStyle = '#3d6fb6'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 54, 17, 0, 0, TAU); g.stroke();
    g.strokeStyle = '#d4a64a'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 60, 20, 0, 0, TAU); g.stroke();
    var spots = [[-26, -6, 0], [4, -9, 1], [28, -4, 2], [-12, -24, 3], [16, -26, 0], [2, -42, 1]];
    for (var i = 0; i < spots.length; i++) {
      var sp = lokumSprites[spots[i][2]];
      g.drawImage(sp, x + spots[i][0] - 20, y + spots[i][1] - 20, 40, 40);
    }
    g.restore();
  }

  function buildGlow() {
    var c = mk(W, 1400), g = c.getContext('2d');
    var gr = g.createRadialGradient(W / 2, 700, 60, W / 2, 700, 700);
    gr.addColorStop(0, 'rgba(255,200,110,0.55)'); gr.addColorStop(0.6, 'rgba(255,170,60,0.18)'); gr.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, 1400);
    return c;
  }

  function buildGrounds() {
    var c = mk(260, 260), g = c.getContext('2d');
    var rnd = seeded(7);
    var gr = g.createRadialGradient(130, 130, 20, 130, 130, 130);
    gr.addColorStop(0, '#f6e9d2'); gr.addColorStop(0.55, '#d9b98f'); gr.addColorStop(0.85, '#8a5a33'); gr.addColorStop(1, '#4a2a14');
    g.fillStyle = gr; g.beginPath(); g.arc(130, 130, 128, 0, TAU); g.fill();
    // telve lekeleri
    for (var i = 0; i < 260; i++) {
      var a = rnd() * TAU, d = Math.pow(rnd(), 0.6) * 122;
      g.fillStyle = 'rgba(' + (50 + rnd() * 40 | 0) + ',' + (25 + rnd() * 20 | 0) + ',10,' + (0.15 + rnd() * 0.45) + ')';
      g.beginPath(); g.ellipse(130 + Math.cos(a) * d, 130 + Math.sin(a) * d, 1 + rnd() * 5, 1 + rnd() * 3, rnd() * 3, 0, TAU); g.fill();
    }
    // telve akıntıları
    g.strokeStyle = 'rgba(70,35,12,0.35)'; g.lineCap = 'round';
    for (var k = 0; k < 14; k++) {
      var a2 = rnd() * TAU;
      g.lineWidth = 2 + rnd() * 5;
      g.beginPath(); g.moveTo(130 + Math.cos(a2) * 125, 130 + Math.sin(a2) * 125);
      g.quadraticCurveTo(130 + Math.cos(a2 + 0.3) * 90, 130 + Math.sin(a2 + 0.3) * 90, 130 + Math.cos(a2 + 0.1) * (50 + rnd() * 30), 130 + Math.sin(a2 + 0.1) * (50 + rnd() * 30));
      g.stroke();
    }
    g.strokeStyle = '#e2b85c'; g.lineWidth = 5; g.beginPath(); g.arc(130, 130, 126, 0, TAU); g.stroke();
    return c;
  }

  function buildGlobe() {
    // Osmanlı mozaik lambası (renkli cam parçaları)
    var R = 66, c = mk(R * 2 + 20, R * 2 + 20), g = c.getContext('2d');
    var o = R + 10;
    var rnd = seeded(11);
    g.save(); g.translate(o, o);
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
    g.fillStyle = '#2a1a0e'; g.fillRect(-R, -R, R * 2, R * 2);
    var cols = ['#ff5d5d', '#ffb347', '#ffd166', '#4cc9f0', '#3a86ff', '#06d6a0', '#c77dff', '#ff7aa2'];
    var step = 15, pts = [];
    for (var y = -R - step; y <= R + step; y += step) {
      var row = [];
      for (var x = -R - step; x <= R + step; x += step) row.push([x + (rnd() - 0.5) * 8 + (y / step % 2 ? step / 2 : 0), y + (rnd() - 0.5) * 8]);
      pts.push(row);
    }
    for (var j = 0; j < pts.length - 1; j++) for (var i = 0; i < pts[j].length - 1; i++) {
      var a = pts[j][i], b = pts[j][i + 1], cc = pts[j + 1][i], d = pts[j + 1][i + 1];
      [[a, b, cc], [b, d, cc]].forEach(function (tri) {
        g.fillStyle = cols[Math.floor(rnd() * cols.length)];
        g.beginPath(); g.moveTo(tri[0][0], tri[0][1]); g.lineTo(tri[1][0], tri[1][1]); g.lineTo(tri[2][0], tri[2][1]); g.closePath(); g.fill();
        g.strokeStyle = '#3b2512'; g.lineWidth = 2.2; g.stroke();
      });
    }
    // iç ışık ve küresel gölge
    var gl = g.createRadialGradient(-R * 0.25, -R * 0.2, 4, 0, 0, R);
    gl.addColorStop(0, 'rgba(255,250,220,0.85)'); gl.addColorStop(0.35, 'rgba(255,230,160,0.25)'); gl.addColorStop(0.8, 'rgba(0,0,0,0.1)'); gl.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = gl; g.fillRect(-R, -R, R * 2, R * 2);
    g.restore();
    // metal bantlar
    g.translate(o, o);
    g.strokeStyle = '#d9a441'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, -R * 0.72, R * 0.69, R * 0.16, 0, 0, TAU); g.stroke();
    g.beginPath(); g.ellipse(0, R * 0.72, R * 0.69, R * 0.16, 0, 0, TAU); g.stroke();
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.lineWidth = 3; g.stroke();
    return c;
  }

  function buildHalo() {
    var c = mk(400, 400), g = c.getContext('2d');
    var hg = g.createRadialGradient(200, 200, 20, 200, 200, 200);
    hg.addColorStop(0, 'rgba(255,200,120,0.9)'); hg.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = hg; g.fillRect(0, 0, 400, 400);
    return c;
  }

  function buildBead() {
    var c = mk(44, 44), g = c.getContext('2d');
    g.translate(22, 22);
    var gr = g.createRadialGradient(-5, -5, 2, 0, 0, 19);
    gr.addColorStop(0, '#3f7cff'); gr.addColorStop(1, '#0d2f8f');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, 11.5, 0, TAU); g.fill();
    g.fillStyle = '#7cc3ff'; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill();
    g.fillStyle = '#0a1430'; g.beginPath(); g.arc(0, 0, 4.6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(-7, -8, 3.2, 0, TAU); g.fill();
    return c;
  }

  // Sembol: telve silüeti (kahverengi) ya da renkli emoji
  function symSprite(emoji, size, tint) {
    var key = emoji + '|' + size + '|' + (tint || '');
    var c = symSprites.get(key);
    if (c) return c;
    if (symSprites.size > 200) symSprites.clear();
    var S = Math.ceil(size * 1.5);
    c = mk(S, S);
    var g = c.getContext('2d');
    g.font = size + 'px ' + ui.EMOJI_FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, S / 2, S / 2 + size * 0.06);
    if (tint) {
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = tint; g.fillRect(0, 0, S, S);
    }
    symSprites.set(key, c);
    return c;
  }
  function drawSym(ctx, emoji, x, y, size, tint, alpha) {
    var c = symSprite(emoji, size, tint);
    if (alpha != null) { ctx.save(); ctx.globalAlpha *= alpha; }
    ctx.drawImage(c, x - c.width / 2, y - c.height / 2);
    if (alpha != null) ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Fincan çizimi (birim koordinatlar, origin = tabak merkezi)
  // ---------------------------------------------------------------------------
  function bandColor(u) { return 'hsl(' + (Math.round(u.hue / 30) * 30) + ',72%,46%)'; }

  function drawSaucerU(g, o) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(6, 11, 80, 26, 0, 0, TAU); g.fill();
    g.fillStyle = o.gold ? '#a8780f' : '#cfc3b0'; g.beginPath(); g.ellipse(0, 5, 75, 24, 0, 0, TAU); g.fill();
    var gr = g.createLinearGradient(-75, -20, 75, 20);
    if (o.gold) { gr.addColorStop(0, '#fff3b8'); gr.addColorStop(0.5, '#f2c84b'); gr.addColorStop(1, '#b8860b'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#f4eee4'); gr.addColorStop(1, '#ddd2c2'); }
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 75, 24, 0, 0, TAU); g.fill();
    g.strokeStyle = o.gold ? '#fff0a0' : o.band; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, 66, 20.5, 0, 0, TAU); g.stroke();
    g.strokeStyle = '#d4a64a'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 75, 24, 0, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.07)'; g.beginPath(); g.ellipse(0, 1, 38, 11, 0, 0, TAU); g.fill();
    if (o.drip) {
      g.fillStyle = 'rgba(60,28,8,' + (0.55 * o.drip) + ')';
      g.beginPath(); g.ellipse(-8, 4, 44 * o.drip, 10 * o.drip, 0, 0, TAU); g.fill();
    }
  }

  function drawCupU(g, o) {
    var ang = o.ang || 0;
    var up = Math.cos(ang) >= 0;
    g.save();
    g.translate(o.dx || 0, (o.lift || 0) - 31);
    g.rotate(ang);
    g.translate(0, 31);
    var gold = o.gold;
    // kulp
    g.lineCap = 'round';
    g.strokeStyle = gold ? '#8a6208' : '#b7ab99'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(31, -50); g.bezierCurveTo(58, -54, 56, -20, 25, -19); g.stroke();
    g.strokeStyle = gold ? '#f6d36b' : '#fbf8f2'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(31, -50); g.bezierCurveTo(58, -54, 56, -20, 25, -19); g.stroke();
    // gövde
    var gr = g.createLinearGradient(-36, 0, 36, 0);
    if (gold) { gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.35, '#f5cf55'); gr.addColorStop(0.75, '#d19c1d'); gr.addColorStop(1, '#8a6208'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#f6f1e8'); gr.addColorStop(1, '#c9bca8'); }
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-35, -62);
    g.bezierCurveTo(-35, -30, -27, -6, -18, -3);
    g.lineTo(18, -3);
    g.bezierCurveTo(27, -6, 35, -30, 35, -62);
    g.ellipse(0, -62, 35, 10, 0, 0, Math.PI, false);
    g.closePath(); g.fill();
    // desen bandı
    g.strokeStyle = gold ? '#fff2a8' : o.band; g.lineWidth = 6;
    g.beginPath(); g.ellipse(0, -54, 34.3, 9.6, 0, 0.05, Math.PI - 0.05); g.stroke();
    if (!gold) {
      g.fillStyle = o.band;
      for (var d = -2; d <= 2; d++) { g.beginPath(); g.arc(d * 11, -38 + Math.abs(d) * 1.5, 2.6, 0, TAU); g.fill(); }
    } else {
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(-20, -36, 4, 16, 0.15, 0, TAU); g.fill();
    }
    // ağız
    if (up) {
      g.fillStyle = o.foam ? '#d9b68a' : '#2a1508';
      g.beginPath(); g.ellipse(0, -62, 35, 10, 0, 0, TAU); g.fill();
      if (o.foam) {
        g.fillStyle = 'rgba(255,245,225,0.85)';
        for (var f = 0; f < 7; f++) { g.beginPath(); g.arc(-22 + f * 7.5, -62 + Math.sin(f * 2.1) * 3, 2 + (f % 3), 0, TAU); g.fill(); }
      } else {
        g.fillStyle = '#6b3d1c'; g.beginPath(); g.ellipse(0, -61, 29, 7.5, 0, 0, TAU); g.fill();
        g.fillStyle = '#3a1d0b'; g.beginPath(); g.ellipse(2, -60.5, 22, 5.2, 0, 0, TAU); g.fill();
      }
      g.strokeStyle = '#e2b85c'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, -62, 35, 10, 0, 0, TAU); g.stroke();
    } else {
      g.strokeStyle = '#e2b85c'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, -62, 35, 10, 0, Math.PI, TAU); g.stroke();
      g.fillStyle = gold ? '#f0c84a' : '#ece4d6'; g.beginPath(); g.ellipse(0, -3, 18, 5.5, 0, 0, TAU); g.fill();
      g.strokeStyle = gold ? '#8a6208' : '#b9ad9a'; g.lineWidth = 2; g.stroke();
    }
    g.restore();
  }

  function cupSprite(band, gold, foam) {
    var key = band + '|' + (gold ? 1 : 0) + '|' + (foam ? 1 : 0);
    var c = cupSprites.get(key);
    if (c) return c;
    var s = GRID_S;
    c = mk(Math.ceil(180 * s), Math.ceil(130 * s));
    var g = c.getContext('2d');
    g.translate(90 * s, 92 * s); g.scale(s, s);
    var o = { band: band, gold: gold, foam: foam };
    drawSaucerU(g, o); drawCupU(g, o);
    cupSprites.set(key, c);
    return c;
  }
  function drawCupSprite(ctx, x, y, band, gold, foam, scale) {
    var c = cupSprite(band, gold, foam);
    var s = scale == null ? 1 : scale;
    ctx.drawImage(c, x - 90 * GRID_S * s, y - 92 * GRID_S * s, c.width * s, c.height * s);
  }

  // Buhar
  function drawSteam(ctx, x, y, s, k, seed) {
    if (k <= 0.02) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 7 * s;
    for (var w = 0; w < 3; w++) {
      var ph = LG.time * 1.7 + seed + w * 2.1;
      var bx = x + (w - 1) * 12 * s;
      var top = y - (70 + 14 * Math.sin(ph * 0.7)) * s;
      var gr = ctx.createLinearGradient(0, y, 0, top);
      gr.addColorStop(0, 'rgba(255,248,235,0)');
      gr.addColorStop(0.25, 'rgba(255,248,235,' + (0.34 * k) + ')');
      gr.addColorStop(1, 'rgba(255,248,235,0)');
      ctx.strokeStyle = gr;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.bezierCurveTo(bx + Math.sin(ph) * 16 * s, y - 24 * s, bx - Math.sin(ph + 1.3) * 16 * s, y - 48 * s, bx + Math.sin(ph + 2.1) * 10 * s, top);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Sıra yönetimi
  // ---------------------------------------------------------------------------
  function makeEntry(u, topic) {
    return { user: u, topic: topic || 'genel', gold: 0, mega: false, seq: ++seq, gseq: 0, brew: 0, cup: null, band: bandColor(u) };
  }
  function insertByPriority(e) {
    var i = 0;
    if (e.gold) { while (i < Q.length && Q[i].gold) i++; } else i = Q.length;
    Q.splice(i, 0, e);
    return i;
  }
  function slotPos(i) { return SLOTS[i]; }
  function tokenTarget(idx) {
    if (overlayOn()) return { x: CX, y: NEXT_PILL_Y };
    if (idx < SLOTS.length) return { x: SLOTS[idx].x, y: SLOTS[idx].y - 30 };
    return { x: PANEL.x + PANEL.w / 2, y: PANEL.y + 92 };
  }
  function addToken(u, label, idx, gold) {
    if (tokens.length >= 14) return;
    var tg = tokenTarget(idx);
    tokens.push({ user: u, tag: { id: u.id + '#tk' + label, name: label }, x0: LG.rand(260, 820), y0: 1290, x1: tg.x, y1: tg.y, t: 0, dur: 0.85, gold: gold });
  }

  function enqueue(u, topic) {
    if (active && active.user.id === u.id && st.name !== 'out') {
      if (topic && st.name !== 'card') active.topic = topic;
      notice(u, '☕ falın şu an okunuyor!');
      return;
    }
    var e = inQueue.get(u.id);
    if (e) {
      if (topic && topic !== e.topic) {
        e.topic = topic;
        ui.float(DATA.TOPICS[topic].icon + ' ' + DATA.TOPICS[topic].label, e.cup ? e.cup.x : PANEL.x + PANEL.w / 2, e.cup ? e.cup.y - 80 : PANEL.y + 140, { size: 28, color: '#ffe0b0', life: 1.4, vy: -50 });
      } else notice(u, '☕ ' + (posOf(e) + 1) + '. sıradasın');
      return;
    }
    e = makeEntry(u, topic);
    var idx = insertByPriority(e);
    inQueue.set(u.id, e);
    panelBump = 1;
    addToken(u, shortUser(u, 12).name + ' · ' + (idx + 1) + '.', idx, false);
    var now = LG.time;
    if (now - lastPop > 0.12) { LG.sfx('pop'); lastPop = now; }
  }

  function notice(u, text) {
    var last = dupNotice.get(u.id) || -99;
    if (LG.time - last < 4) return;
    dupNotice.set(u.id, LG.time);
    if (dupNotice.size > 1500) dupNotice.clear();
    ui.float(shortUser(u, 12).name + ' ' + text, LG.rand(330, 750), NEXT_PILL_Y - 20, { size: 28, color: '#ffe6c4', life: 1.6, vy: -70 });
  }

  function upgrade(u, level, mega, topic) {
    if (active && active.user.id === u.id && ['move', 'brew', 'swirl', 'flip', 'cool'].indexOf(st.name) >= 0) {
      if (level > active.gold) active.gold = level;
      active.mega = active.mega || mega;
      return active;
    }
    var e = inQueue.get(u.id);
    if (e) {
      if (!e.gold) {
        Q.splice(Q.indexOf(e), 1);
        e.gold = level; e.gseq = ++goldSeq;
        insertByPriority(e);
      } else if (level > e.gold) e.gold = level;
      e.mega = e.mega || mega;
      if (topic) e.topic = topic;
      return e;
    }
    e = makeEntry(u, topic);
    e.gold = level; e.mega = mega; e.gseq = ++goldSeq;
    var idx = insertByPriority(e);
    inQueue.set(u.id, e);
    panelBump = 1;
    addToken(u, shortUser(u, 12).name + ' · 👑', idx, true);
    return e;
  }

  function updateQueue(dt) {
    var n = Math.min(Q.length, SLOTS.length);
    for (var i = 0; i < Q.length; i++) {
      var e = Q[i];
      if (i >= n) { if (e.cup) e.cup = null; continue; }
      var sp = slotPos(i);
      if (!e.cup) e.cup = { x: sp.x, y: sp.y + 20, a: 0 };
      var c = e.cup;
      var k = Math.min(1, dt * 7);
      c.x += (sp.x - c.x) * k; c.y += (sp.y - c.y) * k;
      c.a = Math.min(1, c.a + dt * 3);
      if (e.brew < 1) e.brew = Math.min(1, e.brew + dt / brewDur(e));
    }
  }

  function shouldExpress() {
    var normal = 0;
    for (var i = 0; i < Q.length; i++) if (!Q[i].gold) normal++;
    var thr = fast ? 8 : 14;
    if (normal < thr) return false;
    if (Q[0].gold) return sinceExpress >= 2;
    return sinceExpress >= 1;
  }

  // ---------------------------------------------------------------------------
  // Okuma döngüsü (durum makinesi)
  // ---------------------------------------------------------------------------
  var DUR = {
    move: function () { return D(0.8, 0.5); },
    swirl: function () { return D(1.2, 0.7); },
    flip: function () { return D(0.85, 0.6); },
    cool: function () { return D(1.7, 0.9); },
    lift: function () { return D(0.6, 0.45); },
  };
  function go(name) { st.name = name; st.t = 0; }
  function overlayOn() {
    return !!replay || st.name === 'lift' || st.name === 'card' || st.name === 'out' || st.name === 'express' || st.name === 'expout';
  }

  function startNext() {
    if (!Q.length) return;
    if (shouldExpress()) return startExpress();
    // Adalet: arka arkaya 2 altın fincandan sonra bekleyen normal bir fincan okunur
    var pick = 0;
    if (Q[0].gold && goldStreak >= 2) {
      for (var i = 1; i < Q.length; i++) if (!Q[i].gold) { pick = i; break; }
    }
    active = Q.splice(pick, 1)[0];
    goldStreak = active.gold ? goldStreak + 1 : 0;
    inQueue.delete(active.user.id);
    var c = active.cup;
    active.from = c ? { x: c.x, y: c.y, s: GRID_S } : { x: CX, y: 1250, s: 0.6 };
    active.cup = null;
    active.drip = 0;
    sinceExpress++;
    go('move');
    LG.sfx('whoosh');
  }

  function startExpress() {
    var picks = [];
    for (var i = 0; i < Q.length && picks.length < 6; i++) if (!Q[i].gold) picks.push(Q[i]);
    Q = Q.filter(function (e) { return picks.indexOf(e) < 0; });
    picks.forEach(function (e) {
      inQueue.delete(e.user.id);
      if (e.cup) addPoof(e.cup.x, e.cup.y - 40, 0.8);
    });
    exp = {
      t: 0, dur: D(10, 8), kopuk: kopukT > 0, popped: 0,
      items: picks.map(function (e) { var f = GEN.express(); return { user: e.user, sym: f.sym, text: f.text, topic: e.topic }; }),
    };
    sinceExpress = 0;
    readToday += picks.length; readTotal += picks.length;
    LG.store.set('kahve-fali:toplam', readTotal);
    go('express');
    LG.sfx('whoosh'); LG.sfx('levelup');
    ui.shake(6, 0.25);
  }

  function buildCard(e) {
    var kind = e.gold >= 2 ? 'big' : e.gold === 1 ? 'gold' : 'normal';
    var c = { user: e.user, topic: e.topic, kind: kind, mega: e.mega, kopuk: kopukT > 0, t: 0, yes: 0, no: 0, voters: new Set(), lines: null };
    if (kind === 'big') {
      c.spread = GEN.spread(e.topic);
      c.dur = D(15, 12);
      c.flipped = 0;
    } else {
      var f = GEN.fortune(e.topic);
      c.sym = f.sym; c.text = f.text;
      c.dur = D(9, 6.5);
    }
    c.sub = c.kopuk ? GEN.kopuk() : kind !== 'normal' ? GEN.altin() : '';
    return c;
  }

  function revealFx(c) {
    var y = CARD.y + 260;
    if (c.kind === 'big' || c.mega) {
      LG.sfx('fanfare');
      ui.burst(CX, y, { count: 90, speed: 900, colors: ['#ffd166', '#ffe9a8', '#fff', '#f4a261'] });
      ui.shake(10, 0.35);
    } else if (c.kind === 'gold') {
      LG.sfx('levelup');
      ui.burst(CX, y, { count: 60, speed: 750, colors: ['#ffd166', '#ffe9a8', '#fff'] });
    } else {
      LG.sfx('bell');
      ui.burst(CX, y, { count: 26, speed: 500, shape: 'circle', colors: ['#fff6e6', '#f2d5b0', '#e9c49a'], size: 12 });
    }
    if (c.kopuk) {
      ui.burst(CX, CARD.y + 30, { count: 40, speed: 600, shape: 'circle', colors: ['#ffffff', '#fff4e0', '#f6e2c4'], size: 18, gravity: 300 });
      LG.sfx('splash');
    }
  }

  function finishReading() {
    if (card) {
      lastShown = { card: card };
      readToday++; readTotal++;
      LG.store.set('kahve-fali:toplam', readTotal);
    }
    addPoof(CENTER.x, CENTER.y - 60, 1.4);
    active = null; card = null;
  }

  function machine(dt) {
    st.t += dt;
    switch (st.name) {
      case 'idle':
        if (Q.length) startNext();
        break;
      case 'move':
        if (st.t >= DUR.move()) go(active.brew >= 1 ? 'swirl' : 'brew');
        break;
      case 'brew':
        active.brew = Math.min(1, active.brew + dt / brewDur(active));
        if (active.brew >= 1) { go('swirl'); }
        break;
      case 'swirl':
        if (st.t < dt * 1.5) LG.sfx('whoosh');
        if (st.t >= DUR.swirl()) { go('flip'); LG.sfx('whoosh'); }
        break;
      case 'flip':
        if (st.t >= DUR.flip()) { go('cool'); LG.sfx('drum'); ui.shake(5, 0.18); addPoof(CENTER.x, CENTER.y - 10, 0.8); }
        break;
      case 'cool':
        active.drip = Math.min(1, active.drip + dt * 1.2);
        var tk = Math.floor(st.t / 0.38);
        if (tk !== active.lastTick) { active.lastTick = tk; LG.sfx('tick'); }
        if (st.t >= DUR.cool()) { go('lift'); card = buildCard(active); revealFx(card); }
        break;
      case 'lift':
        if (card) card.t += dt;
        if (st.t >= DUR.lift()) go('card');
        break;
      case 'card':
        if (!hold) card.t += dt;
        if (card.kind === 'big') {
          var nf = Math.min(3, Math.floor((card.t - 0.6) / 1.5) + 1);
          if (nf > card.flipped) { card.flipped = nf; LG.sfx('bell'); ui.burst(CX + (nf - 2) * 285, CARD.y + 330, { count: 24, speed: 400, colors: ['#ffd166', '#fff'] }); }
        }
        if (card.t >= card.dur + (card.kind === 'big' ? 0 : 0)) go('out');
        break;
      case 'out':
        if (card) card.t += dt;
        if (st.t >= 0.45) { finishReading(); go('idle'); if (Q.length) startNext(); }
        break;
      case 'express':
        if (!hold) exp.t += dt;
        var np = Math.min(exp.items.length, Math.floor((exp.t - 0.5) / 0.3) + 1);
        if (np > exp.popped) { exp.popped = np; LG.sfx('pop', { gap: 10 }); }
        if (exp.t >= exp.dur) go('expout');
        break;
      case 'expout':
        if (st.t >= 0.45) { lastShown = { exp: exp }; exp = null; go('idle'); if (Q.length) startNext(); }
        break;
    }
  }

  function addPoof(x, y, k) {
    if (poofs.length > 30) poofs.shift();
    poofs.push({ x: x, y: y, t: 0, k: k || 1 });
  }

  // ---------------------------------------------------------------------------
  // Olaylar
  // ---------------------------------------------------------------------------
  function cardShowing() { return (card && (st.name === 'lift' || st.name === 'card' || st.name === 'out')) || (replay && replay.card); }

  LG.on('chat', function (e) {
    var u = e.user;
    var words = e.norm ? e.norm.split(' ') : [];
    var topic = topicOf(words);
    var fal = wantsFal(words) || (topic && words.length <= 4);
    // Okunan fala oy / tepki
    var c = cardShowing() ? (replay && replay.card ? replay.card : card) : null;
    var reacted = false;
    if (c && !fal) {
      var yes = LG.cmd.has(e.raw, YES), no = !yes && LG.cmd.has(e.raw, NO);
      if ((yes || no) && !c.voters.has(u.id)) {
        c.voters.add(u.id);
        if (yes) c.yes++; else c.no++;
        c.lastVoter = { name: shortUser(u, 11).name, yes: yes, t: LG.time };
        if (LG.time - lastVoteFx > 0.12) {
          lastVoteFx = LG.time;
          ui.burst(yes ? CARD.x + 70 : CARD.x + 250, CARD.y + CARD.h - 70, { count: 1, shape: 'emoji', emoji: yes ? '🎯' : '🙈', speed: 120, size: 13, gravity: -260, life: 0.9, up: 1 });
        }
        reacted = true;
      }
    }
    var raw = e.raw || '';
    var laugh = /😂|🤣|haha|ahah|jsjs|sjsj|kdkd|xd/i.test(raw), love = !laugh && /❤|😍|🥰|💕|💖|😘/.test(raw);
    if (!reacted && (laugh || love)) {
      if (LG.time - lastReact > 0.25) {
        lastReact = LG.time;
        var side = Math.random() < 0.5 ? LG.rand(52, 88) : LG.rand(992, 1028);
        ui.burst(side, LG.rand(820, 1080), { count: 1, shape: 'emoji', emoji: laugh ? '😂' : '💖', speed: 60, size: 22, gravity: -320, life: 1.3, up: 1 });
      }
      if (!fal) reacted = true;
    }
    if (fal) { enqueue(u, topic); return; }
    if (reacted) return;
    // Diğer yorumlar: isim kısa bir an görünür (tanınma)
    if (!overlayOn() && LG.time - lastChatFloat > 0.35) {
      lastChatFloat = LG.time;
      var left = Math.random() < 0.5;
      ui.float('💬 ' + shortUser(u, 10).name, left ? LG.rand(330, 380) : LG.rand(700, 750), LG.rand(560, 640), { size: 24, color: '#ffe8cc', life: 1.3, vy: -55 });
    }
  });

  LG.on('like', function (e) {
    var n = Math.min(4, 1 + (e.count / 6 | 0));
    for (var i = 0; i < n && bubbles.length < 60; i++) {
      bubbles.push({ x: CEZVE.x + LG.rand(-34, 34), y: CEZVE.y - 120, vy: LG.rand(-70, -140), vx: LG.rand(-20, 20), r: LG.rand(4, 10), t: 0, life: LG.rand(0.9, 1.6) });
    }
    if (LG.time - lastLikeFloat > 0.7) {
      lastLikeFloat = LG.time;
      ui.float('❤️ ' + shortUser(e.user, 10).name, CEZVE.x + LG.rand(-30, 40), CEZVE.y - 190, { size: 24, color: '#ffd6e0', life: 1.3, vy: -70 });
    }
    if (kopukT > 0) return;
    foam.v += e.count;
    if (foam.v >= foam.target) startKopuk();
  });

  function startKopuk() {
    kopukT = 60; kopukMoment = 2.6; kopukCount++;
    foam.v = foam.target;
    LG.sfx('fanfare'); LG.sfx('splash');
    ui.shake(12, 0.4); ui.flash('#fff3dc', 0.35);
    for (var i = 0; i < 4; i++) ui.burst(LG.rand(200, 880), LG.rand(500, 900), { count: 40, speed: 700, shape: 'circle', colors: ['#ffffff', '#fff4e0', '#f2dcbc', '#e8c8a0'], size: 22, gravity: 250, life: 1.8 });
    tickerAdd('✨', null, 'KÖPÜKLÜ KAHVE! 60 sn tüm fallar köpüklü');
    LG.music.play('party');
  }
  function endKopuk() {
    kopukT = 0;
    foam.target = Math.min(30000, Math.round(foam.target * 1.5 / 50) * 50);
    foam.v = Math.round(foam.target * 0.15);
    foam.shown = 0;
    tickerAdd('☁️', null, 'Köpük bitti — yeni hedef ' + LG.fmt(foam.target) + ' beğeni');
    LG.music.play('chill');
  }

  function sprinkle(n, u) {
    for (var i = 0; i < n; i++) {
      var a = LG.rand(0, TAU), d = LG.rand(170, 235);
      var tx = DOILY.x + Math.cos(a) * d, ty = DOILY.y + Math.sin(a) * d * 0.95;
      if (lokums.length >= 24) lokums.shift();
      lokums.push({ x0: LG.rand(300, 780), y0: 240, x: tx, y: ty, rot: LG.rand(-0.6, 0.6), spr: LG.randi(0, 3), t: -i * 0.08, s: LG.rand(0.66, 0.82) });
    }
  }

  LG.on('gift', function (e) {
    var u = e.user, g = e.gift, tier = g.tier;
    var coffee = LG.giftIs(g, ['türk kahvesi', 'turkish coffee', 'kahve', 'coffee']);
    var gName = g.name + (g.count > 1 ? ' x' + g.count : '');
    if (tier <= 1 && !coffee) {
      sprinkle(Math.min(6, 1 + g.count), u);
      ui.burst(DOILY.x, DOILY.y - 120, { count: 18, speed: 380, shape: 'circle', colors: ['#ffffff', '#fff7ea'], size: 8, gravity: 700 });
      LG.sfx('coin');
      tickerAdd('🍬', u, 'lokum serpti · teşekkürler! 💛', '#ffe0a3');
      return;
    }
    var userTopic = null;
    if (u.lastChat) userTopic = topicOf(LG.cmd.norm(u.lastChat).split(' '));
    // Aynı kişinin büyük anları arasında bekleme / sunucunun "sadeleştir" komutu / oturum sınırı
    if (tier >= 3 && !ui.spotlightAllowed(u, tier)) {
      // sade teşekkür: sırada değilse normal fincanla sıraya girer (öncelik/büyük an yok)
      if (!inQueue.has(u.id) && !(active && active.user.id === u.id)) enqueue(u, userTopic);
      sprinkle(2, u);
      LG.sfx('coin');
      tickerAdd('💛', u, gName + ' · çok teşekkürler!', '#ffe0a3');
      return;
    }
    var level = tier >= 4 ? 2 : 1;
    var mega = tier >= 5;
    var en = upgrade(u, level, mega, userTopic);
    var pos = en.cup ? { x: en.cup.x, y: en.cup.y - 40 } : { x: CX, y: 700 };
    sprinkle(level === 2 ? 4 : 2, u);
    var sub;
    if (level === 2) sub = '🔮 BÜYÜK AÇILIM sırada — çok teşekkürler!';
    else if (coffee) sub = '☕ Türk kahvesi ısmarladı — altın fincan sırada!';
    else sub = '👑 Altın fincan sırada — teşekkürler!';
    // Aynı kişiden aynı hediye peş peşe gelirse yeni şerit açma, sayacı artır
    var merged = false;
    var allB = banner ? [banner].concat(banners) : banners;
    for (var bi = 0; bi < allB.length; bi++) {
      var bb = allB[bi];
      if (bb.user === u && bb.giftName === g.name && bb.tier === tier) {
        bb.combo += g.count; bb.text = u.name + ' · ' + g.name + ' x' + bb.combo;
        if (bb === banner) bb.t = Math.min(bb.t, 0.6);
        merged = true; break;
      }
    }
    if (merged) { /* sayaç güncellendi */ }
    else if (tier <= 3 && banners.length >= 3) {
      tickerAdd('👑', u, 'altın fincan · teşekkürler! 💛', '#ffd166');
    } else {
      if (banners.length > 5) banners.shift();
      banners.push({ user: u, giftName: g.name, combo: g.count, text: u.name + ' · ' + gName, sub: sub, tier: tier, emoji: coffee ? '☕' : LG.giftEmoji(g), t: 0, dur: tier >= 5 ? 5.5 : tier >= 4 ? 4.2 : 2.8 });
    }
    if (mega) {
      megaT = 7;
      LG.sfx('mega');
      ui.rain({ count: tier >= 6 ? 260 : 170, colors: ['#ffd166', '#ffe9a8', '#ff8fab', '#ffffff', '#f4a261'] });
      ui.flash('#ffe9a8', 0.45); ui.shake(18, 0.6);
    } else if (level === 2) {
      LG.sfx('fanfare');
      ui.burst(pos.x, pos.y, { count: 110, speed: 900, colors: ['#ffd166', '#ffe9a8', '#ffffff', '#f4a261'] });
      ui.shake(8, 0.3);
    } else {
      LG.sfx('levelup');
      ui.burst(pos.x, pos.y, { count: 45, speed: 600, colors: ['#ffd166', '#ffe9a8', '#ffffff'] });
    }
  });

  LG.on('follow', function (e) {
    for (var i = beads.length - 1; i >= 0; i--) if (beads[i].user.id === e.user.id) beads.splice(i, 1);
    beads.unshift({ user: e.user, t: 0 });
    if (beads.length > 4) beads.length = 4;
    LG.sfx('heart');
    tickerAdd('🧿', e.user, 'takip etti · nazar boncuğu asıldı', '#a8d8ff');
  });
  LG.on('share', function (e) {
    LG.sfx('join');
    tickerAdd('📨', e.user, 'falını arkadaşına gönderdi', '#bde0fe');
  });

  function tickerAdd(icon, u, text, color) {
    tickQ.push({ icon: icon, name: u ? u.name : '', text: text, color: color || '#ffe8c8' });
    if (tickQ.length > 6) tickQ.shift();
  }

  // ---------------------------------------------------------------------------
  // Sunucu kısayolları
  // ---------------------------------------------------------------------------
  LG.onKey('n', 'Sıradaki fincanı hemen oku / kartı geç', function () {
    if (replay) { replay = null; return; }
    switch (st.name) {
      case 'idle': if (Q.length) startNext(); else tickerAdd('☕', null, 'Sıra boş — "fal" yazan ilk kişi gelsin!'); break;
      case 'move': case 'brew': case 'swirl': case 'flip': case 'cool':
        active.brew = 1; go('lift'); card = buildCard(active); revealFx(card); break;
      case 'lift': go('card'); break;
      case 'card': go('out'); break;
      case 'express': go('expout'); break;
    }
  });
  LG.onKey('r', 'Son falı tekrar göster', function () {
    if (st.name === 'card' && card) { card.t = 0.01; LG.sfx('bell'); return; }
    if (!lastShown) { tickerAdd('🔁', null, 'Henüz okunan fal yok'); return; }
    if (lastShown.card) { lastShown.card.t = 0.01; replay = { card: lastShown.card, t: 0 }; }
    else { lastShown.exp.t = 0.5 + lastShown.exp.items.length * 0.3; replay = { exp: lastShown.exp, t: 0 }; }
    LG.sfx('bell');
  });
  LG.onKey('c', 'Sırayı temizle', function () {
    Q.forEach(function (e) { if (e.cup) addPoof(e.cup.x, e.cup.y - 40, 0.9); });
    Q = []; inQueue.clear();
    LG.sfx('whoosh');
    tickerAdd('🧹', null, 'Sıra temizlendi — yeni fallar için "fal" yaz!');
  });
  LG.onKey('f', 'Hızlı mod aç/kapat', function () {
    fast = !fast;
    LG.sfx(fast ? 'zap' : 'pop');
    tickerAdd('⚡', null, fast ? 'Hızlı mod açık' : 'Hızlı mod kapalı');
  });
  LG.onKey('b', 'Kartı beklet / devam (sohbet için)', function () {
    hold = !hold;
    LG.sfx('tick');
  });
  LG.onKey('k', 'Köpüklü kahveyi hemen başlat', function () { if (kopukT <= 0) startKopuk(); });

  // ---------------------------------------------------------------------------
  // Simülatör yorumları
  // ---------------------------------------------------------------------------
  var SIM_FAL = ['fal', 'fal', 'falıma bak', 'fal bak', 'bana da fal 🙏', 'fal pls', 'falıma bakar mısın', 'aşk falıma bak 💘', 'aşk falı',
    'para falı', 'iş falı lütfen', 'sınav falıma bak', 'okul falı 📚', 'tatil falı ✈️', 'yol falı', 'FAL', 'falll', 'kahve falı',
    'fal fal fal', 'falım ne zaman?', 'bana bir fal', 'sevgili falı', 'kpss falı', 'Fal Bak ☕'];
  var SIM_VOTE = ['doğru', 'aynen', 'tuttu!', 'doğru çıktı 😂', 'aynen öyle', 'yalan 😂', 'tutmadı', 'hahaha', '😂😂😂', 'evet bildin', 'kesin 😂'];
  var SIM_GEN = ['selam', 'kahve kokusu geldi ☕', 'çok tatlı', 'ellerine sağlık', 'harika', 'merhaba', 'iyi yayınlar', 'lokum isterim',
    'ben de kahve içiyorum', 'sıram ne zaman', '❤️❤️', 'aşk', 'para', 'sınav', 'bu çok iyi 😂', 'iyi akşamlar'];
  LG.sim.genComment = function (b) {
    var id = String(b.id);
    var queued = inQueue.has(id) || (active && active.user.id === id);
    var r = Math.random();
    if (cardShowing() && r < 0.4) return LG.pick(SIM_VOTE);
    if (!queued && r < 0.78) return LG.pick(SIM_FAL);
    if (r < 0.9) return LG.pick(SIM_GEN);
    return LG.pick(SIM_VOTE);
  };
  LG.sim.comments = SIM_FAL.map(function (s) { return [s, 2]; }).concat(SIM_GEN.map(function (s) { return [s, 1]; }));

  // ---------------------------------------------------------------------------
  // Güncelleme
  // ---------------------------------------------------------------------------
  function update(dt, t) {
    if (kopukT > 0) { kopukT -= dt; if (kopukT <= 0) endKopuk(); }
    if (kopukMoment > 0) kopukMoment -= dt;
    if (megaT > 0) {
      megaT -= dt;
      if (Math.random() < dt * 6) ui.burst(LG.rand(150, 930), LG.rand(500, 1150), { count: 3, shape: 'emoji', emoji: '✨', speed: 120, size: 12, gravity: -100, life: 1.2 });
    }
    foam.shown += (foam.v - foam.shown) * Math.min(1, dt * 5);
    if (panelBump > 0) panelBump = Math.max(0, panelBump - dt * 3);

    for (var i = beads.length - 1; i >= 0; i--) beads[i].t += dt;
    for (i = 0; i < lokums.length; i++) lokums[i].t += dt;
    for (i = tokens.length - 1; i >= 0; i--) { tokens[i].t += dt; if (tokens[i].t >= tokens[i].dur) tokens.splice(i, 1); }
    for (i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i]; b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.t >= b.life) bubbles.splice(i, 1);
    }
    for (i = poofs.length - 1; i >= 0; i--) { poofs[i].t += dt; if (poofs[i].t > 1.1) poofs.splice(i, 1); }

    // Hediye şeridi
    if (!banner && banners.length) { banner = banners.shift(); banner.t = 0; }
    if (banner) { banner.t += dt; if (banner.t >= banner.dur) banner = null; }
    // Bildirim şeridi
    if (!tick && tickQ.length) { tick = tickQ.shift(); tick.t = 0; tick.dur = tickQ.length > 1 ? 1.7 : 2.8; }
    if (tick) { tick.t += dt; if (tick.t >= tick.dur) tick = null; }

    updateQueue(dt);
    if (replay) {
      if (!hold) {
        if (replay.card) replay.card.t += dt;
        else replay.exp.t += dt;
      }
      replay.t += dt;
      var rd = replay.card ? replay.card.dur : replay.exp.dur;
      if ((replay.card ? replay.card.t : replay.exp.t) >= rd) replay = null;
      // tekrar gösterilirken, okuma yalnızca kart aşamasında bekler
      if (st.name !== 'card' && st.name !== 'express') machine(dt);
    } else machine(dt);
  }

  // ---------------------------------------------------------------------------
  // Çizim
  // ---------------------------------------------------------------------------
  function drawLampAndBeads(ctx, t) {
    var sway = Math.sin(t * 0.9) * 0.03;
    function sx(y) { return LAMP.x + Math.sin(sway) * y; }
    // zincir
    ctx.save();
    ctx.strokeStyle = '#c9963f'; ctx.lineWidth = 3;
    for (var y = 0; y < LAMP.y - 78; y += 14) {
      ctx.beginPath(); ctx.ellipse(sx(y), y + 7, y / 14 % 2 ? 3 : 5, 7, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    var gx = sx(LAMP.y), gy = LAMP.y;
    // ışık halesi
    var fl = 0.85 + Math.sin(t * 7.3) * 0.04 + Math.sin(t * 13.1) * 0.03;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 * fl;
    ctx.drawImage(haloCanvas, gx - 200, gy - 200);
    ctx.restore();
    // başlık (kapak)
    ctx.save();
    ctx.translate(gx, gy); ctx.rotate(sway);
    ctx.fillStyle = '#b8862e';
    ctx.beginPath(); ctx.moveTo(-16, -78); ctx.lineTo(16, -78); ctx.lineTo(26, -60); ctx.lineTo(-26, -60); ctx.closePath(); ctx.fill();
    ctx.drawImage(globeCanvas, -globeCanvas.width / 2, -globeCanvas.height / 2);
    // alt topuz
    ctx.fillStyle = '#c9963f';
    ctx.beginPath(); ctx.moveTo(-18, 62); ctx.lineTo(18, 62); ctx.lineTo(0, 84); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 86, 5, 0, TAU); ctx.fill();
    ctx.restore();
    // nazar boncukları
    var top = gy + 100;
    if (beads.length) {
      var last = 0;
      for (var i = 0; i < beads.length; i++) {
        var bd = beads[i];
        var by = top + 60 + i * 54;
        var drop = bd.t < 0.9 ? (1 - LG.ease.outElastic(bd.t / 0.9)) * -50 : 0;
        var swing = Math.sin(bd.t * 6) * 14 * Math.exp(-bd.t * 1.5);
        var bx = sx(by) + swing;
        by += drop;
        last = by;
        // ip
        ctx.strokeStyle = 'rgba(255,230,190,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(i === 0 ? sx(top) : sx(by - 54), i === 0 ? top : by - 54 + 18); ctx.lineTo(bx, by - 17); ctx.stroke();
        ctx.drawImage(beadCanvas, bx - 22, by - 22);
        var tg = ui.nameTag(shortUser(bd.user, 11), 23, '#e8f3ff', 'rgba(10,30,80,0.72)');
        var a = Math.min(1, bd.t * 3) * (i === 3 ? 0.75 : 1);
        ctx.save(); ctx.globalAlpha = a;
        ctx.drawImage(tg, bx + 22, by - tg.height / 2);
        ctx.restore();
        if (bd.t < 1.2) { ctx.save(); ctx.globalAlpha = 1 - bd.t / 1.2; ctx.strokeStyle = '#7cc3ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bx, by, 18 + bd.t * 40, 0, TAU); ctx.stroke(); ctx.restore(); }
      }
    } else {
      // boş ip + ipucu
      ctx.strokeStyle = 'rgba(255,230,190,0.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx(top), top); ctx.lineTo(sx(top + 40), top + 40); ctx.stroke();
      ctx.drawImage(beadCanvas, sx(top + 58) - 22, top + 58 - 22);
      ui.text(ctx, '➕ takip et', sx(top + 58) + 28, top + 48, { size: 21, align: 'left', color: 'rgba(255,240,220,0.75)' });
      ui.text(ctx, 'boncuk as', sx(top + 58) + 28, top + 73, { size: 21, align: 'left', color: 'rgba(255,240,220,0.75)' });
    }
  }

  function drawCezve(ctx, t) {
    var x = CEZVE.x, y = CEZVE.y;
    var f = kopukT > 0 ? 1 : clamp01(foam.shown / foam.target);
    ctx.save();
    // gölge
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + 8, y + 6, 74, 18, 0, 0, TAU); ctx.fill();
    // sap
    ctx.strokeStyle = '#5a3a1c'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 52, y - 92); ctx.lineTo(x + 132, y - 128); ctx.stroke();
    ctx.strokeStyle = '#8a5a2c'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x + 52, y - 92); ctx.lineTo(x + 132, y - 128); ctx.stroke();
    // köpük tepesi (beğeni ile büyür)
    var top = y - 120;
    var mound = 8 + f * 46 + (kopukT > 0 ? Math.sin(t * 5) * 5 : 0);
    var fg = ctx.createLinearGradient(0, top - mound, 0, top + 8);
    fg.addColorStop(0, '#fff8ec'); fg.addColorStop(1, '#d8b080');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(x - 48, top + 4);
    for (var i = 0; i <= 8; i++) {
      var px = x - 48 + i * 12;
      var py = top - mound * Math.sin(i / 8 * Math.PI) - Math.sin(t * 3 + i) * 3 * f;
      ctx.quadraticCurveTo(px - 6, py - 8 * f, px, py);
    }
    ctx.lineTo(x + 48, top + 6); ctx.closePath(); ctx.fill();
    if (kopukT > 0) { // taşan köpük
      ctx.fillStyle = '#f6e6cc';
      for (var d = 0; d < 3; d++) {
        var dx = x + [-44, 6, 40][d], len = 30 + 22 * Math.sin(t * 2 + d * 2);
        ui.roundRect(ctx, dx - 7, top, 14, len + 40, 7); ctx.fill();
      }
    }
    // gövde (bakır)
    var bg = ctx.createLinearGradient(x - 62, 0, x + 62, 0);
    bg.addColorStop(0, '#f2a46a'); bg.addColorStop(0.35, '#d07a3e'); bg.addColorStop(0.75, '#9c4a1e'); bg.addColorStop(1, '#5e2a0e');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(x - 52, top);
    ctx.lineTo(x - 60, top - 8);           // ağız + gaga
    ctx.lineTo(x - 40, top + 2);
    ctx.bezierCurveTo(x - 46, top + 30, x - 66, top + 70, x - 62, y - 6);
    ctx.quadraticCurveTo(x, y + 8, x + 62, y - 6);
    ctx.bezierCurveTo(x + 66, top + 70, x + 46, top + 30, x + 46, top);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffc78f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x - 3, top + 2, 46, 8, 0, 0, Math.PI); ctx.stroke();
    // dövme desen
    ctx.fillStyle = 'rgba(255,210,160,0.25)';
    for (var k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(x - 40 + (k % 5) * 20 + (k / 5 | 0) * 6, top + 42 + (k / 5 | 0) * 22, 4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(x - 34, top + 58, 7, 26, 0.15, 0, TAU); ctx.fill();
    ctx.restore();
    // kabarcıklar
    for (var b = 0; b < bubbles.length; b++) {
      var bb = bubbles[b], a = 1 - bb.t / bb.life;
      ctx.fillStyle = 'rgba(255,248,236,' + (0.8 * a) + ')';
      ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r, 0, TAU); ctx.fill();
    }
    // hedef çubuğu
    var label = kopukT > 0 ? '✨ KÖPÜKLÜ · ' + Math.ceil(kopukT) + ' sn' : '❤️ Köpük ' + LG.fmt(Math.min(foam.v, foam.target)) + '/' + LG.fmt(foam.target);
    ui.goalBar(ctx, 44, y + 22, 258, 46, kopukT > 0 ? kopukT : foam.shown, kopukT > 0 ? 60 : foam.target, { label: label, color1: '#c48a52', color2: '#fff1d6', bg: 'rgba(30,12,2,0.7)' });
  }

  function drawGrid(ctx, t) {
    var n = Math.min(Q.length, SLOTS.length);
    var foamy = kopukT > 0;
    // boş tabaklar
    for (var i = n; i < SLOTS.length; i++) {
      var sp = SLOTS[i];
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = 'rgba(255,230,200,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 62, 20, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      if (i === n) ui.text(ctx, '💬 fal', sp.x, sp.y - 2, { size: 24, color: 'rgba(255,236,210,0.85)', stroke: false });
    }
    for (i = 0; i < n; i++) {
      var e = Q[i], c = e.cup;
      if (!c) continue;
      var s = LG.ease.outBack(c.a);
      ctx.save();
      if (c.a < 1) ctx.globalAlpha = c.a;
      if (e.gold) {
        var gl = ctx.createRadialGradient(c.x, c.y - 30, 10, c.x, c.y - 30, 95);
        gl.addColorStop(0, 'rgba(255,215,90,' + (0.45 + 0.15 * Math.sin(t * 4 + i)) + ')'); gl.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = gl; ctx.fillRect(c.x - 95, c.y - 125, 190, 190);
      }
      drawCupSprite(ctx, c.x, c.y, e.band, !!e.gold, foamy, s);
      drawSteam(ctx, c.x, c.y - 56 * GRID_S, GRID_S, e.brew < 1 ? 1 : 0.55, i * 1.7);
      // demlenme halkası
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.strokeStyle = e.brew >= 1 ? 'rgba(130,255,170,0.85)' : 'rgba(255,190,110,0.9)';
      ctx.beginPath(); ctx.ellipse(c.x, c.y + 3, 70, 24, 0, Math.PI / 2, Math.PI / 2 + TAU * e.brew); ctx.stroke();
      // sıra no
      ctx.fillStyle = e.gold ? '#ffd166' : '#3a1c0a';
      ctx.beginPath(); ctx.arc(c.x - 62, c.y - 34, 17, 0, TAU); ctx.fill();
      ctx.strokeStyle = e.gold ? '#fff2b0' : '#e8c79a'; ctx.lineWidth = 2.5; ctx.stroke();
      ui.text(ctx, String(i + 1), c.x - 62, c.y - 32, { size: 22, color: e.gold ? '#3a1c0a' : '#ffe6c4', stroke: false });
      if (e.gold) ui.emoji(ctx, e.gold >= 2 ? '🔮' : '👑', c.x, c.y - 92 + Math.sin(t * 3 + i) * 4, 30);
      if (e.topic !== 'genel') ui.emoji(ctx, DATA.TOPICS[e.topic].icon, c.x + 54, c.y - 62, 26);
      ctx.restore();
      ui.drawNameTag(ctx, shortUser(e.user, 12), c.x, c.y + 42, 23, e.gold ? '#3a1c0a' : '#fff3e0', e.gold ? 'rgba(255,209,102,0.95)' : 'rgba(30,12,2,0.78)');
    }
  }

  function drawCenter(ctx, t) {
    var x = CENTER.x, y = CENTER.y;
    if (!active) {
      if (st.name === 'idle' && !Q.length && !replay) {
        // boş masa daveti
        ctx.save(); ctx.translate(x, y); ctx.scale(CENTER.s, CENTER.s);
        drawSaucerU(ctx, { band: '#c0392b' }); drawCupU(ctx, { band: '#c0392b' });
        ctx.restore();
        drawSteam(ctx, x, y - 62 * CENTER.s, CENTER.s, 0.9, 0);
        var p = 1 + Math.sin(t * 3) * 0.04;
        ui.text(ctx, '💬 "fal" yaz', CX, 470, { size: 50 * p, color: '#ffe3a6', strokeColor: 'rgba(40,16,4,0.9)' });
        ui.text(ctx, 'İlk fincan senin! ☕', CX, 818, { size: 38, color: '#fff3e0', strokeColor: 'rgba(40,16,4,0.9)' });
      }
      return;
    }
    var e = active, name = st.name, p2 = 0, ang = 0, lift = 0, dx = 0, alpha = 1;
    var cx = x, cy = y, s = CENTER.s;
    if (name === 'move') {
      p2 = LG.ease.outCubic(clamp01(st.t / DUR.move()));
      cx = LG.lerp(e.from.x, x, p2); cy = LG.lerp(e.from.y, y, p2) - Math.sin(p2 * Math.PI) * 120; s = LG.lerp(e.from.s, CENTER.s, p2);
    } else if (name === 'swirl') {
      var k = 1 - clamp01(st.t / DUR.swirl()) * 0.3;
      dx = Math.cos(st.t * 15) * 9 * k; lift = Math.sin(st.t * 15) * 3 * k; ang = Math.sin(st.t * 15) * 0.1 * k;
    } else if (name === 'flip') {
      p2 = clamp01(st.t / DUR.flip());
      ang = Math.PI * easeIO(p2); lift = -Math.sin(p2 * Math.PI) * 55;
    } else if (name === 'cool') {
      ang = Math.PI; lift = st.t < 0.2 ? -Math.sin(st.t / 0.2 * Math.PI) * 4 : 0;
    } else if (name === 'lift' || name === 'card' || name === 'out') {
      p2 = name === 'lift' ? clamp01(st.t / DUR.lift()) : 1;
      ang = Math.PI + Math.PI * easeIO(p2); lift = -p2 * 60; alpha = 1 - p2;
    }
    var gold = !!e.gold;
    // altın / mega aura
    if (gold || e.mega) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var ag = ctx.createRadialGradient(cx, cy - 60, 20, cx, cy - 60, 260);
      ag.addColorStop(0, 'rgba(255,210,90,' + (0.35 + 0.12 * Math.sin(t * 4)) + ')'); ag.addColorStop(1, 'rgba(255,180,40,0)');
      ctx.fillStyle = ag; ctx.fillRect(cx - 260, cy - 320, 520, 520);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(s, s);
    var o = { band: e.band, gold: gold, foam: kopukT > 0, ang: ang, lift: lift / s, dx: dx / s, drip: e.drip };
    if (name === 'out') ctx.globalAlpha = 1 - clamp01(st.t / 0.45);
    drawSaucerU(ctx, o);
    if (alpha > 0.01) { ctx.globalAlpha *= alpha; drawCupU(ctx, o); }
    ctx.restore();
    if (name === 'move' || name === 'brew' || name === 'swirl') drawSteam(ctx, cx + dx, cy + lift - 62 * s, s, name === 'brew' ? 1 : 0.7, 3);
    // isim ve durum
    if (name !== 'out' && name !== 'card') {
      var lbA = name === 'move' ? clamp01(st.t / 0.4) : 1;
      ctx.save(); ctx.globalAlpha = lbA;
      var tg = ui.nameTag(shortUser(e.user, 14), 40, gold ? '#3a1c0a' : '#fff3e0', gold ? 'rgba(255,209,102,0.96)' : 'rgba(30,12,2,0.82)');
      var tw = tg.width + 70;
      ui.panel(ctx, CX - tw / 2, 430, tw, 66, { r: 33, fill: gold ? 'rgba(255,209,102,0.96)' : 'rgba(30,12,2,0.82)', border: gold ? '#fff2b0' : 'rgba(255,220,170,0.5)', lineWidth: 3 });
      ui.avatar(ctx, e.user, CX - tw / 2 + 36, 463, 26, { ringWidth: 3, ring: gold ? '#fff' : '#e8c79a' });
      ctx.drawImage(tg, CX - tw / 2 + 64, 463 - tg.height / 2);
      if (e.topic !== 'genel') ui.text(ctx, DATA.TOPICS[e.topic].icon + ' ' + DATA.TOPICS[e.topic].label, CX, 518, { size: 26, color: '#ffe0b0', stroke: false });
      var stTxt;
      if (name === 'move') stTxt = gold ? '👑 Altın fincan geliyor…' : '☕ Fincan masaya geliyor…';
      else if (name === 'brew') stTxt = '☕ Demleniyor %' + Math.floor(e.brew * 100) + ' · Niyet tut 🙏';
      else if (name === 'swirl') stTxt = '🌀 Fincan niyetle çevriliyor…';
      else if (name === 'flip') stTxt = '🔄 Fincan kapatılıyor!';
      else if (name === 'cool') stTxt = '⏳ Soğuyor' + '...'.slice(0, 1 + Math.floor(st.t * 3) % 3) + ' falın geliyor';
      else stTxt = '🔮 Fal açılıyor!';
      ui.text(ctx, stTxt, CX, 820, { size: 36, color: '#fff3e0', strokeColor: 'rgba(40,16,4,0.9)', maxWidth: 470 });
      ctx.restore();
      if (name === 'brew') { // demlenme halkası
        ctx.save(); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,190,110,0.9)';
        ctx.beginPath(); ctx.ellipse(cx, cy + 6, 168, 56, 0, Math.PI / 2, Math.PI / 2 + TAU * e.brew); ctx.stroke(); ctx.restore();
      }
    }
  }

  function drawPanel(ctx, t) {
    var p = PANEL;
    ui.panel(ctx, p.x, p.y, p.w, p.h, { r: 26, fill: 'rgba(28,12,3,0.78)', border: 'rgba(255,210,150,0.4)', lineWidth: 3 });
    var cx = p.x + p.w / 2;
    ui.text(ctx, '☕ SIRADA', cx, p.y + 34, { size: 30, color: '#ffd9a0', stroke: false });
    var bump = 1 + panelBump * 0.25;
    ui.text(ctx, LG.fmt(Q.length), cx, p.y + 96, { size: 78 * bump, color: Q.length ? '#ffffff' : 'rgba(255,255,255,0.6)', strokeColor: 'rgba(0,0,0,0.6)' });
    var mode = hold ? '⏸ kart bekliyor' : (fast || Q.length > 12) ? '⚡ hızlı okuma' : 'kişi';
    ui.text(ctx, mode, cx, p.y + 146, { size: mode === 'kişi' ? 28 : 25, color: mode === 'kişi' ? '#ffe6c4' : '#ffd166', stroke: false });
    ctx.fillStyle = 'rgba(255,210,150,0.3)'; ctx.fillRect(p.x + 18, p.y + 170, p.w - 36, 2);
    if (!Q.length) {
      ui.text(ctx, 'Henüz kimse yok', cx, p.y + 220, { size: 24, color: 'rgba(255,240,220,0.75)', stroke: false });
      ui.text(ctx, 'İlk fincan senin!', cx, p.y + 254, { size: 26, color: '#ffd166', stroke: false });
    }
    for (var i = 0; i < Math.min(5, Q.length); i++) {
      var e = Q[i], ry = p.y + 205 + i * 46;
      if (e.gold) ui.emoji(ctx, e.gold >= 2 ? '🔮' : '👑', p.x + 26, ry, 24);
      else ui.text(ctx, String(i + 1), p.x + 26, ry + 1, { size: 24, color: '#ffd166', stroke: false });
      ui.avatar(ctx, e.user, p.x + 60, ry, 17, { ringWidth: 2.5, ring: e.gold ? '#ffd166' : '#e8c79a' });
      ui.text(ctx, shortUser(e.user, 12).name, p.x + 84, ry + 1, { size: 25, align: 'left', maxWidth: p.w - 98, color: e.gold ? '#ffd166' : '#fff3e0', stroke: false });
    }
    if (Q.length > 5) ui.text(ctx, '+' + LG.fmt(Q.length - 5) + ' kişi daha', cx, p.y + 205 + 5 * 46 - 6, { size: 22, color: 'rgba(255,230,200,0.7)', stroke: false });
    ctx.fillStyle = 'rgba(255,210,150,0.3)'; ctx.fillRect(p.x + 18, p.y + p.h - 82, p.w - 36, 2);
    ui.text(ctx, '🔮 Bugün: ' + LG.fmt(readToday) + ' fal', cx, p.y + p.h - 56, { size: 24, color: '#ffe6c4', stroke: false, maxWidth: p.w - 24 });
    ui.text(ctx, '💬 fal yaz → sıraya gir', cx, p.y + p.h - 22, { size: 22, color: '#ffd166', stroke: false, maxWidth: p.w - 20 });
  }

  function drawTokens(ctx) {
    for (var i = 0; i < tokens.length; i++) {
      var k = tokens[i], p = LG.ease.outCubic(clamp01(k.t / k.dur));
      var x = LG.lerp(k.x0, k.x1, p), y = LG.lerp(k.y0, k.y1, p) - Math.sin(p * Math.PI) * 140;
      var a = p > 0.85 ? (1 - p) / 0.15 : 1;
      ctx.save(); ctx.globalAlpha = a;
      ui.emoji(ctx, k.gold ? '👑' : '☕', x, y - 30, 40);
      ui.drawNameTag(ctx, k.tag, x, y + 8, 24, k.gold ? '#3a1c0a' : '#fff', k.gold ? 'rgba(255,209,102,0.95)' : 'rgba(120,50,10,0.9)');
      ctx.restore();
    }
  }

  function drawLokums(ctx) {
    for (var i = 0; i < lokums.length; i++) {
      var l = lokums[i];
      if (l.t < 0) continue;
      var p = clamp01(l.t / 0.7);
      var x = LG.lerp(l.x0, l.x, p), y = LG.lerp(l.y0, l.y, LG.ease.outBack(p)) - Math.sin(p * Math.PI) * 80;
      var sp = lokumSprites[l.spr];
      ctx.save(); ctx.translate(x, y); ctx.rotate(l.rot + (1 - p) * 4); ctx.scale(l.s, l.s);
      ctx.drawImage(sp, -24, -24);
      ctx.restore();
    }
  }

  function drawPoofs(ctx) {
    for (var i = 0; i < poofs.length; i++) {
      var p = poofs[i], k = p.t / 1.1;
      ctx.fillStyle = 'rgba(255,248,236,' + (0.45 * (1 - k)) + ')';
      for (var j = 0; j < 5; j++) {
        var a = j / 5 * TAU + p.t;
        ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 40 * k * p.k, p.y + Math.sin(a) * 20 * k * p.k - k * 50, (14 + 24 * k) * p.k, 0, TAU); ctx.fill();
      }
    }
  }

  // --- Fal kartı -------------------------------------------------------------
  var BODY_FONT = '700 37px ' + FONT;
  function paper(ctx, x, y, w, h, kind, kopuk, r) {
    var key = (kind === 'normal' ? 'n' : 'g') + w + 'x' + h;
    var spr = paperCache[key];
    if (!spr) {
      spr = mk(w + 120, h + 120);
      var g = spr.getContext('2d');
      g.translate(60, 60);
      paperRaw(g, 0, 0, w, h, kind, r);
      paperCache[key] = spr;
    }
    ctx.drawImage(spr, x - 60, y - 60);
    if (kopuk) { // köpük kenarı
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      for (var i = 0; i < 20; i++) {
        var bx = x + 20 + i * (w - 40) / 19;
        ctx.beginPath(); ctx.arc(bx, y + 4 + Math.sin(i * 1.7 + LG.time * 2) * 3, 12 + (i * 7 % 5) * 2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
  function paperRaw(ctx, x, y, w, h, kind, r) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    ui.roundRect(ctx, x, y, w, h, r || 34);
    var gr = ctx.createLinearGradient(0, y, 0, y + h);
    if (kind === 'normal') { gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#f1dfbf'); }
    else { gr.addColorStop(0, '#fff8dc'); gr.addColorStop(1, '#f6dc94'); }
    ctx.fillStyle = gr; ctx.fill();
    ctx.restore();
    ctx.save();
    ui.roundRect(ctx, x, y, w, h, r || 34);
    if (kind === 'normal') { ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 8; }
    else {
      var bg = ctx.createLinearGradient(x, y, x + w, y + h);
      bg.addColorStop(0, '#fff2a8'); bg.addColorStop(0.3, '#d4a017'); bg.addColorStop(0.6, '#ffe28a'); bg.addColorStop(1, '#a8780f');
      ctx.strokeStyle = bg; ctx.lineWidth = 12;
    }
    ctx.stroke();
    ui.roundRect(ctx, x + 16, y + 16, w - 32, h - 32, (r || 34) - 12);
    ctx.setLineDash([3, 9]); ctx.lineCap = 'round';
    ctx.strokeStyle = kind === 'normal' ? 'rgba(122,74,34,0.5)' : 'rgba(168,120,15,0.7)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function ribbon(ctx, text, cx, y, kind, kopuk) {
    ctx.save();
    ctx.font = ui.font(34, 900);
    var w = ctx.measureText(text).width + 90;
    ctx.restore();
    var fill = kind !== 'normal' ? '#d4a017' : kopuk ? '#f3e2c7' : '#7a4a22';
    ui.panel(ctx, cx - w / 2, y - 34, w, 68, { r: 34, fill: fill, border: kind !== 'normal' ? '#fff2a8' : '#f6dfba', lineWidth: 4 });
    ui.text(ctx, text, cx, y + 2, { size: 34, color: kind !== 'normal' ? '#3a1c0a' : kopuk ? '#5a3010' : '#fff3e0', stroke: false, weight: 900 });
  }

  function sparkles(ctx, x, y, w, h, n, t) {
    for (var i = 0; i < n; i++) {
      var sx = x + ((i * 137.5) % w), sy = y + ((i * 91.3) % h);
      var a = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.3);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(sx, sy); ctx.rotate(t + i);
      ctx.fillStyle = '#fff6c0';
      ctx.beginPath(); for (var k = 0; k < 8; k++) { var rr = k % 2 ? 3 : 11; ctx.lineTo(Math.cos(k / 8 * TAU) * rr, Math.sin(k / 8 * TAU) * rr); } ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function header(ctx, c, y) {
    var x0 = CARD.x + 56;
    ui.avatar(ctx, c.user, x0 + 40, y + 40, 52, { ring: c.kind !== 'normal' ? '#d4a017' : '#7a4a22', ringWidth: 5 });
    ui.text(ctx, c.user.name, x0 + 110, y + 22, { size: 48, align: 'left', color: '#3a1c0a', stroke: false, maxWidth: CARD.w - 220, weight: 900 });
    var tp = DATA.TOPICS[c.topic] || DATA.TOPICS.genel;
    var sub = c.kind === 'big' ? '🔮 Geçmiş · Şimdi · Gelecek' : tp.icon + ' ' + tp.label;
    if (c.sub) sub += '  ·  ' + c.sub;
    ui.text(ctx, sub, x0 + 110, y + 70, { size: 27, align: 'left', color: '#8a5228', stroke: false, maxWidth: CARD.w - 220 });
  }

  function footer(ctx, c, y, prog) {
    ui.text(ctx, '🎯 Tuttu ' + c.yes + '  🙈 Tutmadı ' + c.no, CARD.x + 48, y, { size: 26, align: 'left', color: '#5a3010', stroke: false, maxWidth: 360 });
    ui.text(ctx, 'Eğlence amaçlıdır 😄', CARD.x + CARD.w - 48, y, { size: 21, align: 'right', color: 'rgba(90,48,16,0.7)', stroke: false });
    if (c.lastVoter) {
      var lv = c.lastVoter, age = LG.time - lv.t;
      var ps = age < 0.25 ? 1 + 0.25 * Math.sin(age / 0.25 * Math.PI) : 1;
      ctx.save(); ctx.translate(CARD.x + 496, y); ctx.scale(ps, ps);
      ui.panel(ctx, -78, -19, 156, 38, { r: 19, fill: lv.yes ? 'rgba(46,160,90,0.9)' : 'rgba(200,70,100,0.9)', border: false });
      ui.text(ctx, (lv.yes ? '🎯 ' : '🙈 ') + lv.name, 0, 1, { size: 22, color: '#fff', stroke: false, maxWidth: 140 });
      ctx.restore();
    }
    var bx = CARD.x + 40, bw = CARD.w - 80;
    ctx.fillStyle = 'rgba(122,74,34,0.18)'; ui.roundRect(ctx, bx, y + 26, bw, 9, 4.5); ctx.fill();
    ctx.fillStyle = c.kind !== 'normal' ? '#d4a017' : '#a8683a'; ui.roundRect(ctx, bx, y + 26, Math.max(9, bw * (1 - prog)), 9, 4.5); ctx.fill();
    if (hold) ui.text(ctx, '⏸', bx + bw - 10, y + 30, { size: 22, stroke: false });
  }

  function drawCard(ctx, c, t, outK, isReplay) {
    var ct = c.t;
    var pop = LG.ease.outBack(clamp01(ct / 0.45));
    var a = clamp01(ct / 0.2) * (1 - outK);
    var sc = (0.6 + 0.4 * pop) * (1 - outK * 0.12);
    var big = c.kind === 'big';
    var x = CARD.x, y = big ? CARD.y - 16 : CARD.y, w = CARD.w, h = big ? CARD.h + 34 : CARD.h;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(CX, y + h / 2 - outK * 40); ctx.scale(sc, sc); ctx.translate(-CX, -(y + h / 2));
    if (c.kind !== 'normal' || c.mega) { // altın ışınlar
      ctx.save();
      ctx.translate(CX, y + h / 2); ctx.rotate(t * 0.25);
      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = c.mega ? 'rgba(255,220,120,0.5)' : 'rgba(255,215,90,0.35)';
      for (var r = 0; r < 14; r++) { ctx.rotate(TAU / 14); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -720); ctx.lineTo(60, -720); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    paper(ctx, x, y, w, h, c.kind, c.kopuk);
    var rib = big ? '🔮 BÜYÜK AÇILIM' : c.kind === 'gold' ? '👑 ALTIN FİNCAN' : c.kopuk ? '✨ KÖPÜKLÜ FAL ✨' : '☕ FALIN HAZIR';
    if (isReplay) rib = '🔁 ' + rib;
    ribbon(ctx, rib, CX, y, c.kind, c.kopuk);
    header(ctx, c, y + 50);
    if (big) drawSpread(ctx, c, y, t);
    else {
      // sembol madalyonu
      var my = y + 268;
      ctx.save();
      if (c.kind !== 'normal' || c.kopuk) {
        var hg = ctx.createRadialGradient(CX, my, 60, CX, my, 170);
        hg.addColorStop(0, c.kopuk && c.kind === 'normal' ? 'rgba(255,255,255,0.9)' : 'rgba(255,215,90,0.85)'); hg.addColorStop(1, 'rgba(255,215,90,0)');
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(CX, my, 170, 0, TAU); ctx.fill();
      }
      ctx.drawImage(groundsCanvas, CX - 108, my - 108, 216, 216);
      var rv = clamp01((ct - 0.45) / 0.9);
      var bob = Math.sin(t * 2.2) * 4;
      if (rv < 1) drawSym(ctx, c.sym.e, CX, my + bob, 112, 'rgba(58,26,8,0.88)', 1 - rv);
      if (rv > 0) {
        var ss = 0.85 + 0.15 * LG.ease.outBack(rv);
        ctx.save(); ctx.translate(CX, my + bob); ctx.scale(ss, ss);
        drawSym(ctx, c.sym.e, 0, 0, 112, null, rv);
        ctx.restore();
      }
      ctx.restore();
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '6px';
      ui.text(ctx, c.sym.ad, CX, my + 140, { size: 44, color: '#6b3a16', stroke: false, weight: 900 });
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
      // fal metni (daktilo)
      if (!c.lines) {
        c.font = BODY_FONT; c.lh = 49;
        c.lines = wrap(ctx, c.text, w - 110, c.font);
        if (c.lines.length > 5) { c.font = '700 33px ' + FONT; c.lh = 43; c.lines = wrap(ctx, c.text, w - 100, c.font); }
        c.total = c.text.length;
      }
      var shown = Math.floor(Math.max(0, ct - 0.6) * 75);
      ctx.save();
      ctx.font = c.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3b1f0e';
      var ty = my + 205;
      for (var i = 0; i < c.lines.length; i++) {
        var ln = c.lines[i];
        if (shown <= 0) break;
        ctx.fillText(shown >= ln.length ? ln : ln.slice(0, shown), CX, ty + i * c.lh);
        shown -= ln.length + 1;
      }
      ctx.restore();
    }
    footer(ctx, c, y + h - 62, clamp01(ct / c.dur));
    if (c.kind !== 'normal' || c.kopuk) sparkles(ctx, x, y, w, h, c.kind !== 'normal' ? 16 : 10, t);
    ctx.restore();
  }

  function drawSpread(ctx, c, y, t) {
    var cw = 268, ch = 500, gap = 18;
    var x0 = CX - (cw * 3 + gap * 2) / 2, cy = y + 172;
    for (var i = 0; i < 3; i++) {
      var sp = c.spread[i];
      var x = x0 + i * (cw + gap);
      var rt = 0.6 + i * 1.5;          // açılış zamanı
      var p = clamp01((c.t - rt) / 0.4);
      var sx = Math.abs(Math.cos(p * Math.PI));
      var front = p >= 0.5;
      ctx.save();
      ctx.translate(x + cw / 2, cy + ch / 2); ctx.scale(Math.max(0.02, sx), 1); ctx.translate(-(x + cw / 2), -(cy + ch / 2));
      if (!front) {
        ui.roundRect(ctx, x, cy, cw, ch, 22);
        var bg = ctx.createLinearGradient(x, cy, x + cw, cy + ch);
        bg.addColorStop(0, '#7a4a22'); bg.addColorStop(1, '#4a2810');
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 5; ctx.stroke();
        ui.roundRect(ctx, x + 14, cy + 14, cw - 28, ch - 28, 14); ctx.strokeStyle = 'rgba(255,215,90,0.5)'; ctx.lineWidth = 2; ctx.stroke();
        ui.emoji(ctx, '☕', x + cw / 2, cy + ch / 2 - 20, 90);
        ui.text(ctx, sp.label, x + cw / 2, cy + ch / 2 + 70, { size: 30, color: '#ffd166', stroke: false, weight: 900 });
      } else {
        ui.roundRect(ctx, x, cy, cw, ch, 22);
        ctx.fillStyle = '#fffaf0'; ctx.fill();
        ctx.strokeStyle = '#d4a017'; ctx.lineWidth = 5; ctx.stroke();
        ui.roundRect(ctx, x, cy, cw, 58, 22); ctx.fillStyle = '#7a4a22'; ctx.fill();
        ctx.fillRect(x, cy + 30, cw, 28);
        ui.text(ctx, sp.label, x + cw / 2, cy + 31, { size: 30, color: '#ffe6c4', stroke: false, weight: 900 });
        ctx.drawImage(groundsCanvas, x + cw / 2 - 72, cy + 76, 144, 144);
        drawSym(ctx, sp.sym.e, x + cw / 2, cy + 148 + Math.sin(t * 2 + i) * 3, 82);
        ui.text(ctx, sp.sym.ad, x + cw / 2, cy + 248, { size: 30, color: '#6b3a16', stroke: false, weight: 900 });
        if (!sp.lines) sp.lines = wrap(ctx, sp.text, cw - 34, '700 27px ' + FONT);
        ctx.save();
        ctx.font = '700 27px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3b1f0e';
        for (var k = 0; k < sp.lines.length && k < 6; k++) ctx.fillText(sp.lines[k], x + cw / 2, cy + 300 + k * 36);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  function drawExpress(ctx, ex, t, outK, isReplay) {
    var a = clamp01(ex.t / 0.3) * (1 - outK);
    ctx.save();
    ctx.globalAlpha = a;
    var title = (isReplay ? '🔁 ' : '') + '⚡ EKSPRES FAL · ' + ex.items.length + ' fincan birden!';
    ui.panel(ctx, CX - 400, 392, 800, 70, { r: 35, fill: ex.kopuk ? '#f3e2c7' : '#7a4a22', border: '#f6dfba', lineWidth: 4 });
    ui.text(ctx, title, CX, 429, { size: 36, color: ex.kopuk ? '#5a3010' : '#fff3e0', stroke: false, weight: 900, maxWidth: 760 });
    var cw = 286, ch = 322, gap = 14;
    var x0 = CX - (cw * 3 + gap * 2) / 2;
    for (var i = 0; i < ex.items.length; i++) {
      var it = ex.items[i];
      var col = i % 3, row = (i / 3) | 0;
      var x = x0 + col * (cw + gap), y = 482 + row * (ch + gap);
      var p = clamp01((ex.t - 0.5 - i * 0.3) / 0.35);
      if (p <= 0) continue;
      var s = LG.ease.outBack(p);
      ctx.save();
      ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(s, s); ctx.translate(-(x + cw / 2), -(y + ch / 2));
      ui.roundRect(ctx, x, y, cw, ch, 22);
      ctx.fillStyle = '#fffaf0'; ctx.fill();
      ctx.strokeStyle = ex.kopuk ? '#e8c8a0' : '#7a4a22'; ctx.lineWidth = 5; ctx.stroke();
      ui.avatar(ctx, it.user, x + 44, y + 44, 28, { ringWidth: 3, ring: '#7a4a22' });
      ui.text(ctx, it.user.name, x + 82, y + 45, { size: 28, align: 'left', color: '#3a1c0a', stroke: false, maxWidth: cw - 96, weight: 900 });
      ctx.drawImage(groundsCanvas, x + cw / 2 - 60, y + 84, 120, 120);
      drawSym(ctx, it.sym.e, x + cw / 2, y + 144 + Math.sin(t * 2 + i) * 3, 70);
      ui.text(ctx, it.sym.ad, x + cw / 2, y + 224, { size: 26, color: '#6b3a16', stroke: false, weight: 900 });
      if (!it.lines) it.lines = wrap(ctx, it.text, cw - 30, '700 26px ' + FONT);
      ctx.save();
      ctx.font = '700 26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#3b1f0e';
      for (var k = 0; k < it.lines.length && k < 2; k++) ctx.fillText(it.lines[k], x + cw / 2, y + 262 + k * 32);
      ctx.restore();
      if (ex.kopuk) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; for (var b = 0; b < 7; b++) { ctx.beginPath(); ctx.arc(x + 20 + b * 41, y + 4, 10 + (b % 3) * 3, 0, TAU); ctx.fill(); } }
      ctx.restore();
    }
    // süre çubuğu
    var prog = clamp01(ex.t / ex.dur);
    ctx.fillStyle = 'rgba(255,230,200,0.25)'; ui.roundRect(ctx, CX - 400, 1146, 800, 10, 5); ctx.fill();
    ctx.fillStyle = '#ffd166'; ui.roundRect(ctx, CX - 400, 1146, Math.max(10, 800 * (1 - prog)), 10, 5); ctx.fill();
    ctx.restore();
  }

  function buildTitle() {
    var g0 = mk(10, 10).getContext('2d');
    g0.font = '900 88px ' + FONT;
    titleW = g0.measureText('FAL MASASI').width;
    var c = mk(Math.ceil(titleW + 80), 150), g = c.getContext('2d');
    g.font = '900 88px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.shadowColor = 'rgba(255,170,60,0.65)'; g.shadowBlur = 26;
    g.lineWidth = 16; g.strokeStyle = '#2a1206'; g.strokeText('FAL MASASI', 40, 75);
    g.shadowBlur = 0;
    var tg = g.createLinearGradient(0, 35, 0, 115);
    tg.addColorStop(0, '#fff3c4'); tg.addColorStop(0.5, '#ffd166'); tg.addColorStop(1, '#e08a2c');
    g.fillStyle = tg; g.fillText('FAL MASASI', 40, 75);
    return c;
  }
  function drawTitle(ctx, t) {
    var y = 292;
    var discl = !overlayOn();
    if (banner) {
      drawBanner(ctx, banner, t);
      if (discl && banner.tier < 5) ui.text(ctx, 'Eğlence amaçlıdır 😄', CX, 352, { size: 22, color: 'rgba(255,236,210,0.8)', stroke: false });
      return;
    }
    var total = titleW + 96;
    var x = CX - total / 2;
    ctx.drawImage(titleCanvas, x - 40, y - 75);
    ui.emoji(ctx, '☕', CX + total / 2 - 44, y - 4 + Math.sin(t * 2) * 3, 78);
    if (discl) ui.text(ctx, 'Eğlence amaçlıdır 😄', CX, 344, { size: 24, color: 'rgba(255,236,210,0.8)', stroke: false });
  }

  function drawBanner(ctx, b, t) {
    var inP = LG.ease.outBack(clamp01(b.t / 0.45));
    var outA = clamp01((b.dur - b.t) / 0.35);
    var big = b.tier >= 5;
    var x = 58, w = W - 116, h = big ? 118 : 100, y = 236 + (1 - inP) * -140;
    ctx.save();
    ctx.globalAlpha = outA;
    ctx.save();
    ui.roundRect(ctx, x - 8, y - 8, w + 16, h + 16, h / 2 + 8);
    ctx.fillStyle = big ? 'rgba(255,200,80,0.35)' : 'rgba(255,200,80,0.22)'; ctx.fill();
    ui.roundRect(ctx, x, y, w, h, h / 2);
    var gr = ctx.createLinearGradient(x, 0, x + w, 0);
    var sh = (t * 0.4) % 1;
    gr.addColorStop(0, '#b8860b'); gr.addColorStop(Math.max(0.01, sh * 0.9), '#ffd666'); gr.addColorStop(Math.min(0.99, sh * 0.9 + 0.1), '#fff3b8'); gr.addColorStop(1, '#c8961e');
    ctx.fillStyle = gr; ctx.fill();
    ctx.restore();
    ui.roundRect(ctx, x, y, w, h, h / 2); ctx.strokeStyle = '#fff6cf'; ctx.lineWidth = 5; ctx.stroke();
    ui.avatar(ctx, b.user, x + h / 2 + 4, y + h / 2, h / 2 - 12, { ring: '#fff', ringWidth: 4 });
    ui.text(ctx, b.text, x + h + 20, y + h * 0.33, { size: big ? 40 : 36, align: 'left', color: '#2a1206', stroke: false, maxWidth: w - h - 140, weight: 900 });
    ui.text(ctx, b.sub, x + h + 20, y + h * 0.72, { size: big ? 30 : 27, align: 'left', color: '#4a2408', stroke: false, maxWidth: w - h - 140 });
    ui.emoji(ctx, b.emoji, x + w - 62, y + h / 2 + Math.sin(t * 7) * 5, big ? 74 : 62);
    ctx.restore();
  }

  function drawTicker(ctx, y) {
    if (!tick) return;
    var a = Math.min(1, tick.t / 0.2, (tick.dur - tick.t) / 0.25);
    var str = tick.icon + ' ' + (tick.name ? tick.name + ' ' : '') + tick.text;
    if (!tick.w) { ctx.save(); ctx.font = ui.font(28, 800); tick.w = Math.min(640, ctx.measureText(str).width + 60); ctx.restore(); }
    var sl = (1 - LG.ease.outCubic(clamp01(tick.t / 0.3))) * 30;
    ctx.save(); ctx.globalAlpha = a;
    ui.panel(ctx, CX - tick.w / 2, y - 24 + sl, tick.w, 48, { r: 24, fill: 'rgba(25,10,2,0.86)', border: 'rgba(255,215,150,0.5)', lineWidth: 2 });
    ui.text(ctx, str, CX, y + 1 + sl, { size: 28, color: tick.color, stroke: false, maxWidth: tick.w - 30 });
    ctx.restore();
  }

  function drawNextPill(ctx) {
    var txt = Q.length ? '☕ Sırada ' + LG.fmt(Q.length) + ' kişi · sıradaki: ' + shortUser(Q[0].user, 12).name : '💬 fal yaz → fincanın masaya gelsin';
    ctx.save();
    ctx.font = ui.font(28, 800);
    var w = Math.min(880, ctx.measureText(txt).width + 60);
    ctx.restore();
    ui.panel(ctx, CX - w / 2, NEXT_PILL_Y - 24, w, 48, { r: 24, fill: 'rgba(25,10,2,0.86)', border: 'rgba(255,215,150,0.4)', lineWidth: 2 });
    ui.text(ctx, txt, CX, NEXT_PILL_Y + 1, { size: 28, color: '#ffe6c4', stroke: false, maxWidth: w - 30 });
  }

  function drawKopukMoment(ctx, t) {
    if (kopukMoment <= 0) return;
    var k = 2.6 - kopukMoment;
    var s = LG.ease.outElastic(clamp01(k / 0.8));
    var a = clamp01(kopukMoment / 0.4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(CX, 690); ctx.scale(s, s); ctx.rotate(Math.sin(t * 6) * 0.03);
    ctx.fillStyle = 'rgba(255,250,240,0.95)';
    for (var i = 0; i < 16; i++) { var an = i / 16 * TAU; ctx.beginPath(); ctx.arc(Math.cos(an) * 360, Math.sin(an) * 110, 56 + (i % 3) * 12, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(0, 0, 380, 120, 0, 0, TAU); ctx.fill();
    ui.text(ctx, 'KÖPÜKLÜ KAHVE!', 0, -18, { size: 86, color: '#7a3d12', stroke: false, weight: 900 });
    ui.text(ctx, '60 sn boyunca her fal köpüklü ✨', 0, 56, { size: 34, color: '#a8683a', stroke: false });
    ctx.restore();
  }

  function render(ctx, t) {
    ctx.save();
    ui.applyShake(ctx);
    ctx.drawImage(bgCanvas, 0, 0);
    // sıcak ışık titremesi
    var fl = (kopukT > 0 ? 0.12 + 0.03 * Math.sin(t * 3) : 0) + (megaT > 0 ? 0.35 * Math.min(1, megaT) * (0.8 + 0.2 * Math.sin(t * 6)) : 0);
    if (fl > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fl;
      ctx.drawImage(glowCanvas, 0, DOILY.y + 40 - 700);
      ctx.restore();
    }
    drawLokums(ctx);
    drawLampAndBeads(ctx, t);
    drawCezve(ctx, t);
    drawGrid(ctx, t);
    drawCenter(ctx, t);
    drawPanel(ctx, t);
    drawPoofs(ctx);
    ctx.restore();

    // Kart katmanı
    var showCard = null, showExp = null, outK = 0, isRep = false;
    if (replay) { isRep = true; if (replay.card) showCard = replay.card; else showExp = replay.exp; }
    else if (card && (st.name === 'lift' || st.name === 'card' || st.name === 'out')) { showCard = card; outK = st.name === 'out' ? clamp01(st.t / 0.45) : 0; }
    else if (exp && (st.name === 'express' || st.name === 'expout')) { showExp = exp; outK = st.name === 'expout' ? clamp01(st.t / 0.45) : 0; }
    if (showCard || showExp) {
      var dimA = showCard ? clamp01(showCard.t / 0.3) : clamp01(showExp.t / 0.3);
      ctx.fillStyle = 'rgba(12,5,0,' + (0.6 * dimA * (1 - outK)) + ')';
      ctx.fillRect(0, 0, W, H);
      if (showCard) drawCard(ctx, showCard, t, outK, isRep);
      else drawExpress(ctx, showExp, t, outK, isRep);
      if (tick) drawTicker(ctx, NEXT_PILL_Y); else drawNextPill(ctx);
    } else {
      drawTicker(ctx, TICK_Y);
    }
    drawTokens(ctx);
    drawTitle(ctx, t);
    drawKopukMoment(ctx, t);
    ui.hintBar(ctx, 90, HINT_Y, 900, HINTS, { h: 70, size: 36, fill: 'rgba(25,10,2,0.78)', border: 'rgba(255,215,150,0.45)', color: '#fff3e0' });
  }

  // ---------------------------------------------------------------------------
  LG.start({
    id: 'kahve-fali',
    title: 'Fal Masası ☕',
    init: function (ctx) {
      for (var i = 0; i < 4; i++) lokumSprites.push(lokumSprite(i));
      bgCanvas = buildBackground();
      glowCanvas = buildGlow();
      groundsCanvas = buildGrounds();
      globeCanvas = buildGlobe();
      beadCanvas = buildBead();
      titleCanvas = buildTitle();
      haloCanvas = buildHalo();
      LG.music.play('chill');
    },
    update: update,
    render: render,
  });
})();
