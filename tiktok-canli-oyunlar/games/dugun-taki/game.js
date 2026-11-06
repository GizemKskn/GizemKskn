/*
 * DÜĞÜN VAR! 💍 — izleyiciler düğünün misafiri.
 *
 *  💬 Yorum            → yılan gibi kıvrılan HALAY hattına katıl (sona eklenirsin, adın görünür)
 *  🧣 Halaybaşı        → en aktif misafir (yorum + beğeni) öne geçer, kırmızı mendili sallar
 *  🎶 halay/horon/...  → 30 sn'de bir oyun havası oylaması (dans + müzik değişir)
 *  ❤️ Beğeni           → davulcu coşar (tempo yükselir, dolunca davulcu döner)
 *  🎁 Hediye           → TAKI MERASİMİ: gül, çeyrek/yarım/tam altın kurdeleye takılır, bilezik seti, araba anahtarı
 *  ➕ Takip / ↗ Paylaş → davetli listesi / düğünü duyurdu
 *
 * Sunucu tuşları: N gelin-damat oynasın · B halaybaşını yeniden seç (sıra karışır)
 *                 T oyun havasını değiştir · Y düğünü bitir (final + yeni düğün) · K davulcuyu coştur
 */
(function () {
  'use strict';
  var ui = LG.ui, W = LG.W, H = LG.H, SAFE = LG.SAFE;
  var D = window.DUGUN_DATA, T = D.T, STYLES = D.STYLES;
  var PI = Math.PI, TAU = PI * 2;
  var sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max;

  ui.celebrateEnabled = false; // kendi düğün sunucusu kutlamamızı çiziyoruz
  ui.toastsEnabled = false; // bildirimler pistin altındaki tek satırlık şeritte (dansçıları kapatmasın)
  LG.sim.comments = D.SIM_COMMENTS;

  // ---------------------------------------------------------------------------
  // Ayarlar ve yerleşim
  // ---------------------------------------------------------------------------
  var ROUND_LEN = max(60, LG.qn('tur', 210));
  var FINALE_LEN = 16;
  var VOTE_LEN = 30;
  var MAX_DANCERS = LG.clamp(LG.qn('maks', 120), 20, 160);
  var DS = 0.84;            // dansçı ölçeği
  var MAX_TAGS = 30;        // aynı anda en fazla isim etiketi
  var TAG_POOL = 80;        // etiket adayı (çakışanlar atlanınca etiketler piste yayılsın)
  var NPC_TARGET = 22;      // kimse yokken halayı çeken köy ahalisi
  var MAX_ITEMS = 60;       // kurdeledeki en fazla takı (fazlası birleşir: 4 çeyrek = 1 tam)
  var CS = 2.1;             // gelin-damat ölçeği
  var HOME = { x: 546, y: 694 };
  var FLOOR_Y = 1140;       // gelin-damat piste inince ayak hizası (anons bandının altında kalsın)
  var DAV = { x: 128, y: 672, s: 1.28 }, ZUR = { x: 284, y: 672, s: 1.28 };
  var DEF = { x: 714, w: 326, bottom: 694 };

  // Eller kamerası üstte ise üst bilgi şeridi kameranın olmadığı tarafa kayar
  var CAMTOP = LG.CAM && LG.CAM.y < 700 ? LG.CAM : null;
  var L = { hx0: SAFE.x, hx1: SAFE.x + SAFE.w, titleY: 281, signY: 364, chipY: 400, chipH: 40, chipRows: 1, defTop: 452, gaugeY: 456, bannerY: 324, calloutY: 1000, calloutTopY: 590, finCalloutY: 852, tickerY: 1186, plaque: true };
  // Takı anonsu başlık bölgesinin üstüne açılır: pist (dansçılar + isimler) hiç kapanmaz.
  if (CAMTOP) {
    var camBottom = CAMTOP.y + CAMTOP.h + 8;
    if (CAMTOP.x + CAMTOP.w / 2 > W / 2) { L.hx1 = CAMTOP.x - 14; L.defTop = max(L.defTop, camBottom); }
    else { L.hx0 = CAMTOP.x + CAMTOP.w + 14; L.gaugeY = max(L.gaugeY, camBottom); }
    L.chipRows = 2; L.chipH = 34; L.plaque = false;
    L.bannerY = 812; // kamera üstteyse anons pistin üst kenarına iner
    var chipsBottom = L.chipY + 2 * (L.chipH + 5) + 8; // iki sıra oy çipinin altına
    L.gaugeY = max(L.gaugeY, chipsBottom); L.defTop = max(L.defTop, chipsBottom);
  }
  var HCX = (L.hx0 + L.hx1) / 2;

  // ---------------------------------------------------------------------------
  // Küçük yardımcılar
  // ---------------------------------------------------------------------------
  function frac(x) { return x - Math.floor(x); }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function circ(ctx, x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.moveTo(x + rx, y); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  function fmtTime(s) { s = max(0, Math.ceil(s)); var m = Math.floor(s / 60); var r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function shortText(s, n) { var a = Array.from(String(s || '')); return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); }

  // Türkçe ayrılma hâli eki: ayse_34 → ayse_34'ten, Mehmet → Mehmet'ten, Ali → Ali'den, Kral → Kral'dan
  var DIG = ['dan', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
  var TENS = ['dan', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];
  function trLower(s) { return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase(); }
  function ablative(name) {
    var core = String(name).replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]+$/g, '');
    var suf = 'den';
    var one = core && core.match(/(?:^|[\s._\-])([A-Za-zÇĞİÖŞÜçğıöşü])$/);
    if (one) { // tek harfle biten ad harfin okunuşuna göre: "Gizem K" → K'dan (ka), "Ali B" → B'den (be)
      var lc = trLower(one[1]);
      suf = 'aıouk'.indexOf(lc) >= 0 || lc === 'q' ? 'dan' : lc === 'x' ? 'ten' : 'den';
    } else if (core) {
      var last = core.charAt(core.length - 1);
      if (/[0-9]/.test(last)) {
        var num = core.match(/[0-9]+$/)[0];
        if (/00$/.test(num)) suf = 'den';
        else if (last === '0') suf = num.length > 1 ? TENS[+num.charAt(num.length - 2)] : 'dan';
        else suf = DIG[+last];
      } else {
        var low = trLower(core), v = null;
        for (var i = low.length - 1; i >= 0; i--) { var ch = low.charAt(i); if ('aıoueiöüâîû'.indexOf(ch) >= 0) { v = ch; break; } }
        var back = v ? 'aıouâû'.indexOf(v) >= 0 : false;
        var hard = 'fstkçşhp'.indexOf(low.charAt(low.length - 1)) >= 0;
        suf = (hard ? 't' : 'd') + (back ? 'an' : 'en');
      }
    }
    return name + '’' + suf;
  }

  // ---------------------------------------------------------------------------
  // Hazır çizimler (sprite) — her karede yeniden çizilmez
  // ---------------------------------------------------------------------------
  var coinCache = {};
  function coinSprite(r) {
    r = Math.round(r);
    var c = coinCache[r];
    if (c) return c;
    var pad = 3, m = r + pad;
    c = mk(m * 2, m * 2);
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(m - r * 0.4, m - r * 0.45, r * 0.1, m, m, r);
    gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.35, '#ffe066'); gr.addColorStop(0.75, '#f4b400'); gr.addColorStop(1, '#b77900');
    g.fillStyle = gr; g.beginPath(); g.arc(m, m, r, 0, TAU); g.fill();
    g.lineWidth = max(1.2, r * 0.1); g.strokeStyle = '#9a6400'; g.stroke();
    g.beginPath(); g.arc(m, m, r * 0.74, 0, TAU); g.lineWidth = max(0.8, r * 0.06); g.strokeStyle = 'rgba(140,90,0,0.75)'; g.stroke();
    g.fillStyle = 'rgba(150,95,0,0.6)';
    for (var i = 0; i < 18; i++) { var a = i / 18 * TAU; g.beginPath(); g.arc(m + cos(a) * r * 0.87, m + sin(a) * r * 0.87, max(0.6, r * 0.045), 0, TAU); g.fill(); }
    g.fillStyle = '#c98a00'; g.beginPath();
    for (var k = 0; k < 16; k++) { var aa = k / 16 * TAU - PI / 2, rr = k % 2 ? r * 0.22 : r * 0.5; g.lineTo(m + cos(aa) * rr, m + sin(aa) * rr); }
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(m - r * 0.35, m - r * 0.42, r * 0.32, r * 0.16, -0.6, 0, TAU); g.fill();
    coinCache[r] = c;
    return c;
  }
  var BIG_COIN = null;
  function drawCoinScaled(ctx, x, y, r, sx) {
    var c = BIG_COIN || (BIG_COIN = coinSprite(48));
    var k = r / 48, w = c.width * k * (sx == null ? 1 : max(0.12, sx)), h = c.height * k;
    ctx.drawImage(c, x - w / 2, y - h / 2, w, h);
  }
  function drawBangle(ctx, x, y, r, a) {
    ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a);
    ctx.lineWidth = r * 0.42; ctx.strokeStyle = '#b77900';
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.42, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = r * 0.26; ctx.strokeStyle = '#ffd34d';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.04, r, r * 0.42, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function glowSprite(rgb, r) {
    var c = mk(r * 2, r * 2), g = c.getContext('2d');
    var gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, 'rgba(255,255,240,1)');
    gr.addColorStop(0.12, 'rgba(' + rgb + ',0.95)');
    gr.addColorStop(0.3, 'rgba(' + rgb + ',0.35)');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
    return c;
  }
  var BULB_RGB = ['255,206,110', '255,110,120', '130,210,255', '255,160,80', '190,255,140'];
  var glows = BULB_RGB.map(function (c) { return glowSprite(c, 22); });

  // Başlık (bir kez çizilir, ritimle büyür-küçülür)
  var titleImg = null;
  function buildTitle() {
    var size = 90;
    var c = mk(900, 130), g = c.getContext('2d');
    g.font = ui.font(size, 900);
    var tw = g.measureText(T.title).width;
    var total = tw + 18 + size * 0.95;
    var x0 = (900 - total) / 2, y = 70;
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.shadowColor = 'rgba(255,120,80,0.7)'; g.shadowBlur = 24;
    g.lineWidth = 16; g.strokeStyle = '#4a0010'; g.strokeText(T.title, x0, y);
    g.shadowBlur = 0;
    g.lineWidth = 6; g.strokeStyle = '#a3001d'; g.strokeText(T.title, x0, y);
    var gr = g.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5);
    gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.45, '#ffd34d'); gr.addColorStop(1, '#f39c12');
    g.fillStyle = gr; g.fillText(T.title, x0, y);
    g.font = Math.round(size * 0.85) + 'px ' + ui.EMOJI_FONT;
    g.fillText('💍', x0 + tw + 18, y + 4);
    titleImg = c;
  }

  // Oyun havası tabelası (her hava için bir kez)
  var signCache = {};
  function signImg(st) {
    if (signCache[st.id]) return signCache[st.id];
    var w = 452, h = 66, c = mk(w + 8, h + 8), g = c.getContext('2d');
    g.translate(4, 4);
    ui.roundRect(g, 0, 0, w, h, 18);
    var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8a4a1c'); gr.addColorStop(1, '#5a2a0c');
    g.fillStyle = gr; g.fill();
    g.lineWidth = 4; g.strokeStyle = '#ffcf5a'; g.stroke();
    for (var i = 0; i < 22; i++) { // çerçeve ampulleri
      var bx = 14 + i * ((w - 28) / 21);
      g.fillStyle = i % 2 ? '#ffe9a8' : '#ff9f43';
      g.beginPath(); g.arc(bx, 6, 2.6, 0, TAU); g.arc(bx, h - 6, 2.6, 0, TAU); g.fill();
    }
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = ui.font(30, 800); var w1 = g.measureText(T.now + ' ').width;
    g.font = ui.font(42, 900); var w2 = g.measureText(st.name).width;
    var w3 = 46, tot = w1 + w2 + 10 + w3, sc = min(1, (w - 30) / tot);
    g.save(); g.translate(w / 2, h / 2 + 2); g.scale(sc, sc); g.translate(-tot / 2, 0);
    g.lineJoin = 'round';
    g.font = ui.font(30, 800); g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(T.now + ' ', 0, 0); g.fillStyle = '#ffe9c7'; g.fillText(T.now + ' ', 0, 0);
    g.font = ui.font(42, 900); g.lineWidth = 7; g.strokeStyle = '#3a1000'; g.strokeText(st.name, w1, 0); g.fillStyle = '#ffd34d'; g.fillText(st.name, w1, 0);
    g.font = '38px ' + ui.EMOJI_FONT; g.fillText(st.emoji, w1 + w2 + 10, 2);
    g.restore();
    signCache[st.id] = c;
    return c;
  }

  // ---------------------------------------------------------------------------
  // Arka plan (tek sefer çizilir)
  // ---------------------------------------------------------------------------
  var bg = null, tablesImg = null, bulbs = [], stars = [], seats = [];
  var TABLES = [{ x: 170, y: 1452 }, { x: 420, y: 1512 }, { x: 670, y: 1452 }, { x: 918, y: 1512 }];

  function buildBackground() {
    bg = mk(W, H);
    var g = bg.getContext('2d');
    var i;
    // gökyüzü
    var sky = g.createLinearGradient(0, 0, 0, 720);
    sky.addColorStop(0, '#05071c'); sky.addColorStop(0.45, '#141040'); sky.addColorStop(0.8, '#2b1650'); sky.addColorStop(1, '#46204e');
    g.fillStyle = sky; g.fillRect(0, 0, W, 720);
    for (i = 0; i < 150; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (0.15 + Math.random() * 0.55).toFixed(2) + ')';
      var ss = Math.random() < 0.12 ? 2.6 : 1.5;
      g.fillRect(Math.random() * W, Math.random() * 600, ss, ss);
    }
    for (i = 0; i < 34; i++) stars.push({ x: Math.random() * W, y: Math.random() * 560, ph: Math.random() * TAU, sp: 1 + Math.random() * 2 });
    // ay
    var mg = glowSprite('255,236,190', 150);
    g.globalAlpha = 0.55; g.drawImage(mg, 930 - 150, 118 - 150); g.globalAlpha = 1;
    g.fillStyle = '#fff3d4'; g.beginPath(); g.arc(930, 118, 46, 0, TAU); g.fill();
    g.fillStyle = 'rgba(220,200,160,0.35)'; g.beginPath(); circ(g, 915, 108, 9); circ(g, 942, 132, 6); circ(g, 946, 100, 4); g.fill();
    // tepeler
    g.fillStyle = '#24123f';
    g.beginPath(); g.moveTo(0, 640);
    g.bezierCurveTo(200, 560, 340, 600, 520, 590); g.bezierCurveTo(700, 580, 860, 540, W, 600);
    g.lineTo(W, 720); g.lineTo(0, 720); g.closePath(); g.fill();
    // köy evleri (camlar ışıklı)
    var hx = -20;
    while (hx < W) {
      var hw = 60 + Math.random() * 60, hh = 46 + Math.random() * 60, by = 700;
      g.fillStyle = '#1a1030';
      g.fillRect(hx, by - hh, hw, hh);
      g.beginPath(); g.moveTo(hx - 6, by - hh); g.lineTo(hx + hw / 2, by - hh - 26 - Math.random() * 12); g.lineTo(hx + hw + 6, by - hh); g.closePath(); g.fill();
      for (var wy = by - hh + 12; wy < by - 16; wy += 22) {
        for (var wx = hx + 10; wx < hx + hw - 14; wx += 22) {
          if (Math.random() < 0.55) { g.fillStyle = Math.random() < 0.7 ? 'rgba(255,200,100,0.85)' : 'rgba(255,160,90,0.7)'; g.fillRect(wx, wy, 9, 11); }
        }
      }
      hx += hw + 8 + Math.random() * 30;
    }
    // ağaçlar (kenarlar)
    function tree(x, y, r, col) {
      g.fillStyle = '#1b120a'; g.fillRect(x - r * 0.12, y, r * 0.24, r * 1.6);
      g.fillStyle = col; g.beginPath();
      circ(g, x, y, r); circ(g, x - r * 0.6, y + r * 0.35, r * 0.7); circ(g, x + r * 0.6, y + r * 0.3, r * 0.72); circ(g, x, y - r * 0.55, r * 0.7);
      g.fill();
    }
    tree(-10, 330, 120, '#0e1f16'); tree(30, 560, 90, '#12281b'); tree(1090, 300, 130, '#0e1f16'); tree(1050, 560, 92, '#12281b');
    // zemin
    var gg = g.createLinearGradient(0, 690, 0, H);
    gg.addColorStop(0, '#2a2216'); gg.addColorStop(0.3, '#1b2414'); gg.addColorStop(1, '#091007');
    g.fillStyle = gg; g.fillRect(0, 690, W, H - 690);
    drawFloor(g);
    drawTrack(g);
    drawMusicStage(g);
    drawCoupleStage(g);
    // ışık telleri (teller burada, ampuller her karede yanıp söner)
    var strands = [
      { x0: -20, y0: 14, x1: W + 20, y1: 14, sag: 175, n: 24 },
      { x0: -20, y0: 112, x1: W + 20, y1: 132, sag: 92, n: 20 },
    ];
    strands.forEach(function (s, si) {
      g.strokeStyle = 'rgba(20,14,10,0.9)'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(s.x0, s.y0); g.quadraticCurveTo((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2 + 2 * s.sag, s.x1, s.y1); g.stroke();
      for (var k = 0; k < s.n; k++) {
        var t = (k + 0.5) / s.n;
        bulbs.push({ x: LG.lerp(s.x0, s.x1, t), y: LG.lerp(s.y0, s.y1, t) + s.sag * 4 * t * (1 - t) + 6, c: (k + si * 2) % 5, ph: Math.random() * TAU });
      }
    });
    [22, W - 22].forEach(function (x, si) { // ağaç gövdesine sarılı ışıklar
      g.strokeStyle = 'rgba(20,14,10,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, 250); g.lineTo(x, 680); g.stroke();
      for (var y = 262; y < 680; y += 42) bulbs.push({ x: x + ((y / 42) % 2 ? -4 : 4), y: y, c: (y / 42 + si) % 5 | 0, ph: Math.random() * TAU });
    });

    // Masalar (oturanların ÖNÜNE çizilen katman)
    tablesImg = mk(W, H - 1230);
    var tg = tablesImg.getContext('2d');
    tg.translate(0, -1230);
    TABLES.forEach(function (t) { drawTable(tg, t.x, t.y); });
    // oturma yerleri (masaların arkası)
    TABLES.forEach(function (t) {
      [-66, -22, 22, 66].forEach(function (dx) {
        var s = { x: t.x + dx, y: t.y + 8, d: null };
        if (LG.CAM && s.x > LG.CAM.x - 20 && s.x < LG.CAM.x + LG.CAM.w + 20 && s.y > LG.CAM.y - 60 && s.y < LG.CAM.y + LG.CAM.h + 40) return;
        seats.push(s);
      });
    });
    // çimdeki fenerler (dekor)
    [[60, 1330], [300, 1360], [560, 1340], [800, 1360], [1030, 1330]].forEach(function (p) {
      g.globalAlpha = 0.5; g.drawImage(glows[0], p[0] - 22, p[1] - 22); g.globalAlpha = 1;
    });
  }

  function drawFloor(g) {
    var x = 24, y = 700, w = W - 48, h = 526, r = 46;
    g.save();
    ui.roundRect(g, x, y, w, h, r); g.clip();
    var fg = g.createLinearGradient(0, y, 0, y + h); fg.addColorStop(0, '#80502c'); fg.addColorStop(1, '#5c351b');
    g.fillStyle = fg; g.fillRect(x, y, w, h);
    var row = 0;
    for (var yy = y; yy < y + h; yy += 26, row++) {
      g.fillStyle = row % 2 ? 'rgba(255,220,170,0.05)' : 'rgba(0,0,0,0.05)';
      g.fillRect(x, yy, w, 26);
      g.strokeStyle = 'rgba(40,18,6,0.45)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy);
      for (var xx = x + (row * 137) % 230; xx < x + w; xx += 230) { g.moveTo(xx, yy); g.lineTo(xx, yy + 26); }
      g.stroke();
    }
    var lg = g.createRadialGradient(540, 960, 40, 540, 960, 600);
    lg.addColorStop(0, 'rgba(255,205,130,0.30)'); lg.addColorStop(1, 'rgba(255,205,130,0)');
    g.fillStyle = lg; g.fillRect(x, y, w, h);
    var vg = g.createRadialGradient(540, 960, 320, 540, 960, 760);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = vg; g.fillRect(x, y, w, h);
    g.restore();
    ui.roundRect(g, x, y, w, h, r); g.lineWidth = 7; g.strokeStyle = '#c99a52'; g.stroke();
    ui.roundRect(g, x + 8, y + 8, w - 16, h - 16, r - 6); g.lineWidth = 2; g.strokeStyle = 'rgba(255,220,150,0.35)'; g.stroke();
  }

  // Pistte halayın yılan gibi kıvrılan yolu: aşınmış parke izi (hat kısa olsa da rota okunur)
  function drawTrack(g) {
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    for (var i = 0; i <= P.n; i += 4) { var k = i % P.n; if (i === 0) g.moveTo(P.x[k], P.y[k]); else g.lineTo(P.x[k], P.y[k]); }
    g.closePath();
    g.strokeStyle = 'rgba(255,214,150,0.075)'; g.lineWidth = 34; g.stroke();
    g.setLineDash([10, 22]); g.strokeStyle = 'rgba(255,236,200,0.16)'; g.lineWidth = 3; g.stroke();
    g.restore();
  }

  function drawMusicStage(g) {
    ui.roundRect(g, 44, 650, 338, 34, 12); g.fillStyle = '#6a3a1c'; g.fill();
    g.fillStyle = '#8f2418'; g.fillRect(52, 676, 322, 28);
    var cols = ['#e0a32e', '#f4e3c1', '#1f3b6e', '#e0a32e'];
    for (var i = 0; i < 14; i++) {
      var cx = 64 + i * 23;
      g.fillStyle = cols[i % 4];
      g.beginPath(); g.moveTo(cx, 680); g.lineTo(cx + 9, 690); g.lineTo(cx, 700); g.lineTo(cx - 9, 690); g.closePath(); g.fill();
    }
    g.strokeStyle = '#3a1a08'; g.lineWidth = 3; g.strokeRect(52, 676, 322, 28);
  }

  function drawCoupleStage(g) {
    var cx = HOME.x;
    // platform + kırmızı halı
    ui.roundRect(g, cx - 160, 668, 320, 38, 14); g.fillStyle = '#5c0a16'; g.fill();
    ui.roundRect(g, cx - 150, 670, 300, 18, 9); g.fillStyle = '#a3122a'; g.fill();
    // kemer direkleri
    g.fillStyle = '#f3ebdf';
    g.fillRect(cx - 148, 545, 13, 126); g.fillRect(cx + 135, 545, 13, 126);
    // tül perdeler
    g.fillStyle = 'rgba(255,255,255,0.13)';
    g.beginPath(); g.moveTo(cx - 141, 548); g.quadraticCurveTo(cx - 90, 600, cx - 132, 668); g.lineTo(cx - 150, 668); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(cx + 141, 548); g.quadraticCurveTo(cx + 90, 600, cx + 132, 668); g.lineTo(cx + 150, 668); g.closePath(); g.fill();
    // kemer
    g.lineWidth = 14; g.strokeStyle = '#f3ebdf';
    g.beginPath(); g.ellipse(cx, 548, 141, 90, 0, PI, TAU); g.stroke();
    // çiçekler
    var fcol = ['#ff4d6d', '#ffffff', '#ffb3c1', '#ffd6e0', '#c9184a', '#fff0f3'];
    for (var a = PI; a <= TAU + 0.01; a += 0.075) {
      var fx = cx + cos(a) * 141, fy = 548 + sin(a) * 90;
      g.fillStyle = Math.random() < 0.5 ? '#2d6a4f' : '#40916c';
      g.beginPath(); g.ellipse(fx + (Math.random() - 0.5) * 12, fy + (Math.random() - 0.5) * 10, 7, 4, Math.random() * 3, 0, TAU); g.fill();
      g.fillStyle = fcol[(Math.random() * fcol.length) | 0];
      g.beginPath(); g.arc(fx + (Math.random() - 0.5) * 8, fy + (Math.random() - 0.5) * 8, 5 + Math.random() * 4, 0, TAU); g.fill();
    }
    for (var yy = 560; yy < 668; yy += 14) {
      [cx - 141, cx + 141].forEach(function (px) {
        g.fillStyle = '#2d6a4f'; g.beginPath(); g.ellipse(px + (Math.random() - 0.5) * 10, yy, 6, 3.5, Math.random() * 3, 0, TAU); g.fill();
        if (Math.random() < 0.6) { g.fillStyle = fcol[(Math.random() * fcol.length) | 0]; g.beginPath(); g.arc(px + (Math.random() - 0.5) * 8, yy, 4.5, 0, TAU); g.fill(); }
      });
    }
    // kemer ışıkları
    for (var b = PI + 0.1; b < TAU - 0.05; b += 0.16) {
      g.globalAlpha = 0.85; g.drawImage(glows[0], cx + cos(b) * 128 - 11, 548 + sin(b) * 78 - 11, 22, 22); g.globalAlpha = 1;
    }
  }

  function drawTable(g, x, y) {
    // örtü
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y + 64, 112, 18, 0, 0, TAU); g.fill();
    g.fillStyle = '#ece6dd';
    g.beginPath(); g.moveTo(x - 104, y); g.lineTo(x - 108, y + 58);
    for (var i = 0; i < 8; i++) { var xa = x - 108 + i * 27; g.quadraticCurveTo(xa + 13.5, y + 66, xa + 27, y + 58); }
    g.lineTo(x + 104, y); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y, 104, 28, 0, 0, TAU); g.fill();
    // kırmızı runner
    g.fillStyle = '#b3122a'; g.beginPath(); g.ellipse(x, y, 104, 9, 0, 0, TAU); g.fill();
    g.fillRect(x - 10, y, 20, 62);
    // tabaklar + ince belli çay bardakları
    [-60, -20, 20, 60].forEach(function (dx) {
      g.fillStyle = '#f7f7f7'; g.beginPath(); g.ellipse(x + dx, y - 12, 13, 5, 0, 0, TAU); g.fill();
      g.strokeStyle = '#c9c2b6'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(190,70,20,0.85)';
      g.beginPath(); g.moveTo(x + dx + 14, y - 2); g.quadraticCurveTo(x + dx + 10, y - 9, x + dx + 13, y - 16); g.lineTo(x + dx + 21, y - 16); g.quadraticCurveTo(x + dx + 24, y - 9, x + dx + 20, y - 2); g.closePath(); g.fill();
    });
    // vazo + çiçek
    g.fillStyle = '#3a6ea5'; g.fillRect(x - 5, y - 22, 10, 16);
    var fc = ['#ff4d6d', '#ffd166', '#ffffff'];
    for (var k = 0; k < 5; k++) { g.fillStyle = fc[k % 3]; g.beginPath(); g.arc(x - 9 + k * 4.5, y - 28 - (k % 2) * 5, 4.2, 0, TAU); g.fill(); }
  }

  // ---------------------------------------------------------------------------
  // Halay yolu: 4 kıvrımlı sıra + sol kenardan dönüş (kapalı döngü, kendini kesmez)
  // ---------------------------------------------------------------------------
  var ROWS = [805, 915, 1025, 1135], XL = 178, XR = 958, TRAD = 55, COLX = 64, CRAD = 40;
  var P = buildPath();
  function buildPath() {
    var raw = [];
    function seg(x0, y0, x1, y1) { var n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (var i = 0; i < n; i++) raw.push(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); }
    function arc(cx, cy, r, a0, a1) { var n = Math.ceil(abs(a1 - a0) * r); for (var i = 0; i < n; i++) { var a = a0 + (a1 - a0) * i / n; raw.push(cx + cos(a) * r, cy + sin(a) * r); } }
    seg(COLX + CRAD, ROWS[0], XR, ROWS[0]);
    arc(XR, (ROWS[0] + ROWS[1]) / 2, TRAD, -PI / 2, PI / 2);
    seg(XR, ROWS[1], XL, ROWS[1]);
    arc(XL, (ROWS[1] + ROWS[2]) / 2, TRAD, -PI / 2, -PI * 1.5);
    seg(XL, ROWS[2], XR, ROWS[2]);
    arc(XR, (ROWS[2] + ROWS[3]) / 2, TRAD, -PI / 2, PI / 2);
    seg(XR, ROWS[3], COLX + CRAD, ROWS[3]);
    arc(COLX + CRAD, ROWS[3] - CRAD, CRAD, PI / 2, PI);
    seg(COLX, ROWS[3] - CRAD, COLX, ROWS[0] + CRAD);
    arc(COLX + CRAD, ROWS[0] + CRAD, CRAD, PI, PI * 1.5);
    // eşit aralıklı yeniden örnekleme
    var n = raw.length / 2, cum = new Float32Array(n + 1), i;
    for (i = 1; i <= n; i++) {
      var a = (i - 1) * 2, b = (i % n) * 2;
      cum[i] = cum[i - 1] + Math.hypot(raw[b] - raw[a], raw[b + 1] - raw[a + 1]);
    }
    var len = cum[n], step = 2, m = Math.floor(len / step);
    var xs = new Float32Array(m), ys = new Float32Array(m), j = 0;
    for (i = 0; i < m; i++) {
      var s = i * step;
      while (j < n - 1 && cum[j + 1] < s) j++;
      var a2 = j * 2, b2 = ((j + 1) % n) * 2, seglen = cum[j + 1] - cum[j] || 1, f = (s - cum[j]) / seglen;
      xs[i] = raw[a2] + (raw[b2] - raw[a2]) * f; ys[i] = raw[a2 + 1] + (raw[b2 + 1] - raw[a2 + 1]) * f;
    }
    return { x: xs, y: ys, n: m, len: m * step, step: step };
  }
  var waveT = 0;
  function pathPos(s, o) {
    s = ((s % P.len) + P.len) % P.len;
    var f = s / P.step, i = f | 0, fr = f - i, j = (i + 1) % P.n;
    var dx = P.x[j] - P.x[i], dy = P.y[j] - P.y[i];
    o.x = P.x[i] + dx * fr;
    o.y = P.y[i] + dy * fr;
    var hz = abs(dx) / (abs(dx) + abs(dy) + 1e-6);
    o.y += 7 * sin(o.x * 0.012 - waveT) * hz; // hat dalgalanır
    o.dir = dx >= 0 ? 1 : -1;
  }

  // ---------------------------------------------------------------------------
  // Görünüş (her misafire kalıcı kıyafet)
  // ---------------------------------------------------------------------------
  var SKINS = ['#f8d5b8', '#f1c27d', '#e0ac69', '#c68642', '#a86b3c', '#ffdbac'];
  var HAIRS = ['#2b1b0e', '#4a2c17', '#111111', '#7a4b1e', '#b5862e', '#5c1f0e'];
  var PANTS = ['#2b2d42', '#3b3355', '#1f2f3f', '#3d2b1f'];
  var VESTS = ['#1a1a1a', '#5c0b17', '#16324f', '#2f3e1f'];
  function makeLook(u) {
    var h = LG.hash(u.id + '~look');
    var type = h % 4; // 0 gömlek, 1 elbise, 2 yelekli, 3 elbise + yazma
    var hue = u.hue != null ? u.hue : h % 360;
    var dress = type === 1 || type === 3;
    return {
      dress: dress,
      shirt: 'hsl(' + hue + ',70%,' + (dress ? 58 : 52) + '%)',
      sleeve: 'hsl(' + hue + ',62%,' + (dress ? 50 : 44) + '%)',
      legs: dress ? '#3a2a2a' : PANTS[(h >> 3) % PANTS.length],
      skin: SKINS[(h >> 5) % SKINS.length],
      hair: HAIRS[(h >> 7) % HAIRS.length],
      vest: type === 2, vestC: VESTS[(h >> 9) % VESTS.length],
      beltC: type === 2 ? '#e8b84a' : 'rgba(0,0,0,0.35)',
      belt: 'hsl(' + ((hue + 40) % 360) + ',80%,45%)',
      hairType: type === 3 ? 'yazma' : type === 1 ? 'long' : ((h >> 11) % 5 === 0 ? 'cap' : 'short'),
      scarfC: 'hsl(' + ((hue + 150) % 360) + ',78%,58%)',
      capC: '#3a3028',
      flower: type === 1 && ((h >> 13) % 3 === 0),
      mustache: type !== 1 && type !== 3 && ((h >> 15) % 4 === 0),
    };
  }
  var DAV_LOOK = { dress: false, shirt: '#f4efe6', sleeve: '#e9e2d6', legs: '#2b2b3a', skin: '#e0ac69', hair: '#1f140c', vest: true, vestC: '#1a1a1a', beltC: '#c1121f', hairType: 'cap', capC: '#3a2f25', mustache: true };
  var ZUR_LOOK = { dress: false, shirt: '#8a1626', sleeve: '#7a1020', legs: '#2b2b3a', skin: '#c68642', hair: '#111111', vest: true, vestC: '#22324a', beltC: '#ffd34d', hairType: 'short', mustache: true, puff: true };

  // ---------------------------------------------------------------------------
  // Figür çizimi (yerel birim: ayak (0,0), boy ≈ 92)
  // ---------------------------------------------------------------------------
  var pose = { bx: 0, by: 0, rot: 0, sq: 1, lf: -7, lfy: 0, rf: 7, rfy: 0, hlx: -16, hly: -40, hrx: 16, hry: -40, elL: 0, elR: 0, shY: 0, mendil: 0, wow: false, noArms: false };
  function resetPose() {
    pose.bx = 0; pose.by = 0; pose.rot = 0; pose.sq = 1; pose.lf = -7; pose.lfy = 0; pose.rf = 7; pose.rfy = 0;
    pose.hlx = -16; pose.hly = -40; pose.hrx = 16; pose.hry = -40; pose.elL = 0; pose.elR = 0; pose.shY = 0; pose.mendil = 0; pose.wow = false; pose.noArms = false;
  }
  function drawFigure(ctx, k, po) {
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 4.5, 0, 0, TAU); ctx.fill();
    ctx.save();
    ctx.translate(po.bx, po.by);
    if (po.rot) ctx.rotate(po.rot);
    if (po.sq !== 1) ctx.scale(1, po.sq);
    var sy = po.shY;
    // bacaklar
    ctx.strokeStyle = k.legs; ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.moveTo(-5, -32); ctx.lineTo(po.lf, -po.lfy); ctx.moveTo(5, -32); ctx.lineTo(po.rf, -po.rfy); ctx.stroke();
    ctx.fillStyle = '#17161d';
    ctx.beginPath(); ell(ctx, po.lf - 1.5, -po.lfy, 4.6, 2.6); ell(ctx, po.rf + 1.5, -po.rfy, 4.6, 2.6); ctx.fill();
    // gövde
    ctx.fillStyle = k.shirt;
    if (k.dress) {
      ctx.beginPath(); ctx.moveTo(-10, -62 + sy); ctx.lineTo(10, -62 + sy); ctx.lineTo(12, -44); ctx.lineTo(20, -13);
      ctx.quadraticCurveTo(0, -8, -20, -13); ctx.lineTo(-12, -44); ctx.closePath(); ctx.fill();
      ctx.fillStyle = k.belt; ctx.fillRect(-12, -47, 24, 4);
    } else {
      ui.roundRect(ctx, -12, -62 + sy, 24, 34 - sy, 7); ctx.fill();
      if (k.vest) {
        ctx.fillStyle = k.vestC; ctx.fillRect(-12, -60 + sy, 7, 30 - sy); ctx.fillRect(5, -60 + sy, 7, 30 - sy);
        ctx.fillStyle = '#e8b84a'; ctx.fillRect(-5.6, -60 + sy, 1.2, 30 - sy); ctx.fillRect(4.4, -60 + sy, 1.2, 30 - sy);
      }
      ctx.fillStyle = k.beltC; ctx.fillRect(-12, -33, 24, 3.5);
    }
    // kollar
    if (!po.noArms) {
      ctx.strokeStyle = k.sleeve; ctx.lineWidth = 5.6;
      ctx.beginPath();
      ctx.moveTo(-10, -58 + sy);
      if (po.elL) ctx.lineTo((-10 + po.hlx) / 2 - 2, max(-58 + sy, po.hly) + 9);
      ctx.lineTo(po.hlx, po.hly);
      ctx.moveTo(10, -58 + sy);
      if (po.elR) ctx.lineTo((10 + po.hrx) / 2 + 2, max(-58 + sy, po.hry) + 9);
      ctx.lineTo(po.hrx, po.hry);
      ctx.stroke();
      ctx.fillStyle = k.skin;
      ctx.beginPath(); circ(ctx, po.hlx, po.hly, 3.3); circ(ctx, po.hrx, po.hry, 3.3); ctx.fill();
    }
    // baş
    var hy = -76 + sy * 0.6;
    ctx.fillStyle = k.skin;
    ctx.fillRect(-3, -66 + sy, 6, 6);
    ctx.beginPath(); ctx.arc(0, hy, 13, 0, TAU); ctx.fill();
    var ht = k.hairType;
    if (ht === 'yazma') {
      ctx.fillStyle = k.scarfC;
      ctx.beginPath(); ctx.arc(0, hy - 1, 15, PI * 0.9, PI * 2.1); ctx.fill();
      ctx.fillRect(-15, hy - 2, 4.5, 15); ctx.fillRect(10.5, hy - 2, 4.5, 15);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); circ(ctx, -6, hy - 10, 1.6); circ(ctx, 0, hy - 12.5, 1.6); circ(ctx, 6, hy - 10, 1.6); ctx.fill();
    } else {
      ctx.fillStyle = k.hair;
      ctx.beginPath(); ctx.arc(0, hy - 2, 13.6, PI * 1.02, PI * 1.98); ctx.fill();
      if (ht === 'long') { ctx.fillRect(-13.6, hy - 3, 5, 19); ctx.fillRect(8.6, hy - 3, 5, 19); }
      if (ht === 'cap') {
        ctx.fillStyle = k.capC;
        ctx.beginPath(); ctx.arc(0, hy - 5, 14, PI, TAU); ctx.fill();
        ctx.fillRect(-2, hy - 7, 19, 3.5);
      }
      if (k.flower) {
        ctx.fillStyle = '#ff7aa2'; ctx.beginPath(); circ(ctx, 9, hy - 10, 4); ctx.fill();
        ctx.fillStyle = '#ffd34d'; ctx.beginPath(); circ(ctx, 9, hy - 10, 1.6); ctx.fill();
      }
    }
    // yüz
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); circ(ctx, -4.6, hy - 1, 1.9); circ(ctx, 4.6, hy - 1, 1.9); ctx.fill();
    if (k.mustache) { ctx.beginPath(); ctx.ellipse(0, hy + 4.2, 5.5, 1.8, 0, 0, TAU); ctx.fill(); }
    if (k.puff) { ctx.fillStyle = '#e8956b'; ctx.beginPath(); circ(ctx, -6.5, hy + 4, 3.8); circ(ctx, 6.5, hy + 4, 3.8); ctx.fill(); }
    else {
      ctx.fillStyle = 'rgba(255,90,90,0.35)'; ctx.beginPath(); circ(ctx, -8.2, hy + 3.2, 2.6); circ(ctx, 8.2, hy + 3.2, 2.6); ctx.fill();
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.6; ctx.beginPath();
      if (po.wow) circ(ctx, 0, hy + 6, 2.6); else ctx.arc(0, hy + 2.5, 4.4, PI * 0.18, PI * 0.82);
      ctx.stroke();
    }
    // kırmızı mendil (halaybaşı)
    if (po.mendil) {
      var md = po.mendil, mx = md > 0 ? po.hrx : po.hlx, my = md > 0 ? po.hry : po.hly, w = LG.time * 10;
      ctx.fillStyle = '#e3061b';
      ctx.beginPath(); ctx.moveTo(mx, my);
      ctx.quadraticCurveTo(mx + md * 11, my - 12 + sin(w) * 4, mx + md * 25, my - 6 + sin(w + 1) * 7);
      ctx.quadraticCurveTo(mx + md * 18, my + 8 + sin(w + 2) * 4, mx + md * 23, my + 18 + sin(w + 2.6) * 6);
      ctx.quadraticCurveTo(mx + md * 8, my + 10, mx, my);
      ctx.fill();
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath(); circ(ctx, mx + md * 25, my - 6 + sin(w + 1) * 7, 2.2); circ(ctx, mx + md * 23, my + 18 + sin(w + 2.6) * 6, 2.2); ctx.fill();
    }
    ctx.restore();
  }

  // Oyun havasına göre duruş. p = vuruş fazı (vuruş sayısı)
  function stylePose(sid, p) {
    var a, b, v, c;
    switch (sid) {
      case 'horon':
        v = sin(p * 6 * PI);
        pose.by = v * 1.7 - 1; pose.bx = sin(p * 3 * PI) * 1.8; pose.sq = 0.95;
        pose.lfy = max(0, v) * 3.5; pose.rfy = max(0, -v) * 3.5; pose.lf = -6; pose.rf = 6;
        pose.shY = sin(p * 8 * PI) * 1.8;
        pose.hlx = -14; pose.hly = -36 + v * 1.5; pose.hrx = 14; pose.hry = -36 - v * 1.5;
        return -36;
      case 'ciftetelli':
        a = sin(p * PI); b = sin(p * 2 * PI);
        pose.bx = a * 5; pose.rot = a * 0.13; pose.by = -abs(b) * 2;
        pose.lf = -6 + a * 3; pose.rf = 6 + a * 3; pose.lfy = max(0, -a) * 3; pose.rfy = max(0, a) * 3;
        pose.hlx = -15 + b * 3; pose.hly = -97 - max(0, b) * 5; pose.hrx = 15 + b * 3; pose.hry = -97 - max(0, -b) * 5;
        return null;
      case 'zeybek':
        var q = p * 0.5; a = sin(q * PI); b = sin(q * 2 * PI);
        pose.rot = a * 0.15; pose.bx = a * 3;
        pose.hlx = -31; pose.hly = -84 + b * 4; pose.hrx = 31; pose.hry = -84 - b * 4;
        c = q % 8; var kn = c > 5 && c < 7.5 ? sin((c - 5) / 2.5 * PI) : 0;
        pose.by = kn * 15; pose.sq = 1 - kn * 0.1; pose.lf = -7 - kn * 6; pose.lfy = kn * 2;
        pose.rf = 7 + a * 2;
        return null;
      case 'roman':
        a = sin(p * PI); b = abs(a);
        pose.by = -b * 9; pose.bx = sin(p * 2 * PI) * 2; pose.shY = sin(p * 8 * PI) * 1.4;
        pose.hlx = -19; pose.hly = a > 0 ? -92 : -66; pose.hrx = 19; pose.hry = a > 0 ? -66 : -92;
        pose.lfy = max(0, a) * 4; pose.rfy = max(0, -a) * 4;
        return null;
      case 'kolbasti':
        c = p % 2;
        if (c < 1) { var e = sin(c * PI); pose.sq = 1 - e * 0.16; }
        else { var hh = sin((c - 1) * PI); pose.by = -hh * 15; pose.lfy = pose.rfy = hh * 3; pose.lf = -4; pose.rf = 4; }
        pose.hlx = -16; pose.hly = -60; pose.hrx = 16; pose.hry = -60;
        return -60;
      default: // halay
        a = sin(p * PI);
        pose.bx = a * 3; pose.by = -abs(a) * 3; pose.lfy = max(0, a) * 5; pose.rfy = max(0, -a) * 5;
        pose.lf = -7 + a * 2; pose.rf = 7 + a * 2;
        if (p % 4 > 3 && p % 4 < 3.55) { pose.rf = 15; pose.rfy = 9; } // ayak vurma
        pose.shY = sin(p * 4 * PI) * 1.6; // omuz titretme
        pose.hlx = -16; pose.hly = -64; pose.hrx = 16; pose.hry = -64;
        return -63 + sin(p * 2 * PI) * 2;
    }
  }

  // ---------------------------------------------------------------------------
  // Durum
  // ---------------------------------------------------------------------------
  var styleIdx = 0, STY = STYLES[0];
  var votes = STYLES.map(function () { return 0; }), voters = new Map(), voteT = 0, emptyWin = 0, lastWinner = -1;
  var board = new LG.Board();
  var line = [], byId = new Map(), walkers = [], seated = [], bubbles = [];
  var npcCount = 0, realCount = 0, leaderId = null, lastLeaderT = -99, joinRate = 0;
  var headS = 260, spacing = 46, tmpPos = { x: 0, y: 0, dir: 1 };
  var beatPh = 0, heat = 0, tempoMul = 1, davSpin = 0, heatLockUntil = 0, cheerT = 0, nextCostuT = 0;
  var items = [], flyers = [], rib = { wig: 0 }, bangles = 0, couplePop = 0;
  var defter = [], totals = { c: 0, y: 0, t: 0, b: 0, k: 0 }, guestsRound = new Set();
  var banners = [], banner = null, callouts = [], callout = null;
  var moments = [], moment = null, car = { x: -999, active: false };
  var rockets = [], notes = [];
  var ticker = [], tick = null, measureCtx = mk(4, 4).getContext('2d');
  var phase = 'dance', roundT = 0, roundNo = 1, finT = 0, summary = null;
  var couple = { x: HOME.x, y: HOME.y, off: false, armsUp: false, flare: 0, by: 0 };
  var spot = 0, signFlip = 1, prevSign = null;
  var coupleIdx = LG.randi(0, D.COUPLES.length - 1), names = pickNames();
  var tagTimer = 0, leaderTimer = 0, tempoTimer = 0, noteTimer = 0;
  var thr = { join: 0, heart: 0, vote: 0, hey: 0, rose: 0, bubble: 0 }; // efekt kısıtlayıcıları
  var drawList = [];
  var hbTags = new Map();

  function pickNames() {
    var g = LG.qp('gelin', ''), d = LG.qp('damat', '');
    if (g && d) return [shortText(g, 12), shortText(d, 12)];
    var c = D.COUPLES[coupleIdx % D.COUPLES.length];
    return [c[0], c[1]];
  }

  // ---------------------------------------------------------------------------
  // Halay hattı yönetimi
  // ---------------------------------------------------------------------------
  function newDancer(u, npc) {
    return {
      u: u, npc: !!npc, look: makeLook(u), slot: line.length, idx: line.length, x: -200, y: -200, dir: 1, dy: 0,
      born: LG.time, lastAct: LG.time, hop: 0, hopAmp: 0, giftT: -99, tag: false, promo: false, alpha: 1,
    };
  }
  function addDancer(u, npc) {
    var d = newDancer(u, npc);
    var tail = line[line.length - 1];
    if (tail && !npc) d.slot = max(d.slot, tail.slot + 1); // sondaki hâlâ kayıyorsa üstüne doğma
    line.push(d);
    if (npc) npcCount++; else { byId.set(u.id, d); realCount++; }
    pathPos(headS - d.slot * spacing, tmpPos); d.x = tmpPos.x; d.y = tmpPos.y; d.dir = tmpPos.dir;
    return d;
  }
  function removeAt(i, toTable) {
    var d = line.splice(i, 1)[0];
    if (!d) return;
    if (d.npc) npcCount--; else { byId.delete(d.u.id); realCount--; }
    if (i === 0 && line[0]) leaderId = line[0].u.id;
    if (toTable) sendToTable(d);
  }
  function sendToTable(d) {
    if (walkers.length > 26) return;
    var seat = null;
    for (var i = 0; i < seats.length; i++) if (!seats[i].d) { seat = seats[i]; break; }
    if (!seat && seated.length) { // en eski oturanı kaldır
      var old = seated.shift(); old.seat.d = null; seat = old.seat;
    }
    if (seat) seat.d = d;
    var tx = seat ? seat.x : d.x + LG.rand(-80, 80), ty = seat ? seat.y : 1330;
    walkers.push({ d: d, x0: d.x, y0: d.y, x1: tx, y1: ty, t: 0, dur: 1.1 + Math.hypot(tx - d.x, ty - d.y) / 520, seat: seat });
  }
  function unseat(id) {
    for (var i = seated.length - 1; i >= 0; i--) if (seated[i].d.u.id === id) { seated[i].seat.d = null; seated.splice(i, 1); }
    for (var j = walkers.length - 1; j >= 0; j--) if (walkers[j].d.u.id === id) { if (walkers[j].seat) walkers[j].seat.d = null; walkers.splice(j, 1); }
  }
  function removeNpc() {
    for (var i = line.length - 1; i >= 1; i--) if (line[i].npc) { removeAt(i, true); return true; }
    return false;
  }
  function pickEvict() {
    var bi = -1, best = null;
    for (var i = 1; i < line.length; i++) {
      var d = line[i];
      if (d.npc) return i;
      if (LG.time - d.giftT < 60 || d.promo) continue;
      if (!best || d.lastAct < best.lastAct) { best = d; bi = i; }
    }
    return bi < 0 ? line.length - 1 : bi;
  }
  function evictOne() { removeAt(pickEvict(), true); }
  // Yoğun akında (hat dolu + saniyede birden çok yeni misafir) yeni gelen, masaya giden en sessiz
  // misafirin yerine OLDUĞU YERDE girer: tüm hat kaymaz, yeni gelenler sonda üst üste yığılmaz.
  function replaceInPlace(u) {
    var i = pickEvict();
    if (i < 1) return null;
    var old = line[i];
    if (old.npc) npcCount--; else { byId.delete(old.u.id); realCount--; }
    sendToTable(old);
    var d = newDancer(u, false);
    d.slot = old.slot; d.idx = i; d.x = old.x; d.y = old.y; d.dir = old.dir;
    line[i] = d;
    byId.set(u.id, d); realCount++;
    return d;
  }
  // Uzun süre sessiz kalan misafir (hat kalabalıkken) masasına oturur; yazınca geri döner
  function retireIdle() {
    if (line.length <= 40) return;
    var bi = -1, oldest = LG.time - 180;
    for (var i = 1; i < line.length; i++) {
      var d = line[i];
      if (d.npc || d.promo || LG.time - d.giftT < 90) continue;
      if (d.lastAct < oldest) { oldest = d.lastAct; bi = i; }
    }
    if (bi > 0) removeAt(bi, true);
  }
  function ensureDancer(u) {
    var d = byId.get(u.id);
    if (d) return d;
    unseat(u.id);
    joinRate += 1;
    if (npcCount > 0 && realCount + npcCount >= NPC_TARGET) removeNpc();
    d = null;
    if (line.length >= MAX_DANCERS) {
      if (joinRate > 2.2) d = replaceInPlace(u);
      if (!d) evictOne();
    }
    if (!d) d = addDancer(u, false);
    guestsRound.add(u.id);
    if (LG.time - thr.join > 0.12) {
      thr.join = LG.time;
      ui.burst(d.x, d.y - 50, { count: 10, speed: 260, up: 120, gravity: 600, size: 10, life: 0.8 });
      LG.sfx('join');
    }
    tagTimer = 0; // isim hemen görünsün
    return d;
  }
  function initNpcs() {
    for (var i = 0; i < NPC_TARGET; i++) {
      var nm = D.NPC[i % D.NPC.length];
      var u = { id: 'npc_' + i, name: nm, hue: LG.hash(nm) % 360, color: '#999', emoji: '🙂', __npc: true };
      addDancer(u, true);
    }
    for (var k = 0; k < line.length; k++) line[k].slot = k;
    leaderId = line[0].u.id;
  }

  // Halaybaşı: en aktif (yorum + beğeni) misafir öne geçer
  function checkLeader(force) {
    if (!line.length) return;
    var top = board.top(12), cand = null;
    for (var i = 0; i < top.length; i++) { var dd = byId.get(top[i].user.id); if (dd) { cand = dd; break; } }
    var cur = line[0];
    if (!cand || cand === cur) return;
    var cs = board.get(cand.u), curS = cur.npc ? 0 : board.get(cur.u);
    if (force || (cur.npc && cs >= 4) || (cs > curS * 1.25 + 6 && LG.time - lastLeaderT > 15)) promote(cand);
  }
  function promote(d, silent, sub) {
    var i = line.indexOf(d);
    if (i <= 0) return;
    line.splice(i, 1); line.unshift(d);
    lastLeaderT = LG.time; leaderId = d.u.id; d.promo = true; d.lastAct = LG.time;
    if (!silent) {
      var u = d.u, st = '💬 ' + (u.comments || 0) + ' yorum' + (u.likes ? ' · ❤️ ' + LG.fmt(u.likes) + ' beğeni' : '');
      pushBanner({ kind: 'leader', user: u, top: T.leaderTop, main: T.newLeader + ': ' + u.name + '!', sub: sub || st + ' — en coşkulu misafir!', dur: 2.6, prio: 1 });
    }
    tagTimer = 0;
  }
  function shuffleLine() {
    if (line.length < 3) return;
    var rest = line.slice(1);
    LG.shuffle(rest);
    line = [line[0]].concat(rest);
    // ikinci en aktif kişiye mendil geçer (varsa)
    var top = board.top(8), cur = line[0], pick = null;
    for (var i = 0; i < top.length; i++) { var dd = byId.get(top[i].user.id); if (dd && dd !== cur) { pick = dd; break; } }
    if (!pick) { var reals = line.filter(function (x) { return !x.npc && x !== cur; }); pick = reals.length ? LG.pick(reals) : null; }
    if (pick) promote(pick, false, T.hostGave); else lastLeaderT = LG.time;
    pushTicker(T.shuffle, '🔀', '#ffd166');
    LG.sfx('whoosh');
    for (var k = 0; k < line.length; k++) { line[k].hop = 1; line[k].hopAmp = 16; }
  }

  // ---------------------------------------------------------------------------
  // Kurdele + takılar
  // ---------------------------------------------------------------------------
  var RIB = buildRibbon();
  function buildRibbon() {
    var S = CS, bo = -50 - 11 * S, go = 50 + 11 * S, sy = -58 * S + 6;
    var raw = [], i, n;
    function lin(x0, y0, x1, y1) { n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (i = 0; i < n; i++) raw.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); }
    lin(bo - 9, -14, bo, sy);
    var cy = -58, steps = 240;
    for (i = 0; i < steps; i++) { var t = i / steps, it = 1 - t; raw.push([it * it * bo + t * t * go, it * it * sy + 2 * it * t * cy + t * t * sy]); }
    lin(go, sy, go + 9, -14);
    raw.push([go + 9, -14]);
    var pts = [raw[0]], acc = 0, cum = [0];
    for (i = 1; i < raw.length; i++) { acc += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]); cum.push(acc); }
    var m = Math.floor(acc / 2), xs = new Float32Array(m + 1), ys = new Float32Array(m + 1), nx = new Float32Array(m + 1), ny = new Float32Array(m + 1), j = 0;
    for (i = 0; i <= m; i++) {
      var s = i * 2;
      while (j < raw.length - 2 && cum[j + 1] < s) j++;
      var f = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
      xs[i] = raw[j][0] + (raw[j + 1][0] - raw[j][0]) * f; ys[i] = raw[j][1] + (raw[j + 1][1] - raw[j][1]) * f;
    }
    for (i = 0; i <= m; i++) {
      var a = max(0, i - 1), b = min(m, i + 1), dx = xs[b] - xs[a], dy = ys[b] - ys[a], l = Math.hypot(dx, dy) || 1;
      nx[i] = -dy / l; ny[i] = dx / l;
    }
    return { x: xs, y: ys, nx: nx, ny: ny, n: m + 1, len: m * 2 };
  }
  function ribPoint(s, o) {
    var i = LG.clamp(Math.round(s / 2), 0, RIB.n - 1);
    var w = rib.wig * sin(i * 0.25 - LG.time * 16);
    o.x = RIB.x[i] + RIB.nx[i] * w; o.y = RIB.y[i] + RIB.ny[i] * w;
    return o;
  }
  // Takının kurdeledeki yeri: s = kurdele boyunca konum, row = kurdeleden içeri (aşağı) kaydırma
  function ribItemPos(it, o) {
    var s = it.cs != null ? it.cs : it.s;
    var i = LG.clamp(Math.round(s / 2), 0, RIB.n - 1);
    var w = rib.wig * sin(i * 0.25 - LG.time * 16) + (it.cr != null ? it.cr : it.row || 0);
    o.x = RIB.x[i] + RIB.nx[i] * w; o.y = RIB.y[i] + RIB.ny[i] * w;
    return o;
  }
  function itemR(type) { return (D.TAKI[type] || D.TAKI.c).r; }
  // Kurdele dolunca takılar 2-3 sıra olur ve biraz küçülür (yığın gibi üst üste binmesin)
  var ribScale = 1, ribRows = 1;
  function layoutRibbon() {
    var n = items.length;
    if (!n) return;
    var half = RIB.len / 2 - 10, sum = 0, i, w, r;
    for (i = 0; i < n; i++) sum += itemR(items[i].type) * 1.7;
    var R = 1, sc = min(1, 2 * half / sum);
    while (sc < 0.8 && R < 3) { R++; sc = min(1, R * 2 * half / sum); }
    ribRows = R; ribScale = max(0.55, sc);
    for (r = 0; r < R; r++) {
      var needR = 0, needL = 0, k = 0, first = -1;
      for (i = r; i < n; i += R) {
        w = itemR(items[i].type) * 1.7 * ribScale;
        if (k === 0) { needR += w / 2; needL += w / 2; first = i; } else if (k % 2) needR += w; else needL += w;
        k++;
      }
      if (first < 0) continue;
      var f = min(1, half / max(needR, needL, 1));
      var curR = itemR(items[first].type) * 1.7 * ribScale / 2 * f, curL = curR;
      k = 0;
      for (i = r; i < n; i += R) {
        var it = items[i];
        it.row = r * 21 * ribScale;
        if (k === 0) it.s = RIB.len / 2;
        else {
          w = itemR(it.type) * 1.7 * ribScale * f;
          if (k % 2) { it.s = RIB.len / 2 + curR + w / 2; curR += w; }
          else { it.s = RIB.len / 2 - curL - w / 2; curL += w; }
        }
        if (it.cs == null) { it.cs = it.s; it.cr = it.row; }
        k++;
      }
    }
  }
  function capItems() {
    var guard = 0;
    while (items.length > MAX_ITEMS && guard++ < 50) {
      var idx = [];
      for (var i = 0; i < items.length && idx.length < 4; i++) if (items[i].type === 'c' && !items[i].pending) idx.push(i);
      if (idx.length === 4) { // 4 çeyrek = 1 tam :)
        for (var k = 3; k >= 1; k--) items.splice(idx[k], 1);
        items[idx[0]].type = 't'; items[idx[0]].pop = 0;
      } else {
        for (var j = 0; j < items.length; j++) if (!items[j].pending && items[j].type !== 'k') { items.splice(j, 1); break; }
        if (j >= items.length) break;
      }
    }
    layoutRibbon();
  }
  var ipos = { x: 0, y: 0 };
  function itemWorld(it, o) {
    ribItemPos(it, o);
    o.x += couple.x; o.y += couple.y + itemR(it.type) * ribScale * 0.55;
    return o;
  }
  function addItem(type) {
    var it = { type: type, s: RIB.len / 2, pending: true, pop: 1, ph: Math.random() * TAU };
    items.push(it);
    capItems();
    return it;
  }

  // Uçan takılar (hediye edenin dansçısından kurdeleye)
  function launch(kind, from, type, delay, item) {
    if (flyers.length > 40) { if (item) { item.pending = false; item.pop = 0; } return; }
    flyers.push({ kind: kind, x0: from.x, y0: from.y - 60, t: -(delay || 0), dur: kind === 'rose' ? 0.8 : 0.95 + Math.random() * 0.2, type: type, item: item });
  }
  var fpos = { x: 0, y: 0 };
  function flyerTarget(f, o) {
    if (f.item) return itemWorld(f.item, o);
    if (f.kind === 'bangle') { o.x = couple.x - 50 - 26; o.y = couple.y - 92; return o; }
    o.x = couple.x + LG.rand(-30, 30) * 0; o.y = couple.y - 170; return o;
  }
  function flyerArrive(f) {
    var o = flyerTarget(f, fpos);
    if (f.kind === 'coin') {
      if (f.item) { f.item.pending = false; f.item.pop = 0; }
      rib.wig = min(5, rib.wig + 3); couplePop = 1;
      ui.burst(o.x, o.y, { count: f.type === 't' || f.type === 'k' ? 26 : 12, shape: 'circle', colors: ['#ffd34d', '#fff3b0', '#ffb703'], speed: 260, up: 60, gravity: 500, size: 8, life: 0.7 });
      LG.sfx('coin');
    } else if (f.kind === 'rose') {
      ui.burst(o.x, o.y - 20, { count: 14, colors: ['#ff4d6d', '#ff8fa3', '#c9184a', '#ffccd5'], speed: 280, up: 160, gravity: 380, size: 13, life: 1.7 });
      LG.sfx('pop');
    } else if (f.kind === 'bangle') {
      bangles = min(bangles + 1, 99); couplePop = 1;
      ui.burst(o.x, o.y, { count: 14, shape: 'circle', colors: ['#ffd34d', '#fff3b0'], speed: 220, up: 40, gravity: 400, size: 7, life: 0.6 });
      LG.sfx('bell');
    }
  }

  function giftFlavor(g) {
    for (var i = 0; i < D.GIFT_FLAVOR.length; i++) if (LG.giftIs(g, D.GIFT_FLAVOR[i].words)) return D.GIFT_FLAVOR[i].line;
    return '';
  }

  // ---------------------------------------------------------------------------
  // Sunucu anonsu (düğün sunucusu tarzı bant), büyük yazılar, havai fişek
  // ---------------------------------------------------------------------------
  function pushBanner(b) {
    b.t = 0;
    banners.push(b);
    while (banners.length > 5) {
      var di = -1, lowest = 99;
      for (var i = 0; i < banners.length; i++) if (banners[i].prio < lowest) { lowest = banners[i].prio; di = i; }
      banners.splice(di, 1);
    }
  }
  function startBanner(b) {
    if (b.kind === 'leader') { LG.sfx('levelup'); return; }
    var tier = b.tier || 2;
    LG.sfx(tier >= 4 ? 'fanfare' : tier === 3 ? 'levelup' : 'bell');
    var claps = tier >= 4 ? 5 : tier === 3 ? 3 : 2;
    for (var i = 0; i < claps; i++) setTimeout(function () { LG.sfx('clap'); }, 380 + i * 170);
    if (tier >= 3) cheerT = max(cheerT, 1.3);
  }
  // Tek satırlık olay şeridi (takip, paylaşım, gül...) — pistin alt kenarında, dansçıları kapatmaz
  function pushTicker(text, icon, color) {
    measureCtx.font = ui.font(28, 800);
    var w = min(900, measureCtx.measureText(text).width + 86);
    ticker.push({ text: text, icon: icon, color: color || '#fff', w: w, t: 0, dur: 2.4 });
    if (ticker.length > 4) ticker.shift();
  }
  function pushCallout(text, sub, color, dur) {
    callouts.push({ text: text, sub: sub || '', color: color || '#ffd34d', t: 0, dur: dur || 2.0 });
    if (callouts.length > 3) callouts.shift();
  }
  var FW_COLORS = ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff9f1c', '#ffffff'];
  function launchFirework(x, y) {
    if (rockets.length > 8) return;
    var x0 = x != null ? x : LG.rand(140, 940);
    rockets.push({ x0: x0, y0: 1210, x1: x0 + LG.rand(-110, 110), y1: y != null ? y : LG.rand(300, 640), t: 0, dur: LG.rand(0.55, 0.85), c: LG.pick(FW_COLORS) });
    LG.sfx('whoosh');
  }

  // ---------------------------------------------------------------------------
  // Oyun havası + oylama + tempo
  // ---------------------------------------------------------------------------
  var styleKw = {};
  STYLES.forEach(function (s, i) { styleKw[i] = s.kw; });
  function setStyle(idx, sub) {
    var prev = STY;
    styleIdx = idx; STY = STYLES[idx];
    prevSign = prev; signFlip = 0;
    if (!LG.music.style || prev.music !== STY.music) LG.music.play(STY.music);
    applyTempo();
    pushCallout('🎶 ' + T.styleWon + ' ' + STY.name + '!', sub || '', '#ffd34d', 2.2);
    LG.sfx('bell');
    for (var i = 0; i < 6; i++) setTimeout(function () { LG.sfx('drum'); }, 120 + i * 85);
    ui.burst(HCX, L.signY, { count: 46, speed: 650, up: 150 });
    for (var k = 0; k < line.length; k++) { line[k].hop = 1; line[k].hopAmp = 14; }
  }
  function resolveVote() {
    var best = -1, bestN = 0, tie = false;
    for (var i = 0; i < votes.length; i++) {
      if (votes[i] > bestN) { bestN = votes[i]; best = i; tie = false; }
      else if (votes[i] === bestN && bestN > 0) tie = true;
    }
    if (tie) { // berabere: o an çalan hava değilse son oy alan kazanır
      var top = []; for (var j = 0; j < votes.length; j++) if (votes[j] === bestN) top.push(j);
      best = top.indexOf(styleIdx) >= 0 ? styleIdx : (top.indexOf(lastWinner) >= 0 ? lastWinner : LG.pick(top));
    }
    if (bestN > 0) {
      emptyWin = 0;
      if (best !== styleIdx) setStyle(best, bestN + ' oyla seçildi! 🗳️');
      else pushCallout('🎶 ' + STY.name + ' ' + T.styleKeep, bestN + ' oy 🗳️', '#ffd34d', 1.8);
    } else if (++emptyWin >= 2) {
      emptyWin = 0;
      var r = (styleIdx + LG.randi(1, STYLES.length - 1)) % STYLES.length;
      setStyle(r, T.davulcuPick + ' ' + STYLES[r].title + ' 🥁');
    }
    for (var k = 0; k < votes.length; k++) votes[k] = 0;
    voters.clear(); voteT = 0;
  }
  function castVote(u, si) {
    var prev = voters.get(u.id);
    if (prev === si) return false;
    if (prev != null) votes[prev] = max(0, votes[prev] - 1);
    voters.set(u.id, si); votes[si]++; lastWinner = si;
    return true;
  }
  function applyTempo() {
    tempoMul = 1 + heat * 0.32 + (davSpin > 0 ? 0.12 : 0);
    LG.music.setTempo(STY.tempo * tempoMul);
  }
  function davulcuCostu(sub) {
    davSpin = 1.7; heat = 0.6; heatLockUntil = LG.time + 5; nextCostuT = LG.time + 15;
    pushCallout(T.davulMax, sub || '❤️ Beğeniler davulcuyu uçurdu!', '#ff9f1c', 2.2);
    ui.shake(12, 0.5);
    ui.burst(DAV.x, DAV.y - 80, { count: 8, shape: 'emoji', emoji: '🔥', speed: 380, up: 260, gravity: 700, size: 16, life: 1.3 });
    ui.burst(DAV.x, DAV.y - 80, { count: 30, speed: 520, up: 200 });
    for (var i = 0; i < 10; i++) setTimeout(function () { LG.sfx('drum', { gap: 40 }); }, i * 70);
    for (var k = 0; k < line.length; k++) { line[k].hop = 1; line[k].hopAmp = 18; }
  }

  // ---------------------------------------------------------------------------
  // Özel anlar: gelin-damat oyunu, bilezik seti, araba anahtarı, final
  // ---------------------------------------------------------------------------
  function queueMoment(m) {
    moments.push(m);
    if (moments.length > 4) { for (var i = 0; i < moments.length; i++) if (moments[i].type === 'dance') { moments.splice(i, 1); break; } }
    if (moments.length > 4) moments.splice(1, 1);
  }
  function startMoment(m) {
    moment = m; m.t = 0; m.fw = 0.3; m.hz = 0;
    if (m.type === 'dance') { m.dur = 8; pushCallout(T.coupleDance, names[0] + ' ❤ ' + names[1], '#ffd34d', 2.4); LG.sfx('fanfare'); }
    else if (m.type === 'bilezik') { m.dur = 9; ui.flash('#fff3b0', 0.4); LG.sfx('mega'); ui.shake(14, 0.6); }
    else if (m.type === 'araba') {
      m.dur = 6.5; ui.rain({ count: 220 }); ui.flash('#ffffff', 0.4); ui.shake(16, 0.7); LG.sfx('mega');
      setTimeout(function () { LG.sfx('honk'); }, 300); setTimeout(function () { LG.sfx('honk'); }, 2600); setTimeout(function () { LG.sfx('honk'); }, 2900);
    }
  }
  function endMoment() {
    moment = null; couple.off = false; couple.x = HOME.x; couple.y = HOME.y; couple.armsUp = false; couple.flare = 0; couple.by = 0;
    spot = 0; car.active = false;
  }
  function coupleDance(mt, dur, cx) {
    var toT = 1.0, backT = 1.0, p;
    couple.off = true; couple.flare = 0; couple.by = 0;
    if (mt < toT) {
      p = LG.ease.inOutSine(mt / toT);
      couple.x = LG.lerp(HOME.x, cx, p); couple.y = LG.lerp(HOME.y, FLOOR_Y, p) - sin(p * PI) * 110; couple.armsUp = false;
    } else if (mt > dur - backT) {
      p = LG.ease.inOutSine(min(1, (mt - dur + backT) / backT));
      couple.x = LG.lerp(cx, HOME.x, p); couple.y = LG.lerp(FLOOR_Y, HOME.y, p) - sin(p * PI) * 110; couple.armsUp = false;
    } else {
      var d2 = mt - toT;
      couple.x = cx + sin(d2 * 1.5) * 85; couple.y = FLOOR_Y;
      couple.armsUp = Math.floor(d2 * 1.1) % 2 === 0;
      couple.flare = abs(sin(d2 * 3));
      couple.by = -abs(sin(d2 * PI * 1.8)) * 9;
    }
    spot = max(0, min(1, mt / 0.6, (dur - mt) / 0.6));
  }
  function updateMoment(dt) {
    if (phase === 'finale') return;
    if (!moment) { if (moments.length) startMoment(moments.shift()); else return; }
    var m = moment;
    m.t += dt;
    if (m.type === 'dance' || m.type === 'bilezik') {
      coupleDance(m.t, m.dur, 540);
      m.fw -= dt;
      if (m.fw <= 0 && m.t > 0.8 && m.t < m.dur - 1) { m.fw = m.type === 'bilezik' ? 0.42 : 0.95; launchFirework(); }
      m.hz -= dt;
      if (m.hz <= 0 && m.t > 1) { m.hz = 0.35; ui.burst(couple.x + LG.rand(-60, 60), couple.y - 200, { count: 1, shape: 'emoji', emoji: LG.pick(['💖', '💕', '✨']), speed: 60, up: 160, gravity: -40, size: 16, life: 1.6 }); }
      if (m.type === 'bilezik') cheerT = max(cheerT, 0.3);
    } else if (m.type === 'araba') {
      var p = m.t / m.dur;
      car.active = true; car.x = LG.lerp(-340, W + 340, p);
      cheerT = max(cheerT, 0.3);
      m.fw -= dt;
      if (m.fw <= 0) { m.fw = 0.5; ui.burst(car.x - 160, 1050, { count: 2, shape: 'emoji', emoji: LG.pick(['💖', '🎉', '✨']), speed: 120, up: 120, gravity: -30, size: 15, life: 1.4 }); }
    }
    if (m.t >= m.dur) endMoment();
  }

  function startFinale() {
    if (phase === 'finale') return;
    phase = 'finale'; finT = 0;
    if (moment) endMoment();
    moments = moments.filter(function (m) { return m.type !== 'dance'; });
    var top = board.top(3).filter(function (e) { return !e.user.__npc; });
    var ld = line[0] && !line[0].npc ? line[0].u : null;
    summary = { no: roundNo, names: names.slice(), totals: JSON.parse(JSON.stringify(totals)), leader: ld, stars: top.map(function (e) { return e.user; }), guests: guestsRound.size, nextShown: false };
    pushCallout(T.finale, names[0] + ' ❤ ' + names[1], '#ffd34d', 2.4);
    LG.music.play('party'); LG.music.setTempo(1.12);
    LG.sfx('mega'); ui.rain({ count: 160 }); ui.shake(10, 0.5);
  }
  function updateFinale(dt) {
    finT += dt;
    coupleDance(finT, FINALE_LEN - 0.3, 540);
    if (finT >= FINALE_LEN - 0.3) { couple.off = false; couple.x = HOME.x; couple.y = HOME.y; spot = 0; }
    if (Math.floor(finT / 0.55) !== Math.floor((finT - dt) / 0.55) && finT < FINALE_LEN - 2) launchFirework();
    if (Math.floor(finT / 2.6) !== Math.floor((finT - dt) / 2.6)) { cheerT = 1.1; LG.sfx('clap'); }
    if (finT > 12.6 && !summary.nextShown) { summary.nextShown = true; pushCallout(T.nextWedding, '', '#ffffff', 2.6); }
    if (finT >= FINALE_LEN) newRound();
  }
  function newRound() {
    roundNo++; roundT = 0; phase = 'dance'; finT = 0;
    coupleIdx++; names = pickNames();
    if (items.length) ui.burst(couple.x, couple.y - 120, { count: 50, shape: 'circle', colors: ['#ffd34d', '#fff3b0', '#ffb703'], speed: 500, up: 200, size: 9 });
    items = []; flyers = flyers.filter(function (f) { return !f.item; }); bangles = 0;
    defter = []; totals = { c: 0, y: 0, t: 0, b: 0, k: 0 }; guestsRound = new Set();
    board.reset(); lastLeaderT = -99;
    for (var k = 0; k < votes.length; k++) votes[k] = 0;
    voters.clear(); voteT = 0; emptyWin = 0;
    endMoment();
    LG.music.play(STY.music); applyTempo();
    pushCallout('💍 ' + T.wedding.toUpperCase() + ' #' + roundNo + ' ' + T.started, names[0] + ' ❤ ' + names[1], '#ffd34d', 2.6);
    LG.sfx('fanfare');
    summary = null;
  }

  // ---------------------------------------------------------------------------
  // Olaylar
  // ---------------------------------------------------------------------------
  function showBubble(d, text) {
    if (!text || LG.time - thr.bubble < 0.12) return;
    thr.bubble = LG.time;
    for (var i = 0; i < bubbles.length; i++) if (bubbles[i].d === d) { bubbles.splice(i, 1); break; }
    if (bubbles.length >= 6) bubbles.shift();
    text = shortText(text, 22);
    var c = mk(10, 10), g = c.getContext('2d');
    g.font = ui.font(24, 800);
    var w = Math.ceil(g.measureText(text).width) + 26, h = 38;
    c.width = w + 4; c.height = h + 12;
    g = c.getContext('2d');
    ui.roundRect(g, 2, 2, w, h, 16); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
    g.beginPath(); g.moveTo(w / 2 - 7, h + 1); g.lineTo(w / 2 + 2, h + 11); g.lineTo(w / 2 + 8, h + 1); g.closePath(); g.fill();
    g.font = ui.font(24, 800); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3a1020';
    g.fillText(text, w / 2 + 2, h / 2 + 3);
    bubbles.push({ d: d, img: c, t: 0, life: 2.6 });
  }

  LG.on('chat', function (e) {
    var u = e.user;
    var d = ensureDancer(u);
    d.lastAct = LG.time;
    board.add(u, 3);
    if (!e.flagged) showBubble(d, e.text);
    var si = LG.cmd.match(e.raw, styleKw);
    if (si != null) {
      si = +si;
      if (phase === 'dance' && castVote(u, si) && LG.time - thr.vote > 0.22) {
        thr.vote = LG.time;
        ui.float('+1 ' + STYLES[si].title, d.x, d.y - 110, { color: '#ffd34d', size: 30, life: 1.1, vy: -90 });
        LG.sfx('tick');
      }
    }
    if (LG.cmd.has(e.raw, ['hey', 'hoy', 'oley', 'hop', 'heyy', 'yallah', 'haydi', 'hadi'])) {
      d.hop = 1; d.hopAmp = 30;
      if (LG.time - thr.hey > 0.2) { thr.hey = LG.time; ui.float(T.hey, d.x, d.y - 120, { color: '#fff', size: 34, life: 0.9, vy: -140 }); LG.sfx('clap'); }
    }
    if (LG.cmd.has(e.raw, ['davul', 'davulcu', 'tokmak'])) { heat = min(1, heat + 0.04); LG.sfx('drum'); }
    if (LG.cmd.has(e.raw, ['zurna', 'zurnacı', 'zurnaci'])) emitNotes(4);
    if (LG.cmd.has(e.raw, ['alkış', 'alkis', 'alkışlar', 'alkislar'])) LG.sfx('clap');
  });

  LG.on('like', function (e) {
    var u = e.user, n = e.count;
    board.add(u, min(n, 10) * 0.5);
    heat = min(1.05, heat + n * (LG.time < heatLockUntil || davSpin > 0 ? 0.003 : 0.011));
    var d = byId.get(u.id);
    if (d) {
      d.lastAct = LG.time;
      if (d.hop <= 0) { d.hop = 1; d.hopAmp = 9; }
      if (LG.time - thr.heart > 0.16) { thr.heart = LG.time; ui.float('❤', d.x + LG.rand(-10, 10), d.y - 95, { color: '#ff4d6d', size: 30, life: 0.9, vy: -110 }); }
    }
  });

  LG.on('gift', function (e) {
    var u = e.user, g = e.gift, tier = g.tier, n = max(1, g.count | 0);
    var d = ensureDancer(u);
    d.giftT = LG.time; d.lastAct = LG.time; d.hop = 1; d.hopAmp = 20;
    tagTimer = 0;
    if (tier <= 1) {
      for (var r = 0; r < min(n, 4); r++) launch('rose', d, null, r * 0.12, null);
      if (LG.time - thr.rose > 1.2) { thr.rose = LG.time; pushTicker(u.name + ' ' + T.rose, '🌹', '#ffb3c1'); }
      return;
    }
    var type = tier === 2 ? 'c' : tier === 3 ? 'y' : tier === 4 ? 't' : tier === 5 ? 'b' : 'k';
    var info = D.TAKI[type];
    var flavor = giftFlavor(g);
    // Büyük (tam ekran) anlar: aynı kişi ekranı tekelleyemez (bekleme + oturum yumuşak sınırı + sunucu "sadeleştir")
    var big = spotOk(u, tier, g.total);
    if (!big) softcapThanks(u);
    if (type === 'b') {
      for (var b = 0; b < 3; b++) launch('bangle', d, 'b', b * 0.18, null);
      if (big) queueMoment({ type: 'bilezik', user: u });
    } else if (type === 'k') {
      launch('coin', d, 'k', 0, addItem('k'));
      if (big) queueMoment({ type: 'araba', user: u });
    } else {
      for (var k = 0; k < min(n, 8); k++) launch('coin', d, type, k * 0.14, addItem(type));
    }
    if (tier >= 4 && big) {
      ui.rain({ count: tier >= 5 ? 60 : 90, colors: ['#ffd34d', '#ffe680', '#fff3b0', '#f5b700'], size: 13 });
      ui.burst(couple.x, couple.y - 150, { count: 12, shape: 'emoji', emoji: '✨', speed: 420, up: 200, gravity: 500, size: 14, life: 1.3 });
      ui.shake(7, 0.35);
    }
    totals[type] += n;
    // Takı defteri: aynı kişinin seri hediyesi tek satırda toplanır
    var top0 = defter[0];
    if (top0 && top0.u === u && top0.type === type && LG.time - top0.t < 12) { top0.n += n; top0.t = LG.time; }
    else {
      defter.unshift({ u: u, type: type, n: n, t: LG.time });
      if (defter.length > 5) defter.length = 5;
    }
    if (mergeBanner(u, type, n)) return;
    pushBanner({
      kind: 'taki', tier: tier, user: u, type: type, n: n, prio: big ? tier : 2, big: tier >= 4 && big,
      top: tier >= 4 && big ? T.bigTop : T.takiTop,
      main: takiMain(u, n, type),
      sub: (flavor ? flavor + ' · ' : '(' + LG.pick(D.RELATIONS) + ') · ') + LG.pick(D.CHEERS),
      dur: !big ? 2.6 : tier >= 6 ? 6 : tier >= 5 ? 5 : tier >= 4 ? 3.6 : tier === 3 ? 3 : 2.6,
    });
  });
  function takiMain(u, n, type) {
    return ablative(u.name) + ' ' + (n > 1 ? n + ' ' : 'bir ') + D.TAKI[type].name + '!';
  }
  // Aynı kişiden aynı takı (hediye serisi) gelirse yeni anons açmak yerine sayıyı büyüt
  function mergeBanner(u, type, n) {
    var cands = banner ? [banner].concat(banners) : banners;
    for (var i = 0; i < cands.length; i++) {
      var b = cands[i];
      if (b.kind !== 'taki' || b.user !== u || b.type !== type) continue;
      if (b === banner && b.t > b.dur - 0.5) continue;
      b.n += n; b.main = takiMain(u, b.n, type); b.bump = 1;
      if (b === banner) b.t = min(b.t, 0.45);
      return true;
    }
    return false;
  }
  // Büyük an izni. Ortak ui.spotlightAllowed, oturum sınırını (softcap) bu hediye EKLENDİKTEN sonraki
  // toplamla kontrol ediyor; tek seferde 5000+ jetonluk ilk hediye (ör. Aslan) hiç kutlanmıyordu.
  // Burada hediyeden ÖNCEKİ toplam kullanılır: sınırı ilk aşan hediye tam kutlanır, sonrakiler sadeleşir.
  // Yarım altın (kademe 3) zaten küçük bir an; bekleme süresini harcamasın diye sadece 4+ kontrol edilir.
  function spotOk(u, tier, total) {
    if (tier < 4) return true;
    var c = u.coins, ok;
    u.coins = max(0, c - (total || 0));
    try { ok = ui.spotlightAllowed(u, tier); } finally { u.coins = c; }
    return ok;
  }
  var capThanked = new Set();
  function softcapThanks(u) {
    var cap = LG.config.softcap;
    if (cap > 0 && u.coins > cap && !capThanked.has(u.id)) {
      capThanked.add(u.id);
      pushTicker(u.name + ', efsanesin! Çok teşekkürler 💖', '👑', '#ffd166');
    }
  }

  LG.on('follow', function (e) {
    board.add(e.user, 4);
    pushTicker(e.user.name + ' ' + T.follow, '💌', '#ffc8dd');
    LG.sfx('heart');
    var d = byId.get(e.user.id);
    if (d) { d.hop = 1; d.hopAmp = 16; d.lastAct = LG.time; }
  });
  LG.on('share', function (e) {
    board.add(e.user, 6);
    pushTicker(e.user.name + ' ' + T.share, '📣', '#a0e7ff');
    var d = byId.get(e.user.id);
    var x = d ? d.x : HCX, y = d ? d.y - 60 : 900;
    ui.burst(x, y, { count: 50, speed: 650, up: 250 });
    LG.sfx('whoosh');
    if (d) { d.hop = 1; d.hopAmp = 20; d.lastAct = LG.time; }
  });

  // ---------------------------------------------------------------------------
  // Sunucu kısayolları
  // ---------------------------------------------------------------------------
  LG.onKey('n', 'Gelin-damat oynasın (özel an)', function () { queueMoment({ type: 'dance' }); });
  LG.onKey('b', 'Halaybaşını yeniden seç + sırayı karıştır', function () { shuffleLine(); });
  LG.onKey('t', 'Oyun havasını değiştir (sıradaki)', function () { setStyle((styleIdx + 1) % STYLES.length, 'Sunucu seçti 🎙️'); voteT = 0; for (var k = 0; k < votes.length; k++) votes[k] = 0; voters.clear(); });
  LG.onKey('y', 'Düğünü bitir → final + yeni düğün', function () { if (phase === 'finale') finT = max(finT, FINALE_LEN - 0.5); else startFinale(); });
  LG.onKey('k', 'Davulcuyu coştur', function () { if (davSpin <= 0) davulcuCostu('🎙️ Sunucu işaret verdi, davulcu coştu!'); });

  // ---------------------------------------------------------------------------
  // Notalar (zurna)
  // ---------------------------------------------------------------------------
  function emitNotes(n) {
    for (var i = 0; i < n && notes.length < 24; i++) {
      notes.push({ x: ZUR.x + 6 + LG.rand(-6, 6), y: ZUR.y - 34 * ZUR.s, vx: LG.rand(-30, 60), vy: LG.rand(-90, -60), t: 0, life: LG.rand(1.2, 1.8), ch: Math.random() < 0.5 ? '♪' : '♫', c: LG.pick(['#ffd34d', '#ffffff', '#ffb3c1', '#a0e7ff']) });
    }
  }

  // ---------------------------------------------------------------------------
  // Güncelleme
  // ---------------------------------------------------------------------------
  var bps = 112 / 60;
  function musicBpm() { return STY.music === 'horon' ? 150 : STY.music === 'party' ? 124 : 112; }
  function update(dt) {
    var i, d;
    if (phase === 'dance') {
      roundT += dt;
      voteT += dt;
      if (voteT >= VOTE_LEN) resolveVote();
      if (roundT >= ROUND_LEN) startFinale();
    } else updateFinale(dt);
    updateMoment(dt);

    joinRate *= Math.exp(-dt); // ≈ son 1 sn'deki yeni misafir sayısı
    // tempo
    if (davSpin > 0) davSpin = max(0, davSpin - dt);
    heat = max(0, heat - dt * (0.045 + heat * 0.07));
    if (heat >= 1 && davSpin <= 0 && LG.time >= nextCostuT) davulcuCostu();
    tempoTimer -= dt;
    if (tempoTimer <= 0) { tempoTimer = 0.2; applyTempo(); }
    bps = musicBpm() / 60 * STY.tempo * tempoMul;
    var visBps = STY.id === 'horon' ? bps / 2.1 : bps / (STY.music === 'party' ? 1.6 : 1.4);
    beatPh += dt * visBps;
    waveT += dt * 1.7 * tempoMul;
    if (cheerT > 0) cheerT -= dt;
    if (signFlip < 1) signFlip = min(1, signFlip + dt / 0.6);
    if (couplePop > 0) couplePop = max(0, couplePop - dt * 2.5);
    rib.wig = max(0, rib.wig - dt * 5);

    // hat
    var tgt = LG.clamp(P.len / (line.length + 7), 32, 52);
    spacing += (tgt - spacing) * min(1, dt * 2);
    headS += dt * 26 * STY.speed * tempoMul * (phase === 'finale' ? 0.5 : 1);
    for (i = 0; i < line.length; i++) {
      d = line[i];
      d.idx = i;
      var diff = i - d.slot;
      if (diff !== 0) {
        var ad = abs(diff), stp = min(ad, min(max(ad * 5, 1.2), 26) * dt);
        d.slot += diff > 0 ? stp : -stp;
        if (abs(i - d.slot) < 0.002) d.slot = i;
      }
      if (d.promo && d.slot < 0.6) {
        d.promo = false;
        ui.burst(d.x, d.y - 70, { count: 34, colors: ['#e3061b', '#ff4d6d', '#ffd34d', '#ffffff'], speed: 420, up: 180 });
        LG.sfx('fanfare');
      }
      pathPos(headS - d.slot * spacing, tmpPos);
      d.x = tmpPos.x; d.y = tmpPos.y; d.dir = tmpPos.dir;
      if (d.hop > 0) d.hop = max(0, d.hop - dt * 2.2);
    }
    // masaya gidenler
    for (i = walkers.length - 1; i >= 0; i--) {
      var w = walkers[i];
      w.t += dt;
      if (w.t >= w.dur) {
        walkers.splice(i, 1);
        if (w.seat && w.seat.d === w.d) seated.push({ d: w.d, seat: w.seat, t: 0 });
      }
    }
    for (i = seated.length - 1; i >= 0; i--) {
      var st = seated[i];
      st.t += dt;
      if (st.t > 50) { st.seat.d = null; seated.splice(i, 1); }
    }
    // baloncuklar
    for (i = bubbles.length - 1; i >= 0; i--) { bubbles[i].t += dt; if (bubbles[i].t >= bubbles[i].life || bubbles[i].d.idx == null || line[bubbles[i].d.idx] !== bubbles[i].d) bubbles.splice(i, 1); }
    // uçan takılar
    for (i = flyers.length - 1; i >= 0; i--) {
      var f = flyers[i];
      f.t += dt;
      if (f.t >= f.dur) { flyerArrive(f); flyers.splice(i, 1); }
    }
    var ke = min(1, dt * 5);
    for (i = 0; i < items.length; i++) {
      var itm = items[i];
      if (itm.pop < 1) itm.pop = min(1, itm.pop + dt * 3);
      itm.cs += (itm.s - itm.cs) * ke; itm.cr += (itm.row - itm.cr) * ke;
    }
    // havai fişek
    for (i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.t += dt;
      if (r.t >= r.dur) {
        rockets.splice(i, 1);
        ui.burst(r.x1, r.y1, { count: 40, shape: 'circle', colors: [r.c, '#ffffff', r.c, LG.pick(FW_COLORS)], speed: 430, up: 0, gravity: 230, life: 1.25, size: 9 });
        LG.sfx('boom', { gap: 300 });
      }
    }
    // notalar
    noteTimer -= dt;
    if (noteTimer <= 0) { noteTimer = 0.55 / max(0.5, tempoMul * STY.tempo); emitNotes(1); }
    for (i = notes.length - 1; i >= 0; i--) {
      var nt = notes[i];
      nt.t += dt; nt.x += nt.vx * dt; nt.y += nt.vy * dt; nt.vx += sin(nt.t * 6) * 40 * dt;
      if (nt.t > nt.life) notes.splice(i, 1);
    }
    // banner + büyük yazı
    if (!banner && banners.length) { banner = banners.shift(); startBanner(banner); }
    if (banner) {
      banner.t += dt * (banners.length > 2 ? 1.6 : banners.length > 0 ? 1.2 : 1);
      if (banner.bump) banner.bump = max(0, banner.bump - dt * 3);
      if (banner.t >= banner.dur) banner = null;
    }
    if (!tick && ticker.length) tick = ticker.shift();
    if (tick) { tick.t += dt * (ticker.length > 1 ? 1.6 : 1); if (tick.t >= tick.dur) tick = null; }
    if (!callout && callouts.length) callout = callouts.shift();
    if (callout) { callout.t += dt; if (callout.t >= callout.dur) callout = null; }

    // halaybaşı + isim etiketleri
    leaderTimer -= dt;
    if (leaderTimer <= 0) { leaderTimer = 2; if (phase === 'dance') checkLeader(false); retireIdle(); }
    tagTimer -= dt;
    if (tagTimer <= 0) { tagTimer = 0.4; pickTags(); }
  }

  // İsim etiketleri: öncelik sırası (halaybaşı → en yeni/aktif → liderler → NPC). Çizimde çakışanlar atlanır.
  var tagArr = [], tagOrder = [], tagRects = [];
  function tagKey(d) { return max(d.lastAct, d.giftT) + (d.top ? 8 : 0); }
  function pickTags() {
    tagArr.length = 0;
    var now = LG.time, i, d;
    for (i = 0; i < line.length; i++) { line[i].tag = false; line[i].top = false; }
    var top = board.top(3);
    for (i = 0; i < top.length; i++) { d = byId.get(top[i].user.id); if (d) d.top = true; }
    for (i = 1; i < line.length; i++) {
      d = line[i];
      if (!d.npc && (d.top || now - d.lastAct < 25 || now - d.giftT < 40)) tagArr.push(d);
    }
    tagArr.sort(function (a, b) { return tagKey(b) - tagKey(a); });
    tagOrder.length = 0;
    if (line[0]) { line[0].tag = true; tagOrder.push(line[0]); }
    for (i = 0; i < tagArr.length && tagOrder.length < TAG_POOL; i++) { tagArr[i].tag = true; tagOrder.push(tagArr[i]); }
    if (realCount < 6) for (i = 1; i < line.length; i++) if (line[i].npc) { line[i].tag = true; tagOrder.push(line[i]); }
  }
  function tagHit(x0, y0, x1, y1) {
    for (var i = 0; i < tagRects.length; i += 4) {
      if (x0 < tagRects[i + 2] && x1 > tagRects[i] && y0 < tagRects[i + 3] && y1 > tagRects[i + 1]) return true;
    }
    return false;
  }
  function drawTags(ctx) {
    tagRects.length = 0;
    var drawn = 0;
    for (var i = 0; i < tagOrder.length && drawn < MAX_TAGS; i++) {
      var d = tagOrder[i];
      if (line[d.idx] !== d || !d.tag) continue;
      var isL = d.idx === 0, ty = d.y + d.dy - 84, u = d.u, size = 22, col = '#ffffff', bgc = null;
      if (isL) { u = hbTag(d.u); size = 25; col = '#4a0a00'; bgc = '#ffd34d'; ty -= 6; }
      else if (d.npc) { size = 19; col = '#d8d0c8'; }
      else if (LG.time - d.giftT < 40) col = '#ffd34d';
      var c = ui.nameTag(u, size, col, bgc);
      var hw = c.width / 2, hh = c.height / 2;
      var x = LG.clamp(d.x, 34 + hw, W - 34 - hw);
      var top = ty - hh - (isL ? 26 : 0);
      if (!isL && tagHit(x - hw + 6, top + 4, x + hw - 6, ty + hh - 4)) { d.tagA = 0; continue; }
      tagRects.push(x - hw, top, x + hw, ty + hh);
      drawn++;
      d.tagA = min(1, (d.tagA || 0) + 0.12);
      ctx.globalAlpha = d.tagA;
      ctx.drawImage(c, Math.round(x - hw), Math.round(ty - hh));
      if (isL) ui.text(ctx, T.halaybasi, x, ty - 30, { size: 18, color: '#ffd34d' });
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------------
  // Çizim — dünya
  // ---------------------------------------------------------------------------
  function drawLights(ctx, t) {
    var pulse = 0.82 + 0.18 * Math.pow(1 - frac(beatPh), 3);
    for (var i = 0; i < bulbs.length; i++) {
      var b = bulbs[i];
      ctx.globalAlpha = (0.55 + 0.45 * sin(t * 1.7 + b.ph)) * pulse;
      ctx.drawImage(glows[b.c], b.x - 22, b.y - 22);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      ctx.globalAlpha = 0.3 + 0.7 * abs(sin(t * st.sp + st.ph));
      ctx.fillRect(st.x, st.y, 2.4, 2.4);
    }
    ctx.globalAlpha = 1;
  }

  function computeDancerPose(d, cheer) {
    resetPose();
    var p = beatPh * (STY.id === 'zeybek' ? 1 : 2) - d.idx * 0.035;
    var handY = stylePose(STY.id, p);
    var linked = handY != null && !cheer;
    if (cheer) {
      var w = sin(LG.time * 9 + d.idx);
      pose.hlx = -17; pose.hly = -97 + w * 4; pose.hrx = 17; pose.hry = -97 - w * 4;
      pose.by = -abs(sin(LG.time * 7 + d.idx * 0.3)) * 8; pose.rot = 0;
    }
    if (d.hop > 0) {
      pose.by -= sin(d.hop * PI) * d.hopAmp;
      if (d.hopAmp >= 20) { pose.hlx = -18; pose.hly = -98; pose.hrx = 18; pose.hry = -98; linked = false; }
    }
    var sNow = DS;
    // el ele tutuşma (komşuya serçe parmak)
    var leftUsed = false, rightUsed = false;
    if (linked) {
      var lim = spacing * 1.75, lim2 = lim * lim;
      for (var k = -1; k <= 1; k += 2) {
        var n = line[d.idx + k];
        if (!n || n.hop > 0.2) continue;
        var dx = n.x - d.x, dy = n.y - d.y;
        if (dx * dx + dy * dy > lim2) continue;
        var lx = dx / 2 / sNow - pose.bx, ly = (dy / 2 / sNow + handY - pose.by) / pose.sq;
        var useLeft = dx < 0 ? !leftUsed : rightUsed;
        if (useLeft && !leftUsed) { pose.hlx = lx; pose.hly = ly; pose.elL = STY.id === 'halay' ? 1 : 0; leftUsed = true; }
        else if (!rightUsed) { pose.hrx = lx; pose.hry = ly; pose.elR = STY.id === 'halay' ? 1 : 0; rightUsed = true; }
      }
    }
    if (d.idx === 0 && !cheer) { // halaybaşı mendil sallar
      var wv = LG.time * 6;
      var side = leftUsed && !rightUsed ? 1 : rightUsed && !leftUsed ? -1 : d.dir;
      if (side > 0) { pose.hrx = 22 + cos(wv) * 5; pose.hry = -100 + sin(wv) * 6; pose.elR = 0; }
      else { pose.hlx = -22 - cos(wv) * 5; pose.hly = -100 + sin(wv) * 6; pose.elL = 0; }
      pose.mendil = side;
    }
    if (d.hop > 0.3 && d.hopAmp >= 20) pose.wow = true;
  }

  function drawDancer(ctx, d) {
    var age = LG.time - d.born;
    var s = DS * (age < 0.45 ? max(0.05, LG.ease.outBack(age / 0.45)) : 1);
    computeDancerPose(d, cheerT > 0);
    d.dy = pose.by * s;
    ctx.save();
    ctx.translate(d.x, d.y);
    if (d.idx === 0) { // halaybaşı ışığı
      ctx.fillStyle = 'rgba(255,211,77,0.45)';
      ctx.beginPath(); ctx.ellipse(0, 2, 30, 9, 0, 0, TAU); ctx.fill();
    } else if (LG.time - d.giftT < 30) {
      ctx.strokeStyle = 'rgba(255,211,77,0.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 2, 22, 7, 0, 0, TAU); ctx.stroke();
    }
    ctx.scale(s, s);
    drawFigure(ctx, d.look, pose);
    ctx.restore();
  }

  function drawWalker(ctx, w) {
    var p = min(1, w.t / w.dur), e = LG.ease.inOutSine(p);
    var x = LG.lerp(w.x0, w.x1, e), y = LG.lerp(w.y0, w.y1, e);
    resetPose();
    var st = sin(w.t * 12);
    pose.lf = -6 + st * 5; pose.rf = 6 - st * 5; pose.by = -abs(st) * 3;
    pose.hlx = -14 - st * 3; pose.hly = -36; pose.hrx = 14 + st * 3; pose.hry = -36;
    ctx.save();
    ctx.globalAlpha = w.seat ? 1 : max(0, 1 - p * 1.1);
    ctx.translate(x, y); ctx.scale(DS * 0.92, DS * 0.92);
    drawFigure(ctx, w.d.look, pose);
    ctx.restore();
  }

  function drawSeated(ctx) {
    for (var i = 0; i < seated.length; i++) {
      var s = seated[i], a = s.t > 46 ? max(0, (50 - s.t) / 4) : 1;
      resetPose();
      var sw = sin(LG.time * 2 + i);
      pose.bx = sw * 1.2; pose.hlx = -14; pose.hly = -40; pose.hrx = 14; pose.hry = -40 + max(0, sw) * -14;
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(s.seat.x, s.seat.y); ctx.scale(0.62, 0.62);
      drawFigure(ctx, s.d.look, pose);
      ctx.restore();
    }
  }

  function drawDavulcu(ctx) {
    var bp = beatPh * 2, s = DAV.s;
    var spin = davSpin > 0 ? 1 - davSpin / 1.7 : -1;
    ctx.save();
    ctx.translate(DAV.x, DAV.y);
    if (spin >= 0) {
      ctx.translate(0, -sin(spin * PI) * 46);
      ctx.translate(0, -50 * s); ctx.rotate(LG.ease.inOutSine(spin) * TAU * 2); ctx.translate(0, 50 * s);
    }
    ctx.scale(s, s);
    resetPose();
    var a = sin(bp * PI);
    pose.bx = a * 1.4; pose.by = -abs(a) * 2.2 - heat * abs(sin(bp * 2 * PI)) * 4; pose.lfy = max(0, a) * 3; pose.rfy = max(0, -a) * 3;
    pose.noArms = true; pose.wow = heat > 0.85 || spin >= 0;
    drawFigure(ctx, DAV_LOOK, pose);
    ctx.translate(pose.bx, pose.by);
    var fr = frac(bp), hit = fr < 0.12;
    // davul
    ctx.fillStyle = '#b3001b'; ctx.fillRect(-19, -58, 38, 28);
    ctx.strokeStyle = '#f5e6c8'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (var i = 0; i <= 8; i++) ctx.lineTo(-19 + i * 4.75, i % 2 ? -33 : -55);
    ctx.stroke();
    ctx.fillStyle = '#7a0010'; ctx.fillRect(-19, -58, 38, 3); ctx.fillRect(-19, -33, 38, 3);
    ctx.fillStyle = hit ? '#fffbe8' : '#efd9b0';
    ctx.beginPath(); ell(ctx, 19, -44, 5, 14); ell(ctx, -19, -44, 5, 14); ctx.fill();
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.2; ctx.beginPath(); ell(ctx, 19, -44, 5, 14); ell(ctx, -19, -44, 5, 14); ctx.stroke();
    if (hit) { ctx.strokeStyle = 'rgba(255,240,200,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(26, -44, 8 + fr * 60, -0.8, 0.8); ctx.stroke(); }
    // tokmak (sağ) + çubuk (sol)
    var r1 = Math.pow(fr, 0.7), rhx = LG.lerp(22, 28, r1), rhy = LG.lerp(-52, -82, r1);
    var fr2 = frac(bp * 2 + 0.5), r2 = Math.pow(fr2, 0.7), lhx = LG.lerp(-23, -30, r2), lhy = LG.lerp(-48, -70, r2);
    ctx.strokeStyle = DAV_LOOK.sleeve; ctx.lineWidth = 5.6;
    ctx.beginPath(); ctx.moveTo(10, -58); ctx.lineTo(rhx, rhy); ctx.moveTo(-10, -58); ctx.lineTo(lhx, lhy); ctx.stroke();
    var ang1 = LG.lerp(0.5, -0.9, r1);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(rhx, rhy); ctx.lineTo(rhx + cos(ang1) * 4, rhy + sin(ang1) * 14 + 6); ctx.stroke();
    ctx.fillStyle = '#3d2a18'; ctx.beginPath(); circ(ctx, rhx + cos(ang1) * 4, rhy + sin(ang1) * 14 + 9, 4.5); ctx.fill();
    ctx.strokeStyle = '#c9a26b'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(lhx, lhy); ctx.lineTo(lhx + 2, lhy + 16); ctx.stroke();
    ctx.fillStyle = DAV_LOOK.skin; ctx.beginPath(); circ(ctx, rhx, rhy, 3.3); circ(ctx, lhx, lhy, 3.3); ctx.fill();
    ctx.restore();
    if (heat > 0.85 && Math.random() < 0.15) ui.burst(DAV.x + LG.rand(-20, 20), DAV.y - 120, { count: 1, shape: 'circle', colors: ['#a0e7ff'], speed: 120, up: 120, gravity: 700, size: 6, life: 0.6 });
  }

  function drawZurnaci(ctx) {
    var bp = beatPh, s = ZUR.s;
    ctx.save();
    ctx.translate(ZUR.x, ZUR.y); ctx.scale(s, s);
    resetPose();
    var a = sin(bp * PI);
    pose.rot = a * 0.09; pose.bx = a * 2; pose.by = -abs(sin(bp * 2 * PI)) * 1.5; pose.noArms = true;
    pose.lfy = max(0, a) * 3;
    drawFigure(ctx, ZUR_LOOK, pose);
    ctx.translate(pose.bx, pose.by); ctx.rotate(pose.rot);
    // zurna
    ctx.fillStyle = '#5a3315';
    ctx.beginPath(); ctx.moveTo(-1.6, -69); ctx.lineTo(1.6, -69); ctx.lineTo(5, -38); ctx.lineTo(11, -27); ctx.lineTo(-7, -27); ctx.lineTo(-2, -38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(-2.6, -66, 5.2, 2); ctx.fillRect(-6.5, -29, 17, 2.2);
    ctx.strokeStyle = ZUR_LOOK.sleeve; ctx.lineWidth = 5.6;
    ctx.beginPath(); ctx.moveTo(-10, -58); ctx.lineTo(-1, -56); ctx.moveTo(10, -58); ctx.lineTo(3, -46); ctx.stroke();
    ctx.fillStyle = ZUR_LOOK.skin; ctx.beginPath(); circ(ctx, -1, -56, 3.3); circ(ctx, 3, -46, 3.3); ctx.fill();
    ctx.restore();
  }

  var gownGrad = null;
  function drawBride(ctx, o) {
    var t = LG.time;
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 6, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(o.sway, o.by);
    var fl = sin(t * 2.2) * 2;
    // duvak (arka)
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath(); ctx.moveTo(-7, -90); ctx.bezierCurveTo(-27, -78, -31 + fl, -40, -28 + fl, -8); ctx.lineTo(24 + fl, -8); ctx.bezierCurveTo(27 + fl, -40, 22, -78, 7, -90); ctx.closePath(); ctx.fill();
    // etek
    if (!gownGrad) { gownGrad = ctx.createLinearGradient(0, -46, 0, 0); gownGrad.addColorStop(0, '#ffffff'); gownGrad.addColorStop(1, '#e9e3fb'); }
    var hw = 33 + o.flare * 9;
    ctx.fillStyle = gownGrad;
    ctx.beginPath(); ctx.moveTo(-10, -46);
    ctx.bezierCurveTo(-13, -30, -hw + 6, -14, -hw, 0);
    for (var i = 0; i < 7; i++) { var xa = -hw + 2 * hw * i / 7, xb = -hw + 2 * hw * (i + 1) / 7; ctx.quadraticCurveTo((xa + xb) / 2, 4 + o.flare * 2 * sin(t * 6 + i), xb, 0); }
    ctx.bezierCurveTo(hw - 6, -14, 13, -30, 10, -46); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(170,160,215,0.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-4, -40); ctx.lineTo(-15 - o.flare * 4, -2); ctx.moveTo(4, -40); ctx.lineTo(15 + o.flare * 4, -2); ctx.moveTo(0, -42); ctx.lineTo(0, -2); ctx.stroke();
    ctx.fillStyle = 'rgba(200,190,250,0.9)';
    ctx.beginPath(); circ(ctx, -18, -8, 1.4); circ(ctx, -9, -16, 1.4); circ(ctx, 8, -12, 1.4); circ(ctx, 19, -6, 1.4); circ(ctx, -2, -24, 1.4); circ(ctx, 12, -26, 1.2); circ(ctx, -12, -30, 1.2); ctx.fill();
    // korsaj + kırmızı kuşak
    ctx.fillStyle = '#ffffff'; ui.roundRect(ctx, -10, -62, 20, 18, 6); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,250,0.9)'; ctx.beginPath(); for (var pp = -6; pp <= 6; pp += 3) circ(ctx, pp, -60 + abs(pp) * 0.4, 0.9); ctx.fill();
    ctx.fillStyle = '#d10a1e'; ctx.fillRect(-11.5, -48.5, 23, 5.5);
    ctx.fillStyle = '#e3122a'; ctx.beginPath(); ell(ctx, -14, -47, 5, 3, -0.5); ell(ctx, -8, -47, 5, 3, 0.5); ctx.fill();
    ctx.strokeStyle = '#c1001a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-11, -45); ctx.lineTo(-15, -34); ctx.moveTo(-11, -45); ctx.lineTo(-8, -33); ctx.stroke();
    // kollar
    var olx = o.armsUp ? -17 : -11, oly = o.armsUp ? -97 : -42, ilx = o.armsUp ? 17 : o.handX, ily = o.armsUp ? -97 : -46;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-9, -58); ctx.lineTo(olx, oly); ctx.moveTo(9, -58); ctx.lineTo(ilx, ily); ctx.stroke();
    ctx.fillStyle = '#f6d2b5'; ctx.beginPath(); circ(ctx, olx, oly, 3.1); circ(ctx, ilx, ily, 3.1); ctx.fill();
    // bilezikler
    var nb = min(bangles, 6);
    for (var k = 0; k < nb; k++) {
      var bx = LG.lerp(-9, olx, 0.78 - k * 0.07), byy = LG.lerp(-58, oly, 0.78 - k * 0.07);
      ctx.strokeStyle = k % 2 ? '#ffd34d' : '#f4b400'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.ellipse(bx, byy, 3.6, 1.6, 0, 0, TAU); ctx.stroke();
    }
    // buket
    if (!o.armsUp) {
      ctx.fillStyle = '#2d6a4f'; ctx.beginPath(); circ(ctx, -12, -38, 4); circ(ctx, -6, -37, 3.5); ctx.fill();
      var bc = ['#ff4d6d', '#ffffff', '#ffb3c1', '#c9184a', '#ffffff'];
      for (var q = 0; q < 5; q++) { ctx.fillStyle = bc[q]; ctx.beginPath(); circ(ctx, -13 + (q % 3) * 3.6, -42 + Math.floor(q / 3) * 3.4, 2.6); ctx.fill(); }
    }
    // baş
    ctx.fillStyle = '#f6d2b5'; ctx.fillRect(-3, -66, 6, 6);
    ctx.beginPath(); ctx.arc(0, -76, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3b2314';
    ctx.beginPath(); ctx.arc(0, -78, 13.8, PI * 1.02, PI * 1.98); ctx.fill();
    ctx.beginPath(); circ(ctx, 0, -91, 6.5); ctx.fill();
    ctx.fillRect(-13.8, -79, 4, 12); ctx.fillRect(9.8, -79, 4, 12);
    // taç
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.moveTo(-9, -86); ctx.lineTo(-6, -93); ctx.lineTo(-3, -88); ctx.lineTo(0, -96); ctx.lineTo(3, -88); ctx.lineTo(6, -93); ctx.lineTo(9, -86); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff2d55'; ctx.beginPath(); circ(ctx, 0, -91, 1.5); ctx.fill();
    ctx.fillStyle = '#4cc9f0'; ctx.beginPath(); circ(ctx, -5.6, -89.5, 1.1); circ(ctx, 5.6, -89.5, 1.1); ctx.fill();
    // yüz (mutlu kapalı gözler)
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(-4.6, -76, 2.4, PI * 1.1, PI * 1.9); ctx.moveTo(7, -76.6); ctx.arc(4.6, -76, 2.4, PI * 1.1, PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -73, 4.2, PI * 0.15, PI * 0.85); ctx.stroke();
    ctx.fillStyle = 'rgba(255,90,110,0.45)'; ctx.beginPath(); circ(ctx, -8.4, -72.5, 2.8); circ(ctx, 8.4, -72.5, 2.8); ctx.fill();
    // duvak ön kenarı
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-9, -87); ctx.quadraticCurveTo(-17, -78, -16, -64); ctx.moveTo(9, -87); ctx.quadraticCurveTo(17, -78, 16, -64); ctx.stroke();
    ctx.restore();
  }

  function drawGroom(ctx, o) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(o.sway, o.by);
    ctx.fillStyle = '#1b2238'; ctx.fillRect(-9, -33, 8, 31); ctx.fillRect(1, -33, 8, 31);
    ctx.fillStyle = '#0d0d12'; ctx.beginPath(); ell(ctx, -5.5, -1.5, 6, 3); ell(ctx, 5.5, -1.5, 6, 3); ctx.fill();
    // ceket
    ctx.fillStyle = '#26324f';
    ctx.beginPath(); ctx.moveTo(-14, -62); ctx.lineTo(14, -62); ctx.lineTo(15, -28); ctx.lineTo(4, -25); ctx.lineTo(0, -33); ctx.lineTo(-4, -25); ctx.lineTo(-15, -28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-5, -62); ctx.lineTo(5, -62); ctx.lineTo(0, -42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a2238';
    ctx.beginPath(); ctx.moveTo(-5, -62); ctx.lineTo(-9, -52); ctx.lineTo(0, -42); ctx.closePath(); ctx.moveTo(5, -62); ctx.lineTo(9, -52); ctx.lineTo(0, -42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c1121f'; ctx.beginPath(); ctx.moveTo(0, -59.5); ctx.lineTo(-5, -62); ctx.lineTo(-5, -57); ctx.closePath(); ctx.moveTo(0, -59.5); ctx.lineTo(5, -62); ctx.lineTo(5, -57); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); circ(ctx, -9.5, -54, 2.8); ctx.fill();
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); circ(ctx, -9.5, -54, 1.1); ctx.fill();
    ctx.fillStyle = '#c9a26b'; ctx.beginPath(); circ(ctx, 0, -38, 1.1); circ(ctx, 0, -32.5, 1.1); ctx.fill();
    // kollar
    var olx = o.armsUp ? 18 : 15, oly = o.armsUp ? -97 : -35, ilx = o.armsUp ? -18 : o.handX, ily = o.armsUp ? -97 : -46;
    ctx.strokeStyle = '#26324f'; ctx.lineWidth = 6.4;
    ctx.beginPath(); ctx.moveTo(12, -58); ctx.lineTo(olx, oly); ctx.moveTo(-12, -58); ctx.lineTo(ilx, ily); ctx.stroke();
    ctx.fillStyle = '#e8b48f'; ctx.beginPath(); circ(ctx, olx, oly, 3.2); circ(ctx, ilx, ily, 3.2); ctx.fill();
    // baş
    ctx.fillRect(-3, -66, 6, 6);
    ctx.beginPath(); ctx.arc(0, -76, 13, 0, TAU); ctx.fill();
    ctx.beginPath(); circ(ctx, -13, -75, 2.6); circ(ctx, 13, -75, 2.6); ctx.fill();
    ctx.fillStyle = '#1c120a';
    ctx.beginPath(); ctx.arc(0, -78, 13.8, PI * 1.0, PI * 2.0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-3, -89, 9, 4, -0.25, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1c120a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-7.5, -81); ctx.lineTo(-2.5, -81.6); ctx.moveTo(2.5, -81.6); ctx.lineTo(7.5, -81); ctx.stroke();
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(-4.6, -76, 2.4, PI * 1.1, PI * 1.9); ctx.moveTo(7, -76.6); ctx.arc(4.6, -76, 2.4, PI * 1.1, PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -73, 4.4, PI * 0.12, PI * 0.88); ctx.stroke();
    ctx.restore();
  }

  var rp = { x: 0, y: 0 };
  function drawCouple(ctx) {
    var t = LG.time;
    var pop = couplePop > 0 ? -sin((1 - couplePop) * PI) * 7 : 0;
    var o = { sway: 0, by: couple.by + pop, flare: couple.flare, armsUp: couple.armsUp, handX: 0 };
    ctx.save();
    ctx.translate(couple.x, couple.y);
    // gelin
    ctx.save(); ctx.translate(-50, 0); ctx.scale(CS, CS);
    o.sway = sin(t * 1.4) * 1.3; o.handX = 50 / CS - o.sway * 0.5;
    drawBride(ctx, o);
    ctx.restore();
    // damat
    ctx.save(); ctx.translate(50, 0); ctx.scale(CS, CS);
    o.sway = sin(t * 1.4 + 0.6) * 1.3; o.handX = -50 / CS - o.sway * 0.5; o.flare = 0;
    drawGroom(ctx, o);
    ctx.restore();
    // kurdele
    var byOff = couple.by + pop;
    ctx.translate(0, byOff * 0.6);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var passes = [[20, '#7a0010', 0], [15, '#d6001c', 0], [3.2, 'rgba(255,120,140,0.85)', -4]];
    for (var ps = 0; ps < passes.length; ps++) {
      ctx.strokeStyle = passes[ps][1]; ctx.lineWidth = passes[ps][0];
      ctx.beginPath();
      for (var i = 0; i < RIB.n; i += 3) {
        var w = rib.wig * sin(i * 0.25 - t * 16) + passes[ps][2];
        var x = RIB.x[i] + RIB.nx[i] * w, y = RIB.y[i] + RIB.ny[i] * w;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // kurdele uçları (çatal)
    ctx.fillStyle = '#b3001b';
    [[RIB.x[0], RIB.y[0]], [RIB.x[RIB.n - 1], RIB.y[RIB.n - 1]]].forEach(function (e) {
      ctx.beginPath(); ctx.moveTo(e[0] - 8, e[1] - 2); ctx.lineTo(e[0] + 8, e[1] - 2); ctx.lineTo(e[0] + 7, e[1] + 10); ctx.lineTo(e[0], e[1] + 4); ctx.lineTo(e[0] - 7, e[1] + 10); ctx.closePath(); ctx.fill();
    });
    // takılar
    // içteki sıralar önce (arkada), kurdeleye iğnelenen ilk sıra en üstte
    for (var rr = ribRows - 1; rr >= 0; rr--) {
      for (var k = rr; k < items.length; k += ribRows) {
        var it = items[k];
        if (it.pending) continue;
        ribItemPos(it, rp);
        var r = itemR(it.type) * ribScale, sc = it.pop < 1 ? LG.ease.outBack(it.pop) * (1 + (1 - it.pop) * 0.6) : 1;
        var sw = sin(t * 2.2 + it.ph) * 1.6;
        var cx = rp.x + sw, cy = rp.y + r * 0.55;
        if (it.type === 'k') ui.emoji(ctx, '🔑', cx, cy + 6, 34 * sc * max(0.75, ribScale));
        else {
          var cs = coinSprite(r), dw = cs.width * sc;
          ctx.drawImage(cs, cx - dw / 2, cy - dw / 2, dw, dw);
        }
      }
    }
    // parıltı
    if (items.length) {
      var gi = Math.floor(t * 1.3) % items.length, gp = frac(t * 1.3);
      var gt = items[gi];
      if (!gt.pending && gt.type !== 'k') {
        ribItemPos(gt, rp);
        var gs = sin(gp * PI) * 9;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); var gx = rp.x + 3, gy = rp.y + itemR(gt.type) * ribScale * 0.3;
        ctx.moveTo(gx, gy - gs); ctx.lineTo(gx + gs * 0.25, gy - gs * 0.25); ctx.lineTo(gx + gs, gy); ctx.lineTo(gx + gs * 0.25, gy + gs * 0.25);
        ctx.lineTo(gx, gy + gs); ctx.lineTo(gx - gs * 0.25, gy + gs * 0.25); ctx.lineTo(gx - gs, gy); ctx.lineTo(gx - gs * 0.25, gy - gs * 0.25); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawCar(ctx, x, y) {
    var t = LG.time;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(0, 6, 160, 16, 0, 0, TAU); ctx.fill();
    // teneke kutular
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;
    for (var c = 0; c < 3; c++) {
      var kx = -200 - c * 26, ky = -6 + sin(t * 20 + c) * 4;
      ctx.beginPath(); ctx.moveTo(-150, -24); ctx.lineTo(kx + 6, ky - 8); ctx.stroke();
      ctx.fillStyle = '#b8c0c8'; ctx.fillRect(kx, ky - 14, 13, 16); ctx.fillStyle = '#8a939c'; ctx.fillRect(kx, ky - 14, 13, 3);
    }
    ctx.translate(0, sin(t * 18) * 2);
    // gövde
    ctx.fillStyle = '#fbfbfb'; ui.roundRect(ctx, -152, -74, 304, 56, 24); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-84, -72); ctx.quadraticCurveTo(-66, -124, -14, -126); ctx.lineTo(48, -126); ctx.quadraticCurveTo(88, -122, 104, -72); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath(); ctx.moveTo(-70, -76); ctx.quadraticCurveTo(-56, -114, -18, -116); ctx.lineTo(10, -116); ctx.lineTo(10, -76); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, -76); ctx.lineTo(20, -116); ctx.lineTo(46, -116); ctx.quadraticCurveTo(78, -112, 90, -76); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e3061b'; ctx.fillRect(-152, -50, 304, 7);
    ctx.fillStyle = '#ffd34d'; ctx.beginPath(); circ(ctx, 140, -58, 7); ctx.fill();
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); circ(ctx, -146, -58, 6); ctx.fill();
    // kurdele + fiyonk
    ctx.strokeStyle = '#e3061b'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(104, -72); ctx.lineTo(150, -40); ctx.moveTo(-84, -72); ctx.lineTo(-40, -126); ctx.stroke();
    ctx.fillStyle = '#e3061b';
    ctx.beginPath(); ell(ctx, -14, -134, 16, 9, -0.4); ell(ctx, 14, -134, 16, 9, 0.4); ctx.fill();
    ctx.fillStyle = '#b3001b'; ctx.beginPath(); circ(ctx, 0, -134, 6); ctx.fill();
    // kaput çiçekleri + bebek
    var fc = ['#ff4d6d', '#ffffff', '#ffb3c1', '#ffd166'];
    for (var f = 0; f < 9; f++) { ctx.fillStyle = fc[f % 4]; ctx.beginPath(); circ(ctx, 112 + (f % 3) * 11, -80 - Math.floor(f / 3) * 7, 5.5); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(126, -88); ctx.lineTo(116, -110); ctx.lineTo(136, -110); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f6d2b5'; ctx.beginPath(); circ(ctx, 126, -116, 6); ctx.fill();
    // tekerlekler
    [-92, 96].forEach(function (wx) {
      ctx.fillStyle = '#1b1b22'; ctx.beginPath(); circ(ctx, wx, -16, 24); ctx.fill();
      ctx.fillStyle = '#c9c9d2'; ctx.beginPath(); circ(ctx, wx, -16, 11); ctx.fill();
      ctx.strokeStyle = '#6d6d78'; ctx.lineWidth = 3; ctx.beginPath();
      for (var s = 0; s < 3; s++) { var a = t * 14 + s * TAU / 3; ctx.moveTo(wx, -16); ctx.lineTo(wx + cos(a) * 10, -16 + sin(a) * 10); }
      ctx.stroke();
    });
    ui.text(ctx, 'MUTLULUKLAR', -6, -30, { size: 22, color: '#c1121f', stroke: false });
    ctx.restore();
  }

  function drawFlyers(ctx) {
    for (var i = 0; i < flyers.length; i++) {
      var f = flyers[i];
      if (f.t < 0) continue;
      var p = min(1, f.t / f.dur), e = LG.ease.inOutSine(p);
      flyerTarget(f, fpos);
      var cx = (f.x0 + fpos.x) / 2, cy = min(f.y0, fpos.y) - 230;
      var it = 1 - e;
      var x = it * it * f.x0 + 2 * it * e * cx + e * e * fpos.x;
      var y = it * it * f.y0 + 2 * it * e * cy + e * e * fpos.y;
      if (f.kind === 'coin') {
        var r = LG.lerp(f.type === 't' ? 34 : f.type === 'y' ? 28 : 22, itemR(f.type) * ribScale, e * e);
        for (var tr = 1; tr <= 3; tr++) { // iz
          ctx.globalAlpha = 0.25 / tr; ctx.fillStyle = '#ffd34d';
          var pe = max(0, e - tr * 0.05), pit = 1 - pe;
          ctx.beginPath(); circ(ctx, pit * pit * f.x0 + 2 * pit * pe * cx + pe * pe * fpos.x, pit * pit * f.y0 + 2 * pit * pe * cy + pe * pe * fpos.y, r * 0.6); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (f.type === 'k') ui.emoji(ctx, '🔑', x, y, 54 - e * 20);
        else drawCoinScaled(ctx, x, y, r, abs(cos(f.t * 9)));
      } else if (f.kind === 'rose') {
        ui.emoji(ctx, '🌹', x, y, 40);
      } else if (f.kind === 'bangle') {
        drawBangle(ctx, x, y, 22 - e * 10, f.t * 5);
      }
    }
  }

  function drawRockets(ctx) {
    for (var i = 0; i < rockets.length; i++) {
      var r = rockets[i], p = r.t / r.dur, e = LG.ease.outCubic(p);
      var x = LG.lerp(r.x0, r.x1, e), y = LG.lerp(r.y0, r.y1, e);
      var e2 = LG.ease.outCubic(max(0, p - 0.12)), x2 = LG.lerp(r.x0, r.x1, e2), y2 = LG.lerp(r.y0, r.y1, e2);
      ctx.strokeStyle = 'rgba(255,230,180,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); circ(ctx, x, y, 4); ctx.fill();
    }
  }

  function drawNotes(ctx) {
    if (!notes.length) return;
    ctx.font = ui.font(30, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      ctx.globalAlpha = max(0, 1 - n.t / n.life);
      ctx.fillStyle = n.c; ctx.fillText(n.ch, n.x, n.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawSpot(ctx) {
    if (spot <= 0) return;
    var g = ctx.createRadialGradient(couple.x, couple.y - 100, 90, couple.x, couple.y - 100, 560);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(5,0,20,' + (0.62 * spot).toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.22 * spot;
    var lg = ctx.createLinearGradient(couple.x, 250, couple.x, couple.y);
    lg.addColorStop(0, 'rgba(255,240,200,0)'); lg.addColorStop(1, 'rgba(255,240,200,0.9)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(couple.x - 30, 230); ctx.lineTo(couple.x + 30, 230); ctx.lineTo(couple.x + 170, couple.y + 10); ctx.lineTo(couple.x - 170, couple.y + 10); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function hbTag(u) {
    var t = hbTags.get(u.id);
    if (!t || t.name !== '🧣 ' + u.name) { t = { id: u.id + '#hb', name: '🧣 ' + u.name }; hbTags.set(u.id, t); if (hbTags.size > 200) hbTags.clear(); }
    return t;
  }

  function drawWorld(ctx, t) {
    var i;
    drawMusicians(ctx);
    if (!couple.off) drawCouple(ctx);
    drawSeated(ctx);
    ctx.drawImage(tablesImg, 0, 1230);
    // derinlik sırası
    drawList.length = 0;
    for (i = 0; i < line.length; i++) drawList.push(line[i]);
    for (i = 0; i < walkers.length; i++) { var w = walkers[i]; w.y = LG.lerp(w.y0, w.y1, LG.ease.inOutSine(min(1, w.t / w.dur))); w.isW = true; drawList.push(w); }
    drawList.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < drawList.length; i++) { var o = drawList[i]; if (o.isW) drawWalker(ctx, o); else drawDancer(ctx, o); }
    // isim etiketleri (çakışanlar atlanır)
    drawTags(ctx);
    // konuşma baloncukları
    for (i = 0; i < bubbles.length; i++) {
      var b = bubbles[i], bd = b.d;
      var a = b.t < 0.15 ? b.t / 0.15 : b.t > b.life - 0.3 ? (b.life - b.t) / 0.3 : 1;
      var sc = b.t < 0.2 ? LG.ease.outBack(b.t / 0.2) : 1;
      ctx.globalAlpha = a;
      var bw = b.img.width * sc, bh = b.img.height * sc;
      var bx = LG.clamp(bd.x - bw / 2, 30, W - 30 - bw);
      ctx.drawImage(b.img, bx, bd.y + bd.dy - 108 - (bd.idx === 0 ? 30 : 0) - bh, bw, bh);
      ctx.globalAlpha = 1;
    }
    drawSpot(ctx);
    if (couple.off) drawCouple(ctx);
    if (car.active) drawCar(ctx, car.x, 1110);
    drawFlyers(ctx);
    drawRockets(ctx);
    drawNotes(ctx);
  }

  function drawMusicians(ctx) {
    drawZurnaci(ctx);
    drawDavulcu(ctx);
  }

  // ---------------------------------------------------------------------------
  // Çizim — arayüz (güvenli alan)
  // ---------------------------------------------------------------------------
  function drawHUD(ctx, t) {
    var avail = L.hx1 - L.hx0;
    // başlık
    var pulse = 1 + 0.028 * Math.pow(1 - frac(beatPh), 3);
    var tw = min(titleImg.width, avail + 60) * pulse, th = titleImg.height * (tw / titleImg.width);
    ctx.drawImage(titleImg, HCX - tw / 2, L.titleY - th / 2, tw, th);

    // tabela satırı
    var sImg = signImg(STY), sW = 460, sH = 74;
    var signX = avail >= 960 ? HCX : L.hx0 + sW / 2;
    var flipS = 1, showImg = sImg;
    if (signFlip < 1) {
      flipS = abs(cos(signFlip * PI));
      if (signFlip < 0.5 && prevSign) showImg = signImg(prevSign);
    }
    var sh = sH * max(0.04, flipS);
    ctx.drawImage(showImg, signX - sW / 2, L.signY - sh / 2, sW, sh);
    var pillY = L.signY - 27, pillH = 54;
    if (avail >= 960) {
      ui.panel(ctx, L.hx0, pillY, 238, pillH, { r: 27, fill: 'rgba(30,8,20,0.72)', border: 'rgba(255,211,77,0.45)', lineWidth: 3 });
      var rt = phase === 'finale' ? '🎉 Final' : '⏳ ' + fmtTime(ROUND_LEN - roundT);
      ui.text(ctx, '💍 #' + roundNo, L.hx0 + 22, L.signY + 1, { size: 26, align: 'left', color: '#ffd34d' });
      ui.text(ctx, rt, L.hx0 + 222, L.signY + 1, { size: 28, align: 'right', color: '#fff' });
      var vx = L.hx1 - 238;
      ui.panel(ctx, vx, pillY, 238, pillH, { r: 27, fill: 'rgba(30,8,20,0.72)', border: 'rgba(255,211,77,0.45)', lineWidth: 3 });
      ui.text(ctx, '🗳️ ' + T.newHava, vx + 16, L.signY + 1, { size: 22, align: 'left', color: '#ffe9c7', maxWidth: 128 });
      var left = phase === 'finale' ? '—' : Math.ceil(VOTE_LEN - voteT) + ' ' + T.sec;
      var urgent = phase !== 'finale' && VOTE_LEN - voteT < 6;
      ui.text(ctx, left, vx + 224, L.signY + 1, { size: urgent ? 30 + 4 * abs(sin(t * 8)) : 28, align: 'right', color: urgent ? '#ff6b6b' : '#ffd34d', maxWidth: 74 });
    } else {
      var vx2 = signX + sW / 2 + 10, vw = L.hx1 - vx2;
      if (vw > 120) {
        ui.panel(ctx, vx2, pillY, vw, pillH, { r: 27, fill: 'rgba(30,8,20,0.72)', border: 'rgba(255,211,77,0.45)', lineWidth: 3 });
        ui.text(ctx, '🗳️ ' + Math.ceil(VOTE_LEN - voteT) + ' ' + T.sec + ' · ⏳ ' + fmtTime(ROUND_LEN - roundT), vx2 + vw / 2, L.signY + 1, { size: 24, color: '#ffd34d', maxWidth: vw - 20 });
      }
    }

    // oy çipleri
    var perRow = L.chipRows === 1 ? STYLES.length : 3, gap = 7;
    var cw = (avail - gap * (perRow - 1)) / perRow, maxV = 1, i;
    for (i = 0; i < votes.length; i++) maxV = max(maxV, votes[i]);
    for (i = 0; i < STYLES.length; i++) {
      var row = Math.floor(i / perRow), col = i % perRow;
      var cx = L.hx0 + col * (cw + gap), cy = L.chipY + row * (L.chipH + 5);
      var cur = i === styleIdx, v = votes[i];
      ui.panel(ctx, cx, cy, cw, L.chipH, { r: L.chipH / 2, fill: cur ? 'rgba(255,211,77,0.92)' : 'rgba(20,6,30,0.7)', border: cur ? '#fff3b0' : v === maxV && v > 0 ? '#ffd34d' : 'rgba(255,255,255,0.22)', lineWidth: cur ? 3 : 2 });
      if (v > 0) {
        ctx.save(); ui.roundRect(ctx, cx, cy, cw, L.chipH, L.chipH / 2); ctx.clip();
        ctx.fillStyle = cur ? 'rgba(255,140,0,0.45)' : 'rgba(255,211,77,0.32)';
        ctx.fillRect(cx, cy, cw * (v / maxV), L.chipH);
        ctx.restore();
      }
      ui.text(ctx, STYLES[i].title + (v ? ' ' + v : ''), cx + cw / 2, cy + L.chipH / 2 + 1, { size: L.chipH * 0.58, color: cur ? '#3a1000' : '#fff', maxWidth: cw - 14, stroke: !cur });
    }

    // davul göstergesi
    var gx = 48, gw = 332, gy = L.gaugeY, gh = 46;
    var lbl = davSpin > 0 ? T.davulMax : heat > 0.8 ? '🥁 ' + T.davulHot : '🥁 ' + T.davul + ' %' + Math.round(min(1, heat) * 100);
    var shk = heat > 0.8 && davSpin <= 0 ? sin(t * 60) * 2 : 0;
    ui.goalBar(ctx, gx + shk, gy, gw, gh, min(1, heat), 1, { label: lbl, color1: '#ff9f1c', color2: davSpin > 0 ? '#ffd34d' : '#ff2d55' });

    // takı defteri
    drawDefter(ctx);

    // çift isim plakası
    if (L.plaque) {
      var pl = names[0] + ' ❤ ' + names[1];
      ui.panel(ctx, HOME.x - 118, 452, 236, 36, { r: 18, fill: 'rgba(255,248,235,0.95)', border: '#d4a64a', lineWidth: 3 });
      ui.text(ctx, pl, HOME.x, 471, { size: 24, color: '#9a0a1e', stroke: false, maxWidth: 220 });
    }

    // ipucu şeridi
    var hints = T.hints;
    if (realCount === 0 && frac(t / 6) < 0.5) hints = [T.joinPrompt];
    ui.hintBar(ctx, 66, 1224, 948, hints, { h: 70, size: 36, fill: 'rgba(40,6,18,0.78)', border: 'rgba(255,211,77,0.6)' });

    drawTicker(ctx);
    if (banner) drawBanner(ctx, banner);
    if (callout) drawCallout(ctx, callout);
    if (phase === 'finale' && summary) drawSummary(ctx);
  }

  // Tek satırlık olay şeridi (takip, paylaşım, gül…): pistin alt kenarında, dansçıların ayak hizasının altında
  function drawTicker(ctx) {
    if (!tick) return;
    var k = tick, inP = min(1, k.t / 0.3), outP = min(1, (k.dur - k.t) / 0.3);
    var a = max(0, min(inP, outP)), h = 52, w = k.w, y = L.tickerY;
    var x = 540 - w / 2 - (1 - LG.ease.outBack(inP)) * 80;
    ctx.save();
    ctx.globalAlpha = a;
    ui.panel(ctx, x, y - h / 2, w, h, { r: h / 2, fill: 'rgba(40,6,18,0.88)', border: k.color, lineWidth: 3 });
    ui.emoji(ctx, k.icon, x + 34, y + 1, 32);
    ui.text(ctx, k.text, x + 62, y + 2, { size: 28, align: 'left', color: k.color, maxWidth: w - 80 });
    ctx.restore();
  }

  function drawDefter(ctx) {
    var x = DEF.x, y = L.defTop, w = DEF.w, h = DEF.bottom - y;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ui.roundRect(ctx, x + 5, y + 6, w, h, 14); ctx.fill();
    ui.roundRect(ctx, x, y, w, h, 14); ctx.fillStyle = '#fff4dc'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#c99a5b'; ctx.stroke();
    ctx.save(); ui.roundRect(ctx, x, y, w, h, 14); ctx.clip();
    ctx.fillStyle = '#b3001b'; ctx.fillRect(x, y, w, 44);
    ctx.strokeStyle = 'rgba(80,120,200,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (var ly = y + 74; ly < y + h - 4; ly += 30) { ctx.moveTo(x, ly); ctx.lineTo(x + w, ly); } ctx.stroke();
    ctx.strokeStyle = 'rgba(220,40,60,0.45)'; ctx.beginPath(); ctx.moveTo(x + 44, y + 44); ctx.lineTo(x + 44, y + h); ctx.stroke();
    ctx.restore();
    ctx.restore();
    ui.text(ctx, '📒 ' + T.defter, x + w / 2, y + 23, { size: 28, color: '#ffe9a8', strokeColor: 'rgba(60,0,10,0.8)', maxWidth: w - 20 });
    var rows = max(1, Math.floor((h - 44 - 34) / 30));
    if (!defter.length) {
      ui.text(ctx, T.defterEmpty, x + w / 2, y + 44 + 52, { size: 22, color: '#8a6a4a', stroke: false, maxWidth: w - 24 });
    }
    for (var i = 0; i < defter.length && i < rows; i++) {
      var e = defter[i], ry = y + 44 + 17 + i * 30;
      var fresh = LG.time - e.t < 1.2 ? 1 - (LG.time - e.t) / 1.2 : 0;
      if (fresh > 0) { ctx.fillStyle = 'rgba(255,211,77,' + (0.55 * fresh).toFixed(3) + ')'; ctx.fillRect(x + 3, ry - 14, w - 6, 28); }
      if (e.type === 'b') drawBangle(ctx, x + 23, ry, 10, 0);
      else if (e.type === 'k') ui.emoji(ctx, '🔑', x + 23, ry, 24);
      else { var cs = coinSprite(min(13, itemR(e.type) * 0.8)); ctx.drawImage(cs, x + 23 - cs.width / 2, ry - cs.height / 2); }
      ui.text(ctx, e.u.name, x + 52, ry + 1, { size: 22, align: 'left', color: '#22285e', stroke: false, maxWidth: 150 });
      var lab = D.TAKI[e.type].short + (e.n > 1 ? ' ×' + e.n : '');
      ui.text(ctx, lab, x + w - 12, ry + 1, { size: 21, align: 'right', color: '#b3001b', stroke: false, maxWidth: 104 });
    }
    var tot = totals.c + totals.y + totals.t + totals.b + totals.k;
    ui.text(ctx, T.total + ': ' + tot + ' takı 🪙', x + w / 2, y + h - 17, { size: 21, color: '#6a4a2a', stroke: false, maxWidth: w - 20 });
  }

  function drawBanner(ctx, b) {
    var inP = min(1, b.t / 0.4), outP = min(1, (b.dur - b.t) / 0.35);
    var a = max(0, min(inP, outP));
    var sc = LG.ease.outBack(inP);
    var y = L.bannerY - (1 - outP) * 30 + (1 - inP) * -40;
    var top = L.bannerY < 600;
    var w = 968, h = top ? (b.big ? 178 : 150) : (b.big ? 196 : 164), isLeader = b.kind === 'leader';
    if (top) { // üst bilgi şeridi anons boyunca kararır (altından çipler görünüp karışmasın)
      ctx.save(); ctx.globalAlpha = a;
      var dg = ctx.createLinearGradient(0, 228, 0, 458);
      dg.addColorStop(0, 'rgba(14,2,18,0)'); dg.addColorStop(0.1, 'rgba(14,2,18,0.72)'); dg.addColorStop(0.84, 'rgba(14,2,18,0.72)'); dg.addColorStop(1, 'rgba(14,2,18,0)');
      ctx.fillStyle = dg; ctx.fillRect(0, 228, W, 230);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(540, y); ctx.scale(sc, sc);
    if (b.big) { // altın ışınlar
      ctx.save(); ctx.rotate(LG.time * 0.4);
      ctx.fillStyle = 'rgba(255,211,77,0.18)';
      for (var r = 0; r < 12; r++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -560); ctx.lineTo(60, -560); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    var gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    if (isLeader) { gr.addColorStop(0, '#0f5c4a'); gr.addColorStop(1, '#063a2e'); }
    else { gr.addColorStop(0, '#c2142c'); gr.addColorStop(1, '#6e0614'); }
    ui.roundRect(ctx, -w / 2, -h / 2, w, h, 30); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = '#ffd34d'; ctx.stroke();
    ui.roundRect(ctx, -w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 22); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,230,160,0.7)'; ctx.stroke();
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); circ(ctx, -w / 2 + 22, -h / 2 + 22, 5); circ(ctx, w / 2 - 22, -h / 2 + 22, 5); circ(ctx, -w / 2 + 22, h / 2 - 22, 5); circ(ctx, w / 2 - 22, h / 2 - 22, 5); ctx.fill();
    ui.avatar(ctx, b.user, -w / 2 + 88, 0, b.big ? 64 : 56, { ring: '#ffd34d', ringWidth: 6 });
    var tx = -w / 2 + 172, mw = w - 172 - 150;
    ui.text(ctx, b.top, tx, -h / 2 + 36, { size: 26, align: 'left', color: '#ffd34d', maxWidth: mw });
    var bmp = b.bump ? 1 + 0.14 * sin(b.bump * PI) : 1;
    ui.text(ctx, b.main, tx, b.big ? 0 : -2, { size: (b.big ? 52 : 46) * bmp, align: 'left', color: b.bump ? '#fff3b0' : '#ffffff', maxWidth: mw * bmp });
    ui.text(ctx, b.sub, tx, h / 2 - 34, { size: 27, align: 'left', color: '#ffe6a8', maxWidth: mw });
    // sağ ikon
    var bob = sin(LG.time * 6) * 6, ix = w / 2 - 80;
    if (isLeader) ui.emoji(ctx, '🧣', ix, bob, 80);
    else if (b.type === 'k') { ui.emoji(ctx, '🔑', ix - 18, bob, 64); ui.emoji(ctx, '🚗', ix + 24, bob + 26, 50); }
    else if (b.type === 'b') { drawBangle(ctx, ix, bob - 16, 30, 0.3); drawBangle(ctx, ix, bob + 4, 30, -0.2); drawBangle(ctx, ix, bob + 24, 30, 0.1); }
    else drawCoinScaled(ctx, ix, bob, b.type === 't' ? 50 : b.type === 'y' ? 44 : 38, abs(cos(LG.time * 3)));
    ctx.restore();
  }

  function drawCallout(ctx, c) {
    var inP = min(1, c.t / 0.35), outP = min(1, (c.dur - c.t) / 0.35);
    var a = max(0, min(inP, outP)), sc = LG.ease.outBack(inP) * (1 + 0.04 * sin(c.t * 8));
    ctx.save();
    ctx.globalAlpha = a;
    var cy = L.calloutY;
    if (couple.off) cy = phase === 'finale' && finT > 1.6 ? L.finCalloutY : L.calloutTopY;
    ctx.translate(540, cy); ctx.scale(sc, sc);
    ctx.fillStyle = couple.off ? 'rgba(20,0,20,0.74)' : 'rgba(20,0,20,0.55)';
    ui.roundRect(ctx, -470, -70, 940, c.sub ? 150 : 110, 40); ctx.fill();
    ui.text(ctx, c.text, 0, -12, { size: 70, color: c.color, maxWidth: 900, strokeColor: '#3a0010', strokeWidth: 12 });
    if (c.sub) ui.text(ctx, c.sub, 0, 50, { size: 36, color: '#ffffff', maxWidth: 880 });
    ctx.restore();
  }

  function drawSummary(ctx) {
    var s = summary, p = min(1, max(0, (finT - 1.6) / 0.5)), outP = min(1, max(0, (FINALE_LEN - 0.4 - finT) / 0.4));
    if (p <= 0) return;
    var a = min(p, outP), sc = LG.ease.outBack(p);
    var x = 70, y = 436, w = 940, h = 276;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(540, y + h / 2); ctx.scale(sc, sc); ctx.translate(-540, -(y + h / 2));
    var gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#4a0a2a'); gr.addColorStop(1, '#1a0418');
    ui.roundRect(ctx, x, y, w, h, 34); ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = '#ffd34d'; ctx.stroke();
    ui.text(ctx, '🎉 ' + T.wedding.toUpperCase() + ' #' + s.no + ' ' + T.finaleDone + ' 🎉', 540, y + 40, { size: 44, color: '#ffd34d', maxWidth: w - 40 });
    ui.text(ctx, s.names[0] + ' ❤ ' + s.names[1] + ' — ' + T.happy, 540, y + 82, { size: 29, color: '#ffffff', maxWidth: w - 40 });
    var tt = s.totals, parts = [];
    if (tt.c) parts.push(tt.c + ' çeyrek'); if (tt.y) parts.push(tt.y + ' yarım'); if (tt.t) parts.push(tt.t + ' tam');
    if (tt.b) parts.push(tt.b + ' bilezik'); if (tt.k) parts.push(tt.k + ' araba 🚗');
    ui.text(ctx, parts.length ? '🪙 Takılar: ' + parts.join(' · ') : T.noTaki, 540, y + 120, { size: 27, color: '#ffe6a8', maxWidth: w - 40 });
    ui.text(ctx, '🧣 ' + T.halaybasi + ': ' + (s.leader ? s.leader.name : (line[0] ? line[0].u.name : '—')) + '   ·   💃 ' + s.guests + ' ' + T.guests, 540, y + 157, { size: 27, color: '#ffffff', maxWidth: w - 40 });
    ui.text(ctx, '⭐ ' + T.stars + ' ⭐', 540, y + 195, { size: 27, color: '#ffd34d' });
    var n = s.stars.length, medals = ['🥇', '🥈', '🥉'];
    for (var i = 0; i < n; i++) {
      var cx = 540 + (i - (n - 1) / 2) * 300;
      ui.emoji(ctx, medals[i], cx - 118, y + 236, 34);
      ui.avatar(ctx, s.stars[i], cx - 76, y + 236, 22, { ringWidth: 3, ring: '#ffd34d' });
      ui.text(ctx, s.stars[i].name, cx - 46, y + 237, { size: 26, align: 'left', maxWidth: 180 });
    }
    if (!n) ui.text(ctx, '💬 Yorum yazan herkes yıldız!', 540, y + 236, { size: 26, color: '#ffffff' });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Başlat
  // ---------------------------------------------------------------------------
  LG.start({
    id: 'dugun-taki',
    title: 'Düğün Var! 💍',
    init: function () {
      buildBackground();
      buildTitle();
      initNpcs();
      LG.music.play(STY.music);
      applyTempo();
      pushCallout('💍 ' + T.wedding.toUpperCase() + ' #' + roundNo + ' ' + T.started, names[0] + ' ❤ ' + names[1], '#ffd34d', 2.6);
    },
    update: function (dt) { update(dt); },
    render: function (ctx, t) {
      ctx.drawImage(bg, 0, 0);
      drawLights(ctx, t);
      ctx.save();
      ui.applyShake(ctx);
      drawWorld(ctx, t);
      ctx.restore();
      drawHUD(ctx, t);
    },
  });
})();
