/*
 * ANNE TERLİĞİ — çizimler (tamamen kodla; dış görsel, font veya ses dosyası yok).
 * window.ATArt: anne, çocuk, terlik, ikramlar, kedi, vazo, konuşma balonu, sabit arka plan.
 */
(function () {
  'use strict';
  var ui = LG.ui;
  var A = (window.ATArt = {});
  var TAU = Math.PI * 2;

  function rr(ctx, x, y, w, h, r) { ui.roundRect(ctx, x, y, w, h, r); }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); }
  A.rr = rr;

  // ---------------------------------------------------------------------------
  // Sahne geometrisi (oyun ve çizim ortak kullanır)
  // ---------------------------------------------------------------------------
  var GEO = (A.GEO = {
    KF: 742,                         // mutfak zemini (annenin ayak hizası)
    FT: { y: 742, l: 330, r: 750 },  // koridor zemini üst kenarı
    FB: { y: 1200, l: 62, r: 1018 }, // koridor zemini alt kenarı
    MOM_X: 540,
    FRIDGE: { x: 838, y: 452, w: 182, h: 290 },
    BOARD: { x: 44, y: 452, w: 276, h: 196 },
    TABLE: { x: 44, y: 676, w: 290 },
  });
  // Zeminin y'deki sol/sağ kenarı (perspektif doğrusu, ekran dışına taşabilir)
  A.floorEdge = function (y) {
    var u = (y - GEO.FT.y) / (GEO.FB.y - GEO.FT.y);
    return { l: LG.lerp(GEO.FT.l, GEO.FB.l, u), r: LG.lerp(GEO.FT.r, GEO.FB.r, u) };
  };

  // ---------------------------------------------------------------------------
  // TERLİK (mavi plastik ev terliği, sarı bant)
  // ---------------------------------------------------------------------------
  function solePath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    ctx.bezierCurveTo(-50, -16, -34, -18, -10, -17);
    ctx.bezierCurveTo(22, -23, 50, -21, 50, 0);
    ctx.bezierCurveTo(50, 21, 22, 23, -10, 17);
    ctx.bezierCurveTo(-34, 18, -50, 16, -50, 0);
    ctx.closePath();
  }
  A.slipper = function (ctx, x, y, len, rot, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    var s = len / 100;
    ctx.scale(s, s);
    ctx.fillStyle = o.sole || '#0a2a66';
    solePath(ctx); ctx.fill();
    ctx.save(); ctx.scale(0.88, 0.78);
    ctx.fillStyle = o.bed || '#3b8cff';
    solePath(ctx); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ell(ctx, -22, -6, 18, 4); ctx.fill();
    // bant
    ctx.fillStyle = o.strap || '#ffd23f';
    rr(ctx, 4, -25, 28, 50, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(8, -21, 5, 42);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    rr(ctx, 4, -25, 28, 50, 10); ctx.stroke();
    ctx.restore();
  };
  var slipCache = {};
  A.slipperSprite = function (len) {
    var c = slipCache[len];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = Math.ceil(len * 1.08); c.height = Math.ceil(len * 0.56);
    A.slipper(c.getContext('2d'), c.width / 2, c.height / 2, len, 0);
    slipCache[len] = c;
    return c;
  };
  A.drawSprite = function (ctx, spr, x, y, rot, scale, alpha) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    if (scale && scale !== 1) ctx.scale(scale, scale);
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // İKRAMLAR (tur hedefleri) — sz ≈ çap
  // ---------------------------------------------------------------------------
  function tray(ctx, sz) {
    var g = ctx.createLinearGradient(0, -sz * 0.2, 0, sz * 0.3);
    g.addColorStop(0, '#f1f3f5'); g.addColorStop(1, '#9aa5b1');
    ctx.fillStyle = g;
    ell(ctx, 0, sz * 0.18, sz * 0.5, sz * 0.2); ctx.fill();
    ctx.strokeStyle = '#6c7a89'; ctx.lineWidth = Math.max(1, sz * 0.025); ctx.stroke();
  }
  function diamond(ctx, x, y, w, h) {
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y); ctx.lineTo(x, y + h); ctx.lineTo(x - w, y); ctx.closePath();
  }
  A.treat = function (ctx, id, x, y, sz) {
    ctx.save();
    ctx.translate(x, y);
    var i, px, py;
    if (id === 'baklava') {
      tray(ctx, sz);
      var pos = [[-0.22, 0.08], [0.0, 0.08], [0.22, 0.08], [-0.11, -0.06], [0.11, -0.06]];
      for (i = 0; i < pos.length; i++) {
        px = pos[i][0] * sz; py = pos[i][1] * sz;
        var w = sz * 0.13, h = sz * 0.09;
        ctx.fillStyle = '#b7651b'; diamond(ctx, px, py + sz * 0.03, w, h); ctx.fill();
        ctx.fillStyle = '#f4b942'; diamond(ctx, px, py, w, h); ctx.fill();
        ctx.strokeStyle = 'rgba(140,70,10,0.55)'; ctx.lineWidth = Math.max(1, sz * 0.012);
        ctx.beginPath(); ctx.moveTo(px - w * 0.5, py - h * 0.5); ctx.lineTo(px + w * 0.5, py + h * 0.5); ctx.stroke();
        ctx.fillStyle = '#5cb85c'; circle(ctx, px, py - h * 0.1, sz * 0.03); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(ctx, px - w * 0.3, py - h * 0.3, sz * 0.012); ctx.fill();
      }
    } else if (id === 'sarma') {
      tray(ctx, sz);
      for (i = 0; i < 6; i++) {
        px = (-0.25 + (i % 3) * 0.2 + (i > 2 ? 0.1 : 0)) * sz; py = (i > 2 ? -0.03 : 0.1) * sz;
        ctx.fillStyle = '#2d6a4f'; rr(ctx, px - sz * 0.09, py - sz * 0.045, sz * 0.18, sz * 0.09, sz * 0.045); ctx.fill();
        ctx.strokeStyle = '#95d5b2'; ctx.lineWidth = Math.max(1, sz * 0.012);
        ctx.beginPath(); ctx.moveTo(px - sz * 0.04, py - sz * 0.04); ctx.lineTo(px - sz * 0.02, py + sz * 0.04); ctx.moveTo(px + sz * 0.03, py - sz * 0.04); ctx.lineTo(px + sz * 0.05, py + sz * 0.04); ctx.stroke();
      }
      ctx.fillStyle = '#ffe066'; circle(ctx, sz * 0.3, -sz * 0.08, sz * 0.08); ctx.fill();
      ctx.strokeStyle = '#fab005'; ctx.lineWidth = Math.max(1, sz * 0.012);
      for (i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(sz * 0.3, -sz * 0.08); ctx.lineTo(sz * 0.3 + Math.cos(i) * sz * 0.07, -sz * 0.08 + Math.sin(i) * sz * 0.07); ctx.stroke(); }
    } else if (id === 'lokum') {
      tray(ctx, sz);
      var cols = ['#ff8fab', '#ffffff', '#ffb3c6', '#f7d6e0', '#ff8fab'];
      for (i = 0; i < 5; i++) {
        px = (-0.24 + (i % 3) * 0.24 + (i > 2 ? 0.12 : 0)) * sz; py = (i > 2 ? -0.06 : 0.08) * sz;
        var cs = sz * 0.15;
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; rr(ctx, px - cs / 2, py - cs / 2 + sz * 0.02, cs, cs, cs * 0.2); ctx.fill();
        ctx.fillStyle = cols[i]; rr(ctx, px - cs / 2, py - cs / 2, cs, cs, cs * 0.2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (var d = 0; d < 4; d++) { circle(ctx, px - cs * 0.3 + d * cs * 0.2, py - cs * 0.25 + (d % 2) * cs * 0.3, sz * 0.012); ctx.fill(); }
      }
    } else if (id === 'dondurma') {
      // Maraş dondurması: külah + 3 top
      ctx.fillStyle = '#d4a373';
      ctx.beginPath(); ctx.moveTo(-sz * 0.18, -sz * 0.02); ctx.lineTo(sz * 0.18, -sz * 0.02); ctx.lineTo(0, sz * 0.45); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#a0703c'; ctx.lineWidth = Math.max(1, sz * 0.015);
      ctx.beginPath(); ctx.moveTo(-sz * 0.1, 0); ctx.lineTo(sz * 0.06, sz * 0.3); ctx.moveTo(sz * 0.1, 0); ctx.lineTo(-sz * 0.06, sz * 0.3); ctx.stroke();
      ctx.fillStyle = '#7f4f24'; circle(ctx, -sz * 0.1, -sz * 0.08, sz * 0.13); ctx.fill();
      ctx.fillStyle = '#ffafcc'; circle(ctx, sz * 0.1, -sz * 0.08, sz * 0.13); ctx.fill();
      ctx.fillStyle = '#fffaf0'; circle(ctx, 0, -sz * 0.24, sz * 0.14); ctx.fill();
      ctx.fillStyle = '#5cb85c'; circle(ctx, 0, -sz * 0.36, sz * 0.035); ctx.fill();
    } else { // kuru köfte
      tray(ctx, sz);
      for (i = 0; i < 5; i++) {
        px = (-0.24 + (i % 3) * 0.24 + (i > 2 ? 0.12 : 0)) * sz; py = (i > 2 ? -0.05 : 0.09) * sz;
        ctx.fillStyle = '#5a3418'; ell(ctx, px, py + sz * 0.015, sz * 0.11, sz * 0.065); ctx.fill();
        ctx.fillStyle = '#8b5a2b'; ell(ctx, px, py, sz * 0.11, sz * 0.06); ctx.fill();
        ctx.strokeStyle = '#3b1f0e'; ctx.lineWidth = Math.max(1, sz * 0.012);
        ctx.beginPath(); ctx.moveTo(px - sz * 0.05, py - sz * 0.02); ctx.lineTo(px + sz * 0.05, py - sz * 0.02); ctx.moveTo(px - sz * 0.05, py + sz * 0.015); ctx.lineTo(px + sz * 0.05, py + sz * 0.015); ctx.stroke();
      }
      ctx.fillStyle = '#e63946'; circle(ctx, sz * 0.32, -sz * 0.1, sz * 0.07); ctx.fill();
      ctx.fillStyle = '#52b788'; ell(ctx, -sz * 0.32, -sz * 0.1, sz * 0.08, sz * 0.04, -0.5); ctx.fill();
    }
    ctx.restore();
  };
  var treatCache = {};
  A.treatSprite = function (id, sz) {
    var key = id + sz;
    var c = treatCache[key];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = Math.ceil(sz * 1.1); c.height = Math.ceil(sz * 1.1);
    A.treat(c.getContext('2d'), id, c.width / 2, c.height / 2, sz);
    treatCache[key] = c;
    return c;
  };

  // ---------------------------------------------------------------------------
  // ANNE (sevimli ama sert): topuz saç, hırka, önlük, terlik
  //   m = { view:'away'|'front', flip, armPh, tilt, throwT, walkPh, walking, prop, scan, still }
  // ---------------------------------------------------------------------------
  var SKIN = '#f3c6a0', SKIN_D = '#d9a07a', HAIR = '#3a2318', HAIR_L = '#5c3a26';
  var CARD = '#8e44ad', CARD_D = '#6c3483', DRESS = '#1f6f8b', APRON = '#fff4e0', TRIM = '#e63946';
  function momLegs(ctx, m) {
    var w = m.walking ? Math.sin(m.walkPh) * 7 : 0;
    ctx.fillStyle = SKIN_D;
    ctx.fillRect(-30, -48 - Math.max(0, w), 19, 44);
    ctx.fillRect(11, -48 - Math.max(0, -w), 19, 44);
    // terlikler (ayakta)
    ctx.fillStyle = '#0a2a66';
    ell(ctx, -21, -3 - Math.max(0, w), 21, 8); ctx.fill();
    ell(ctx, 21, -3 - Math.max(0, -w), 21, 8); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-33, -10 - Math.max(0, w), 24, 6);
    ctx.fillRect(9, -10 - Math.max(0, -w), 24, 6);
  }
  function momSkirt(ctx) {
    ctx.fillStyle = DRESS;
    ctx.beginPath(); ctx.moveTo(-56, -140); ctx.lineTo(56, -140); ctx.lineTo(74, -40); ctx.quadraticCurveTo(0, -30, -74, -40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    var dots = [[-40, -110], [-10, -90], [24, -116], [44, -76], [-50, -60], [10, -55], [-24, -128], [36, -50]];
    for (var i = 0; i < dots.length; i++) { circle(ctx, dots[i][0], dots[i][1], 4); ctx.fill(); }
  }
  function momHeadBack(ctx, m) {
    ctx.save();
    ctx.translate(0, -236);
    ctx.rotate(m.tilt || 0);
    ctx.fillStyle = SKIN;
    circle(ctx, -41, 4, 9); ctx.fill(); circle(ctx, 41, 4, 9); ctx.fill();
    ctx.fillStyle = HAIR;
    circle(ctx, 0, -6, 43); ctx.fill();
    ctx.strokeStyle = HAIR_L; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-20, -40); ctx.quadraticCurveTo(-6, -6, -14, 30); ctx.moveTo(14, -42); ctx.quadraticCurveTo(26, -4, 16, 30); ctx.stroke();
    // topuz + toka
    ctx.fillStyle = HAIR; circle(ctx, 0, -56, 24); ctx.fill();
    ctx.strokeStyle = HAIR_L; ctx.beginPath(); ctx.arc(0, -56, 14, 0.4, 2.6); ctx.stroke();
    ctx.fillStyle = TRIM; rr(ctx, -20, -40, 40, 10, 5); ctx.fill();
    ctx.restore();
  }
  function momBack(ctx, m, t) {
    momLegs(ctx, m);
    momSkirt(ctx);
    // hırka gövde
    ctx.fillStyle = CARD; rr(ctx, -58, -214, 116, 94, 34); ctx.fill();
    ctx.fillStyle = CARD_D; ctx.fillRect(-3, -200, 6, 76);
    // kollar: dirsekler bulaşık yıkarken oynar
    var a1 = m.still ? 0 : Math.sin(m.armPh) * 9, a2 = m.still ? 0 : Math.sin(m.armPh + Math.PI) * 9;
    ctx.strokeStyle = CARD; ctx.lineCap = 'round'; ctx.lineWidth = 24;
    if (m.prop === 'phone') {
      ctx.beginPath(); ctx.moveTo(-50, -196); ctx.lineTo(-72, -150); ctx.lineTo(-52, -136); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(50, -196); ctx.lineTo(70, -228); ctx.lineTo(48, -252); ctx.stroke();
      ctx.fillStyle = '#111'; rr(ctx, 36, -282, 16, 34, 4); ctx.fill();
      ctx.fillStyle = '#4cc9f0'; rr(ctx, 39, -278, 10, 26, 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(-50, -196); ctx.lineTo(-74, -150 + a1); ctx.lineTo(-46, -132 + a1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(50, -196); ctx.lineTo(74, -150 + a2); ctx.lineTo(46, -132 + a2); ctx.stroke();
    }
    // önlük bağcığı + fiyonk
    ctx.fillStyle = APRON;
    ctx.fillRect(-58, -134, 116, 8);
    ell(ctx, -15, -130, 15, 9, 0.3); ctx.fill();
    ell(ctx, 15, -130, 15, 9, -0.3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, -128); ctx.lineTo(-16, -96); ctx.lineTo(-6, -98); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5, -128); ctx.lineTo(16, -96); ctx.lineTo(6, -98); ctx.closePath(); ctx.fill();
    ctx.fillStyle = TRIM; circle(ctx, 0, -130, 6); ctx.fill();
    // belde "kılıf" gibi sıkıştırılmış yedek terlik
    A.slipper(ctx, 40, -112, 50, -1.25);
    // boyun + baş (arkadan)
    ctx.fillStyle = SKIN_D; ctx.fillRect(-13, -216, 26, 12);
    momHeadBack(ctx, m);
  }
  function momFront(ctx, m, t) {
    momLegs(ctx, m);
    momSkirt(ctx);
    ctx.fillStyle = CARD; rr(ctx, -58, -214, 116, 94, 34); ctx.fill();
    // önlük
    ctx.fillStyle = APRON;
    rr(ctx, -34, -206, 68, 80, 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-50, -132); ctx.lineTo(50, -132); ctx.lineTo(58, -50); ctx.lineTo(-58, -50); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = TRIM; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-58, -52); ctx.lineTo(58, -52); ctx.stroke();
    ctx.fillStyle = TRIM;
    for (var i = -5; i <= 5; i++) { circle(ctx, i * 11, -50, 4); ctx.fill(); }
    ctx.strokeStyle = TRIM; ctx.lineWidth = 3; rr(ctx, -22, -112, 44, 32, 6); ctx.stroke();
    // cepte kalp
    ctx.fillStyle = TRIM; ctx.beginPath(); ctx.moveTo(0, -88); ctx.bezierCurveTo(-12, -98, -6, -108, 0, -101); ctx.bezierCurveTo(6, -108, 12, -98, 0, -88); ctx.fill();
    // sol el belde
    ctx.strokeStyle = CARD; ctx.lineCap = 'round'; ctx.lineWidth = 24;
    ctx.beginPath(); ctx.moveTo(-50, -196); ctx.lineTo(-86, -160); ctx.lineTo(-56, -132); ctx.stroke();
    ctx.fillStyle = SKIN; circle(ctx, -54, -132, 11); ctx.fill();
    // sağ kol: terlik havada (fırlatırken öne savrulur)
    var th = m.throwT > 0 ? Math.sin(Math.min(1, m.throwT / 0.3) * Math.PI) : 0;
    var wig = Math.sin(t * 16) * 3;
    var ex = LG.lerp(94, 70, th), ey = LG.lerp(-222, -190, th);
    var hx = LG.lerp(84, 58, th) + wig, hy = LG.lerp(-272, -168, th);
    ctx.strokeStyle = CARD; ctx.lineWidth = 24;
    ctx.beginPath(); ctx.moveTo(50, -196); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    if (th < 0.5) A.slipper(ctx, hx + 6, hy - 26, 66, -1.35 + wig * 0.04 + th * 1.5);
    ctx.fillStyle = SKIN; circle(ctx, hx, hy, 12); ctx.fill();
    // baş (önden)
    ctx.fillStyle = SKIN_D; ctx.fillRect(-13, -216, 26, 12);
    ctx.save();
    ctx.translate(0, -236);
    ctx.fillStyle = SKIN; circle(ctx, -41, 4, 9); ctx.fill(); circle(ctx, 41, 4, 9); ctx.fill();
    circle(ctx, 0, 0, 40); ctx.fill();
    ctx.fillStyle = HAIR;
    ctx.beginPath(); ctx.arc(0, -4, 43, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(20, -26, 0, -30); ctx.quadraticCurveTo(-20, -26, -42, -10); ctx.fill();
    circle(ctx, 0, -56, 24); ctx.fill();
    ctx.fillStyle = TRIM; rr(ctx, -20, -40, 40, 10, 5); ctx.fill();
    // kaşlar (kızgın)
    ctx.strokeStyle = HAIR; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-28, -18); ctx.lineTo(-8, -10); ctx.moveTo(28, -18); ctx.lineTo(8, -10); ctx.stroke();
    // gözler (tarar)
    var sc = m.scan || 0;
    ctx.fillStyle = '#fff'; ell(ctx, -16, 0, 10, 11); ctx.fill(); ell(ctx, 16, 0, 10, 11); ctx.fill();
    ctx.fillStyle = '#222'; circle(ctx, -16 + sc * 5, 1, 5); ctx.fill(); circle(ctx, 16 + sc * 5, 1, 5); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ctx, -14 + sc * 5, -1, 1.6); ctx.fill(); circle(ctx, 18 + sc * 5, -1, 1.6); ctx.fill();
    // ağız: sıkılmış dudak
    ctx.strokeStyle = '#8c2f39'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 26, 10, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.fillStyle = 'rgba(255,80,80,0.3)'; circle(ctx, -26, 14, 7); ctx.fill(); circle(ctx, 26, 14, 7); ctx.fill();
    ctx.fillStyle = SKIN_D; ell(ctx, 0, 12, 4, 3); ctx.fill();
    ctx.restore();
  }
  A.mom = function (ctx, m, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ell(ctx, 0, 0, 80, 13); ctx.fill();
    if (m.alpha != null && m.alpha < 1) ctx.globalAlpha *= Math.max(0, m.alpha);
    var bob = m.walking ? Math.abs(Math.sin(m.walkPh)) * 4 : 0;
    ctx.translate(0, -bob);
    ctx.scale(Math.max(0.04, m.flip == null ? 1 : m.flip) * (m.face < 0 ? -1 : 1), 1);
    if (m.view === 'front') momFront(ctx, m, t); else momBack(ctx, m, t);
    ctx.restore();
  };
  // Annenin kaldırdığı terliğin dünya koordinatı (fırlatma başlangıcı)
  A.momHand = function (x, y) { return { x: x + 92, y: y - 300 }; };

  // ---------------------------------------------------------------------------
  // ÇOCUK (pijamalı, kafası profil fotoğrafı/emoji)
  //   P = { bodyY, rot, lift, tx, fl:[x,y], fr:[x,y], hl:[x,y], hr:[x,y], handsFront, hold, pillow }
  // ---------------------------------------------------------------------------
  A.kid = function (ctx, k, x, y, s, P, head) {
    ctx.save();
    ctx.translate(x + (P.tx || 0) * s, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    var shS = P.lift ? Math.max(0.4, 1 - P.lift / 160) : 1;
    ell(ctx, 0, 0, 24 * shS, 6 * shS); ctx.fill();
    if (P.lift) ctx.translate(0, -P.lift);
    if (P.rot) { ctx.translate(0, -50); ctx.rotate(P.rot); ctx.translate(0, 50); }
    if (P.sq) ctx.scale(1 + P.sq, 1 - P.sq);
    var by = P.bodyY || 0;
    ctx.lineCap = 'round';
    // bacaklar (pijama altı)
    ctx.strokeStyle = k.colD; ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-7, -30 + by); ctx.lineTo(P.fl[0], P.fl[1]);
    ctx.moveTo(7, -30 + by); ctx.lineTo(P.fr[0], P.fr[1]);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ell(ctx, P.fl[0], P.fl[1] - 1, 7.5, 4.5); ctx.fill();
    ell(ctx, P.fr[0], P.fr[1] - 1, 7.5, 4.5); ctx.fill();
    // kollar arkada
    if (!P.handsFront) drawArms(ctx, k, P, by);
    // gövde (pijama üstü)
    ctx.fillStyle = k.col;
    rr(ctx, -17, -64 + by, 34, 38, 13); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    if (k.pat === 0) { ctx.fillRect(-15, -55 + by, 30, 4); ctx.fillRect(-16, -45 + by, 32, 4); ctx.fillRect(-15, -35 + by, 30, 4); }
    else if (k.pat === 1) { circle(ctx, -8, -52 + by, 2.6); ctx.fill(); circle(ctx, 7, -46 + by, 2.6); ctx.fill(); circle(ctx, -5, -36 + by, 2.6); ctx.fill(); circle(ctx, 9, -33 + by, 2.6); ctx.fill(); }
    else { ctx.fillStyle = '#ffe66d'; circle(ctx, 0, -46 + by, 7); ctx.fill(); ctx.fillStyle = k.col; circle(ctx, 3, -48 + by, 6); ctx.fill(); }
    // kafa
    var hy = -88 + by;
    if (head) ctx.drawImage(head, -25, hy - 25, 50, 50);
    // gece şapkası
    if (k.cap) {
      ctx.fillStyle = k.capCol;
      ctx.beginPath(); ctx.moveTo(-21, hy - 12); ctx.quadraticCurveTo(-4, hy - 50, 30, hy - 40); ctx.quadraticCurveTo(10, hy - 34, 21, hy - 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; rr(ctx, -23, hy - 17, 46, 9, 4.5); ctx.fill();
      circle(ctx, 31, hy - 40, 6); ctx.fill();
    }
    if (P.handsFront) drawArms(ctx, k, P, by);
    // yastık kalkanı
    if (P.pillow) {
      var py = hy - 34;
      ctx.fillStyle = '#e0d4ff';
      ctx.beginPath(); ctx.moveTo(-28, py - 12); ctx.quadraticCurveTo(0, py - 20, 28, py - 12); ctx.quadraticCurveTo(34, py, 28, py + 12); ctx.quadraticCurveTo(0, py + 18, -28, py + 12); ctx.quadraticCurveTo(-34, py, -28, py - 12); ctx.fill();
      ctx.strokeStyle = '#9b8bd6'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#b8a9f0'; circle(ctx, 0, py, 3.5); ctx.fill();
      if (P.pillow > 1) { ctx.fillStyle = '#5b3cc4'; ctx.font = '900 16px ' + ui.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('x' + P.pillow, 0, py + 1); }
    }
    // elde ikram
    if (P.hold) {
      var spr = A.treatSprite(P.hold, 30);
      ctx.drawImage(spr, P.hr[0] - spr.width / 2, P.hr[1] - spr.height / 2 - 8);
    }
    ctx.restore();
  };
  function drawArms(ctx, k, P, by) {
    ctx.strokeStyle = k.col; ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-14, -58 + by); ctx.lineTo(P.hl[0], P.hl[1]);
    ctx.moveTo(14, -58 + by); ctx.lineTo(P.hr[0], P.hr[1]);
    ctx.stroke();
    ctx.fillStyle = k.skin;
    circle(ctx, P.hl[0], P.hl[1], 5.5); ctx.fill();
    circle(ctx, P.hr[0], P.hr[1], 5.5); ctx.fill();
  }

  // Sersemlik yıldızları
  A.star = function (ctx, x, y, r, rot, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = col || '#ffd23f';
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r;
      if (i) ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); else ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  // Çizgi roman patlaması ("ŞAP!")
  A.comic = function (ctx, x, y, text, sz, col, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.fillStyle = col || '#ffd23f';
    ctx.strokeStyle = '#111'; ctx.lineWidth = sz * 0.06;
    ctx.beginPath();
    for (var i = 0; i < 16; i++) {
      var a = i * Math.PI / 8, rad = (i % 2 ? 0.62 : 1) * sz;
      var px = Math.cos(a) * rad * 1.35, py = Math.sin(a) * rad * 0.9;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.font = '900 ' + Math.round(sz * 0.62) + 'px ' + ui.FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = sz * 0.1; ctx.strokeStyle = '#fff'; ctx.strokeText(text, 0, 2);
    ctx.fillStyle = '#d62828'; ctx.fillText(text, 0, 2);
    ctx.restore();
  };

  // Konuşma balonu (kuyruk tx,ty noktasını gösterir)
  A.bubble = function (ctx, x, y, text, o) {
    o = o || {};
    var size = o.size || 34;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.font = '800 ' + size + 'px ' + ui.FONT;
    var w = Math.min(o.maxW || 420, ctx.measureText(text).width + size * 1.1), h = size * 1.6;
    var bx = o.align === 'left' ? x : o.align === 'right' ? x - w : x - w / 2;
    var by = y - h / 2;
    ctx.fillStyle = o.fill || '#fff';
    ctx.strokeStyle = o.stroke || '#222'; ctx.lineWidth = 4;
    if (o.tx != null) {
      var cx = LG.clamp(o.tx, bx + 24, bx + w - 24);
      ctx.beginPath(); ctx.moveTo(cx - 14, by + h - 2); ctx.lineTo(o.tx, o.ty); ctx.lineTo(cx + 14, by + h - 2); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    rr(ctx, bx, by, w, h, h / 2); ctx.fill(); ctx.stroke();
    if (o.tx != null) {
      var cx2 = LG.clamp(o.tx, bx + 24, bx + w - 24);
      ctx.fillRect(cx2 - 12, by + h - 6, 24, 6);
    }
    ctx.fillStyle = o.color || '#222'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tw = ctx.measureText(text).width;
    if (tw > w - size * 0.6) { ctx.font = '800 ' + Math.floor(size * (w - size * 0.6) / tw) + 'px ' + ui.FONT; }
    ctx.fillText(text, bx + w / 2, by + h / 2 + 2);
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // KEDİ ve VAZO
  // ---------------------------------------------------------------------------
  A.cat = function (ctx, x, y, s, t, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
    ctx.fillStyle = '#f4a259';
    ell(ctx, 0, -16, 26, 15); ctx.fill();
    ctx.strokeStyle = '#f4a259'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-22, -20); ctx.quadraticCurveTo(-44, -30 + Math.sin(t * 6) * 8, -36, -52); ctx.stroke();
    ctx.fillStyle = '#f4a259';
    circle(ctx, 24, -32, 15); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14, -42); ctx.lineTo(16, -58); ctx.lineTo(26, -46); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(28, -46); ctx.lineTo(38, -56); ctx.lineTo(37, -40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c8553d'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-8, -28); ctx.lineTo(-4, -18); ctx.moveTo(4, -30); ctx.lineTo(8, -20); ctx.stroke();
    ctx.fillStyle = '#222'; circle(ctx, 20, -34, 2.6); ctx.fill(); circle(ctx, 30, -34, 2.6); ctx.fill();
    ctx.fillStyle = '#f4a259'; ctx.fillRect(-18, -6, 7, 8); ctx.fillRect(10, -6, 7, 8);
    ctx.restore();
  };
  A.vase = function (ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    ctx.fillStyle = '#1d4e89';
    ctx.beginPath(); ctx.moveTo(-8, -46); ctx.lineTo(8, -46); ctx.quadraticCurveTo(6, -36, 16, -24); ctx.quadraticCurveTo(24, -8, 12, 0); ctx.lineTo(-12, 0); ctx.quadraticCurveTo(-24, -8, -16, -24); ctx.quadraticCurveTo(-6, -36, -8, -46); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-14, -24, 28, 4);
    ctx.fillStyle = '#e63946'; circle(ctx, 0, -14, 4); ctx.fill();
    ctx.fillStyle = '#ff8fab'; circle(ctx, -4, -52, 6); ctx.fill(); circle(ctx, 6, -56, 6); ctx.fill();
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // SABİT ARKA PLAN (bir kez çizilir, her karede tek drawImage)
  // ---------------------------------------------------------------------------
  A.buildBackground = function () {
    var c = document.createElement('canvas');
    c.width = LG.W; c.height = LG.H;
    var x = c.getContext('2d');
    var W = LG.W, H = LG.H, KF = GEO.KF, i, g;

    // Genel gece tonu
    g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#16132e'); g.addColorStop(0.35, '#2a2552'); g.addColorStop(1, '#0d0b1c');
    x.fillStyle = g; x.fillRect(0, 0, W, H);

    // Mutfak duvarı (y 0..KF)
    g = x.createLinearGradient(0, 0, 0, KF);
    g.addColorStop(0, '#1d1a3a'); g.addColorStop(0.55, '#3b3470'); g.addColorStop(1, '#4a3f7a');
    x.fillStyle = g; x.fillRect(0, 0, W, KF);
    x.fillStyle = 'rgba(255,255,255,0.035)';
    for (i = 0; i < W; i += 36) x.fillRect(i, 0, 14, KF);
    // tavan çıtası
    x.fillStyle = '#14112a'; x.fillRect(0, 0, W, 120);
    x.fillStyle = '#5b4a8a'; x.fillRect(0, 118, W, 6);
    // sarkıt lamba
    x.strokeStyle = '#111'; x.lineWidth = 4; x.beginPath(); x.moveTo(540, 0); x.lineTo(540, 150); x.stroke();
    x.fillStyle = '#c0841a'; x.beginPath(); x.moveTo(500, 190); x.lineTo(580, 190); x.lineTo(560, 150); x.lineTo(520, 150); x.closePath(); x.fill();
    var lg = x.createRadialGradient(540, 200, 10, 540, 420, 520);
    lg.addColorStop(0, 'rgba(255,214,140,0.42)'); lg.addColorStop(1, 'rgba(255,214,140,0)');
    x.fillStyle = lg; x.fillRect(0, 120, W, KF);

    // Pencere (lavabonun üstünde), ay ve yıldızlar
    x.fillStyle = '#6b4f2a'; rr(x, 414, 448, 252, 146, 10); x.fill();
    g = x.createLinearGradient(0, 456, 0, 586);
    g.addColorStop(0, '#0b1b3f'); g.addColorStop(1, '#253b80');
    x.fillStyle = g; x.fillRect(424, 458, 232, 126);
    x.fillStyle = '#fff6c9'; circle(x, 612, 492, 20); x.fill();
    x.fillStyle = '#253b80'; circle(x, 622, 486, 17); x.fill();
    x.fillStyle = '#fff';
    var st = [[450, 476], [490, 500], [530, 470], [470, 540], [580, 530], [640, 560], [520, 556]];
    for (i = 0; i < st.length; i++) { circle(x, st[i][0], st[i][1], 2); x.fill(); }
    x.fillStyle = '#6b4f2a'; x.fillRect(536, 458, 8, 126); x.fillRect(424, 517, 232, 6);
    // perde
    x.fillStyle = '#e76f51';
    x.beginPath(); x.moveTo(408, 440); x.lineTo(468, 440); x.quadraticCurveTo(440, 520, 452, 600); x.lineTo(408, 600); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(672, 440); x.lineTo(612, 440); x.quadraticCurveTo(640, 520, 628, 600); x.lineTo(672, 600); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.25)';
    for (i = 0; i < 4; i++) { circle(x, 420 + i * 10, 470 + i * 34, 4); x.fill(); circle(x, 660 - i * 10, 470 + i * 34, 4); x.fill(); }

    // Fayans (tezgâh arkası)
    x.fillStyle = '#4e8d8f'; x.fillRect(330, 594, 500, 22);
    x.fillStyle = '#5fa8a8'; x.fillRect(674, 548, 156, 68); x.fillRect(330, 548, 84, 68);
    x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 2;
    for (i = 330; i <= 830; i += 26) { x.beginPath(); x.moveTo(i, 548); x.lineTo(i, 616); x.stroke(); }
    for (i = 548; i <= 616; i += 22) { x.beginPath(); x.moveTo(330, i); x.lineTo(830, i); x.stroke(); }
    // raf + kavanozlar
    x.fillStyle = '#7a4e2d'; x.fillRect(684, 528, 140, 10);
    var jars = ['#ffb703', '#e63946', '#8ecae6', '#90be6d'];
    for (i = 0; i < 4; i++) {
      x.fillStyle = 'rgba(255,255,255,0.35)'; rr(x, 694 + i * 32, 494, 24, 34, 6); x.fill();
      x.fillStyle = jars[i]; rr(x, 696 + i * 32, 506, 20, 20, 4); x.fill();
      x.fillStyle = '#333'; x.fillRect(696 + i * 32, 490, 20, 6);
    }
    // nazar boncuğu
    x.strokeStyle = '#c9a227'; x.lineWidth = 2; x.beginPath(); x.moveTo(372, 470); x.lineTo(372, 500); x.stroke();
    x.fillStyle = '#0b3d91'; circle(x, 372, 516, 17); x.fill();
    x.fillStyle = '#fff'; circle(x, 372, 516, 11); x.fill();
    x.fillStyle = '#4cc9f0'; circle(x, 372, 516, 7); x.fill();
    x.fillStyle = '#111'; circle(x, 372, 516, 3.5); x.fill();

    // Tezgâh + dolaplar
    x.fillStyle = '#e9dcc9'; x.fillRect(330, 612, 504, 18);
    x.fillStyle = '#c7b8a3'; x.fillRect(330, 628, 504, 4);
    x.fillStyle = '#8c5a3c'; x.fillRect(334, 632, 496, 76);
    x.strokeStyle = '#5e3b26'; x.lineWidth = 3;
    for (i = 0; i < 5; i++) { x.strokeRect(340 + i * 98, 638, 90, 64); }
    x.fillStyle = '#d4a373';
    for (i = 0; i < 5; i++) { rr(x, 378 + i * 98, 646, 14, 6, 3); x.fill(); }
    // lavabo + musluk
    x.fillStyle = '#9aa5b1'; rr(x, 470, 606, 140, 12, 6); x.fill();
    x.strokeStyle = '#cfd8dc'; x.lineWidth = 7; x.lineCap = 'round';
    x.beginPath(); x.moveTo(540, 608); x.lineTo(540, 574); x.quadraticCurveTo(540, 560, 556, 562); x.lineTo(566, 574); x.stroke();
    // ocak + çaydanlık + tencere
    x.fillStyle = '#222'; x.fillRect(660, 604, 150, 10);
    x.fillStyle = '#b0b7c3';
    // çaydanlık (iki katlı)
    rr(x, 740, 566, 56, 40, 14); x.fill();
    x.fillStyle = '#d0d6df'; rr(x, 748, 536, 40, 32, 12); x.fill();
    x.fillStyle = '#222'; circle(x, 768, 532, 5); x.fill();
    x.strokeStyle = '#8d99ae'; x.lineWidth = 5; x.beginPath(); x.moveTo(796, 580); x.lineTo(814, 566); x.stroke();
    x.beginPath(); x.moveTo(788, 548); x.lineTo(802, 540); x.stroke();
    // tencere
    x.fillStyle = '#c1121f'; rr(x, 664, 572, 64, 34, 8); x.fill();
    x.fillStyle = '#9b0e19'; x.fillRect(660, 568, 72, 8);
    x.fillStyle = '#ddd'; x.fillRect(654, 580, 10, 6); x.fillRect(728, 580, 10, 6);

    // Mutfak zemini (dama)
    for (i = 0; i < 34; i++) {
      x.fillStyle = i % 2 ? '#d8d2e8' : '#3d375e';
      x.fillRect(i * 32, 708, 32, 17);
      x.fillStyle = i % 2 ? '#3d375e' : '#d8d2e8';
      x.fillRect(i * 32, 725, 32, 17);
    }
    x.fillStyle = 'rgba(20,10,40,0.35)'; x.fillRect(0, 708, W, 34);

    // Kara tahta çerçevesi
    var B = GEO.BOARD;
    x.fillStyle = '#6b4226'; rr(x, B.x - 8, B.y - 8, B.w + 16, B.h + 16, 14); x.fill();
    x.fillStyle = '#1e3a2b'; rr(x, B.x, B.y, B.w, B.h, 8); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(B.x + 10, B.y + 120, B.w - 20, 30);
    x.fillStyle = '#c8a27a'; x.fillRect(B.x + 20, B.y + B.h + 2, 40, 6);

    // Koridor zemini (ahşap) — üst kenar KF, alt kenar FB.y; perspektif doğrusu ekranın dışına kadar uzar
    var FT = GEO.FT, FB = GEO.FB;
    var slopeL = (FB.l - FT.l) / (FB.y - FT.y), slopeR = (FB.r - FT.r) / (FB.y - FT.y);
    var yL0 = FT.y + (0 - FT.l) / slopeL, yR0 = FT.y + (W - FT.r) / slopeR;
    // duvarlar (yan üçgenler)
    x.fillStyle = '#231e45'; x.fillRect(0, KF, W, H - KF);
    x.fillStyle = 'rgba(255,255,255,0.03)';
    for (i = 0; i < W; i += 40) x.fillRect(i, KF, 16, H - KF);
    // zemin poligonu
    x.save();
    x.beginPath(); x.moveTo(FT.l, FT.y); x.lineTo(FT.r, FT.y); x.lineTo(W, yR0); x.lineTo(W, H); x.lineTo(0, H); x.lineTo(0, yL0); x.closePath();
    g = x.createLinearGradient(0, KF, 0, H);
    g.addColorStop(0, '#a0673a'); g.addColorStop(0.3, '#7d4b28'); g.addColorStop(1, '#2a160b');
    x.fillStyle = g; x.fill();
    x.clip();
    // tahta çizgileri (kaçış noktasına doğru)
    var VX = 540, VY = FT.y - (FT.r - FT.l) / ((FB.r - FB.l) - (FT.r - FT.l)) * (FB.y - FT.y);
    x.strokeStyle = 'rgba(40,20,8,0.55)'; x.lineWidth = 2;
    for (i = -16; i <= 16; i++) {
      var bx = 540 + i * 70;
      x.beginPath(); x.moveTo(VX + (bx - VX) * ((FT.y - VY) / (H - VY)), FT.y); x.lineTo(bx, H); x.stroke();
    }
    for (i = 0; i < 26; i++) {
      var yy = FT.y + Math.pow(i / 25, 1.6) * (H - FT.y);
      x.strokeStyle = 'rgba(40,20,8,' + (0.25 + i * 0.01) + ')';
      x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke();
    }
    // KİLİM yolluk
    var rugTL = 452, rugTR = 628, rugBL = 250, rugBR = 830;
    function rugX(u, y) { var t = (y - FT.y) / (FB.y - FT.y); return LG.lerp(LG.lerp(rugTL, rugBL, t), LG.lerp(rugTR, rugBR, t), u); }
    x.beginPath(); x.moveTo(rugX(0, FT.y + 6), FT.y + 6); x.lineTo(rugX(1, FT.y + 6), FT.y + 6); x.lineTo(rugX(1, 1290), 1290); x.lineTo(rugX(0, 1290), 1290); x.closePath();
    x.fillStyle = '#a4161a'; x.fill();
    // kenar şeritleri
    [[0.02, 0.07, '#e9c46a'], [0.93, 0.98, '#e9c46a'], [0.08, 0.11, '#1d3557'], [0.89, 0.92, '#1d3557']].forEach(function (b) {
      x.beginPath(); x.moveTo(rugX(b[0], FT.y + 6), FT.y + 6); x.lineTo(rugX(b[1], FT.y + 6), FT.y + 6); x.lineTo(rugX(b[1], 1290), 1290); x.lineTo(rugX(b[0], 1290), 1290); x.closePath();
      x.fillStyle = b[2]; x.fill();
    });
    // göbek motifleri (baklava dilimi desen)
    for (i = 0; i < 9; i++) {
      var u0 = Math.pow(i / 9, 1.25), u1 = Math.pow((i + 1) / 9, 1.25);
      var y0 = FT.y + 12 + u0 * (1290 - FT.y - 12), y1 = FT.y + 12 + u1 * (1290 - FT.y - 12);
      var ym = (y0 + y1) / 2;
      var cxm = rugX(0.5, ym), hw = (rugX(0.8, ym) - rugX(0.2, ym)) / 2;
      x.fillStyle = i % 2 ? '#f1faee' : '#e9c46a';
      x.beginPath(); x.moveTo(cxm, y0 + 3); x.lineTo(cxm + hw, ym); x.lineTo(cxm, y1 - 3); x.lineTo(cxm - hw, ym); x.closePath(); x.fill();
      x.fillStyle = i % 2 ? '#1d3557' : '#e76f51';
      x.beginPath(); x.moveTo(cxm, y0 + (y1 - y0) * 0.28); x.lineTo(cxm + hw * 0.45, ym); x.lineTo(cxm, y1 - (y1 - y0) * 0.28); x.lineTo(cxm - hw * 0.45, ym); x.closePath(); x.fill();
    }
    x.restore();
    // süpürgelik (zemin kenarı)
    x.strokeStyle = '#5b3a29'; x.lineWidth = 10;
    x.beginPath(); x.moveTo(FT.l, FT.y); x.lineTo(0, yL0); x.moveTo(FT.r, FT.y); x.lineTo(W, yR0); x.stroke();
    x.strokeStyle = '#3a2418'; x.lineWidth = 6;
    x.beginPath(); x.moveTo(0, KF); x.lineTo(FT.l, FT.y); x.moveTo(FT.r, FT.y); x.lineTo(W, KF); x.stroke();

    // Sol duvar: aile fotoğrafı + çocuk odası kapısı ışığı
    x.save();
    x.fillStyle = '#8d6e63'; x.beginPath(); x.moveTo(40, 790); x.lineTo(150, 772); x.lineTo(150, 860); x.lineTo(40, 892); x.closePath(); x.fill();
    x.fillStyle = '#ffe8cc'; x.beginPath(); x.moveTo(50, 798); x.lineTo(140, 783); x.lineTo(140, 852); x.lineTo(50, 880); x.closePath(); x.fill();
    x.fillStyle = '#e76f51'; circle(x, 78, 838, 9); x.fill(); x.fillStyle = '#457b9d'; circle(x, 104, 830, 11); x.fill(); x.fillStyle = '#2a9d8f'; circle(x, 124, 828, 7); x.fill();
    x.restore();
    // Sağ duvar: askılık
    x.fillStyle = '#6b4226'; x.fillRect(930, 772, 110, 10);
    x.fillStyle = '#c9a227'; circle(x, 950, 790, 5); x.fill(); circle(x, 990, 790, 5); x.fill(); circle(x, 1030, 790, 5); x.fill();

    // Başlangıç çizgisi
    var sy = 1180, se = A.floorEdge(sy);
    x.save();
    x.setLineDash([26, 16]); x.lineWidth = 6; x.strokeStyle = 'rgba(255,255,255,0.75)';
    x.beginPath(); x.moveTo(se.l + 10, sy); x.lineTo(se.r - 10, sy); x.stroke();
    x.restore();

    // Alt kısım (TikTok yorum alanı) — sadece dekor: oyuncaklar
    g = x.createLinearGradient(0, 1300, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.7)');
    x.fillStyle = g; x.fillRect(0, 1300, W, H - 1300);
    x.font = '70px ' + ui.EMOJI_FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.globalAlpha = 0.5;
    x.fillText('🧸', 110, 1420); x.fillText('🪀', 980, 1460); x.fillText('🧩', 860, 1700); x.fillText('🚂', 220, 1760);
    x.globalAlpha = 1;
    // kenar karartma
    var vg = x.createRadialGradient(540, 860, 300, 540, 960, 1150);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    return c;
  };

  // Mutfak masası (kazananların oturduğu) — kazananların önüne çizilir
  A.table = function (ctx) {
    var T = GEO.TABLE;
    ctx.fillStyle = '#5e3b26';
    ctx.fillRect(T.x + 14, T.y + 14, 12, 52); ctx.fillRect(T.x + T.w - 26, T.y + 14, 12, 52);
    ctx.fillStyle = '#fff';
    rr(ctx, T.x, T.y, T.w, 22, 6); ctx.fill();
    ctx.fillStyle = '#e63946';
    for (var i = 0; i < T.w / 22; i++) { if (i % 2 === 0) ctx.fillRect(T.x + i * 22, T.y, 11, 22); }
    ctx.fillStyle = 'rgba(230,57,70,0.45)';
    ctx.fillRect(T.x, T.y + 5, T.w, 6);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(T.x, T.y + 22); ctx.lineTo(T.x + T.w, T.y + 22); ctx.lineTo(T.x + T.w - 6, T.y + 40); ctx.lineTo(T.x + 6, T.y + 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e63946';
    for (var j = 0; j < T.w / 22; j++) { if (j % 2 === 1) ctx.fillRect(T.x + 6 + j * 21.5, T.y + 22, 10, 18); }
  };

  // Buzdolabı (dinamik: parıltı + kapı açılması)
  A.fridge = function (ctx, t, open, glow, treatId) {
    var F = GEO.FRIDGE;
    // parıltı
    ctx.save();
    var gg = ctx.createRadialGradient(F.x + F.w / 2, F.y + F.h / 2, 40, F.x + F.w / 2, F.y + F.h / 2, 260);
    gg.addColorStop(0, 'rgba(160,240,255,' + (0.28 * glow) + ')'); gg.addColorStop(1, 'rgba(160,240,255,0)');
    ctx.fillStyle = gg; ctx.fillRect(F.x - 200, F.y - 120, F.w + 300, F.h + 240);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ell(ctx, F.x + F.w / 2, F.y + F.h, F.w * 0.6, 12); ctx.fill();
    // gövde
    ctx.fillStyle = '#dfe7ef'; rr(ctx, F.x, F.y, F.w, F.h, 18); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(160,240,255,' + (0.5 + 0.4 * glow) + ')'; ctx.stroke();
    // iç (açıkken)
    var mainY = F.y + 92;
    if (open > 0.01) {
      var ig = ctx.createLinearGradient(0, mainY, 0, F.y + F.h);
      ig.addColorStop(0, '#fffde8'); ig.addColorStop(1, '#e8f7ff');
      ctx.fillStyle = ig; rr(ctx, F.x + 8, mainY + 4, F.w - 16, F.h - 100, 10); ctx.fill();
      ctx.fillStyle = '#b8c4cf';
      ctx.fillRect(F.x + 10, mainY + 70, F.w - 20, 5); ctx.fillRect(F.x + 10, mainY + 130, F.w - 20, 5);
      ctx.save(); ctx.globalAlpha = Math.min(1, open * 1.5);
      ctx.drawImage(A.treatSprite(treatId, 70), F.x + F.w / 2 - 38, mainY + 22);
      ctx.restore();
      // ışık hüzmesi
      ctx.save();
      ctx.globalAlpha = 0.35 * open;
      var lb = ctx.createLinearGradient(F.x, 0, F.x - 260, 0);
      lb.addColorStop(0, 'rgba(255,255,220,0.9)'); lb.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.fillStyle = lb;
      ctx.beginPath(); ctx.moveTo(F.x + 8, mainY); ctx.lineTo(F.x + 8, F.y + F.h); ctx.lineTo(F.x - 300, F.y + F.h + 140); ctx.lineTo(F.x - 200, mainY - 40); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // dondurucu kapağı
    ctx.fillStyle = '#eef3f8'; rr(ctx, F.x + 6, F.y + 6, F.w - 12, 80, 12); ctx.fill();
    ctx.fillStyle = '#9aa5b1'; rr(ctx, F.x + 16, F.y + 52, 46, 8, 4); ctx.fill();
    // mıknatıslar + çocuk resmi
    ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(F.x + 120, F.y + 40); ctx.rotate(0.08);
    ctx.fillRect(-28, -24, 56, 46); ctx.strokeStyle = '#e63946'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-8, -6, 6, 0, TAU); ctx.moveTo(-8, 0); ctx.lineTo(-8, 12); ctx.moveTo(-16, 4); ctx.lineTo(0, 4); ctx.stroke();
    ctx.strokeStyle = '#457b9d'; ctx.beginPath(); ctx.arc(12, -4, 7, 0, TAU); ctx.moveTo(12, 3); ctx.lineTo(12, 14); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; circle(ctx, 0, -24, 5); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#e63946'; circle(ctx, F.x + 30, F.y + 24, 7); ctx.fill();
    ctx.fillStyle = '#06d6a0'; circle(ctx, F.x + 52, F.y + 30, 6); ctx.fill();
    // ana kapı (açılınca menteşe tarafına doğru daralır)
    var dw = (F.w - 12) * (1 - open * 0.82);
    ctx.fillStyle = '#f4f8fb';
    ctx.beginPath(); ctx.moveTo(F.x + F.w - 6 - dw, mainY + (open * 10)); ctx.lineTo(F.x + F.w - 6, mainY); ctx.lineTo(F.x + F.w - 6, F.y + F.h - 6); ctx.lineTo(F.x + F.w - 6 - dw, F.y + F.h - 6 - open * 10); ctx.closePath(); ctx.fill();
    if (open < 0.5) {
      ctx.fillStyle = '#9aa5b1'; rr(ctx, F.x + F.w - 6 - dw + 10, mainY + 20, 8, 70, 4); ctx.fill();
    }
  };
})();
