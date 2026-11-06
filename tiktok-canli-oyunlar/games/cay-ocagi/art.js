/*
 * Çay Ocağı — çizim yardımcıları: arka plan, masa, semaver, tezgâh, karakterler (çaycı, çırak,
 * simitçi, kedi), masadaki ikramlar (ince belli bardak, kahve, simit, tost...) ve balon önbelleği.
 * Hepsi kodla çizilir; dış görsel yok.
 */
(function () {
  'use strict';
  var ui = LG.ui;
  var A = (window.CAY_ART = {});
  var TAU = Math.PI * 2;

  function cv(w, h) { var c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  A.cv = cv;
  // Basit tohumlu rastgele (arka plan her açılışta aynı görünsün)
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
  A.ell = ell;

  // Çay renkleri
  A.TEA = { normal: '#b23a17', demli: '#7a1407', acik: '#e39a35', tavsan: '#c8170d', portakal: '#ff8a1c', ihlamur: '#d2c25a' };

  // ---------------------------------------------------------------------------
  // Yumuşak ışık / buhar sprite'ları
  // ---------------------------------------------------------------------------
  A.glow = (function () {
    var c = cv(96, 96), g = c.getContext('2d');
    var gr = g.createRadialGradient(48, 48, 2, 48, 48, 48);
    gr.addColorStop(0, 'rgba(255,226,150,0.95)'); gr.addColorStop(0.25, 'rgba(255,190,90,0.45)'); gr.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
    return c;
  })();
  A.puff = (function () {
    var c = cv(64, 64), g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  })();
  A.goldGlow = (function () {
    var c = cv(128, 128), g = c.getContext('2d');
    var gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,230,120,0.9)'); gr.addColorStop(0.45, 'rgba(255,200,60,0.4)'); gr.addColorStop(1, 'rgba(255,190,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return c;
  })();

  // ---------------------------------------------------------------------------
  // Arka plan (bir kez çizilir)
  // ---------------------------------------------------------------------------
  A.buildBackground = function (L) {
    var W = LG.W, H = LG.H;
    var c = cv(W, H), g = c.getContext('2d');
    var R = rng(1907);
    // Gökyüzü
    var sky = g.createLinearGradient(0, 0, 0, 400);
    sky.addColorStop(0, '#0f0a24'); sky.addColorStop(0.42, '#29133d'); sky.addColorStop(0.72, '#6e2a45'); sky.addColorStop(0.9, '#c45a3a'); sky.addColorStop(1, '#e8924b');
    g.fillStyle = sky; g.fillRect(0, 0, W, 410);
    for (var i = 0; i < 70; i++) {
      g.fillStyle = 'rgba(255,240,220,' + (0.25 + R() * 0.6) + ')';
      g.fillRect(R() * W, R() * 260, 1.5 + R() * 2, 1.5 + R() * 2);
    }
    // Dolunay
    var mxp = L.mx(955), myp = 300;
    var mg = g.createRadialGradient(mxp, myp, 10, mxp, myp, 90);
    mg.addColorStop(0, 'rgba(255,240,200,0.55)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = mg; g.fillRect(mxp - 90, myp - 90, 180, 180);
    g.fillStyle = '#fff3d6'; ell(g, mxp, myp, 28, 28); g.fill();
    g.fillStyle = 'rgba(220,200,160,0.5)'; ell(g, mxp - 8, myp - 6, 6, 5); g.fill(); ell(g, mxp + 9, myp + 7, 4, 4); g.fill();
    // Uzak şehir siluetleri (çatılar + ışıklı pencereler)
    g.fillStyle = '#2a1430';
    var x = 0;
    while (x < W) {
      var bw = 50 + R() * 90, bh = 40 + R() * 70;
      g.fillRect(x, 392 - bh, bw, bh + 10);
      // kırma çatı
      g.beginPath(); g.moveTo(x - 4, 392 - bh); g.lineTo(x + bw / 2, 392 - bh - 18 - R() * 12); g.lineTo(x + bw + 4, 392 - bh); g.fill();
      for (var wy = 392 - bh + 12; wy < 380; wy += 18) for (var wx = x + 8; wx < x + bw - 10; wx += 16) {
        if (R() < 0.3) { g.fillStyle = R() < 0.5 ? 'rgba(255,200,110,0.85)' : 'rgba(255,170,80,0.6)'; g.fillRect(wx, wy, 6, 8); g.fillStyle = '#2a1430'; }
      }
      if (R() < 0.4) { g.fillRect(x + bw * 0.7, 392 - bh - 30, 8, 22); } // baca
      x += bw + 6 + R() * 20;
    }
    // Zemin (sıcak taş döşeme)
    var gr = g.createLinearGradient(0, 600, 0, H);
    gr.addColorStop(0, '#6a4128'); gr.addColorStop(0.35, '#4d2e1d'); gr.addColorStop(0.7, '#2e1a10'); gr.addColorStop(1, '#1c0f09');
    g.fillStyle = gr; g.fillRect(0, 600, W, H - 600);
    g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 2;
    for (var k = 0; k < 26; k++) { var yy = 606 + Math.pow(k, 1.45) * 14; if (yy > H) break; g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
    for (var v = -12; v <= 12; v++) { g.beginPath(); g.moveTo(540 + v * 40, 606); g.lineTo(540 + v * 150, H); g.stroke(); }
    // Işık havuzları
    g.globalCompositeOperation = 'lighter';
    [[250, 760, 340], [830, 760, 340], [540, 1050, 420], [180, 1160, 260], [900, 1160, 260]].forEach(function (p) {
      var lg = g.createRadialGradient(p[0], p[1], 10, p[0], p[1], p[2]);
      lg.addColorStop(0, 'rgba(255,170,80,0.16)'); lg.addColorStop(1, 'rgba(255,150,60,0)');
      g.fillStyle = lg; g.fillRect(p[0] - p[2], p[1] - p[2], p[2] * 2, p[2] * 2);
    });
    g.globalCompositeOperation = 'source-over';
    // Kahvehane cephesi
    var fy = 388, fb = 606;
    var fg = g.createLinearGradient(0, fy, 0, fb);
    fg.addColorStop(0, '#7b4a2f'); fg.addColorStop(1, '#5a3220');
    g.fillStyle = fg; g.fillRect(0, fy, W, fb - fy);
    // sıva lekeleri
    for (var p2 = 0; p2 < 40; p2++) { g.fillStyle = 'rgba(255,220,180,' + (0.03 + R() * 0.04) + ')'; ell(g, R() * W, fy + R() * (fb - fy), 20 + R() * 40, 8 + R() * 14); g.fill(); }
    // Vitrin camı (tezgâhın arkasında, içerisi sıcak ışıklı)
    var win = L.mrect(52, 404, 388, 118);
    var wg = g.createLinearGradient(0, win.y, 0, win.y + win.h);
    wg.addColorStop(0, '#ffd88f'); wg.addColorStop(1, '#d98a3c');
    g.fillStyle = '#3a2214'; g.fillRect(win.x - 8, win.y - 8, win.w + 16, win.h + 12);
    g.fillStyle = wg; g.fillRect(win.x, win.y, win.w, win.h);
    // raflar + kavanozlar + bardaklar
    g.fillStyle = 'rgba(90,50,20,0.75)';
    g.fillRect(win.x, win.y + 44, win.w, 5); g.fillRect(win.x, win.y + 88, win.w, 5);
    for (var j = 0; j < 14; j++) {
      var jx = win.x + 14 + j * 27, jy = win.y + 44;
      g.fillStyle = j % 3 === 0 ? 'rgba(160,60,30,0.55)' : 'rgba(255,255,255,0.35)';
      if (j % 3 === 0) { g.fillRect(jx, jy - 22, 16, 22); g.fillStyle = 'rgba(120,40,20,0.7)'; g.fillRect(jx - 1, jy - 25, 18, 4); }
      else { g.beginPath(); g.moveTo(jx, jy - 18); g.lineTo(jx + 12, jy - 18); g.lineTo(jx + 9, jy); g.lineTo(jx + 3, jy); g.closePath(); g.fill(); }
    }
    for (var j2 = 0; j2 < 9; j2++) { g.fillStyle = 'rgba(110,60,25,0.55)'; g.fillRect(win.x + 20 + j2 * 40, win.y + 64, 26, 24); }
    g.strokeStyle = '#3a2214'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(win.x + win.w / 3, win.y); g.lineTo(win.x + win.w / 3, win.y + win.h); g.moveTo(win.x + win.w * 2 / 3, win.y); g.lineTo(win.x + win.w * 2 / 3, win.y + win.h); g.stroke();
    // pencereden taşan ışık
    g.globalCompositeOperation = 'lighter';
    var wl = g.createRadialGradient(win.x + win.w / 2, win.y + win.h, 20, win.x + win.w / 2, win.y + win.h, 360);
    wl.addColorStop(0, 'rgba(255,170,70,0.22)'); wl.addColorStop(1, 'rgba(255,150,50,0)');
    g.fillStyle = wl; g.fillRect(win.x - 200, win.y, win.w + 400, 420);
    g.globalCompositeOperation = 'source-over';
    // Kara tahta çerçevesi
    var B = L.BOARD;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(B.x + 6, B.y + 8, B.w, B.h);
    g.fillStyle = '#6b3d1c'; ui.roundRect(g, B.x - 10, B.y - 10, B.w + 20, B.h + 20, 10); g.fill();
    g.fillStyle = '#8a5428'; ui.roundRect(g, B.x - 6, B.y - 6, B.w + 12, B.h + 12, 8); g.fill();
    var bgd = g.createLinearGradient(B.x, B.y, B.x + B.w, B.y + B.h);
    bgd.addColorStop(0, '#24342b'); bgd.addColorStop(1, '#17221c');
    g.fillStyle = bgd; g.fillRect(B.x, B.y, B.w, B.h);
    for (var s2 = 0; s2 < 26; s2++) { g.fillStyle = 'rgba(255,255,255,' + (0.015 + R() * 0.03) + ')'; ell(g, B.x + R() * B.w, B.y + R() * B.h, 20 + R() * 60, 6 + R() * 16); g.fill(); }
    g.fillStyle = '#8a5428'; g.fillRect(B.x + 20, B.y + B.h + 4, B.w - 40, 8); // tebeşir rafı
    g.fillStyle = '#f4f0e0'; g.fillRect(B.x + 60, B.y + B.h + 1, 22, 5); g.fillStyle = '#ffd36b'; g.fillRect(B.x + 100, B.y + B.h + 1, 16, 5);
    // Kiremit saçak
    for (var tx = -10; tx < W + 30; tx += 30) {
      g.fillStyle = '#8e3a22'; ell(g, tx + 15, 386, 16, 13); g.fill();
      g.fillStyle = '#b4502c'; ell(g, tx + 15, 382, 14, 10); g.fill();
      g.fillStyle = 'rgba(255,200,150,0.18)'; ell(g, tx + 11, 378, 6, 3); g.fill();
    }
    g.fillStyle = '#5a2414'; g.fillRect(0, 394, W, 5);
    // Asma çardağı: kirişler + direkler
    g.fillStyle = '#3d2412';
    g.fillRect(0, 196, W, 16); g.fillRect(0, 150, W, 10);
    g.fillRect(8, 150, 26, H); g.fillRect(W - 34, 150, 26, H);
    g.fillStyle = 'rgba(255,190,120,0.18)'; g.fillRect(12, 150, 6, H); g.fillRect(W - 30, 150, 6, H);
    for (var bx = 40; bx < W; bx += 120) { g.fillStyle = '#4a2c16'; g.fillRect(bx, 140, 14, 80); }
    // Asma yaprakları + üzüm salkımları
    for (var lf = 0; lf < 120; lf++) {
      var lx = R() * W, ly = 120 + R() * 110;
      if (R() < 0.2) ly = 210 + R() * 40;
      var lr = 14 + R() * 18;
      g.fillStyle = ['#1f4a22', '#2a5e2a', '#356f2f', '#1a3b1c'][Math.floor(R() * 4)];
      g.beginPath();
      for (var a = 0; a < 5; a++) { var an = a / 5 * TAU + R(); g.ellipse(lx + Math.cos(an) * lr * 0.45, ly + Math.sin(an) * lr * 0.45, lr * 0.55, lr * 0.4, an, 0, TAU); }
      g.fill();
    }
    for (var gp = 0; gp < 9; gp++) {
      var gx = 70 + gp * 115 + R() * 30, gy = 226 + R() * 20;
      for (var q = 0; q < 10; q++) {
        var row = Math.floor(Math.sqrt(q * 2)), off = q - row * (row + 1) / 2;
        g.fillStyle = q % 2 ? '#5b2a6e' : '#713a86';
        ell(g, gx + (off - row / 2) * 9, gy + row * 8, 5, 5); g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.25)'; ell(g, gx - 2, gy + 2, 2, 2); g.fill();
    }
    // Saksıda sardunyalar (alt dekor, yayında TikTok arayüzünün altında kalır)
    function pot(px, py, sc) {
      g.save(); g.translate(px, py); g.scale(sc, sc);
      g.fillStyle = '#8f9aa0'; g.fillRect(-26, -44, 52, 48); g.fillStyle = '#c0c9cf'; g.fillRect(-26, -44, 52, 6);
      g.fillStyle = '#b8402e'; g.fillRect(-26, -26, 52, 12);
      g.fillStyle = '#2f6a2a'; for (var z = 0; z < 7; z++) { ell(g, -20 + z * 7, -52 - (z % 2) * 10, 12, 9); g.fill(); }
      g.fillStyle = '#e8343a'; for (var z2 = 0; z2 < 5; z2++) { ell(g, -18 + z2 * 9, -70 - (z2 % 2) * 8, 7, 7); g.fill(); }
      g.fillStyle = '#ff6a6a'; for (var z3 = 0; z3 < 5; z3++) { ell(g, -16 + z3 * 9, -72 - (z3 % 2) * 8, 3, 3); g.fill(); }
      g.restore();
    }
    [70, 180, 900, 1010].forEach(function (px, ix) { pot(px, 1440 + (ix % 2) * 30, 1.2); });
    [120, 960].forEach(function (px) { pot(px, 1640, 1.4); });
    // Kenar karartma
    var vg = g.createRadialGradient(W / 2, 820, 300, W / 2, 820, 1250);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    return c;
  };

  // Çatı kirişine asılı ışık zincirleri (ampul konumları)
  A.lightBulbs = function () {
    var out = [];
    function strand(x0, y0, x1, y1, sag, n, kind) {
      for (var i = 0; i <= n; i++) {
        var t = i / n;
        out.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag, ph: Math.random() * 6, k: kind });
      }
    }
    strand(36, 212, 1044, 212, 72, 22, 0);
    strand(30, 404, 1050, 404, 10, 26, 1);
    for (var y = 460; y < 1280; y += 74) { out.push({ x: 21, y: y, ph: Math.random() * 6, k: 2 }); out.push({ x: 1059, y: y + 30, ph: Math.random() * 6, k: 2 }); }
    return out;
  };
  A.drawWires = function (g) {
    g.save();
    g.strokeStyle = 'rgba(20,10,5,0.85)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(36, 212); g.quadraticCurveTo(540, 212 + 144, 1044, 212); g.stroke();
    g.beginPath(); g.moveTo(30, 404); g.quadraticCurveTo(540, 424, 1050, 404); g.stroke();
    g.restore();
  };

  // ---------------------------------------------------------------------------
  // Başlık tabelası (ahşap)
  // ---------------------------------------------------------------------------
  A.buildPlaque = function () {
    var w = 640, h = 124, c = cv(w + 20, h + 60), g = c.getContext('2d');
    g.translate(10, 40);
    // ipler
    g.strokeStyle = '#2b1a0e'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(90, 6); g.lineTo(120, -40); g.moveTo(w - 90, 6); g.lineTo(w - 120, -40); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.35)'; ui.roundRect(g, 6, 8, w, h, 22); g.fill();
    var wg = g.createLinearGradient(0, 0, 0, h);
    wg.addColorStop(0, '#9a5b2c'); wg.addColorStop(0.5, '#7d4621'); wg.addColorStop(1, '#5e3215');
    g.fillStyle = wg; ui.roundRect(g, 0, 0, w, h, 22); g.fill();
    // damarlar
    g.strokeStyle = 'rgba(40,18,6,0.35)'; g.lineWidth = 2;
    for (var i = 0; i < 9; i++) { g.beginPath(); var yy = 10 + i * 13; g.moveTo(14, yy); g.bezierCurveTo(w * 0.3, yy + 6, w * 0.6, yy - 6, w - 14, yy + 3); g.stroke(); }
    g.lineWidth = 5; g.strokeStyle = '#e9b866'; ui.roundRect(g, 10, 10, w - 20, h - 20, 16); g.stroke();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,230,170,0.5)'; ui.roundRect(g, 16, 16, w - 32, h - 32, 12); g.stroke();
    // çiviler
    g.fillStyle = '#e8c27a'; [[24, 24], [w - 24, 24], [24, h - 24], [w - 24, h - 24]].forEach(function (p) { ell(g, p[0], p[1], 5, 5); g.fill(); });
    ui.text(g, 'ÇAY OCAĞI', w / 2 - 36, 46, { size: 68, weight: 900, color: '#ffeccc', strokeColor: '#3a1a08', strokeWidth: 10, shadow: 'rgba(255,190,90,0.6)', shadowBlur: 14 });
    ui.emoji(g, '☕', w / 2 + 196, 44, 60);
    // alt şerit (sayaç için)
    g.fillStyle = 'rgba(30,12,4,0.55)'; ui.roundRect(g, 120, 82, w - 240, 34, 17); g.fill();
    return c;
  };

  // ---------------------------------------------------------------------------
  // Masa (kareli muşamba örtülü) — ölçek 1, merkez (130, 40)
  // ---------------------------------------------------------------------------
  A.buildTable = function (vip) {
    var c = cv(260, 110), g = c.getContext('2d');
    g.translate(130, 40);
    g.fillStyle = 'rgba(0,0,0,0.32)'; ell(g, 0, 58, 100, 13); g.fill();
    // bacaklar
    g.fillStyle = '#3b210f'; g.fillRect(-80, 28, 9, 30); g.fillRect(71, 28, 9, 30);
    g.fillStyle = '#2a1708'; g.fillRect(-60, 26, 6, 22); g.fillRect(54, 26, 6, 22);
    // örtü ön sarkma
    var c1 = vip ? '#e2b02a' : '#b8352a', c2 = vip ? '#fff3c4' : '#f1e3cb';
    g.save();
    g.beginPath(); g.moveTo(-92, 14); g.lineTo(92, 14); g.lineTo(95, 34); g.lineTo(-95, 34); g.closePath(); g.clip();
    for (var i = -8; i < 8; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * 12, 14, 12, 22); }
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(-100, 14, 200, 22);
    g.restore();
    if (vip) { g.fillStyle = '#fff6d8'; for (var sx = -90; sx < 92; sx += 12) { ell(g, sx + 6, 35, 6, 4); g.fill(); } }
    // üst yüzey
    g.save();
    ui.roundRect(g, -92, -24, 184, 40, 10); g.clip();
    for (var r = 0; r < 4; r++) for (var q = -8; q < 8; q++) { g.fillStyle = (r + q) % 2 ? c1 : c2; g.fillRect(q * 12, -24 + r * 10, 12, 10); }
    var sh = g.createLinearGradient(0, -24, 0, 16);
    sh.addColorStop(0, 'rgba(0,0,0,0.25)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.05)'); sh.addColorStop(1, 'rgba(0,0,0,0.12)');
    g.fillStyle = sh; g.fillRect(-100, -30, 200, 50);
    g.restore();
    g.strokeStyle = vip ? '#8a6410' : 'rgba(60,20,10,0.55)'; g.lineWidth = 2; ui.roundRect(g, -92, -24, 184, 40, 10); g.stroke();
    return c;
  };

  // Ahşap sandalye arkalığı (arka koltuklar) ve hasır tabure (yan koltuklar)
  A.drawChairBack = function (g, x, y, s) {
    g.fillStyle = '#4a2a14';
    g.fillRect(x - 20 * s, y - 30 * s, 5 * s, 34 * s); g.fillRect(x + 15 * s, y - 30 * s, 5 * s, 34 * s);
    g.fillStyle = '#6b3d1c'; ui.roundRect(g, x - 23 * s, y - 36 * s, 46 * s, 9 * s, 4 * s); g.fill();
    g.fillRect(x - 18 * s, y - 16 * s, 36 * s, 4 * s);
  };
  A.drawStool = function (g, x, y, s) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, x, y + 24 * s, 22 * s, 5 * s); g.fill();
    g.strokeStyle = '#4a2a14'; g.lineWidth = 4 * s;
    g.beginPath(); g.moveTo(x - 14 * s, y); g.lineTo(x - 17 * s, y + 24 * s); g.moveTo(x + 14 * s, y); g.lineTo(x + 17 * s, y + 24 * s); g.stroke();
    g.fillStyle = '#c99a3e'; ell(g, x, y, 19 * s, 6 * s); g.fill();
    g.strokeStyle = 'rgba(110,70,20,0.8)'; g.lineWidth = 1.2 * s;
    g.beginPath(); for (var i = -3; i <= 3; i++) { g.moveTo(x + i * 5 * s - 3 * s, y - 4 * s); g.lineTo(x + i * 5 * s + 3 * s, y + 4 * s); } g.stroke();
  };

  // ---------------------------------------------------------------------------
  // Tezgâh (çini kaplı ön yüz) + üzerindeki sabit eşyalar
  // ---------------------------------------------------------------------------
  A.buildCounter = function (L) {
    var C = L.COUNTER;
    var c = cv(C.w + 20, 140), g = c.getContext('2d');
    var ox = 10, oy = 40; // tezgâh üst yüzeyi (y = C.y) sprite içinde oy'de
    g.translate(ox, oy);
    // üst tabla
    g.fillStyle = '#5a3218'; g.fillRect(-6, -4, C.w + 12, 14);
    g.fillStyle = '#8a5428'; g.fillRect(-6, -6, C.w + 12, 6);
    // ön yüz: çini
    var fy = 10, fh = C.h - 8;
    g.fillStyle = '#efe8d8'; g.fillRect(0, fy, C.w, fh);
    var ts = 26;
    for (var tx = 0; tx < C.w; tx += ts) for (var ty = fy; ty < fy + fh; ty += ts) {
      g.save(); g.beginPath(); g.rect(tx, ty, ts, ts); g.clip();
      g.strokeStyle = '#1f4f9a'; g.lineWidth = 2;
      g.beginPath(); g.arc(tx + ts / 2, ty + ts / 2, 7, 0, TAU); g.stroke();
      g.fillStyle = '#2a63b8'; for (var k = 0; k < 4; k++) { var a = k * Math.PI / 2 + Math.PI / 4; ell(g, tx + ts / 2 + Math.cos(a) * 10, ty + ts / 2 + Math.sin(a) * 10, 3, 3); g.fill(); }
      g.fillStyle = '#d23a2a'; ell(g, tx + ts / 2, ty + ts / 2, 2.5, 2.5); g.fill();
      g.strokeStyle = 'rgba(60,60,90,0.25)'; g.lineWidth = 1; g.strokeRect(tx + 0.5, ty + 0.5, ts - 1, ts - 1);
      g.restore();
    }
    var shade = g.createLinearGradient(0, fy, 0, fy + fh);
    shade.addColorStop(0, 'rgba(0,0,0,0.05)'); shade.addColorStop(1, 'rgba(40,10,0,0.45)');
    g.fillStyle = shade; g.fillRect(0, fy, C.w, fh);
    g.fillStyle = '#4a2812'; g.fillRect(-6, fy + fh - 4, C.w + 12, 6);
    // ters çevrilmiş bardak tepsisi
    var trayX = L.mxr(205) - C.x;
    g.fillStyle = '#b9b9c2'; ell(g, trayX, -2, 36, 7); g.fill();
    g.fillStyle = '#e5e5ec'; ell(g, trayX, -4, 34, 6); g.fill();
    for (var b = 0; b < 5; b++) {
      var bx = trayX - 24 + b * 12, by = -6 - (b % 2) * 3;
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(bx - 5, by); g.lineTo(bx - 3.5, by - 9); g.lineTo(bx - 5, by - 18); g.lineTo(bx + 5, by - 18); g.lineTo(bx + 3.5, by - 9); g.lineTo(bx + 5, by); g.closePath(); g.fill(); g.stroke();
    }
    // şekerlik
    var sx = trayX + 50;
    g.fillStyle = '#f6f2ea'; ell(g, sx, -10, 11, 10); g.fill(); g.fillStyle = '#c63a2a'; g.fillRect(sx - 11, -12, 22, 3);
    g.fillStyle = '#f6f2ea'; ell(g, sx, -20, 7, 3); g.fill();
    // kedi minderi
    var cx = L.mxr(304) - C.x;
    g.fillStyle = '#8c2f3a'; ell(g, cx, -4, 40, 9); g.fill(); g.fillStyle = '#b84455'; ell(g, cx, -7, 37, 7); g.fill();
    g.fillStyle = '#f2c14e'; ell(g, cx - 36, -4, 4, 4); g.fill(); ell(g, cx + 36, -4, 4, 4); g.fill();
    // radyo
    var rx = L.mxr(398) - C.x;
    g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, rx, -1, 36, 5); g.fill();
    var rg = g.createLinearGradient(0, -52, 0, 0); rg.addColorStop(0, '#9a5a2a'); rg.addColorStop(1, '#5e3214');
    g.fillStyle = rg; ui.roundRect(g, rx - 34, -52, 68, 50, 12); g.fill();
    g.fillStyle = '#e8d6a8'; ui.roundRect(g, rx - 27, -44, 30, 34, 6); g.fill(); // hoparlör kumaşı
    g.strokeStyle = 'rgba(120,80,30,0.6)'; g.lineWidth = 1;
    for (var hl = -40; hl < -12; hl += 5) { g.beginPath(); g.moveTo(rx - 25, hl); g.lineTo(rx + 1, hl); g.stroke(); }
    g.fillStyle = '#2b1a0c'; ell(g, rx + 17, -36, 7, 7); g.fill(); ell(g, rx + 17, -16, 5, 5); g.fill();
    g.fillStyle = '#e8c27a'; ell(g, rx + 17, -36, 3, 3); g.fill();
    g.strokeStyle = '#2b1a0c'; g.lineWidth = 2; g.beginPath(); g.moveTo(rx + 20, -52); g.lineTo(rx + 34, -78); g.stroke();
    return { canvas: c, ox: ox, oy: oy };
  };

  // Semaver (pirinç) + üstünde porselen demlik — taban ortası (60, 200)
  A.buildSemaver = function () {
    var c = cv(140, 210), g = c.getContext('2d');
    g.translate(66, 202);
    var brass = function (y0, y1) { var gr = g.createLinearGradient(-48, 0, 48, 0); gr.addColorStop(0, '#7a4f15'); gr.addColorStop(0.3, '#f5d27a'); gr.addColorStop(0.5, '#fff0b8'); gr.addColorStop(0.75, '#c99434'); gr.addColorStop(1, '#6e4511'); return gr; };
    g.fillStyle = 'rgba(0,0,0,0.3)'; ell(g, 0, 0, 46, 6); g.fill();
    // ayaklar + taban
    g.fillStyle = brass(); g.beginPath(); g.moveTo(-34, -2); g.lineTo(34, -2); g.lineTo(26, -18); g.lineTo(-26, -18); g.closePath(); g.fill();
    g.fillRect(-20, -26, 40, 10);
    // gövde
    g.fillStyle = brass(); ui.roundRect(g, -44, -118, 88, 94, 26); g.fill();
    g.fillStyle = 'rgba(90,50,10,0.55)'; g.fillRect(-44, -98, 88, 5); g.fillRect(-44, -46, 88, 5);
    g.fillStyle = 'rgba(255,255,255,0.35)'; ui.roundRect(g, -30, -112, 9, 80, 5); g.fill();
    // musluk
    g.fillStyle = '#a8752a'; g.fillRect(36, -46, 20, 7); g.fillRect(50, -46, 6, 14);
    g.fillStyle = '#2b1a0c'; ell(g, 44, -50, 5, 5); g.fill();
    // kulplar
    g.strokeStyle = '#3b2410'; g.lineWidth = 5;
    g.beginPath(); g.arc(-50, -84, 10, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
    g.beginPath(); g.arc(50, -84, 10, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
    // boyun + taç
    g.fillStyle = brass(); g.fillRect(-18, -132, 36, 16); ui.roundRect(g, -28, -140, 56, 10, 4); g.fill();
    // demlik (porselen, kırmızı lale desenli)
    g.fillStyle = '#fbf7ef'; ell(g, 0, -158, 25, 19); g.fill();
    g.fillStyle = '#e9e1d2'; ell(g, 0, -150, 24, 10); g.fill();
    g.fillStyle = '#fbf7ef'; ell(g, 0, -162, 22, 14); g.fill();
    g.fillStyle = '#c82d2d';
    ell(g, -8, -160, 4, 6); g.fill(); ell(g, 8, -160, 4, 6); g.fill(); ell(g, 0, -163, 4, 7); g.fill();
    g.fillStyle = '#2e7d32'; g.fillRect(-1, -156, 2, 8);
    g.fillStyle = '#fbf7ef'; g.beginPath(); g.moveTo(-22, -158); g.quadraticCurveTo(-40, -164, -44, -178); g.lineTo(-38, -178); g.quadraticCurveTo(-34, -166, -20, -150); g.fill();
    g.strokeStyle = '#d8cfbe'; g.lineWidth = 4; g.beginPath(); g.arc(22, -160, 9, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
    ell(g, 0, -176, 13, 4); g.fillStyle = '#efe6d5'; g.fill();
    g.fillStyle = '#c82d2d'; ell(g, 0, -182, 4, 4); g.fill();
    return { canvas: c, ox: 66, oy: 202 };
  };

  // ---------------------------------------------------------------------------
  // Masadaki ikramlar. (x, y) = tabağın ortası; s = ölçek; lv = kalan (0..1)
  // ---------------------------------------------------------------------------
  function teaGlassPath(g, x, y, s) {
    g.beginPath();
    g.moveTo(x - 8.5 * s, y - 29 * s);
    g.quadraticCurveTo(x - 8.5 * s, y - 21 * s, x - 4.5 * s, y - 16 * s);
    g.quadraticCurveTo(x - 7.5 * s, y - 9 * s, x - 7 * s, y - 2 * s);
    g.lineTo(x + 7 * s, y - 2 * s);
    g.quadraticCurveTo(x + 7.5 * s, y - 9 * s, x + 4.5 * s, y - 16 * s);
    g.quadraticCurveTo(x + 8.5 * s, y - 21 * s, x + 8.5 * s, y - 29 * s);
    g.closePath();
  }
  A.teaGlass = function (g, x, y, s, color, lv, saucer) {
    if (saucer !== false) {
      g.fillStyle = '#f4efe4'; ell(g, x, y, 13 * s, 4 * s); g.fill();
      g.strokeStyle = '#c0392b'; g.lineWidth = 1.3 * s; ell(g, x, y, 10.5 * s, 3 * s); g.stroke();
    }
    g.save();
    teaGlassPath(g, x, y, s);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fill();
    if (lv > 0.01) {
      g.clip();
      var top = y - 2 * s - 25 * s * Math.min(1, lv);
      g.fillStyle = color; g.fillRect(x - 10 * s, top, 20 * s, y - top);
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x - 10 * s, top, 20 * s, 2 * s);
    }
    g.restore();
    teaGlassPath(g, x, y, s);
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.4 * s; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x - 5.5 * s, y - 26 * s, 1.6 * s, 7 * s);
    if (lv <= 0.01) { g.fillStyle = 'rgba(120,40,10,0.6)'; ell(g, x, y - 3 * s, 4 * s, 1.5 * s); g.fill(); }
  };
  A.coffee = function (g, x, y, s, lv, lokum) {
    g.fillStyle = '#f7f3ea'; ell(g, x, y, 14 * s, 4.5 * s); g.fill();
    g.strokeStyle = '#d4a017'; g.lineWidth = 1.2 * s; ell(g, x, y, 11 * s, 3.2 * s); g.stroke();
    g.fillStyle = '#fbf8f1';
    g.beginPath(); g.moveTo(x - 8 * s, y - 15 * s); g.lineTo(x + 8 * s, y - 15 * s); g.lineTo(x + 6 * s, y - 2 * s); g.lineTo(x - 6 * s, y - 2 * s); g.closePath(); g.fill();
    g.strokeStyle = '#fbf8f1'; g.lineWidth = 2.4 * s; g.beginPath(); g.arc(x + 9 * s, y - 9 * s, 3.5 * s, -Math.PI / 2, Math.PI / 2); g.stroke();
    g.fillStyle = '#c0392b'; g.fillRect(x - 7.5 * s, y - 12 * s, 15 * s, 1.8 * s);
    if (lv > 0.05) { g.fillStyle = '#4a2a14'; ell(g, x, y - 15 * s, 7.6 * s, 2.2 * s); g.fill(); g.fillStyle = '#a77a4c'; ell(g, x, y - 15 * s, 5 * s, 1.4 * s); g.fill(); }
    else { g.fillStyle = '#2b1609'; ell(g, x, y - 15 * s, 7.6 * s, 2.2 * s); g.fill(); }
    if (lokum) {
      g.fillStyle = '#ff9fc0'; g.fillRect(x - 21 * s, y - 6 * s, 6 * s, 6 * s); g.fillStyle = '#fff'; g.fillRect(x - 21 * s, y - 6 * s, 6 * s, 1.5 * s);
      g.fillStyle = '#ffe7a8'; g.fillRect(x - 17 * s, y - 3 * s, 6 * s, 5 * s);
    }
  };
  A.salep = function (g, x, y, s, lv) {
    g.fillStyle = '#f4efe4'; ell(g, x, y, 13 * s, 4 * s); g.fill();
    g.fillStyle = '#c96a3a'; ui.roundRect(g, x - 9 * s, y - 20 * s, 18 * s, 18 * s, 4 * s); g.fill();
    g.strokeStyle = '#c96a3a'; g.lineWidth = 2.4 * s; g.beginPath(); g.arc(x + 10 * s, y - 11 * s, 4 * s, -Math.PI / 2, Math.PI / 2); g.stroke();
    g.fillStyle = lv > 0.05 ? '#f7eedb' : '#d7c7a8'; ell(g, x, y - 20 * s, 8.5 * s, 2.6 * s); g.fill();
    if (lv > 0.05) { g.fillStyle = '#8b4a1c'; for (var i = 0; i < 5; i++) { ell(g, x - 5 * s + i * 2.5 * s, y - 20 * s + ((i % 2) - 0.5) * 1.2 * s, 0.9 * s, 0.9 * s); g.fill(); } }
  };
  A.ayran = function (g, x, y, s, lv) {
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x - 7 * s, y - 24 * s, 14 * s, 22 * s);
    if (lv > 0.02) { var h = 20 * s * lv; g.fillStyle = '#f8f8f2'; g.fillRect(x - 6.5 * s, y - 2 * s - h, 13 * s, h); g.fillStyle = '#ffffff'; ell(g, x, y - 2 * s - h, 6.5 * s, 2 * s); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.3 * s; g.strokeRect(x - 7 * s, y - 24 * s, 14 * s, 22 * s);
  };
  A.water = function (g, x, y, s, lv, soda) {
    var col = soda ? 'rgba(90,180,100,0.55)' : 'rgba(150,210,255,0.5)';
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x - 6 * s, y - 2 * s); g.lineTo(x - 6 * s, y - 18 * s); g.quadraticCurveTo(x - 6 * s, y - 23 * s, x - 2.5 * s, y - 25 * s); g.lineTo(x - 2.5 * s, y - 31 * s); g.lineTo(x + 2.5 * s, y - 31 * s); g.lineTo(x + 2.5 * s, y - 25 * s); g.quadraticCurveTo(x + 6 * s, y - 23 * s, x + 6 * s, y - 18 * s); g.lineTo(x + 6 * s, y - 2 * s); g.closePath(); g.fill();
    g.strokeStyle = soda ? '#2e7d32' : 'rgba(255,255,255,0.9)'; g.lineWidth = 1.2 * s; g.stroke();
    g.fillStyle = soda ? '#f1c40f' : '#1e88e5'; g.fillRect(x - 3 * s, y - 34 * s, 6 * s, 3 * s);
    if (lv > 0.05) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - 4 * s, y - 14 * s, 8 * s, 5 * s); }
  };
  A.simit = function (g, x, y, s, lv) {
    g.fillStyle = 'rgba(255,255,255,0.85)'; ell(g, x, y + 1 * s, 13 * s, 4 * s); g.fill();
    g.save();
    if (lv < 0.99) { g.beginPath(); g.moveTo(x, y - 6 * s); g.arc(x, y - 6 * s, 20 * s, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.15, lv)); g.closePath(); g.clip(); }
    g.strokeStyle = '#a8621f'; g.lineWidth = 6 * s; ell(g, x, y - 5 * s, 10 * s, 5 * s); g.stroke();
    g.strokeStyle = '#d18b3c'; g.lineWidth = 3 * s; ell(g, x, y - 6 * s, 10 * s, 5 * s); g.stroke();
    g.fillStyle = '#fff2c9';
    for (var i = 0; i < 9; i++) { var a = i / 9 * TAU; ell(g, x + Math.cos(a) * 10 * s, y - 6 * s + Math.sin(a) * 5 * s, 0.9 * s, 0.6 * s); g.fill(); }
    g.restore();
  };
  A.tost = function (g, x, y, s, lv) {
    g.fillStyle = '#f4efe4'; ell(g, x, y, 14 * s, 4.5 * s); g.fill();
    var n = lv > 0.5 ? 2 : lv > 0.01 ? 1 : 0;
    for (var i = 0; i < n; i++) {
      var ox = x + (i ? 4 : -5) * s, oy = y - (i ? 4 : 2) * s;
      g.fillStyle = '#e6a64c'; g.beginPath(); g.moveTo(ox - 9 * s, oy); g.lineTo(ox + 9 * s, oy); g.lineTo(ox, oy - 9 * s); g.closePath(); g.fill();
      g.fillStyle = '#ffd36b'; g.fillRect(ox - 8 * s, oy - 1.5 * s, 16 * s, 1.5 * s);
      g.strokeStyle = 'rgba(110,60,15,0.75)'; g.lineWidth = 1 * s;
      g.beginPath(); g.moveTo(ox - 4 * s, oy - 2 * s); g.lineTo(ox - 1 * s, oy - 7 * s); g.moveTo(ox + 1 * s, oy - 2 * s); g.lineTo(ox + 3 * s, oy - 5 * s); g.stroke();
    }
  };
  // Tek giriş: tür + çeşit
  A.item = function (g, kind, v, x, y, s, lv) {
    switch (kind) {
      case 'cay': A.teaGlass(g, x, y, s, A.TEA[v] || A.TEA.normal, lv); break;
      case 'oralet': A.teaGlass(g, x, y, s, A.TEA.portakal, lv); break;
      case 'ihlamur': A.teaGlass(g, x, y, s, A.TEA.ihlamur, lv); break;
      case 'kahve': A.coffee(g, x, y, s, lv, true); break;
      case 'salep': A.salep(g, x, y, s, lv); break;
      case 'ayran': A.ayran(g, x, y, s, lv); break;
      case 'su': A.water(g, x, y, s, lv, v === 'soda'); break;
      case 'simit': A.simit(g, x, y, s, lv); break;
      case 'tost': A.tost(g, x, y, s, lv); break;
    }
  };

  // Tavla (masada açık)
  A.tavla = function (g, x, y, s) {
    g.fillStyle = '#5a2e12'; ui.roundRect(g, x - 30 * s, y - 13 * s, 60 * s, 24 * s, 3 * s); g.fill();
    g.fillStyle = '#e9c98f'; g.fillRect(x - 27 * s, y - 10 * s, 25 * s, 18 * s); g.fillRect(x + 2 * s, y - 10 * s, 25 * s, 18 * s);
    for (var i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? '#7a1f12' : '#2b1a0c';
      g.beginPath(); g.moveTo(x - 27 * s + i * 5 * s, y - 10 * s); g.lineTo(x - 24.5 * s + i * 5 * s, y - 3 * s); g.lineTo(x - 22 * s + i * 5 * s, y - 10 * s); g.fill();
      g.beginPath(); g.moveTo(x + 2 * s + i * 5 * s, y + 8 * s); g.lineTo(x + 4.5 * s + i * 5 * s, y + 1 * s); g.lineTo(x + 7 * s + i * 5 * s, y + 8 * s); g.fill();
    }
    g.fillStyle = '#fff'; ell(g, x - 14 * s, y + 4 * s, 3 * s, 2 * s); g.fill(); ell(g, x + 16 * s, y - 5 * s, 3 * s, 2 * s); g.fill();
    g.fillStyle = '#c0392b'; ell(g, x - 8 * s, y + 4 * s, 3 * s, 2 * s); g.fill(); ell(g, x + 21 * s, y - 5 * s, 3 * s, 2 * s); g.fill();
  };

  // Zar (yüz 1..6)
  A.die = function (g, x, y, sz, face, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.fillStyle = '#fffdf6'; ui.roundRect(g, -sz / 2, -sz / 2, sz, sz, sz * 0.2); g.fill();
    g.strokeStyle = '#8a6a4a'; g.lineWidth = 2; g.stroke();
    var P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[face] || [];
    g.fillStyle = face === 1 ? '#c0392b' : '#2b1a0c';
    for (var i = 0; i < P.length; i++) { ell(g, P[i][0] * sz * 0.26, P[i][1] * sz * 0.26, sz * 0.09, sz * 0.09); g.fill(); }
    g.restore();
  };

  // ---------------------------------------------------------------------------
  // Karakterler — ayak ortası (0,0), yukarı negatif
  // ---------------------------------------------------------------------------
  // o: { vest, shirt, skin, hair, mustache, cap, face(-1|1), step, moving, swing, load, sweat, apron, tabla, wow }
  A.waiter = function (g, x, y, s, o) {
    var moving = o.moving, ph = o.step || 0;
    var bounce = moving ? Math.abs(Math.sin(ph)) * 5 : 0;
    g.save();
    g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,0.28)'; ell(g, 0, 0, 24 * s, 6 * s); g.fill();
    g.scale(s * (o.face < 0 ? -1 : 1), s);
    g.translate(0, -bounce);
    g.lineCap = 'round';
    var sw = moving ? Math.sin(ph) : 0;
    // bacaklar
    g.strokeStyle = o.pants || '#2b2b36'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(-6, -50); g.lineTo(-6 + sw * 14, -4); g.stroke();
    g.beginPath(); g.moveTo(6, -50); g.lineTo(6 - sw * 14, -4); g.stroke();
    g.fillStyle = '#141414'; ell(g, -4 + sw * 14, -2, 8, 4); g.fill(); ell(g, 8 - sw * 14, -2, 8, 4); g.fill();
    // arka kol
    g.strokeStyle = o.shirt || '#f4f1ea'; g.lineWidth = 9;
    g.beginPath(); g.moveTo(-13, -92); g.lineTo(-20 - sw * 10, -62); g.stroke();
    g.fillStyle = o.skin || '#e0ac69'; ell(g, -20 - sw * 10, -60, 5, 5); g.fill();
    // gövde
    g.fillStyle = o.shirt || '#f4f1ea'; ui.roundRect(g, -17, -102, 34, 56, 11); g.fill();
    if (o.apron) { g.fillStyle = '#ffffff'; ui.roundRect(g, -16, -78, 32, 40, 6); g.fill(); g.strokeStyle = '#ddd'; g.lineWidth = 1; g.stroke(); }
    if (o.vest) {
      g.fillStyle = o.vest;
      g.beginPath(); g.moveTo(-17, -96); g.lineTo(-3, -84); g.lineTo(-4, -46); g.lineTo(-17, -46); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(17, -96); g.lineTo(3, -84); g.lineTo(4, -46); g.lineTo(17, -46); g.closePath(); g.fill();
      g.fillStyle = '#e8c27a'; ell(g, -6, -72, 1.8, 1.8); g.fill(); ell(g, -6, -62, 1.8, 1.8); g.fill(); ell(g, -6, -52, 1.8, 1.8); g.fill();
    }
    g.fillStyle = '#2b1a0c'; g.fillRect(-17, -50, 34, 5); // kemer
    // omuzdaki havlu
    if (o.towel) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-17, -100); g.lineTo(-9, -102); g.lineTo(-11, -80); g.lineTo(-18, -82); g.closePath(); g.fill(); g.strokeStyle = '#c0392b'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-17, -86); g.lineTo(-11, -85); g.stroke(); }
    // baş
    var hy = -116;
    g.fillStyle = o.skin || '#e0ac69'; ell(g, 0, hy, 15, 16); g.fill();
    ell(g, -14, hy + 1, 3, 4); g.fill(); ell(g, 14, hy + 1, 3, 4); g.fill();
    g.fillStyle = o.hair || '#1b120c';
    g.beginPath(); g.arc(0, hy - 3, 15.5, Math.PI * 1.02, Math.PI * 1.98); g.fill();
    if (o.cap) { g.fillStyle = o.cap; g.beginPath(); g.ellipse(0, hy - 9, 17, 9, 0, Math.PI, TAU); g.fill(); g.fillRect(-2, hy - 11, 22, 4); }
    // yüz
    g.fillStyle = '#1b120c';
    if (o.wow) { ell(g, -5, hy - 2, 2.6, 3.2); g.fill(); ell(g, 6, hy - 2, 2.6, 3.2); g.fill(); }
    else { ell(g, -5, hy - 2, 2, 2.2); g.fill(); ell(g, 6, hy - 2, 2, 2.2); g.fill(); }
    g.strokeStyle = '#1b120c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-9, hy - 8); g.lineTo(-2, hy - 7); g.moveTo(2, hy - 7); g.lineTo(10, hy - 8); g.stroke();
    g.fillStyle = 'rgba(160,80,50,0.5)'; ell(g, 2, hy + 3, 3, 3); g.fill();
    if (o.mustache) {
      g.fillStyle = o.hair || '#1b120c';
      g.beginPath(); g.moveTo(-12, hy + 9); g.quadraticCurveTo(-7, hy + 2, 1, hy + 6); g.quadraticCurveTo(8, hy + 2, 13, hy + 9);
      g.quadraticCurveTo(13, hy + 13, 9, hy + 10); g.quadraticCurveTo(1, hy + 10, -8, hy + 10); g.quadraticCurveTo(-13, hy + 13, -12, hy + 9); g.fill();
    } else {
      g.strokeStyle = '#7a2a1a'; g.lineWidth = 2; g.beginPath(); g.arc(1, hy + 6, 5, 0.2, Math.PI - 0.2); g.stroke();
    }
    g.fillStyle = 'rgba(255,90,90,0.28)'; ell(g, -9, hy + 5, 3.5, 2.5); g.fill(); ell(g, 10, hy + 5, 3.5, 2.5); g.fill();
    // simitçi tablası
    if (o.tabla) {
      g.fillStyle = '#7a4a22'; ell(g, 0, hy - 18, 34, 7); g.fill();
      for (var t = 0; t < 7; t++) {
        var tx = -24 + (t % 4) * 16 + (t >= 4 ? 8 : 0), ty = hy - 24 - (t >= 4 ? 8 : 0);
        g.strokeStyle = '#a8621f'; g.lineWidth = 5; ell(g, tx, ty, 8, 4); g.stroke();
        g.strokeStyle = '#d18b3c'; g.lineWidth = 2; ell(g, tx, ty - 1, 8, 4); g.stroke();
      }
    }
    // tepsi tutan kol + askılı tepsi
    if (o.tray !== false) {
      var hx = 26, hyy = -64;
      g.strokeStyle = o.shirt || '#f4f1ea'; g.lineWidth = 9;
      g.beginPath(); g.moveTo(13, -92); g.lineTo(hx - 2, hyy - 4); g.stroke();
      g.fillStyle = o.skin || '#e0ac69'; ell(g, hx, hyy, 5, 5); g.fill();
      g.save();
      g.translate(hx, hyy);
      g.rotate(o.swing || 0);
      g.strokeStyle = '#c9c9d2'; g.lineWidth = 2.4;
      g.beginPath(); g.arc(0, -3, 5, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-26, 6, -24, 36); g.moveTo(0, 0); g.quadraticCurveTo(26, 6, 24, 36); g.moveTo(0, 0); g.lineTo(0, 34); g.stroke();
      // tepsi
      g.fillStyle = '#8f8f9a'; ell(g, 0, 38, 27, 6.5); g.fill();
      g.fillStyle = '#dcdce4'; ell(g, 0, 36, 26, 5.5); g.fill();
      var n = Math.min(o.load || 0, 9);
      for (var i = 0; i < n; i++) {
        var layer = i < 5 ? 0 : 1, k = layer ? i - 5 : i, cnt = layer ? Math.min(4, n - 5) : Math.min(5, n);
        var gx = (k - (cnt - 1) / 2) * 9, gy = 36 - layer * 13;
        A.teaGlass(g, gx, gy, 0.5, o.colors ? o.colors[i % o.colors.length] : A.TEA.normal, 1, false);
      }
      g.restore();
    }
    g.restore();
  };

  // Kedi (Sarman) — durum: sleep | sit | walk | dance | jump
  A.cat = function (g, x, y, s, st, t, dir) {
    var orange = '#e8913a', dark = '#b8621c', cream = '#ffe2b8';
    g.save(); g.translate(x, y); g.scale(s * (dir < 0 ? -1 : 1), s);
    if (st === 'sleep') {
      var br = 1 + Math.sin(t * 2) * 0.03;
      g.fillStyle = 'rgba(0,0,0,0.25)'; ell(g, 0, 2, 30, 5); g.fill();
      g.fillStyle = orange; ell(g, 0, -10, 28 * br, 15 * br); g.fill();
      g.strokeStyle = dark; g.lineWidth = 3;
      for (var i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * 8, -18, 6, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
      g.strokeStyle = orange; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(24, -6); g.quadraticCurveTo(26, 6, 0, 4); g.quadraticCurveTo(-14, 4, -20, 0); g.stroke();
      g.fillStyle = orange; ell(g, -20, -10, 12, 11); g.fill();
      g.beginPath(); g.moveTo(-30, -15); g.lineTo(-28, -26); g.lineTo(-22, -18); g.fill(); g.beginPath(); g.moveTo(-18, -19); g.lineTo(-12, -27); g.lineTo(-10, -16); g.fill();
      g.fillStyle = cream; ell(g, -22, -6, 6, 4); g.fill();
      g.strokeStyle = '#3a1f0e'; g.lineWidth = 1.5; g.beginPath(); g.arc(-25, -11, 2.5, 0.2, Math.PI - 0.2); g.stroke(); g.beginPath(); g.arc(-17, -11, 2.5, 0.2, Math.PI - 0.2); g.stroke();
    } else if (st === 'walk' || st === 'jump') {
      var ph = t * 12;
      g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, 0, 2, 24, 4); g.fill();
      g.strokeStyle = orange; g.lineWidth = 5; g.lineCap = 'round';
      for (var l = 0; l < 4; l++) { var lx = l < 2 ? -14 + l * 6 : 10 + (l - 2) * 6; var sw = Math.sin(ph + l * Math.PI / 2) * 5; g.beginPath(); g.moveTo(lx, -10); g.lineTo(lx + sw, 0); g.stroke(); }
      g.fillStyle = orange; ell(g, 0, -14, 22, 10); g.fill();
      g.strokeStyle = dark; g.lineWidth = 2.5; for (var k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(k * 8, -23); g.lineTo(k * 8 + 2, -16); g.stroke(); }
      g.strokeStyle = orange; g.lineWidth = 5; g.beginPath(); g.moveTo(-20, -16); g.quadraticCurveTo(-34, -24, -30, -40 + Math.sin(ph * 0.5) * 4); g.stroke();
      g.fillStyle = orange; ell(g, 22, -24, 10, 9); g.fill();
      g.beginPath(); g.moveTo(15, -29); g.lineTo(16, -40); g.lineTo(22, -32); g.fill(); g.beginPath(); g.moveTo(24, -32); g.lineTo(30, -40); g.lineTo(30, -28); g.fill();
      g.fillStyle = cream; ell(g, 27, -20, 5, 3.5); g.fill();
      g.fillStyle = '#2b1a0c'; ell(g, 25, -26, 1.6, 2.2); g.fill();
      g.fillStyle = '#ff7f9a'; ell(g, 31, -22, 1.6, 1.2); g.fill();
    } else { // sit / dance
      var dance = st === 'dance';
      var hop = dance ? Math.abs(Math.sin(t * 7)) * 10 : 0;
      g.translate(0, -hop);
      g.fillStyle = 'rgba(0,0,0,0.22)'; ell(g, 0, 2 + hop, 18, 4); g.fill();
      g.strokeStyle = orange; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(12, -6); g.quadraticCurveTo(30, -10, 24, -30 + Math.sin(t * 3) * 4); g.stroke();
      g.fillStyle = orange; g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(-16, -30, 0, -32); g.quadraticCurveTo(16, -30, 14, 0); g.closePath(); g.fill();
      g.fillStyle = cream; ell(g, 0, -12, 7, 11); g.fill();
      g.strokeStyle = dark; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-12, -20); g.lineTo(-6, -18); g.moveTo(12, -20); g.lineTo(6, -18); g.stroke();
      if (dance) {
        var w = Math.sin(t * 7) * 6;
        g.strokeStyle = orange; g.lineWidth = 5;
        g.beginPath(); g.moveTo(-10, -24); g.lineTo(-20, -40 + w); g.moveTo(10, -24); g.lineTo(20, -40 - w); g.stroke();
      } else { g.fillStyle = cream; ell(g, -6, -1, 4, 3); g.fill(); ell(g, 6, -1, 4, 3); g.fill(); }
      g.fillStyle = orange; ell(g, 0, -40, 13, 12); g.fill();
      g.beginPath(); g.moveTo(-12, -44); g.lineTo(-11, -58); g.lineTo(-3, -50); g.fill(); g.beginPath(); g.moveTo(12, -44); g.lineTo(11, -58); g.lineTo(3, -50); g.fill();
      g.fillStyle = '#ffb3c1'; g.beginPath(); g.moveTo(-10, -47); g.lineTo(-10, -54); g.lineTo(-6, -50); g.fill(); g.beginPath(); g.moveTo(10, -47); g.lineTo(10, -54); g.lineTo(6, -50); g.fill();
      g.strokeStyle = dark; g.lineWidth = 2; g.beginPath(); g.moveTo(-4, -51); g.lineTo(-3, -45); g.moveTo(4, -51); g.lineTo(3, -45); g.stroke();
      g.fillStyle = cream; ell(g, 0, -35, 7, 5); g.fill();
      g.fillStyle = '#2b1a0c';
      if (dance) { g.lineWidth = 1.8; g.strokeStyle = '#2b1a0c'; g.beginPath(); g.arc(-5, -40, 2.5, Math.PI + 0.3, -0.3); g.stroke(); g.beginPath(); g.arc(5, -40, 2.5, Math.PI + 0.3, -0.3); g.stroke(); }
      else { ell(g, -5, -41, 2, 2.8); g.fill(); ell(g, 5, -41, 2, 2.8); g.fill(); }
      g.fillStyle = '#ff7f9a'; ell(g, 0, -36, 1.8, 1.3); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-6, -35); g.lineTo(-17, -37); g.moveTo(-6, -34); g.lineTo(-17, -32); g.moveTo(6, -35); g.lineTo(17, -37); g.moveTo(6, -34); g.lineTo(17, -32); g.stroke();
    }
    g.restore();
  };

  // ---------------------------------------------------------------------------
  // Konuşma balonu önbelleği
  // ---------------------------------------------------------------------------
  var bubCache = new Map();
  A.bubble = function (text, o) {
    o = o || {};
    var key = text + '|' + (o.size || 22) + '|' + (o.bg || '') + '|' + (o.maxW || 0) + '|' + (o.name || '');
    var hit = bubCache.get(key);
    if (hit) return hit;
    if (bubCache.size > 400) bubCache.clear();
    var size = o.size || 22, padX = 14, maxW = o.maxW || 300;
    var m = cv(4, 4).getContext('2d');
    m.font = ui.font(size, 800);
    var s = text, w = m.measureText(s).width;
    if (w > maxW - padX * 2) {
      var arr = Array.from(s);
      while (arr.length > 1 && m.measureText(arr.join('') + '…').width > maxW - padX * 2) arr.pop();
      s = arr.join('') + '…'; w = m.measureText(s).width;
    }
    var nameW = 0;
    if (o.name) { m.font = ui.font(size * 0.72, 800); nameW = m.measureText(o.name).width; }
    var bw = Math.ceil(Math.max(w, nameW) + padX * 2), bh = Math.ceil(size * (o.name ? 2.35 : 1.6)), tail = 10;
    var c = cv(bw + 6, bh + tail + 6), g = c.getContext('2d');
    var bg = o.bg || '#fff6e6', bd = o.border || '#b88a5c';
    g.translate(3, 3);
    ui.roundRect(g, 0, 0, bw, bh, Math.min(18, bh / 2));
    g.fillStyle = bg; g.fill(); g.lineWidth = 2.5; g.strokeStyle = bd; g.stroke();
    g.beginPath(); g.moveTo(bw / 2 - 9, bh - 1.5); g.lineTo(bw / 2 + 1, bh + tail); g.lineTo(bw / 2 + 9, bh - 1.5);
    g.fillStyle = bg; g.fill(); g.stroke();
    g.fillStyle = bg; g.fillRect(bw / 2 - 7.5, bh - 4, 15, 4);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (o.name) {
      g.font = ui.font(size * 0.72, 800); g.fillStyle = o.nameColor || '#b0562a';
      g.fillText(o.name, bw / 2, size * 0.62);
      g.font = ui.font(size, 800); g.fillStyle = o.color || '#3b2314';
      g.fillText(s, bw / 2, size * 1.62);
    } else {
      g.font = ui.font(size, 800); g.fillStyle = o.color || '#3b2314';
      g.fillText(s, bw / 2, bh / 2 + 1);
    }
    var out = { c: c, w: c.width, h: c.height, ax: (bw / 2 + 3), ay: bh + tail + 3 }; // ax/ay = kuyruk ucu
    bubCache.set(key, out);
    return out;
  };

  // Avatar sprite önbelleği (profil fotoğrafı yüklenince yenilenir)
  var avCache = new Map();
  A.avatar = function (u) {
    var e = avCache.get(u.id);
    var img = u.avatar ? LG.avatarImg(u) : null;
    if (e && (e.img || !img)) return e.c;
    if (!e) {
      if (avCache.size > 800) avCache.clear();
      e = { c: cv(64, 64), img: false };
      avCache.set(u.id, e);
    }
    var g = e.c.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    ui.avatar(g, u, 32, 32, 28, { ring: '#fff3dc', ringWidth: 3 });
    e.img = !!img;
    return e.c;
  };

  // Kasket (müdavim şapkası)
  A.kasket = function (g, x, y, r, gold) {
    g.fillStyle = gold ? '#d4a017' : '#5b4636';
    g.beginPath(); g.ellipse(x, y - r * 0.55, r * 0.98, r * 0.5, 0, Math.PI, TAU); g.fill();
    g.fillStyle = gold ? '#b8860b' : '#3e2f24';
    g.beginPath(); g.ellipse(x + r * 0.15, y - r * 0.55, r * 1.05, r * 0.2, 0, 0, Math.PI); g.fill();
    g.strokeStyle = gold ? '#fff2a8' : 'rgba(255,255,255,0.18)'; g.lineWidth = Math.max(1, r * 0.06);
    g.beginPath(); g.moveTo(x - r * 0.5, y - r * 0.9); g.lineTo(x + r * 0.4, y - r * 0.95); g.stroke();
    if (gold) { g.fillStyle = '#fff6c0'; ell(g, x, y - r * 0.82, r * 0.12, r * 0.12); g.fill(); }
  };
})();
