/*
 * İnecek Var! — çizimler: şehir şeritleri (önceden çizilir), dolmuş, kafalar,
 * sahne objeleri, konuşma balonları, hız göstergesi, tabelalar.
 * Tüm görseller kodla çizilir (telif yok).
 */
(function () {
  'use strict';
  var D = (window.DOL = window.DOL || {});
  var ui = LG.ui;
  var A = (D.art = {});
  var PI = Math.PI, TAU = Math.PI * 2;

  function rr(ctx, x, y, w, h, r) { ui.roundRect(ctx, x, y, w, h, r); }
  A.rr = rr;
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  A.rng = rng;
  function hsl(h, s, l, a) { return a == null ? 'hsl(' + h + ',' + s + '%,' + l + '%)' : 'hsla(' + h + ',' + s + '%,' + l + '%,' + a + ')'; }
  A.hsl = hsl;

  // Bus yerel geometrisi (orijin: gövde alt ortası)
  A.BUS = { rearX: -372, frontX: 374, roofY: -281, bottom: 0, wheelR: 50, wheels: [-235, 245], door: [118, 215], doorC: { x: 166, y: -110 }, driver: { x: 282, y: -194 } };
  A.roofY = function (x, f) {
    var t = LG.clamp((x + 335) / 597, 0, 1);
    return -281 - 136 * f * t * (1 - t);
  };

  // ---------------------------------------------------------------------------
  // Uzak şerit: boğaz + karşı kıyı silüeti (genişlik 1800, yükseklik 260)
  // ---------------------------------------------------------------------------
  A.FAR_W = 1800; A.FAR_H = 260;
  A.makeFar = function (pal, seed) {
    var W = A.FAR_W, H = A.FAR_H;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'); var R = rng(seed || 7);
    var SEA = 150;
    var sg = g.createLinearGradient(0, SEA, 0, H);
    sg.addColorStop(0, pal.seaHi); sg.addColorStop(0.3, pal.sea); sg.addColorStop(1, pal.sea);
    g.fillStyle = sg; g.fillRect(0, SEA - 2, W, H - SEA + 2);
    // tepeler (kesintisiz döngü için tam periyot)
    g.fillStyle = pal.far;
    g.beginPath(); g.moveTo(0, SEA);
    for (var x = 0; x <= W; x += 30) {
      var y = SEA - 26 - 18 * Math.sin(x / W * TAU * 3) - 9 * Math.sin(x / W * TAU * 7 + 1);
      g.lineTo(x, y);
    }
    g.lineTo(W, SEA); g.closePath(); g.fill();
    // silüet: evler, kubbeler, minareler, kule
    g.fillStyle = pal.farDark;
    function wrapDraw(fn, x) { fn(x); if (x < 120) fn(x + W); if (x > W - 120) fn(x - W); }
    for (var i = 0; i < 70; i++) {
      var hx = R() * W, hw = 10 + R() * 26, hh = 8 + R() * 30;
      (function (hw, hh) { wrapDraw(function (xx) { g.fillRect(xx, SEA - hh, hw, hh + 2); }, hx); })(hw, hh);
    }
    function mosque(x) {
      g.fillRect(x - 40, SEA - 34, 80, 36);
      g.beginPath(); g.arc(x, SEA - 34, 30, PI, 0); g.fill();
      g.beginPath(); g.arc(x - 34, SEA - 30, 13, PI, 0); g.arc(x + 34, SEA - 30, 13, PI, 0); g.fill();
      g.fillRect(x - 1.5, SEA - 74, 3, 12);
      [-58, 58].forEach(function (dx) {
        g.fillRect(x + dx - 3, SEA - 92, 6, 94);
        g.beginPath(); g.moveTo(x + dx - 4, SEA - 92); g.lineTo(x + dx, SEA - 112); g.lineTo(x + dx + 4, SEA - 92); g.fill();
        g.fillRect(x + dx - 5, SEA - 70, 10, 3);
      });
    }
    wrapDraw(mosque, 260); wrapDraw(mosque, 1240);
    // kule
    wrapDraw(function (x) {
      g.fillRect(x - 10, SEA - 78, 20, 80);
      g.beginPath(); g.moveTo(x - 13, SEA - 78); g.lineTo(x, SEA - 108); g.lineTo(x + 13, SEA - 78); g.fill();
    }, 640);
    // köprü
    var bx1 = 860, bx2 = 1160, top = 30, deck = 120;
    g.strokeStyle = pal.farDark; g.lineWidth = 3;
    g.fillRect(bx1 - 5, top, 10, SEA - top); g.fillRect(bx2 - 5, top, 10, SEA - top);
    g.fillRect(bx1 - 140, deck, (bx2 - bx1) + 280, 6);
    g.beginPath(); g.moveTo(bx1 - 140, deck); g.quadraticCurveTo(bx1 - 60, top + 40, bx1, top);
    g.quadraticCurveTo((bx1 + bx2) / 2, deck + 30, bx2, top); g.quadraticCurveTo(bx2 + 60, top + 40, bx2 + 140, deck); g.stroke();
    g.lineWidth = 1;
    for (var k = bx1 + 20; k < bx2; k += 20) {
      var tt = (k - bx1) / (bx2 - bx1);
      var cy = (1 - tt) * (1 - tt) * top + 2 * (1 - tt) * tt * (deck + 30) + tt * tt * top;
      g.beginPath(); g.moveTo(k, cy); g.lineTo(k, deck); g.stroke();
    }
    if (pal.night) {
      for (var n = 0; n < 160; n++) {
        g.fillStyle = R() < 0.7 ? 'rgba(255,220,120,0.9)' : 'rgba(255,255,255,0.8)';
        g.fillRect(R() * W, SEA - 8 - R() * 40, 2, 2);
      }
      for (var b = bx1 - 130; b < bx2 + 140; b += 18) { g.fillStyle = 'hsl(' + ((b * 3) % 360) + ',90%,65%)'; g.fillRect(b, deck - 3, 3, 3); }
    }
    // pus
    var hz = g.createLinearGradient(0, 0, 0, SEA);
    hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(1, pal.haze);
    g.fillStyle = hz; g.fillRect(0, 0, W, SEA);
    return c;
  };

  // ---------------------------------------------------------------------------
  // Orta şerit: balkonlu, çamaşırlı apartmanlar (genişlik 2400, yükseklik 580)
  // ---------------------------------------------------------------------------
  A.MID_W = 2400; A.MID_H = 580;
  var SHOPS = ['BAKKAL', 'BERBER', 'FIRIN', 'ÇAY OCAĞI', 'SİMİT', 'ECZANE', 'TUHAFİYE', 'KUAFÖR', 'BÜFE', 'LOKANTA', 'MANAV', 'KASAP'];
  var CLOTH = ['#e63946', '#f1c40f', '#3498db', '#2ecc71', '#ff7eb6', '#ffffff', '#9b59b6', '#ff9f1c', '#00b4d8'];
  A.makeMid = function (pal, seed) {
    var W = A.MID_W, H = A.MID_H;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'); var R = rng(seed || 11);
    var x = 0, shopI = Math.floor(R() * SHOPS.length);
    while (x < W - 10) {
      if (R() < 0.16 && x > 0 && W - x > 400) {
        // park boşluğu: ağaçlar
        var gw = 90 + R() * 90;
        for (var tI = 0; tI < 2; tI++) {
          var tx = x + gw * (0.3 + tI * 0.4), th = 120 + R() * 70;
          g.fillStyle = '#6b4a2b'; g.fillRect(tx - 5, H - th * 0.5, 10, th * 0.5);
          g.fillStyle = pal.night ? '#1d4a32' : hsl(120 + R() * 30, 45, 36 + R() * 8);
          g.beginPath(); g.arc(tx, H - th * 0.6, 36, 0, TAU); g.arc(tx - 26, H - th * 0.5, 26, 0, TAU); g.arc(tx + 26, H - th * 0.5, 26, 0, TAU); g.fill();
        }
        x += gw; continue;
      }
      var w = 150 + Math.floor(R() * 110);
      if (x + w > W - 120) w = W - x;
      var h = 250 + Math.floor(R() * 220);
      var top = H - h;
      var hue = LG.pick(pal.bldHue) + (R() - 0.5) * 16;
      var sat = 30 + R() * 25, lig = pal.bldL + (R() - 0.5) * 14;
      drawBuilding(g, R, x, top, w, h, hue, sat, lig, pal, SHOPS[shopI++ % SHOPS.length]);
      x += w;
    }
    return c;
  };

  function drawBuilding(g, R, x, top, w, h, hue, sat, lig, pal, shop) {
    var H = A.MID_H;
    g.fillStyle = hsl(hue, sat, lig);
    g.fillRect(x, top, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + w - 10, top, 10, h);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, top, 6, h);
    // korniş
    g.fillStyle = hsl(hue, sat, lig - 12); g.fillRect(x - 4, top, w + 8, 10);
    var roofType = Math.floor(R() * 3);
    if (roofType === 1) {
      g.fillStyle = pal.night ? '#5a2a22' : '#c0503a';
      g.beginPath(); g.moveTo(x - 6, top); g.lineTo(x + w * 0.2, top - 34); g.lineTo(x + w * 0.8, top - 34); g.lineTo(x + w + 6, top); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2;
      for (var rl = 8; rl < 34; rl += 9) { g.beginPath(); g.moveTo(x + w * 0.2 * rl / 34, top - rl + 0.5); g.lineTo(x + w - w * 0.2 * rl / 34, top - rl + 0.5); g.stroke(); }
    } else {
      // su deposu, çanak anten, TV anteni
      g.fillStyle = pal.night ? '#556' : '#dfe6ee';
      if (R() < 0.7) { var dx = x + 20 + R() * (w - 70); g.fillRect(dx, top - 26, 34, 26); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(dx, top - 26, 34, 5); }
      g.strokeStyle = pal.night ? '#889' : '#555'; g.lineWidth = 2;
      var ax = x + w - 30 - R() * 40;
      g.beginPath(); g.moveTo(ax, top); g.lineTo(ax, top - 44); g.moveTo(ax - 14, top - 36); g.lineTo(ax + 14, top - 36); g.moveTo(ax - 10, top - 26); g.lineTo(ax + 10, top - 26); g.stroke();
      g.fillStyle = '#f2f2f2';
      g.beginPath(); g.ellipse(x + 30 + R() * 30, top - 12, 12, 9, -0.5, 0, TAU); g.fill();
      if (roofType === 2 && R() < 0.8) {
        // çatıda çamaşır + kedi
        var ly = top - 30;
        g.strokeStyle = '#444'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x + 10, ly); g.lineTo(x + w - 10, ly); g.stroke();
        for (var cx = x + 22; cx < x + w - 30; cx += 26 + R() * 14) cloth(g, R, cx, ly);
      }
      if (R() < 0.35) { g.font = '28px ' + ui.EMOJI_FONT; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(R() < 0.5 ? '🐈' : '🐈‍⬛', x + w * (0.3 + R() * 0.4), top + 2); }
    }
    // katlar
    var floorH = 66, shopH = 92;
    var balcony = R() < 0.55, shutters = R() < 0.35;
    var nWin = Math.max(2, Math.floor((w - 24) / 56));
    var gap = (w - nWin * 34) / (nWin + 1);
    for (var fy = top + 26; fy + floorH < H - shopH + 10; fy += floorH) {
      for (var i = 0; i < nWin; i++) {
        var wx = x + gap + i * (34 + gap), wy = fy;
        if (pal.night) {
          var lit = R() < 0.55;
          g.fillStyle = lit ? (R() < 0.3 ? '#ffe9a8' : '#ffd36b') : '#1b2142';
          g.fillRect(wx, wy, 34, 42);
          if (lit && R() < 0.5) { g.fillStyle = 'rgba(255,120,90,0.45)'; g.fillRect(wx, wy, 12, 42); }
        } else {
          var gg = g.createLinearGradient(wx, wy, wx + 34, wy + 42);
          gg.addColorStop(0, '#d8f0ff'); gg.addColorStop(1, '#7fb0d6');
          g.fillStyle = gg; g.fillRect(wx, wy, 34, 42);
          g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(wx + 5, wy + 4, 4, 18);
          if (R() < 0.3) { g.fillStyle = LG.pick(['#ffffff', '#f6d6a8', '#f2b5c4']); g.fillRect(wx + 18, wy, 16, 42); }
        }
        g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3; g.strokeRect(wx, wy, 34, 42);
        if (shutters) { g.fillStyle = pal.night ? '#24402d' : '#3f7d4e'; g.fillRect(wx - 10, wy, 9, 42); g.fillRect(wx + 35, wy, 9, 42); }
        if (!balcony && R() < 0.18) { g.fillStyle = '#e8e8e8'; g.fillRect(wx + 36, wy + 26, 18, 13); g.fillStyle = '#999'; g.fillRect(wx + 39, wy + 29, 12, 2); g.fillRect(wx + 39, wy + 33, 12, 2); }
      }
      if (balcony) {
        var by = fy + 46;
        g.fillStyle = hsl(hue, sat, lig - 18); g.fillRect(x + 6, by, w - 12, 7);
        g.strokeStyle = pal.night ? '#aab' : '#333'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + 8, by - 20); g.lineTo(x + w - 8, by - 20);
        for (var bx = x + 10; bx < x + w - 8; bx += 9) { g.moveTo(bx, by - 20); g.lineTo(bx, by); }
        g.stroke();
        if (R() < 0.55) {
          // çamaşır ipi
          var ly2 = fy - 6;
          g.strokeStyle = '#555'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(x + 10, ly2); g.quadraticCurveTo(x + w / 2, ly2 + 6, x + w - 10, ly2); g.stroke();
          for (var lx = x + 20; lx < x + w - 26; lx += 24 + R() * 16) cloth(g, R, lx, ly2 + 3);
        }
        if (R() < 0.5) {
          for (var fp = 0; fp < 3; fp++) {
            var px = x + 16 + R() * (w - 32);
            g.fillStyle = '#b5651d'; g.fillRect(px - 5, by - 28, 10, 8);
            g.fillStyle = LG.pick(['#ff4d6d', '#ff8fab', '#ffd166', '#e63946']);
            g.beginPath(); g.arc(px - 4, by - 31, 4, 0, TAU); g.arc(px + 4, by - 32, 4, 0, TAU); g.arc(px, by - 36, 4, 0, TAU); g.fill();
          }
        }
        if (R() < 0.15) { g.font = '24px ' + ui.EMOJI_FONT; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('🐈', x + 20 + R() * (w - 40), by - 18); }
      }
    }
    // dükkân
    var sy = H - shopH;
    g.fillStyle = hsl(hue, sat * 0.6, lig - 22); g.fillRect(x, sy, w, shopH);
    g.fillStyle = pal.night ? 'rgba(255,214,120,0.85)' : 'rgba(200,230,255,0.85)'; g.fillRect(x + 12, sy + 40, w - 24, shopH - 40);
    var aw = R() < 0.5 ? ['#d62828', '#ffffff'] : ['#2a9d8f', '#ffffff'];
    for (var s = 0; s < w; s += 20) { g.fillStyle = aw[(s / 20) % 2]; g.fillRect(x + s, sy + 18, Math.min(20, w - s), 18); }
    g.fillStyle = '#1d1d2b'; g.fillRect(x + 10, sy - 4, w - 20, 24);
    g.font = '800 18px ' + ui.FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = shop === 'ECZANE' ? '#4cff8a' : '#ffd54a';
    g.fillText(shop, x + w / 2, sy + 9, w - 30);
  }
  function cloth(g, R, cx, ly) {
    var col = LG.pick(CLOTH), k = R();
    g.fillStyle = col;
    if (k < 0.35) { // tişört
      g.beginPath(); g.moveTo(cx - 10, ly); g.lineTo(cx + 10, ly); g.lineTo(cx + 15, ly + 7); g.lineTo(cx + 9, ly + 9); g.lineTo(cx + 9, ly + 26); g.lineTo(cx - 9, ly + 26); g.lineTo(cx - 9, ly + 9); g.lineTo(cx - 15, ly + 7); g.closePath(); g.fill();
    } else if (k < 0.6) { // pantolon
      g.fillRect(cx - 9, ly, 18, 8); g.fillRect(cx - 9, ly + 6, 8, 24); g.fillRect(cx + 1, ly + 6, 8, 24);
    } else if (k < 0.8) { // havlu çizgili
      g.fillRect(cx - 10, ly, 20, 28); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(cx - 10, ly + 6, 20, 3); g.fillRect(cx - 10, ly + 18, 20, 3);
    } else { // çorap
      g.fillRect(cx - 3, ly, 6, 14); g.fillRect(cx - 3, ly + 10, 10, 5);
    }
    g.fillStyle = '#8b5a2b'; g.fillRect(cx - 1, ly - 3, 2, 5);
  }

  // ---------------------------------------------------------------------------
  // Gökyüzü
  // ---------------------------------------------------------------------------
  A.makeStars = function (seed) {
    var R = rng(seed || 3), s = [];
    for (var i = 0; i < 90; i++) s.push({ x: R() * LG.W, y: R() * 640, r: 0.8 + R() * 2.2, p: R() * TAU });
    return s;
  };
  A.cloud = function (ctx, x, y, s, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 34 * s, 0, TAU); ctx.arc(x + 40 * s, y - 14 * s, 42 * s, 0, TAU); ctx.arc(x + 86 * s, y, 32 * s, 0, TAU);
    ctx.arc(x + 44 * s, y + 12 * s, 34 * s, 0, TAU);
    ctx.fill(); ctx.restore();
  };
  A.gull = function (ctx, x, y, s, t, col) {
    var f = Math.sin(t * 9) * 0.6;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = col || '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-22, -8 * f - 4); ctx.quadraticCurveTo(-10, -10 - 8 * f, 0, 0); ctx.quadraticCurveTo(10, -10 - 8 * f, 22, -8 * f - 4); ctx.stroke();
    ctx.restore();
  };
  A.ferry = function (ctx, x, y, night) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = night ? '#cfd6ff' : '#ffffff';
    ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(46, 0); ctx.lineTo(38, 10); ctx.lineTo(-38, 10); ctx.closePath(); ctx.fill();
    ctx.fillRect(-32, -10, 64, 10);
    ctx.fillStyle = '#222'; ctx.fillRect(-34, 4, 68, 3);
    ctx.fillStyle = '#ffd400'; ctx.fillRect(-4, -22, 9, 12); ctx.fillStyle = '#111'; ctx.fillRect(-4, -24, 9, 4);
    if (night) { ctx.fillStyle = '#ffe28a'; for (var i = -28; i < 30; i += 8) ctx.fillRect(i, -7, 4, 3); }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Kaldırım objeleri (ön plan, yolla aynı hızda kayar). y = taban
  // ---------------------------------------------------------------------------
  A.prop = function (ctx, type, x, y, t, seed) {
    ctx.save(); ctx.translate(x, y);
    if (type === 'simitci') {
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(-30, -6, 9, 0, TAU); ctx.arc(30, -6, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c62828'; rr(ctx, -50, -62, 100, 50, 8); ctx.fill();
      ctx.fillStyle = 'rgba(220,240,255,0.85)'; rr(ctx, -44, -104, 88, 44, 6); ctx.fill();
      ctx.strokeStyle = '#7a1010'; ctx.lineWidth = 3; ctx.strokeRect(-44, -104, 88, 44);
      ctx.strokeStyle = '#b5651d'; ctx.lineWidth = 6;
      for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-30 + (i % 3) * 30, -92 + Math.floor(i / 3) * 18, 8, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#ffd400'; ctx.font = '900 16px ' + ui.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SİMİT', 0, -37);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(40, -104); ctx.lineTo(40, -140); ctx.stroke();
      ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(0, -140); ctx.quadraticCurveTo(40, -170, 80, -140); ctx.closePath(); ctx.fill();
    } else if (type === 'kedi') {
      var col = ['#f4a340', '#888', '#222', '#f5f5f5'][seed % 4];
      var tail = Math.sin(t * 3 + seed) * 0.5;
      ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(14, -6); ctx.quadraticCurveTo(34, -10, 30 + tail * 10, -34); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -18, 18, 18, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-6, -42, 14, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18, -48); ctx.lineTo(-16, -62); ctx.lineTo(-8, -54); ctx.closePath(); ctx.moveTo(4, -50); ctx.lineTo(4, -62); ctx.lineTo(-4, -55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = seed % 4 === 2 ? '#ffd400' : '#2d6a4f';
      ctx.beginPath(); ctx.arc(-11, -44, 2.6, 0, TAU); ctx.arc(-1, -44, 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.arc(-6, -38, 2, 0, TAU); ctx.fill();
    } else if (type === 'cay') {
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-3, -40, 6, 40);
      ctx.fillStyle = '#8d6e4f'; rr(ctx, -34, -46, 68, 8, 4); ctx.fill();
      // tabureler
      ctx.fillStyle = '#d62828'; rr(ctx, -64, -24, 22, 6, 2); ctx.fill(); rr(ctx, 42, -24, 22, 6, 2); ctx.fill();
      ctx.fillStyle = '#555'; ctx.fillRect(-60, -18, 3, 18); ctx.fillRect(-47, -18, 3, 18); ctx.fillRect(46, -18, 3, 18); ctx.fillRect(59, -18, 3, 18);
      // ince belli çay bardakları
      [-14, 12].forEach(function (gx) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(gx - 7, -50, 14, 4);
        ctx.fillStyle = '#b22222';
        ctx.beginPath(); ctx.moveTo(gx - 6, -70); ctx.quadraticCurveTo(gx - 1, -60, gx - 5, -51); ctx.lineTo(gx + 5, -51); ctx.quadraticCurveTo(gx + 1, -60, gx + 6, -70); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2;
        var st = Math.sin(t * 2 + gx) * 3;
        ctx.beginPath(); ctx.moveTo(gx, -74); ctx.quadraticCurveTo(gx + st, -82, gx, -90); ctx.stroke();
      });
    } else if (type === 'cicek') {
      ctx.fillStyle = '#607d8b'; rr(ctx, -20, -30, 40, 30, 4); ctx.fill();
      var cols = ['#ff4d6d', '#ffd166', '#ff8fab', '#e63946', '#b388ff'];
      for (var f = 0; f < 7; f++) {
        var fx = -16 + f * 5.5, fy = -44 - (f % 3) * 7;
        ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, -28); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = cols[f % cols.length]; ctx.beginPath(); ctx.arc(fx, fy, 6, 0, TAU); ctx.fill();
      }
    } else if (type === 'marti') {
      var hop = Math.max(0, Math.sin(t * 2 + seed)) * 4;
      ctx.translate(0, -hop);
      ctx.fillStyle = '#f5f5f5'; ctx.beginPath(); ctx.ellipse(0, -16, 18, 11, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(14, -28, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#9aa5b1'; ctx.beginPath(); ctx.ellipse(-4, -18, 13, 7, 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffb703'; ctx.beginPath(); ctx.moveTo(21, -29); ctx.lineTo(31, -27); ctx.lineTo(21, -25); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(16, -30, 1.8, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffb703'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-2, 0); ctx.moveTo(4, -6); ctx.lineTo(4, 0); ctx.stroke();
    } else if (type === 'kopek') {
      var br = Math.sin(t * 1.5 + seed) * 1.5;
      ctx.fillStyle = '#c8a27a'; ctx.beginPath(); ctx.ellipse(0, -14, 34, 13 + br, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(34, -14, 14, 11, 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8b6a4a'; ctx.beginPath(); ctx.ellipse(30, -22, 6, 10, -0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd400'; ctx.fillRect(28, -30, 7, 5); // küpe
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(38, -15, 3, 0, PI); ctx.stroke();
      ui.emoji(ctx, '💤', 54, -40 - (t * 10 % 12), 18);
    } else { // çöp kutusu / bank
      ctx.fillStyle = '#2e7d32'; rr(ctx, -16, -50, 32, 50, 5); ctx.fill();
      ctx.fillStyle = '#1b5e20'; ctx.fillRect(-18, -54, 36, 8);
    }
    ctx.restore();
  };

  // Durak tabelası
  A.stopSign = function (ctx, x, y, name, alpha) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.translate(x, y);
    ctx.fillStyle = '#9aa0a6'; ctx.fillRect(-5, -190, 10, 190);
    ctx.fillStyle = '#1565c0'; rr(ctx, -66, -250, 132, 62, 12); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
    ui.emoji(ctx, '🚏', -38, -219, 34);
    ctx.fillStyle = '#fff'; ctx.font = '900 28px ' + ui.FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('DURAK', -16, -218);
    if (name) {
      ctx.font = '900 24px ' + ui.FONT;
      var w = Math.min(300, ctx.measureText(name).width + 28);
      ctx.fillStyle = '#fff'; rr(ctx, -w / 2, -182, w, 38, 8); ctx.fill();
      ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#12355e'; ctx.textAlign = 'center';
      ctx.fillText(name, 0, -162, w - 16);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Yolcu kafası (pencerede görünen). Profil fotoğrafı varsa onu kullanır.
  // ---------------------------------------------------------------------------
  var SKINS = ['#f8d5b8', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
  var HAIRS = ['#2b1b0e', '#4a2c17', '#111', '#7a4b1e', '#c9a14a', '#b5462e', '#888'];
  A.look = function (u) {
    if (u.data.dlook) return u.data.dlook;
    var h = LG.hash(u.id + 'dolmus');
    var lk = {
      style: h % 6, skin: SKINS[(h >>> 3) % SKINS.length], hair: HAIRS[(h >>> 6) % HAIRS.length],
      acc: 'hsl(' + ((h >>> 9) % 360) + ',75%,52%)', glasses: ((h >>> 12) % 5) === 0, cap: ((h >>> 14) % 2) === 0,
    };
    if (lk.style === 1) lk.hair = ((h >>> 16) % 2) ? '#9a9a9a' : '#3a2a1a';
    u.data.dlook = lk;
    return lk;
  };
  A.head = function (ctx, u, x, y, r, o) {
    o = o || {};
    var img = LG.avatarImg(u);
    if (img) { ui.avatar(ctx, u, x, y, r, { ring: u.color, ringWidth: Math.max(2, r * 0.12) }); return; }
    var lk = A.look(u), st = lk.style, wind = o.wind || 0, t = o.t || 0;
    ctx.save();
    ctx.translate(x, y);
    if (o.tilt) ctx.rotate(o.tilt);
    // arka saç (uzun saç / rüzgar)
    if (st === 3) {
      ctx.fillStyle = lk.hair;
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 1.12, PI * 0.9, PI * 2.1); ctx.lineTo(r * 1.05, r * 0.9); ctx.lineTo(-r * 1.05, r * 0.9); ctx.closePath(); ctx.fill();
    }
    if (wind > 0.05 && st !== 1) {
      ctx.strokeStyle = st === 0 ? lk.acc : lk.hair; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
      for (var k = 0; k < 3; k++) {
        var yy = -r * 0.55 + k * r * 0.35, wv = Math.sin(t * 22 + k * 2) * r * 0.25;
        ctx.beginPath(); ctx.moveTo(-r * 0.6, yy); ctx.quadraticCurveTo(-r * (0.9 + wind * 0.6), yy + wv, -r * (1.0 + wind * 1.3), yy - wv * 0.5); ctx.stroke();
      }
    }
    // yüz
    ctx.fillStyle = lk.skin;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.stroke();
    // saç / başörtüsü / şapka
    if (st === 0) { // teyze: yazma
      ctx.fillStyle = lk.acc;
      ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.12, PI * 0.82, PI * 2.18); ctx.quadraticCurveTo(r * 0.7, -r * 0.6, 0, -r * 0.72); ctx.quadraticCurveTo(-r * 0.7, -r * 0.6, -r * 1.0, r * 0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (var d = -2; d <= 2; d++) { ctx.beginPath(); ctx.arc(d * r * 0.36, -r * 0.88 + Math.abs(d) * r * 0.1, r * 0.08, 0, TAU); ctx.fill(); }
    } else if (st === 1) { // amca: kel + yan saç (+ kasket)
      ctx.fillStyle = lk.hair;
      ctx.beginPath(); ctx.ellipse(-r * 0.85, -r * 0.1, r * 0.22, r * 0.4, 0, 0, TAU); ctx.ellipse(r * 0.85, -r * 0.1, r * 0.22, r * 0.4, 0, 0, TAU); ctx.fill();
      if (lk.cap) {
        ctx.fillStyle = '#4b4b55';
        ctx.beginPath(); ctx.ellipse(0, -r * 0.62, r * 1.02, r * 0.5, 0, PI, 0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.55, -r * 0.6, r * 0.6, r * 0.16, 0.08, 0, TAU); ctx.fill();
      } else { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.6, r * 0.25, r * 0.12, -0.4, 0, TAU); ctx.fill(); }
    } else if (st === 2) { // genç: ters şapka
      ctx.fillStyle = lk.hair; ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.98, PI * 1.05, PI * 1.95); ctx.fill();
      ctx.fillStyle = lk.acc;
      ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.95, PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-r * 0.95, -r * 0.4, r * 0.5, r * 0.15, -0.15, 0, TAU); ctx.fill();
    } else if (st === 3) { // kız: kakül
      ctx.fillStyle = lk.hair;
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 1.02, PI * 1.0, PI * 2.0); ctx.quadraticCurveTo(r * 0.4, -r * 0.2, 0, -r * 0.45); ctx.quadraticCurveTo(-r * 0.5, -r * 0.2, -r * 1.02, -r * 0.15); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.2, -r * 1.05, r * 0.32, 0, TAU); ctx.fill();
    } else if (st === 4) { // kısa saç
      ctx.fillStyle = lk.hair;
      ctx.beginPath(); ctx.arc(0, -r * 0.18, r * 1.0, PI * 1.02, PI * 1.98); ctx.quadraticCurveTo(0, -r * 0.55, -r * 0.98, -r * 0.3); ctx.fill();
    } else { // kıvırcık
      ctx.fillStyle = lk.hair;
      for (var q = 0; q < 7; q++) { var a = PI + q * PI / 6; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85 - r * 0.1, r * 0.36, 0, TAU); ctx.fill(); }
    }
    // gözler
    var blink = o.blink;
    ctx.fillStyle = '#1d1d1d';
    var ey = -r * 0.02, ex = r * 0.34;
    if (blink) { ctx.fillRect(-ex - r * 0.14, ey, r * 0.28, r * 0.06); ctx.fillRect(ex - r * 0.14, ey, r * 0.28, r * 0.06); }
    else { ctx.beginPath(); ctx.arc(-ex + r * 0.06, ey, r * 0.11, 0, TAU); ctx.arc(ex + r * 0.06, ey, r * 0.11, 0, TAU); ctx.fill(); }
    if (lk.glasses || st === 4 && lk.cap) {
      ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.beginPath(); ctx.arc(-ex + r * 0.06, ey, r * 0.24, 0, TAU); ctx.moveTo(ex + r * 0.3, ey); ctx.arc(ex + r * 0.06, ey, r * 0.24, 0, TAU); ctx.moveTo(-ex + r * 0.3, ey); ctx.lineTo(ex - r * 0.18, ey); ctx.stroke();
    }
    // bıyık (amca)
    if (st === 1) {
      ctx.fillStyle = '#2a1a0e';
      ctx.beginPath(); ctx.ellipse(-r * 0.2, r * 0.33, r * 0.28, r * 0.12, 0.25, 0, TAU); ctx.ellipse(r * 0.28, r * 0.33, r * 0.28, r * 0.12, -0.25, 0, TAU); ctx.fill();
    }
    // ağız
    var face = o.face || 'happy';
    ctx.strokeStyle = '#3a1a1a'; ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.lineCap = 'round';
    ctx.beginPath();
    if (face === 'wow') { ctx.fillStyle = '#5a1a1a'; ctx.ellipse(r * 0.08, r * 0.5, r * 0.15, r * 0.2, 0, 0, TAU); ctx.fill(); }
    else if (face === 'squish') { ctx.moveTo(-r * 0.15, r * 0.5); ctx.lineTo(r * 0.3, r * 0.45); ctx.stroke(); }
    else { ctx.arc(r * 0.08, r * 0.3, r * 0.3, PI * 0.2, PI * 0.8); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,90,90,0.3)';
    ctx.beginPath(); ctx.arc(-r * 0.55, r * 0.25, r * 0.15, 0, TAU); ctx.arc(r * 0.65, r * 0.25, r * 0.15, 0, TAU); ctx.fill();
    ctx.restore();
  };

  // Para
  A.note = function (ctx, x, y, rot, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s || 1, s || 1);
    ctx.fillStyle = '#3fae5a'; rr(ctx, -24, -13, 48, 26, 4); ctx.fill();
    ctx.strokeStyle = '#1f6b33'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-11, 0, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0f4a20'; ctx.font = '900 18px ' + ui.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('₺', 10, 1);
    ctx.restore();
  };
  A.coin = function (ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, 1);
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Dolmuş gövdesi (yerel koordinat). S: durum nesnesi
  // ---------------------------------------------------------------------------
  function bodyPath(ctx, f) {
    ctx.beginPath();
    ctx.moveTo(-372, -8);
    ctx.quadraticCurveTo(-372 - 26 * f, -140, -370, -252);
    ctx.quadraticCurveTo(-368, -281, -335, -281);
    ctx.quadraticCurveTo(-36, -281 - 68 * f, 262, -281);
    ctx.quadraticCurveTo(292, -281, 306, -262);
    ctx.lineTo(350, -172);
    ctx.quadraticCurveTo(372 + 14 * f, -152, 374 + 12 * f, -92);
    ctx.lineTo(376 + 8 * f, -24);
    ctx.quadraticCurveTo(374, 0, 350, 0);
    ctx.lineTo(-350, 0);
    ctx.quadraticCurveTo(-372, 0, -372, -8);
    ctx.closePath();
  }
  A.bodyPath = bodyPath;
  // Pencere bandı (iç mekân klibi): yan camlar + şoför camı/ön cam
  function windowPath(ctx, f) {
    var top = -252 - 10 * f;
    ctx.beginPath();
    rr(ctx, -362, top, 584, -140 - top, 14);
    ctx.moveTo(230, top); ctx.lineTo(300, top); ctx.lineTo(346, -166); ctx.lineTo(346, -140); ctx.lineTo(230, -140); ctx.closePath();
  }
  A.windowPath = windowPath;
  A.winTop = function (f) { return -252 - 10 * f; };

  var bodyGradCache = null, checkerCache = null;
  function checkerPat(ctx) {
    if (checkerCache) return checkerCache;
    var c = document.createElement('canvas'); c.width = 14; c.height = 14;
    var g = c.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, 14, 14);
    g.fillStyle = '#fff'; g.fillRect(0, 0, 7, 7); g.fillRect(7, 7, 7, 7);
    checkerCache = ctx.createPattern(c, 'repeat');
    return checkerCache;
  }
  A.checkerPat = checkerPat;
  A.busBody = function (ctx, S) {
    var f = S.f, t = S.t;
    // gövde
    if (!bodyGradCache) {
      var g = ctx.createLinearGradient(0, -300, 0, 0);
      g.addColorStop(0, '#ffe45c'); g.addColorStop(0.55, '#ffcc00'); g.addColorStop(1, '#eba300');
      bodyGradCache = g;
    }
    bodyPath(ctx, f);
    ctx.fillStyle = bodyGradCache; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = '#3b2a00'; ctx.stroke();
    // çatı parlaklığı
    ctx.save(); bodyPath(ctx, f); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(-372, -300 - 40 * f, 760, 22 + 30 * f);
    // dama şerit (önbellekli desen)
    ctx.save(); ctx.translate(-380, -126); ctx.fillStyle = checkerPat(ctx); ctx.fillRect(0, 0, 770, 14); ctx.restore();
    // alt etek
    ctx.fillStyle = '#2b2b33'; ctx.fillRect(-380, -26, 770, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-380, -26, 770, 4);
    ctx.restore();
    // yan yazı (rota)
    ctx.save();
    ctx.font = '900 30px ' + ui.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2b1d00';
    ctx.fillText(S.sideText || '', -130, -70, 380);
    ctx.restore();
    // tekerlek kemerleri
    ctx.fillStyle = '#1a1a1f';
    for (var w = 0; w < 2; w++) { ctx.beginPath(); ctx.arc(A.BUS.wheels[w], 2, 64, PI, 0); ctx.fill(); }
    // farlar
    var hx = 362 + 10 * f;
    ctx.fillStyle = S.night ? '#fff7c2' : '#fffbe6';
    ctx.beginPath(); ctx.ellipse(hx, -74, 10, 18, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ff9f1c'; ctx.fillRect(hx - 6, -50, 12, 10);
    ctx.fillStyle = '#e63946'; rr(ctx, -380 - 20 * f, -86, 12, 30, 4); ctx.fill();
    // ayna
    ctx.strokeStyle = '#222'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(318, -196); ctx.lineTo(340, -214); ctx.stroke();
    ctx.fillStyle = '#222'; rr(ctx, 334, -236, 16, 26, 5); ctx.fill();
  };

  // İç mekân arka planı (klip içinde)
  A.interior = function (ctx, S) {
    var top = A.winTop(S.f);
    var g = ctx.createLinearGradient(0, top, 0, -140);
    g.addColorStop(0, S.night ? '#1d2030' : '#3a3f55'); g.addColorStop(1, S.night ? '#11131c' : '#262a3a');
    ctx.fillStyle = g; ctx.fillRect(-370, top - 10, 730, 140);
    if (S.night) { ctx.fillStyle = 'rgba(255,230,160,0.12)'; ctx.fillRect(-370, top - 10, 600, 140); }
    // tutamaklar
    ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 3;
    for (var x = -340; x < 210; x += 46) {
      var sw = Math.sin(S.t * 3 + x) * 3 + S.lurch * 0.25;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + sw, top + 14); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + sw, top + 20, 6, 0, TAU); ctx.stroke();
    }
    // koltuk sırtları
    ctx.fillStyle = '#7a1f2b';
    for (var s = -300; s < 200; s += 75) { rr(ctx, s - 20, -166, 40, 30, 8); ctx.fill(); }
  };
  A.seatFronts = function (ctx) {
    ctx.fillStyle = '#9b2335';
    for (var s = -280; s < 200; s += 75) { rr(ctx, s - 26, -152, 52, 16, 6); ctx.fill(); }
  };

  // Şoför (bıyıklı, kasketli)
  A.driver = function (ctx, S) {
    var d = A.BUS.driver, t = S.t;
    var bob = Math.sin(t * 5) * 1.5;
    var x = d.x, y = d.y + bob + S.lurch * 0.15;
    // gövde
    ctx.fillStyle = '#3d5a80'; rr(ctx, x - 26, y + 18, 52, 50, 14); ctx.fill();
    // direksiyon
    ctx.strokeStyle = '#111'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(x + 46, y + 32, 7, 22, 0.25, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#3d5a80'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 4, y + 30); ctx.lineTo(x + 42, y + 22 + Math.sin(t * 2) * 3); ctx.stroke();
    ctx.fillStyle = '#e0ac69'; ctx.beginPath(); ctx.arc(x + 44, y + 22 + Math.sin(t * 2) * 3, 6, 0, TAU); ctx.fill();
    // kafa
    ctx.fillStyle = '#e0ac69'; ctx.beginPath(); ctx.arc(x, y, 25, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    // kasket
    ctx.fillStyle = '#3b3b45';
    ctx.beginPath(); ctx.ellipse(-2 + x, y - 14, 27, 15, 0, PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 18, y - 13, 18, 5, 0.1, 0, TAU); ctx.fill();
    // kaş, göz
    ctx.fillStyle = '#1d1d1d';
    var angry = S.driverMood === 'angry';
    ctx.save(); ctx.translate(x + 10, y - 4); ctx.rotate(angry ? 0.35 : -0.1); ctx.fillRect(-7, -3, 14, 4); ctx.restore();
    ctx.beginPath(); ctx.arc(x + 11, y + 2, 3, 0, TAU); ctx.fill();
    // burun
    ctx.fillStyle = '#c68642'; ctx.beginPath(); ctx.ellipse(x + 22, y + 6, 7, 6, 0, 0, TAU); ctx.fill();
    // koca bıyık
    var mw = Math.sin(t * 4) * 0.08;
    ctx.fillStyle = '#1a0f08';
    ctx.save(); ctx.translate(x + 16, y + 15); ctx.rotate(mw);
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-10, -8, 0, -4); ctx.quadraticCurveTo(10, -8, 18, 0);
    ctx.quadraticCurveTo(22, 6, 16, 8); ctx.quadraticCurveTo(10, 2, 0, 3); ctx.quadraticCurveTo(-10, 2, -16, 8); ctx.quadraticCurveTo(-22, 6, -16, 0);
    ctx.fill(); ctx.restore();
    if (S.driverMood === 'shout' || angry) { ctx.fillStyle = '#5a1a1a'; ctx.beginPath(); ctx.ellipse(x + 15, y + 22, 5, 4, 0, 0, TAU); ctx.fill(); }
  };

  // Cam, direkler, kapı
  A.glass = function (ctx, S) {
    var f = S.f, top = A.winTop(f), open = S.winOpen;
    var gt = top + (-140 - top) * open * 0.82;
    ctx.save();
    windowPath(ctx, f); ctx.clip();
    ctx.fillStyle = S.night ? 'rgba(120,140,220,0.16)' : 'rgba(200,235,255,0.22)';
    ctx.fillRect(-370, gt, 720, -140 - gt);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (var x = -340; x < 300; x += 130) {
      ctx.beginPath(); ctx.moveTo(x, -140); ctx.lineTo(x + 28, -140); ctx.lineTo(x + 70, gt); ctx.lineTo(x + 42, gt); ctx.closePath(); ctx.fill();
    }
    if (open > 0.02) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-370, gt - 2, 720, 4); }
    ctx.restore();
    // çerçeve ve direkler
    ctx.strokeStyle = '#3b2a00'; ctx.lineWidth = 5;
    windowPath(ctx, f); ctx.stroke();
    ctx.fillStyle = '#ffcc00';
    [-312, -165, -20, 222].forEach(function (px) { ctx.fillRect(px - 5, top, 10, -140 - top); });
    ctx.strokeStyle = '#3b2a00'; ctx.lineWidth = 2.5;
    [-312, -165, -20, 222].forEach(function (px) { ctx.strokeRect(px - 5, top, 10, -140 - top); });
  };
  A.door = function (ctx, S) {
    var off = -98 * S.doorOpen - (S.doorAjar || 0) * 22;
    var x0 = 118, x1 = 215, f = S.f;
    var top = A.winTop(f) - 6;
    if (S.doorOpen > 0.02 || S.doorAjar > 0.02) {
      // kapı boşluğu
      var gx0 = x1 + off;
      ctx.fillStyle = '#1a1c26';
      ctx.fillRect(gx0, -140, x1 - gx0, 132);
      ctx.fillStyle = '#555'; ctx.fillRect(gx0, -22, x1 - gx0, 10);
      ctx.fillStyle = '#ffd400'; ctx.fillRect(gx0, -22, x1 - gx0, 3);
    }
    ctx.save(); ctx.translate(off, 0);
    ctx.fillStyle = '#ffc800';
    ctx.fillRect(x0, -140, x1 - x0, 132);
    ctx.strokeStyle = '#3b2a00'; ctx.lineWidth = 4;
    ctx.strokeRect(x0, top, x1 - x0, -8 - top);
    ctx.beginPath(); ctx.moveTo(x0, -140); ctx.lineTo(x1, -140); ctx.stroke();
    ctx.save(); ctx.translate(x0 - 2, -126); ctx.fillStyle = checkerPat(ctx); ctx.fillRect(0, 0, x1 - x0 + 4, 14); ctx.restore();
    ctx.fillStyle = '#222'; rr(ctx, x0 + 10, -100, 18, 8, 3); ctx.fill();
    ctx.restore();
  };

  A.wheels = function (ctx, S) {
    var f = S.f;
    for (var i = 0; i < 2; i++) {
      var wx = A.BUS.wheels[i], r = 50;
      ctx.save(); ctx.translate(wx, 0);
      ctx.fillStyle = '#16161a';
      ctx.beginPath(); ctx.ellipse(0, 4 * f, r + 3 * f, r - 5 * f, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2e2e36'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r - 8, 0, TAU); ctx.stroke();
      ctx.rotate(S.wheelRot);
      if (S.jant) {
        var g = ctx.createRadialGradient(-6, -6, 2, 0, 0, 28);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#d9e2ec'); g.addColorStop(1, '#8a9bb0');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#5b6b80'; ctx.lineWidth = 4;
        for (var k = 0; k < 5; k++) { var a = k * TAU / 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 28, Math.sin(a) * 28); ctx.stroke(); }
        ctx.fillStyle = '#ffd400'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = '#b8c0cc'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.fill();
        ctx.fillStyle = '#7c8696';
        for (var j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(Math.cos(j * PI / 2) * 13, Math.sin(j * PI / 2) * 13, 4, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#4a5260'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  };

  // Çatıdaki DOLMUŞ tabelası + ön camdaki rota levhası
  A.roofSign = function (ctx, S) {
    var x = 205, y = A.roofY(x, S.f);
    ctx.fillStyle = '#222'; ctx.fillRect(x - 50, y - 8, 6, 9); ctx.fillRect(x + 44, y - 8, 6, 9);
    rr(ctx, x - 70, y - 44, 140, 38, 8);
    ctx.fillStyle = S.night ? '#fff6c8' : '#fffdf0'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#222'; ctx.stroke();
    ctx.fillStyle = '#c62828'; ctx.font = '900 27px ' + ui.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DOLMUŞ', x, y - 24);
    if (S.night) { ctx.fillStyle = 'rgba(255,240,150,0.25)'; rr(ctx, x - 80, y - 54, 160, 58, 14); ctx.fill(); }
  };

  // ---------------------------------------------------------------------------
  // Süsler (30+ jeton hediyeleri). pop(id) = 0..1 belirme ölçeği
  // ---------------------------------------------------------------------------
  A.decor = function (ctx, S, has, pop) {
    var t = S.t, f = S.f, top = A.winTop(f);
    function sc(id, x, y) { var p = pop(id); ctx.translate(x, y); ctx.scale(p, p); }
    if (has.led) {
      ctx.save();
      for (var i = -360; i <= 360; i += 22) {
        ctx.fillStyle = 'hsl(' + ((i * 2 + t * 260) % 360 + 360) % 360 + ',100%,62%)';
        ctx.beginPath(); ctx.arc(i, -10, 5 * pop('led'), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    if (has.cicek) {
      [[-310, -66], [10, -82], [-170, -48]].forEach(function (p, k) {
        ctx.save(); sc('cicek', p[0], p[1]); ctx.rotate(t * 0.5 + k);
        ctx.fillStyle = k === 1 ? '#ff8fab' : '#ffffff';
        for (var q = 0; q < 6; q++) { ctx.beginPath(); ctx.ellipse(Math.cos(q * PI / 3) * 11, Math.sin(q * PI / 3) * 11, 8, 5, q * PI / 3, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#ffd400'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
        ctx.restore();
      });
    }
    if (has.kalp) {
      [[-240, -96], [70, -50], [300, -110]].forEach(function (p, k) {
        ctx.save(); sc('kalp', p[0], p[1]); ctx.scale(1 + Math.sin(t * 6 + k) * 0.08, 1 + Math.sin(t * 6 + k) * 0.08);
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-18, -4, -10, -18, 0, -8); ctx.bezierCurveTo(10, -18, 18, -4, 0, 8); ctx.fill();
        ctx.restore();
      });
    }
    if (has.masallah) {
      ctx.save(); sc('masallah', 296, -112);
      ctx.font = 'italic 900 22px ' + ui.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeText('Maşallah', 0, 0);
      ctx.fillStyle = '#c1121f'; ctx.fillText('Maşallah', 0, 0);
      ctx.restore();
    }
    if (has.nazar) {
      ctx.save(); sc('nazar', 370 + 12 * f, -128);
      nazar(ctx, 0, 0, 17);
      ctx.restore();
      ctx.save(); sc('nazar', -338, top + 4);
      var sw = Math.sin(t * 4) * 0.25 + S.lurch * 0.01;
      ctx.rotate(sw); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.stroke();
      nazar(ctx, 0, 30, 9);
      ctx.restore();
    }
    if (has.spoiler) {
      ctx.save(); sc('spoiler', -330, A.roofY(-330, f));
      ctx.fillStyle = '#222'; ctx.fillRect(-26, -24, 6, 24); ctx.fillRect(18, -24, 6, 24);
      ctx.fillStyle = '#111'; rr(ctx, -60, -36, 110, 14, 6); ctx.fill();
      ctx.fillStyle = '#e63946'; ctx.fillRect(-60, -36, 110, 4);
      ctx.restore();
    }
    if (has.boynuz) {
      ctx.save(); sc('boynuz', 300, -262);
      ctx.fillStyle = '#fff3d6'; ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(30, -10, 52, -46); ctx.quadraticCurveTo(36, -14, 6, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-40, -8, -60, -40); ctx.quadraticCurveTo(-40, -16, 2, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.arc(0, 2, 8, 0, TAU); ctx.fill();
      ctx.restore();
    }
  };
  // Cam içinde sallanan süsler (klip içinde çizilir)
  A.decorInside = function (ctx, S, has, pop) {
    var t = S.t, f = S.f, top = A.winTop(f);
    var swing = Math.sin(t * 5) * 0.2 - S.lurch * 0.012;
    if (has.puskul) {
      var cols = ['#e63946', '#ffd400', '#2a9d8f', '#ff7eb6'];
      var p = pop('puskul');
      for (var x = -356, i = 0; x < 300; x += 17, i++) {
        var sw = Math.sin(t * 6 + i * 0.7) * 3 - S.lurch * 0.15;
        var len = (12 + (i % 2) * 6) * p;
        ctx.strokeStyle = cols[i % 4]; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, top + 2); ctx.lineTo(x + sw, top + 2 + len); ctx.stroke();
        ctx.fillStyle = cols[(i + 1) % 4]; ctx.beginPath(); ctx.arc(x + sw, top + 4 + len, 4 * p, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#c1121f'; ctx.fillRect(-362, top, 600 * p, 5);
    }
    if (has.zar) {
      ctx.save(); ctx.translate(318, top + 6); ctx.rotate(swing); ctx.scale(pop('zar'), pop('zar'));
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, 34); ctx.moveTo(0, 0); ctx.lineTo(8, 30); ctx.stroke();
      die(ctx, -8, 42, 0.3); die(ctx, 10, 38, -0.4);
      ctx.restore();
    }
    if (has.nazar) {
      ctx.save(); ctx.translate(300, top + 4); ctx.rotate(-swing * 0.8);
      ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.stroke();
      nazar(ctx, 0, 38, 8 * pop('nazar'));
      ctx.restore();
    }
  };
  function nazar(ctx, x, y, r) {
    ctx.fillStyle = '#0d47a1'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.68, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, TAU); ctx.fill();
  }
  A.nazar = nazar;
  function die(ctx, x, y, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#ff7eb6'; rr(ctx, -9, -9, 18, 18, 4); ctx.fill();
    ctx.fillStyle = '#fff';
    [[-4, -4], [4, 4], [0, 0]].forEach(function (d) { ctx.beginPath(); ctx.arc(d[0], d[1], 2, 0, TAU); ctx.fill(); });
    ctx.restore();
  }

  // Kanatlar (5.000+ jeton: uçan dolmuş)
  A.wing = function (ctx, x, y, t, back, s) {
    var flap = Math.sin(t * 10) * 0.4;
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1); ctx.rotate(-1.15 + flap);
    var feathers = 6;
    for (var i = feathers - 1; i >= 0; i--) {
      var len = 96 + i * 22, a = -PI / 2 - 0.1 - i * 0.17;
      ctx.save(); ctx.rotate(a + PI / 2);
      ctx.fillStyle = back ? '#d7e6f5' : (i % 2 ? '#ffffff' : '#f3f8ff');
      ctx.beginPath(); ctx.ellipse(0, -len / 2, 24, len / 2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = back ? '#a9bcd0' : '#b9d4ee'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = back ? '#d7e6f5' : '#fff';
    ctx.beginPath(); ctx.ellipse(0, 0, 42, 26, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };

  // Alev
  A.flame = function (ctx, x, y, len, ang, t, w) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    w = w || 1;
    var fl = len * (0.85 + Math.sin(t * 40) * 0.1 + Math.random() * 0.12);
    ctx.fillStyle = '#ff5400'; ctx.beginPath(); ctx.moveTo(0, -18 * w); ctx.quadraticCurveTo(fl * 0.6, -14 * w, fl, 0); ctx.quadraticCurveTo(fl * 0.6, 14 * w, 0, 18 * w); ctx.fill();
    ctx.fillStyle = '#ffbd00'; ctx.beginPath(); ctx.moveTo(0, -11 * w); ctx.quadraticCurveTo(fl * 0.45, -8 * w, fl * 0.7, 0); ctx.quadraticCurveTo(fl * 0.45, 8 * w, 0, 11 * w); ctx.fill();
    ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.moveTo(0, -5 * w); ctx.quadraticCurveTo(fl * 0.25, -3 * w, fl * 0.38, 0); ctx.quadraticCurveTo(fl * 0.25, 3 * w, 0, 5 * w); ctx.fill();
    ctx.restore();
  };
  // Roket gövdesi (dolmuşun altına bağlı)
  A.rocket = function (ctx, t) {
    ctx.save();
    ctx.fillStyle = '#f1f1f1'; rr(ctx, -330, 6, 620, 46, 22); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#e63946';
    ctx.beginPath(); ctx.moveTo(290, 6); ctx.quadraticCurveTo(360, 12, 380, 29); ctx.quadraticCurveTo(360, 46, 290, 52); ctx.closePath(); ctx.fill();
    ctx.fillRect(-120, 6, 24, 46); ctx.fillRect(60, 6, 24, 46);
    ctx.beginPath(); ctx.moveTo(-330, 10); ctx.lineTo(-380, -20); ctx.lineTo(-360, 20); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-330, 48); ctx.lineTo(-380, 78); ctx.lineTo(-350, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#333'; ctx.fillRect(-346, 14, 18, 30);
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Konuşma balonu (dünya koordinatı). b: {text, name, color, w}
  // ---------------------------------------------------------------------------
  A.measureBubble = function (ctx, b) {
    ctx.save();
    ctx.font = '800 30px ' + ui.FONT;
    var tw = ctx.measureText(b.text).width;
    var nw = 0;
    if (b.name) { ctx.font = '800 22px ' + ui.FONT; nw = ctx.measureText(b.name).width; }
    ctx.restore();
    b.w = Math.min(440, Math.max(tw, nw) + 36);
    b.h = b.name ? 82 : 56;
  };
  A.bubble = function (ctx, b, ax, ay, alpha, scale, tailDir, byOverride, bxOverride) {
    var w = b.w, h = b.h;
    var bx = bxOverride != null ? bxOverride : LG.clamp(ax - w / 2, 48, LG.W - 48 - w);
    var by = byOverride != null ? byOverride : ay - h - 18;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ax, ay); ctx.scale(scale, scale); ctx.translate(-ax, -ay);
    var bg = b.bg || '#ffffff';
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, bx + 3, by + 5, w, h, 18); ctx.fill();
    ctx.fillStyle = bg; rr(ctx, bx, by, w, h, 18); ctx.fill();
    var tx = LG.clamp(ax, bx + 20, bx + w - 20);
    ctx.beginPath(); ctx.moveTo(tx - 10, by + h - 1); ctx.lineTo(tx + 10, by + h - 1); ctx.lineTo(ax + (tailDir || 0), ay - 2); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = b.border || '#222';
    rr(ctx, bx, by, w, h, 18); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (b.name) {
      ctx.font = '800 22px ' + ui.FONT; ctx.fillStyle = b.color || '#555';
      ctx.fillText(b.name, bx + w / 2, by + 20, w - 24);
      ctx.font = '800 30px ' + ui.FONT; ctx.fillStyle = b.ink || '#1d1d2b';
      ctx.fillText(b.text, bx + w / 2, by + 54, w - 24);
    } else {
      ctx.font = '800 30px ' + ui.FONT; ctx.fillStyle = b.ink || '#1d1d2b';
      ctx.fillText(b.text, bx + w / 2, by + h / 2 + 1, w - 24);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // HUD parçaları
  // ---------------------------------------------------------------------------
  A.speedo = function (ctx, x, y, r, kmh, maxK, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(15,15,30,0.85)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#ffd400'; ctx.stroke();
    var a0 = PI * 0.75, a1 = PI * 2.25;
    var segs = [[0, 0.5, '#06d6a0'], [0.5, 0.75, '#ffd166'], [0.75, 1, '#ff4d6d']];
    ctx.lineWidth = r * 0.14;
    segs.forEach(function (s) { ctx.strokeStyle = s[2]; ctx.beginPath(); ctx.arc(x, y, r * 0.8, a0 + (a1 - a0) * s[0], a0 + (a1 - a0) * s[1]); ctx.stroke(); });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    for (var i = 0; i <= 6; i++) {
      var a = a0 + (a1 - a0) * i / 6;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62); ctx.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7); ctx.stroke();
    }
    var fr = LG.clamp(kmh / maxK, 0, 1.05);
    var jit = fr > 0.8 ? Math.sin(t * 50) * 0.03 : 0;
    var na = a0 + (a1 - a0) * fr + jit;
    ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(na) * r * 0.72, y + Math.sin(na) * r * 0.72); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
    ctx.restore();
    ui.text(ctx, String(Math.round(kmh)), x, y + r * 0.42, { size: r * 0.42, color: '#fff', strokeWidth: 4 });
    ui.text(ctx, 'km/sa', x, y + r * 0.74, { size: r * 0.2, color: '#ffd166', strokeWidth: 3 });
  };

  A.plate = function (ctx, cx, cy, w, h, text, flip) {
    ctx.save();
    ctx.translate(cx, cy);
    var sy = flip != null ? Math.max(0.02, Math.abs(Math.cos(flip * PI))) : 1;
    ctx.scale(1, sy);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, -w / 2 + 4, -h / 2 + 6, w, h, 14); ctx.fill();
    ctx.fillStyle = '#fdfdf6'; rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#1b1b2f'; ctx.stroke();
    ctx.fillStyle = '#c62828'; ctx.fillRect(-w / 2 + 8, h / 2 - 12, w - 16, 5);
    ctx.fillStyle = '#9aa0a6';
    ctx.beginPath(); ctx.arc(-w / 2 + 18, 0, 6, 0, TAU); ctx.arc(w / 2 - 18, 0, 6, 0, TAU); ctx.fill();
    ctx.font = '900 44px ' + ui.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var mw = w - 80, tw = ctx.measureText(text).width;
    if (tw > mw) ctx.font = '900 ' + Math.floor(44 * mw / tw) + 'px ' + ui.FONT;
    ctx.fillStyle = '#1b1b2f'; ctx.fillText(text, 0, -2);
    ctx.restore();
  };

  // Dama desenli şerit (taksi/dolmuş havası)
  A.checker = function (ctx, x, y, w, h) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(h / 14, h / 14);
    ctx.fillStyle = checkerPat(ctx); ctx.fillRect(0, 0, w * 14 / h, 14);
    ctx.restore();
  };
})();
