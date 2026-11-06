/*
 * HALK NE DEDİ? 🗣️ — yorumlarla oynanan "en popüler cevapları bul" oyunu.
 *
 * Akış:  TUR girişi → 5 soru → kürsü (ilk 3) → yeni tur (otomatik)
 *   Her soru 60 sn: tabelada 1–6 numaralı gizli cevaplar (popülerliğe göre puanlı).
 *   💬 Yorum = tahmin. Eşleşen kart döner: "İlk bulan: <ad> ⚡" kartın puanını alır,
 *      sonra bilenler +5 "ben de bildim" puanı alır. Yanlış tahmin cezasız (sayaç artar).
 *   ⏳ 30. sn: kalan cevapların ilk harfleri · 45. sn: harf sayıları · 60. sn: davul eşliğinde
 *      kalanlar tek tek açılır ("kimse bulamadı"). 4 sn sonra sıradaki soru.
 *   ❤️ Beğeni → İPUCU çubuğu dolar → en üstteki gizli cevabın harfi açılır.
 *   🎁 Hediye (topluluk yararına, gönderene puan YOK):
 *      1. kademe: kalp + teşekkür · 2+: İPUCU HEDİYESİ (herkese bir harf)
 *      4+: +20 SANİYE (herkese) · 5+: ALTIN SORU (sıradaki soru herkese x2 puan)
 * Kısayollar: N sıradaki soru · B cevapları şimdi aç · T +15 sn · I ipucu ver · R yeni tur
 * URL: ?sure=60 (soru süresi) · ?soru=5 (turdaki soru) · ?ipucu=200 (beğeni hedefi tabanı)
 */
(function () {
  'use strict';
  var ui = LG.ui;
  var D = window.HND_DATA;
  var W = LG.W, H = LG.H, TAU = Math.PI * 2;
  var clamp = LG.clamp, lerp = LG.lerp, ease = LG.ease;

  ui.celebrateEnabled = false; // kendi hediye şeridimiz var (üstte, tabelayı kapatmadan)
  ui.toastsEnabled = false;    // bildirimler sağ alttaki canlı akışta

  // ---------------------------------------------------------------------------
  // Ayarlar
  // ---------------------------------------------------------------------------
  var Q_TIME = clamp(LG.qn('sure', 60), 20, 180);
  var Q_PER_ROUND = clamp(Math.round(LG.qn('soru', 5)), 1, 12);
  var LIKE_BASE = clamp(Math.round(LG.qn('ipucu', 200)), 20, 100000);
  var HINT1_AT = Q_TIME * 0.5, HINT2_AT = Q_TIME * 0.75;
  var INTRO_T = 1.8, PAUSE_T = 4, COMPLETE_T = 2.8, PODIUM_T = 12, RINTRO_T = 3.4;
  var LATE_PTS = 5, JOIN_PTS = 1, FLIP_T = 0.6, MAX_LEFT = Q_TIME + 30;

  // ---------------------------------------------------------------------------
  // Yerleşim (1080x1920 — önemli her şey y 230..1300 arasında)
  // ---------------------------------------------------------------------------
  var CAMTOP = LG.CAM && LG.CAM.y < 700 ? LG.CAM : null; // ?cam=tr / tl ise üst bölgeyi daralt
  var HX = 40, HW = 1000;
  if (CAMTOP) {
    if (CAMTOP.x + CAMTOP.w / 2 > W / 2) HW = CAMTOP.x - 14 - HX;
    else { HX = CAMTOP.x + CAMTOP.w + 14; HW = 1040 - HX; }
  }
  var HEAD = { x: HX, y: 238, w: HW, h: 66 };
  var CARD = { x: HX, y: 314, w: HW, h: 190 };
  var TIMER = { x: CARD.x + CARD.w - 78, y: CARD.y + CARD.h / 2 - 2, r: 64 };
  var FRAME = { x: 26, y: 516, w: 1028, h: 416 };
  var TW = 486, TH = 118;
  var TCOL = [46, 548], TROW = [532, 662, 792];
  var LIKEBAR = { x: 40, y: 944, w: 604, h: 52 };
  var COUNTER = { x: 656, y: 944, w: 384, h: 52 };
  var LB = { x: 40, y: 1006, w: 476, h: 204 };
  var FEED = { x: 528, y: 1006, w: 512, h: 204 };
  var HINT = { x: 60, y: 1220, w: 960, h: 68 };
  var BOARD_CY = FRAME.y + FRAME.h / 2;

  var INK = '#1d1340';
  var HINT_LINES = ['💬 Tahminini yaz → tabelayı aç', '⚡ İlk bulan puanı kapar', '❤️ Beğen → ipucu', '🎁 Hediye → herkese ipucu'];

  // ---------------------------------------------------------------------------
  // Yardımcılar
  // ---------------------------------------------------------------------------
  function trUp(s) { return String(s).replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase(); }
  function compact(s) { return LG.cmd.norm(s).replace(/[^a-z0-9]/g, ''); }
  function trunc(s, n) { var a = Array.from(String(s)); return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); }
  function isLetter(ch) { return /\p{L}/u.test(ch); }
  function backVowel(s) {
    var m = String(s).toLowerCase().match(/[aıoueiöü](?=[^aıoueiöü]*$)/);
    return m ? 'aıou'.indexOf(m[0]) >= 0 : true;
  }

  var mctx = document.createElement('canvas').getContext('2d');
  function measure(str, size, weight) { mctx.font = ui.font(size, weight || 800); return mctx.measureText(str).width; }
  function wrapLines(text, size, maxW) {
    mctx.font = ui.font(size, 800);
    var words = String(text).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (cur && mctx.measureText(t).width > maxW) { lines.push(cur); cur = words[i]; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function fitText(text, maxW, sizes, maxLines) {
    var r = null;
    for (var i = 0; i < sizes.length; i++) {
      r = { lines: wrapLines(text, sizes[i], maxW), size: sizes[i] };
      if (r.lines.length <= maxLines) {
        var lastShort = r.lines.length > 1 && Array.from(r.lines[r.lines.length - 1]).length < 5;
        if (!lastShort || i === sizes.length - 1) return r;
      }
    }
    return r;
  }

  // Metin sprite önbelleği: aynı yazıyı her karede yeniden çizmemek için
  var sprC = new Map();
  function spr(str, size, color, o) {
    o = o || {};
    var weight = o.weight || 800;
    var stroke = o.stroke === undefined ? 'rgba(0,0,0,0.85)' : o.stroke;
    var key = str + '|' + size + '|' + color + '|' + weight + '|' + stroke + '|' + (o.sw || '');
    var c = sprC.get(key);
    if (c) return c;
    if (sprC.size > 900) sprC.clear();
    c = document.createElement('canvas');
    var cx = c.getContext('2d');
    var font = ui.font(size, weight);
    cx.font = font;
    var sw = stroke ? (o.sw || Math.max(3, size * 0.15)) : 0;
    c.width = Math.max(2, Math.ceil(cx.measureText(str).width + sw * 2 + 6));
    c.height = Math.max(2, Math.ceil(size * 1.42 + sw * 2));
    cx.font = font; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    var tx = c.width / 2, ty = c.height / 2 + size * 0.05;
    if (stroke) { cx.lineJoin = 'round'; cx.lineWidth = sw; cx.strokeStyle = stroke; cx.strokeText(str, tx, ty); }
    cx.fillStyle = color; cx.fillText(str, tx, ty);
    sprC.set(key, c);
    return c;
  }
  // Önbellekli yazı çiz. o: {align, maxW, scale, alpha, stroke, weight}. Çizilen genişliği döndürür.
  function txt(ctx, str, x, y, size, color, o) {
    o = o || {};
    if (str === '' || str == null) return 0;
    var c = spr(String(str), size, color, o);
    var k = o.scale || 1;
    if (o.maxW && c.width * k > o.maxW) k = o.maxW / c.width;
    var dw = c.width * k, dh = c.height * k;
    var ax = o.align === 'left' ? x : o.align === 'right' ? x - dw : x - dw / 2;
    if (o.alpha != null) {
      var ga = ctx.globalAlpha; ctx.globalAlpha = ga * clamp(o.alpha, 0, 1);
      ctx.drawImage(c, ax, y - dh / 2, dw, dh); ctx.globalAlpha = ga;
    } else ctx.drawImage(c, ax, y - dh / 2, dw, dh);
    return dw;
  }
  function emo(ctx, e, x, y, size, alpha) { ctx.fillStyle = '#000'; ui.emoji(ctx, e, x, y, size, alpha); }
  function pill(ctx, x, y, w, h, fill, border, lw) {
    ui.roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = fill; ctx.fill();
    if (border) { ctx.lineWidth = lw || 3; ctx.strokeStyle = border; ctx.stroke(); }
  }
  function miniAv(ctx, u, x, y, r) {
    ctx.fillStyle = u.color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    emo(ctx, u.emoji, x, y + 1, r * 1.35);
  }

  function makeGlow(r, rgb, a) {
    var c = document.createElement('canvas'); c.width = c.height = r * 2;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    gr.addColorStop(0.35, 'rgba(' + rgb + ',' + (a * 0.45) + ')');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
    return c;
  }
  var GLOW_W = makeGlow(28, '255,236,190', 0.95);
  var GLOW_G = makeGlow(28, '255,196,40', 0.95);
  var GLOW_P = makeGlow(28, '255,110,210', 0.9);
  var GLOW_BIG = makeGlow(160, '255,230,150', 0.8);

  // ---------------------------------------------------------------------------
  // Arka plan (önceden çizilir) + dönen ışınlar
  // ---------------------------------------------------------------------------
  function makeBg(gold) {
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d');
    var gr = g.createLinearGradient(0, 0, 0, H);
    if (gold) { gr.addColorStop(0, '#2a1300'); gr.addColorStop(0.35, '#6e3800'); gr.addColorStop(0.68, '#3f1d00'); gr.addColorStop(1, '#0c0500'); }
    else { gr.addColorStop(0, '#140a3e'); gr.addColorStop(0.35, '#3d1680'); gr.addColorStop(0.68, '#2a0f60'); gr.addColorStop(1, '#07031a'); }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    var rg = g.createRadialGradient(W / 2, BOARD_CY, 40, W / 2, BOARD_CY, 780);
    rg.addColorStop(0, gold ? 'rgba(255,200,60,0.5)' : 'rgba(255,80,190,0.42)');
    rg.addColorStop(1, gold ? 'rgba(255,200,60,0)' : 'rgba(255,80,190,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    // nokta deseni
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (var y = 12, row = 0; y < 1300; y += 34, row++) {
      for (var x = (row % 2) * 17; x < W; x += 34) { g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); }
    }
    // sahne zemini (TikTok yorumlarının altı: koyu ve sade tut)
    var fy = 1302;
    var fg = g.createLinearGradient(0, fy, 0, H);
    fg.addColorStop(0, gold ? '#3e1e00' : '#25104f'); fg.addColorStop(1, '#040210');
    g.fillStyle = fg; g.fillRect(0, fy, W, H - fy);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2;
    for (var i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * 44, fy); g.lineTo(W / 2 + i * 240, H); g.stroke(); }
    for (var j = 1; j < 9; j++) { var yy = fy + Math.pow(j / 9, 1.7) * (H - fy); g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
    var eg = g.createLinearGradient(0, 0, W, 0);
    eg.addColorStop(0, 'rgba(76,201,240,0.0)'); eg.addColorStop(0.2, '#4cc9f0'); eg.addColorStop(0.5, gold ? '#ffd166' : '#ff4d8d'); eg.addColorStop(0.8, '#ffd166'); eg.addColorStop(1, 'rgba(255,209,102,0)');
    g.fillStyle = eg; g.fillRect(0, fy - 3, W, 6);
    // seyirci siluetleri
    g.fillStyle = 'rgba(3,1,12,0.9)';
    for (var r = 0; r < 3; r++) {
      var by = 1660 + r * 92;
      for (var k = -1; k < 15; k++) {
        var hx = (k + (r % 2) * 0.5) * 80 + Math.sin(k * 7.3 + r) * 10;
        g.beginPath(); g.arc(hx, by, 25 + (k * 13 + r * 7) % 6, 0, TAU); g.fill();
        ui.roundRect(g, hx - 46, by + 30, 92, 140, 40); g.fill();
      }
    }
    var vg = g.createRadialGradient(W / 2, H * 0.4, H * 0.22, W / 2, H * 0.4, H * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return c;
  }
  var BG = makeBg(false), BG_GOLD = makeBg(true);
  var RAYS = (function () {
    var s = 1700, c = document.createElement('canvas'); c.width = c.height = s;
    var g = c.getContext('2d');
    var n = 20;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * TAU, a1 = (i + 0.5) / n * TAU;
      var gr = g.createRadialGradient(s / 2, s / 2, 60, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(s / 2, s / 2); g.arc(s / 2, s / 2, s / 2, a0, a1); g.closePath(); g.fill();
    }
    return c;
  })();
  var SPARKS = [];
  for (var si = 0; si < 26; si++) SPARKS.push({ x: LG.rand(20, W - 20), y: LG.rand(240, 1290), p: Math.random() * 10, s: LG.rand(8, 18) });

  // ---------------------------------------------------------------------------
  // Kart yüzleri (önceden çizilir)
  // ---------------------------------------------------------------------------
  var FPAD = 10;
  function makeFace(kind, gold) {
    var c = document.createElement('canvas'); c.width = TW + FPAD * 2; c.height = TH + FPAD * 2;
    var g = c.getContext('2d');
    g.translate(FPAD, FPAD);
    g.fillStyle = 'rgba(0,0,0,0.38)'; ui.roundRect(g, 3, 7, TW, TH, 20); g.fill();
    var gr = g.createLinearGradient(0, 0, 0, TH);
    if (kind === 'hidden') {
      if (gold) { gr.addColorStop(0, '#ffe27a'); gr.addColorStop(0.5, '#f2a900'); gr.addColorStop(1, '#a85f00'); }
      else { gr.addColorStop(0, '#4685ff'); gr.addColorStop(0.5, '#2153dc'); gr.addColorStop(1, '#0d268a'); }
    } else if (kind === 'missed') {
      gr.addColorStop(0, '#f6e3ea'); gr.addColorStop(1, '#d9aebd');
    } else if (gold) {
      gr.addColorStop(0, '#fffbe6'); gr.addColorStop(1, '#ffe08a');
    } else {
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#ffeec2');
    }
    ui.roundRect(g, 0, 0, TW, TH, 20); g.fillStyle = gr; g.fill();
    g.lineWidth = 5;
    g.strokeStyle = kind === 'hidden' ? (gold ? '#fff3b8' : '#a9cbff') : kind === 'missed' ? '#b07a8c' : (gold ? '#e0a100' : '#ff9f1c');
    g.stroke();
    g.save(); ui.roundRect(g, 0, 0, TW, TH, 20); g.clip();
    if (kind === 'hidden') {
      ui.roundRect(g, 8, 8, TW - 16, TH - 16, 14); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.28)'; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 16;
      for (var x = -TH; x < TW + TH; x += 44) { g.beginPath(); g.moveTo(x, TH); g.lineTo(x + TH, 0); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.ellipse(TW / 2, -TH * 0.18, TW * 0.72, TH * 0.6, 0, 0, TAU); g.fill();
    } else {
      // puan kutusu
      var pg = g.createLinearGradient(0, 0, 0, TH);
      if (kind === 'missed') { pg.addColorStop(0, '#a58594'); pg.addColorStop(1, '#7c5c6b'); }
      else if (gold) { pg.addColorStop(0, '#ffcf3a'); pg.addColorStop(1, '#d97a00'); }
      else { pg.addColorStop(0, '#ff9a2e'); pg.addColorStop(1, '#ff4f1f'); }
      ui.roundRect(g, TW - 112, 8, 104, TH - 16, 14); g.fillStyle = pg; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.22)'; ui.roundRect(g, TW - 106, 12, 92, (TH - 16) * 0.42, 10); g.fill();
      // numara rozeti
      g.beginPath(); g.arc(46, TH / 2, 31, 0, TAU);
      g.fillStyle = kind === 'missed' ? '#7c5c6b' : gold ? '#8a5200' : INK; g.fill();
      g.lineWidth = 4; g.strokeStyle = kind === 'missed' ? '#cfa9b8' : '#ffd166'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(TW / 2, -TH * 0.25, TW * 0.7, TH * 0.55, 0, 0, TAU); g.fill();
    }
    g.restore();
    return c;
  }
  var FACE = {
    hidden: makeFace('hidden', false), hiddenG: makeFace('hidden', true),
    front: makeFace('front', false), frontG: makeFace('front', true), missed: makeFace('missed', false),
  };

  // Ampuller (tabela çerçevesi)
  var BULBS = [];
  (function () {
    var x0 = FRAME.x + 18, x1 = FRAME.x + FRAME.w - 18, y0 = FRAME.y + 2, y1 = FRAME.y + FRAME.h - 2;
    var i, n;
    n = 21; for (i = 0; i < n; i++) BULBS.push({ x: lerp(x0, x1, i / (n - 1)), y: y0 });
    n = 8; for (i = 1; i < n; i++) BULBS.push({ x: x1 + 6, y: lerp(y0, y1, i / n) });
    n = 21; for (i = n - 1; i >= 0; i--) { var bx = lerp(x0, x1, i / (n - 1)); if (Math.abs(bx - W / 2) > 250) BULBS.push({ x: bx, y: y1 }); }
    n = 8; for (i = n - 1; i >= 1; i--) BULBS.push({ x: x0 - 6, y: lerp(y0, y1, i / n) });
  })();

  // ---------------------------------------------------------------------------
  // Eşleştirme
  // ---------------------------------------------------------------------------
  var SHORT_SUF = {};
  ['lar', 'ler', 'i', 'u', 'yi', 'yu', 'si', 'su', 'da', 'de', 'ta', 'te', 'dan', 'den', 'tan', 'ten', 'in', 'un', 'nin', 'nun',
    'im', 'um', 'imiz', 'umuz', 'li', 'lu', 'a', 'e', 'ya', 'ye', 'lari', 'leri', 'cim', 'cum'].forEach(function (s) { SHORT_SUF[s] = 1; });
  var GREET = {};
  ['selam', 'selamlar', 'sa', 'as', 'slm', 'mrb', 'merhaba', 'merhabalar', 'hello', 'hi', 'hey', 'iyi yayinlar', 'kolay gelsin abla',
    'selamun aleykum', 'aleykum selam', 'gunaydin', 'iyi aksamlar', 'hosgeldin', 'naber', 'ilk', 'ilk!'].forEach(function (s) { GREET[s] = 1; });

  function score1(g, k) {
    if (!g || !k) return 0;
    if (g === k) return 1000 + k.length;
    if (k.length >= 4) {
      if (g.length > k.length && g.indexOf(k) === 0 && g.length - k.length <= 8) return 500 + k.length;
      if (g.length >= 4 && g.length < k.length && k.indexOf(g) === 0 && g.length >= k.length * 0.6) return 300 + g.length;
    } else if (g.length > k.length && g.indexOf(k) === 0 && SHORT_SUF[g.slice(k.length)]) return 450 + k.length;
    return 0;
  }
  // Yorumdan parçalar: tamamı (bitişik), kelimeler, ikili ve üçlü kelime grupları
  function fragments(norm) {
    var toks = norm.replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean).slice(0, 7);
    var out = [];
    var whole = toks.join('');
    if (whole && whole.length <= 32) out.push(whole);
    for (var i = 0; i < toks.length; i++) {
      out.push(toks[i]);
      if (i + 1 < toks.length) out.push(toks[i] + toks[i + 1]);
      if (i + 2 < toks.length) out.push(toks[i] + toks[i + 1] + toks[i + 2]);
    }
    return out;
  }
  function findMatch(norm) {
    if (!cur) return null;
    var frs = fragments(norm);
    var best = null, bestS = 0;
    for (var ti = 0; ti < cur.tiles.length; ti++) {
      var t = cur.tiles[ti];
      for (var ki = 0; ki < t.keys.length; ki++) {
        for (var fi = 0; fi < frs.length; fi++) {
          var s = score1(frs[fi], t.keys[ki]);
          // eşitlikte gizli kartı tercih et
          if (s > bestS || (s && s === bestS && best && best.revealed && !t.revealed)) { bestS = s; best = t; }
        }
      }
    }
    return best;
  }

  // ---------------------------------------------------------------------------
  // Durum
  // ---------------------------------------------------------------------------
  var phase = 'roundIntro', phaseT = 0;
  var round = 0, qIndex = 0;
  var cur = null;            // aktif soru
  var board = new LG.Board();
  var roundUsers = new Set();
  var roundFound = 0, roundTotal = 0;
  var goldQueue = 0;         // sıradaki altın soru sayısı
  var pendingTime = 0;       // soru yokken gelen +süre hediyeleri
  var pendingLetters = [];   // soru yokken gelen ipucu hediyeleri (kullanıcılar)
  var giftHintQ = [], giftHintCD = 0;
  var lastGiftHint = new Map();
  var likeVal = 0, likeTarget = LIKE_BASE, likeAcc = 0, likeRate = 0, likeRateT = 0, likeFlash = 0;
  var combo = 0, lastFindAt = -99;
  var lbFlash = new Map();
  var podium = null;
  var timers = [];
  var counterBump = 0, remainBump = 0, headBump = 0;

  function setPhase(p) { phase = p; phaseT = 0; }
  function later(sec, fn) { timers.push({ t: sec, fn: fn }); }

  // Tekrarsız soru torbası (yayınlar arasında hatırlanır)
  function nextQuestionData() {
    var n = D.questions.length;
    var bag = LG.store.get('halk:bag', null);
    if (!Array.isArray(bag) || !bag.every(function (v) { return v === (v | 0) && v >= 0 && v < n; })) bag = [];
    if (!bag.length) { for (var i = 0; i < n; i++) bag.push(i); LG.shuffle(bag); }
    var idx = bag.shift();
    LG.store.set('halk:bag', bag);
    return D.questions[idx];
  }

  function buildTile(a, rank) {
    var label = a[0];
    var syn = String(a[2] || '').split('|');
    var keys = [], seen = {};
    [label].concat(syn).forEach(function (k) { var c = compact(k); if (c && !seen[c]) { seen[c] = 1; keys.push(c); } });
    var up = trUp(label);
    var chars = Array.from(up);
    var nLetters = chars.filter(isLetter).length;
    return {
      rank: rank, label: label, up: up, chars: chars, nLetters: nLetters, keys: keys, syn: syn, pts: a[1],
      revealed: false, missed: false, by: null, byT: 0, knowers: [], knowSet: new Set(), knowN: 0,
      shown: 0, showLen: false, hintStr: '', cap: Math.max(1, nLetters - 2),
      flipT: -1, shineT: -1, hintT: -1, enterT: -0.12 * rank - 0.1, tease: 0, lastKnowPop: 0,
      x: TCOL[rank <= 3 ? 0 : 1], y: TROW[(rank - 1) % 3],
    };
  }
  function hintText(t) {
    if (!t.shown && !t.showLen) return '';
    var out = [], li = 0;
    for (var i = 0; i < t.chars.length; i++) {
      var ch = t.chars[i];
      if (!isLetter(ch)) { if (t.showLen && (ch === ' ' || ch === '-')) out.push(ch === ' ' ? ' ' : '-'); continue; }
      if (li < t.shown) out.push(ch);
      else if (t.showLen) out.push('_');
      else { out.push('…'); break; }
      li++;
    }
    return t.showLen ? out.join(' ').replace(/ {3}/g, '   ') : out.join('');
  }
  function refreshHint(t, flash) {
    var s = hintText(t);
    if (s !== t.hintStr) { t.hintStr = s; if (flash) t.hintT = 0; }
  }

  // ---------------------------------------------------------------------------
  // Tur / soru akışı
  // ---------------------------------------------------------------------------
  function newRound() {
    round++; qIndex = 0;
    board = new LG.Board();
    roundUsers = new Set(); roundFound = 0; roundTotal = 0;
    lbFlash.clear();
    timers.length = 0;
    cur = null; podium = null;
    setPhase('roundIntro');
    LG.music.play('quiz'); LG.music.setTempo(1);
    LG.sfx('whoosh');
    headBump = 1;
  }

  function startQuestion() {
    timers.length = 0;
    qIndex++;
    if (qIndex > Q_PER_ROUND) { startPodium(); return; }
    var q = nextQuestionData();
    var tiles = [];
    for (var i = 0; i < q.a.length && i < 6; i++) tiles.push(buildTile(q.a[i], i + 1));
    var golden = false;
    if (goldQueue > 0) { goldQueue--; golden = true; }
    var fit = fitText(q.q, TIMER.x - TIMER.r - 20 - (CARD.x + 150), [56, 52, 48, 44, 40, 36], 3);
    cur = {
      q: q, tiles: tiles, golden: golden, mult: golden ? 2 : 1,
      timeLeft: Q_TIME + pendingTime, timeMax: Q_TIME + pendingTime, elapsed: 0, hintLevel: 0,
      guesses: 0, guessers: new Set(), wrong: new Map(), hot: null, found: 0, fastest: null,
      lines: fit.lines, size: fit.size, lastTick: 99,
    };
    pendingTime = 0;
    roundTotal += tiles.length;
    combo = 0; lastFindAt = -99;
    setPhase('intro');
    LG.music.play('quiz'); LG.music.setTempo(1);
    LG.sfx('whoosh'); later(0.25, function () { LG.sfx('bell'); });
    headBump = 1;
    if (golden) {
      later(0.4, function () {
        LG.sfx('mega'); ui.flash('#ffd166', 0.35); ui.shake(10, 0.4);
        ui.burst(W / 2, CARD.y + CARD.h / 2, { count: 90, speed: 900, colors: ['#ffd166', '#fff3b0', '#ffb703', '#ffffff'] });
        announce('⭐ ALTIN SORU! ⭐', { sub: 'Bu soruda tüm puanlar x2', color: '#ffd166', bg: '#8a5200', dur: 2.4 });
      });
    }
    // bekleyen ipucu hediyeleri
    if (pendingLetters.length) {
      var pl = pendingLetters.slice(); pendingLetters.length = 0;
      later(INTRO_T + 0.3, function () { pl.forEach(function (u) { giftHintQ.push(u); }); });
    }
  }

  function startPlay() {
    setPhase('play');
    LG.sfx('go');
  }

  function remainingTiles() { return cur ? cur.tiles.filter(function (t) { return !t.revealed; }) : []; }

  function timeHint(level) {
    if (!cur) return;
    cur.hintLevel = Math.max(cur.hintLevel, level);
    var hidden = remainingTiles();
    if (!hidden.length) return;
    hidden.forEach(function (t, i) {
      later(i * 0.12, function () {
        if (t.revealed) return;
        if (level >= 1) t.shown = Math.max(t.shown, 1);
        if (level >= 2) t.showLen = true;
        refreshHint(t, true);
        LG.sfx('pop');
      });
    });
    LG.sfx('zap');
    if (level === 1) announce('💡 İPUCU: İlk harfler açıldı!', { sub: 'Kalan ' + hidden.length + ' cevap · ' + Math.ceil(cur.timeLeft) + ' saniye var', color: '#ffffff', bg: '#2153dc', dur: 2.2 });
    else announce('💡 İPUCU: Harf sayıları göründü!', { sub: 'Son ' + Math.ceil(cur.timeLeft) + ' saniye, hadi!', color: '#ffffff', bg: '#2153dc', dur: 2.2 });
  }

  // Tek harf ipucu: mode 'top' (en popüler gizli cevap) ya da 'random'
  function letterHint(mode) {
    if (!cur) return null;
    var cand = cur.tiles.filter(function (t) { return !t.revealed && t.shown < t.cap; });
    if (!cand.length) return null;
    var t;
    if (mode === 'top') {
      var noFirst = cand.filter(function (x) { return x.shown === 0; });
      t = (noFirst.length ? noFirst : cand)[0];
    } else {
      var minS = Math.min.apply(null, cand.map(function (x) { return x.shown / x.nLetters; }));
      var low = cand.filter(function (x) { return x.shown / x.nLetters <= minS + 0.2; });
      t = LG.pick(low);
    }
    t.shown++;
    refreshHint(t, true);
    LG.sfx('zap');
    ui.burst(t.x + TW / 2, t.y + TH / 2, { count: 26, speed: 420, colors: ['#ffffff', '#a9cbff', '#ffd166'], size: 10 });
    return t;
  }

  function timeUp() { startReveal('time'); }

  function startReveal(reason) {
    if (!cur) return;
    setPhase('reveal');
    timers.length = 0;
    LG.music.stop();
    var hidden = remainingTiles().sort(function (a, b) { return b.rank - a.rank; });
    if (!hidden.length) { toPause(); return; }
    if (reason === 'time') { LG.sfx('honk'); announce('⏰ SÜRE DOLDU!', { sub: 'Bakalım halk ne demiş...', color: '#ffffff', bg: '#d6284f', dur: 1.5 }); }
    else { LG.sfx('whoosh'); announce('🎙️ Cevaplar açılıyor!', { sub: 'Bakalım halk ne demiş...', color: '#ffffff', bg: '#7b2cbf', dur: 1.5 }); }
    var t0 = 1.7, step = 1.2;
    hidden.forEach(function (t, i) {
      var at = t0 + i * step;
      later(at - 0.75, function () { t.tease = 0.75; });
      for (var k = 0; k < 7; k++) later(at - 0.72 + k * 0.1, function () { LG.sfx('drum'); });
      later(at, function () { revealMissed(t, i === hidden.length - 1); });
    });
    var end = t0 + (hidden.length - 1) * step;
    later(end + 0.7, function () {
      LG.sfx('lose'); later(0.7, function () { LG.sfx('laugh'); });
      announce('😅 Bunları kimse bulamadı!', { sub: hidden.length === 1 ? 'Bir dahaki soruya!' : hidden.length + ' cevap tabelada kaldı', color: '#ffffff', bg: '#8a3b52', dur: 2.0 });
    });
    later(end + 2.7, toPause);
  }

  function revealMissed(t, last) {
    t.revealed = true; t.missed = true; t.flipT = 0; t.tease = 0;
    LG.sfx('boing');
    ui.burst(t.x + TW / 2, t.y + TH / 2, { count: last ? 30 : 16, speed: 380, colors: ['#d9aebd', '#ffffff', '#b07a8c'], size: 10 });
    if (t.rank === 1) ui.shake(8, 0.3);
  }

  function boardComplete() {
    setPhase('complete');
    timers.length = 0;
    LG.music.stop();
    LG.sfx('fanfare'); later(0.5, function () { LG.sfx('win'); }); later(0.9, function () { LG.sfx('clap'); });
    ui.rain({ count: 160 }); ui.flash('#ffffff', 0.3); ui.shake(14, 0.5);
    announce('🎉 TABELA TAMAM!', { sub: 'Hepsini buldunuz, helal olsun!', color: '#ffd166', bg: '#1a9e6e', dur: 2.6 });
  }

  function toPause() {
    if (!cur) return;
    setPhase('pause');
    var n = cur.tiles.length, f = cur.found;
    var sub = cur.guesses + ' tahmin denendi';
    if (cur.fastest) sub = '⚡ En hızlı: ' + cur.fastest.name + ' · ' + sub;
    announce('✅ ' + f + '/' + n + ' cevap bulundu', { sub: sub, color: '#ffffff', bg: f >= n ? '#1a9e6e' : '#2153dc', dur: 2.6 });
  }

  function startPodium() {
    timers.length = 0;
    setPhase('podium');
    cur = null;
    var top = board.top(3).map(function (e) { return { user: e.user, score: e.score }; });
    podium = { top: top, users: roundUsers.size, found: roundFound, total: roundTotal };
    LG.music.play('party');
    LG.sfx('fanfare'); later(0.6, function () { LG.sfx('win'); });
    for (var i = 0; i < 4; i++) later(1 + i * 0.25, function () { LG.sfx('clap'); });
    ui.rain({ count: 220 });
    ui.shake(10, 0.4);
  }

  // ---------------------------------------------------------------------------
  // Puan ve bulma
  // ---------------------------------------------------------------------------
  function addScore(u, pts) {
    board.add(u, pts);
    roundUsers.add(u.id);
    lbFlash.set(u.id, LG.time);
  }

  function found(t, u) {
    t.revealed = true; t.by = u; t.byT = cur.elapsed; t.flipT = 0; t.shineT = -1; t.tease = 0;
    var pts = t.pts * cur.mult;
    addScore(u, pts);
    cur.found++; roundFound++;
    remainBump = 1;
    if (!cur.fastest) cur.fastest = u;
    var cx = t.x + TW / 2, cy = t.y + TH / 2;
    LG.sfx('correct');
    later(0.28, function () { LG.sfx('coin'); });
    pops.push({ str: '+' + pts, x: t.x + TW - 60, y: t.y + 20, t: 0, life: 1.6, size: 78, color: cur.golden ? '#fff3b0' : '#ffd166', sub: u.name });
    if (pops.length > 20) pops.shift();
    ui.burst(cx, cy, { count: t.rank === 1 ? 70 : 40, speed: t.rank === 1 ? 800 : 560 });
    if (cur.golden) ui.burst(cx, cy, { count: 24, shape: 'emoji', emoji: '⭐', speed: 500, size: 14 });
    if (t.rank === 1) { ui.shake(10, 0.35); later(0.15, function () { LG.sfx('levelup'); }); }
    // kombo (topluluk): art arda hızlı bulunan cevaplar
    if (LG.time - lastFindAt < 6) combo++; else combo = 1;
    lastFindAt = LG.time;
    if (combo === 2) later(0.35, function () { LG.sfx('levelup'); });
    if (combo >= 3) {
      later(0.35, function () { LG.sfx('fanfare'); });
      announce('🔥 KOMBO x' + combo + '!', { sub: 'Tabela yanıyor!', color: '#ffd166', bg: '#d6284f', dur: 1.4, key: 'combo' });
    }
    feedPush(u, t.label, 'correct');
    if (remainingTiles().length === 0) later(0.75, boardComplete);
  }

  function alsoKnew(t, u) {
    t.knowSet.add(u.id);
    t.knowN++;
    t.knowers.push(u);
    if (t.knowers.length > 4) t.knowers.shift();
    var pts = LATE_PTS * cur.mult;
    addScore(u, pts);
    LG.sfx('pop');
    if (LG.time - t.lastKnowPop > 0.4) {
      t.lastKnowPop = LG.time;
      pops.push({ str: '+' + pts, x: t.x + TW - 60, y: t.y + 30, t: 0, life: 1.1, size: 44, color: '#7fffd4', sub: u.name + ' da bildi', small: true });
      if (pops.length > 20) pops.shift();
    }
    feedPush(u, t.label + ' (ben de bildim)', 'knew');
  }

  // ---------------------------------------------------------------------------
  // Olaylar
  // ---------------------------------------------------------------------------
  function guessLike(e) {
    if (e.flagged) return false;
    var n = e.norm || '';
    if (n.replace(/[^a-z]/g, '').length < 2) return false;
    if (GREET[n]) return false;
    if (n.split(' ').length > 4) return false;
    if (Array.from(String(e.text || '')).length > 30) return false;
    return true;
  }

  LG.on('chat', function (e) {
    var u = e.user;
    if (!u) return;
    var active = cur && (phase === 'play' || phase === 'intro');
    var t = (!e.flagged && cur) ? findMatch(e.norm || '') : null;
    if (active) {
      var gl = guessLike(e);
      if (t || gl) {
        cur.guesses++; counterBump = 1;
        if (!cur.guessers.has(u.id)) { cur.guessers.add(u.id); addScore(u, JOIN_PTS); }
      }
      if (t) {
        if (!t.revealed) { found(t, u); return; }
        if (!t.missed && t.by && t.by.id !== u.id && !t.knowSet.has(u.id)) { alsoKnew(t, u); return; }
        feedPush(u, trunc(e.text, 22), 'guess');
        return;
      }
      if (gl) {
        var k = compact(e.text);
        if (k.length >= 2) {
          var w = cur.wrong.get(k);
          if (!w) { w = { n: 0, text: trunc(String(e.text).trim(), 18) }; cur.wrong.set(k, w); }
          w.n++;
          if (w.n >= 3 && (!cur.hot || w.n > cur.hot.n)) cur.hot = w;
        }
        feedPush(u, trunc(e.text, 22), 'guess');
        return;
      }
    }
    if (e.flagged) return;
    if (GREET[e.norm] || e.isNew) { feedPush(u, 'Hoş geldin! 👋', 'info'); return; }
    if (guessLike(e)) feedPush(u, trunc(e.text, 22), 'guess');
  });

  LG.on('like', function (e) {
    likeVal += e.count; likeAcc += e.count;
    if (phase !== 'play') likeVal = Math.min(likeVal, likeTarget);
    if (Math.random() < 0.25) ui.float('', LIKEBAR.x + LG.rand(40, LIKEBAR.w - 40), LIKEBAR.y, { emoji: '❤️', size: 26, vy: -90, life: 1 });
  });

  function likeHintFire() {
    likeVal = 0; likeFlash = 1;
    var next = Math.round(Math.max(LIKE_BASE, likeRate * 22) / 10) * 10;
    likeTarget = Math.min(20000, next);
    var t = letterHint('top');
    LG.sfx('heart'); later(0.2, function () { LG.sfx('levelup'); });
    ui.burst(LIKEBAR.x + LIKEBAR.w / 2, LIKEBAR.y + 26, { count: 30, shape: 'emoji', emoji: '💖', speed: 520, size: 14 });
    if (t) announce('❤️ Beğenileriniz bir ipucu açtı!', { sub: t.rank + '. cevap: ' + t.hintStr, color: '#ffffff', bg: '#d61f69', dur: 2.2 });
    else announce('❤️ Beğeniler için teşekkürler!', { sub: 'Tabelada açılacak harf kalmadı', color: '#ffffff', bg: '#d61f69', dur: 1.8 });
  }

  LG.on('gift', function (e) {
    var u = e.user, g = e.gift;
    if (!u || !g) return;
    var tier = g.tier || 1;
    var label = g.name + (g.count > 1 ? ' x' + g.count : '');
    roundUsers.add(u.id);
    if (tier <= 1) {
      feedPush(u, label + ' · teşekkürler 💖', 'gift');
      ui.float('', LG.rand(200, 880), LG.rand(560, 880), { emoji: '💖', size: 56, vy: -140, life: 1.6 });
      LG.sfx('heart');
      return;
    }
    var big = ui.spotlightAllowed(u, tier);
    var effects = [];
    // İPUCU HEDİYESİ (2+): kişi başı 5 sn'de bir harf
    var lastH = lastGiftHint.get(u.id) || -99;
    if (LG.time - lastH > 5) {
      lastGiftHint.set(u.id, LG.time);
      if (cur && (phase === 'play' || phase === 'intro')) giftHintQ.push(u);
      else if (pendingLetters.length < 6) pendingLetters.push(u);
      effects.push('💡 İPUCU HEDİYESİ: herkese bir harf!');
    }
    if (tier >= 4) {
      if (cur && (phase === 'play' || phase === 'intro')) {
        cur.timeLeft = Math.min(MAX_LEFT, cur.timeLeft + 20); cur.timeMax = Math.max(cur.timeMax, cur.timeLeft);
        later(0.4, function () { pops.push({ str: '+20 sn', x: TIMER.x, y: TIMER.y - 30, t: 0, life: 1.6, size: 56, color: '#7fffd4' }); });
      } else pendingTime = Math.min(40, pendingTime + 20);
      effects.unshift('⏱️ +20 SANİYE herkese!');
    }
    if (tier >= 5) {
      goldQueue = Math.min(3, goldQueue + 1);
      effects.unshift('⭐ ALTIN SORU: sıradaki soru x2 puan!');
    }
    feedPush(u, label + ' · teşekkürler 💖', 'gift');
    giftBanner(u, g, effects[0] || 'Çok teşekkürler! 💖', big ? tier : Math.min(tier, 2));
  });

  LG.on('follow', function (e) {
    if (!e.user) return;
    likeVal = Math.min(likeTarget, likeVal + 30);
    feedPush(e.user, 'takip etti · sağ ol! ➕', 'info');
    LG.sfx('heart');
  });
  LG.on('share', function (e) {
    if (!e.user) return;
    likeVal = Math.min(likeTarget, likeVal + 50);
    feedPush(e.user, 'paylaştı · çok yaşa! ↗️', 'info');
    LG.sfx('join');
  });

  // ---------------------------------------------------------------------------
  // Sunucu kısayolları
  // ---------------------------------------------------------------------------
  LG.onKey('n', 'Sıradaki soruya geç (tur bittiyse yeni tur)', function () {
    if (phase === 'podium') { newRound(); return; }
    startQuestion();
  });
  LG.onKey('b', 'Cevapların hepsini şimdi aç', function () {
    if (cur && (phase === 'play' || phase === 'intro')) startReveal('host');
  });
  LG.onKey('t', 'Süreye +15 saniye ekle', function () {
    if (cur && (phase === 'play' || phase === 'intro')) {
      cur.timeLeft = Math.min(MAX_LEFT, cur.timeLeft + 15); cur.timeMax = Math.max(cur.timeMax, cur.timeLeft);
      LG.sfx('bell');
      pops.push({ str: '+15 sn', x: TIMER.x, y: TIMER.y - 30, t: 0, life: 1.6, size: 56, color: '#7fffd4' });
      announce('⏱️ +15 saniye!', { sub: 'Sunucudan ek süre', color: '#ffffff', bg: '#1a9e6e', dur: 1.4 });
    }
  });
  LG.onKey('i', 'Bir ipucu ver (en üstteki gizli cevap)', function () {
    if (cur && (phase === 'play' || phase === 'intro')) {
      var t = letterHint('top');
      if (t) announce('💡 Sunucudan ipucu!', { sub: t.rank + '. cevap: ' + t.hintStr, color: '#ffffff', bg: '#2153dc', dur: 1.8 });
    }
  });
  LG.onKey('r', 'Yeni tur başlat (puanlar sıfırlanır)', function () { newRound(); });

  // ---------------------------------------------------------------------------
  // Duyurular, hediye şeridi, akış, puan patlamaları
  // ---------------------------------------------------------------------------
  var anns = [], ann = null;
  function announce(text, o) {
    o = o || {};
    if (o.key && ann && ann.key === o.key) { ann.text = text; ann.sub = o.sub || ''; ann.t = Math.min(ann.t, 0.3); return; }
    for (var i = 0; i < anns.length; i++) if (o.key && anns[i].key === o.key) { anns[i].text = text; return; }
    if (anns.length >= 3) anns.shift();
    anns.push({ text: text, sub: o.sub || '', color: o.color || '#ffd166', bg: o.bg || '#7b2cbf', dur: o.dur || 2, t: 0, key: o.key });
  }

  var gbs = [], gb = null;
  function giftBanner(u, g, line, tier) {
    for (var i = 0; i < gbs.length; i++) {
      if (gbs[i].user === u && gbs[i].gname === g.name) { gbs[i].count += g.count; return; }
    }
    if (gb && gb.user === u && gb.gname === g.name && gb.t < gb.dur - 0.8) { gb.count += g.count; gb.t = Math.min(gb.t, 0.6); return; }
    if (gbs.length >= 6) gbs.shift();
    gbs.push({ user: u, gname: g.name, count: g.count, emoji: LG.giftEmoji(g), line: line, tier: tier, t: 0, dur: tier >= 5 ? 4.6 : tier >= 4 ? 3.2 : 2.4 });
  }
  function startGiftBanner(b) {
    var bx = W / 2, by = HEAD.y + 56;
    if (b.tier >= 5) {
      LG.sfx('mega'); ui.rain({ count: 170, colors: ['#ffd166', '#fff3b0', '#ffb703', '#ffffff', '#ff4d8d'] });
      ui.flash('#fff3b0', 0.4); ui.shake(16, 0.6);
    } else if (b.tier >= 4) {
      LG.sfx('fanfare'); ui.burst(bx, by + 40, { count: 110, speed: 900 });
    } else if (b.tier >= 3) {
      LG.sfx('levelup'); ui.burst(bx, by + 40, { count: 60, speed: 650 });
    } else {
      LG.sfx('coin'); ui.burst(bx, by + 40, { count: 30, speed: 500 });
    }
  }

  // Canlı akış (sağ alt): isim çipleri
  var CH_H = 38, CH_GAP = 4, FEED_ROWS = 4;
  var feedQ = [], feedPQ = [], feed = [], feedCD = 0;
  function feedPush(u, text, kind) {
    var it = { u: u, text: text, kind: kind };
    if (kind === 'guess') { feedQ.push(it); if (feedQ.length > 8) feedQ.shift(); }
    else { feedPQ.push(it); if (feedPQ.length > 10) feedPQ.shift(); }
  }
  var KIND = {
    guess: { bg: 'rgba(255,255,255,0.13)', text: '#ffffff', icon: '' },
    correct: { bg: 'rgba(22,170,110,0.95)', text: '#ffffff', icon: '✅ ' },
    knew: { bg: 'rgba(30,140,190,0.85)', text: '#ffffff', icon: '👍 ' },
    gift: { bg: 'rgba(255,190,40,0.95)', text: '#3a2200', icon: '🎁 ' },
    info: { bg: 'rgba(123,92,255,0.8)', text: '#ffffff', icon: '' },
  };
  function makeChip(it) {
    var k = KIND[it.kind] || KIND.guess;
    var maxW = FEED.w - 24;
    var c = document.createElement('canvas'); c.height = CH_H;
    var g = c.getContext('2d');
    var nameFont = ui.font(24, 900), textFont = ui.font(24, 700);
    var name = trunc(it.u.name, 14);
    g.font = nameFont; var nw = g.measureText(name).width;
    var body = k.icon + it.text;
    g.font = textFont; var bw = g.measureText(body).width;
    var w = Math.min(maxW, Math.ceil(44 + nw + 12 + bw + 18));
    c.width = w;
    g = c.getContext('2d');
    ui.roundRect(g, 0, 0, w, CH_H, CH_H / 2); g.fillStyle = k.bg; g.fill();
    g.fillStyle = it.u.color; g.beginPath(); g.arc(CH_H / 2, CH_H / 2, CH_H / 2 - 4, 0, TAU); g.fill();
    g.font = '20px ' + ui.EMOJI_FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
    g.fillText(it.u.emoji, CH_H / 2, CH_H / 2 + 1);
    g.textAlign = 'left';
    g.font = nameFont;
    g.fillStyle = it.kind === 'guess' ? 'hsl(' + it.u.hue + ',95%,78%)' : k.text;
    g.fillText(name, 42, CH_H / 2 + 1);
    g.font = textFont; g.fillStyle = k.text;
    g.save(); g.beginPath(); g.rect(0, 0, w - 14, CH_H); g.clip();
    g.fillText(body, 42 + nw + 12, CH_H / 2 + 1);
    g.restore();
    return c;
  }
  function updateFeed(dt) {
    feedCD -= dt;
    if (feedCD <= 0 && (feedPQ.length || feedQ.length)) {
      var it = feedPQ.length ? feedPQ.shift() : feedQ.shift();
      it.c = makeChip(it); it.slot = 0; it.t = 0; it.y = slotY(0) + CH_H;
      for (var i = 0; i < feed.length; i++) feed[i].slot++;
      feed.unshift(it);
      if (feed.length > FEED_ROWS + 1) feed.length = FEED_ROWS + 1;
      feedCD = (feedQ.length + feedPQ.length) > 4 ? 0.13 : 0.24;
    }
    for (var j = 0; j < feed.length; j++) {
      var f = feed[j]; f.t += dt;
      f.y += (slotY(f.slot) - f.y) * Math.min(1, dt * 14);
    }
  }
  function slotY(slot) { return FEED.y + FEED.h - 12 - CH_H - slot * (CH_H + CH_GAP); }

  var pops = [];

  // ---------------------------------------------------------------------------
  // Güncelleme
  // ---------------------------------------------------------------------------
  function update(dt) {
    phaseT += dt;
    // zamanlayıcılar
    if (timers.length) {
      var due = [];
      for (var i = 0; i < timers.length; i++) { timers[i].t -= dt; if (timers[i].t <= 0) due.push(timers[i]); }
      if (due.length) {
        timers = timers.filter(function (x) { return x.t > 0; });
        for (var d = 0; d < due.length; d++) { try { due[d].fn(); } catch (err) { console.error(err); } }
      }
    }
    // beğeni hızı (dakikadaki beğeniye göre hedef)
    likeRateT += dt;
    if (likeRateT >= 1) { likeRate = likeRate * 0.75 + (likeAcc / likeRateT) * 0.25; likeAcc = 0; likeRateT = 0; }
    if (likeFlash > 0) likeFlash = Math.max(0, likeFlash - dt * 1.5);
    counterBump = Math.max(0, counterBump - dt * 4);
    remainBump = Math.max(0, remainBump - dt * 3);
    headBump = Math.max(0, headBump - dt * 2.5);

    switch (phase) {
      case 'roundIntro': {
        var left = RINTRO_T - phaseT;
        var sec = Math.ceil(left);
        if (sec !== update._rs && sec <= 3 && sec >= 1) { update._rs = sec; LG.sfx('countdown'); }
        if (left <= 0) { update._rs = 0; startQuestion(); }
        break;
      }
      case 'intro':
        if (phaseT >= INTRO_T) startPlay();
        break;
      case 'play': {
        cur.timeLeft -= dt; cur.elapsed += dt;
        if (cur.hintLevel < 1 && cur.elapsed >= HINT1_AT) timeHint(1);
        else if (cur.hintLevel < 2 && cur.elapsed >= HINT2_AT) timeHint(2);
        var s = Math.ceil(cur.timeLeft);
        if (s !== cur.lastTick && s <= 10 && s >= 1) {
          cur.lastTick = s;
          LG.sfx(s <= 3 ? 'countdown' : 'tick');
          if (s === 10) LG.music.setTempo(1.3);
        }
        if (likeVal >= likeTarget) likeHintFire();
        if (cur.timeLeft <= 0) { cur.timeLeft = 0; timeUp(); }
        break;
      }
      case 'complete':
        if (phaseT >= COMPLETE_T) toPause();
        break;
      case 'pause':
        if (phaseT >= PAUSE_T) { if (qIndex >= Q_PER_ROUND) startPodium(); else startQuestion(); }
        break;
      case 'podium':
        if (phaseT >= PODIUM_T) newRound();
        break;
    }

    // hediye ipuçları sırayla açılır
    giftHintCD -= dt;
    if (giftHintQ.length && giftHintCD <= 0 && cur && (phase === 'play' || phase === 'intro')) {
      var gu = giftHintQ.shift();
      var gt = letterHint('random');
      giftHintCD = 0.7;
      if (gt) pops.push({ str: '💡 ' + trunc(gu.name, 12), x: gt.x + TW / 2, y: gt.y + 10, t: 0, life: 1.4, size: 34, color: '#fff3b0', small: true });
    }

    // kartlar
    if (cur) {
      for (var ti = 0; ti < cur.tiles.length; ti++) {
        var t = cur.tiles[ti];
        if (t.enterT < 1) t.enterT += dt * 2.2;
        if (t.flipT >= 0) {
          t.flipT += dt;
          if (t.flipT >= FLIP_T) { t.flipT = -1; t.shineT = 0; }
        }
        if (t.shineT >= 0) { t.shineT += dt; if (t.shineT > 0.9) t.shineT = -1; }
        if (t.hintT >= 0) { t.hintT += dt; if (t.hintT > 0.7) t.hintT = -1; }
        if (t.tease > 0) t.tease = Math.max(0, t.tease - dt);
      }
    }

    // duyurular
    if (!ann && anns.length) { ann = anns.shift(); ann.t = 0; }
    if (ann) { ann.t += dt * (anns.length ? 1.5 : 1); if (ann.t >= ann.dur) ann = null; }
    if (!gb && gbs.length) { gb = gbs.shift(); gb.t = 0; startGiftBanner(gb); }
    if (gb) { gb.t += dt * (gbs.length > 2 ? 1.6 : 1); if (gb.t >= gb.dur) gb = null; }

    updateFeed(dt);
    for (var p = pops.length - 1; p >= 0; p--) { pops[p].t += dt; if (pops[p].t >= pops[p].life) pops.splice(p, 1); }
  }

  // ---------------------------------------------------------------------------
  // Çizim
  // ---------------------------------------------------------------------------
  function isGold() { return !!(cur && cur.golden && phase !== 'podium'); }

  function drawBackground(ctx, t) {
    var gold = isGold();
    ctx.drawImage(gold ? BG_GOLD : BG, 0, 0);
    // dönen ışınlar
    ctx.save();
    ctx.globalAlpha = gold ? 0.55 : 0.4;
    ctx.translate(W / 2, BOARD_CY); ctx.rotate(t * 0.06);
    ctx.drawImage(RAYS, -RAYS.width / 2, -RAYS.height / 2);
    ctx.restore();
    // sahne spotları
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 2; i++) {
      var ox = i === 0 ? 90 : W - 90, oy = 150;
      var a = Math.PI / 2 + (i === 0 ? -0.35 : 0.35) + Math.sin(t * 0.5 + i * 2.1) * 0.32;
      var len = 1300, spread = 0.13;
      var gr = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
      var col = gold ? '255,210,90' : (i === 0 ? '120,200,255' : '255,120,220');
      gr.addColorStop(0, 'rgba(' + col + ',0.20)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a - spread) * len, oy + Math.sin(a - spread) * len);
      ctx.lineTo(ox + Math.cos(a + spread) * len, oy + Math.sin(a + spread) * len);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // pırıltılar
    ctx.fillStyle = gold ? '#fff3b0' : '#ffffff';
    for (var s = 0; s < SPARKS.length; s++) {
      var sp = SPARKS[s];
      var v = Math.sin(t * 1.7 + sp.p);
      if (v < 0.55) continue;
      var k = (v - 0.55) / 0.45, r = sp.s * k;
      ctx.globalAlpha = k * 0.8;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y - r); ctx.lineTo(sp.x + r * 0.22, sp.y - r * 0.22); ctx.lineTo(sp.x + r, sp.y);
      ctx.lineTo(sp.x + r * 0.22, sp.y + r * 0.22); ctx.lineTo(sp.x, sp.y + r); ctx.lineTo(sp.x - r * 0.22, sp.y + r * 0.22);
      ctx.lineTo(sp.x - r, sp.y); ctx.lineTo(sp.x - r * 0.22, sp.y - r * 0.22); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHeader(ctx, t) {
    var gold = isGold();
    var y = HEAD.y + HEAD.h / 2;
    var pw = Math.min(196, HEAD.w * 0.24);
    // sol: soru sayacı
    var leftLabel = phase === 'podium' ? 'TUR SONU' : phase === 'roundIntro' ? 'TUR ' + round : 'SORU ' + Math.max(1, qIndex) + '/' + Q_PER_ROUND;
    var b = 1 + headBump * 0.12 * Math.sin(headBump * Math.PI);
    ctx.save(); ctx.translate(HEAD.x + pw / 2, y); ctx.scale(b, b);
    pill(ctx, -pw / 2, -27, pw, 54, gold ? '#8a5200' : '#7b2cbf', gold ? '#ffd166' : '#c9a7ff', 3);
    txt(ctx, leftLabel, 0, 1, 30, '#ffffff', { maxW: pw - 22 });
    ctx.restore();
    // sağ: tur / altın rozet
    var rx = HEAD.x + HEAD.w - pw;
    if (gold) {
      var gl = 0.5 + 0.5 * Math.sin(t * 6);
      ctx.drawImage(GLOW_G, rx + pw / 2 - 90, y - 50, 180, 100);
      pill(ctx, rx, y - 27, pw, 54, 'rgb(' + Math.round(240 + gl * 15) + ',' + Math.round(170 + gl * 40) + ',0)', '#fff3b0', 3);
      txt(ctx, '⭐ ALTIN x2', rx + pw / 2, y + 1, 28, '#3a2200', { maxW: pw - 20, stroke: false });
    } else if (goldQueue > 0 && phase !== 'podium') {
      pill(ctx, rx, y - 27, pw, 54, 'rgba(255,209,102,0.22)', '#ffd166', 3);
      txt(ctx, '⭐ Sıradaki x2', rx + pw / 2, y + 1, 26, '#ffd166', { maxW: pw - 20 });
    } else {
      pill(ctx, rx, y - 27, pw, 54, 'rgba(0,0,0,0.35)', 'rgba(255,255,255,0.3)', 3);
      txt(ctx, '🏁 TUR ' + Math.max(1, round), rx + pw / 2, y + 1, 28, '#ffffff', { maxW: pw - 20 });
    }
    // başlık
    var tw = HEAD.w - pw * 2 - 30;
    var wob = Math.sin(t * 2.2) * 0.012 + 1;
    ctx.save(); ctx.translate(HEAD.x + HEAD.w / 2, y + 2); ctx.scale(wob, wob);
    ctx.drawImage(GLOW_P, -tw * 0.45, -60, tw * 0.9, 120);
    var w1 = txt(ctx, 'HALK NE DEDİ?', -26, 0, 60, gold ? '#ffe9a0' : '#ffd166', { maxW: tw - 70, sw: 10, stroke: '#3a0f5c' });
    emo(ctx, '🗣️', -26 + w1 / 2 + 36, -2, 56);
    ctx.restore();
  }

  function drawCard(ctx, t) {
    var gold = isGold();
    var slide = 0;
    if (phase === 'intro') slide = 1 - ease.outBack(Math.min(1, phaseT / 0.55));
    ctx.save();
    ctx.translate(slide * 260, 0);
    ctx.globalAlpha = 1 - slide * 0.6;
    // gölge + kart
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ui.roundRect(ctx, CARD.x + 4, CARD.y + 8, CARD.w, CARD.h, 30); ctx.fill();
    var gr = ctx.createLinearGradient(0, CARD.y, 0, CARD.y + CARD.h);
    if (gold) { gr.addColorStop(0, '#fffbe8'); gr.addColorStop(1, '#ffe39a'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#f1e8ff'); }
    ui.roundRect(ctx, CARD.x, CARD.y, CARD.w, CARD.h, 30); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = gold ? '#f2a900' : '#ff4d8d'; ctx.stroke();
    // kategori emojisi
    var ex = CARD.x + 80, ey = CARD.y + CARD.h / 2 - 8;
    var eg = ctx.createLinearGradient(ex, ey - 56, ex, ey + 56);
    eg.addColorStop(0, gold ? '#ffcf3a' : '#9b6bff'); eg.addColorStop(1, gold ? '#d97a00' : '#5a2bd6');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 54, 0, TAU); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    var eb = Math.sin(t * 2.5) * 3;
    if (cur) emo(ctx, cur.q.e, ex, ey + eb, 66);
    else emo(ctx, phase === 'podium' ? '🏆' : '🗣️', ex, ey + eb, 66);
    if (cur && cur.q.k) {
      pill(ctx, ex - 62, ey + 50, 124, 30, gold ? '#8a5200' : INK, null);
      txt(ctx, trUp(cur.q.k), ex, ey + 66, 18, '#ffffff', { maxW: 112, stroke: false });
    }
    // soru metni
    var tx0 = CARD.x + 150, tx1 = TIMER.x - TIMER.r - 18;
    var tcx = (tx0 + tx1) / 2, tmw = tx1 - tx0;
    if (cur) {
      var lh = cur.size * 1.12, n = cur.lines.length;
      var y0 = CARD.y + CARD.h / 2 - 16 - (n - 1) * lh / 2;
      for (var i = 0; i < n; i++) txt(ctx, cur.lines[i], tcx, y0 + i * lh, cur.size, INK, { maxW: tmw, stroke: false, weight: 900 });
      // kalan cevap rozeti
      var rem = remainingTiles().length;
      var rs = rem > 0 ? '🔒 ' + rem + ' cevap kaldı' : '✅ Hepsi bulundu!';
      if (phase === 'reveal' || phase === 'pause' || phase === 'complete') rs = '✅ ' + cur.found + '/' + cur.tiles.length + ' bulundu';
      var rb = 1 + remainBump * 0.15;
      ctx.save(); ctx.translate(tcx, CARD.y + CARD.h - 26); ctx.scale(rb, rb);
      var rw = Math.min(tmw, measure(rs, 24) + 36);
      pill(ctx, -rw / 2, -18, rw, 36, rem > 0 ? (gold ? '#8a5200' : '#ff4d8d') : '#1a9e6e', null);
      txt(ctx, rs, 0, 1, 24, '#ffffff', { maxW: rw - 16, stroke: false });
      ctx.restore();
    } else if (phase === 'podium') {
      txt(ctx, 'Tur bitti, işte şampiyonlar!', tcx, CARD.y + CARD.h / 2 - 20, 48, INK, { maxW: tmw, stroke: false, weight: 900 });
      txt(ctx, 'Az sonra yeni tur başlıyor 🎉', tcx, CARD.y + CARD.h / 2 + 36, 32, '#7b2cbf', { maxW: tmw, stroke: false });
    } else {
      txt(ctx, 'Halk ne dedi, sen bil!', tcx, CARD.y + CARD.h / 2 - 20, 50, INK, { maxW: tmw, stroke: false, weight: 900 });
      txt(ctx, 'Yorumlara tahminini yaz, tabelayı aç 💬', tcx, CARD.y + CARD.h / 2 + 36, 32, '#7b2cbf', { maxW: tmw, stroke: false });
    }
    ctx.restore();
    drawTimer(ctx, t);
  }

  function drawTimer(ctx, t) {
    var x = TIMER.x, y = TIMER.y, r = TIMER.r;
    var frac = 1, label = '', sub = 'sn';
    if (cur && (phase === 'play' || phase === 'intro')) {
      frac = cur.timeLeft / Math.max(1, cur.timeMax);
      label = String(Math.max(0, Math.ceil(cur.timeLeft)));
    } else if (phase === 'pause') {
      frac = 1 - phaseT / PAUSE_T; label = String(Math.max(1, Math.ceil(PAUSE_T - phaseT))); sub = qIndex >= Q_PER_ROUND ? 'kürsü' : 'sıradaki';
    } else if (phase === 'roundIntro') {
      frac = 1 - phaseT / RINTRO_T; label = String(Math.max(1, Math.ceil(RINTRO_T - phaseT))); sub = 'başlıyor';
    } else if (phase === 'podium') {
      frac = 1 - phaseT / PODIUM_T; label = '🏆'; sub = '';
    } else { frac = 0; label = '0'; }
    var urgent = phase === 'play' && cur && cur.timeLeft <= 10;
    var sc = urgent ? 1 + 0.08 * Math.max(0, Math.sin(t * TAU)) : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (urgent) ctx.drawImage(GLOW_P, -r * 1.6, -r * 1.6, r * 3.2, r * 3.2);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, TAU); ctx.stroke();
    var col = frac > 0.5 ? '#1fd19a' : frac > 0.25 ? '#ffd166' : '#ff4d6d';
    if (phase !== 'play' && phase !== 'intro') col = '#c9a7ff';
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, r - 12, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac, 0, 1)); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    if (label === '🏆') emo(ctx, '🏆', 0, 0, 56);
    else txt(ctx, label, 0, sub ? -6 : 0, label.length > 2 ? 40 : 52, urgent ? '#ff8fa3' : '#ffffff', { stroke: false, weight: 900 });
    if (sub) txt(ctx, sub, 0, 30, 18, 'rgba(255,255,255,0.75)', { stroke: false, maxW: r * 1.5 });
    ctx.restore();
  }

  function drawFrame(ctx, t) {
    var gold = isGold();
    var f = FRAME;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ui.roundRect(ctx, f.x + 4, f.y + 10, f.w, f.h, 34); ctx.fill();
    var gr = ctx.createLinearGradient(0, f.y, 0, f.y + f.h);
    if (gold) { gr.addColorStop(0, '#c27800'); gr.addColorStop(1, '#6b3a00'); }
    else { gr.addColorStop(0, '#2b1773'); gr.addColorStop(1, '#170a45'); }
    ui.roundRect(ctx, f.x, f.y, f.w, f.h, 34); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = gold ? '#ffd166' : '#ff4d8d'; ctx.stroke();
    ui.roundRect(ctx, f.x + 9, f.y + 9, f.w - 18, f.h - 18, 26); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
    // ampuller
    var party = phase === 'complete' || phase === 'podium' || (ann && ann.key === 'combo');
    var step = Math.floor(t * (party ? 16 : 7));
    for (var i = 0; i < BULBS.length; i++) {
      var bl = BULBS[i];
      var on = party ? ((i + step) % 2 === 0) : ((i + step) % 3 === 0);
      if (phase === 'reveal') on = (i + step) % 4 < 2;
      if (on) ctx.drawImage(gold ? GLOW_G : GLOW_W, bl.x - 22, bl.y - 22, 44, 44);
      ctx.fillStyle = on ? (gold ? '#fff3b0' : '#fff6dc') : (gold ? '#7a4a00' : '#5b3a8a');
      ctx.beginPath(); ctx.arc(bl.x, bl.y, 6.5, 0, TAU); ctx.fill();
    }
    // alt plaka: tahmin notu
    var pw = 470, px = W / 2 - pw / 2, py = f.y + f.h - 15;
    pill(ctx, px, py, pw, 30, gold ? '#6b3a00' : '#170a45', gold ? '#ffd166' : '#ff4d8d', 3);
    txt(ctx, 'Cevaplar yayın ekibinin tahminidir 😄', W / 2, py + 15, 20, 'rgba(255,255,255,0.85)', { stroke: false, maxW: pw - 24 });
  }

  function drawTile(ctx, t, time) {
    var gold = isGold();
    var cx = t.x + TW / 2, cy = t.y + TH / 2;
    var e = clamp(t.enterT, 0, 1);
    if (e <= 0) return;
    var es = ease.outBack(e);
    var sy = 1, front = t.revealed;
    if (t.flipT >= 0) {
      var f = t.flipT / FLIP_T;
      if (f < 0.5) { sy = Math.cos(f * Math.PI); front = false; }
      else { sy = ease.outBack((f - 0.5) * 2); front = true; }
    }
    var hs = t.hintT >= 0 ? 1 + 0.07 * Math.sin(t.hintT / 0.7 * Math.PI) : 1;
    var tx = t.tease > 0 ? Math.sin(time * 70) * 5 : 0;
    ctx.save();
    ctx.translate(cx + tx, cy);
    ctx.scale(es * hs, es * hs * Math.max(0.02, sy));
    if (e < 1) ctx.globalAlpha = e;
    if (!front) {
      ctx.drawImage(gold ? FACE.hiddenG : FACE.hidden, -TW / 2 - FPAD, -TH / 2 - FPAD);
      // parıltı turu (sırayla)
      var sh = ((time * 0.35 + t.rank * 0.17) % 1.6);
      if (sh < 1) {
        ctx.save(); ui.roundRect(ctx, -TW / 2, -TH / 2, TW, TH, 20); ctx.clip();
        var sx = lerp(-TW, TW, sh);
        var sg = ctx.createLinearGradient(sx - 80, 0, sx + 80, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.22)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; ctx.fillRect(-TW / 2, -TH / 2, TW, TH);
        ctx.restore();
      }
      if (!t.hintStr) {
        // büyük numara
        ctx.fillStyle = gold ? INK : '#ffd166';
        ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill();
        ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        txt(ctx, String(t.rank), 0, 2, 58, gold ? '#ffd166' : INK, { stroke: false, weight: 900 });
      } else {
        ctx.fillStyle = gold ? INK : '#ffd166';
        ctx.beginPath(); ctx.arc(-TW / 2 + 44, 0, 28, 0, TAU); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        txt(ctx, String(t.rank), -TW / 2 + 44, 2, 36, gold ? '#ffd166' : INK, { stroke: false, weight: 900 });
        txt(ctx, t.hintStr, 30, 2, 44, '#ffffff', { maxW: TW - 120, sw: 7, stroke: gold ? '#6b3a00' : '#0d268a', weight: 900 });
      }
      if (t.hintT >= 0) {
        ctx.globalAlpha = 1 - t.hintT / 0.7;
        ui.roundRect(ctx, -TW / 2, -TH / 2, TW, TH, 20); ctx.lineWidth = 8; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (t.tease > 0) {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 30);
        ui.roundRect(ctx, -TW / 2, -TH / 2, TW, TH, 20); ctx.lineWidth = 7; ctx.strokeStyle = '#ff4d8d'; ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else {
      var face = t.missed ? FACE.missed : gold ? FACE.frontG : FACE.front;
      ctx.drawImage(face, -TW / 2 - FPAD, -TH / 2 - FPAD);
      txt(ctx, String(t.rank), -TW / 2 + 46, 2, 36, '#ffffff', { stroke: false, weight: 900 });
      var ax = -TW / 2 + 86, aw = TW - 86 - 122, acx = ax + aw / 2;
      var hasK = !t.missed && t.knowN > 0;
      var ly = hasK ? -28 : -16;
      txt(ctx, t.up, acx, ly, 40, t.missed ? '#5a3646' : INK, { maxW: aw, stroke: false, weight: 900 });
      if (t.missed) {
        txt(ctx, '😅 Kimse bulamadı', acx, 26, 25, '#8a3b52', { maxW: aw, stroke: false });
      } else if (t.by) {
        txt(ctx, '⚡ İlk bulan: ' + t.by.name, acx, hasK ? 10 : 26, 25, '#6a2fc2', { maxW: aw, stroke: false });
        if (hasK) {
          var names = t.knowers.slice(-2).reverse().map(function (u) { return trunc(u.name, 10); }).join(', ');
          var more = t.knowN > 2 ? ' +' + (t.knowN - 2) : '';
          txt(ctx, '👥 Bilenler: ' + names + more, acx, 40, 21, '#2b6f8f', { maxW: aw, stroke: false });
        }
      }
      var pts = t.pts * (cur ? cur.mult : 1);
      txt(ctx, String(pts), TW / 2 - 60, t.knowN > 0 && !t.missed ? -10 : -4, 50, '#ffffff', { sw: 6, stroke: t.missed ? '#5a3646' : '#8a2a00', weight: 900 });
      if (!t.missed && t.knowN > 0) txt(ctx, '👥 ' + (t.knowN + 1), TW / 2 - 60, 34, 20, '#ffffff', { stroke: false, maxW: 92 });
      else txt(ctx, cur && cur.golden ? 'x2 puan' : 'puan', TW / 2 - 60, 34, 18, 'rgba(255,255,255,0.9)', { stroke: false });
      // parlama
      if (t.shineT >= 0) {
        ctx.save(); ui.roundRect(ctx, -TW / 2, -TH / 2, TW, TH, 20); ctx.clip();
        var p = t.shineT / 0.9;
        if (p < 0.25) { ctx.globalAlpha = (1 - p / 0.25) * 0.8; ctx.fillStyle = '#ffffff'; ctx.fillRect(-TW / 2, -TH / 2, TW, TH); ctx.globalAlpha = 1; }
        var sx2 = lerp(-TW * 0.9, TW * 0.9, p);
        ctx.translate(sx2, 0); ctx.rotate(0.35);
        var sg2 = ctx.createLinearGradient(-60, 0, 60, 0);
        sg2.addColorStop(0, 'rgba(255,255,255,0)'); sg2.addColorStop(0.5, 'rgba(255,255,255,0.75)'); sg2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg2; ctx.fillRect(-60, -TH, 120, TH * 2);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawEmptyTile(ctx, x, y) {
    ctx.save(); ctx.globalAlpha = 0.35;
    ui.roundRect(ctx, x, y, TW, TH, 20); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke();
    ctx.restore();
    txt(ctx, '—', x + TW / 2, y + TH / 2, 40, 'rgba(255,255,255,0.4)', { stroke: false });
  }

  function drawBoard(ctx, t) {
    drawFrame(ctx, t);
    if (cur) {
      for (var i = 0; i < 6; i++) {
        var tile = cur.tiles[i];
        if (tile) drawTile(ctx, tile, t);
        else drawEmptyTile(ctx, TCOL[i < 3 ? 0 : 1], TROW[i % 3]);
      }
    } else {
      for (var j = 0; j < 6; j++) {
        var x = TCOL[j < 3 ? 0 : 1], y = TROW[j % 3];
        ctx.drawImage(FACE.hidden, x - FPAD, y - FPAD);
        ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(x + TW / 2, y + TH / 2, 44, 0, TAU); ctx.fill();
        ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        txt(ctx, String(j + 1), x + TW / 2, y + TH / 2 + 2, 58, INK, { stroke: false, weight: 900 });
      }
    }
  }

  function drawInfo(ctx, t) {
    // beğeni → ipucu çubuğu
    var label = 'Beğen → İPUCU  ' + LG.fmt(Math.min(likeVal, likeTarget)) + '/' + LG.fmt(likeTarget);
    ui.goalBar(ctx, LIKEBAR.x, LIKEBAR.y, LIKEBAR.w, LIKEBAR.h, Math.min(likeVal, likeTarget), likeTarget, { icon: '❤️', label: label, color1: '#ff2e7e', color2: '#ffb3d1' });
    if (likeFlash > 0) {
      ctx.save(); ctx.globalAlpha = likeFlash * 0.8;
      ui.roundRect(ctx, LIKEBAR.x, LIKEBAR.y, LIKEBAR.w, LIKEBAR.h, LIKEBAR.h / 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.restore();
    }
    // tahmin sayacı / en çok denenen yanlış
    var b = 1 + counterBump * 0.06;
    ctx.save(); ctx.translate(COUNTER.x + COUNTER.w / 2, COUNTER.y + COUNTER.h / 2); ctx.scale(b, b);
    pill(ctx, -COUNTER.w / 2, -COUNTER.h / 2, COUNTER.w, COUNTER.h, 'rgba(0,0,0,0.55)', 'rgba(255,255,255,0.35)', 3);
    var s;
    var showHot = cur && cur.hot && (Math.floor(t / 4) % 2 === 1);
    if (showHot) s = '🔥 Çok denenen: ' + cur.hot.text + ' ×' + cur.hot.n;
    else s = '🔎 Denenen tahmin: ' + LG.fmt(cur ? cur.guesses : 0);
    txt(ctx, s, 0, 1, 28, showHot ? '#ffb38a' : '#ffffff', { maxW: COUNTER.w - 30 });
    ctx.restore();
  }

  function drawLeaderboard(ctx, t) {
    var p = LB;
    ui.panel(ctx, p.x, p.y, p.w, p.h, { r: 24, fill: 'rgba(14,6,40,0.72)', border: 'rgba(255,209,102,0.45)', lineWidth: 3 });
    txt(ctx, '🏆 BU TUR', p.x + 18, p.y + 22, 26, '#ffd166', { align: 'left' });
    txt(ctx, '👥 ' + roundUsers.size, p.x + p.w - 18, p.y + 22, 24, 'rgba(255,255,255,0.8)', { align: 'right' });
    var rows = board.top(5);
    var rh = 32, y0 = p.y + 52;
    if (!rows.length) {
      txt(ctx, 'İlk tahmini sen yaz! 💬', p.x + p.w / 2, p.y + p.h / 2 + 14, 28, 'rgba(255,255,255,0.75)', { maxW: p.w - 30 });
      return;
    }
    var medals = ['🥇', '🥈', '🥉'];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i], ry = y0 + i * rh, u = r.user;
      var fl = lbFlash.get(u.id);
      if (fl != null && LG.time - fl < 0.9) {
        ctx.save(); ctx.globalAlpha = 1 - (LG.time - fl) / 0.9;
        ui.roundRect(ctx, p.x + 8, ry - rh / 2 + 1, p.w - 16, rh - 2, 10); ctx.fillStyle = 'rgba(255,209,102,0.45)'; ctx.fill();
        ctx.restore();
      }
      if (i < 3) emo(ctx, medals[i], p.x + 28, ry, 26);
      else txt(ctx, String(i + 1), p.x + 28, ry, 24, '#cfc6ff', { stroke: false });
      miniAv(ctx, u, p.x + 62, ry, 13);
      var tag = ui.nameTag(u, 24, i === 0 ? '#ffd166' : '#ffffff');
      var maxNW = p.w - 82 - 92;
      var k = Math.min(1, maxNW / tag.width);
      ctx.drawImage(tag, p.x + 82, ry - tag.height * k / 2, tag.width * k, tag.height * k);
      txt(ctx, LG.fmt(r.score), p.x + p.w - 18, ry, 26, '#ffd166', { align: 'right' });
    }
  }

  function drawFeed(ctx, t) {
    var p = FEED;
    ui.panel(ctx, p.x, p.y, p.w, p.h, { r: 24, fill: 'rgba(14,6,40,0.72)', border: 'rgba(127,255,212,0.4)', lineWidth: 3 });
    txt(ctx, '💬 CANLI TAHMİNLER', p.x + 18, p.y + 22, 26, '#7fffd4', { align: 'left', maxW: p.w - 36 });
    ctx.save();
    ui.roundRect(ctx, p.x + 4, p.y + 40, p.w - 8, p.h - 44, 20); ctx.clip();
    for (var i = feed.length - 1; i >= 0; i--) {
      var f = feed[i];
      var a = f.slot >= FEED_ROWS ? 0 : 1;
      if (f.slot === FEED_ROWS - 1) a = 0.55;
      if (f.t < 0.2) a *= f.t / 0.2;
      if (a <= 0) continue;
      var sc = f.t < 0.25 ? ease.outBack(f.t / 0.25) : 1;
      ctx.globalAlpha = a;
      var dw = f.c.width * sc, dh = f.c.height * sc;
      ctx.drawImage(f.c, p.x + 12, f.y + (CH_H - dh) / 2, dw, dh);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (!feed.length) txt(ctx, 'Tahminler burada akacak 👇', p.x + p.w / 2, p.y + p.h / 2 + 14, 26, 'rgba(255,255,255,0.6)', { maxW: p.w - 30 });
  }

  function drawPops(ctx) {
    for (var i = 0; i < pops.length; i++) {
      var p = pops[i];
      var k = p.t / p.life;
      var sc = p.t < 0.25 ? ease.outBack(p.t / 0.25) * (p.small ? 1 : 1.25) : (p.small ? 1 : lerp(1.25, 1, Math.min(1, (p.t - 0.25) / 0.3)));
      var a = k > 0.7 ? (1 - k) / 0.3 : 1;
      var y = p.y - ease.outCubic(k) * (p.small ? 60 : 90);
      txt(ctx, p.str, p.x, y, p.size, p.color, { scale: sc, alpha: a, sw: p.small ? 6 : 10, stroke: 'rgba(40,10,60,0.95)', weight: 900 });
      if (p.sub) txt(ctx, p.sub, p.x, y + p.size * 0.62, p.small ? 22 : 28, '#ffffff', { alpha: a, maxW: 300 });
    }
  }

  function drawAnnouncement(ctx) {
    if (!ann) return;
    var a = ann, k = a.t;
    var inP = Math.min(1, k / 0.28), out = Math.min(1, (a.dur - k) / 0.3);
    var al = Math.min(inP * 1.5, out);
    if (al <= 0) return;
    var cy = BOARD_CY - 6;
    var hgt = a.sub ? 156 : 116;
    var wfull = 1000;
    var w = wfull * ease.outBack(inP);
    ctx.save();
    ctx.globalAlpha = clamp(al, 0, 1) * 0.5;
    ctx.fillStyle = '#000'; ui.roundRect(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, 34); ctx.fill();
    ctx.globalAlpha = clamp(al, 0, 1);
    ctx.translate(W / 2, cy);
    // şerit
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.moveTo(-w / 2 - 20 + 6, -hgt / 2 + 10); ctx.lineTo(w / 2 + 6, -hgt / 2 + 10); ctx.lineTo(w / 2 + 20 + 6, hgt / 2 + 10); ctx.lineTo(-w / 2 + 6, hgt / 2 + 10); ctx.closePath(); ctx.fill();
    var gr = ctx.createLinearGradient(0, -hgt / 2, 0, hgt / 2);
    gr.addColorStop(0, a.bg); gr.addColorStop(1, shade(a.bg));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(-w / 2 - 20, -hgt / 2); ctx.lineTo(w / 2, -hgt / 2); ctx.lineTo(w / 2 + 20, hgt / 2); ctx.lineTo(-w / 2, hgt / 2); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    if (inP >= 1) {
      var ts = 1 + 0.06 * Math.max(0, Math.sin(Math.min(1, (k - 0.28) / 0.3) * Math.PI));
      txt(ctx, a.text, 0, a.sub ? -24 : 2, 62, a.color, { maxW: w - 60, scale: ts, sw: 9, stroke: 'rgba(20,0,40,0.9)', weight: 900 });
      if (a.sub) txt(ctx, a.sub, 0, 44, 34, '#ffffff', { maxW: w - 80, sw: 6, stroke: 'rgba(20,0,40,0.8)' });
    }
    ctx.restore();
  }
  var shadeC = {};
  function shade(hex) {
    if (shadeC[hex]) return shadeC[hex];
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    var n = parseInt(m[1], 16);
    var r = Math.round(((n >> 16) & 255) * 0.62), g = Math.round(((n >> 8) & 255) * 0.62), b = Math.round((n & 255) * 0.62);
    return (shadeC[hex] = 'rgb(' + r + ',' + g + ',' + b + ')');
  }

  function drawGiftBanner(ctx, t) {
    if (!gb) return;
    var b = gb, k = b.t;
    var inP = Math.min(1, k / 0.4), out = Math.min(1, (b.dur - k) / 0.35);
    var dy = (1 - ease.outBack(inP)) * -170;
    var al = clamp(Math.min(inP * 2, out), 0, 1);
    var big = b.tier >= 5;
    var bw = 1000, bh = big ? 132 : 112;
    var x = W / 2 - bw / 2, y = HEAD.y - 4 + dy;
    ctx.save();
    ctx.globalAlpha = al;
    if (big) ctx.drawImage(GLOW_BIG, W / 2 - 600, y - 120, 1200, bh + 240);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ui.roundRect(ctx, x + 5, y + 9, bw, bh, 30); ctx.fill();
    var gr = ctx.createLinearGradient(0, y, 0, y + bh);
    if (big) { gr.addColorStop(0, '#ffcf3a'); gr.addColorStop(1, '#b86e00'); }
    else if (b.tier >= 4) { gr.addColorStop(0, '#ff5fa2'); gr.addColorStop(1, '#a3135a'); }
    else { gr.addColorStop(0, '#8e5cff'); gr.addColorStop(1, '#4a1fb8'); }
    ui.roundRect(ctx, x, y, bw, bh, 30); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = big ? '#fff3b0' : '#ffd166'; ctx.stroke();
    // parlama
    ctx.save(); ui.roundRect(ctx, x, y, bw, bh, 30); ctx.clip();
    var sx = x + ((k * 700) % (bw + 300)) - 150;
    var sg = ctx.createLinearGradient(sx - 90, 0, sx + 90, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(x, y, bw, bh);
    ctx.restore();
    var ar = big ? 48 : 40;
    ui.avatar(ctx, b.user, x + 26 + ar, y + bh / 2, ar, { ring: '#ffffff', ringWidth: 5 });
    var tx0 = x + 26 + ar * 2 + 22, tmw = bw - (tx0 - x) - 130;
    var head = b.user.name + ' · ' + b.gname + (b.count > 1 ? ' x' + b.count : '');
    txt(ctx, head, tx0, y + bh / 2 - 22, big ? 42 : 38, '#ffffff', { align: 'left', maxW: tmw, sw: 7, stroke: 'rgba(30,0,40,0.85)' });
    txt(ctx, b.line, tx0, y + bh / 2 + 24, big ? 32 : 28, big ? '#3a2200' : '#fff3b0', { align: 'left', maxW: tmw, stroke: big ? false : 'rgba(30,0,40,0.75)', sw: 5 });
    emo(ctx, b.emoji, x + bw - 66, y + bh / 2 + Math.sin(t * 7) * 6, big ? 96 : 80);
    ctx.restore();
  }

  function drawRoundIntro(ctx, t) {
    var k = phaseT;
    var a = Math.min(1, k / 0.3) * Math.min(1, (RINTRO_T - k) / 0.25);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = 'rgba(8,2,30,0.78)'; ui.roundRect(ctx, FRAME.x, FRAME.y, FRAME.w, FRAME.h, 34); ctx.fill();
    var cy = BOARD_CY;
    var s = ease.outBack(Math.min(1, k / 0.5));
    ctx.translate(W / 2, cy); ctx.scale(s, s);
    ctx.drawImage(GLOW_P, -420, -200, 840, 260);
    txt(ctx, 'TUR ' + round, 0, -110, 120, '#ffd166', { sw: 14, stroke: '#3a0f5c', weight: 900 });
    txt(ctx, Q_PER_ROUND + ' soru · ilk bulan puanı kapar ⚡', 0, -10, 40, '#ffffff', { maxW: 900 });
    txt(ctx, '💬 Yorumlara tahminini yaz!', 0, 46, 36, '#7fffd4', { maxW: 900 });
    var left = Math.max(1, Math.ceil(RINTRO_T - k));
    var ps = 1 + 0.25 * (1 - ((RINTRO_T - k) % 1));
    ctx.fillStyle = '#ff4d8d'; ctx.beginPath(); ctx.arc(0, 138, 58 * ps, 0, TAU); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    txt(ctx, String(left), 0, 141, 70 * ps, '#ffffff', { stroke: false, weight: 900 });
    ctx.restore();
  }

  function drawPodium(ctx, t) {
    if (!podium) return;
    var k = phaseT;
    var a = Math.min(1, k / 0.4);
    var top = FRAME.y, bot = LB.y + LB.h;
    ctx.save();
    ctx.globalAlpha = a;
    var gr = ctx.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, 'rgba(40,12,90,0.97)'); gr.addColorStop(1, 'rgba(12,4,34,0.97)');
    ui.roundRect(ctx, FRAME.x, top, FRAME.w, bot - top, 34); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = '#ffd166'; ctx.stroke();
    ctx.save(); ctx.globalAlpha = a * 0.5; ctx.translate(W / 2, top + 330); ctx.rotate(t * 0.25);
    ctx.drawImage(RAYS, -500, -500, 1000, 1000); ctx.restore();
    var ts = ease.outBack(Math.min(1, k / 0.5));
    txt(ctx, '🏆 TUR ' + round + ' ŞAMPİYONLARI', W / 2, top + 58, 56 * ts, '#ffd166', { sw: 10, stroke: '#3a0f5c', weight: 900, maxW: 960 });
    var baseY = top + 560;
    var slots = [{ i: 1, x: W / 2 - 300, h: 190, c: '#c0c8d8' }, { i: 0, x: W / 2, h: 260, c: '#ffd166' }, { i: 2, x: W / 2 + 300, h: 140, c: '#e09a5a' }];
    if (!podium.top.length) {
      txt(ctx, 'Bu turda kimse puan alamadı 😅', W / 2, top + 280, 44, '#ffffff', { maxW: 900 });
      txt(ctx, 'Yeni turda ilk sen yaz! 💬', W / 2, top + 340, 38, '#7fffd4', { maxW: 900 });
    }
    for (var s = 0; s < slots.length; s++) {
      var sl = slots[s], e = podium.top[sl.i];
      var d = 0.5 + s * 0.25;
      var p = clamp((k - d) / 0.6, 0, 1);
      if (!e || p <= 0) continue;
      var hh = sl.h * ease.outCubic(p);
      var bx = sl.x - 130;
      var pg = ctx.createLinearGradient(0, baseY - hh, 0, baseY);
      pg.addColorStop(0, sl.c); pg.addColorStop(1, shade(sl.c.length === 7 ? sl.c : '#888888'));
      ui.roundRect(ctx, bx, baseY - hh, 260, hh, 16); ctx.fillStyle = pg; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
      if (hh > 60) txt(ctx, String(sl.i + 1), sl.x, baseY - hh / 2 + 10, 90, 'rgba(255,255,255,0.9)', { sw: 8, stroke: 'rgba(0,0,0,0.35)', weight: 900 });
      var ap = ease.outBack(clamp((k - d - 0.35) / 0.5, 0, 1));
      if (ap > 0) {
        var ay = baseY - hh - 82;
        ctx.save(); ctx.translate(sl.x, ay); ctx.scale(ap, ap);
        if (sl.i === 0) { ctx.drawImage(GLOW_G, -120, -120, 240, 240); emo(ctx, '👑', 0, -86 + Math.sin(t * 4) * 5, 64); }
        ui.avatar(ctx, e.user, 0, 0, sl.i === 0 ? 62 : 52, { ring: sl.c, ringWidth: 6 });
        ctx.restore();
        txt(ctx, e.user.name, sl.x, baseY - hh - 10, sl.i === 0 ? 36 : 30, '#ffffff', { maxW: 280, alpha: ap });
        txt(ctx, LG.fmt(e.score) + ' puan', sl.x, baseY + 34, 32, '#ffd166', { alpha: ap });
      }
    }
    txt(ctx, '👥 ' + podium.users + ' kişi katıldı · ✅ ' + podium.found + '/' + podium.total + ' cevap bulundu', W / 2, baseY + 92, 32, '#ffffff', { maxW: 940 });
    txt(ctx, 'Ödül yok, sadece şan şöhret! 😄 Tebrikler 👏', W / 2, baseY + 138, 28, '#7fffd4', { maxW: 940 });
    var left = Math.max(1, Math.ceil(PODIUM_T - k));
    txt(ctx, 'Yeni tur ' + left + ' sn sonra…', W / 2, bot - 28, 28, 'rgba(255,255,255,0.75)', { maxW: 900 });
    ctx.restore();
  }

  function render(ctx, t) {
    drawBackground(ctx, t);
    ctx.save();
    ui.applyShake(ctx);
    drawHeader(ctx, t);
    drawCard(ctx, t);
    drawBoard(ctx, t);
    drawInfo(ctx, t);
    drawLeaderboard(ctx, t);
    drawFeed(ctx, t);
    ui.hintBar(ctx, HINT.x, HINT.y, HINT.w, HINT_LINES, { h: HINT.h, size: 36, fill: 'rgba(0,0,0,0.6)', border: 'rgba(255,209,102,0.5)' });
    if (phase === 'roundIntro') drawRoundIntro(ctx, t);
    if (phase === 'podium') drawPodium(ctx, t);
    drawPops(ctx);
    drawAnnouncement(ctx);
    drawGiftBanner(ctx, t);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Simülatör: gerçekçi tahminler (zamanla isabet artar)
  // ---------------------------------------------------------------------------
  function variant(w) {
    var r = Math.random();
    if (r < 0.14) return trUp(w);
    if (r < 0.26) return 'bence ' + w;
    if (r < 0.34) return w + '!!';
    if (r < 0.42 && Array.from(w).length >= 4 && w.indexOf(' ') < 0) return w + (backVowel(w) ? 'lar' : 'ler');
    if (r < 0.48) return w + ' 😂';
    return w;
  }
  LG.sim.comments = [['çay', 3], ['peynir', 2], ['zeytin', 2], ['simit', 1], ['reçel', 1], ['bilmem', 1], ['selam', 1]];
  LG.sim.genComment = function () {
    var r = Math.random();
    if (!cur || phase === 'podium' || phase === 'roundIntro') {
      return r < 0.55 ? LG.pick(['bravo 👏', 'tebrikler!', 'yeni tur gelsin', '👏👏', 'süper oyun', 'hadi başlasın', 'ben de varım']) : LG.pick(D.chatter);
    }
    if (r < 0.07) return LG.pick(D.chatter);
    var el = phase === 'play' ? cur.elapsed / Q_TIME : 0.03;
    var pc = 0.06 + 0.24 * el + cur.hintLevel * 0.05;
    if (Math.random() < pc) {
      var tot = 0, i, ws = [];
      for (i = 0; i < cur.tiles.length; i++) { var w = Math.pow(cur.tiles[i].pts, 1.4); ws.push(w); tot += w; }
      var x = Math.random() * tot, t = cur.tiles[0];
      for (i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) { t = cur.tiles[i]; break; } }
      var opts = t.syn.concat([t.label.replace(/[?!.]/g, '').toLowerCase()]);
      return variant(LG.pick(opts));
    }
    if (Math.random() < 0.6) return variant(LG.pick(D.wrong));
    var oq = LG.pick(D.questions), oa = LG.pick(oq.a);
    return variant(LG.pick(String(oa[2]).split('|')));
  };

  // ---------------------------------------------------------------------------
  LG.start({
    id: 'halk-ne-dedi',
    title: 'Halk Ne Dedi? 🗣️',
    init: function () { newRound(); },
    update: update,
    render: render,
  });
})();
