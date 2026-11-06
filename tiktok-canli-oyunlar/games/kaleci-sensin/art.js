/*
 * KALECİ SENSİN! — çizim katmanı.
 * Gece stadyumu (önbellekli tribün + kalabalık + çim), kale + dalgalanan ağ, kaleci (ezilip uzayan dalış),
 * arkadan görünen şutçu (formasında adı + numarası), top, bayrak, havai fişek, ışık şovu.
 * Her şey kodla çizilir (telifsiz). Kulüp rengi/logosu YOK: formalar tek renk (izleyicinin rengi) + beyaz.
 *
 * Perspektif: kamera penaltı noktasının 16 m gerisinde. dc = kameraya uzaklık (metre).
 *   zemin y = 366.5 + 11704/dc     metre başına piksel = 2727/dc
 *   penaltı noktası dc=16 (y 1098) · kale çizgisi dc=27 (y 800, 101 px/m) · arka ağ dc=29 (y 770)
 */
(function () {
  'use strict';
  var KS = (window.KS = window.KS || {});
  var ui = LG.ui, W = LG.W, H = LG.H;
  var PI = Math.PI, TAU = PI * 2, sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, sqrt = Math.sqrt;
  var A = (KS.art = {});

  var P = (KS.P = {
    gy: function (dc) { return 366.5 + 11704 / dc; },
    ppm: function (dc) { return 2727 / dc; },
    dc: function (z) { return 16 + 11 * z; },
  });
  var G = (KS.G = { x0: 170, x1: 910, top: 552, gy: 800, cx: 540 }); // ön çerçeve (kale çizgisi)
  var BK = (KS.BK = { x0: 196, x1: 884, top: 620, gy: 770 });        // arka ağ
  var BOARD = (KS.BOARD = { y: 690, h: 48 });                          // reklam/LED panosu
  var CROWD_Y = 135;

  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rr(c, x, y, w, h, r) { ui.roundRect(c, x, y, w, h, r); }
  function line(c, x0, y0, x1, y1) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, max(0.1, rx), max(0.1, ry), 0, 0, TAU); c.fill(); }
  function roofY(x) { var s = x / W; return 150 - 84 * s * (1 - s); }
  A.mk = mk;

  // ---------------------------------------------------------------------------
  // Stadyum önbelleği
  // ---------------------------------------------------------------------------
  var ST = null;
  A.build = function () {
    if (ST) return ST;
    var R = rng(4242);
    var i, x, y;
    ST = { phones: [] };

    // --- Gökyüzü, çatı, tribün iskeleti -------------------------------------
    var base = mk(W, 760), b = base.getContext('2d');
    var sky = b.createLinearGradient(0, 0, 0, 330);
    sky.addColorStop(0, '#02030a'); sky.addColorStop(1, '#0b1330');
    b.fillStyle = sky; b.fillRect(0, 0, W, 760);
    for (i = 0; i < 80; i++) { b.fillStyle = 'rgba(255,255,255,' + (0.2 + R() * 0.6).toFixed(2) + ')'; b.fillRect(R() * W, R() * 120, 2, 2); }
    var sg = b.createLinearGradient(0, 120, 0, 700);
    sg.addColorStop(0, '#0a0f22'); sg.addColorStop(1, '#171f3c');
    b.fillStyle = sg;
    b.beginPath(); b.moveTo(0, 150); b.quadraticCurveTo(540, 108, W, 150); b.lineTo(W, 700); b.lineTo(0, 700); b.closePath(); b.fill();
    b.strokeStyle = 'rgba(255,255,255,0.035)'; b.lineWidth = 1;
    for (y = 160; y < 690; y += 12) line(b, 0, y, W, y);
    // çatı
    b.fillStyle = '#05070f';
    b.beginPath(); b.moveTo(0, 0); b.lineTo(W, 0); b.lineTo(W, 150); b.quadraticCurveTo(540, 108, 0, 150); b.closePath(); b.fill();
    b.strokeStyle = 'rgba(120,140,190,0.16)'; b.lineWidth = 2;
    for (x = -60; x < W + 60; x += 58) line(b, x, 0, x + 34, roofY(x + 34) - 4);
    b.strokeStyle = 'rgba(170,190,240,0.4)'; b.lineWidth = 4;
    b.beginPath(); b.moveTo(0, 150); b.quadraticCurveTo(540, 108, W, 150); b.stroke();
    for (x = 30; x < W; x += 34) { b.fillStyle = '#fff6da'; b.fillRect(x - 9, roofY(x) - 12, 18, 8); }
    // ışık kuleleri (köşeler)
    [[18, 26], [W - 150, 26]].forEach(function (p) {
      b.fillStyle = '#0c1020'; rr(b, p[0], p[1], 132, 86, 8); b.fill();
      b.strokeStyle = '#2a3354'; b.lineWidth = 3; b.stroke();
      for (var r = 0; r < 3; r++) for (var c2 = 0; c2 < 5; c2++) { b.fillStyle = '#fffbe8'; circle(b, p[0] + 18 + c2 * 24, p[1] + 18 + r * 25, 9); }
    });
    // balkon bandı
    b.fillStyle = '#1b2240'; b.fillRect(0, 402, W, 14);
    b.fillStyle = 'rgba(255,220,150,0.55)'; for (x = 10; x < W; x += 26) b.fillRect(x, 407, 8, 3);
    var aisles = [140, 330, 750, 940];
    b.fillStyle = 'rgba(0,0,0,0.28)'; aisles.forEach(function (a) { b.fillRect(a - 9, 150, 18, 550); });
    // ön duvar
    b.fillStyle = '#0a0e1c'; b.fillRect(0, 666, W, 26);
    b.fillStyle = 'rgba(255,255,255,0.08)'; b.fillRect(0, 666, W, 2);
    ST.base = base;

    // --- Kalabalık (ayrı katman: zıplayabilsin) ------------------------------
    var crowd = mk(W, 545), c = crowd.getContext('2d');
    var SK = ['#4a3426', '#5b3f2c', '#6e4b33', '#3b2a20', '#7a573d', '#8a6448'];
    var row = 0;
    for (y = 168; y < 664; row++) {
      if (y > 394 && y < 422) { y = 426; continue; }
      var f = (y - 160) / 510, r = 4.2 + f * 5.4, gx = r * 2.1;
      for (x = -6 + (row % 2) * r; x < W + 6; x += gx * (0.92 + R() * 0.2)) {
        var skip = false;
        for (i = 0; i < aisles.length; i++) if (abs(x - aisles[i]) < 9 + r) skip = true;
        if (skip || R() < 0.05) continue;
        var hue = (R() * 360) | 0, bright = R() < 0.11;
        var yy = y - CROWD_Y + (R() - 0.5) * 2;
        c.fillStyle = bright ? 'hsl(' + hue + ',60%,' + (32 + R() * 14 | 0) + '%)' : 'hsl(' + hue + ',' + (14 + R() * 30 | 0) + '%,' + (10 + R() * 14 | 0) + '%)';
        ell(c, x, yy + r * 1.35, r * 1.18, r * 0.86);
        if (R() < 0.07) { // kollar havada
          c.strokeStyle = c.fillStyle; c.lineWidth = max(2, r * 0.42); c.lineCap = 'round';
          line(c, x - r * 0.8, yy + r * 0.9, x - r * 1.3, yy - r * 1.3);
          line(c, x + r * 0.8, yy + r * 0.9, x + r * 1.3, yy - r * 1.3);
        }
        c.fillStyle = SK[(R() * SK.length) | 0];
        circle(c, x, yy, r * 0.72);
        c.fillStyle = 'rgba(12,9,7,0.88)';
        c.beginPath(); c.arc(x, yy - r * 0.12, r * 0.75, PI * 1.03, PI * 1.97); c.fill();
        c.strokeStyle = 'rgba(255,236,200,0.22)'; c.lineWidth = 1;
        c.beginPath(); c.arc(x, yy, r * 0.72, PI * 1.15, PI * 1.6); c.stroke();
        if (R() < 0.055) ST.phones.push({ x: x + r * 0.7, y: yy + r * 0.25 + CROWD_Y, r: r, ph: R() * TAU, sp: 1.5 + R() * 5 });
      }
      y += r * 1.95;
    }
    ST.crowd = crowd;

    // --- Işık parlaması (lighter ile eklenir) -------------------------------
    var glow = mk(W, 900), g = glow.getContext('2d');
    for (x = 30; x < W; x += 34) {
      var ry = roofY(x) - 8;
      var rg = g.createRadialGradient(x, ry, 0, x, ry, 56);
      rg.addColorStop(0, 'rgba(255,246,215,0.5)'); rg.addColorStop(1, 'rgba(255,246,215,0)');
      g.fillStyle = rg; g.fillRect(x - 56, ry - 56, 112, 112);
    }
    [[84, 69], [W - 84, 69]].forEach(function (p) {
      var tg = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], 240);
      tg.addColorStop(0, 'rgba(255,250,230,0.85)'); tg.addColorStop(0.25, 'rgba(255,250,230,0.25)'); tg.addColorStop(1, 'rgba(255,250,230,0)');
      g.fillStyle = tg; g.fillRect(p[0] - 240, p[1] - 240, 480, 480);
    });
    var cg = g.createLinearGradient(0, 130, 0, 900);
    cg.addColorStop(0, 'rgba(190,210,255,0.11)'); cg.addColorStop(1, 'rgba(190,210,255,0)');
    g.fillStyle = cg; g.beginPath(); g.moveTo(60, 130); g.lineTo(W - 60, 130); g.lineTo(W, 900); g.lineTo(0, 900); g.closePath(); g.fill();
    ST.glow = glow;

    // --- Çim ----------------------------------------------------------------
    var PY = 738;
    var pitch = mk(W, H - PY), p = pitch.getContext('2d');
    var gg = p.createLinearGradient(0, 0, 0, H - PY);
    gg.addColorStop(0, '#0d3a1c'); gg.addColorStop(0.3, '#18662f'); gg.addColorStop(0.65, '#1a6e33'); gg.addColorStop(1, '#0e4421');
    p.fillStyle = gg; p.fillRect(0, 0, W, H - PY);
    var dcs = [31.5, 29, 27, 24.5, 22, 19.5, 17, 14.5, 12, 9.5, 7];
    for (i = 0; i < dcs.length - 1; i += 2) { var y0 = P.gy(dcs[i]) - PY, y1 = P.gy(dcs[i + 1]) - PY; p.fillStyle = 'rgba(255,255,255,0.05)'; p.fillRect(0, y0, W, y1 - y0); }
    var dB = 11704 / (H - 366.5);
    for (var k = -6; k < 6; k += 2) {
      var X0 = k * 4, X1 = X0 + 4;
      p.fillStyle = 'rgba(0,0,0,0.06)';
      p.beginPath();
      p.moveTo(540 + X0 * P.ppm(31.5), 0); p.lineTo(540 + X1 * P.ppm(31.5), 0);
      p.lineTo(540 + X1 * P.ppm(dB), H - PY); p.lineTo(540 + X0 * P.ppm(dB), H - PY); p.closePath(); p.fill();
    }
    for (i = 0; i < 2600; i++) {
      var ny = R() * (H - PY), sc = 0.4 + ny / (H - PY) * 1.7;
      p.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.035)';
      p.fillRect(R() * W, ny, 1.2 * sc, 3 * sc);
    }
    // kale ağzı ve penaltı noktası aşınması
    [[800 - PY + 18, 300, 0.22, 0.3], [1098 - PY, 120, 0.35, 0.22]].forEach(function (q) {
      p.save(); p.translate(540, q[0]); p.scale(1, q[2]);
      var wg = p.createRadialGradient(0, 0, 5, 0, 0, q[1]);
      wg.addColorStop(0, 'rgba(120,92,45,' + q[3] + ')'); wg.addColorStop(1, 'rgba(120,92,45,0)');
      p.fillStyle = wg; p.fillRect(-q[1], -q[1], q[1] * 2, q[1] * 2); p.restore();
    });
    p.strokeStyle = 'rgba(245,250,255,0.85)'; p.lineCap = 'butt';
    p.lineWidth = 3; line(p, 0, 800 - PY, W, 800 - PY);
    p.lineWidth = 4; line(p, 0, P.gy(21.5) - PY, W, P.gy(21.5) - PY);
    p.lineWidth = 12; line(p, 0, P.gy(10.5) - PY, W, P.gy(10.5) - PY);
    p.fillStyle = 'rgba(245,250,255,0.9)'; ell(p, 540, 1098 - PY, 18, 6);
    ST.pitch = pitch; ST.pitchY = PY;

    // --- Küçük sprite'lar ----------------------------------------------------
    var dot = mk(32, 32), d = dot.getContext('2d');
    var dg = d.createRadialGradient(16, 16, 0, 16, 16, 16);
    dg.addColorStop(0, 'rgba(255,255,255,1)'); dg.addColorStop(0.25, 'rgba(220,235,255,0.9)'); dg.addColorStop(1, 'rgba(200,220,255,0)');
    d.fillStyle = dg; d.fillRect(0, 0, 32, 32);
    ST.dot = dot;
    // LED nokta maskesi
    var led = mk(6, 6), l = led.getContext('2d');
    l.fillStyle = 'rgba(0,0,0,0.55)'; l.fillRect(0, 0, 6, 6); l.clearRect(1, 1, 4, 4);
    ST.ledMask = led;
    return ST;
  };

  // ---------------------------------------------------------------------------
  // Tribünler (her kare)
  // o: { energy 0..1, jump 0..1, flash 0..1, dim 0..1, tifo:{hue,k,name}, chant }
  // ---------------------------------------------------------------------------
  A.drawStands = function (ctx, t, o) {
    var st = A.build();
    ctx.drawImage(st.base, 0, 0);
    var cr = st.crowd, n = 9, hh = cr.height / n;
    var amp = o.energy * 4 + o.jump * 13;
    var sp = 6 + o.energy * 6;
    for (var i = 0; i < n; i++) {
      var off = amp > 0.3 ? -abs(sin(t * sp + i * 1.7)) * amp * (0.45 + i / n) : 0;
      ctx.drawImage(cr, 0, i * hh, W, hh, 0, CROWD_Y + i * hh + off, W, hh);
    }
    // koreografi (tifo): tribünü kişinin renkleriyle kaplar
    if (o.tifo && o.tifo.k > 0) {
      var tf = o.tifo, k = tf.k;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 150, W, (690 - 150) * min(1, k * 1.4)); ctx.clip();
      ctx.globalAlpha = 0.86 * min(1, k * 2);
      var bands = 9;
      for (var b2 = 0; b2 < bands; b2++) {
        var by = 150 + b2 * 60;
        ctx.fillStyle = b2 % 2 ? 'hsl(' + tf.hue + ',85%,52%)' : 'hsl(' + ((tf.hue + 0) % 360) + ',60%,93%)';
        ctx.beginPath();
        for (var x = 0; x <= W; x += 60) ctx.lineTo(x, by + sin(t * 3 + x * 0.012 + b2) * 6);
        for (x = W; x >= 0; x -= 60) ctx.lineTo(x, by + 60 + sin(t * 3 + x * 0.012 + b2 + 1) * 6);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ui.text(ctx, tf.name, 540, 521, { size: 46, color: 'hsl(' + tf.hue + ',90%,35%)', strokeColor: '#fff', strokeWidth: 9, maxWidth: 680 });
      ctx.restore();
    }
    // telefon ışıkları
    var pa = 0.18 + o.energy * 0.55 + o.flash * 0.7;
    if (pa > 0.05) {
      var dot = st.dot, ph = st.phones;
      var ga = ctx.globalAlpha;
      for (var j = 0; j < ph.length; j++) {
        var q = ph[j];
        var tw = 0.5 + 0.5 * sin(t * q.sp + q.ph);
        var a = pa * tw;
        if (a < 0.07) continue;
        var s = q.r * (1.6 + o.flash * 1.2);
        ctx.globalAlpha = min(1, a);
        ctx.drawImage(dot, q.x - s, q.y - s - abs(sin(t * sp + j)) * amp * 0.5, s * 2, s * 2);
      }
      ctx.globalAlpha = ga;
    }
    // projektör parlaması
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.8 + 0.05 * sin(t * 13)) * (1 - (o.dim || 0) * 0.75);
    ctx.drawImage(st.glow, 0, 0);
    ctx.restore();
  };

  A.drawPitch = function (ctx) { var st = A.build(); ctx.drawImage(st.pitch, 0, st.pitchY); };

  // LED reklam panosu (kayan yazı)
  var ledW = {};
  A.drawBoard = function (ctx, t, text, color) {
    var st = A.build();
    var y = BOARD.y, h = BOARD.h;
    ctx.fillStyle = '#04060c'; ctx.fillRect(0, y, W, h);
    ctx.fillStyle = '#1d2236'; ctx.fillRect(0, y, W, 3); ctx.fillRect(0, y + h - 3, W, 3);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y + 3, W, h - 6); ctx.clip();
    ctx.font = '900 32px ' + ui.FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    var w = ledW[text];
    if (!w) { w = ctx.measureText(text).width; ledW[text] = w; }
    var off = -((t * 130) % w);
    ctx.fillStyle = color || '#ffb703';
    ctx.shadowColor = color || '#ffb703'; ctx.shadowBlur = 12;
    for (var x = off; x < W; x += w) ctx.fillText(text, x, y + h / 2 + 2);
    ctx.shadowBlur = 0;
    if (!st.ledPat) st.ledPat = ctx.createPattern(st.ledMask, 'repeat');
    ctx.fillStyle = st.ledPat; ctx.fillRect(0, y, W, h);
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Kale + ağ
  // ---------------------------------------------------------------------------
  var NX = 22, NY = 7;
  var ripples = [];
  A.netHit = function (x, y, amp) { ripples.push({ x: x, y: y, t: 0, a: amp || 1 }); if (ripples.length > 3) ripples.shift(); };
  A.updateNet = function (dt) { for (var i = ripples.length - 1; i >= 0; i--) { ripples[i].t += dt; if (ripples[i].t > 2.6) ripples.splice(i, 1); } };
  var tmp = { x: 0, y: 0 };
  function disp(x, y) {
    var dx = 0, dy = 0;
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i], vx = x - r.x, vy = y - r.y, d = sqrt(vx * vx + vy * vy) + 0.001;
      var env = r.a * Math.exp(-r.t * 2.1);
      var pinch = env * Math.exp(-(d * d) / (2 * 95 * 95)) * 0.5 * (0.55 + 0.45 * cos(r.t * 13));
      var wave = env * 10 * sin(d * 0.065 - r.t * 17) * Math.exp(-d / 230);
      dx += -vx * pinch + vx / d * wave;
      dy += -vy * pinch + vy / d * wave;
    }
    tmp.x = x + dx; tmp.y = y + dy;
    return tmp;
  }
  A.drawNetBack = function (ctx, tint) {
    var i, j, x, y, q;
    ctx.fillStyle = 'rgba(225,235,255,0.04)';
    ctx.fillRect(BK.x0, BK.top, BK.x1 - BK.x0, BK.gy - BK.top);
    ctx.strokeStyle = tint || 'rgba(232,238,255,0.30)'; ctx.lineWidth = 1.5;
    var rip = ripples.length > 0;
    for (i = 0; i <= NX; i++) {
      ctx.beginPath();
      x = BK.x0 + (BK.x1 - BK.x0) * i / NX;
      for (j = 0; j <= NY; j++) {
        y = BK.top + (BK.gy - BK.top) * j / NY;
        if (rip) { q = disp(x, y); if (j) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
        else if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    for (j = 0; j <= NY; j++) {
      ctx.beginPath();
      y = BK.top + (BK.gy - BK.top) * j / NY;
      for (i = 0; i <= NX; i++) {
        x = BK.x0 + (BK.x1 - BK.x0) * i / NX;
        if (rip) { q = disp(x, y); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
        else if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  };
  A.drawNetSides = function (ctx, tint) {
    var k, f;
    ctx.strokeStyle = tint || 'rgba(232,238,255,0.27)'; ctx.lineWidth = 1.4;
    for (k = 0; k <= 7; k++) {
      f = k / 7;
      line(ctx, G.x0, G.top + (G.gy - G.top) * f, BK.x0, BK.top + (BK.gy - BK.top) * f);
      line(ctx, G.x1, G.top + (G.gy - G.top) * f, BK.x1, BK.top + (BK.gy - BK.top) * f);
    }
    for (k = 1; k < 3; k++) {
      f = k / 3;
      var lx = G.x0 + (BK.x0 - G.x0) * f, rx = G.x1 + (BK.x1 - G.x1) * f;
      line(ctx, lx, G.top + (BK.top - G.top) * f, lx, G.gy + (BK.gy - G.gy) * f);
      line(ctx, rx, G.top + (BK.top - G.top) * f, rx, G.gy + (BK.gy - G.gy) * f);
      line(ctx, lx, G.top + (BK.top - G.top) * f, rx, G.top + (BK.top - G.top) * f);
    }
    for (k = 0; k <= NX; k++) { f = k / NX; line(ctx, G.x0 + (G.x1 - G.x0) * f, G.top, BK.x0 + (BK.x1 - BK.x0) * f, BK.top); }
    ctx.strokeStyle = 'rgba(200,210,230,0.55)'; ctx.lineWidth = 3;
    line(ctx, BK.x0, BK.top, BK.x0, BK.gy); line(ctx, BK.x1, BK.top, BK.x1, BK.gy); line(ctx, BK.x0, BK.top, BK.x1, BK.top);
  };
  A.drawFrame = function (ctx, glow) {
    var pw = 14, hgt = G.gy - G.top;
    ctx.save();
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 26; }
    ctx.fillStyle = '#eef2f8';
    rr(ctx, G.x0 - pw / 2, G.top - pw / 2, pw, hgt + pw / 2 + 2, 6); ctx.fill();
    rr(ctx, G.x1 - pw / 2, G.top - pw / 2, pw, hgt + pw / 2 + 2, 6); ctx.fill();
    rr(ctx, G.x0 - pw / 2, G.top - pw / 2, G.x1 - G.x0 + pw, pw, 6); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(40,50,80,0.22)';
    ctx.fillRect(G.x0 + 1, G.top + pw / 2, pw / 2 - 1, hgt - pw / 2);
    ctx.fillRect(G.x1 + 1, G.top + pw / 2, pw / 2 - 1, hgt - pw / 2);
    ctx.fillRect(G.x0 - pw / 2, G.top + 1, G.x1 - G.x0 + pw, pw / 2 - 1);
  };

  // ---------------------------------------------------------------------------
  // Kaleci (önden, kameraya bakıyor). Yerel koordinat: orijin = kalça.
  // k: {x,y,rot,sx,sy,aL,aR,alL,alR,lL,lR,cr,glove,face,look}
  // Kol açısı: 0 = aşağı, PI/2 = yana, PI = yukarı, PI+ = yukarı-içe, eksi = aşağı-içe
  // ---------------------------------------------------------------------------
  var KC = { jersey: '#33f07a', jd: '#13a84a', black: '#121417', skin: '#e2a679', skinD: '#c48659', hair: '#2a1a10', glove: '#f7f8fc', accent: '#ff7a1a' };
  A.KC = KC;
  function kLeg(ctx, side, l, cr) {
    var hx = side * 13, hy = 10;
    var a1 = l + cr * 0.6, a2 = l - cr * 0.5;
    var kx = hx + side * sin(a1) * 38, ky = hy + cos(a1) * 38;
    var fx = kx + side * sin(a2) * 36, fy = ky + cos(a2) * 36;
    ctx.strokeStyle = KC.skin; ctx.lineWidth = 16; line(ctx, hx, hy, kx, ky);
    ctx.strokeStyle = KC.black; ctx.lineWidth = 15; line(ctx, kx, ky, fx, fy);
    ctx.strokeStyle = KC.jersey; ctx.lineWidth = 15;
    line(ctx, kx + side * sin(a2) * 3, ky + cos(a2) * 3, kx + side * sin(a2) * 10, ky + cos(a2) * 10);
    ctx.fillStyle = '#0b0b0d'; ell(ctx, fx + side * 6, fy + 4, 14, 7.5);
    ctx.fillStyle = KC.accent; ell(ctx, fx + side * 9, fy + 2, 5, 2.5);
  }
  function kArm(ctx, side, a, len, gs, out) {
    var sx = side * 27, sy = -88;
    var dx = side * sin(a), dy = cos(a);
    var L = 66 * (len == null ? 1 : len);
    var ex = sx + dx * L, ey = sy + dy * L;
    ctx.strokeStyle = KC.jd; ctx.lineWidth = 18; line(ctx, sx, sy, ex, ey);
    ctx.strokeStyle = KC.jersey; ctx.lineWidth = 13; line(ctx, sx, sy, ex - dx * 4, ey - dy * 4);
    var r = 14 * gs;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(Math.atan2(dy, dx) - PI / 2);
    if (gs > 1.2) { ctx.shadowColor = '#7dffb0'; ctx.shadowBlur = 18; }
    ctx.fillStyle = KC.glove; rr(ctx, -r * 0.9, -r * 0.2, r * 1.8, r * 2.2, r * 0.85); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = KC.jersey; rr(ctx, -r * 0.95, -r * 0.35, r * 1.9, r * 0.7, r * 0.3); ctx.fill();
    ctx.fillStyle = KC.black; ctx.fillRect(-r * 0.95, -r * 0.05, r * 1.9, r * 0.18);
    ctx.fillStyle = KC.glove; ell(ctx, -side * r * 0.95, r * 0.65, r * 0.38, r * 0.6);
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = max(1, r * 0.1);
    for (var i = -1; i <= 1; i++) line(ctx, i * r * 0.45, r * 1.1, i * r * 0.45, r * 1.85);
    ctx.restore();
    if (out) { out.x = sx + dx * (L + r); out.y = sy + dy * (L + r); }
  }
  var gL = { x: 0, y: 0 }, gR = { x: 0, y: 0 };
  A.keeper = function (ctx, k) {
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(k.rot);
    ctx.scale(k.sx, k.sy);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    kLeg(ctx, -1, k.lL, k.cr); kLeg(ctx, 1, k.lR, k.cr);
    ctx.fillStyle = KC.black; rr(ctx, -30, -14, 60, 30, 9); ctx.fill();
    ctx.fillStyle = KC.jersey; ctx.fillRect(-30, -4, 5, 18); ctx.fillRect(25, -4, 5, 18);
    // gövde
    ctx.fillStyle = KC.jersey; rr(ctx, -31, -100, 62, 92, 18); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; rr(ctx, 6, -100, 25, 92, 14); ctx.fill();
    ctx.fillStyle = KC.black;
    ctx.beginPath(); ctx.moveTo(-31, -70); ctx.lineTo(0, -52); ctx.lineTo(31, -70); ctx.lineTo(31, -62); ctx.lineTo(0, -44); ctx.lineTo(-31, -62); ctx.closePath(); ctx.fill();
    ctx.font = '900 30px ' + ui.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('1', 0, -24);
    ctx.fillStyle = KC.black; ctx.beginPath(); ctx.moveTo(-12, -100); ctx.lineTo(0, -88); ctx.lineTo(12, -100); ctx.closePath(); ctx.fill();
    // kollar
    kArm(ctx, -1, k.aL, k.alL, k.glove, gL); kArm(ctx, 1, k.aR, k.alR, k.glove, gR);
    // baş
    ctx.fillStyle = KC.skinD; ctx.fillRect(-8, -112, 16, 16);
    ctx.fillStyle = KC.skin; circle(ctx, 0, -126, 24);
    circle(ctx, -24, -124, 5); circle(ctx, 24, -124, 5);
    ctx.fillStyle = KC.hair; ctx.beginPath(); ctx.arc(0, -130, 25, PI * 1.02, PI * 1.98); ctx.fill();
    ctx.fillStyle = KC.black; rr(ctx, -25, -142, 50, 8, 4); ctx.fill();
    ctx.fillStyle = KC.jersey; ctx.fillRect(-4, -142, 8, 8);
    var lx = (k.look || 0) * 3;
    ctx.fillStyle = '#fff'; ell(ctx, -9, -123, 6, 7); ell(ctx, 9, -123, 6, 7);
    ctx.fillStyle = '#16181c'; circle(ctx, -9 + lx, -122, 3.4); circle(ctx, 9 + lx, -122, 3.4);
    ctx.strokeStyle = KC.hair; ctx.lineWidth = 3.5;
    var face = k.face || 'focus';
    if (face === 'focus') { line(ctx, -16, -135, -4, -131); line(ctx, 16, -135, 4, -131); }
    else if (face === 'sad') { line(ctx, -15, -131, -4, -135); line(ctx, 15, -131, 4, -135); }
    else { line(ctx, -15, -136, -4, -137); line(ctx, 15, -136, 4, -137); }
    ctx.strokeStyle = '#5a1e14'; ctx.lineWidth = 3;
    ctx.beginPath();
    if (face === 'happy') { ctx.fillStyle = '#7a2216'; ctx.arc(0, -113, 8, 0.1, PI - 0.1); ctx.closePath(); ctx.fill(); }
    else if (face === 'sad') { ctx.arc(0, -104, 7, PI * 1.2, PI * 1.8); ctx.stroke(); }
    else if (face === 'wow') { ctx.fillStyle = '#7a2216'; ctx.arc(0, -110, 5, 0, TAU); ctx.fill(); }
    else { ctx.moveTo(-6, -110); ctx.lineTo(6, -111); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,90,90,0.28)'; circle(ctx, -15, -115, 4); circle(ctx, 15, -115, 4);
    ctx.restore();
    // dünya koordinatında eldiven orta noktası
    var mx = (gL.x + gR.x) / 2 * k.sx, my = (gL.y + gR.y) / 2 * k.sy, c = cos(k.rot), s = sin(k.rot);
    k.gx = k.x + mx * c - my * s; k.gy = k.y + mx * s + my * c;
  };

  // ---------------------------------------------------------------------------
  // Şutçu (arkadan). Yerel: ayaklar (0,0), boy ≈ 112.
  // s: {sx,sy,sc,hue,num,name,pose:'stand'|'walk'|'run'|'kick'|'celebrate'|'sad', ph, k, jump, alpha, crown, skin, hair}
  // ---------------------------------------------------------------------------
  var SKINS = ['#f1c9a5', '#e0ac69', '#c68642', '#8d5524', '#f8d5b8', '#d79f72'];
  var HAIRS = ['#1d140d', '#3b2416', '#0e0e0e', '#6b4320', '#b8893c', '#2a2a2a'];
  A.shooter = function (ctx, s) {
    var hue = s.hue, light = hue >= 42 && hue <= 80;
    var jc = 'hsl(' + hue + ',72%,' + (light ? 50 : 46) + '%)', jd = 'hsl(' + hue + ',68%,26%)';
    var skin = SKINS[s.seed % SKINS.length], hair = HAIRS[(s.seed >> 3) % HAIRS.length];
    ctx.save();
    ctx.globalAlpha *= s.alpha == null ? 1 : s.alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.32)'; ell(ctx, s.sx, s.sy + 2, 30 * s.sc, 8 * s.sc);
    ctx.translate(s.sx, s.sy - (s.jump || 0) * s.sc);
    ctx.scale(s.sc, s.sc);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var pose = s.pose, ph = s.ph || 0;
    // bacaklar
    var lf = { x: -9, y: 0 }, rf = { x: 9, y: 0 }, bootR = 1;
    if (pose === 'walk' || pose === 'run') {
      var amp = pose === 'run' ? 16 : 8;
      lf.y = -max(0, sin(ph)) * amp; rf.y = -max(0, sin(ph + PI)) * amp;
      lf.x = -9 + cos(ph) * 2; rf.x = 9 - cos(ph) * 2;
    } else if (pose === 'kick') {
      var k = s.k || 0;
      lf.x = -11;
      if (k < 0.33) { var w = k / 0.33; rf.x = 9 + w * 6; rf.y = -w * 30; bootR = 1 + w * 0.25; }
      else if (k < 0.5) { var w2 = (k - 0.33) / 0.17; rf.x = 15 - w2 * 10; rf.y = -30 + w2 * 24; bootR = 1.25 - w2 * 0.35; }
      else { var w3 = (k - 0.5) / 0.5; rf.x = 5 - w3 * 6; rf.y = -6 - sin(w3 * PI) * 46; bootR = 0.9 - w3 * 0.2; }
    } else if (pose === 'celebrate') {
      lf.y = -abs(sin(ph)) * 6; rf.y = -abs(sin(ph + 1)) * 6;
    }
    function legTo(hx, f, br) {
      ctx.strokeStyle = skin; ctx.lineWidth = 10; line(ctx, hx, -46, (hx + f.x) / 2, (-46 + f.y) / 2 - 2);
      ctx.strokeStyle = jc; ctx.lineWidth = 10; line(ctx, (hx + f.x) / 2, (-46 + f.y) / 2 - 2, f.x, f.y - 4);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; line(ctx, (hx + f.x) / 2, (-46 + f.y) / 2 - 2, (hx + f.x) / 2 + (f.x - hx) * 0.06, (-46 + f.y) / 2 + 1);
      ctx.fillStyle = '#101010'; ell(ctx, f.x, f.y - 1, 7.5 * br, 5 * br);
    }
    legTo(-8, lf, 1); legTo(8, rf, bootR);
    // şort
    ctx.fillStyle = jd; rr(ctx, -19, -56, 38, 15, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-19, -46, 38, 2);
    // gövde (forma sırtı)
    ctx.fillStyle = jc; rr(ctx, -21, -101, 42, 49, 11); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.13)'; rr(ctx, 4, -101, 17, 49, 9); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, -100, 9, 3.4, 0, 0, PI); ctx.fill();
    var tc = light ? '#1a1a2a' : '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 8.5px ' + ui.FONT;
    var nm = s.name || '';
    var nw = ctx.measureText(nm).width;
    if (nw > 36) ctx.font = '900 ' + (8.5 * 36 / nw).toFixed(2) + 'px ' + ui.FONT;
    ctx.fillStyle = tc; ctx.fillText(nm, 0, -90);
    ctx.font = '900 25px ' + ui.FONT;
    ctx.lineWidth = 2.2; ctx.strokeStyle = light ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.35)';
    ctx.strokeText(String(s.num), 0, -71); ctx.fillText(String(s.num), 0, -71);
    // kollar
    var lh = { x: -25, y: -58 }, rh = { x: 25, y: -58 };
    if (pose === 'walk' || pose === 'run') { var sw = pose === 'run' ? 9 : 5; lh.y = -60 + sin(ph) * sw; rh.y = -60 - sin(ph) * sw; lh.x = -27; rh.x = 27; }
    else if (pose === 'kick') { lh.x = -44; lh.y = -84; rh.x = 30; rh.y = -62; }
    else if (pose === 'celebrate') { var pm = sin(ph * 1.5) * 6; lh.x = -31; lh.y = -140 + pm; rh.x = 31; rh.y = -140 - pm; }
    else if (pose === 'sad') { lh.x = -12; lh.y = -121; rh.x = 12; rh.y = -121; }
    function arm(side, hnd) {
      var sx = side * 19, sy = -94;
      var mx = sx + (hnd.x - sx) * 0.38, my = sy + (hnd.y - sy) * 0.38;
      ctx.strokeStyle = skin; ctx.lineWidth = 8; line(ctx, mx, my, hnd.x, hnd.y);
      ctx.strokeStyle = jc; ctx.lineWidth = 11; line(ctx, sx, sy, mx, my);
      ctx.fillStyle = skin; circle(ctx, hnd.x, hnd.y, 4.6);
    }
    var headFirst = pose === 'sad' || pose === 'celebrate';
    if (!headFirst) { arm(-1, lh); arm(1, rh); }
    // baş (arkadan)
    ctx.fillStyle = skin; ctx.fillRect(-4.5, -106, 9, 7);
    circle(ctx, -11.5, -111, 3.4); circle(ctx, 11.5, -111, 3.4);
    ctx.fillStyle = hair; circle(ctx, 0, -113, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(0, -113, 12, PI * 1.15, PI * 1.55); ctx.lineTo(0, -113); ctx.fill();
    if (s.crown) {
      ctx.fillStyle = '#ffd400';
      ctx.beginPath(); ctx.moveTo(-9, -122); ctx.lineTo(-9, -132); ctx.lineTo(-4.5, -127); ctx.lineTo(0, -135); ctx.lineTo(4.5, -127); ctx.lineTo(9, -132); ctx.lineTo(9, -122); ctx.closePath(); ctx.fill();
    }
    if (headFirst) { arm(-1, lh); arm(1, rh); }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Top
  // ---------------------------------------------------------------------------
  function pent(ctx, x, y, r, a) {
    ctx.beginPath();
    for (var i = 0; i < 5; i++) { var t = a + i * TAU / 5; if (i) ctx.lineTo(x + cos(t) * r, y + sin(t) * r); else ctx.moveTo(x + cos(t) * r, y + sin(t) * r); }
    ctx.closePath(); ctx.fill();
  }
  A.ball = function (ctx, x, y, r, rot, glow) {
    if (r < 1) return;
    if (glow) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var gg = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.8);
      gg.addColorStop(0, glow); gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg; ctx.fillRect(x - r * 2.8, y - r * 2.8, r * 5.6, r * 5.6);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    var g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.65, '#e4e7ee'); g.addColorStop(1, '#8a93a6');
    ctx.fillStyle = g; ctx.fill();
    ctx.clip();
    ctx.rotate(rot || 0);
    ctx.fillStyle = '#1b1d24';
    pent(ctx, 0, 0, r * 0.36, -PI / 2);
    for (var i = 0; i < 5; i++) { var a = -PI / 2 + i * TAU / 5; pent(ctx, cos(a) * r * 0.95, sin(a) * r * 0.95, r * 0.32, a + PI); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = max(1, r * 0.07);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  };

  // ---------------------------------------------------------------------------
  // Bayrak (tribünde, hediye teşekkürü)
  // ---------------------------------------------------------------------------
  A.flag = function (ctx, x, y, hue, t, s, wave) {
    s = s || 1; wave = wave == null ? 1 : wave;
    var top = y - 80 * s, fw = 68 * s, fh = 42 * s, n = 8, i, f;
    ctx.strokeStyle = '#c9cfdb'; ctx.lineWidth = 3.5 * s; line(ctx, x, y, x, top - 4 * s);
    ctx.fillStyle = '#ffd166'; circle(ctx, x, top - 5 * s, 4 * s);
    function edge(off) { var arr = []; for (i = 0; i <= n; i++) { f = i / n; arr.push([x + f * fw, top + off + sin(t * 7 - f * 5) * 6 * s * f * wave]); } return arr; }
    var a = edge(0), b = edge(fh), m1 = edge(fh * 0.36), m2 = edge(fh * 0.64);
    ctx.fillStyle = 'hsl(' + hue + ',85%,52%)';
    ctx.beginPath(); for (i = 0; i <= n; i++) ctx.lineTo(a[i][0], a[i][1]); for (i = n; i >= 0; i--) ctx.lineTo(b[i][0], b[i][1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); for (i = 0; i <= n; i++) ctx.lineTo(m1[i][0], m1[i][1]); for (i = n; i >= 0; i--) ctx.lineTo(m2[i][0], m2[i][1]); ctx.closePath(); ctx.fill();
  };

  // ---------------------------------------------------------------------------
  // Havai fişek + ışık şovu
  // ---------------------------------------------------------------------------
  var rockets = [], sparks = [];
  A.firework = function (x, hue, ty) {
    if (rockets.length > 12) return;
    rockets.push({ x: x, y: 700, vy: -1000 - Math.random() * 300, ty: ty || 170 + Math.random() * 230, hue: hue == null ? Math.random() * 360 : hue });
  };
  A.sparkBurst = function (x, y, hue, n) {
    n = min(n || 60, 650 - sparks.length);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, sp = 160 + Math.random() * 360;
      sparks.push({ x: x, y: y, vx: cos(a) * sp, vy: sin(a) * sp, t: 0, life: 0.9 + Math.random() * 0.7, c: 'hsl(' + ((hue + (Math.random() - 0.5) * 40 + 360) % 360 | 0) + ',100%,' + (55 + Math.random() * 25 | 0) + '%)' });
    }
  };
  A.updateFx = function (dt) {
    var i;
    for (i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.y += r.vy * dt; r.vy += 500 * dt;
      if (r.y <= r.ty || r.vy > -60) { A.sparkBurst(r.x, r.y, r.hue, 70); rockets.splice(i, 1); }
    }
    for (i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.t += dt; if (s.t >= s.life) { sparks.splice(i, 1); continue; }
      s.vx *= 1 - 1.6 * dt; s.vy = s.vy * (1 - 1.6 * dt) + 240 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
  };
  A.fxCount = function () { return sparks.length + rockets.length; };
  A.drawFx = function (ctx) {
    if (!rockets.length && !sparks.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    var i;
    ctx.lineWidth = 4;
    for (i = 0; i < rockets.length; i++) {
      var r = rockets[i];
      ctx.strokeStyle = 'rgba(255,220,160,0.9)'; line(ctx, r.x, r.y, r.x, r.y - r.vy * 0.04);
    }
    ctx.lineWidth = 3.2;
    for (i = 0; i < sparks.length; i++) {
      var s = sparks[i];
      ctx.globalAlpha = 1 - s.t / s.life;
      ctx.strokeStyle = s.c;
      line(ctx, s.x - s.vx * 0.035, s.y - s.vy * 0.035, s.x, s.y);
    }
    ctx.restore();
  };
  A.beams = function (ctx, t, k) {
    if (k <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var src = [[84, 69], [340, 122], [740, 122], [W - 84, 69]];
    for (var i = 0; i < src.length; i++) {
      var sx = src[i][0], sy = src[i][1];
      var ang = PI / 2 + sin(t * 1.4 + i * 1.9) * 0.7 + (i < 2 ? -0.15 : 0.15);
      var hue = (t * 80 + i * 90) % 360 | 0, len = 1500, wd = 0.085;
      var g = ctx.createLinearGradient(sx, sy, sx + cos(ang) * len, sy + sin(ang) * len);
      g.addColorStop(0, 'hsla(' + hue + ',100%,62%,' + (0.5 * k).toFixed(3) + ')'); g.addColorStop(1, 'hsla(' + hue + ',100%,60%,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + cos(ang - wd) * len, sy + sin(ang - wd) * len);
      ctx.lineTo(sx + cos(ang + wd) * len, sy + sin(ang + wd) * len);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };
})();
