/*
 * KARPUZ PATLAT! — çizim katmanı: bahçe arka planı, piknik masası + kesme tahtası,
 * deforme olan meyve gövdesi (bel incelir, alt/üst şişer), kabuk desenleri, lastikler,
 * çatlaklar, meyve suyu damlaları, parçalar, kameraya sıçrayan su, hidrolik pres, silecek, çıkartmalar.
 * Her şey kodla çizilir (dış dosya yok).
 */
(function () {
  'use strict';
  var KP = (window.KP = window.KP || {});
  var ui = LG.ui, W = LG.W, H = LG.H;
  var PI = Math.PI, TAU = PI * 2;
  var sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, sqrt = Math.sqrt, exp = Math.exp, pow = Math.pow;
  var A = (KP.art = {});
  var N = (A.N = 96);          // siluet örnek sayısı (enlem)
  var TILT = (A.TILT = 0.13);  // hafif yukarıdan bakış: halka elipslerinin basıklığı
  var BASE_Y = (A.BASE_Y = 1078);
  var BOARD = (A.BOARD = { x: 540, y: 1086, rx: 352, ry: 62, th: 26 });
  var TABLE_Y = (A.TABLE_Y = 1000);
  var VPY = 560;

  function mk(w, h) { var c = document.createElement('canvas'); c.width = max(1, Math.ceil(w)); c.height = max(1, Math.ceil(h)); return c; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrap(p) { p = (p + PI) % TAU; if (p < 0) p += TAU; return p - PI; }
  function cph(p) { return p < -PI / 2 ? -PI / 2 : p > PI / 2 ? PI / 2 : p; }
  A.mk = mk; A.wrap = wrap;

  // ---------------------------------------------------------------------------
  // Renkler
  // ---------------------------------------------------------------------------
  function parseHex(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  A.bandCols = function (hue, hex) {
    if (hex) {
      var c = parseHex(hex);
      return {
        c: hex,
        d: 'rgb(' + ((c[0] * 0.45) | 0) + ',' + ((c[1] * 0.45) | 0) + ',' + ((c[2] * 0.45) | 0) + ')',
        l: 'rgba(' + (((c[0] + 255 * 1.4) / 2.4) | 0) + ',' + (((c[1] + 255 * 1.4) / 2.4) | 0) + ',' + (((c[2] + 255 * 1.4) / 2.4) | 0) + ',0.8)',
      };
    }
    return { c: 'hsl(' + hue + ',92%,56%)', d: 'hsl(' + hue + ',85%,26%)', l: 'hsla(' + hue + ',100%,86%,0.8)' };
  };

  // ---------------------------------------------------------------------------
  // Arka plan (bir kez çizilir, önbellekte durur)
  // ---------------------------------------------------------------------------
  function circ(x, cx, cy, r) { x.moveTo(cx + r, cy); x.arc(cx, cy, r, 0, TAU); }
  function hill(x, y, amp, freq, color, ph) {
    x.fillStyle = color; x.beginPath(); x.moveTo(0, TABLE_Y + 10);
    for (var X = 0; X <= W + 20; X += 20) x.lineTo(X, y - amp * (0.5 + 0.5 * sin(X * freq + ph)) - 16 * sin(X * freq * 2.7 + ph * 2));
    x.lineTo(W, TABLE_Y + 10); x.closePath(); x.fill();
  }
  function tree(x, tx, ty, s) {
    x.fillStyle = '#7a4e26'; x.fillRect(tx - 7 * s, ty - 30 * s, 14 * s, 34 * s);
    x.fillStyle = '#3f9d45'; x.beginPath(); circ(x, tx, ty - 52 * s, 34 * s); circ(x, tx - 24 * s, ty - 36 * s, 24 * s); circ(x, tx + 24 * s, ty - 38 * s, 26 * s); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); circ(x, tx - 10 * s, ty - 64 * s, 14 * s); x.fill();
  }
  A.buildBg = function () {
    var c = mk(W, H), x = c.getContext('2d');
    // gökyüzü
    var g = x.createLinearGradient(0, 0, 0, TABLE_Y);
    g.addColorStop(0, '#2b9ff0'); g.addColorStop(0.42, '#86d3ff'); g.addColorStop(0.78, '#ffefc4'); g.addColorStop(1, '#ffd9a0');
    x.fillStyle = g; x.fillRect(0, 0, W, TABLE_Y + 12);
    // güneş
    var sg = x.createRadialGradient(900, 160, 30, 900, 160, 560);
    sg.addColorStop(0, 'rgba(255,250,205,1)'); sg.addColorStop(0.16, 'rgba(255,236,150,0.6)'); sg.addColorStop(1, 'rgba(255,236,150,0)');
    x.fillStyle = sg; x.fillRect(0, 0, W, 900);
    x.fillStyle = '#fff7cf'; x.beginPath(); circ(x, 900, 160, 82); x.fill();
    // tepeler
    hill(x, 860, 70, 0.0042, '#a7dc86', 1.3);
    tree(x, 120, 838, 1.0); tree(x, 300, 852, 0.8); tree(x, 790, 846, 0.9); tree(x, 985, 832, 1.1);
    hill(x, 915, 46, 0.0063, '#72c461', 4.1);
    // çalılar
    x.fillStyle = '#3e9a47';
    x.beginPath();
    for (var bx = -20; bx < W + 40; bx += 62) circ(x, bx, 952 + 10 * sin(bx * 0.05), 46 + 10 * sin(bx * 0.13));
    x.fill();
    x.fillStyle = '#2f8139';
    x.beginPath();
    for (bx = 10; bx < W + 40; bx += 74) circ(x, bx, 978, 34);
    x.fill();
    // çit
    for (var px = 6; px < W; px += 52) {
      x.fillStyle = '#fffdf5';
      x.beginPath(); x.moveTo(px, 1000); x.lineTo(px, 922); x.lineTo(px + 17, 902); x.lineTo(px + 34, 922); x.lineTo(px + 34, 1000); x.closePath(); x.fill();
      x.fillStyle = 'rgba(160,140,110,0.35)'; x.fillRect(px + 26, 922, 8, 78);
    }
    x.fillStyle = '#f6efe0'; x.fillRect(0, 936, W, 14); x.fillRect(0, 972, W, 14);
    x.fillStyle = 'rgba(150,120,90,0.3)'; x.fillRect(0, 948, W, 3); x.fillRect(0, 984, W, 3);
    // çiçekler (çitin arkasından bakan)
    var fl = [[60, 900, '🌻', 70], [175, 915, '🌷', 46], [930, 905, '🌻', 74], [1030, 918, '🌼', 48], [820, 922, '🌷', 42], [270, 925, '🌼', 40]];
    for (var i = 0; i < fl.length; i++) ui.emoji(x, fl[i][2], fl[i][0], fl[i][1], fl[i][3]);
    // masa örtüsü (kareli piknik örtüsü, perspektifli)
    x.fillStyle = '#fff8ee'; x.fillRect(0, TABLE_Y, W, H - TABLE_Y);
    function xAt(xb, y) { return 540 + (xb - 540) * (y - VPY) / (TABLE_Y - VPY); }
    x.fillStyle = 'rgba(226,40,66,0.5)';
    for (var k = -24; k < 24; k += 2) {
      var x0 = 540 + k * 54 - 27, x1 = x0 + 54;
      x.beginPath(); x.moveTo(xAt(x0, TABLE_Y), TABLE_Y); x.lineTo(xAt(x1, TABLE_Y), TABLE_Y); x.lineTo(xAt(x1, H), H); x.lineTo(xAt(x0, H), H); x.closePath(); x.fill();
    }
    var y0 = TABLE_Y, hh = 24, j = 0;
    while (y0 < H) { var y1 = y0 + hh; if (j % 2 === 0) x.fillRect(0, y0, W, y1 - y0); y0 = y1; hh *= 1.17; j++; }
    var tg = x.createLinearGradient(0, TABLE_Y, 0, TABLE_Y + 60);
    tg.addColorStop(0, 'rgba(60,20,10,0.35)'); tg.addColorStop(1, 'rgba(60,20,10,0)');
    x.fillStyle = tg; x.fillRect(0, TABLE_Y, W, 60);
    x.fillStyle = 'rgba(110,50,25,0.75)'; x.fillRect(0, TABLE_Y - 4, W, 7);
    var bg2 = x.createLinearGradient(0, 1250, 0, H);
    bg2.addColorStop(0, 'rgba(30,10,20,0)'); bg2.addColorStop(1, 'rgba(30,10,20,0.55)');
    x.fillStyle = bg2; x.fillRect(0, 1250, W, H - 1250);
    // kesme tahtası
    var B = BOARD;
    x.fillStyle = 'rgba(90,20,20,0.3)'; x.beginPath(); x.ellipse(B.x + 12, B.y + B.th + 12, B.rx + 20, B.ry + 16, 0, 0, TAU); x.fill();
    x.fillStyle = '#9a5c28';
    x.beginPath(); x.ellipse(B.x, B.y + B.th, B.rx, B.ry, 0, 0, PI); x.lineTo(B.x - B.rx, B.y); x.ellipse(B.x, B.y, B.rx, B.ry, 0, PI, 0, true); x.closePath(); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(B.x - B.rx, B.y + 2, B.rx * 2, 3);
    var wg = x.createRadialGradient(B.x - 80, B.y - 20, 20, B.x, B.y, B.rx);
    wg.addColorStop(0, '#f3c48d'); wg.addColorStop(1, '#cf8c4c');
    x.fillStyle = wg; x.beginPath(); x.ellipse(B.x, B.y, B.rx, B.ry, 0, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(120,60,20,0.16)'; x.lineWidth = 3;
    for (var r = 0.22; r < 0.95; r += 0.14) { x.beginPath(); x.ellipse(B.x + 20, B.y + 2, B.rx * r, B.ry * r, 0, 0, TAU); x.stroke(); }
    x.strokeStyle = 'rgba(255,235,200,0.7)'; x.lineWidth = 3; x.beginPath(); x.ellipse(B.x, B.y, B.rx - 2, B.ry - 2, 0, PI * 1.05, PI * 1.95); x.stroke();
    return c;
  };

  // Bulut sprite'ı
  A.cloud = (function () {
    var c = mk(320, 150), x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,0.95)';
    x.beginPath(); circ(x, 90, 92, 52); circ(x, 160, 70, 66); circ(x, 232, 92, 50); circ(x, 128, 106, 40); circ(x, 200, 108, 40); x.fill();
    x.fillStyle = 'rgba(190,215,240,0.55)';
    x.beginPath(); x.ellipse(165, 128, 120, 16, 0, 0, TAU); x.fill();
    return c;
  })();
  A.drawSky = function (ctx, t) {
    // güneş ışınları
    ctx.save();
    ctx.translate(900, 160); ctx.rotate(t * 0.05);
    ctx.fillStyle = 'rgba(255,248,210,0.14)';
    ctx.beginPath();
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * TAU;
      ctx.moveTo(cos(a - 0.08) * 110, sin(a - 0.08) * 110);
      ctx.lineTo(cos(a - 0.05) * 560, sin(a - 0.05) * 560);
      ctx.lineTo(cos(a + 0.05) * 560, sin(a + 0.05) * 560);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
    // bulutlar
    var cl = [[0.0, 120, 0.9, 14], [0.45, 330, 0.65, 9], [0.75, 640, 0.75, 11]];
    for (var k = 0; k < cl.length; k++) {
      var span = W + 420;
      var x = ((cl[k][0] * span + t * cl[k][3]) % span) - 340;
      var s = cl[k][2];
      ctx.drawImage(A.cloud, x, cl[k][1], 320 * s, 150 * s);
    }
  };

  // ---------------------------------------------------------------------------
  // Meyve geometrisi: siluetin her enlemdeki yarı genişliği (hw). v = -1 (tepe) .. 1 (dip)
  // ---------------------------------------------------------------------------
  function shapeFn(sh, v) {
    var q = 1 - v * v;
    if (q <= 0) return 0;
    switch (sh) {
      case 'pumpkin': return sqrt(max(0, 1 - pow(abs(v), 2.4)));
      case 'balloon': return sqrt(q) * (1 - 0.17 * v);
      case 'barrel': return pow(q, 0.36);
      default: return sqrt(q);
    }
  }
  A.G = { F: null, cx: 540, cy: 800, RX: 270, RY: 250, hw: new Float32Array(N + 1), pinch: new Float32Array(N + 1), spin: 0 };
  // o: {x, base, pv, sq, press, bands, waist}
  A.computeGeom = function (g, F, o) {
    var pv = o.pv;
    var RX = F.rx * (1 - 0.03 * pv) * (1 + o.sq) * (1 + o.press * 0.6);
    var RY = F.ry * (1 + 0.1 * pv) * (1 - o.sq * 0.85) * (1 - o.press);
    g.F = F; g.RX = RX; g.RY = RY; g.cx = o.x;
    g.cy = o.base - RY - (F.top === 'knot' ? 24 : 0);
    var p = g.pinch, hw = g.hw, i;
    p.fill(0);
    var bands = o.bands || [];
    var sig = 0.03, inv = 1 / (2 * sig * sig);
    var pf = 0.45 + 0.9 * pv;
    for (var b = 0; b < bands.length; b++) {
      var bd = bands[b];
      var depth = min(0.03, bd.lw * 0.0017) * pf * (1 + 2.4 * bd.snap);
      var ci = (bd.v + 1) * 0.5 * N;
      var i0 = max(0, Math.floor(ci - 5)), i1 = min(N, Math.ceil(ci + 5));
      for (i = i0; i <= i1; i++) {
        var dv = (-1 + 2 * i / N) - bd.v;
        p[i] += depth * exp(-dv * dv * inv);
      }
    }
    var wsq = 0.28 * pv + (o.extraWaist || 0), wc = o.waist || 0, bul = 0.11 * pv + (o.extraBulge || 0);
    var wInv = 1 / (2 * 0.24 * 0.24), bInv = 1 / (2 * 0.17 * 0.17);
    for (i = 0; i <= N; i++) {
      var v = -1 + 2 * i / N;
      var s = shapeFn(F.shape, v);
      var dw = v - wc, db = abs(v) - 0.62;
      var d = 1 - wsq * exp(-dw * dw * wInv) + bul * exp(-db * db * bInv) - min(0.085, p[i]);
      hw[i] = RX * s * d;
    }
    return g;
  };
  A.hwAt = function (g, v) {
    var f = (v + 1) * 0.5 * N;
    if (f <= 0) return g.hw[0];
    if (f >= N) return g.hw[N];
    var i = Math.floor(f), fr = f - i;
    return g.hw[i] + (g.hw[i + 1] - g.hw[i]) * fr;
  };
  // Yüzey noktası (φ boylam: 0 = ön, ±π/2 = kenar)
  var SP = { x: 0, y: 0, c: 0 };
  A.sp = function (g, phi, v) {
    var h = A.hwAt(g, v);
    SP.x = g.cx + h * sin(phi);
    SP.y = g.cy + v * g.RY + h * TILT * cos(phi);
    SP.c = cos(phi);
    return SP;
  };
  A.outline = function (ctx, g) {
    var hw = g.hw, cx = g.cx, cy = g.cy, RY = g.RY, i;
    ctx.beginPath();
    ctx.moveTo(cx, cy - RY);
    for (i = 1; i <= N; i++) ctx.lineTo(cx + hw[i], cy + (-1 + 2 * i / N) * RY);
    for (i = N - 1; i >= 1; i--) ctx.lineTo(cx - hw[i], cy + (-1 + 2 * i / N) * RY);
    ctx.closePath();
  };
  A.topY = function (g) {
    var F = g.F;
    return g.cy - g.RY - (F.top === 'crown' ? 78 : F.top === 'stem' ? 58 : F.top === 'nub' ? 14 : 0);
  };

  // ---------------------------------------------------------------------------
  // Kabuk desenleri (siluete kırpılmış hâlde çizilir)
  // ---------------------------------------------------------------------------
  function patStripes(ctx, g, F) {
    ctx.fillStyle = F.pc;
    var NS = 11, M = 34;
    for (var k = 0; k < NS; k++) {
      var p0 = wrap((k / NS) * TAU + g.spin + 0.12);
      if (cos(p0) < -0.15) continue;
      var w = 0.15, j, v, wig, p;
      ctx.beginPath();
      for (j = 0; j <= M; j++) {
        v = -0.995 + 1.99 * j / M;
        wig = 0.075 * sin(v * 16 + k * 2.3) + 0.03 * sin(v * 37 + k * 5.1);
        p = A.sp(g, cph(p0 - w + wig), v);
        if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      for (j = M; j >= 0; j--) {
        v = -0.995 + 1.99 * j / M;
        wig = 0.075 * sin(v * 16 + k * 2.3 + 1.7) + 0.03 * sin(v * 33 + k * 3.3);
        p = A.sp(g, cph(p0 + w + wig), v);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath(); ctx.fill();
    }
  }
  var SPECK = [];
  for (var si = 0; si < 46; si++) SPECK.push({ p: (Math.random() - 0.5) * 2.8, v: (Math.random() - 0.5) * 1.8, r: 2 + Math.random() * 5 });
  function patNet(ctx, g, F) {
    var k, j, v, p;
    // yeşil damarlar
    ctx.fillStyle = 'rgba(110,150,40,0.35)';
    ctx.beginPath();
    for (k = 0; k < SPECK.length; k++) {
      var s = SPECK[k];
      if (cos(s.p) < 0.1) continue;
      p = A.sp(g, s.p, s.v);
      ctx.moveTo(p.x + s.r * 2, p.y); ctx.ellipse(p.x, p.y, s.r * 2 * p.c + 1, s.r, 0, 0, TAU);
    }
    ctx.fill();
    ctx.strokeStyle = F.pc; ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (k = 0; k < 18; k++) {
      var p0 = wrap(k / 18 * TAU + 0.1);
      if (cos(p0) < 0.04) continue;
      for (j = 0; j <= 26; j++) {
        v = -0.97 + 1.94 * j / 26;
        p = A.sp(g, cph(p0 + 0.06 * sin(v * 11 + k * 2.7)), v);
        if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
    }
    for (var r = 1; r < 11; r++) {
      var vr = -1 + r * 2 / 11;
      for (j = 0; j <= 22; j++) {
        var ph = -1.5 + 3.0 * j / 22;
        p = A.sp(g, ph, vr + 0.025 * sin(ph * 8 + r * 1.9));
        if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  }
  function meridian(ctx, g, p0) {
    ctx.beginPath();
    for (var j = 0; j <= 28; j++) {
      var v = -0.985 + 1.97 * j / 28;
      var p = A.sp(g, p0, v);
      if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
  }
  function patRibs(ctx, g, F) {
    var NR = 12;
    for (var k = 0; k < NR; k++) {
      var p0 = wrap(k / NR * TAU + PI / NR);
      var pm = wrap(p0 + PI / NR);
      if (cos(pm) > 0.05) { ctx.strokeStyle = 'rgba(255,225,150,0.26)'; ctx.lineWidth = 6 + 26 * cos(pm); meridian(ctx, g, pm); ctx.stroke(); }
      var c0 = cos(p0);
      if (c0 < 0.02) continue;
      ctx.strokeStyle = F.pc; ctx.lineWidth = 2 + 7 * c0; meridian(ctx, g, p0); ctx.stroke();
    }
  }
  function patDiamond(ctx, g, F) {
    var dir, k, j, v, ph, p, started;
    ctx.strokeStyle = F.pc; ctx.lineWidth = 3;
    ctx.beginPath();
    for (dir = -1; dir <= 1; dir += 2) {
      for (k = 0; k < 16; k++) {
        started = false;
        for (j = 0; j <= 24; j++) {
          v = -0.96 + 1.92 * j / 24;
          ph = wrap(k / 16 * TAU + dir * v * 2.4);
          if (cos(ph) < 0) { started = false; continue; }
          p = A.sp(g, ph, v);
          if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
        }
      }
    }
    ctx.stroke();
    // gözler (baklava ortaları)
    var D = TAU / 16, dv = D / 4.8;
    ctx.fillStyle = 'rgba(110,62,8,0.85)';
    ctx.beginPath();
    for (var n = -11; n <= 11; n++) {
      v = n * dv * 1.0;
      if (abs(v) > 0.93) continue;
      var off = (abs(n) % 2 === 1) ? 0 : 0.5;
      for (k = 0; k < 16; k++) {
        ph = wrap((k + off) * D);
        var c = cos(ph);
        if (c < 0.15) continue;
        p = A.sp(g, ph, v);
        var s = 7 * c * (1 - abs(v) * 0.4);
        ctx.moveTo(p.x - s, p.y + s * 0.5); ctx.lineTo(p.x, p.y - s * 0.9); ctx.lineTo(p.x + s, p.y + s * 0.5); ctx.closePath();
      }
    }
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // Meyve gövdesi
  // st: { bands, cracks, pv, tease, drips, t, glow }
  // ---------------------------------------------------------------------------
  A.drawFruitBody = function (ctx, g, st) {
    var F = g.F, cx = g.cx, cy = g.cy, RX = g.RX, RY = g.RY;
    // balon ipi (gövdenin arkasında, tahtaya kıvrılır)
    if (F.top === 'knot') {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy + RY + 22);
      ctx.bezierCurveTo(cx + 30, BASE_Y + 22, cx + 90, BASE_Y + 4, cx + 150, BASE_Y + 18);
      ctx.bezierCurveTo(cx + 210, BASE_Y + 34, cx + 240, BASE_Y + 10, cx + 270, BASE_Y + 22);
      ctx.stroke();
    }
    A.outline(ctx, g);
    var grad = ctx.createRadialGradient(cx - RX * 0.35, cy - RY * 0.42, RX * 0.08, cx, cy, RX * 1.15);
    grad.addColorStop(0, F.skin[0]); grad.addColorStop(0.55, F.skin[1]); grad.addColorStop(1, F.skin[2]);
    ctx.fillStyle = grad; ctx.fill();
    ctx.save();
    ctx.clip();
    if (F.pattern === 'stripes') patStripes(ctx, g, F);
    else if (F.pattern === 'net') patNet(ctx, g, F);
    else if (F.pattern === 'ribs') patRibs(ctx, g, F);
    else if (F.pattern === 'diamond') patDiamond(ctx, g, F);
    // gerilen kabuk: şişen bölgeler açılır
    if (st.pv > 0.2) {
      var sa = (st.pv - 0.2) * 0.32;
      ctx.fillStyle = 'rgba(255,255,255,' + sa.toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(cx, cy - RY * 0.6, RX * 0.55, RY * 0.16, 0, 0, TAU);
      ctx.ellipse(cx, cy + RY * 0.6, RX * 0.55, RY * 0.16, 0, 0, TAU);
      ctx.fill();
    }
    // iç kenar gölgesi (deforme siluete uyar)
    A.outline(ctx, g);
    ctx.lineWidth = 40; ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.stroke();
    ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.stroke();
    // ışık
    var lg = ctx.createRadialGradient(cx - RX * 0.4, cy - RY * 0.45, 4, cx - RX * 0.15, cy - RY * 0.15, RX * 1.25);
    lg.addColorStop(0, 'rgba(255,255,255,0.45)'); lg.addColorStop(0.32, 'rgba(255,255,255,0.07)'); lg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = lg; ctx.fillRect(cx - RX * 1.16, cy - RY * 1.04, RX * 2.32, RY * 2.08);
    // kırmızı gerilim parıltısı
    if (st.glow > 0) {
      ctx.fillStyle = 'rgba(255,40,40,' + (st.glow * 0.22).toFixed(3) + ')';
      ctx.fillRect(cx - RX * 1.16, cy - RY * 1.04, RX * 2.32, RY * 2.08);
    }
    // parlak yansıma
    ctx.save();
    ctx.translate(cx - RX * 0.42, cy - RY * 0.52); ctx.rotate(-0.62);
    ctx.fillStyle = F.top === 'knot' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(0, 0, RX * (F.top === 'knot' ? 0.26 : 0.2), RY * 0.075, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(RX * 0.3, RY * 0.02, 8, 0, TAU); ctx.fill();
    ctx.restore();
    if (F.top === 'knot') {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.ellipse(cx + RX * 0.45, cy + RY * 0.35, RX * 0.12, RY * 0.05, -0.9, 0, TAU); ctx.fill();
    }
    // arkadaki lastik yayları (soluk)
    if (st.backFn) st.backFn(ctx); else A.drawBandsBack(ctx, g, st.bands);
    // çatlaklar
    A.drawCracks(ctx, g, F, st.cracks, st.pv, st.tease);
    // yüzeyden süzülen damlalar
    var drips = st.drips;
    if (drips && drips.length) {
      for (var d = 0; d < drips.length; d++) {
        var dp = drips[d];
        if (dp.st) continue;
        var q = A.sp(g, dp.p, dp.v);
        teardrop(ctx, q.x, q.y, dp.r, F.juice);
      }
    }
    ctx.restore();
    // dış çizgi
    A.outline(ctx, g);
    ctx.lineWidth = 5; ctx.strokeStyle = F.outline; ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
    A.drawTop(ctx, g, F, st.t);
  };

  A.drawBandsBack = function (ctx, g, bands) {
    var cx = g.cx, cy = g.cy, RY = g.RY;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.26;
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var s2 = b.snap * b.snap;
      var rx = (A.hwAt(g, b.v) + b.lw * 0.3) * (1 + 0.5 * s2);
      ctx.strokeStyle = b.c; ctx.lineWidth = b.lw * 0.8;
      ctx.beginPath(); ctx.ellipse(cx, cy + b.v * RY - 46 * s2, rx, rx * TILT, 0, PI * 1.04, PI * 1.96); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  function teardrop(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, PI); ctx.lineTo(x, y - r * 2.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.1, r * 0.3, 0, TAU); ctx.fill();
  }
  A.teardrop = teardrop;

  A.drawCracks = function (ctx, g, F, cracks, pv, tease) {
    if (!cracks) return;
    var juicy = F.burst === 'juice';
    for (var i = 0; i < cracks.length; i++) {
      var c = cracks[i];
      var rev = clamp((pv + tease - c.start) / 0.3, 0, 1);
      if (rev <= 0) continue;
      var segs = rev * (c.pts.length - 1);
      var nfull = Math.floor(segs), fr = segs - nfull;
      var pts = c.pts;
      ctx.beginPath();
      var p = A.sp(g, pts[0].p, pts[0].v); ctx.moveTo(p.x, p.y);
      for (var k = 1; k <= nfull && k < pts.length; k++) { p = A.sp(g, pts[k].p, pts[k].v); ctx.lineTo(p.x, p.y); }
      if (fr > 0 && nfull + 1 < pts.length) {
        var a = pts[nfull], b = pts[nfull + 1];
        p = A.sp(g, a.p + (b.p - a.p) * fr, a.v + (b.v - a.v) * fr); ctx.lineTo(p.x, p.y);
      }
      var wd = (2.5 + 5.5 * min(1, pv + tease)) * c.w;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = juicy ? 'rgba(45,6,10,0.88)' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = wd; ctx.stroke();
      if (juicy) { ctx.strokeStyle = F.flesh; ctx.lineWidth = wd * 0.42; ctx.stroke(); }
    }
  };

  // Sap / taç / düğüm
  A.drawTop = function (ctx, g, F, t) {
    var cx = g.cx, ty = g.cy - g.RY;
    if (F.top === 'nub') {
      ctx.fillStyle = '#6b4a1e';
      ctx.beginPath(); ctx.ellipse(cx, ty + 4, 16, 6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7a5524'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, ty + 2); ctx.quadraticCurveTo(cx + 2, ty - 10, cx + 12, ty - 14); ctx.stroke();
    } else if (F.top === 'stem') {
      ctx.fillStyle = 'rgba(80,30,0,0.35)';
      ctx.beginPath(); ctx.ellipse(cx, ty + 8, 42, 12, 0, 0, TAU); ctx.fill();
      var sg = ctx.createLinearGradient(cx - 20, 0, cx + 24, 0);
      sg.addColorStop(0, '#5b6e22'); sg.addColorStop(1, '#8a7a2e');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(cx - 24, ty + 8); ctx.quadraticCurveTo(cx - 20, ty - 30, cx - 4, ty - 56);
      ctx.lineTo(cx + 18, ty - 50); ctx.quadraticCurveTo(cx + 8, ty - 26, cx + 22, ty + 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4c8a2a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx + 14, ty - 30);
      for (var k = 0; k < 18; k++) { var a = k * 0.7; ctx.lineTo(cx + 30 + k * 3 + cos(a) * 9, ty - 34 + sin(a) * 9 - k); }
      ctx.stroke();
      ctx.fillStyle = '#4fa23a';
      ctx.beginPath(); ctx.ellipse(cx - 46, ty - 10, 30, 13, -0.4, 0, TAU); ctx.fill();
    } else if (F.top === 'crown') {
      var sw = sin(t * 3) * 0.03;
      var leaves = [[-1.1, 64, '#1f7a35'], [1.1, 64, '#1f7a35'], [-0.82, 78, '#2b8f3f'], [0.82, 78, '#2b8f3f'], [-0.54, 90, '#38a64a'], [0.54, 90, '#38a64a'], [-0.25, 98, '#4cbb58'], [0.25, 98, '#4cbb58'], [0, 104, '#5ccc66']];
      for (var i = 0; i < leaves.length; i++) {
        var L = leaves[i];
        var ang = -PI / 2 + L[0] + sw;
        var bx = cx + L[0] * 14, by = ty + 12;
        var tx = bx + cos(ang) * L[1], tyy = by + sin(ang) * L[1];
        var nx = -sin(ang) * 14, ny = cos(ang) * 14;
        ctx.fillStyle = L[2];
        ctx.beginPath(); ctx.moveTo(bx - nx, by - ny);
        ctx.quadraticCurveTo((bx + tx) / 2 - nx * 0.6, (by + tyy) / 2 - ny * 0.6, tx, tyy);
        ctx.quadraticCurveTo((bx + tx) / 2 + nx * 0.6, (by + tyy) / 2 + ny * 0.6, bx + nx, by + ny);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo((bx + tx * 2) / 3, (by + tyy * 2) / 3); ctx.stroke();
      }
    } else if (F.top === 'knot') {
      var by2 = g.cy + g.RY;
      ctx.fillStyle = F.skin[2];
      ctx.beginPath(); ctx.moveTo(cx - 14, by2 + 24); ctx.lineTo(cx, by2 - 4); ctx.lineTo(cx + 14, by2 + 24); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, by2 + 2, 10, 6, 0, 0, TAU); ctx.fill();
    }
  };

  // ---------------------------------------------------------------------------
  // Lastikler (ön yay + düğüm). Arka yay gövde içinde çizilir.
  // ---------------------------------------------------------------------------
  A.knotPos = function (g, b, th, out) {
    var s2 = b.snap * b.snap;
    var rx = (A.hwAt(g, b.v) + b.lw * 0.32) * (1 + 0.5 * s2);
    out.x = g.cx + rx * cos(th);
    out.y = g.cy + b.v * g.RY - 46 * s2 + rx * TILT * sin(th);
    return out;
  };
  A.drawBandsFront = function (ctx, g, bands, t, shadowFrom, noSparkle) {
    var cx = g.cx;
    ctx.lineCap = 'round';
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var s2 = b.snap * b.snap;
      var yb = g.cy + b.v * g.RY - 46 * s2;
      var rx = (A.hwAt(g, b.v) + b.lw * 0.32) * (1 + 0.5 * s2);
      var ry = rx * TILT;
      var lw = b.lw;
      if (i >= shadowFrom) {
        ctx.strokeStyle = 'rgba(0,0,0,0.24)'; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.ellipse(cx, yb + lw * 0.45 + 1.5, rx * 0.99, ry, 0, 0.06 * PI, 0.94 * PI); ctx.stroke();
      }
      ctx.strokeStyle = b.c; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.ellipse(cx, yb, rx, ry, 0, 0, PI); ctx.stroke();
      if (b.cols) {
        ctx.lineWidth = lw * 0.3;
        for (var k = 0; k < b.cols.length; k++) {
          ctx.strokeStyle = b.cols[k];
          ctx.beginPath(); ctx.ellipse(cx, yb + (k ? 1 : -1) * lw * 0.27, rx, ry, 0, 0.02 * PI, 0.98 * PI); ctx.stroke();
        }
      }
      if (b.kind === 'thick') {
        ctx.setLineDash([18, 14]); ctx.strokeStyle = b.d; ctx.lineWidth = lw * 0.32;
        ctx.beginPath(); ctx.ellipse(cx, yb, rx, ry, 0, 0.03 * PI, 0.97 * PI); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = b.l; ctx.lineWidth = max(1.4, lw * 0.26);
      ctx.beginPath(); ctx.ellipse(cx, yb - lw * 0.22, rx, ry, 0, 0.1 * PI, 0.9 * PI); ctx.stroke();
      var kx = cx + rx * cos(b.k), ky = yb + ry * sin(b.k);
      ctx.fillStyle = b.d;
      ctx.beginPath(); ctx.arc(kx, ky, lw * 0.55 + 2.5, 0, TAU); ctx.fill();
      if (b.sparkle && !noSparkle) {
        for (var sp = 0; sp < 3; sp++) {
          var th = ((t * 0.35 + sp / 3 + b.k) % 1) * PI;
          star(ctx, cx + rx * cos(th), yb + ry * sin(th), 9 + 4 * sin(t * 9 + sp * 2), '#fffbe0');
        }
      }
    }
  };
  // Önbellekten çizilen ışıltılı lastiklerin yıldızları (canlı)
  A.drawSparkles = function (ctx, g, bands, t, maxN) {
    for (var i = max(0, bands.length - (maxN || 999)); i < bands.length; i++) {
      var b = bands[i];
      if (!b.sparkle) continue;
      var yb = g.cy + b.v * g.RY, rx = A.hwAt(g, b.v) + b.lw * 0.32, ry = rx * TILT;
      for (var sp = 0; sp < 3; sp++) {
        var th = ((t * 0.35 + sp / 3 + b.k) % 1) * PI;
        star(ctx, g.cx + rx * cos(th), yb + ry * sin(th), 9 + 4 * sin(t * 9 + sp * 2), '#fffbe0');
      }
    }
  };
  function star(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.25, y - r * 0.25); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.25, y + r * 0.25);
    ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.25, y + r * 0.25); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.25, y - r * 0.25);
    ctx.closePath(); ctx.fill();
  }
  A.star = star;

  // ---------------------------------------------------------------------------
  // Patlama parçaları
  // ---------------------------------------------------------------------------
  A.chunkPts = function (r) {
    var n = 5 + Math.floor(Math.random() * 3), pts = [];
    for (var i = 0; i < n; i++) {
      var a = i / n * TAU + (Math.random() - 0.5) * 0.6;
      var rr = r * (0.6 + Math.random() * 0.5);
      pts.push(cos(a) * rr, sin(a) * rr * 0.8);
    }
    return pts;
  };
  function polyPath(ctx, pts, s, dy) {
    ctx.beginPath();
    ctx.moveTo(pts[0] * s, pts[1] * s + dy);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * s, pts[i + 1] * s + dy);
    ctx.closePath();
  }
  A.drawChunk = function (ctx, c, F) {
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.rot); if (c.s !== 1) ctx.scale(c.s, c.s);
    if (c.a != null && c.a < 1) ctx.globalAlpha = max(0, c.a);
    if (c.deco) {
      ui.emoji(ctx, c.deco, 0, 0, c.r * 2.2);
    } else if (F.burst === 'confetti') {
      ctx.strokeStyle = F.skin[1]; ctx.lineWidth = c.r * 0.32; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-c.r, 0); ctx.quadraticCurveTo(0, -c.r * 0.9, c.r, c.r * 0.2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = c.r * 0.09;
      ctx.beginPath(); ctx.moveTo(-c.r * 0.7, -c.r * 0.12); ctx.quadraticCurveTo(0, -c.r * 0.85, c.r * 0.6, 0); ctx.stroke();
    } else {
      var r = c.r;
      polyPath(ctx, c.pts, 1, 0); ctx.fillStyle = F.skin[1]; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();
      polyPath(ctx, c.pts, 0.8, r * 0.1); ctx.fillStyle = F.rind; ctx.fill();
      polyPath(ctx, c.pts, 0.64, r * 0.17); ctx.fillStyle = F.flesh; ctx.fill();
      ctx.fillStyle = F.seed;
      ctx.beginPath(); ctx.ellipse(-r * 0.15, r * 0.2, r * 0.07, r * 0.12, 0.4, 0, TAU); ctx.ellipse(r * 0.18, r * 0.1, r * 0.06, r * 0.1, -0.3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Kameraya sıçrayan su (ekran üstü)
  // ---------------------------------------------------------------------------
  A.makeSplat = function (x, y, r, color, t0) {
    var s = { x: x, y: y, r: r, c: color, t0: t0, a: 0.8 + Math.random() * 0.14, core: [], sat: [], streaks: [], drips: [] };
    var nc = 3 + Math.floor(Math.random() * 3), i, a, d;
    s.core.push({ dx: 0, dy: 0, r: r * 0.72 });
    for (i = 1; i < nc; i++) {
      a = Math.random() * TAU; d = r * (0.2 + Math.random() * 0.3);
      s.core.push({ dx: cos(a) * d, dy: sin(a) * d, r: r * (0.38 + Math.random() * 0.3) });
    }
    var ns = 4 + Math.floor(Math.random() * 6);
    for (i = 0; i < ns; i++) {
      a = Math.random() * TAU; d = r * (0.95 + Math.random() * 0.95);
      s.sat.push({ dx: cos(a) * d, dy: sin(a) * d, r: r * (0.06 + Math.random() * 0.17) });
    }
    var nk = 2 + Math.floor(Math.random() * 4);
    for (i = 0; i < nk; i++) {
      a = Math.random() * TAU; d = r * (0.85 + Math.random() * 0.3);
      s.streaks.push({ dx: cos(a) * d, dy: sin(a) * d, rx: r * (0.22 + Math.random() * 0.25), ry: r * (0.06 + Math.random() * 0.05), rot: a });
    }
    var nd = r > 30 ? 1 + Math.floor(Math.random() * 2) : (Math.random() < 0.5 ? 1 : 0);
    for (var k = 0; k < nd; k++) s.drips.push({ dx: (Math.random() - 0.5) * r * 0.9, w: r * (0.14 + Math.random() * 0.14), len: 0, max: 60 + Math.random() * 300, sp: 14 + Math.random() * 40 });
    return s;
  };
  A.drawSplat = function (ctx, s, now) {
    var age = now - s.t0;
    if (age < 0) return;
    var sc = age < 0.14 ? LG.ease.outBack(age / 0.14) : 1;
    var i, q;
    ctx.globalAlpha = s.a * (s.fade != null ? s.fade : 1);
    ctx.fillStyle = s.c;
    ctx.beginPath();
    for (i = 0; i < s.core.length; i++) { q = s.core[i]; ctx.moveTo(s.x + q.dx * sc + q.r * sc, s.y + q.dy * sc); ctx.arc(s.x + q.dx * sc, s.y + q.dy * sc, q.r * sc, 0, TAU); }
    for (i = 0; i < s.sat.length; i++) { q = s.sat[i]; ctx.moveTo(s.x + q.dx * sc + q.r, s.y + q.dy * sc); ctx.arc(s.x + q.dx * sc, s.y + q.dy * sc, q.r * sc, 0, TAU); }
    for (i = 0; i < s.streaks.length; i++) { q = s.streaks[i]; ctx.moveTo(s.x + q.dx * sc + q.rx, s.y + q.dy * sc); ctx.ellipse(s.x + q.dx * sc, s.y + q.dy * sc, q.rx * sc, q.ry * sc, q.rot, 0, TAU); }
    for (var k = 0; k < s.drips.length; k++) {
      var d = s.drips[k];
      if (d.len <= 1) continue;
      var dx = s.x + d.dx;
      ctx.rect(dx - d.w / 2, s.y, d.w, d.len);
      ctx.moveTo(dx + d.w * 0.75, s.y + d.len); ctx.arc(dx, s.y + d.len, d.w * 0.75, 0, TAU);
    }
    ctx.fill();
    // ıslak parlaklık
    ctx.globalAlpha = 0.45 * (s.fade != null ? s.fade : 1);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(s.x - s.r * 0.3 * sc, s.y - s.r * 0.32 * sc, s.r * 0.2 * sc, s.r * 0.1 * sc, -0.6, 0, TAU);
    for (k = 0; k < s.drips.length; k++) { d = s.drips[k]; if (d.len > 8) { ctx.moveTo(s.x + d.dx - d.w * 0.15 + d.w * 0.18, s.y + d.len - d.w * 0.2); ctx.arc(s.x + d.dx - d.w * 0.25, s.y + d.len - d.w * 0.2, d.w * 0.18, 0, TAU); } }
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  // ---------------------------------------------------------------------------
  // Hidrolik pres (MEGA SIKMA)
  // ---------------------------------------------------------------------------
  A.drawPress = function (ctx, cx, plateY, w, t) {
    var rg = ctx.createLinearGradient(0, 0, 30, 0);
    ctx.save();
    for (var r = -1; r <= 1; r += 2) {
      var rx = cx + r * w * 0.3;
      var g = ctx.createLinearGradient(rx - 18, 0, rx + 18, 0);
      g.addColorStop(0, '#8a96a3'); g.addColorStop(0.45, '#f1f4f7'); g.addColorStop(1, '#6b7682');
      ctx.fillStyle = g; ctx.fillRect(rx - 18, -40, 36, plateY - 40);
      ctx.fillStyle = '#3d4650'; ctx.fillRect(rx - 32, -40, 64, Math.max(0, min(plateY - 160, 120)));
    }
    var pg = ctx.createLinearGradient(0, plateY - 70, 0, plateY);
    pg.addColorStop(0, '#e4e9ee'); pg.addColorStop(0.5, '#a5afba'); pg.addColorStop(1, '#5d6772');
    ctx.fillStyle = pg;
    ui.roundRect(ctx, cx - w / 2, plateY - 70, w, 70, 12); ctx.fill();
    // tehlike şeridi
    ctx.save();
    ui.roundRect(ctx, cx - w / 2, plateY - 22, w, 22, 6); ctx.clip();
    ctx.fillStyle = '#ffd60a'; ctx.fillRect(cx - w / 2, plateY - 22, w, 22);
    ctx.fillStyle = '#1b1b1b';
    for (var x = cx - w / 2 - 30; x < cx + w / 2 + 30; x += 36) { ctx.beginPath(); ctx.moveTo(x, plateY); ctx.lineTo(x + 18, plateY - 22); ctx.lineTo(x + 34, plateY - 22); ctx.lineTo(x + 16, plateY); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ui.text(ctx, 'MEGA 🗜️', cx, plateY - 46, { size: 34, color: '#ffd60a', strokeColor: '#222' });
    ctx.restore();
    void rg; void t;
  };

  // ---------------------------------------------------------------------------
  // Silecek (temizlik)
  // ---------------------------------------------------------------------------
  A.drawWiper = function (ctx, x, t) {
    // camı silen bez: parlak, hafif eğik ışık şeridi + sünger
    ctx.save();
    ctx.translate(x, 0); ctx.transform(1, 0, -0.18, 1, 0, 0);
    var g = ctx.createLinearGradient(-150, 0, 40, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.65, 'rgba(255,255,255,0.28)'); g.addColorStop(0.9, 'rgba(220,245,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-150, 0, 190, H);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (var i = 0; i < 6; i++) ctx.fillRect(-120 + i * 18, 0, 3, H);
    ctx.restore();
    ui.emoji(ctx, '🧽', x - 10 + sin(t * 22) * 8, 760 + sin(t * 11) * 120, 150);
    ctx.save();
    ctx.translate(x - 40, 1120 + sin(t * 30) * 6); ctx.rotate(-0.5 + sin(t * 18) * 0.15);
    ui.emoji(ctx, '🧹', 0, 0, 170);
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Takip çıkartması (masada kalp)
  // ---------------------------------------------------------------------------
  function heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.42);
    ctx.bezierCurveTo(x - s * 1.15, y - s * 0.3, x - s * 0.55, y - s * 1.1, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.55, y - s * 1.1, x + s * 1.15, y - s * 0.3, x, y + s * 0.42);
    ctx.closePath();
  }
  A.heartPath = heartPath;
  A.drawSticker = function (ctx, st, now) {
    var age = now - st.t;
    var sc = age < 0.45 ? LG.ease.outBack(age / 0.45) : 1;
    ctx.save();
    ctx.translate(st.x, st.y); ctx.rotate(st.rot); ctx.scale(sc, sc * 0.92);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; heartPath(ctx, 4, 6, 38); ctx.fill();
    heartPath(ctx, 0, 0, 38);
    ctx.lineWidth = 9; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = '#ff3d7f'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-12, -14, 8, 5, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
    ui.drawNameTag(ctx, st.u, st.x, st.y + 34, 22, '#fff', 'rgba(255,61,127,0.9)');
  };

  // Yağmurda düşen lastik
  A.drawFallingRing = function (ctx, r) {
    ctx.save();
    ctx.translate(r.x, r.y); ctx.rotate(r.rot);
    ctx.strokeStyle = r.c; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(0, 0, 50, 17, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -3, 50, 17, 0, PI * 1.1, PI * 1.9); ctx.stroke();
    ctx.restore();
  };

  // Çizgi roman "PAT!" yazısı
  A.drawComic = function (ctx, x, y, word, s, t, color) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.12 + sin(t * 20) * 0.02); ctx.scale(s, s);
    var n = 16;
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = i / (n * 2) * TAU;
      var rr = i % 2 ? 150 : 250 + (i % 4 === 0 ? 30 : 0);
      if (i === 0) ctx.moveTo(cos(a) * rr * 1.25, sin(a) * rr * 0.8); else ctx.lineTo(cos(a) * rr * 1.25, sin(a) * rr * 0.8);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffe14d'; ctx.fill();
    ctx.lineWidth = 12; ctx.strokeStyle = color || '#d61f3c'; ctx.lineJoin = 'round'; ctx.stroke();
    ui.text(ctx, word, 0, 6, { size: 150, weight: 900, color: color || '#e01b3c', strokeColor: '#fff', strokeWidth: 16 });
    ctx.restore();
  };
})();
