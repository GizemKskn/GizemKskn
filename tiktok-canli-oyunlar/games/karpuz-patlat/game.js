/*
 * KARPUZ PATLAT! 🍉 — viral "lastik takıp karpuz patlatma" akımı, canlı yayında.
 *
 *  💬 Yorum            → adınla bir lastik takılır (renk yazarsan o renkte; sayı yazarsan "kaçta patlar" tahmini)
 *  ❤️ Beğeni           → her ~15 beğenide ince bir lastik; beğeni hızı meyveyi titretir
 *  🎁 Hediye           → kutlama + hızlandırma: 1) +3 lastik  2) +5 ışıltılı lastik  3) KALIN LASTİK (10 sayılır)
 *                        4) MEGA SIKMA (25 lastik, hidrolik pres)  5+) DEV LASTİK YAĞMURU (60 lastik + havai fişek)
 *  ➕ Takip / ↗ Paylaş → masaya kalp çıkartması / "seyirci çağırdı" bildirimi
 *  💥 Gizli eşikte meyve patlar: donma + ağır çekim, kameraya sıçrayan su, PATLATAN + Kahramanlar,
 *     temizlik ve sıradaki meyve (karpuz → kavun → balkabağı → dev balon → ananas → …)
 *
 * Sunucu tuşları: N yeni meyve / yeni tur · B şimdi patlat (final) · T gerilim (sarsıntı + çatırtı)
 * URL ayarları: ?minlastik=40&maxlastik=900 (gizli patlama eşiği sınırları)
 */
(function () {
  'use strict';
  var KP = window.KP, A = KP.art, T = KP.T, ui = LG.ui, W = LG.W, H = LG.H, SAFE = LG.SAFE;
  var PI = Math.PI, TAU = PI * 2;
  var sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, sqrt = Math.sqrt, exp = Math.exp, pow = Math.pow;
  var clamp = LG.clamp, lerp = LG.lerp, ease = LG.ease, fmt = KP.fmt;
  var FRUITS = KP.FRUITS;

  ui.celebrateEnabled = false; // hediye kutlamalarını oyun kendisi çiziyor
  LG.sim.genComment = KP.simComment;
  // Ortak katmanın bildirimlerini (ör. yumuşak sınır teşekkürü) kendi bildirim şeridimize yönlendir
  ui.toast = function (text, o) { note((o && o.icon) || '•', text, (o && o.color) || '#fff'); };

  // ---------------------------------------------------------------------------
  // Ayarlar ve yerleşim
  // ---------------------------------------------------------------------------
  var MAX_DRAW = 80;        // çizilen en fazla lastik (fazlası demetlere birleşir)
  var MAX_LABELS = 15;      // aynı anda en fazla isim etiketi
  var CHAT_CD = 1.2;        // aynı kişinin yorumla lastik takma aralığı (sn)
  var LIKES_PER_BAND = 15;
  var TH_MIN = max(10, LG.qn('minlastik', 40));
  var TH_MAX = max(TH_MIN + 10, LG.qn('maxlastik', 900));

  var L = { x0: SAFE.x, x1: SAFE.x + SAFE.w, titleY: 292, chipY: 346, chipH: 54, meterY: 412, meterH: 60, noteY: 512, gTop: 550, gBot: 1036, gW: 184, hintY: 1222, hintH: 70 };
  var CAMT = LG.CAM && LG.CAM.y < 700 ? LG.CAM : null;
  if (CAMT) {
    if (CAMT.x + CAMT.w / 2 > W / 2) L.x1 = CAMT.x - 14; else L.x0 = CAMT.x + CAMT.w + 14;
    L.meterY = CAMT.y + CAMT.h + 10; L.noteY = L.meterY + L.meterH + 34; L.gTop = L.noteY + 36;
  }
  L.hcx = (L.x0 + L.x1) / 2; L.hw = L.x1 - L.x0;

  // ---------------------------------------------------------------------------
  // Durum
  // ---------------------------------------------------------------------------
  var S = {
    st: 'intro', t: 0, round: 0, fi: -1, F: FRUITS[0],
    bands: [], units: 0, threshold: 60, K: 0.9, pvT: 0, pv: 0, unitsBump: 0,
    playStart: 0, lastUser: null, burster: null,
    queue: [], relAcc: 0,
    guesses: new Map(), guessOpen: true,
    board: new LG.Board(),
    recent: [], tease: 0, crackBoost: 0, waist: 0, creakT: 2, res: null, landed: false,
    p0: 0, u0: 0, freeRound: 0, retargets: 0,
  };
  var fruit = { x: 540, rot: 0, sq: 0, sqV: 0, press: 0, ox: 0, oy: 0, visible: true };
  var G = A.G;
  var heat = 0, sessionStart = 0;
  var freeLog = [];
  var fx = [], splats = [], drips = [], cracks = [], stickers = [], notes = [], banners = [], banner = null;
  var press = null, rings = [], timeline = [];
  var cam = { z: 1 };
  var ts = 1; // ağır çekim çarpanı (patlama parçacıkları için)
  var labels = [], labelT = 0;
  var wiperX = -300, puddle = 0;
  var bg = null, titleImg = null;
  var stickerSlot = 0, lastHeartFx = 0, lastFloat = 0;
  var tmpP = { x: 0, y: 0 };
  // Yerleşmiş lastikler bir ara katmana çizilir (en çok ~7 Hz); esneme/titreme bu katmana dönüşüm olarak uygulanır
  KP.tune = { cacheInt: 0.14 };
  var BC = { front: null, back: null, t: -9, pv: -1, dirty: true, ok: false, x0: 0, y0: 0, live: [] };
  var GREF = { F: null, cx: 540, cy: 0, RX: 0, RY: 0, hw: new Float32Array(A.N + 1), pinch: new Float32Array(A.N + 1), spin: 0 };
  var MEDALS = ['🥇', '🥈', '🥉'];
  var FW_PALS = [['#ff4d6d', '#ffd166', '#fff'], ['#4cc9f0', '#b388ff', '#fff'], ['#06d6a0', '#ffd166', '#fff'], ['#ff9f1c', '#ff4d6d', '#ffe066']];

  function now() { return LG.time || 0; }
  function after(sec, fn) { timeline.push({ at: now() + sec, fn: fn }); }
  function gauss() { var u = 1 - Math.random(), v = Math.random(); return sqrt(-2 * Math.log(u)) * cos(TAU * v); }
  function fmtTime(s) { s = max(0, Math.round(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function isFinale() { return S.st === 'critical' || S.st === 'freeze' || S.st === 'boom' || S.st === 'result' || S.st === 'sweep'; }
  // Gizli eşiğe ilerleme (eşik tur içinde yükseltilse bile gösterge geri düşmez)
  function progress() {
    var span = S.threshold - S.u0;
    return clamp(S.p0 + (1 - S.p0) * (span > 0 ? (S.units - S.u0) / span : 1), 0, 1);
  }
  // Yayın kalabalıksa (yorumlar beklenenden hızlı geliyorsa) tur 2–4 dk sürsün diye eşiği gizlice yükselt
  function retarget() {
    var el = now() - S.playStart;
    if (el < 8) return;
    var rate = S.freeRound / el;
    var want = rate * max(60, LG.rand(100, 160) - el * 0.5);
    var remain = S.threshold - S.units;
    if (want > remain * 1.25 && S.threshold < TH_MAX) {
      S.p0 = progress(); S.u0 = S.units;
      S.threshold = min(TH_MAX, S.units + Math.round(want));
    }
  }
  function canFloat(gap) { if (now() - lastFloat < (gap || 0.2)) return false; lastFloat = now(); return true; }

  // ---------------------------------------------------------------------------
  // Bildirim şeridi (tek satır, sıralı)
  // ---------------------------------------------------------------------------
  function note(icon, text, color, key) {
    if (key) {
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i];
        if (n.key === key) { n.n++; n.text = n.base + ' x' + n.n; n.w = 0; if (i === 0) n.t = min(n.t, 0.3); return; }
      }
    }
    notes.push({ icon: icon, base: text, text: text, color: color || '#fff', t: 0, key: key || null, n: 1, w: 0 });
    if (notes.length > 8) notes.splice(1, notes.length - 8);
  }
  function noteLife() { return notes.length > 3 ? 1.1 : notes.length > 1 ? 1.7 : 2.8; }

  function pushBanner(u, title, sub, thanks, emoji, tier) {
    if (banners.length > 4) banners.shift();
    banners.push({ u: u, title: title, sub: sub, thanks: thanks, emoji: emoji, tier: tier, t: 0, dur: tier >= 5 ? 4.4 : tier >= 4 ? 3.3 : 2.7 });
  }

  // ---------------------------------------------------------------------------
  // Lastikler
  // ---------------------------------------------------------------------------
  function colsFor(u, hex, hs) {
    var h = ((u ? u.hue : LG.randi(0, 359)) + (hs || 0)) % 360;
    if (h < 0) h += 360;
    return A.bandCols(h, hex);
  }
  function makeBand(u, o) {
    var col = o.col || colsFor(u, o.hex, o.hs);
    return {
      u: u, v: clamp(gauss() * 0.2 + S.waist * 0.5, -0.56, 0.56), lw: o.lw || 7,
      c: col.c, d: col.d, l: col.l, k: LG.rand(0.2, 0.8) * PI, born: now(), snap: 1,
      units: o.units || 1, kind: o.kind || 'n', sparkle: !!o.sparkle, cols: null, bundle: false, dead: false,
    };
  }
  function queueBand(u, o) {
    S.queue.push({ u: u, o: o || {} });
    if (S.queue.length > 800) S.queue.splice(0, S.queue.length - 800);
  }
  function mergeOld() {
    var bs = S.bands, a = bs[0], best = 1, bd = 9;
    var lim = min(bs.length, 41);
    for (var i = 1; i < lim; i++) { var d = abs(bs[i].v - a.v); if (d < bd) { bd = d; best = i; } }
    var b = bs[best];
    b.lw = min(19, sqrt(b.lw * b.lw + a.lw * a.lw * 0.32));
    if (!b.cols) b.cols = [];
    if (b.cols.length < 2) b.cols.push(a.c);
    b.bundle = true;
    a.dead = true;
    BC.dirty = true;
    bs.shift();
  }
  function pushRecent(u) {
    for (var i = 0; i < S.recent.length; i++) if (S.recent[i].u === u) { S.recent.splice(i, 1); break; }
    S.recent.unshift({ u: u, t: now() });
    if (S.recent.length > 5) S.recent.length = 5;
    gutVer++;
  }
  function addBand(u, o) {
    o = o || {};
    var b = makeBand(u, o);
    S.bands.push(b);
    while (S.bands.length > MAX_DRAW) mergeOld();
    S.units += b.units;
    S.unitsBump = 1;
    if (o.free) { freeLog.push(now()); S.freeRound++; }
    if (u) { S.board.add(u, b.units); pushRecent(u); S.lastUser = u; }
    fruit.sqV = min(4, fruit.sqV + (o.impulse != null ? o.impulse : 0.45 + b.lw * 0.045));
    if (b.kind === 'thick') { LG.sfx('boing'); LG.sfx('drum'); ui.shake(10, 0.3); }
    else if (o.thin) LG.sfx('tick');
    else if (o.isNew) LG.sfx('join');
    else if (b.sparkle) LG.sfx('coin');
    else LG.sfx('pop');
    if (o.hype) {
      fruit.sqV = min(4, fruit.sqV + 0.8);
      if (canFloat(0.25)) { A.knotPos(G, b, b.k, tmpP); ui.float('', tmpP.x, tmpP.y - 10, { emoji: '💥', size: 40, life: 0.9, vy: -160 }); }
    }
    labelT = 0;
    if (S.units >= S.threshold && S.st === 'play') startCritical(u);
  }

  // ---------------------------------------------------------------------------
  // Tur akışı
  // ---------------------------------------------------------------------------
  function computeThreshold() {
    var t = now();
    while (freeLog.length && freeLog[0] < t - 150) freeLog.shift();
    var span = min(150, t - sessionStart);
    var th;
    if (span < 45 || freeLog.length < 10) th = LG.randi(45, 85);
    else th = Math.round(freeLog.length / span * LG.rand(105, 185));
    return clamp(th, TH_MIN, TH_MAX);
  }
  function genCracks() {
    var out = [];
    for (var k = 0; k < 6; k++) {
      var dir = k % 2 ? 1 : -1;
      var phi = LG.rand(-0.95, 0.95), v = dir * LG.rand(0.14, 0.3);
      var pts = [{ p: phi, v: v }];
      var steps = LG.randi(6, 10);
      for (var s = 0; s < steps; s++) {
        phi = clamp(phi + LG.rand(-0.16, 0.16), -1.3, 1.3);
        v += dir * LG.rand(0.05, 0.085);
        if (abs(v) > 0.9) break;
        pts.push({ p: phi, v: v });
      }
      var c = { pts: pts, start: 0.34 + k * 0.065 + LG.rand(0, 0.05), w: LG.rand(0.85, 1.2) };
      out.push(c);
      if (pts.length > 4) {
        var bp = pts[LG.randi(2, pts.length - 2)], bd = Math.random() < 0.5 ? -1 : 1;
        var bpts = [{ p: bp.p, v: bp.v }], pp = bp.p, vv = bp.v;
        for (s = 0; s < 4; s++) { pp = clamp(pp + bd * LG.rand(0.08, 0.16), -1.3, 1.3); vv += dir * LG.rand(0.02, 0.06); if (abs(vv) > 0.9) break; bpts.push({ p: pp, v: vv }); }
        if (bpts.length > 1) out.push({ pts: bpts, start: c.start + 0.12, w: 0.6 });
      }
    }
    return out;
  }
  function newFruit() {
    S.round++;
    S.fi = (S.fi + 1) % FRUITS.length;
    S.F = FRUITS[S.fi];
    S.bands = []; S.units = 0; S.board.reset(); S.guesses.clear(); S.guessOpen = true;
    S.threshold = computeThreshold(); S.K = LG.rand(0.85, 0.96); S.p0 = 0; S.u0 = 0; S.freeRound = 0; S.retargets = 0;
    S.pv = 0; S.pvT = 0; S.tease = 0; S.crackBoost = 0; S.waist = LG.rand(-0.08, 0.08);
    S.lastUser = null; S.burster = null; S.res = null; S.recent = []; gutVer++;
    cracks = genCracks(); drips = []; puddle = 0; labels = [];
    BC.ok = false; BC.dirty = true; BC.t = -9;
    fx.length = 0; splats.length = 0; rings.length = 0; press = null;
    fruit.x = -440; fruit.rot = 0; fruit.sq = 0; fruit.sqV = 0; fruit.press = 0; fruit.visible = true;
    cam.z = 1; ts = 1;
    S.st = 'intro'; S.t = 0; S.landed = false;
    LG.sfx('whoosh');
    if (LG.music.style !== 'party') LG.music.play('party');
    LG.music.setTempo(1);
  }
  function startPlay() {
    S.st = 'play'; S.t = 0; S.playStart = now();
    // önceki turdan taşınan yorum lastiklerini sınırla (hediye lastikleri korunur)
    var cap = Math.floor(S.threshold * 0.35), free = 0, i;
    for (i = 0; i < S.queue.length; i++) if (S.queue[i].o.free) free++;
    for (i = 0; i < S.queue.length && free > cap; ) {
      if (S.queue[i].o.free) { S.queue.splice(i, 1); free--; } else i++;
    }
    if (S.queue.length >= 4) note('⏳', fmt(T.waiting, { n: S.queue.length }), '#ffd166');
  }
  function flushPress() {
    if (!press) return;
    while (press.done < press.n) { press.done++; queueBand(press.u, { lw: 7, hs: LG.randi(-25, 25) }); }
    press.t = max(press.t, 1.65);
  }
  function startCritical(u) {
    if (S.st !== 'play') return;
    S.st = 'critical'; S.t = 0;
    S.burster = u || S.lastUser;
    flushPress();
    LG.sfx('clap'); LG.sfx('zap');
    LG.music.setTempo(1.7);
  }
  function kickFruit() {
    if (S.st !== 'play') return;
    flushPress();
    S.st = 'leave'; S.t = 0;
    LG.sfx('whoosh'); LG.sfx('boing');
    note('🛼', T.kicked, '#fff');
  }
  function makeSplats(color) {
    var t0 = now();
    for (var i = 0; i < 24; i++) {
      var big = i < 7;
      var x = big ? LG.rand(220, 860) : LG.rand(50, 1030);
      var y = big ? LG.rand(560, 1130) : LG.rand(250, 1280);
      var r = big ? LG.rand(46, 84) : LG.rand(14, 42);
      splats.push(A.makeSplat(x, y, r, color, t0 + LG.rand(0.12, 0.6)));
    }
  }
  function explode() {
    var F = S.F, g = G, i;
    S.st = 'boom'; S.t = 0; ts = 0.13;
    fruit.visible = false;
    LG.music.stop();
    LG.sfx('boom'); LG.sfx('splash'); LG.sfx('clap');
    ui.flash('#fff', 0.5); ui.shake(34, 1.1);
    cam.z = 1.16;
    var juicy = F.burst === 'juice';
    var nC = juicy ? 18 : 24;
    for (i = 0; i < nC; i++) {
      var phi = LG.rand(-1.45, 1.45), v = LG.rand(-0.85, 0.85);
      var p = A.sp(g, phi, v);
      var px = p.x, py = p.y;
      var dx = px - g.cx, dy = py - g.cy - g.RY * 0.15, d = sqrt(dx * dx + dy * dy) || 1;
      var sp = LG.rand(700, 1500), r = juicy ? LG.rand(34, 74) : LG.rand(30, 56);
      var toCam = juicy && i < 3;
      fx.push({
        k: 'chunk', x: px, y: py, vx: toCam ? dx * 0.3 : dx / d * sp + LG.rand(-160, 160), vy: toCam ? -40 : dy / d * sp - LG.rand(350, 850),
        rot: LG.rand(0, TAU), vr: LG.rand(-9, 9), r: r, pts: A.chunkPts(r), g: toCam ? 0 : 1900, floor: LG.rand(1068, 1190),
        t: 0, life: 1e9, s: 1, a: 1, rest: false, cam: toCam,
      });
    }
    if (juicy) {
      for (i = 0; i < 170; i++) {
        var a = Math.random() * TAU, rr = Math.random();
        var spd = LG.rand(300, 1600);
        fx.push({ k: 'drop', x: g.cx + cos(a) * g.RX * 0.7 * rr, y: g.cy + sin(a) * g.RY * 0.7 * rr, vx: cos(a) * spd, vy: sin(a) * spd - LG.rand(200, 700), r: LG.rand(5, 17), c: Math.random() < 0.7 ? F.juice : F.flesh, g: 1600, t: 0, life: LG.rand(0.9, 2.0), floor: LG.rand(1068, 1200) });
      }
      for (i = 0; i < 46; i++) {
        var a2 = Math.random() * TAU, sp2 = LG.rand(400, 1300);
        fx.push({ k: 'seed', x: g.cx + LG.rand(-80, 80), y: g.cy + LG.rand(-80, 80), vx: cos(a2) * sp2, vy: sin(a2) * sp2 - 500, r: LG.rand(5, 8), rot: LG.rand(0, TAU), vr: LG.rand(-14, 14), c: F.seed, g: 1700, t: 0, life: 4, floor: LG.rand(1068, 1190) });
      }
      makeSplats(F.juice);
      puddle = 1;
    } else {
      ui.burst(g.cx, g.cy, { count: 200, speed: 1400, up: 300, size: 18 });
      ui.rain({ count: 160 });
      LG.sfx('pop');
    }
    fx.push({ k: 'wave', x: g.cx, y: g.cy, t: 0, life: 0.9 });
    ui.burst(g.cx, g.cy, { count: 70, speed: 1200, shape: 'circle', colors: [F.juice, F.flesh, '#ffffff'], size: 14 });
  }
  function bestGuess() {
    var best = null;
    S.guesses.forEach(function (gs) {
      var d = abs(gs.g - S.units);
      if (!best || d < best.d || (d === best.d && gs.t < best.t)) best = { u: gs.u, g: gs.g, d: d, t: gs.t };
    });
    return best;
  }
  function startResult() {
    S.st = 'result'; S.t = 0; ts = 1;
    S.board._lastSort = -1e9;
    S.res = { u: S.burster, units: S.units, people: S.board.scores.size, time: now() - S.playStart, guess: bestGuess() };
    LG.sfx('fanfare');
    after(0.4, function () { LG.sfx('clap'); });
    after(0.8, function () { LG.sfx('clap'); });
    ui.burst(150, 1120, { angle: -PI / 2 + 0.35, spread: 0.7, count: 70, speed: 1300 });
    ui.burst(930, 1120, { angle: -PI / 2 - 0.35, spread: 0.7, count: 70, speed: 1300 });
    LG.music.play('party');
  }
  function startSweep() {
    S.st = 'sweep'; S.t = 0; wiperX = -120;
    LG.sfx('whoosh');
    after(0.5, function () { LG.sfx('splash'); });
  }
  function tease() {
    if (S.st !== 'play') return;
    S.tease = min(1, S.tease + 0.6);
    S.crackBoost = min(0.35, S.crackBoost + 0.1);
    fruit.sqV = min(4, fruit.sqV + 2.6);
    ui.shake(14, 0.45);
    LG.sfx('clap'); LG.sfx('zap');
    ui.float(T.tease, G.cx, G.cy - G.RY * 0.25, { size: 70, color: '#ffe14d', life: 1.4, vy: -90 });
    if (S.F.burst === 'juice') { spawnSeeds(5); for (var i = 0; i < 3; i++) spawnDrip(); }
  }
  function spawnDrip() {
    if (drips.length > 30 || !cracks.length) return;
    var c = LG.pick(cracks);
    var rev = clamp((S.pv + S.crackBoost - c.start) / 0.3, 0, 1);
    var phi, v;
    if (rev > 0.2) { var k = LG.randi(0, Math.floor(rev * (c.pts.length - 1))); phi = c.pts[k].p; v = c.pts[k].v; }
    else if (S.bands.length) { var b = LG.pick(S.bands); phi = PI / 2 - b.k; v = b.v + 0.03; }
    else return;
    drips.push({ p: phi, v: v, vv: LG.rand(0.05, 0.14), r: LG.rand(4, 7), st: 0, x: 0, y: 0, vy: 0 });
  }
  function spawnSeeds(n) {
    if (fx.length > 600) return;
    for (var i = 0; i < n; i++) {
      var phi = LG.rand(-1.1, 1.1), v = LG.rand(-0.4, 0.4);
      var q = A.sp(G, phi, v);
      fx.push({ k: 'seed', x: q.x, y: q.y, vx: sin(phi) * LG.rand(200, 520), vy: -LG.rand(300, 650), r: LG.rand(5, 7), rot: LG.rand(0, TAU), vr: LG.rand(-12, 12), c: S.F.seed, g: 1700, t: 0, life: 2.6, floor: LG.rand(1072, 1170) });
    }
    LG.sfx('tick');
  }
  function fireworks(n) {
    for (var i = 0; i < n; i++) {
      after(i * 0.3, function () {
        ui.burst(LG.rand(180, 900), LG.rand(560, 920), { count: 46, speed: 650, up: 0, shape: 'circle', size: 12, gravity: 500, life: 1.2, colors: LG.pick(FW_PALS) });
        LG.sfx('boom');
      });
    }
  }
  function startPress(u, n) { press = { u: u, t: 0, n: n, done: 0, hit: false }; LG.sfx('whoosh'); }
  function startRain(u, n, tier) {
    var gold = tier >= 6;
    for (var i = 0; i < n; i++) {
      var col = gold ? A.bandCols(0, LG.pick(['#ffc933', '#ffe066', '#ffb703'])) : A.bandCols((i * 37) % 360);
      rings.push({ u: u, x: 540 + LG.rand(-380, 380), y: -40 - i * 24 - LG.rand(0, 40), vy: LG.rand(380, 600), rot: LG.rand(-0.6, 0.6), vr: LG.rand(-4, 4), col: col, c: col.c });
    }
    LG.sfx('mega');
    fireworks(gold ? 10 : 6);
  }

  // ---------------------------------------------------------------------------
  // Olaylar
  // ---------------------------------------------------------------------------
  LG.on('chat', function (e) {
    var u = e.user;
    if (!u) return;
    var raw = e.raw || '', t = now(), d = u.data;
    if (!e.flagged && S.guessOpen && (S.st === 'play' || S.st === 'intro') && !S.guesses.has(u.id)) {
      var n = LG.cmd.number(raw);
      if (n != null && n >= 5 && n <= 5000) {
        S.guesses.set(u.id, { u: u, g: n, t: t });
        if (canFloat(0.3)) ui.float('🎯 ' + n, LG.rand(300, 780), L.noteY + 60, { size: 34, color: '#7dffb0', life: 1.2, vy: -60 });
      }
    }
    if (d.kpChat && t - d.kpChat < CHAT_CD) return;
    d.kpChat = t;
    var hex = e.flagged ? null : LG.cmd.match(raw, KP.COLORS);
    var hype = !e.flagged && (LG.cmd.has(raw, ['patlat', 'patlasın', 'hadi', 'pop', 'boom']) || raw.indexOf('💥') >= 0);
    queueBand(u, { hex: hex, free: true, hype: hype, isNew: e.isNew });
  });

  LG.on('like', function (e) {
    var u = e.user;
    if (!u) return;
    heat += e.count;
    var d = u.data;
    d.kpLike = (d.kpLike || 0) + e.count;
    var made = 0;
    while (d.kpLike >= LIKES_PER_BAND && made < 2) { d.kpLike -= LIKES_PER_BAND; queueBand(u, { lw: 3.6, thin: true, free: true }); made++; }
    if (d.kpLike >= LIKES_PER_BAND) d.kpLike = LIKES_PER_BAND - 1;
    if (now() - lastHeartFx > 0.12 && fx.length < 600 && !isFinale()) {
      lastHeartFx = now();
      fx.push({ k: 'heart', x: LG.rand(300, 780), y: A.BASE_Y - LG.rand(20, 120), vx: LG.rand(-40, 40), vy: -LG.rand(140, 230), t: 0, life: 1.4, s: LG.rand(26, 42) });
    }
  });

  LG.on('gift', function (e) {
    var u = e.user, g = e.gift;
    if (!u || !g) return;
    var tier = g.tier || 1, em = LG.giftEmoji(g), fin = isFinale();
    var big = tier >= 3 && ui.spotlightAllowed(u, tier);
    var gname = g.name + (g.count > 1 ? ' x' + g.count : '');
    var n, i;
    if (tier === 1) {
      n = 3 * min(g.count, 5);
      for (i = 0; i < n; i++) queueBand(u, { lw: 6.5 });
      note(em, u.name + ' · ' + fmt(T.plusBands, { n: n }) + ' 💖', '#ffd166', 'g' + u.id + g.name);
      LG.sfx('coin');
    } else if (tier === 2) {
      n = 5 * min(g.count, 3);
      for (i = 0; i < n; i++) queueBand(u, { lw: 8, sparkle: true, hs: (i % 3) * 14 });
      note(em, u.name + ' · ' + fmt(T.plusBands, { n: n }) + ' ✨💖', '#ffd166', 'g' + u.id + g.name);
      LG.sfx('coin'); LG.sfx('levelup');
    } else if (tier === 3) {
      n = min(g.count, 3);
      for (i = 0; i < n; i++) queueBand(u, { lw: 22, kind: 'thick', units: 10, impulse: 2.2 });
      if (big && !fin) { pushBanner(u, u.name + ' · ' + gname, T.thick, T.thanks, em, 3); LG.sfx('levelup'); }
      else note(em, u.name + ' · ' + T.thick, '#ffd166');
    } else if (tier === 4) {
      if (S.st === 'play' && big && !press) startPress(u, 25);
      else for (i = 0; i < 25; i++) queueBand(u, { lw: 7, hs: LG.randi(-25, 25) });
      if (big && !fin) { pushBanner(u, u.name + ' · ' + gname, T.mega, T.thanksBig, em, 4); LG.sfx('fanfare'); }
      else note(em, u.name + ' · ' + T.mega, '#ffd166');
    } else {
      if (S.st === 'play' && big) startRain(u, 60, tier);
      else {
        for (i = 0; i < 60; i++) queueBand(u, { lw: 6.5, col: A.bandCols((i * 37) % 360) });
        if (big) fireworks(5);
      }
      if (big && !fin) pushBanner(u, u.name + ' · ' + gname, T.rain, T.thanksHuge, em, tier);
      else note(em, u.name + ' · ' + T.rain, '#ffd166');
      if (big) { ui.flash('#fff', 0.3); ui.shake(14, 0.5); }
    }
  });

  var STICKER_SLOTS = [[118, 1128], [950, 1128], [262, 1158], [812, 1158], [396, 1178], [684, 1178]];
  LG.on('follow', function (e) {
    var u = e.user;
    if (!u) return;
    var slot = stickerSlot++ % STICKER_SLOTS.length, sl = STICKER_SLOTS[slot];
    for (var i = stickers.length - 1; i >= 0; i--) if (stickers[i].slot === slot || stickers[i].u === u) stickers.splice(i, 1);
    stickers.push({ u: u, x: sl[0], y: sl[1], rot: LG.rand(-0.25, 0.25), t: now(), slot: slot });
    note('➕', fmt(T.followed, { name: u.name }), '#ff8fb8');
    LG.sfx('heart');
  });
  LG.on('share', function (e) {
    if (!e.user) return;
    note('↗️', fmt(T.shared, { name: e.user.name }), '#7fd8ff');
    LG.sfx('honk');
  });

  // Sunucu kısayolları (h, m, s, d, p ortak kullanımda)
  LG.onKey('n', 'Yeni meyve / yeni tur', function () {
    if (S.st === 'play') kickFruit();
    else if (S.st === 'result') startSweep();
  });
  LG.onKey('b', 'Şimdi patlat! (final)', function () { if (S.st === 'play' && S.units > 0) startCritical(S.lastUser); });
  LG.onKey('t', 'Gerilim: sarsıntı + çatırtı', function () { tease(); });

  // ---------------------------------------------------------------------------
  // Güncelleme
  // ---------------------------------------------------------------------------
  function update(dt, t) {
    var i;
    for (i = timeline.length - 1; i >= 0; i--) {
      if (t >= timeline[i].at) { var fn = timeline[i].fn; timeline.splice(i, 1); fn(); }
    }
    heat *= exp(-dt * 1.3);
    S.tease = max(0, S.tease - dt * 1.4);
    S.unitsBump = max(0, S.unitsBump - dt * 4);
    S.t += dt;

    // --- durum makinesi
    switch (S.st) {
      case 'intro':
        var k = min(1, S.t / 1.5);
        fruit.x = lerp(-440, 540, ease.outCubic(k));
        fruit.rot = (fruit.x - 540) / S.F.rx;
        if (k >= 1 && !S.landed) {
          S.landed = true; fruit.sqV += 3; LG.sfx('boing');
          ui.burst(540, A.BASE_Y, { count: 24, colors: ['#ffffff', '#ffe08a'], speed: 320, shape: 'circle', size: 10, up: 100 });
        }
        if (S.t >= 2.3) startPlay();
        break;
      case 'play':
        if (S.queue.length) {
          S.relAcc += dt * (5 + S.queue.length * 1.5);
          var nrel = 0;
          while (S.relAcc >= 1 && S.queue.length && nrel < 6 && S.st === 'play') { S.relAcc -= 1; var q = S.queue.shift(); addBand(q.u, q.o); nrel++; }
          if (S.relAcc > 3) S.relAcc = 3;
        } else S.relAcc = 0;
        if (S.st !== 'play') break;
        var el = t - S.playStart;
        if ((S.retargets === 0 && el > 15) || (S.retargets === 1 && el > 40)) { S.retargets++; retarget(); }
        if (el > 210 && S.threshold > S.units + 1) S.threshold = max(S.units + 1, S.threshold - dt * 0.35); // lastik yorgunluğu
        if (S.guessOpen && S.pv >= 0.5) { S.guessOpen = false; note('🎯', T.guessesClosed, '#7dffb0'); LG.sfx('bell'); }
        S.creakT -= dt;
        if (S.creakT <= 0) {
          S.creakT = LG.rand(1.5, 4) * (1.5 - S.pv);
          if (S.pv > 0.55) { LG.sfx(S.pv > 0.8 ? 'clap' : 'tick'); if (S.pv > 0.7) fruit.sqV += 0.9; }
        }
        if (S.F.burst === 'juice') {
          if (S.pv > 0.42 && Math.random() < dt * (S.pv - 0.42) * 9) spawnDrip();
          if (S.pv > 0.62 && Math.random() < dt * (S.pv - 0.6) * 2.5) spawnSeeds(1);
        }
        if (S.pv > 0.72 && LG.music.style !== 'tension' && LG.config.music) LG.music.play('tension');
        if (LG.music.style === 'tension') LG.music.setTempo(1 + (S.pv - 0.72) * 1.4);
        break;
      case 'critical':
        cam.z += (1.1 - cam.z) * min(1, dt * 3);
        if (Math.floor(S.t * 5) !== Math.floor((S.t - dt) * 5)) { LG.sfx('clap'); fruit.sqV += 1.2; }
        if (S.t >= 0.95) { S.st = 'freeze'; S.t = 0; ui.flash('#fff', 0.18); LG.sfx('zap'); }
        break;
      case 'freeze':
        if (S.t >= 0.26) explode();
        break;
      case 'boom':
        ts = S.t < 0.55 ? 0.13 : min(1, 0.13 + (S.t - 0.55) * 1.4);
        cam.z += (1 - cam.z) * min(1, dt * 2.2);
        if (S.t >= 1.75) startResult();
        break;
      case 'result':
        cam.z = 1;
        if (S.t >= 9.5) startSweep();
        break;
      case 'sweep':
        wiperX = lerp(-120, W + 220, ease.inOutSine(min(1, S.t / 1.8)));
        for (i = fx.length - 1; i >= 0; i--) { var p = fx[i]; if (p.rest && p.x < wiperX + 40) { p.x = wiperX + 40 + Math.random() * 20; } }
        for (i = splats.length - 1; i >= 0; i--) if (splats[i].x < wiperX - 10) splats.splice(i, 1);
        if (wiperX > 540) puddle = max(0, puddle - dt * 2);
        if (S.t >= 2.05) newFruit();
        break;
      case 'leave':
        fruit.x += dt * 1300 * min(1, S.t * 2.5);
        fruit.rot = (fruit.x - 540) / S.F.rx;
        if (S.t >= 1.1) newFruit();
        break;
    }

    // --- gerilim (görünen değer gizli eşiği ele vermez)
    if (S.st === 'play') { var pr = progress(); S.pvT = S.K * (1 - pow(1 - pr, 1.25)); }
    else if (S.st === 'critical' || S.st === 'freeze') S.pvT = 1;
    else if (S.st === 'intro') S.pvT = 0;
    S.pv += (S.pvT - S.pv) * min(1, dt * 3.5);

    // --- yay (meyve esneme) ve titreme
    var dts = dt * ts;
    if (S.st !== 'freeze') {
      fruit.sqV += (-170 * fruit.sq - 9 * fruit.sqV) * dt;
      fruit.sq = clamp(fruit.sq + fruit.sqV * dt, -0.22, 0.25);
    }
    for (i = 0; i < S.bands.length; i++) { var bb = S.bands[i]; if (bb.snap > 0) bb.snap = max(0, bb.snap - dt * 3.3); }
    var amp = min(7, heat * 0.05) + pow(S.pv, 3) * 4 + S.tease * 12 + (S.st === 'critical' ? 6 + S.t * 16 : 0);
    if (S.st === 'freeze' || S.st === 'intro' || S.st === 'leave') amp = 0;
    fruit.ox = (Math.random() - 0.5) * amp * 1.2 + sin(t * 47) * amp * 0.4;
    fruit.oy = (Math.random() - 0.5) * amp * 0.3;

    // --- pres
    if (press) {
      press.t += dt;
      var pt = press.t;
      if (pt > 0.45 && !press.hit) { press.hit = true; LG.sfx('drum'); LG.sfx('zap'); ui.shake(16, 0.5); }
      var want = Math.floor(press.n * clamp((pt - 0.5) / 1.0, 0, 1));
      while (press.done < want) {
        press.done++;
        if (S.st === 'play') addBand(press.u, { lw: 7, hs: LG.randi(-25, 25), impulse: 0.08 });
        else queueBand(press.u, { lw: 7, hs: LG.randi(-25, 25) });
      }
      if (pt < 0.45) fruit.press = 0;
      else if (pt < 1.65) fruit.press = 0.17 * ease.outCubic(min(1, (pt - 0.45) / 0.25)) + 0.008 * sin(pt * 70);
      else fruit.press = 0.17 * max(0, 1 - (pt - 1.65) / 0.5);
      if (pt >= 2.15) { press = null; fruit.press = 0; }
    } else fruit.press *= 0.85;

    // --- geometri
    if (fruit.visible) {
      var crit = S.st === 'critical' ? 0.05 * sin(t * 38) + S.t * 0.06 : S.st === 'freeze' ? 0.09 : 0;
      A.computeGeom(G, S.F, {
        x: fruit.x + fruit.ox, base: A.BASE_Y + fruit.oy, pv: S.pv, sq: fruit.sq, press: fruit.press,
        bands: S.bands, waist: S.waist, extraBulge: crit, extraWaist: crit * 0.6,
      });
    }

    // --- yağan lastikler
    for (i = rings.length - 1; i >= 0; i--) {
      var r = rings[i];
      r.vy += 900 * dt; r.y += r.vy * dt; r.rot += r.vr * dt;
      r.x += (G.cx - r.x) * min(1, dt * 1.5 * clamp((r.y - 150) / 500, 0, 1));
      if (r.y >= G.cy - G.RY * 0.3) {
        if (S.st === 'play') addBand(r.u, { col: r.col, lw: 6.5, impulse: 0.12 });
        else queueBand(r.u, { col: r.col, lw: 6.5 });
        rings.splice(i, 1);
      }
    }

    // --- yüzey damlaları
    for (i = drips.length - 1; i >= 0; i--) {
      var dp = drips[i];
      if (!dp.st) {
        if (!fruit.visible) { drips.splice(i, 1); continue; }
        dp.v += dp.vv * dt; dp.r = min(10, dp.r + dt * 1.2);
        if (dp.v > 0.9) { var qq = A.sp(G, dp.p, dp.v); dp.st = 1; dp.x = qq.x; dp.y = qq.y; dp.vy = 60; }
      } else {
        dp.vy += 1800 * dt; dp.y += dp.vy * dt;
        if (dp.y >= A.BASE_Y + 10) { puddle = min(1, puddle + 0.025); drips.splice(i, 1); }
      }
    }

    // --- parçacıklar (ağır çekim uygulanır)
    for (i = fx.length - 1; i >= 0; i--) {
      var f = fx[i];
      f.t += f.k === 'heart' ? dt : dts;
      if (f.t >= f.life || f.x < -300 || f.x > W + 300 || f.y > H + 200) { fx.splice(i, 1); continue; }
      if (f.k === 'wave') continue;
      if (f.k === 'heart') { f.x += f.vx * dt; f.y += f.vy * dt; continue; }
      if (f.rest) continue;
      f.vy += f.g * dts; f.x += f.vx * dts; f.y += f.vy * dts;
      if (f.vr) f.rot += f.vr * dts;
      if (f.cam) {
        f.s += dts * 3.2; f.a = 1 - (f.s - 1) / 2.4;
        if (f.s > 3) { splats.push(A.makeSplat(f.x, f.y, LG.rand(52, 76), S.F.juice, now())); fx.splice(i, 1); LG.sfx('splash'); }
        continue;
      }
      if (f.floor && f.y >= f.floor && f.vy > 0) {
        if (f.k === 'drop') { fx.splice(i, 1); continue; }
        f.y = f.floor; f.vy *= -0.32; f.vx *= 0.55; if (f.vr) f.vr *= 0.5;
        if (abs(f.vy) < 90) { f.rest = true; f.vy = 0; f.vx = 0; }
      }
    }

    // --- kameraya sıçrayan su: damlalar aşağı akar
    for (i = 0; i < splats.length; i++) {
      var s = splats[i];
      if (t < s.t0) continue;
      for (var k2 = 0; k2 < s.drips.length; k2++) { var dd = s.drips[k2]; if (dd.len < dd.max) dd.len += dd.sp * dt * (1 - dd.len / dd.max * 0.7); }
    }

    // --- etiket yerleşimi (4 Hz)
    labelT -= dt;
    if (labelT <= 0) { labelT = 0.25; layoutLabels(); }

    // --- bildirim / afiş
    if (notes.length) { notes[0].t += dt; if (notes[0].t > noteLife()) notes.shift(); }
    if (!banner && banners.length && !isFinale()) banner = banners.shift();
    if (banner) { banner.t += dt * (banners.length > 1 ? 1.5 : 1); if (banner.t >= banner.dur) banner = null; }
  }

  // ---------------------------------------------------------------------------
  // İsim etiketleri: en yeniler + liderler, çakışmasız yerleşim
  // ---------------------------------------------------------------------------
  var THS = [0, 0.22, -0.22, 0.45, -0.45, 0.7, -0.7];
  function rankOf(u, top) { for (var i = 0; i < top.length; i++) if (top[i].user === u) return i; return -1; }
  function layoutLabels() {
    labels.length = 0;
    if (!fruit.visible || !S.bands.length || (S.st !== 'play' && S.st !== 'critical')) return;
    var bands = S.bands, rects = [], cand = [], seen = {}, i, b;
    for (i = bands.length - 1; i >= 0 && cand.length < 3; i--) { b = bands[i]; if (b.u && !b.bundle && !seen[b.u.id]) { seen[b.u.id] = 1; cand.push(b); } }
    var top = S.board.top(3);
    for (var k = 0; k < top.length; k++) {
      var tu = top[k].user;
      if (seen[tu.id]) continue;
      for (i = bands.length - 1; i >= 0; i--) if (bands[i].u === tu && !bands[i].bundle) { seen[tu.id] = 1; cand.push(bands[i]); break; }
    }
    for (i = bands.length - 1; i >= 0 && cand.length < 32; i--) { b = bands[i]; if (b.u && !b.bundle && !seen[b.u.id]) { seen[b.u.id] = 1; cand.push(b); } }
    var tnow = now();
    for (i = 0; i < cand.length && labels.length < MAX_LABELS; i++) {
      b = cand[i];
      var fresh = tnow - b.born < 1.6;
      var sz = fresh ? 26 : 21;
      var tag = ui.nameTag(b.u, sz, fresh ? '#fff36b' : '#ffffff', 'rgba(0,0,0,0.62)');
      var w = tag.width, h = tag.height;
      for (var j = 0; j < THS.length; j++) {
        var th = clamp(b.k + THS[j], 0.14 * PI, 0.86 * PI);
        A.knotPos(G, b, th, tmpP);
        var x = tmpP.x, y = tmpP.y - h * 0.5 - 6;
        var x0 = x - w / 2 - 3, x1 = x + w / 2 + 3, y0 = y - h / 2 - 2, y1 = y + h / 2 + 2;
        if (x0 < 234 || x1 > 846) continue;
        var ok = true;
        for (var q = 0; q < rects.length; q++) { var o = rects[q]; if (x0 < o[1] && x1 > o[0] && y0 < o[3] && y1 > o[2]) { ok = false; break; } }
        if (!ok) continue;
        rects.push([x0, x1, y0, y1]);
        labels.push({ b: b, th: th, fresh: fresh, sz: sz, rank: rankOf(b.u, top) });
        break;
      }
    }
  }
  function drawLabels(ctx) {
    var tnow = now();
    for (var i = 0; i < labels.length; i++) {
      var lb = labels[i], b = lb.b;
      if (b.dead) continue;
      A.knotPos(G, b, lb.th, tmpP);
      var tag = ui.nameTag(b.u, lb.sz, lb.fresh ? '#fff36b' : '#ffffff', 'rgba(0,0,0,0.62)');
      var age = tnow - b.born;
      var sc = age < 0.3 ? ease.outBack(clamp(age / 0.3, 0, 1)) : 1;
      var w = tag.width * sc, h = tag.height * sc;
      var x = tmpP.x, y = tmpP.y - tag.height * 0.5 - 6;
      ctx.fillStyle = b.d;
      ctx.beginPath(); ctx.moveTo(x - 6, y + h / 2 - 1); ctx.lineTo(x + 6, y + h / 2 - 1); ctx.lineTo(x, y + h / 2 + 6); ctx.closePath(); ctx.fill();
      ctx.drawImage(tag, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
      if (lb.rank >= 0) ui.emoji(ctx, MEDALS[lb.rank], x - w / 2 - 14, y, 26);
    }
  }

  // ---------------------------------------------------------------------------
  // Lastik katmanı önbelleği
  // ---------------------------------------------------------------------------
  function cacheUsable() { return S.st === 'play' && S.bands.length > 14; }
  function refreshBandCache(t) {
    var tn = now(), i, b;
    if (tn - BC.t < (S.queue.length > 15 ? KP.tune.cacheInt * 1.8 : KP.tune.cacheInt)) return;
    var need = BC.dirty || abs(S.pv - BC.pv) > 0.004 || tn - BC.t > 1;
    for (i = 0; !need && i < S.bands.length; i++) { b = S.bands[i]; if (!b.cached && b.snap === 0 && tn - b.born > 0.35) need = true; }
    if (!need) return;
    A.computeGeom(GREF, S.F, { x: 540, base: A.BASE_Y, pv: S.pv, sq: 0, press: 0, bands: S.bands, waist: S.waist });
    var settled = [];
    for (i = 0; i < S.bands.length; i++) { b = S.bands[i]; b.cached = b.snap === 0 && tn - b.born > 0.35; if (b.cached) settled.push(b); }
    var w = Math.ceil(GREF.RX * 2.4 + 60), h = Math.ceil(GREF.RY * 1.3 + 160);
    if (!BC.front || BC.front.width < w || BC.front.height < h) { BC.front = A.mk(w, h); BC.back = A.mk(w, h); }
    BC.x0 = 540 - BC.front.width / 2; BC.y0 = GREF.cy - BC.front.height / 2;
    var fc = BC.front.getContext('2d'), bc = BC.back.getContext('2d');
    fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, BC.front.width, BC.front.height);
    bc.setTransform(1, 0, 0, 1, 0, 0); bc.clearRect(0, 0, BC.back.width, BC.back.height);
    fc.setTransform(1, 0, 0, 1, -BC.x0, -BC.y0); bc.setTransform(1, 0, 0, 1, -BC.x0, -BC.y0);
    A.drawBandsFront(fc, GREF, settled, t, max(0, settled.length - 24), true);
    A.drawBandsBack(bc, GREF, settled);
    BC.t = tn; BC.pv = S.pv; BC.dirty = false; BC.ok = true;
  }
  // Önbellek görüntüsünü güncel meyve biçimine eşle (taban noktası etrafında ölçek + titreme kayması)
  function drawCacheImg(ctx, img) {
    var sx = (1 + fruit.sq) * (1 + fruit.press * 0.6), sy = (1 - fruit.sq * 0.85) * (1 - fruit.press);
    ctx.save();
    ctx.translate(fruit.x + fruit.ox, A.BASE_Y + fruit.oy); ctx.scale(sx, sy); ctx.translate(-540, -A.BASE_Y);
    ctx.drawImage(img, BC.x0, BC.y0);
    ctx.restore();
  }
  function backFn(ctx) {
    drawCacheImg(ctx, BC.back);
    A.drawBandsBack(ctx, G, BC.live);
  }

  // ---------------------------------------------------------------------------
  // Çizim
  // ---------------------------------------------------------------------------
  function buildTitle() {
    var parts = T.title.split(' ');
    var em = parts.pop(), txt = parts.join(' ');
    var c = A.mk(1000, 136), x = c.getContext('2d');
    x.font = ui.font(92, 900);
    var tw = x.measureText(txt).width;
    var total = tw + 18 + 100;
    var sc = min(1, 960 / total);
    x.save();
    x.translate(500, 70); x.scale(sc, sc);
    var x0 = -total / 2;
    x.textAlign = 'left'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.lineWidth = 26; x.strokeStyle = '#0b3d14'; x.strokeText(txt, x0, 5);
    x.lineWidth = 24; x.strokeStyle = '#1d6b25'; x.strokeText(txt, x0, 0);
    x.lineWidth = 10; x.strokeStyle = '#f4ffd8'; x.strokeText(txt, x0, 0);
    var gr = x.createLinearGradient(0, -46, 0, 46);
    gr.addColorStop(0, '#ff8a98'); gr.addColorStop(0.5, '#ff2d55'); gr.addColorStop(1, '#c8102e');
    x.fillStyle = gr; x.fillText(txt, x0, 0);
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(x0, -30, tw, 0); // (yer tutucu)
    x.font = '100px ' + ui.EMOJI_FONT; x.fillText(em, x0 + tw + 18, 6);
    x.restore();
    return c;
  }

  function chip(ctx, x, y, w, h, text, color, bump) {
    ui.panel(ctx, x, y, w, h, { r: h / 2, fill: 'rgba(20,10,32,0.68)', border: 'rgba(255,255,255,0.24)', lineWidth: 3 });
    ui.text(ctx, text, x + w / 2, y + h / 2 + 2, { size: 30 * (1 + (bump || 0) * 0.22), maxWidth: w - 26, color: color });
  }

  function drawMeter(ctx, t) {
    var x = L.x0, y = L.meterY, w = L.hw, h = L.meterH;
    var done = S.st === 'boom' || S.st === 'result' || S.st === 'sweep';
    var pv = done ? 1 : clamp(S.pv, 0, 1);
    var danger = !done && pv > 0.85;
    ctx.save();
    if (danger) ctx.translate((Math.random() - 0.5) * 5, 0);
    ui.panel(ctx, x, y, w, h, { r: h / 2, fill: 'rgba(15,8,25,0.78)', border: danger ? 'rgba(255,60,60,' + (0.6 + 0.4 * sin(t * 14)).toFixed(2) + ')' : 'rgba(255,255,255,0.3)', lineWidth: danger ? 6 : 4 });
    var fw = (w - 10) * pv;
    if (fw > 2) {
      ctx.save();
      ui.roundRect(ctx, x + 5, y + 5, max(h - 10, fw), h - 10, (h - 10) / 2); ctx.clip();
      var gr = ctx.createLinearGradient(x, 0, x + w, 0);
      gr.addColorStop(0, '#22c55e'); gr.addColorStop(0.42, '#facc15'); gr.addColorStop(0.7, '#fb923c'); gr.addColorStop(1, '#ef233c');
      ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      for (var sx = x - 60 + (t * 90) % 44; sx < x + fw + 44; sx += 44) { ctx.moveTo(sx, y + h); ctx.lineTo(sx + 22, y + h); ctx.lineTo(sx + 44, y); ctx.lineTo(sx + 22, y); ctx.closePath(); }
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y + 5, w, (h - 10) * 0.35);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (var k = 1; k < 4; k++) ctx.fillRect(x + w * k / 4 - 1.5, y + 10, 3, h - 20);
    var hx = x + 5 + max(h / 2, fw);
    ui.emoji(ctx, S.F.emoji, min(x + w - 26, hx), y + h / 2 + sin(t * 10) * (danger ? 4 : 1.5), 48 + (danger ? 6 * sin(t * 20) : 0), 0.9);
    var lvl = done ? T.burstLevel : T.levels[pv < 0.4 ? 0 : pv < 0.65 ? 1 : pv < 0.85 ? 2 : 3];
    ui.text(ctx, T.tension + ' %' + Math.round(pv * 100) + '  ·  ' + lvl, x + w / 2, y + h / 2 + 2, { size: 31, maxWidth: w - 140, strokeWidth: 7 });
    ctx.restore();
  }

  function drawTagFit(ctx, u, x, y, size, maxW, color, bg) {
    var tag = ui.nameTag(u, size, color, bg);
    var s = tag.width > maxW ? maxW / tag.width : 1;
    ctx.drawImage(tag, Math.round(x - tag.width * s / 2), Math.round(y - tag.height * s / 2), tag.width * s, tag.height * s);
  }

  // Yan paneller (son lastikler / kahramanlar): içerik değişince ara katmana çizilir
  var GC = { l: null, r: null, ver: -1, t: -9 };
  function renderGutters() {
    var w = L.gW, h = L.gBot - L.gTop;
    if (!GC.l) { GC.l = A.mk(w, h); GC.r = A.mk(w, h); }
    var lc = GC.l.getContext('2d'), rc = GC.r.getContext('2d');
    lc.clearRect(0, 0, w, h); rc.clearRect(0, 0, w, h);
    var rowH = (h - 56) / 5, i, cy;
    // sol: son lastikler
    ui.panel(lc, 2, 2, w - 4, h - 4, { r: 26, fill: 'rgba(20,10,32,0.52)', border: 'rgba(255,255,255,0.18)', lineWidth: 3 });
    ui.text(lc, '🎗️ ' + T.lastTitle, w / 2, 30, { size: 25, color: '#ffd166', maxWidth: w - 16 });
    if (!S.recent.length) ui.text(lc, T.emptyList, w / 2, 56 + rowH * 0.5, { size: 24, color: 'rgba(255,255,255,0.8)', maxWidth: w - 16 });
    for (i = 0; i < S.recent.length; i++) {
      var r = S.recent[i];
      cy = 56 + rowH * i + rowH * 0.36;
      ui.avatar(lc, r.u, w / 2, cy, i === 0 ? 29 : 25, { ring: i === 0 ? '#ffd166' : '#ffffff', ringWidth: i === 0 ? 5 : 3 });
      drawTagFit(lc, r.u, w / 2, cy + 45, 21, w - 14, i === 0 ? '#fff36b' : '#ffffff');
    }
    // sağ: kahramanlar
    ui.panel(rc, 2, 2, w - 4, h - 4, { r: 26, fill: 'rgba(20,10,32,0.52)', border: 'rgba(255,209,102,0.35)', lineWidth: 3 });
    ui.text(rc, '🏆 ' + T.heroesTitle, w / 2, 30, { size: 25, color: '#ffd166', maxWidth: w - 16 });
    var top = S.board.top(5);
    if (!top.length) ui.text(rc, T.emptyList, w / 2, 56 + rowH * 0.5, { size: 24, color: 'rgba(255,255,255,0.8)', maxWidth: w - 16 });
    for (i = 0; i < top.length; i++) {
      var e = top[i];
      cy = 56 + rowH * i + rowH * 0.36;
      ui.avatar(rc, e.user, w / 2 - 22, cy, 25, { ring: i === 0 ? '#ffd166' : '#ffffff', ringWidth: 3 });
      if (i < 3) ui.emoji(rc, MEDALS[i], w / 2 - 50, cy - 18, 26);
      ui.text(rc, '×' + e.score, w / 2 + 34, cy + 2, { size: 26, color: '#ffd166', maxWidth: 76 });
      drawTagFit(rc, e.user, w / 2, cy + 45, 21, w - 14, '#ffffff');
    }
    GC.t = now(); GC.ver = gutVer;
  }
  var gutVer = 0;
  function drawGutters(ctx, t) {
    var tn = now();
    if (!GC.l || (GC.ver !== gutVer && tn - GC.t > 0.2) || tn - GC.t > 1.5) renderGutters();
    var y0 = L.gTop, w = L.gW, xl = SAFE.x, xr = SAFE.x + SAFE.w - w;
    ctx.drawImage(GC.l, xl, y0); ctx.drawImage(GC.r, xr, y0);
    // en yeni katılanın çevresinde dalga (canlı)
    if (S.recent.length) {
      var age = tn - S.recent[0].t;
      if (age < 0.7) {
        var cy = y0 + 56 + ((L.gBot - L.gTop - 56) / 5) * 0.36;
        ctx.strokeStyle = 'rgba(255,209,102,' + (1 - age / 0.7).toFixed(3) + ')'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(xl + w / 2, cy, 30 + age * 60, 0, TAU); ctx.stroke();
      }
    }
    void t;
  }

  function drawNote(ctx) {
    if (!notes.length) return;
    var n = notes[0], life = noteLife();
    var a = min(1, n.t / 0.15, max(0, (life - n.t) / 0.25));
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    if (!n.w) { ctx.font = ui.font(30, 800); n.w = min(820, ctx.measureText(n.text).width + 100); }
    var y = L.noteY, x = 540 - n.w / 2;
    var sc = n.t < 0.2 ? ease.outBack(clamp(n.t / 0.2, 0, 1)) : 1;
    ctx.translate(540, y); ctx.scale(sc, sc); ctx.translate(-540, -y);
    ui.panel(ctx, x, y - 27, n.w, 54, { r: 27, fill: 'rgba(15,8,25,0.8)', border: n.color, lineWidth: 3 });
    ui.emoji(ctx, n.icon, x + 34, y, 32);
    ui.text(ctx, n.text, x + 60, y + 2, { size: 30, align: 'left', color: n.color, maxWidth: n.w - 80 });
    ctx.restore();
  }

  function drawBanner(ctx, bn, t) {
    var a = min(1, bn.t / 0.25, (bn.dur - bn.t) / 0.35);
    if (a <= 0) return;
    var sc = ease.outBack(clamp(bn.t / 0.4, 0, 1));
    var big = bn.tier >= 5;
    var y = big ? 1000 : 990;
    ctx.save();
    ctx.globalAlpha = a;
    if (big) {
      var rg = ctx.createRadialGradient(540, y - 300, 20, 540, y - 300, 640);
      rg.addColorStop(0, 'rgba(255,215,0,0.5)'); rg.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 230, W, 1070);
    }
    ctx.translate(540, y); ctx.scale(sc, sc);
    var bw = 920, bh = big ? 250 : 196;
    ui.panel(ctx, -bw / 2, -bh / 2, bw, bh, { r: 36, fill: big ? 'rgba(70,16,90,0.94)' : 'rgba(28,12,48,0.92)', border: '#ffd166', lineWidth: 6 });
    var ar = big ? 76 : 62;
    ui.avatar(ctx, bn.u, -bw / 2 + ar + 28, 0, ar, { ring: '#ffd166', ringWidth: 6 });
    var tx = -bw / 2 + ar * 2 + 54, mw = bw - ar * 2 - 54 - 150;
    ui.text(ctx, bn.title, tx, -bh * 0.29, { size: big ? 40 : 34, align: 'left', maxWidth: mw });
    ui.text(ctx, bn.sub, tx, 2, { size: big ? 56 : 46, align: 'left', maxWidth: mw, color: '#ffd166' });
    ui.text(ctx, bn.thanks, tx, bh * 0.31, { size: 32, align: 'left', maxWidth: mw, color: '#ff9ec4' });
    ui.emoji(ctx, bn.emoji, bw / 2 - 82, sin(t * 8) * 8, big ? 120 : 96);
    ctx.restore();
  }

  function drawResult(ctx, t) {
    var R = S.res;
    if (!R) return;
    var tt = S.st === 'result' ? S.t : 9.5 + S.t;
    var fade = S.st === 'sweep' ? max(0, 1 - S.t / 0.4) : min(1, S.t / 0.3);
    if (fade <= 0) return;
    ctx.save();
    ctx.globalAlpha = fade;
    var dg = ctx.createLinearGradient(0, 480, 0, 1300);
    dg.addColorStop(0, 'rgba(20,5,30,0.2)'); dg.addColorStop(0.15, 'rgba(20,5,30,0.55)'); dg.addColorStop(1, 'rgba(20,5,30,0.55)');
    ctx.fillStyle = dg; ctx.fillRect(0, 480, W, 820);
    // PATLATAN paneli
    var k1 = ease.outBack(clamp(tt / 0.5, 0, 1));
    ctx.save();
    ctx.translate(540, 676);
    ctx.save(); ctx.rotate(t * 0.4);
    ctx.fillStyle = 'rgba(255,214,102,0.16)';
    ctx.beginPath();
    for (var i = 0; i < 14; i++) { var a = i / 14 * TAU; ctx.moveTo(0, 0); ctx.lineTo(cos(a - 0.09) * 700, sin(a - 0.09) * 700); ctx.lineTo(cos(a + 0.09) * 700, sin(a + 0.09) * 700); ctx.closePath(); }
    ctx.fill();
    ctx.restore();
    ctx.scale(k1, k1);
    ui.panel(ctx, -465, -126, 930, 252, { r: 40, fill: 'rgba(66,10,40,0.94)', border: '#ffd166', lineWidth: 7 });
    ui.text(ctx, T.burster, 0, -90, { size: 44, color: '#ffd166' });
    if (R.u) {
      ui.avatar(ctx, R.u, -335, 26, 74, { ring: '#ffd166', ringWidth: 7 });
      ui.emoji(ctx, '👑', -335, -52, 54);
      ui.text(ctx, R.u.name, -235, 2, { size: 64, align: 'left', maxWidth: 660 });
      ui.text(ctx, T.together, -235, 66, { size: 38, align: 'left', color: '#ffe8a3', maxWidth: 660 });
    } else {
      ui.text(ctx, T.burstEveryone + ' 🎉', 0, 4, { size: 72 });
      ui.text(ctx, T.together, 0, 68, { size: 38, color: '#ffe8a3' });
    }
    ctx.restore();
    // istatistik
    var k2 = clamp((tt - 0.35) / 0.4, 0, 1);
    ctx.globalAlpha = fade * k2;
    ui.text(ctx, fmt(T.statBands, { n: R.units }) + '    ' + fmt(T.statPeople, { n: R.people }) + '    ' + fmt(T.statTime, { t: fmtTime(R.time) }), 540, 830, { size: 38, maxWidth: 960 });
    if (R.guess) ui.text(ctx, fmt(R.guess.d === 0 ? T.exact : T.closest, { name: R.guess.u.name, g: R.guess.g }), 540, 876, { size: 33, color: '#7dffb0', maxWidth: 960 });
    // kahramanlar
    var k3 = clamp((tt - 0.7) / 0.5, 0, 1);
    ctx.globalAlpha = fade * k3;
    ctx.save();
    ctx.translate(0, (1 - ease.outCubic(k3)) * 80);
    S.board.draw(ctx, 220, 902, 640, { title: T.heroes, n: 5, unit: ' 🎗️', rowH: 46, fill: 'rgba(15,8,30,0.88)', empty: '—' });
    ctx.restore();
    ctx.restore();
  }

  function drawWorld(ctx, t) {
    ctx.drawImage(bg, 0, 0);
    A.drawSky(ctx, t);
    var F = S.F, i;
    // tahtadaki meyve suyu birikintisi
    if (puddle > 0.02 && F.burst === 'juice') {
      ctx.fillStyle = F.juice; ctx.globalAlpha = 0.55 * min(1, puddle * 1.5);
      ctx.beginPath(); ctx.ellipse(540, A.BASE_Y + 10, 110 + 230 * puddle, 16 + 22 * puddle, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // takip çıkartmaları
    for (i = 0; i < stickers.length; i++) A.drawSticker(ctx, stickers[i], now());
    // gölge + meyve
    if (fruit.visible) {
      var mw = 0;
      for (i = 0; i <= A.N; i += 8) if (G.hw[i] > mw) mw = G.hw[i];
      ctx.fillStyle = 'rgba(60,15,0,0.3)';
      ctx.beginPath(); ctx.ellipse(G.cx + 16, A.BASE_Y + 4, mw * 0.82, 22, 0, 0, TAU); ctx.fill();
      ctx.save();
      if (fruit.rot) { ctx.translate(G.cx, G.cy); ctx.rotate(fruit.rot); ctx.translate(-G.cx, -G.cy); }
      var glow = S.st === 'critical' ? 0.55 + 0.45 * sin(t * 30) : max(0, S.pv - 0.8) * 2.5 * (0.5 + 0.5 * sin(t * 8));
      var useC = cacheUsable();
      if (useC) {
        refreshBandCache(t);
        BC.live.length = 0;
        for (i = 0; i < S.bands.length; i++) if (!S.bands[i].cached) BC.live.push(S.bands[i]);
      } else { BC.ok = false; for (i = 0; i < S.bands.length; i++) S.bands[i].cached = false; }
      useC = useC && BC.ok;
      A.drawFruitBody(ctx, G, { bands: S.bands, backFn: useC ? backFn : null, cracks: cracks, pv: S.pv, tease: S.crackBoost + S.tease * 0.15 + (S.st === 'critical' ? S.t * 0.5 : 0), drips: drips, t: t, glow: glow });
      if (useC) {
        drawCacheImg(ctx, BC.front);
        A.drawBandsFront(ctx, G, BC.live, t, 0);
        A.drawSparkles(ctx, G, S.bands, t, 24);
      } else A.drawBandsFront(ctx, G, S.bands, t, max(0, S.bands.length - 30));
      ctx.restore();
    }
    // düşen damlalar
    for (i = 0; i < drips.length; i++) if (drips[i].st) A.teardrop(ctx, drips[i].x, drips[i].y, drips[i].r, F.juice);
    // pres
    if (press) {
      var pt = press.t, top = A.topY(G) + 6, py;
      if (pt < 0.45) py = lerp(-90, top, ease.inOutSine(pt / 0.45));
      else if (pt < 1.65) py = top;
      else py = lerp(top, -90, ease.inOutSine(clamp((pt - 1.65) / 0.5, 0, 1)));
      A.drawPress(ctx, G.cx, py, 600, t);
    }
    for (i = 0; i < rings.length; i++) A.drawFallingRing(ctx, rings[i]);
    // parçacıklar
    for (i = 0; i < fx.length; i++) {
      var p = fx[i];
      if (p.k === 'chunk') A.drawChunk(ctx, p, F);
      else if (p.k === 'drop') {
        ctx.globalAlpha = min(1, (1 - p.t / p.life) * 2);
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (p.k === 'seed') {
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 0.6, p.r, p.rot, 0, TAU); ctx.fill();
      } else if (p.k === 'wave') {
        var qw = p.t / p.life, rw = 80 + qw * 760;
        ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - qw) * 0.85).toFixed(3) + ')'; ctx.lineWidth = 34 * (1 - qw) + 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, rw, rw * 0.8, 0, 0, TAU); ctx.stroke();
      } else if (p.k === 'heart') {
        ui.emoji(ctx, '❤️', p.x, p.y, p.s, 1 - p.t / p.life);
      }
    }
    if (fruit.visible && (S.st === 'play' || S.st === 'critical')) drawLabels(ctx);
  }

  function drawHUD(ctx, t) {
    var F = S.F;
    // başlık
    var s = 1 + clamp(fruit.sq, -0.1, 0.12) * 0.3 + sin(t * 2.4) * 0.012;
    var tw = titleImg.width, th = titleImg.height;
    var sc = min(1, L.hw / tw) * s;
    ctx.drawImage(titleImg, L.hcx - tw * sc / 2, L.titleY - th * sc / 2, tw * sc, th * sc);
    // çipler
    var cw = L.hw, gap = 14 * cw / 1000;
    var w1 = cw * 0.37, w2 = cw * 0.28, w3 = cw - w1 - w2 - gap * 2, y = L.chipY;
    chip(ctx, L.x0, y, w1, L.chipH, T.round + ' ' + S.round + ' · ' + F.emoji + ' ' + KP.fruitName(F), '#ffffff');
    chip(ctx, L.x0 + w1 + gap, y, w2, L.chipH, '🎗️ ' + S.units + ' ' + T.bandsUnit, '#ffd166', S.unitsBump);
    chip(ctx, L.x0 + w1 + w2 + gap * 2, y, w3, L.chipH, S.guessOpen ? '🎯 ' + S.guesses.size + ' ' + T.guessChip : '🎯 ' + T.guessClosedChip, S.guessOpen ? '#7dffb0' : 'rgba(255,255,255,0.65)');
    drawMeter(ctx, t);
    if (S.st !== 'result' && S.st !== 'boom' && S.st !== 'sweep') drawGutters(ctx, t);
    // giriş afişi
    if (S.st === 'intro') {
      var k = clamp((S.t - 0.15) / 0.45, 0, 1), a = clamp((2.3 - S.t) / 0.3, 0, 1);
      if (k > 0 && a > 0) {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(540, 650); var ks = ease.outBack(k); ctx.scale(ks, ks);
        ui.text(ctx, fmt(T.roundN, { n: S.round }), 0, -78, { size: 46, color: '#ffd166' });
        ui.text(ctx, F.emoji + ' ' + fmt(T.arrived, { f: KP.fruitName(F) }), 0, 0, { size: 86, strokeWidth: 16, maxWidth: 820 });
        ui.text(ctx, T.ready, 0, 74, { size: 42, color: '#7dffb0' });
        ctx.restore();
      }
    }
    // ilk lastik çağrısı
    if (S.st === 'play' && S.units === 0 && !S.queue.length && !banner) {
      var pz = 1 + 0.04 * sin(t * 5);
      ctx.save();
      ctx.translate(540, G.cy); ctx.scale(pz, pz);
      ui.panel(ctx, -380, -44, 760, 88, { r: 44, fill: 'rgba(15,8,25,0.78)', border: '#ffd166', lineWidth: 4 });
      ui.text(ctx, T.firstCall, 0, 2, { size: 40, maxWidth: 720 });
      ctx.restore();
    }
    if (banner) drawBanner(ctx, banner, t);
    drawNote(ctx);
    ui.hintBar(ctx, 170, L.hintY, 740, T.hints, { h: L.hintH, size: 36 });
  }

  function render(ctx, t) {
    ctx.save();
    ui.applyShake(ctx);
    ctx.save();
    if (cam.z !== 1) { ctx.translate(G.cx, G.cy); ctx.scale(cam.z, cam.z); ctx.translate(-G.cx, -G.cy); }
    drawWorld(ctx, t);
    ctx.restore();
    // kritik an: kırmızı kenar
    var vgA = S.st === 'critical' ? 0.5 + 0.2 * sin(t * 26) : S.st === 'play' && S.pv > 0.85 ? 0.16 * (0.5 + 0.5 * sin(t * 6)) : 0;
    if (vgA > 0) {
      var vg = ctx.createRadialGradient(540, 820, 320, 540, 820, 1050);
      vg.addColorStop(0, 'rgba(255,0,40,0)'); vg.addColorStop(1, 'rgba(255,0,40,' + vgA.toFixed(3) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    drawHUD(ctx, t);
    var tnow = now();
    for (var i = 0; i < splats.length; i++) A.drawSplat(ctx, splats[i], tnow);
    if (S.st === 'result' || S.st === 'sweep') drawResult(ctx, t);
    if (S.st === 'freeze') A.drawComic(ctx, G.cx, G.cy - 30, S.F.word, 0.3 + 0.75 * ease.outBack(clamp(S.t / 0.16, 0, 1)), t, S.F.outline === '#123d14' ? '#d61f3c' : null);
    else if (S.st === 'boom' && S.t < 1.1) {
      ctx.save(); ctx.globalAlpha = clamp((1.1 - S.t) / 0.4, 0, 1);
      A.drawComic(ctx, G.cx, G.cy - 30, S.F.word, 1.05 + S.t * 0.25, t);
      ctx.restore();
    }
    if (S.st === 'sweep') A.drawWiper(ctx, wiperX, t);
    ctx.restore();
  }

  // Test/geliştirme için (yayında etkisiz)
  KP.debug = { S: S, fruit: fruit, newFruit: function () { newFruit(); }, startPlay: function () { startPlay(); }, crit: function () { startCritical(S.lastUser); }, tease: tease, progress: progress };

  LG.start({
    id: 'karpuz-patlat',
    title: 'Karpuz Patlat! 🍉',
    init: function () {
      bg = A.buildBg();
      titleImg = buildTitle();
      sessionStart = 0;
      newFruit();
    },
    update: update,
    render: render,
  });
})();
