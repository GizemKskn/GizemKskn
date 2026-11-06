/*
 * İNECEK VAR! 🚐 — İzleyiciler dolmuşun yolcusu.
 *  💬 Yorum   → durakta bekle (dolmuşun peşinden koş), durunca bin
 *  🛑 "inecek var" → sonraki durakta in (5+ kişi aynı anda → şoför frene asılır)
 *  ❤️ Beğeni  → dolmuş hızlanır (hız göstergesi)
 *  🎁 Hediye  → para elden ele şoföre uzatılır, süs, turbo, uçan dolmuş, Ay seferi
 *  Rota: 8 durak (~3-4 dk) → SON DURAK özeti → yeni rota.
 */
(function () {
  'use strict';
  var D = window.DOL, A = D.art, ui = LG.ui;
  var W = LG.W, PI = Math.PI, TAU = PI * 2;
  var clamp = LG.clamp, lerp = LG.lerp, rand = LG.rand, pick = LG.pick;

  ui.celebrateEnabled = false; // kendi dolmuş temalı teşekkür bandımız var
  // Ortak bildirimler yukarı doğru 5 tane yığılıp dolmuşu kapatıyordu: kendi kompakt
  // bildirimlerimizi çiziyoruz (en fazla 2 satır, aynı türdekiler birleşir).
  ui.toastsEnabled = false;

  // Sahne ölçüleri
  var GROUND = 1048;             // tekerlek tabanı
  var BUS_X = 540, BUS_Y = GROUND - 50;
  var ROAD_TOP = 1000, ROAD_BOT = 1094;
  var STOP_X = 968;              // durakta tabelanın duracağı x (şoförün önünü kapatmasın)
  var BASE_V = 420, KMH = 42;    // px/sn ve km/sa çevirisi
  var SEG_TIME = 18;             // iki durak arası (sn, normal hızda)
  var VIS_MAX = 60, CROWD_VIS = 24;
  var CROWD_S = 0.82;

  // ---------------------------------------------------------------------------
  // Yolcu yerleri (dolmuş yerel koordinatı)
  // ---------------------------------------------------------------------------
  var SLOTS = [];
  (function () {
    var F = [-280, -205, -130, -55, 20, 90, 170], B = [-335, -243, -168, -93, -18, 55, 135], i;
    F.forEach(function (x) { SLOTS.push({ kind: 'seat', inside: true, layer: 2, x: x, y: -176, r: 21 }); });
    B.forEach(function (x) { SLOTS.push({ kind: 'seat', inside: true, layer: 0, x: x, y: -199, r: 18 }); });
    for (i = 0; i < 14; i++) SLOTS.push({ kind: 'stand', inside: true, layer: 1, x: -345 + i * 41.5, y: -224 + (i % 2) * 7, r: 19, tilt: i % 2 ? 0.16 : -0.13 });
    for (i = 0; i < 10; i++) SLOTS.push({ kind: 'roofSit', x: -318 + i * 61, s: 0.58 });
    for (i = 0; i < 4; i++) SLOTS.push({ kind: 'door', x: 228 + (i % 2) * 14, y: -48 - i * 50, s: 0.5 });
    [[-392, -236], [-404, -180], [-394, -124], [-408, -70], [-432, -210]].forEach(function (p, k) { SLOTS.push({ kind: 'rear', x: p[0], y: p[1], s: 0.55, k: k }); });
    for (i = 0; i < 8; i++) SLOTS.push({ kind: 'roofStand', x: -288 + i * 67, s: 0.52 });
    SLOTS.push({ kind: 'ladder', x: -408, y: -150, s: 0.58 });
    SLOTS.push({ kind: 'bumper', x: 396, y: -34, s: 0.5 });
    SLOTS.push({ kind: 'bumper', x: 410, y: -84, s: 0.46 });
    SLOTS.push({ kind: 'armchair', x: -40, s: 0.56 });
    SLOTS.push({ kind: 'skate', x: -505, y: 0, s: 0.6 });
  })();

  // Yerin o anki (şişmeye göre) merkez noktası
  function slotPos(sl, f, out) {
    var s = sl.s || 1;
    switch (sl.kind) {
      case 'roofSit': out.x = sl.x; out.y = A.roofY(sl.x, f) - 22 * s; break;
      case 'roofStand': out.x = sl.x; out.y = A.roofY(sl.x, f) - 4 - 47 * s; break;
      case 'armchair': out.x = sl.x; out.y = A.roofY(sl.x, f) - 34 - 18 * s; break;
      case 'skate': out.x = sl.x; out.y = 50 - 16 - 47 * s; break;
      default: out.x = sl.x; out.y = sl.y;
    }
    return out;
  }
  function headLocal(p, out) {
    var sl = p.slot;
    if (!sl) { out.x = p.dx; out.y = p.dy; return out; }
    if (sl.inside) { out.x = p.dx; out.y = p.dy - sl.r; return out; }
    var s = sl.s;
    if (sl.kind === 'rear') { out.x = p.dx - 30; out.y = p.dy + 10; return out; }
    out.x = p.dx; out.y = p.dy - 46 * s; return out;
  }

  // ---------------------------------------------------------------------------
  // Durum
  // ---------------------------------------------------------------------------
  var G = {
    state: 'stopped', st: 0, phase: 'open', pt: 0,
    routeIdx: 0, palIdx: 0, route: null, pal: null, stopIdx: 0,
    seg: 0, v: 0, v0: 0, brakeT: 1.6, brakeDist: 0, speedMul: 1, likeHeat: 0, kwBoost: 0,
    scroll: 0, door: 0, doorAjar: 0, winOpen: 0, klimaT: 0, musicT: 0,
    leaveList: [], leaveAcc: 0, boardAcc: 0, forceGo: false, skipToEnd: false,
    lastEmerg: -99, lastHonk: -99, chatterT: 7, fastT: 3, hatT: 1,
    signX: STOP_X, signName: '', signOn: true, signScroll0: 0,
    plateFlip: -1, plateText: '', seq: 0, bumpT: 1,
    shineT: 0, driverMood: '', driverMoodT: 0, tempo: 1, kmh: 0, offReq: [],
  };
  var bus = { x: BUS_X, y: BUS_Y, alt: 0, pitch: 0, pitchV: 0, pitchTarget: 0, bounce: 0, bounceV: 0, lurch: 0, lurchV: 0, sq: 0, sqV: 0, wheelRot: 0, f: 0, wheelieW: 0, extraRot: 0, dx: 0 };
  var BT = { tx: 0, ty: 0, px: 0, py: 0, rot: 0, sx: 1, sy: 1, cos: 1, sin: 0 };
  var tmp = { x: 0, y: 0 }, tmp2 = { x: 0, y: 0 };

  var aboard = [], byUser = new Map(), hiddenCount = 0, slotsDirty = true, slotTimer = 0;
  var crowd = [], crowdById = new Map();
  var hoppers = [], leavers = [], bubbles = [], passes = [], pendingPasses = [];
  var banners = [], banner = null, bigTexts = [];
  var decor = {}, decorPop = {};
  var fx = { turbo: null, flight: null, rocket: null }, bigQueue = [];
  var skids = [], props = [], gulls = [], clouds = [], stars = [], lines = [];
  var strips = { far: null, mid: null };
  var stats = null, session = { carried: 0, routes: 0 };
  var summary = null;
  var decorCarry = [];           // son durak/özet sırasında gelen süsler: yeni rotada takılır
  var fClouds = [];              // uçuşta dolmuşun altından geçen bulutlar
  var flyK = 0;                  // uçuş yüksekliği oranı (0..1)

  // ---------------------------------------------------------------------------
  // Kompakt bildirimler (takip/paylaşım): en fazla 2 satır, aynı tür birleşir
  // ---------------------------------------------------------------------------
  var toasts = [];
  var TOAST_X = 52, TOAST_Y = 1190;
  function toast(key, name, one, many, icon, color) {
    for (var i = 0; i < toasts.length; i++) {
      var o = toasts[i];
      if (o.key === key && key && o.t < 3) {
        o.n++; o.name = name; o.t = Math.min(o.t, 0.25); o.w = 0;
        o.text = name + ' ve ' + (o.n - 1) + ' kişi daha ' + many;
        return;
      }
    }
    toasts.unshift({ key: key, name: name, n: 1, text: one ? name + ' ' + one : name, icon: icon, color: color, t: 0, life: 3.4 });
    if (toasts.length > 2) toasts.length = 2;
  }
  function drawToasts(ctx) {
    for (var i = 0; i < toasts.length; i++) {
      var o = toasts[i];
      var a = o.t < 0.25 ? o.t / 0.25 : o.t > o.life - 0.4 ? Math.max(0, (o.life - o.t) / 0.4) : 1;
      var y = TOAST_Y - i * 60;
      if (!o.w) { ctx.save(); ctx.font = ui.font(30, 800); o.w = Math.min(640, ctx.measureText(o.text).width + 88); ctx.restore(); }
      ctx.save(); ctx.globalAlpha = a;
      ui.panel(ctx, TOAST_X, y - 26, o.w, 52, { r: 26, fill: 'rgba(0,0,0,0.66)', border: false });
      ui.emoji(ctx, o.icon, TOAST_X + 30, y, 30);
      ui.text(ctx, o.text, TOAST_X + 54, y + 2, { size: 28, align: 'left', color: o.color, maxWidth: o.w - 70 });
      ctx.restore();
    }
  }
  LG.on('softcap', function (e) { if (e.user) toast('', e.user.name + ', efsanesin! Çok teşekkürler 💖', '', '', '👑', '#ffd166'); });

  function newStats() {
    return { carried: new Set(), longest: null, off: new Map(), relays: new Map(), maxAboard: 0, moments: [], korna: 0, klima: 0, music: 0 };
  }
  function moment(score, text) { stats.moments.push({ score: score, text: text }); }

  // ---------------------------------------------------------------------------
  // Dolmuş dönüşümü
  // ---------------------------------------------------------------------------
  function computeBT() {
    var f = bus.f;
    var wob = f > 0.55 ? Math.sin(LG.time * 7) * 0.014 * f : 0;
    BT.tx = bus.x + bus.dx; BT.ty = bus.y - bus.alt + bus.bounce;
    BT.px = -235 * bus.wheelieW; BT.py = 0;
    BT.rot = bus.pitch + bus.extraRot;
    var fsc = 1 - 0.16 * flyK; // uçarken biraz küçülür: şehrin üstünde yükseliyor hissi
    BT.sx = (1 + 0.08 * f + wob) * (1 + bus.sq) * fsc;
    BT.sy = (1 + 0.14 * f - wob) * (1 - bus.sq) * fsc;
    BT.cos = Math.cos(BT.rot); BT.sin = Math.sin(BT.rot);
  }
  function applyBT(ctx) {
    ctx.translate(BT.tx + BT.px, BT.ty + BT.py); ctx.rotate(BT.rot); ctx.translate(-BT.px, -BT.py); ctx.scale(BT.sx, BT.sy);
  }
  function toWorld(lx, ly, out) {
    var x = lx * BT.sx - BT.px, y = ly * BT.sy - BT.py;
    out.x = x * BT.cos - y * BT.sin + BT.px + BT.tx;
    out.y = x * BT.sin + y * BT.cos + BT.py + BT.ty;
    return out;
  }

  // ---------------------------------------------------------------------------
  // Rota
  // ---------------------------------------------------------------------------
  function setRoute(idx, palIdx) {
    G.routeIdx = idx % D.ROUTES.length;
    G.route = D.ROUTES[G.routeIdx];
    G.palIdx = palIdx % D.PALETTES.length;
    G.pal = D.PALETTES[G.palIdx];
    var seed = 1000 + G.routeIdx * 77 + G.palIdx * 13;
    strips.far = A.makeFar(G.pal, seed);
    strips.mid = A.makeMid(G.pal, seed + 5);
    skyGrad = null;
    G.stopIdx = 0; G.seg = 0; G.skipToEnd = false;
    decor = {}; decorPop = {};
    stats = newStats();
    G.plateFlip = 0; G.nextPlate = routeSign();
    LG.store.set('dolmus:route', G.routeIdx + 1);
  }
  function routeSign() { return G.route.sign; }
  function stopName(i) { return G.route.stops[clamp(i, 0, G.route.stops.length - 1)]; }
  function lastStop() { return G.route.stops.length - 1; }

  // ---------------------------------------------------------------------------
  // Yolcular
  // ---------------------------------------------------------------------------
  function isInside(p) { return p.slot && p.slot.inside; }
  function makePassenger(u) {
    var p = {
      u: u, seq: ++G.seq, boardStop: G.stopIdx, dest: G.stopIdx + LG.randi(3, 7), wantOff: false,
      slot: null, dx: A.BUS.doorC.x, dy: -90, tagT: 8, handT: 0, act: LG.time, phase: Math.random() * TAU,
      hop: false, k: (LG.hash(u.id) % 100) / 100, born: LG.time,
    };
    aboard.push(p); byUser.set(u.id, p);
    stats.carried.add(u.id); session.carried++;
    if (aboard.length > stats.maxAboard) stats.maxAboard = aboard.length;
    slotsDirty = true;
    return p;
  }
  function assignSlots() {
    slotsDirty = false; slotTimer = aboard.length > VIS_MAX ? 1.0 : 0.15;
    var vis = aboard;
    if (aboard.length > VIS_MAX) {
      vis = aboard.slice().sort(function (a, b) { return b.act - a.act; }).slice(0, VIS_MAX);
      vis.sort(function (a, b) { return a.seq - b.seq; });
    }
    for (var i = 0; i < aboard.length; i++) aboard[i].slot = null;
    for (i = 0; i < vis.length; i++) vis[i].slot = SLOTS[i];
    hiddenCount = aboard.length - vis.length;
  }
  function removePassenger(p) {
    var i = aboard.indexOf(p);
    if (i >= 0) aboard.splice(i, 1);
    byUser.delete(p.u.id);
    slotsDirty = true;
    var ride = Math.max(0, G.stopIdx - p.boardStop);
    if (ride > 0 && (!stats.longest || ride >= stats.longest.n)) stats.longest = { u: p.u, n: ride };
  }

  // ---------------------------------------------------------------------------
  // Konuşma balonları
  // ---------------------------------------------------------------------------
  function shortText(s, n) {
    var a = Array.from(String(s || '').trim());
    return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join('');
  }
  // owner: {p} | {c} | {l} | 'driver' | {x,y}
  function say(owner, text, o) {
    o = o || {};
    if (!text) return null;
    var st = shortText(text, 28);
    for (var d = 0; d < bubbles.length; d++) if (bubbles[d].text === st && bubbles[d].t < 1.6) return null; // aynı lafı tekrarlama
    for (var i = bubbles.length - 1; i >= 0; i--) {
      if (bubbles[i].owner === owner || (owner.p && bubbles[i].owner.p === owner.p) || (owner.c && bubbles[i].owner.c === owner.c)) bubbles.splice(i, 1);
    }
    var max = o.prio ? 7 : 5;
    if (bubbles.length >= max) {
      var idx = -1;
      for (var j = 0; j < bubbles.length; j++) if (!bubbles[j].prio) { idx = j; break; }
      if (idx < 0) { if (!o.prio) return null; idx = 0; }
      bubbles.splice(idx, 1);
    }
    var b = { owner: owner, text: shortText(text, 28), name: o.name || '', color: o.color, t: 0, life: o.life || 2.8, prio: !!o.prio, bg: o.bg, border: o.border, ink: o.ink, ax: 540, ay: 600 };
    A.measureBubble(LG.ctx, b);
    bubbles.push(b);
    return b;
  }
  function sayP(p, text, o) { return say({ p: p }, text, o); }
  function sayDriver(text, o) { o = o || {}; o.bg = o.bg || '#fff3b0'; o.border = '#7a5a00'; return say('driver', text, o); }
  function randomInside() {
    var c = [];
    for (var i = 0; i < aboard.length; i++) if (aboard[i].slot && !aboard[i].hop) c.push(aboard[i]);
    return c.length ? pick(c) : null;
  }

  // ---------------------------------------------------------------------------
  // Kalabalık (sonraki durakta bekleyenler — dolmuşun peşinden koşarlar)
  // ---------------------------------------------------------------------------
  function joinCrowd(u) {
    if (byUser.has(u.id)) return null;
    var c = crowdById.get(u.id);
    if (c) { c.act = LG.time; c.tagT = 5; return c; }
    c = { u: u, x: W + 60 + Math.random() * 80, y: 1194, phase: Math.random() * TAU, born: LG.time, tagT: 7, act: LG.time };
    crowd.push(c); crowdById.set(u.id, c);
    if (crowd.length > 800) { var old = crowd.shift(); crowdById.delete(old.u.id); }
    return c;
  }
  function crowdTarget(j, out) {
    var row = 2 - Math.floor(j / 8) % 3, col = j % 8;
    out.x = 648 + col * 50 + (row % 2) * 24;
    out.y = 1146 + row * 24;
    return out;
  }

  // ---------------------------------------------------------------------------
  // Hareket: duraklar, fren
  // ---------------------------------------------------------------------------
  function startStopState(kind) {
    G.state = kind; G.st = 0; G.phase = 'open'; G.pt = 0; G.leaveAcc = 0; G.boardAcc = 0; G.forceGo = false;
    G.leaveList = [];
    if (kind === 'final') {
      bigText('SON DURAK!', stopName(lastStop()), '#ffd400', 3.2, 120);
      LG.sfx('fanfare'); ui.burst(W / 2, 640, { count: 70, speed: 800 });
      G.signName = stopName(lastStop());
    } else if (kind === 'stopped') {
      G.signName = stopName(G.stopIdx);
    }
    LG.sfx('whoosh');
  }
  function buildLeaveList() {
    var list = [];
    for (var i = 0; i < aboard.length; i++) {
      var p = aboard[i];
      var go = G.state === 'final' ? true : G.state === 'estop' ? p.wantOff : (p.wantOff || p.dest <= G.stopIdx);
      if (go) list.push(p);
    }
    // görünmeyenler anında iner
    var vis = [];
    for (var k = 0; k < list.length; k++) {
      if (list[k].slot && !list[k].hop) vis.push(list[k]); else removePassenger(list[k]);
    }
    vis.sort(function (a, b) { return (b.slot.x) - (a.slot.x); });
    G.leaveList = vis;
  }
  function alightOne(p) {
    if (!byUser.has(p.u.id)) return;
    removePassenger(p);
    toWorld(A.BUS.doorC.x, -70, tmp);
    if (leavers.length > 18) leavers.shift();
    var l = { u: p.u, x: tmp.x, y: tmp.y, x0: tmp.x, y0: tmp.y, tx: tmp.x - rand(10, 70), ty: rand(1150, 1196), t: 0, phase: Math.random() * TAU, wave: p.wantOff, tagT: 4 };
    leavers.push(l);
    LG.sfx('pop');
    if (bubbles.length < 3 && (p.wantOff || Math.random() < 0.3)) say({ l: l }, pick(D.BYE), { life: 2 });
  }
  function boardTick(dt) {
    var n = 0;
    while (crowd.length > CROWD_VIS && n < 30) { // görünmeyenler toplu biner
      var c0 = crowd.shift(); crowdById.delete(c0.u.id);
      if (!byUser.has(c0.u.id)) makePassenger(c0.u).dx = A.BUS.doorC.x;
      n++;
    }
    G.boardAcc += dt;
    var gap = crowd.length > 12 ? 0.11 : 0.2;
    if (G.boardAcc >= gap && crowd.length && hoppers.length < 6) {
      G.boardAcc = 0;
      var c = crowd.shift(); crowdById.delete(c.u.id);
      if (byUser.has(c.u.id)) return;
      var p = makePassenger(c.u); p.hop = true;
      hoppers.push({ p: p, x0: c.x, y0: c.y - 40, t: 0, dur: 0.42 });
      LG.sfx('boing');
      if (Math.random() < 0.18) say({ x: c.x, y: c.y - 80 }, pick(D.CROWD_IN), { life: 1.6 });
    }
  }
  function driverShout() {
    var name = stopName(G.stopIdx).toLocaleUpperCase('tr-TR');
    var tail = aboard.length > 40 ? pick(['Arkada yer var!', 'Bir kişi daha!', 'Sıkışın!']) : pick(['Atla atla!', 'Yer var!', 'Son iki kişi!']);
    sayDriver(shortText(name, 16) + '! ' + tail, { prio: true, life: 2.6 });
    G.driverMood = 'shout'; G.driverMoodT = 1.5;
  }
  function startDepart() {
    var fromStop = G.state === 'stopped' || G.state === 'final';
    G.state = 'depart'; G.st = 0; G.door = 0;
    if (G.skipToEnd) G.brakeNow = true; // B: son durağa doğrudan
    if (fromStop) { G.signScroll0 = G.scroll; G.signX = STOP_X; }
    bus.pitchV -= 0.5; bus.lurchV -= 120;
    LG.sfx('whoosh');
    if (aboard.length > 0 && Math.random() < 0.5) {
      var p = randomInside();
      if (p) sayP(p, pick(['Hadi bakalım!', 'Kapıyı kapat!', 'Oh, oturdum sonunda', 'Arkaya ilerleyelim!']), { life: 2.2 });
    }
  }
  function startBrake() {
    G.state = 'brake'; G.st = 0; G.v0 = Math.max(G.v, 120);
    G.brakeT = 1.7;
    G.brakeDist = G.v0 * G.brakeT / 2;
    var nextIdx = G.skipToEnd ? lastStop() : G.stopIdx + 1;
    G.nextStopIdx = nextIdx;
    G.signName = stopName(nextIdx);
    LG.sfx('whoosh');
  }
  function emergency(byHost) {
    if (G.state !== 'drive' && G.state !== 'depart') {
      if (byHost) { bus.lurchV += 260; bus.pitchV += 0.6; ui.shake(6, 0.25); sayDriver('Bi dakka!', { prio: true, life: 1.5 }); }
      return;
    }
    var req = 0;
    for (var i = 0; i < aboard.length; i++) if (aboard[i].wantOff) req++;
    G.state = 'ebrake'; G.st = 0; G.v0 = Math.max(G.v, 200);
    G.lastEmerg = LG.time;
    G.driverMood = 'angry'; G.driverMoodT = 2.5;
    sayDriver('Bi dakka!', { prio: true, life: 2.4, border: '#c1121f' });
    bigText('Bİ DAKKA! 🛑', req >= 5 ? req + ' kişi "inecek var" dedi!' : 'Şoför frene asıldı!', '#ff4d6d', 2.2, 96);
    LG.sfx('zap'); LG.sfx('wrong'); setTimeout(function () { LG.sfx('laugh'); }, 350);
    ui.shake(16, 0.55);
    skids.push({ wx: G.scroll + BUS_X - 235, len: 0 }, { wx: G.scroll + BUS_X + 245, len: 0 });
    if (skids.length > 8) skids.splice(0, skids.length - 8);
    if (req >= 5) moment(60 + req, req + ' kişi aynı anda "inecek var" dedi, şoför frene asıldı! 🛑');
  }

  // ---------------------------------------------------------------------------
  // Anahtar kelimeler
  // ---------------------------------------------------------------------------
  var KW = {
    inecek: ['inecek', 'inicek', 'inecek var', 'musait', 'müsait', 'müsait bir yerde', 'durakta inecek', 'indir', 'inecem', 'inecez', 'inebilir miyim'],
    klima: ['klima', 'cam', 'camı aç', 'cami ac', 'pencere', 'havalandır', 'sıcak', 'cereyan'],
    muzik: ['müzik', 'muzik', 'şarkı', 'sarki', 'arabesk', 'teyp', 'radyo', 'türkü'],
    korna: ['korna', 'düt', 'dut', 'bip', 'dıt', 'korna çal'],
    yavas: ['yavaş', 'yavas', 'yavaşla', 'yavasla', 'dur', 'sakin'],
    bas: ['bas', 'bas gaza', 'gaz', 'hızlan', 'hizlan', 'hızlı', 'hizli', 'turbo'],
  };
  function requestOff(u, p) {
    if (!p) return false;
    if (!p.wantOff) {
      p.wantOff = true; p.act = LG.time; p.tagT = 99;
      var off = stats.off.get(u.id) || { u: u, n: 0 }; off.n++; stats.off.set(u.id, off);
      var offB = 0;
      for (var ob = 0; ob < bubbles.length; ob++) if (bubbles[ob].kind === 'off') offB++;
      if (offB < 3) { var bb = sayP(p, pick(D.OFF), { prio: true, life: 2.6, bg: '#ffe3e3', border: '#c1121f' }); if (bb) bb.kind = 'off'; }
      LG.sfx('bell');
      slotsDirty = true;
      G.offReq.push(LG.time);
      var cut = LG.time - 4;
      while (G.offReq.length && G.offReq[0] < cut) G.offReq.shift();
      if (G.offReq.length >= 5 && (G.state === 'drive' || G.state === 'depart') && LG.time - G.lastEmerg > 28 && !fx.flight && !fx.rocket && !fx.turbo) emergency(false);
    }
    return true;
  }
  function honk() {
    if (LG.time - G.lastHonk < 0.6) return;
    G.lastHonk = LG.time; stats.korna++;
    LG.sfx('honk', { gap: 1 });
    if (decor.boynuz) { setTimeout(function () { LG.sfx('honk', { gap: 1 }); }, 200); setTimeout(function () { LG.sfx('honk', { gap: 1 }); }, 420); }
    toWorld(380, -150, tmp);
    ui.float(pick(D.HONK), Math.min(tmp.x, 880), tmp.y - 40, { color: '#ffd400', size: 52, vy: -90, life: 1.2 });
    bus.bounceV -= 90; bus.sqV += 1.2;
    for (var i = 0; i < gulls.length; i++) gulls[i].scare = 1.6;
  }
  function klima() {
    var was = G.klimaT > 0;
    G.klimaT = Math.min(28, G.klimaT + 12);
    if (!was) {
      stats.klima++;
      LG.sfx('whoosh');
      ui.float('🌬️ Camlar açıldı!', 540, 640, { color: '#bde0fe', size: 44, life: 1.6 });
      var p = randomInside();
      if (p) sayP(p, pick(D.KLIMA), { life: 2.6 });
      if (stats.klima === 1) moment(20, 'Klima açıldı, teyze "cereyan yapıyor" dedi 🌬️');
    }
  }
  function music() {
    var was = G.musicT > 0;
    G.musicT = Math.min(45, G.musicT + 20);
    if (!was) {
      stats.music++;
      LG.music.play('halay'); LG.music.setTempo(0.9); G.tempo = 0.9;
      ui.float('🎶 Arabesk modu!', 540, 640, { color: '#ffd166', size: 46, life: 1.8 });
      var p = randomInside();
      if (p) sayP(p, pick(D.MUSIC), { life: 2.6 });
      if (stats.music === 1) moment(25, 'Arabesk çaldı, bütün dolmuş sallandı 🎶');
    }
  }
  function speedKw(dir, u) {
    G.gaugeCol = dir > 0 ? '#ffd166' : '#4cc9f0'; G.gaugeT = 0.8;
    if (dir > 0) {
      G.kwBoost = Math.min(1.1, G.kwBoost + 0.3);
      // egzozdan "gaz" bulutu
      if (Math.random() < 0.5 && !fx.rocket) { toWorld(-372, -40, tmp); ui.float('💨 Gaz!', Math.max(110, tmp.x), tmp.y, { color: '#ffd166', size: 34, life: 1.1, vy: -90 }); }
    } else {
      G.kwBoost = Math.max(-0.65, G.kwBoost - 0.3);
      if (Math.random() < 0.5 && !fx.rocket) { toWorld(330, -40, tmp); ui.float('🐢 Yavaş!', Math.min(940, tmp.x), tmp.y, { color: '#a7f3d0', size: 34, life: 1.1, vy: -90 }); }
      if (Math.random() < 0.15) { var p = randomInside(); if (p) sayP(p, pick(D.SLOW), { life: 2 }); }
    }
  }

  // ---------------------------------------------------------------------------
  // Olaylar
  // ---------------------------------------------------------------------------
  LG.on('chat', function (e) {
    var u = e.user; if (!u) return;
    var raw = e.raw || e.text || '';
    var k = LG.cmd.match(raw, KW);
    var p = byUser.get(u.id);
    var showText = !e.flagged && e.text ? e.text : '';
    if (p) {
      p.act = LG.time; p.tagT = Math.max(p.tagT, 5);
      if (p.dest < G.stopIdx + 2) p.dest = G.stopIdx + 2; // aktif yolcu biraz daha gider
      if (k === 'inecek') requestOff(u, p);
      else if (showText && Math.random() < 0.7) sayP(p, showText, { name: u.name, color: u.color, life: 2.6 });
      if (hiddenCount > 0) slotsDirty = true;
    } else {
      var c = joinCrowd(u);
      if (c) {
        if (e.isNew) LG.sfx('join'); else LG.sfx('pop');
        if (k === 'inecek') say({ c: c }, pick(D.NOT_ON), { life: 2 });
        // ilk kez yazan herkes yorumunu adıyla görür (yer varsa); diğerleri yarı yarıya
        else if (showText && bubbles.length < (e.isNew ? 5 : 4) && (e.isNew || Math.random() < 0.5)) say({ c: c }, showText, { name: u.name, color: u.color, life: 2.4 });
        else if (e.isNew && bubbles.length < 3 && (G.state === 'stopped' || G.state === 'drive') && Math.random() < 0.35) sayDriver(pick(D.NEW_HI) + ' ' + shortText(u.name, 12) + '!', { life: 1.8 });
      }
    }
    if (k === 'klima') klima();
    else if (k === 'muzik') music();
    else if (k === 'korna') honk();
    else if (k === 'bas') speedKw(1, u);
    else if (k === 'yavas') speedKw(-1, u);
  });

  LG.on('like', function (e) {
    G.likeHeat = Math.min(2.4, G.likeHeat + Math.min(60, e.count) * 0.006);
    if (!(G.gaugeT > 0.4)) { G.gaugeCol = '#ff4d6d'; G.gaugeT = 0.35; }
    if (LG.time - (G.lastHeart || 0) > 0.12) {
      G.lastHeart = LG.time;
      // hız göstergesinin yanından (göstergeyi kapatmadan) yükselen kalpler
      ui.float('❤', 196 + rand(-12, 12), 344, { color: '#ff4d6d', size: 30, vy: -80, life: 0.9 });
    }
  });

  LG.on('gift', function (e) {
    var u = e.user, g = e.gift; if (!u || !g) return;
    var tier = g.tier || 1;
    var eff = tier >= 3 ? (spotAllowed(u, tier, g.total) ? tier : 2) : tier;
    var p = byUser.get(u.id);
    if (p) { p.act = LG.time; p.tagT = 7; slotsDirty = slotsDirty || hiddenCount > 0; }
    else joinCrowd(u);
    var sub;
    if (eff === 1) sub = 'Parayı uzattı: "' + pick(D.PAY) + '" 💵';
    else if (eff === 2) sub = 'Para üstü geldi! Teşekkürler 💰';
    else if (eff === 3) { var carry = G.state === 'summary' || G.state === 'final'; var d = addDecor(u); sub = d ? (carry ? 'Yeni sefere süs: ' : 'Dolmuşu süsledi: ') + d.name + ' ' + d.emoji : 'Dolmuş pırıl pırıl parladı! ✨'; }
    else if (eff === 4) { sub = 'TURBO! Dolmuş şaha kalkıyor 🔥'; queueBig({ type: 'turbo', u: u }); }
    else if (eff === 5) { sub = 'Dolmuş kanatlandı, uçuyoruz! 🕊️'; queueBig({ type: 'flight', u: u }); }
    else { sub = 'AY SEFERİ! 🚀🌙 Efsanesin!'; queueBig({ type: 'rocket', u: u }); }
    queueBanner(u, g, eff, sub);
    // özet kartı açıkken dolmuş boş ve kartın arkasında: para uzatma animasyonu yok, teşekkür bandı yeter
    if (G.state !== 'summary') queuePass(u, eff, g.count);
  });

  LG.on('follow', function (e) {
    if (!e.user) return;
    toast('follow', e.user.name, 'abonman kart aldı', 'abonman kart aldı', '💳', '#06d6a0');
    LG.sfx('heart');
    var p = byUser.get(e.user.id);
    if (p) sayP(p, 'Abonman kartım var! 💳', { life: 2.2 });
    else joinCrowd(e.user);
  });
  LG.on('share', function (e) {
    if (!e.user) return;
    toast('share', e.user.name, 'arkadaşını da çağırdı', 'arkadaşlarını çağırdı', '📣', '#4cc9f0');
    LG.sfx('join');
    var p = byUser.get(e.user.id);
    if (p) sayP(p, 'Gelin gelin, yer var! 📣', { life: 2.2 });
  });

  // ---------------------------------------------------------------------------
  // Hediye: para uzatma, süs, büyük efektler, teşekkür bandı
  // ---------------------------------------------------------------------------
  // Ortak yumuşak sınır, hediyenin kendisi de sayılarak kontrol ediliyor (tek büyük hediye hep sadeleşiyordu).
  // Bu yüzden sınırı hediyeden ÖNCEKİ jeton toplamıyla kontrol ediyoruz.
  function spotAllowed(u, tier, total) {
    if (u._coinsBeforeLast != null) return ui.spotlightAllowed(u, tier); // yeni ortak kod bunu zaten yapıyor
    var c = u.coins;
    u.coins = Math.max(0, c - (total || 0));
    try { return ui.spotlightAllowed(u, tier); } finally { u.coins = c; }
  }
  function queueBanner(u, g, tier, sub) {
    for (var i = 0; i < banners.length; i++) {
      var b = banners[i];
      if (b.u === u && b.gname === g.name) { b.count += g.count; if (tier > b.tier) { b.tier = tier; b.sub = sub; } return; }
    }
    if (banner && banner.u === u && banner.gname === g.name && banner.t < banner.dur - 0.6) { banner.count += g.count; banner.t = Math.min(banner.t, 0.5); return; }
    banners.push({ u: u, gname: g.name, emoji: LG.giftEmoji(g), count: g.count, tier: tier, sub: sub, t: 0, dur: tier >= 5 ? 5 : tier >= 3 ? 3.4 : 2.2 });
    if (banners.length > 8) {
      // küçükleri at, büyükleri tut
      for (var k = 0; k < banners.length; k++) if (banners[k].tier <= 2) { banners.splice(k, 1); break; }
      if (banners.length > 8) banners.shift();
    }
  }
  function queuePass(u, tier, count) {
    var job = { u: u, tier: tier, count: count || 1 };
    if (passes.length < 3) startPass(job);
    else {
      for (var i = 0; i < pendingPasses.length; i++) if (pendingPasses[i].u === u) { pendingPasses[i].count += job.count; pendingPasses[i].tier = Math.max(pendingPasses[i].tier, tier); return; }
      pendingPasses.push(job);
      if (pendingPasses.length > 6) pendingPasses.shift();
    }
  }
  function startPass(job) {
    var u = job.u, p = byUser.get(u.id);
    var from;
    if (p && p.slot && !p.hop) { headLocal(p, tmp); from = { x: tmp.x, y: tmp.y + 8, p: p }; }
    else from = { x: -350, y: -190, p: null };
    var cands = [];
    for (var i = 0; i < aboard.length; i++) {
      var q = aboard[i];
      if (q !== p && isInside(q) && !q.hop && q.dx > from.x + 30 && q.dx < 225) cands.push(q);
    }
    cands.sort(function (a, b) { return a.dx - b.dx; });
    var path = [from], n = Math.min(4, cands.length);
    for (i = 0; i < n; i++) { var c = cands[Math.floor((i + 0.5) * cands.length / n)]; path.push({ x: c.dx, y: c.dy - 4, p: c }); }
    path.push({ x: 262, y: -172, driver: true });
    var pass = { u: u, tier: job.tier, count: job.count, path: path, seg: 0, t: 0, back: false, done: false };
    passes.push(pass);
    if (from.p) sayP(from.p, pick(D.PAY), { prio: true, life: 2.2 });
    else { toWorld(-340, -230, tmp); say({ x: tmp.x + 60, y: tmp.y }, pick(D.PAY), { name: u.name, color: u.color, prio: true, life: 2.2 }); }
  }
  function updatePasses(dt) {
    for (var i = passes.length - 1; i >= 0; i--) {
      var ps = passes[i];
      var segDur = ps.back ? 0.16 : 0.32;
      ps.t += dt;
      if (ps.t >= segDur) {
        ps.t = 0; ps.seg++;
        var node = ps.back ? ps.path[ps.path.length - 1 - ps.seg] : ps.path[ps.seg];
        if (node && node.p && byUser.has(node.p.u.id)) {
          node.p.handT = 0.45;
          if (!ps.back) {
            var rl = stats.relays.get(node.p.u.id) || { u: node.p.u, n: 0 }; rl.n++; stats.relays.set(node.p.u.id, rl);
            if (ps.seg === 1 && Math.random() < 0.6) sayP(node.p, pick(D.PASS), { life: 1.4 });
          }
          LG.sfx('tick');
        }
        if (ps.seg >= ps.path.length - 1) {
          if (!ps.back) {
            LG.sfx('coin');
            G.driverMood = 'shout'; G.driverMoodT = 1;
            toWorld(262, -200, tmp);
            ui.float(ps.count > 1 ? '+' + ps.count + ' tam' : '+1 tam', tmp.x - 30, tmp.y - 30, { color: '#7CFC9A', size: 34, life: 1.1 });
            if (ps.tier >= 2) {
              ps.back = true; ps.seg = 0; ps.t = 0;
              sayDriver(pick(D.CHANGE), { life: 1.6 });
            } else {
              sayDriver(pick(D.THANKS) + ' ' + shortText(ps.u.name, 12), { life: 1.8 });
              ps.done = true;
            }
          } else {
            LG.sfx('coin');
            var gp = byUser.get(ps.u.id);
            if (gp && gp.slot) sayP(gp, 'Sağ ol şoför bey!', { life: 1.8 });
            var f0 = ps.path[0];
            toWorld(f0.x, f0.y, tmp);
            ui.burst(tmp.x, tmp.y, { count: 12, shape: 'circle', colors: ['#ffd166', '#ffe58a', '#f4b400'], speed: 260, size: 12, life: 0.8 });
            ps.done = true;
          }
        }
      }
      if (ps.done) { passes.splice(i, 1); if (pendingPasses.length) startPass(pendingPasses.shift()); }
    }
  }
  function addDecor(u) {
    var next = null, i;
    // Son durakta / özet kartında süs takılırsa rota sıfırlanınca kaybolurdu: yeni rotaya taşı
    if (G.state === 'summary' || G.state === 'final') {
      var have = {};
      for (i = 0; i < decorCarry.length; i++) have[decorCarry[i].id] = true;
      for (i = 0; i < D.DECOR.length; i++) if (!have[D.DECOR[i].id]) { next = D.DECOR[i]; break; }
      if (!next) return null;
      decorCarry.push({ id: next.id, name: u.name, d: next });
      LG.sfx('levelup');
      return next;
    }
    for (i = 0; i < D.DECOR.length; i++) if (!decor[D.DECOR[i].id]) { next = D.DECOR[i]; break; }
    if (!next) { G.shineT = 1.4; LG.sfx('bell'); return null; }
    decor[next.id] = true; decorPop[next.id] = LG.time;
    LG.sfx('levelup');
    toWorld(0, -160, tmp);
    ui.burst(tmp.x, tmp.y, { count: 10, shape: 'emoji', emoji: next.emoji, speed: 420, size: 13, life: 0.9 });
    ui.burst(tmp.x, tmp.y, { count: 30, speed: 500, life: 0.9 });
    G.shineT = 1.2;
    moment(30, u.name + ' dolmuşa ' + next.name.toLocaleLowerCase('tr-TR') + ' taktı ' + next.emoji);
    return next;
  }
  function decorScale(id) {
    var t0 = decorPop[id];
    if (t0 == null) return 1;
    var k = (LG.time - t0) / 0.6;
    return k >= 1 ? 1 : Math.max(0.01, LG.ease.outBack(k));
  }
  var BIG_RANK = { turbo: 1, flight: 2, rocket: 3 };
  function queueBig(job) {
    // büyük kademe önce (aynı kademede geliş sırası korunur)
    var i = bigQueue.length;
    while (i > 0 && BIG_RANK[bigQueue[i - 1].type] < BIG_RANK[job.type]) i--;
    bigQueue.splice(i, 0, job);
    if (bigQueue.length > 4) bigQueue.pop();
  }
  function bigTick() {
    if (!bigQueue.length) return;
    var top = BIG_RANK[bigQueue[0].type];
    // daha büyük bir hediye bekliyorsa süren küçük efekti kısa kes (hediye sahibini bekletme)
    if (fx.turbo && top > 1) fx.turbo.t = Math.max(fx.turbo.t, fx.turbo.dur * 0.86);
    if (fx.flight && top > 2) fx.flight.t = Math.max(fx.flight.t, fx.flight.dur * 0.86);
    if (fx.turbo || fx.flight || fx.rocket) return;
    // durakta bekliyorsak inen-binen bitince hemen kalk (efekt yolda oynar)
    if (G.state === 'stopped' && G.phase === 'board' && G.st > 2.2) G.forceGo = true;
    if (G.state !== 'drive') return;
    var job = bigQueue.shift(), u = job.u;
    if (job.type === 'turbo') {
      fx.turbo = { t: 0, dur: 4.2, u: u };
      bigText('TURBO! 🔥', u.name, '#ff9f1c', 2.4, 110);
      LG.sfx('zap'); LG.sfx('boom'); ui.shake(12, 0.5);
      moment(55, u.name + " TURBO'ya bastı, dolmuş şaha kalktı! 🔥");
    } else if (job.type === 'flight') {
      fx.flight = { t: 0, dur: 10, u: u };
      bigText('DOLMUŞ UÇUYOR! 🕊️', u.name + ' sayesinde', '#bde0fe', 3, 96, 1150);
      LG.sfx('mega'); ui.flash('#fff6d0', 0.25); ui.shake(14, 0.5);
      LG.music.play('race');
      moment(90, u.name + ' sayesinde dolmuş kanatlanıp uçtu! 🕊️');
    } else {
      fx.rocket = { t: 0, u: u, stage: 0 };
      LG.music.play('tension');
      moment(100, u.name + " dolmuşu Ay'a götürdü! 🚀🌙");
    }
  }

  // ---------------------------------------------------------------------------
  // Büyük yazılar
  // ---------------------------------------------------------------------------
  function bigText(text, sub, color, life, size, y) {
    bigTexts.push({ text: text, sub: sub || '', color: color || '#ffd400', t: 0, life: life || 2, size: size || 100, y: y || 0 });
    if (bigTexts.length > 3) bigTexts.shift();
  }

  // ---------------------------------------------------------------------------
  // Sahne kurulumu
  // ---------------------------------------------------------------------------
  var PROP_TYPES = ['simitci', 'kedi', 'cay', 'cicek', 'marti', 'kopek', 'kedi', 'cop', 'marti', 'cay'];
  function initScene() {
    var x = -100;
    for (var i = 0; i < 6; i++) { x += rand(260, 480); props.push({ type: pick(PROP_TYPES), x: x, seed: LG.randi(0, 99) }); }
    for (i = 0; i < 5; i++) gulls.push({ x: rand(0, W), y: rand(500, 640), s: rand(0.7, 1.1), ph: rand(0, 6), scare: 0, dy: 0 });
    for (i = 0; i < 5; i++) clouds.push({ x: rand(0, W + 200), y: rand(250, 560), s: rand(0.7, 1.4) });
    stars = A.makeStars(42);
    for (i = 0; i < 20; i++) lines.push({ x: rand(0, W), y: rand(480, 1180), len: rand(90, 280), k: rand(0.7, 1.4) });
  }

  // ---------------------------------------------------------------------------
  // Güncelleme
  // ---------------------------------------------------------------------------
  function update(dt, t) {
    G.st += dt; G.pt += dt;
    var vPrev = G.v;
    G.likeHeat *= Math.exp(-dt * 0.25);
    G.kwBoost *= Math.exp(-dt * 0.1);
    var turboK = 0;
    if (fx.turbo) { var tk = fx.turbo.t / fx.turbo.dur; turboK = tk < 0.15 ? tk / 0.15 : tk > 0.85 ? (1 - tk) / 0.15 : 1; }
    var mul = 1 + G.likeHeat + G.kwBoost + turboK * 1.6 + (fx.flight ? 1.0 : 0);
    G.speedMul = clamp(mul, 0.45, 4.4);

    // durum makinesi
    switch (G.state) {
      case 'stopped': case 'final': case 'estop': stopUpdate(dt); G.v = 0; break;
      case 'depart':
        var k = Math.min(1, G.st / 1.2);
        G.v = BASE_V * G.speedMul * LG.ease.inOutSine(k);
        G.signX = STOP_X - (G.scroll - G.signScroll0);
        if (k >= 1) { G.state = 'drive'; G.st = 0; }
        break;
      case 'drive':
        G.v += (BASE_V * G.speedMul - G.v) * Math.min(1, dt * 2.2);
        G.seg += dt * (0.7 + 0.3 * Math.min(G.speedMul, 2.5));
        G.signX = STOP_X - (G.scroll - G.signScroll0);
        // büyük hediye efekti sıradaysa önce o oynasın, sonra durağa yanaş
        if ((G.brakeNow || (G.seg >= SEG_TIME && !bigQueue.length)) && !fx.flight && !fx.rocket && !fx.turbo && bus.alt < 2) { G.brakeNow = false; startBrake(); }
        break;
      case 'brake':
        var bk = Math.min(1, G.st / G.brakeT);
        G.v = G.v0 * (1 - bk);
        // kalan mesafe: v0*T*(1-bk)^2/2
        G.signX = STOP_X + G.brakeDist * (1 - bk) * (1 - bk);
        if (bk >= 1) {
          G.v = 0; G.seg = 0;
          G.stopIdx = G.nextStopIdx;
          bus.sqV += 1.6; bus.lurchV += 80;
          LG.sfx('drum');
          if (G.stopIdx >= lastStop()) startStopState('final'); else startStopState('stopped');
        }
        break;
      case 'ebrake':
        var ek = Math.min(1, G.st / 0.45);
        G.v = G.v0 * (1 - ek);
        if (skids.length >= 2) { skids[skids.length - 1].len += G.v * dt; skids[skids.length - 2].len += G.v * dt; }
        G.signX = STOP_X - (G.scroll - G.signScroll0);
        if (ek >= 1) {
          G.v = 0; bus.sqV += 2.2;
          var any = false;
          for (var i = 0; i < aboard.length; i++) if (aboard[i].wantOff) { any = true; break; }
          if (any) { G.state = 'estop'; G.st = 0; G.phase = 'open'; G.pt = 0; G.leaveAcc = 0; G.leaveList = []; }
          else { G.state = 'pause'; G.st = 0; sayDriver(pick(['Pardon, kedi geçti! 🐈', 'Martı vardı!', 'Simitçi geçiyordu!']), { life: 2 }); }
        }
        break;
      case 'pause':
        G.v = 0;
        if (G.st > 1.2) startDepart();
        break;
      case 'summary':
        G.v = 0;
        if (G.st > 11 || G.forceGo) { G.forceGo = false; newRoute(); }
        break;
    }
    if (G.state === 'stopped' || G.state === 'final' || G.state === 'summary') G.signX = STOP_X;

    // fizik
    var acc = clamp((G.v - vPrev) / Math.max(dt, 0.001), -2600, 2600);
    if (G.state === 'ebrake') acc = -2200;
    physics(dt, acc, t);
    G.scroll += G.v * dt;
    G.kmh = G.v / BASE_V * KMH;
    bus.wheelRot += G.v * dt / 50;

    // şişme
    var fTarget = clamp((aboard.length - 14) / 46, 0, 1);
    bus.f += (fTarget - bus.f) * Math.min(1, dt * 1.6);
    G.doorAjar += ((aboard.length > 28 && G.door < 0.05 ? 1 : 0) - G.doorAjar) * Math.min(1, dt * 4);

    // camlar, müzik
    if (G.klimaT > 0) G.klimaT -= dt;
    G.winOpen += ((G.klimaT > 0 ? 1 : 0) - G.winOpen) * Math.min(1, dt * 2.5);
    if (G.musicT > 0) { G.musicT -= dt; if (G.musicT <= 0 && !fx.flight && !fx.rocket) LG.music.play('chill'); }
    else if (!fx.flight && !fx.rocket) {
      var tempo = clamp(0.8 + 0.18 * G.speedMul, 0.8, 1.5);
      if (Math.abs(tempo - G.tempo) > 0.06) { G.tempo = tempo; LG.music.setTempo(tempo); }
    }
    if (G.shineT > 0) G.shineT -= dt;
    if (G.gaugeT > 0) G.gaugeT -= dt;
    for (var ti = toasts.length - 1; ti >= 0; ti--) { toasts[ti].t += dt; if (toasts[ti].t > toasts[ti].life) toasts.splice(ti, 1); }
    if (G.driverMoodT > 0) { G.driverMoodT -= dt; if (G.driverMoodT <= 0) G.driverMood = ''; }
    if (G.plateFlip >= 0) { G.plateFlip += dt / 0.9; if (G.plateFlip >= 0.5 && G.nextPlate) { G.plateText = G.nextPlate; G.nextPlate = null; } if (G.plateFlip >= 1) G.plateFlip = -1; }

    // yolcular
    if (slotTimer > 0) slotTimer -= dt;
    if (slotsDirty && slotTimer <= 0) assignSlots();
    var f = bus.f;
    for (var j = 0; j < aboard.length; j++) {
      var p = aboard[j];
      if (p.tagT > 0 && p.tagT < 90) p.tagT -= dt;
      if (p.handT > 0) p.handT -= dt;
      if (p.slot) {
        slotPos(p.slot, f, tmp);
        var kk = Math.min(1, dt * 5);
        p.dx += (tmp.x - p.dx) * kk; p.dy += (tmp.y - p.dy) * kk;
      }
    }
    // biniş zıplayanları
    for (var h = hoppers.length - 1; h >= 0; h--) {
      var hp = hoppers[h]; hp.t += dt;
      if (hp.t >= hp.dur || !byUser.has(hp.p.u.id)) {
        hp.p.hop = false; hp.p.dx = A.BUS.doorC.x; hp.p.dy = -120;
        hoppers.splice(h, 1);
      }
    }
    // inenler
    for (var l = leavers.length - 1; l >= 0; l--) {
      var lv = leavers[l]; lv.t += dt;
      if (lv.t > 0.45) { lv.x -= (110 + G.v) * dt; lv.phase += dt * 2.2; }
      if (lv.tagT > 0) lv.tagT -= dt;
      if (lv.t > 6 || lv.x < -80) leavers.splice(l, 1);
    }
    // kalabalık
    var vis0 = Math.max(0, crowd.length - CROWD_VIS);
    var running = G.state === 'drive' || G.state === 'depart' || G.state === 'ebrake' || G.state === 'pause';
    for (var c = 0; c < crowd.length; c++) {
      var cm = crowd[c];
      if (cm.tagT > 0) cm.tagT -= dt;
      cm.phase += dt * (running ? 1.6 + G.speedMul * 0.6 : 0.6);
      if (c < vis0) continue;
      crowdTarget(c - vis0, tmp);
      var lag = running ? -Math.max(0, G.speedMul - 1.4) * 40 * (0.5 + (LG.hash(cm.u.id) % 10) / 10) : 0;
      cm.x += (tmp.x + lag - cm.x) * Math.min(1, dt * 3);
      cm.y += (tmp.y - cm.y) * Math.min(1, dt * 4);
    }
    // balonlar
    for (var b = bubbles.length - 1; b >= 0; b--) { bubbles[b].t += dt; if (bubbles[b].t >= bubbles[b].life) bubbles.splice(b, 1); }
    updatePasses(dt);
    bigTick();
    updateFx(dt, t);
    for (var bt = bigTexts.length - 1; bt >= 0; bt--) { bigTexts[bt].t += dt; if (bigTexts[bt].t >= bigTexts[bt].life) bigTexts.splice(bt, 1); }
    // teşekkür bandı
    if (!banner && banners.length) {
      // büyük olanlar önce
      var bi = 0;
      for (var q = 0; q < banners.length; q++) if (banners[q].tier > banners[bi].tier) bi = q;
      banner = banners.splice(bi, 1)[0]; banner.t = 0;
      if (banner.tier >= 3) LG.sfx(banner.tier >= 5 ? 'fanfare' : 'levelup'); else LG.sfx('coin');
      if (banner.tier < 5 && banners.length > 0) banner.dur = Math.max(1.3, banner.dur - 0.45 * banners.length);
    }
    if (banner) { banner.t += dt; if (banner.t >= banner.dur) banner = null; }

    // sohbet ve hız lafları
    G.chatterT -= dt;
    if (G.chatterT <= 0) {
      G.chatterT = rand(4.5, 7.5);
      if (G.state === 'drive' && aboard.length > 0) {
        if (Math.random() < 0.3) sayDriver(aboard.length > 30 ? pick(D.DRIVER_FULL) : pick(D.DRIVER), { life: 2.4 });
        else { var rp = randomInside(); if (rp) sayP(rp, pick(D.CHATTER), { life: 2.6 }); }
      } else if (G.state === 'drive' && !crowd.length) {
        sayDriver(pick(D.EMPTY), { life: 2.6 });
        G.driverMood = 'shout'; G.driverMoodT = 1.2;
      } else if (crowd.length > 0 && running) {
        var vis = crowd.slice(-CROWD_VIS);
        var cc = pick(vis); if (cc) say({ c: cc }, pick(['Bekle şoför bey!', 'Duuur!', 'Bizi de al!', 'Yetişiyorum!']), { life: 1.8 });
      }
    }
    if (G.kmh > 85 && G.state === 'drive') {
      if (!G.wasFast) { G.wasFast = true; G.fastT = Math.min(G.fastT, 0.4); }
      G.fastT -= dt;
      if (G.fastT <= 0) { G.fastT = rand(3.5, 6); var fp = randomInside(); if (fp) sayP(fp, pick(D.FAST), { life: 2.2, bg: '#fff0f0' }); }
      G.hatT -= dt;
      if (G.hatT <= 0) {
        G.hatT = rand(0.8, 2);
        var roof = [];
        for (var r = 0; r < aboard.length; r++) if (aboard[r].slot && !aboard[r].slot.inside) roof.push(aboard[r]);
        if (roof.length) { var rp2 = pick(roof); headLocal(rp2, tmp); toWorld(tmp.x, tmp.y, tmp2); ui.burst(tmp2.x, tmp2.y - 10, { count: 1, shape: 'emoji', emoji: pick(['🧢', '👒', '🎩', '🧣']), angle: PI, spread: 0.6, speed: 700, up: 300, gravity: 500, size: 16, life: 1.6 }); }
      }
    }
    if (G.kmh < 70) G.wasFast = false;
    // çevre
    for (var gi = 0; gi < gulls.length; gi++) {
      var gl = gulls[gi];
      gl.x -= (24 + G.v * 0.12) * dt;
      if (gl.scare > 0) { gl.scare -= dt; gl.dy = Math.max(-300, gl.dy - 600 * dt); } else gl.dy *= 0.97;
      gl.y += gl.dy * dt;
      if (gl.y < 300 && gl.scare <= 0) gl.dy = 40;
      if (gl.y > 660) gl.y = 660;
      if (gl.x < -60) { gl.x = W + 60; gl.y = rand(500, 640); gl.dy = 0; }
    }
    for (var ci = 0; ci < clouds.length; ci++) { var cl = clouds[ci]; cl.x -= (8 + G.v * 0.03) * dt; if (cl.x < -260) { cl.x = W + 60; cl.y = rand(250, 560); } }
    for (var pi = 0; pi < props.length; pi++) {
      var pr = props[pi]; pr.x -= G.v * dt;
      if (pr.x < -160) { var maxX = 0; for (var pj = 0; pj < props.length; pj++) maxX = Math.max(maxX, props[pj].x); pr.x = Math.max(W + 120, maxX + rand(260, 520)); pr.type = pick(PROP_TYPES); pr.seed = LG.randi(0, 99); }
    }
    var spd = G.kmh > 70 || fx.turbo || fx.flight ? 1 : 0;
    for (var li = 0; li < lines.length; li++) { var ln = lines[li]; ln.x -= (G.v * 2.2 + 300) * ln.k * dt * (spd ? 1 : 0.2); if (ln.x + ln.len < 0) { ln.x = W + rand(0, 300); ln.y = rand(480, 1180); } }

    // tamponda/çatıda olanlar için kalabalık ölçüsü
    if (aboard.length > stats.maxAboard) stats.maxAboard = aboard.length;
    // tıka basa dolu: ara sıra bir vida fırlar
    if (bus.f > 0.85 && Math.random() < dt * 0.6) {
      toWorld(rand(-360, 360), rand(-260, -40), tmp);
      ui.burst(tmp.x, tmp.y, { count: 4, shape: 'circle', colors: ['#9aa0a6', '#cfd4da'], speed: 380, size: 9, life: 0.8 });
      LG.sfx('tick');
    }
  }

  function stopUpdate(dt) {
    if (G.phase === 'open') {
      G.door = Math.min(1, G.door + dt / 0.45);
      if (G.door >= 1) {
        G.phase = 'alight'; G.pt = 0; buildLeaveList();
        if (G.state === 'stopped' && G.route) driverShout();
      }
    } else if (G.phase === 'alight') {
      G.leaveAcc += dt;
      var gap = G.state === 'final' ? 0.07 : 0.15;
      while (G.leaveList.length && G.leaveAcc >= gap) { G.leaveAcc -= gap; alightOne(G.leaveList.shift()); }
      if (!G.leaveList.length) { G.phase = G.state === 'estop' ? 'close' : G.state === 'final' ? 'done' : 'board'; G.pt = 0; }
    } else if (G.phase === 'board') {
      boardTick(dt);
      if ((crowd.length === 0 && hoppers.length === 0 && G.pt > 1.0 && G.st > 3.6) || G.st > 11 || G.forceGo) { G.phase = 'close'; G.pt = 0; G.forceGo = false; }
    } else if (G.phase === 'close') {
      G.door = Math.max(0, G.door - dt / 0.4);
      if (G.door <= 0) startDepart();
    } else if (G.phase === 'done') {
      for (var i = 0; i < aboard.length; i++) removePassenger(aboard[i--]);
      if (G.pt > 2.2) startSummary();
    }
  }

  function physics(dt, acc, t) {
    // burun eğilmesi (fren: burun aşağı)
    var pt = bus.pitchTarget;
    bus.pitchV += (-90 * (bus.pitch - pt) - 8 * bus.pitchV - acc * 0.0125) * dt;
    bus.pitch = clamp(bus.pitch + bus.pitchV * dt, -0.4, 0.16);
    // yolcu savrulması
    bus.lurchV += (-60 * bus.lurch - 7 * bus.lurchV - acc * 6) * dt;
    bus.lurch = clamp(bus.lurch + bus.lurchV * dt, -70, 70);
    // süspansiyon
    bus.bounceV += (-150 * bus.bounce - 6 * bus.bounceV) * dt;
    bus.bounce += bus.bounceV * dt;
    if (G.v > 40 && bus.alt < 1) {
      G.bumpT -= dt * (0.6 + G.v / BASE_V * 0.5);
      if (G.bumpT <= 0) { G.bumpT = rand(0.5, 1.5); bus.bounceV += rand(50, 120) * (0.7 + bus.f * 0.6); }
    }
    // ezilip uzama
    bus.sqV += (-220 * bus.sq - 9 * bus.sqV) * dt;
    bus.sq = clamp(bus.sq + bus.sqV * dt, -0.12, 0.12);
  }

  // ---------------------------------------------------------------------------
  // Büyük efektler: turbo, uçuş, roket
  // ---------------------------------------------------------------------------
  function updateFx(dt, t) {
    bus.pitchTarget = 0; bus.wheelieW += (0 - bus.wheelieW) * Math.min(1, dt * 4);
    if (!fx.flight) flyK += (0 - flyK) * Math.min(1, dt * 3);
    // uçuşta dolmuşun altından akan bulutlar
    if (fx.flight && fClouds.length < 7 && Math.random() < dt * 2.4) fClouds.push({ x: W + 170, y: rand(905, 1085), s: rand(0.9, 1.7) });
    for (var fc = fClouds.length - 1; fc >= 0; fc--) { fClouds[fc].x -= (G.v * 1.5 + 280) * dt; if (fClouds[fc].x < -330) fClouds.splice(fc, 1); }
    bus.extraRot *= Math.max(0, 1 - dt * 4);
    var altTarget = 0;
    if (fx.turbo) {
      var T = fx.turbo; T.t += dt;
      var k = T.t / T.dur;
      bus.wheelieW = 1;
      var w = k < 0.12 ? LG.ease.outBack(k / 0.12) : k > 0.82 ? Math.max(0, (1 - k) / 0.18) : 1;
      bus.pitchTarget = -0.2 * w + Math.sin(T.t * 9) * 0.02 * w;
      if (Math.random() < dt * 8) { toWorld(-380, -20, tmp); ui.burst(tmp.x, tmp.y, { count: 3, shape: 'circle', colors: ['#bbb', '#ddd', '#999'], angle: PI, spread: 0.6, speed: 260, gravity: -60, size: 22, life: 0.8 }); }
      if (T.t >= T.dur) {
        fx.turbo = null; bus.sqV += 2.5; bus.bounceV += 260; ui.shake(14, 0.4); LG.sfx('boom');
        toWorld(245, 40, tmp); ui.burst(tmp.x, tmp.y, { count: 20, shape: 'circle', colors: ['#c8b89a', '#e0d4bc'], speed: 300, size: 18, life: 0.9 });
      }
    }
    if (fx.flight) {
      var F = fx.flight; F.t += dt;
      var fk = F.t / F.dur;
      var up = fk < 0.15 ? LG.ease.inOutSine(fk / 0.15) : fk > 0.85 ? LG.ease.inOutSine((1 - fk) / 0.15) : 1;
      flyK = up;
      altTarget = 250 * up + Math.sin(F.t * 2.2) * 16 * up;
      bus.extraRot = -0.06 * up + Math.sin(F.t * 1.7) * 0.03 * up;
      if (Math.random() < dt * 5) { toWorld(rand(-300, 200), -300, tmp); ui.burst(tmp.x, tmp.y, { count: 1, shape: 'emoji', emoji: LG.pick(['✨', '⭐', '💫']), speed: 120, gravity: 120, size: 14, life: 1.8 }); }
      if (F.t >= F.dur) {
        fx.flight = null; bus.sqV += 2.4; bus.bounceV += 200; ui.shake(12, 0.4); LG.sfx('boom');
        if (G.musicT > 0) LG.music.play('halay'); else LG.music.play('chill');
      }
    }
    if (fx.rocket) {
      var R = fx.rocket; R.t += dt;
      var rt = R.t;
      if (rt < 2.6) { // geri sayım
        var cd = Math.floor(rt / 0.85);
        if (cd !== R.stage - 1 && cd < 3) { R.stage = cd + 1; bigText(String(3 - cd), 'Ay’a dolmuş seferi! 🚀', '#ff4d6d', 0.8, 160); LG.sfx('countdown'); }
        ui.shake(3 + rt * 2, 0.1);
        bus.dx = Math.sin(rt * 60) * 2;
      } else if (rt < 4.0) { // kalkış
        if (!R.launched) { R.launched = true; LG.sfx('go'); LG.sfx('boom'); ui.flash('#fff', 0.5); ui.shake(20, 0.8); bigText('KALKIŞ! 🚀', R.u.name, '#ffd400', 1.4, 110); }
        var lk = (rt - 2.6) / 1.4;
        bus.alt = 1500 * lk * lk; altTarget = bus.alt;
        bus.extraRot = -0.25 * Math.min(1, lk * 3);
        bus.dx = 0;
        if (Math.random() < dt * 30) ui.burst(rand(200, 880), GROUND - rand(0, 30), { count: 2, shape: 'circle', colors: ['#eee', '#ccc', '#fff'], speed: 300, gravity: -40, size: 40, life: 1.4 });
      } else if (rt < 10.5) { // uzay
        if (!R.space) { R.space = true; LG.music.play('party'); LG.sfx('mega'); }
        altTarget = 1500;
      } else if (rt < 13) { // dönüş (paraşüt)
        var dk = (rt - 10.5) / 2.5;
        if (!R.back) { R.back = true; LG.sfx('whoosh'); }
        altTarget = 1100 * (1 - LG.ease.outCubic(dk));
        bus.alt = altTarget;
        bus.extraRot = Math.sin(rt * 3) * 0.06;
      } else {
        fx.rocket = null; bus.alt = 0; bus.sqV += 3; bus.bounceV += 300; ui.shake(20, 0.6); LG.sfx('boom');
        bigText('HOŞ GELDİNİZ! 🌍', 'Ay seferi tamamlandı', '#06d6a0', 2, 90);
        ui.burst(W / 2, GROUND, { count: 40, shape: 'circle', colors: ['#c8b89a', '#e0d4bc', '#fff'], speed: 500, size: 20, life: 1.2 });
        if (G.musicT > 0) LG.music.play('halay'); else LG.music.play('chill');
        return;
      }
    }
    if (!fx.rocket) bus.alt += (altTarget - bus.alt) * Math.min(1, dt * 3);
  }

  // ---------------------------------------------------------------------------
  // Son durak, özet, yeni rota
  // ---------------------------------------------------------------------------
  function startSummary() {
    G.state = 'summary'; G.st = 0; G.forceGo = false;
    session.routes++;
    passes.length = 0; pendingPasses.length = 0;
    var off = null, rel = null;
    stats.off.forEach(function (v) { if (!off || v.n > off.n) off = v; });
    stats.relays.forEach(function (v) { if (!rel || v.n > rel.n) rel = v; });
    if (stats.maxAboard >= 25) moment(40 + Math.min(30, stats.maxAboard / 10), 'Dolmuşa aynı anda ' + stats.maxAboard + ' kişi sığdı! (14 koltuk 😅)');
    if (stats.korna >= 5) moment(15 + Math.min(10, stats.korna / 3), 'Kornaya ' + stats.korna + ' kez basıldı 📯');
    var best = null;
    stats.moments.forEach(function (m) { if (!best || m.score > best.score) best = m; });
    var nextR = D.ROUTES[(G.routeIdx + 1) % D.ROUTES.length];
    summary = {
      route: G.route.short || G.route.sign,
      carried: stats.carried.size, total: session.carried,
      longest: stats.longest, off: off, relay: rel,
      moment: best ? best.text : 'Herkes yerine oturdu, mucize! 😇',
      next: nextR.short || nextR.sign,
    };
    LG.sfx('win');
    ui.rain({ count: 120 });
  }
  function newRoute() {
    summary = null;
    setRoute(G.routeIdx + 1, G.palIdx + 1);
    for (var i = 0; i < decorCarry.length; i++) {
      var dc = decorCarry[i];
      decor[dc.id] = true; decorPop[dc.id] = LG.time + 0.9 + i * 0.35;
      moment(30, dc.name + ' dolmuşa ' + dc.d.name.toLocaleLowerCase('tr-TR') + ' taktı ' + dc.d.emoji);
    }
    if (decorCarry.length) G.shineT = 1.4;
    decorCarry = [];
    G.plateFlip = 0;
    startStopState('stopped');
    G.signX = STOP_X;
    bigText('YENİ SEFER! 🚐', G.route.short || G.route.sign, '#ffd400', 2.6, 96);
    LG.sfx('fanfare');
  }

  // ---------------------------------------------------------------------------
  // Çizim
  // ---------------------------------------------------------------------------
  var skyGrad = null, roadGrad = null, walkGrad = null;
  function drawSky(ctx, t) {
    var pal = G.pal;
    if (!skyGrad) {
      skyGrad = ctx.createLinearGradient(0, 0, 0, 760);
      skyGrad.addColorStop(0, pal.skyTop); skyGrad.addColorStop(1, pal.skyBot);
    }
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, 1010);
    if (pal.night) {
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + s.p);
        ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fdf6d8'; ctx.beginPath(); ctx.arc(190, 560, 46, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.skyBot; ctx.beginPath(); ctx.arc(172, 548, 40, 0, TAU); ctx.fill();
    } else {
      var sg = ctx.createRadialGradient(190, 560, 10, 190, 560, 150);
      sg.addColorStop(0, 'rgba(255,255,220,0.9)'); sg.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.fillStyle = sg; ctx.fillRect(40, 410, 300, 300);
      ctx.fillStyle = pal.sun; ctx.beginPath(); ctx.arc(190, 560, 52, 0, TAU); ctx.fill();
    }
    for (var c = 0; c < clouds.length; c++) A.cloud(ctx, clouds[c].x, clouds[c].y, clouds[c].s, pal.night ? 0.18 : 0.85);
  }
  function drawStrip(ctx, img, par, y) {
    var w = img.width;
    var off = -((G.scroll * par) % w);
    ctx.drawImage(img, off, y);
    ctx.drawImage(img, off + w, y);
    if (off + 2 * w < W) ctx.drawImage(img, off + 2 * w, y);
  }
  function drawBackground(ctx, t) {
    drawSky(ctx, t);
    drawStrip(ctx, strips.far, 0.05, 500);
    // vapur
    var fxp = ((900 - G.scroll * 0.05 - t * 14) % 1700 + 1700) % 1700 - 300;
    A.ferry(ctx, fxp, 706, G.pal.night);
    // parıltılar
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (var i = 0; i < 12; i++) {
      var gx = ((i * 173 - G.scroll * 0.05 + Math.sin(t + i) * 20) % W + W) % W;
      ctx.fillRect(gx, 668 + (i % 4) * 22, 26 + (i % 3) * 10, 3);
    }
    for (var g = 0; g < gulls.length; g++) A.gull(ctx, gulls[g].x, gulls[g].y, gulls[g].s, t + gulls[g].ph, G.pal.night ? '#c9d2ff' : '#ffffff');
    drawStrip(ctx, strips.mid, 0.32, 420);
    // yol
    if (!roadGrad) { roadGrad = ctx.createLinearGradient(0, ROAD_TOP, 0, ROAD_BOT); roadGrad.addColorStop(0, '#4a4a55'); roadGrad.addColorStop(1, '#34343e'); }
    ctx.fillStyle = '#b9b9c2'; ctx.fillRect(0, ROAD_TOP - 10, W, 12);
    ctx.fillStyle = roadGrad; ctx.fillRect(0, ROAD_TOP, W, ROAD_BOT - ROAD_TOP);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    var dOff = -(G.scroll % 170);
    for (var x = dOff; x < W; x += 170) ctx.fillRect(x, 1040, 80, 7);
    // fren izleri
    ctx.fillStyle = 'rgba(15,15,15,0.55)';
    for (var s = 0; s < skids.length; s++) {
      var sk = skids[s], sx = sk.wx - G.scroll;
      if (sx + sk.len < -50 || sx - sk.len > W + 50) continue;
      ctx.fillRect(sx - sk.len, GROUND - 6, sk.len, 7);
    }
    // bordür (kırmızı-beyaz)
    var cOff = -(G.scroll % 80);
    ctx.fillStyle = '#eeeeee'; ctx.fillRect(0, ROAD_BOT, W, 14);
    ctx.fillStyle = '#d62828';
    for (var cx = cOff; cx < W; cx += 80) ctx.fillRect(cx, ROAD_BOT, 40, 14);
    // kaldırım (parke)
    if (!walkGrad) { walkGrad = ctx.createLinearGradient(0, ROAD_BOT + 14, 0, LG.H); walkGrad.addColorStop(0, G.pal.night ? '#6b6676' : '#c9b9a6'); walkGrad.addColorStop(0.3, G.pal.night ? '#57525f' : '#b8a690'); walkGrad.addColorStop(1, '#2a2530'); }
    ctx.fillStyle = walkGrad; ctx.fillRect(0, ROAD_BOT + 14, W, LG.H - ROAD_BOT - 14);
    ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (var ry = 0; ry < 9; ry++) {
      var yy = ROAD_BOT + 14 + ry * 34;
      ctx.moveTo(0, yy); ctx.lineTo(W, yy);
      var o = (-(G.scroll % 68)) + (ry % 2) * 34;
      for (var vx = o; vx < W; vx += 68) { ctx.moveTo(vx, yy); ctx.lineTo(vx, yy + 34); }
    }
    ctx.stroke();
  }
  function drawProps(ctx, t) {
    for (var i = 0; i < props.length; i++) {
      var p = props[i];
      if (p.x < -150 || p.x > W + 150) continue;
      A.prop(ctx, p.type, p.x, 1138, t, p.seed);
    }
  }

  function busState(t) {
    return {
      f: bus.f, t: t, night: G.pal.night, lurch: bus.lurch, winOpen: G.winOpen, doorOpen: G.door, doorAjar: G.doorAjar,
      wheelRot: bus.wheelRot, jant: !!decor.jant, sideText: G.route.short || G.route.sign, driverMood: G.driverMood,
    };
  }

  function drawBus(ctx, t, space) {
    var S = busState(t);
    var f = bus.f;
    ctx.save();
    applyBT(ctx);
    // arkadaki: kanat (uzak), kaykaycı ipi
    if (fx.flight) A.wing(ctx, 40, A.roofY(40, f) - 6, t + 0.3, true, 0.95);
    // gece farı
    if (G.pal.night && !space) {
      var hg = ctx.createLinearGradient(370, 0, 760, 0);
      hg.addColorStop(0, 'rgba(255,245,180,0.45)'); hg.addColorStop(1, 'rgba(255,245,180,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(370, -80); ctx.lineTo(760, -150); ctx.lineTo(760, 40); ctx.closePath(); ctx.fill();
    }
    if (decor.led && !space) {
      var ug = ctx.createRadialGradient(0, 30, 20, 0, 30, 420);
      ug.addColorStop(0, 'hsla(' + ((t * 120) % 360) + ',100%,60%,0.45)'); ug.addColorStop(1, 'hsla(' + ((t * 120) % 360) + ',100%,60%,0)');
      ctx.fillStyle = ug; ctx.fillRect(-420, 0, 840, 70);
    }
    drawOutside(ctx, t, ['skate']);
    A.busBody(ctx, S);
    // pencere içi
    ctx.save();
    A.windowPath(ctx, f); ctx.clip();
    A.interior(ctx, S);
    drawInsideLayer(ctx, t, 0);
    drawInsideLayer(ctx, t, 1);
    A.seatFronts(ctx);
    drawInsideLayer(ctx, t, 2);
    A.driver(ctx, S);
    A.decorInside(ctx, S, decor, decorScale);
    ctx.restore();
    A.glass(ctx, S);
    drawHands(ctx, t);
    A.door(ctx, S);
    A.decor(ctx, S, decor, decorScale);
    A.wheels(ctx, S);
    if (G.shineT > 0) {
      ctx.save(); A.bodyPath(ctx, f); ctx.clip();
      var sx = -500 + (1 - G.shineT / 1.4) * 1100;
      var sg = ctx.createLinearGradient(sx - 80, 0, sx + 80, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.7)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(-420, -360, 840, 380);
      ctx.restore();
    }
    // çatı ve dışarıdakiler
    if (aboard.length > 28) drawRack(ctx, f);
    A.roofSign(ctx, S);
    drawOutside(ctx, t, ['roofStand', 'armchair', 'roofSit', 'door', 'rear', 'ladder', 'bumper']);
    // efektler
    if (fx.turbo || (fx.rocket && fx.rocket.t > 2.6 && fx.rocket.t < 10.5)) {
      A.flame(ctx, -380, -22, fx.rocket ? 220 : 140, PI + 0.15, t, fx.rocket ? 1.6 : 1);
    }
    if (fx.rocket && fx.rocket.t < 10.5) {
      A.rocket(ctx, t);
      if (fx.rocket.t > 2.2) A.flame(ctx, -372, 29, 260 + Math.sin(t * 30) * 30, PI + 0.5, t, 1.8);
    }
    if (fx.rocket && fx.rocket.t >= 10.5) drawParachute(ctx, t);
    if (fx.flight) A.wing(ctx, -60, A.roofY(-60, f) - 14, t, false, 1.0);
    ctx.restore();
  }
  function drawRack(ctx, f) {
    ctx.strokeStyle = '#333'; ctx.lineWidth = 4;
    ctx.beginPath();
    for (var x = -330; x <= 250; x += 58) { var y = A.roofY(x, f); ctx.moveTo(x, y); ctx.lineTo(x, y - 14); }
    ctx.moveTo(-330, A.roofY(-330, f) - 14);
    for (var x2 = -330; x2 <= 250; x2 += 29) ctx.lineTo(x2, A.roofY(x2, f) - 14);
    ctx.stroke();
  }
  function drawParachute(ctx, t) {
    ctx.save();
    ctx.translate(0, -280);
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-300, 0); ctx.lineTo(-180, -300); ctx.moveTo(300, 0); ctx.lineTo(180, -300); ctx.moveTo(0, 0); ctx.lineTo(0, -320); ctx.stroke();
    var cols = ['#e63946', '#ffffff'];
    for (var i = 0; i < 8; i++) {
      ctx.fillStyle = cols[i % 2];
      ctx.beginPath(); ctx.moveTo(0, -310);
      ctx.arc(0, -310, 280, PI + i * PI / 8, PI + (i + 1) * PI / 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawInsideLayer(ctx, t, layer) {
    var music = G.musicT > 0, wind = G.winOpen * 0.8 + (G.kmh > 90 ? 0.4 : 0);
    var crowded = bus.f > 0.75;
    var alarm = G.state === 'ebrake' || fx.turbo || fx.flight || fx.rocket;
    for (var i = 0; i < aboard.length; i++) {
      var p = aboard[i], sl = p.slot;
      if (!sl || !sl.inside || sl.layer !== layer || p.hop) continue;
      var r = sl.r * (sl.kind === 'stand' && crowded ? 0.94 : 1);
      var sway = music ? Math.sin(t * 4.2 + p.phase) * 7 : 0;
      var bob = Math.sin(t * (5 + G.speedMul * 2) + p.phase) * (G.v > 10 ? 2.2 : 0.8);
      var x = p.dx + bus.lurch * (0.55 + 0.45 * p.k) + sway;
      var y = p.dy + bob;
      if (layer === 2) {
        ctx.fillStyle = 'hsl(' + p.u.hue + ',62%,48%)';
        A.rr(ctx, x - r * 0.95, y + r * 0.75, r * 1.9, r * 1.6, r * 0.5); ctx.fill();
      }
      var blink = ((t + p.phase * 3) % 4) < 0.13;
      A.head(ctx, p.u, x, y, r, { wind: wind, t: t, tilt: (sl.tilt || 0) + bus.lurch * 0.005 + (music ? sway * 0.02 : 0), blink: blink, face: alarm ? 'wow' : crowded && sl.kind === 'stand' ? 'squish' : 'happy' });
    }
  }
  function drawHands(ctx, t) {
    for (var i = 0; i < aboard.length; i++) {
      var p = aboard[i];
      if (p.handT <= 0 || !isInside(p) || p.hop) continue;
      var r = p.slot.r, x = p.dx + bus.lurch * 0.6, y = p.dy;
      var up = Math.min(1, p.handT / 0.15);
      ctx.strokeStyle = 'hsl(' + p.u.hue + ',62%,48%)'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + r * 0.7, y + r * 0.7); ctx.lineTo(x + r * 1.3, y - r * 1.2 * up); ctx.stroke();
      ctx.fillStyle = A.look(p.u).skin; ctx.beginPath(); ctx.arc(x + r * 1.3, y - r * 1.2 * up, 6.5, 0, TAU); ctx.fill();
    }
  }
  // Para / bozuk para (dünya koordinatında, balonların üstünde)
  function drawNotesWorld(ctx, t) {
    for (var i = 0; i < passes.length; i++) {
      var ps = passes[i];
      var path = ps.path, n = path.length - 1;
      var a = ps.back ? path[n - ps.seg] : path[ps.seg];
      var b = ps.back ? path[n - ps.seg - 1] : path[ps.seg + 1];
      if (!a || !b) continue;
      var k = Math.min(1, ps.t / (ps.back ? 0.16 : 0.32));
      var ke = LG.ease.inOutSine(k);
      var x = lerp(a.x, b.x, ke) + (a.p ? bus.lurch * 0.6 : 0) * (1 - ke) + (b.p ? bus.lurch * 0.6 : 0) * ke;
      var y = lerp(a.y, b.y, ke) - Math.sin(k * PI) * 30 - 22;
      toWorld(x, y, tmp);
      if (ps.back) {
        A.coin(ctx, tmp.x, tmp.y, Math.abs(Math.cos(t * 12)) * 1.3); A.coin(ctx, tmp.x - 18, tmp.y + 10, Math.abs(Math.sin(t * 12)) * 1.3);
      } else {
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#7CFC9A'; ctx.beginPath(); ctx.arc(tmp.x, tmp.y, 34, 0, TAU); ctx.fill(); ctx.restore();
        A.note(ctx, tmp.x, tmp.y, Math.sin(t * 10 + i) * 0.25, 1.5);
        ui.drawNameTag(ctx, ps.u, tmp.x, tmp.y - 38, 20, '#eaffea', 'rgba(20,90,40,0.9)');
      }
    }
  }

  var OUT_FACE = { roofSit: 'happy', roofStand: 'happy', armchair: 'cool', rear: 'wow', ladder: 'happy', bumper: 'happy', door: 'wow', skate: 'cool' };
  function drawOutside(ctx, t, kinds) {
    var spdF = clamp((G.kmh - 25) / 90, 0, 1) + (fx.flight ? 0.6 : 0);
    var music = G.musicT > 0;
    for (var i = 0; i < aboard.length; i++) {
      var p = aboard[i], sl = p.slot;
      if (!sl || sl.inside || p.hop || kinds.indexOf(sl.kind) < 0) continue;
      var s = sl.s, x = p.dx, y = p.dy;
      var ph = t * (music ? 2 : 0.7) + p.phase;
      var face = fx.flight || fx.rocket || G.state === 'ebrake' ? 'wow' : OUT_FACE[sl.kind];
      if (sl.kind === 'rear') {
        var ang = (PI / 2) * 0.95 * clamp(spdF, 0, 1.05) + Math.sin(t * 9 + sl.k) * 0.12 * spdF;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ui.person(ctx, 0, 30 * s, s, p.u, { arms: 'up', dance: ph, face: face });
        ctx.restore();
      } else if (sl.kind === 'ladder') {
        ctx.strokeStyle = '#8d6e4f'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(-372, -8); ctx.lineTo(-436, -282); ctx.moveTo(-352, -8); ctx.lineTo(-414, -282); ctx.stroke();
        ctx.lineWidth = 4; ctx.beginPath();
        for (var r = 0; r < 9; r++) { var k = r / 9; ctx.moveTo(-372 - 64 * k, -8 - 274 * k); ctx.lineTo(-352 - 62 * k, -8 - 274 * k); }
        ctx.stroke();
        ui.person(ctx, x, y + Math.sin(t * 3) * 6, s, p.u, { arms: 'up', dance: ph, face: face });
      } else if (sl.kind === 'skate') {
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-372, -30); ctx.lineTo(x + 22 * s, y - 2 * s); ctx.stroke();
        ctx.fillStyle = '#e63946'; A.rr(ctx, x - 34, 50 - 22, 68, 9, 4); ctx.fill();
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(x - 22, 50 - 8, 7, 0, TAU); ctx.arc(x + 22, 50 - 8, 7, 0, TAU); ctx.fill();
        ui.person(ctx, x, y, s, p.u, { arms: 'hold', dance: 0.25, face: face });
      } else if (sl.kind === 'armchair') {
        var cy = A.roofY(sl.x, bus.f);
        ctx.fillStyle = '#8e244d'; A.rr(ctx, x - 40, cy - 74, 80, 70, 14); ctx.fill();
        ctx.fillStyle = '#b5305f'; A.rr(ctx, x - 48, cy - 40, 22, 36, 8); ctx.fill(); A.rr(ctx, x + 26, cy - 40, 22, 36, 8); ctx.fill();
        ui.person(ctx, x, y, s, p.u, { arms: 'side', dance: ph * 0.3, face: face, hat: 'kerchief' });
        ui.emoji(ctx, '🍵', x + 22, y - 2, 20);
      } else if (sl.kind === 'door') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(0.25 + Math.sin(t * 5 + p.phase) * 0.08);
        ui.person(ctx, 0, 0, s, p.u, { arms: 'wave', dance: ph, face: face });
        ctx.restore();
      } else {
        var arms = sl.kind === 'roofStand' ? (music ? 'up' : 'wave') : 'side';
        var dy = sl.kind === 'roofStand' ? Math.abs(Math.sin(t * 3 + p.phase)) * -4 : 0;
        ui.person(ctx, x - spdF * 3, y + dy, s, p.u, { arms: arms, dance: ph, face: face });
      }
      var img = LG.avatarImg(p.u);
      if (img && sl.kind !== 'rear') ui.avatar(ctx, p.u, x, y - 26 * s, 19 * s, { ringWidth: 2 });
    }
  }

  function drawPerson(ctx, u, x, y, s, o) { ui.person(ctx, x, y, s, u, o); var img = LG.avatarImg(u); if (img) ui.avatar(ctx, u, x, y - 26 * s, 19 * s, { ringWidth: 2 }); }

  function drawCrowdAndWalkers(ctx, t) {
    var running = G.state === 'drive' || G.state === 'depart' || G.state === 'ebrake' || G.state === 'pause';
    if (!crowd.length && G.state !== 'summary' && G.state !== 'final') {
      // boş kaldırım: davet
      var pa = 0.75 + Math.sin(t * 3) * 0.2;
      ctx.save(); ctx.globalAlpha = pa;
      ui.panel(ctx, 640, 1132, 380, 54, { r: 27, fill: 'rgba(0,0,0,0.45)', border: 'rgba(255,255,255,0.6)', lineWidth: 3 });
      ui.text(ctx, '💬 Yorum yaz, sen de bin!', 830, 1160, { size: 30, maxWidth: 356, color: '#fff' });
      ctx.restore();
    }
    var vis0 = Math.max(0, crowd.length - CROWD_VIS);
    var list = [];
    for (var i = vis0; i < crowd.length; i++) list.push(crowd[i]);
    list.sort(function (a, b) { return a.y - b.y; });
    var s = CROWD_S;
    for (var j = 0; j < list.length; j++) {
      var c = list[j];
      var age = LG.time - c.born;
      var pop = age < 0.35 ? LG.ease.outBack(age / 0.35) : 1;
      var feetY = c.y;
      ctx.save();
      ctx.translate(c.x, feetY);
      if (running) ctx.rotate(0.14 + Math.sin(c.phase * TAU * 2) * 0.03);
      ctx.scale(pop, pop);
      var jumpY = !running && age < 0.6 ? -Math.sin(age / 0.6 * PI) * 24 : 0;
      drawPerson(ctx, c.u, 0, -47 * s + jumpY, s, { dance: running ? c.phase * 2.2 : c.phase * 0.5, arms: running ? 'side' : (j % 3 === 0 ? 'wave' : 'side'), face: running ? 'wow' : 'happy' });
      ctx.restore();
    }
    // binenler (zıplayarak)
    for (var h = 0; h < hoppers.length; h++) {
      var hp = hoppers[h], kk = Math.min(1, hp.t / hp.dur);
      toWorld(A.BUS.doorC.x, -60, tmp);
      var x = lerp(hp.x0, tmp.x, kk), y = lerp(hp.y0, tmp.y, kk) - Math.sin(kk * PI) * 90;
      drawPerson(ctx, hp.p.u, x, y, s * (1 - kk * 0.25), { arms: 'up', dance: kk, face: 'wow' });
      hp.hx = x; hp.hy = y - 64;
    }
    // inenler
    for (var l = 0; l < leavers.length; l++) {
      var lv = leavers[l];
      var lk = Math.min(1, lv.t / 0.45);
      var lx = lv.t < 0.45 ? lerp(lv.x0, lv.tx, lk) : lv.x;
      if (lv.t >= 0.45 && lv.x === lv.x0) lv.x = lv.tx;
      var ly = lv.t < 0.45 ? lerp(lv.y0, lv.ty, lk) - Math.sin(lk * PI) * 70 : lv.ty;
      if (lv.t < 0.45) lv.x = lx;
      var a = lv.t > 5 ? Math.max(0, 6 - lv.t) : 1;
      ctx.save(); ctx.globalAlpha = a;
      drawPerson(ctx, lv.u, lx, ly - 47 * s, s, { arms: 'wave', dance: lv.phase, face: 'happy', flip: true });
      ctx.restore();
      lv.hx = lx; lv.hy = ly - 47 * s - 40;
    }
  }

  // İsim etiketleri: tek geçişte, üst üste binmeyecek şekilde yerleştirilir
  var tagRects = [];
  function rectFree(x0, y0, x1, y1) {
    for (var i = 0; i < tagRects.length; i++) { var r = tagRects[i]; if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) return false; }
    return true;
  }
  function placeTag(ctx, u, x, y, size, color, bg, levels) {
    var c = ui.nameTag(u, size, color, bg);
    var w = c.width, h = c.height;
    x = clamp(x, 44 + w / 2, W - 44 - w / 2);
    for (var lv = 0; lv <= (levels == null ? 2 : levels); lv++) {
      var yy = y - lv * (h + 2);
      var x0 = x - w / 2, y0 = yy - h / 2;
      if (rectFree(x0 - 2, y0, x0 + w + 2, y0 + h)) {
        tagRects.push([x0 - 2, y0, x0 + w + 2, y0 + h]);
        ctx.drawImage(c, Math.round(x0), Math.round(y0));
        return yy;
      }
    }
    return null;
  }
  function drawAllTags(ctx, t) {
    tagRects.length = 0;
    // rozetler (önce yer ayır)
    if (hiddenCount > 0 && G.state !== 'summary') {
      toWorld(-110, -14, tmp);
      var txt = '+' + LG.fmt(hiddenCount) + ' kişi içeride 😅';
      ui.panel(ctx, tmp.x - 135, tmp.y - 22, 270, 44, { r: 22, fill: 'rgba(0,0,0,0.8)', border: '#ffd400', lineWidth: 3 });
      ui.text(ctx, txt, tmp.x, tmp.y + 1, { size: 25, maxWidth: 256, color: '#ffd400' });
      tagRects.push([tmp.x - 135, tmp.y - 22, tmp.x + 135, tmp.y + 22]);
    }
    if (crowd.length > CROWD_VIS) {
      var txt2 = '+' + LG.fmt(crowd.length - CROWD_VIS) + ' kişi daha 🏃';
      ui.panel(ctx, 820, 1014, 210, 44, { r: 22, fill: 'rgba(214,40,40,0.9)', border: '#fff', lineWidth: 3 });
      ui.text(ctx, txt2, 925, 1037, { size: 26, maxWidth: 196 });
      tagRects.push([820, 1014, 1030, 1058]);
    }
    // dolmuştakiler: önce inecekler, sonra en yeni/aktif
    var list = [];
    for (var i = 0; i < aboard.length; i++) {
      var p = aboard[i];
      if (!p.slot || p.hop) continue;
      if (p.wantOff || p.tagT > 0) list.push(p);
    }
    list.sort(function (a, b) { return (b.wantOff ? 1e9 : 0) + b.act - ((a.wantOff ? 1e9 : 0) + a.act); });
    var n = Math.min(list.length, 12), placed = 0;
    for (var k = 0; k < n; k++) {
      var q = list[k];
      headLocal(q, tmp);
      var lx = tmp.x + (q.slot.inside ? bus.lurch * 0.7 : 0);
      var top = q.slot.inside ? tmp.y - 6 : tmp.y - 22;
      toWorld(lx, top, tmp2);
      var fresh = !q.wantOff && LG.time - q.act < 2.5; // az önce yazdı: sarı etiket ("bu benim!")
      var yy = placeTag(ctx, q.u, tmp2.x, tmp2.y - 16, 24, fresh ? '#1d1300' : '#fff', q.wantOff ? 'rgba(193,18,31,0.92)' : fresh ? '#ffd400' : 'rgba(0,0,0,0.6)', 2);
      if (yy != null && q.wantOff) ui.emoji(ctx, '🛑', tmp2.x - ui.nameTag(q.u, 24, '#fff', 'rgba(193,18,31,0.92)').width / 2 - 14, yy, 26);
      if (yy != null) placed++;
    }
    // binenler
    for (var h = 0; h < hoppers.length; h++) if (hoppers[h].hx != null) placeTag(ctx, hoppers[h].p.u, hoppers[h].hx, hoppers[h].hy, 26, '#fff', 'rgba(0,0,0,0.6)', 1);
    // bekleyenler (en yeni 9)
    var vis0 = Math.max(0, crowd.length - CROWD_VIS), shown = 0;
    for (var c = crowd.length - 1; c >= vis0 && shown < 9; c--) {
      var cm = crowd[c];
      var cf = LG.time - cm.act < 2.5;
      if (placeTag(ctx, cm.u, cm.x, cm.y - 47 * CROWD_S - 50, 26, cf ? '#1d1300' : '#fff', cf ? '#ffd400' : 'rgba(0,0,0,0.6)', 2) != null) shown++;
    }
    // inenler
    for (var l = 0; l < leavers.length; l++) {
      var lv = leavers[l];
      if (lv.tagT > 0 && lv.hx != null && lv.t < 5) placeTag(ctx, lv.u, lv.hx, lv.hy - 12, 22, '#fff', 'rgba(0,0,0,0.45)', 1);
    }
  }

  function bubbleAnchor(b) {
    var o = b.owner;
    if (o === 'driver') { toWorld(A.BUS.driver.x + 10, A.BUS.driver.y - 28, tmp); b.ax = tmp.x; b.ay = tmp.y; return true; }
    if (o.p) {
      if (!byUser.has(o.p.u.id) || !o.p.slot) return false;
      headLocal(o.p, tmp);
      toWorld(tmp.x + (o.p.slot.inside ? bus.lurch * 0.6 : 0), tmp.y - (o.p.slot.inside ? 4 : 16), tmp2);
      b.ax = tmp2.x; b.ay = tmp2.y; return true;
    }
    if (o.c) {
      if (!crowdById.has(o.c.u.id)) return false;
      b.ax = o.c.x; b.ay = o.c.y - 47 * CROWD_S - 66; return true;
    }
    if (o.l) { if (o.l.hx == null) return false; b.ax = o.l.hx; b.ay = o.l.hy - 24; return true; }
    b.ax = o.x; b.ay = o.y; return true;
  }
  var bubRects = [];
  function drawBubbles(ctx) {
    bubRects.length = 0;
    if (banner && banner.tier <= 2) bubRects.push([BAN_SMALL.x, BAN_SMALL.y, BAN_SMALL.x + BAN_SMALL.w, BAN_SMALL.y + BAN_SMALL.h]);
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      if (!bubbleAnchor(b)) { b.t = Math.max(b.t, b.life - 0.3); }
      var a = b.t < 0.15 ? b.t / 0.15 : b.t > b.life - 0.3 ? Math.max(0, (b.life - b.t) / 0.3) : 1;
      var sc = b.t < 0.25 ? LG.ease.outBack(b.t / 0.25) : 1;
      var ay = Math.max(b.ay, 560);
      var bx = clamp(b.ax - b.w / 2, 48, W - 48 - b.w), by = ay - b.h - 18;
      // çakışmayı önle: üstüne kaydır, olmazsa yana dene
      var ok = false;
      for (var tries = 0; tries < 4 && !ok; tries++) {
        ok = true;
        for (var j = 0; j < bubRects.length; j++) {
          var r = bubRects[j];
          if (bx < r[2] + 6 && bx + b.w > r[0] - 6 && by < r[3] + 6 && by + b.h > r[1] - 6) {
            ok = false;
            if (tries % 2 === 0) by = r[1] - b.h - 8;
            else bx = clamp(b.ax < r[0] + (r[2] - r[0]) / 2 ? r[0] - b.w - 8 : r[2] + 8, 48, W - 48 - b.w);
            break;
          }
        }
      }
      if (!ok || by < 488) continue;
      bubRects.push([bx, by, bx + b.w, by + b.h]);
      A.bubble(ctx, b, b.ax, ay, a, sc, 0, by, bx);
    }
  }

  function drawSpeedLines(ctx) {
    var inten = clamp((G.kmh - 70) / 50, 0, 1);
    if (fx.turbo) inten = 1;
    if (fx.flight) inten = Math.max(inten, 0.7);
    if (inten <= 0.02) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * inten) + ')'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var i = 0; i < lines.length; i++) { var l = lines[i]; ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + l.len * inten, l.y); }
    ctx.stroke();
    ctx.restore();
  }
  function drawWind(ctx, t) {
    if (G.winOpen < 0.3) return;
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,' + 0.6 * G.winOpen + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (var i = 0; i < 6; i++) {
      var x = ((W - (t * 420 + i * 190)) % (W + 200) + W + 200) % (W + 200) - 100;
      var y = 760 + (i % 3) * 40;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 30, y - 16, x + 60, y); ctx.quadraticCurveTo(x + 90, y + 16, x + 120, y); ctx.stroke();
    }
    ctx.restore();
  }

  // Uzay sahnesi (Ay seferi)
  function drawSpace(ctx, t) {
    var R = fx.rocket, k = R.t - 4.0;
    var g = ctx.createLinearGradient(0, 0, 0, LG.H);
    g.addColorStop(0, '#02010a'); g.addColorStop(1, '#1b0f45');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, LG.H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + s.p);
      ctx.fillStyle = '#fff'; ctx.fillRect(s.x, (s.y * 2.2 + k * 20) % 1400, s.r + 0.5, s.r + 0.5);
    }
    ctx.globalAlpha = 1;
    // dünya
    ctx.fillStyle = '#1d6fd8'; ctx.beginPath(); ctx.arc(W / 2, 1900, 700, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2fbf71'; ctx.beginPath(); ctx.ellipse(380, 1260, 160, 60, -0.2, 0, TAU); ctx.ellipse(760, 1300, 120, 50, 0.3, 0, TAU); ctx.fill();
    // ay
    var mx = 540, my = 820, mr = 190;
    var mg = ctx.createRadialGradient(mx - 60, my - 60, 30, mx, my, mr);
    mg.addColorStop(0, '#f4f4ee'); mg.addColorStop(1, '#a9a9a0');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    [[-80, -40, 36], [60, 50, 50], [90, -90, 24], [-40, 110, 28], [-120, 60, 18]].forEach(function (c) { ctx.beginPath(); ctx.arc(mx + c[0], my + c[1], c[2], 0, TAU); ctx.fill(); });
    // dolmuş: önce yörünge, sonra Ay'a iniş
    var bx, by, rot, sc = 0.34;
    if (k < 2.6) {
      var a = -PI * 0.9 + k * 1.6;
      bx = mx + Math.cos(a) * 330; by = my + Math.sin(a) * 250; rot = a + PI / 2;
    } else {
      var lk = Math.min(1, (k - 2.6) / 0.8);
      var a2 = -PI * 0.9 + 2.6 * 1.6;
      var ox = mx + Math.cos(a2) * 330, oy = my + Math.sin(a2) * 250;
      bx = lerp(ox, mx, LG.ease.outCubic(lk)); by = lerp(oy, my - mr + 4, LG.ease.outCubic(lk)); rot = lerp(a2 + PI / 2, 0, lk);
    }
    // bayrak
    if (k > 3.3) {
      var fk = Math.min(1, (k - 3.3) / 0.5);
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(mx + 120, my - mr + 40); ctx.lineTo(mx + 120, my - mr + 40 - 110 * fk); ctx.stroke();
      if (fk >= 1) {
        ctx.fillStyle = '#ffd400'; ctx.fillRect(mx + 122, my - mr - 70, 120, 56);
        ctx.fillStyle = '#111'; ctx.font = '900 24px ' + ui.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('DOLMUŞ', mx + 182, my - mr - 42);
      }
    }
    var saveBT = { tx: BT.tx, ty: BT.ty, px: BT.px, py: BT.py, rot: BT.rot, sx: BT.sx, sy: BT.sy, cos: BT.cos, sin: BT.sin };
    BT.tx = bx; BT.ty = by; BT.px = 0; BT.py = 0; BT.rot = rot; BT.sx = sc * (1 + 0.08 * bus.f); BT.sy = sc * (1 + 0.14 * bus.f); BT.cos = Math.cos(rot); BT.sin = Math.sin(rot);
    drawBus(ctx, t, true);
    for (var key in saveBT) BT[key] = saveBT[key];
    ui.text(ctx, 'AY’A DOLMUŞ SEFERİ!', W / 2, 1090, { size: 74, color: '#ffd400' });
    ui.text(ctx, R.u.name + ' sayesinde 🚀', W / 2, 1160, { size: 44, color: '#fff', maxWidth: 900 });
    if (k > 3.6) {
      var bb = R.bub || (R.bub = (function () { var o = { text: "Ay'da inecek var!", w: 0, h: 0 }; A.measureBubble(ctx, o); return o; })());
      A.bubble(ctx, bb, mx - 10, my - mr - 50, 1, 1);
    }
  }

  // HUD
  var titleW = 0;
  function drawHUD(ctx, t) {
    // başlık
    if (!titleW) { ctx.save(); ctx.font = ui.font(76, 900); titleW = ctx.measureText('İNECEK VAR!').width; ctx.restore(); }
    var tw = titleW + 92, tx = 540 - tw / 2;
    var bounce = 1 + Math.sin(t * 3) * 0.02;
    ctx.save(); ctx.translate(540, 287); ctx.scale(bounce, bounce); ctx.translate(-540, -287);
    ui.text(ctx, 'İNECEK VAR!', tx + titleW / 2, 290, { size: 76, weight: 900, color: '#ffd400', strokeColor: '#3b1d00', strokeWidth: 14 });
    ui.emoji(ctx, '🚐', tx + titleW + 52, 286, 72);
    ctx.restore();
    // hız göstergesi (beğeni / "bas" / "yavaş" gelince halka parlar)
    if (G.gaugeT > 0) {
      var ga = Math.min(1, G.gaugeT / 0.3);
      ctx.save(); ctx.globalAlpha = ga; ctx.lineWidth = 9; ctx.strokeStyle = G.gaugeCol || '#ff4d6d';
      ctx.beginPath(); ctx.arc(108, 290, 64 + (1 - ga) * 10, 0, TAU); ctx.stroke(); ctx.restore();
    }
    A.speedo(ctx, 108, 290, 56, G.kmh, 140, t);
    // yolcu sayısı
    var n = aboard.length;
    ui.text(ctx, 'Yolcu: ' + LG.fmt(n), 1036, 270, { size: 40, align: 'right', color: '#fff', maxWidth: 196 });
    ui.text(ctx, '(14 koltuk ' + (n > 60 ? '🤯' : n > 14 ? '😅' : '🙂') + ')', 1036, 312, { size: 26, align: 'right', color: n > 14 ? '#ffd166' : '#d9f99d', maxWidth: 196 });
    // rota tabelası
    var flip = G.plateFlip >= 0 ? G.plateFlip : null;
    A.plate(ctx, 540, 380, 1000, 74, G.plateText || routeSign(), flip);
    // durak şeridi
    var stripA = fx.flight ? 0.55 : 1;
    ctx.save(); ctx.globalAlpha = stripA;
    ui.panel(ctx, 40, 426, 1000, 58, { r: 29, fill: 'rgba(10,10,30,0.7)', border: 'rgba(255,255,255,0.22)', lineWidth: 3 });
    var x0 = 76, dx = 62, y = 455, N = G.route.stops.length;
    var prog = 0;
    if (G.state === 'drive' || G.state === 'ebrake' || G.state === 'pause' || G.state === 'depart') prog = clamp(G.seg / SEG_TIME, 0, 0.92);
    else if (G.state === 'brake') prog = 0.92 + 0.08 * Math.min(1, G.st / G.brakeT);
    var cur = G.state === 'brake' ? G.stopIdx : G.stopIdx;
    var target = G.skipToEnd ? lastStop() : cur + 1;
    var busPos = x0 + (cur + (target - cur) * prog) * dx;
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x0, y - 3, dx * (N - 1), 6);
    ctx.fillStyle = '#ffd400'; ctx.fillRect(x0, y - 3, Math.max(0, busPos - x0), 6);
    for (var i = 0; i < N; i++) {
      var sx = x0 + i * dx;
      if (i === N - 1) { ui.emoji(ctx, '🏁', sx + 4, y, 30); continue; }
      ctx.beginPath(); ctx.arc(sx, y, i === target ? 11 + Math.sin(t * 6) * 2 : 9, 0, TAU);
      ctx.fillStyle = i <= cur ? '#ffd400' : 'rgba(30,30,50,0.95)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = i === target ? '#ff4d6d' : '#fff'; ctx.stroke();
    }
    // mini dolmuş
    ctx.fillStyle = '#ffcc00'; A.rr(ctx, busPos - 18, y - 30, 36, 20, 6); ctx.fill();
    ctx.strokeStyle = '#3b2a00'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#6ec6ff'; ctx.fillRect(busPos - 12, y - 26, 20, 7);
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(busPos - 9, y - 9, 4, 0, TAU); ctx.arc(busPos + 9, y - 9, 4, 0, TAU); ctx.fill();
    var label;
    if (G.state === 'final' || G.state === 'summary') label = '🏁 SON DURAK: ' + stopName(lastStop());
    else if (G.state === 'stopped') label = '🚏 Durak: ' + stopName(G.stopIdx);
    else label = '🚏 Sıradaki: ' + stopName(target);
    var waiting = crowd.length;
    if (waiting > 0 && G.state !== 'summary') label += '  ·  🙋 ' + LG.fmt(waiting);
    ui.text(ctx, label, x0 + dx * (N - 1) + 34, y + 2, { size: 30, align: 'left', maxWidth: 1030 - (x0 + dx * (N - 1) + 34), color: '#fff', strokeWidth: 5 });
    ctx.restore();
    // ipucu şeridi
    ui.hintBar(ctx, 90, 1222, 900, D.HINTS, { h: 66, size: 34, period: 3.4 });
  }

  var BAN_SMALL = { x: 160, y: 489, w: 760, h: 70 };
  function drawBanner(ctx, t) {
    if (!banner) return;
    var b = banner, big = b.tier >= 3;
    var inK = Math.min(1, b.t / 0.4), outK = Math.min(1, (b.dur - b.t) / 0.3);
    var a = Math.max(0, Math.min(inK * 1.5, outK, 1));
    var title = b.u.name + ' · ' + b.gname + (b.count > 1 ? ' x' + b.count : '');
    ctx.save(); ctx.globalAlpha = a;
    if (!big) {
      // küçük teşekkür: durak şeridinin altında kompakt şerit (rota tabelasını kapatmaz)
      var S = BAN_SMALL, cy = S.y + S.h / 2 - (1 - LG.ease.outBack(inK)) * 30;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; A.rr(ctx, S.x + 4, cy - S.h / 2 + 6, S.w, S.h, 35); ctx.fill();
      ctx.fillStyle = '#ffcc00'; A.rr(ctx, S.x, cy - S.h / 2, S.w, S.h, 35); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = '#3b2a00'; ctx.stroke();
      ui.avatar(ctx, b.u, S.x + 40, cy, 25, { ring: '#3b2a00', ringWidth: 4 });
      ui.text(ctx, title, S.x + 76, cy - 14, { size: 28, align: 'left', color: '#1d1300', stroke: false, maxWidth: S.w - 160 });
      ui.text(ctx, b.sub, S.x + 76, cy + 17, { size: 22, align: 'left', color: '#8a1c1c', stroke: false, maxWidth: S.w - 160 });
      ui.emoji(ctx, b.emoji, S.x + S.w - 42, cy + Math.sin(t * 8) * 4, 44);
      ctx.restore();
      return;
    }
    var w = 940, h = 132;
    var y = 414 - (1 - LG.ease.outBack(inK)) * 50;
    var x = 540 - w / 2;
    if (b.tier >= 5) {
      var rg = ctx.createRadialGradient(540, y, 20, 540, y, 600);
      rg.addColorStop(0, 'rgba(255,215,0,0.35)'); rg.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, y - 600, W, 1200);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; A.rr(ctx, x + 6, y - h / 2 + 8, w, h, 22); ctx.fill();
    ctx.fillStyle = '#ffcc00'; A.rr(ctx, x, y - h / 2, w, h, 22); ctx.fill();
    ctx.save(); A.rr(ctx, x, y - h / 2, w, h, 22); ctx.clip();
    A.checker(ctx, x, y - h / 2, w, 14); A.checker(ctx, x, y + h / 2 - 14, w, 14);
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#3b2a00'; A.rr(ctx, x, y - h / 2, w, h, 22); ctx.stroke();
    var ar = 44;
    ui.avatar(ctx, b.u, x + 24 + ar, y, ar, { ring: '#3b2a00', ringWidth: 5 });
    var tx = x + 24 + ar * 2 + 22;
    ui.text(ctx, title, tx, y - 22, { size: 44, align: 'left', color: '#1d1300', stroke: false, maxWidth: w - (tx - x) - 110 });
    ui.text(ctx, b.sub, tx, y + 26, { size: 32, align: 'left', color: '#8a1c1c', stroke: false, maxWidth: w - (tx - x) - 110 });
    ui.emoji(ctx, b.emoji, x + w - 60, y + Math.sin(t * 8) * 6, 76);
    ctx.restore();
  }

  function drawBigTexts(ctx, t) {
    for (var i = 0; i < bigTexts.length; i++) {
      var b = bigTexts[i];
      var k = b.t / b.life;
      var sc = b.t < 0.35 ? LG.ease.outBack(b.t / 0.35) : 1;
      var a = k > 0.8 ? (1 - k) / 0.2 : 1;
      var y = b.y || 600 + i * 10;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(540, y); ctx.scale(sc, sc); ctx.rotate(Math.sin(t * 5) * 0.02);
      ui.text(ctx, b.text, 0, 0, { size: b.size, color: b.color, strokeColor: '#1a0f00', strokeWidth: b.size * 0.16, maxWidth: 980 });
      if (b.sub) ui.text(ctx, b.sub, 0, b.size * 0.75, { size: b.size * 0.4, color: '#fff', maxWidth: 900 });
      ctx.restore();
    }
  }

  function drawSummary(ctx, t) {
    if (!summary) return;
    var s = summary, k = G.st;
    var a = Math.min(1, k / 0.4);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, LG.H);
    var x = 60, y = 500, w = 960, h = 610;
    var sc = LG.ease.outBack(Math.min(1, k / 0.5));
    ctx.translate(540, y + h / 2); ctx.scale(sc, sc); ctx.translate(-540, -(y + h / 2));
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; A.rr(ctx, x + 8, y + 10, w, h, 34); ctx.fill();
    ctx.fillStyle = '#1b1b33'; A.rr(ctx, x, y, w, h, 34); ctx.fill();
    ctx.save(); A.rr(ctx, x, y, w, h, 34); ctx.clip();
    ctx.fillStyle = '#ffcc00'; ctx.fillRect(x, y, w, 104);
    A.checker(ctx, x, y + 104, w, 16);
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#ffcc00'; A.rr(ctx, x, y, w, h, 34); ctx.stroke();
    ui.text(ctx, '🏁 SON DURAK! 🏁', 540, y + 52, { size: 64, color: '#1d1300', stroke: false });
    ui.text(ctx, s.route, 540, y + 150, { size: 32, color: '#ffd166', maxWidth: 900 });
    var rows = [];
    rows.push({ icon: '👥', text: 'Taşınan yolcu: ' + LG.fmt(s.carried) + (s.total > s.carried ? '  (bugün ' + LG.fmt(s.total) + ')' : '') });
    if (s.longest) rows.push({ icon: '🛣️', u: s.longest.u, text: 'En uzun yolculuk: ' + s.longest.u.name + ' (' + s.longest.n + ' durak)' });
    if (s.off) rows.push({ icon: '🛑', u: s.off.u, text: 'En çok "inecek var" diyen: ' + s.off.u.name + ' (' + s.off.n + ')' });
    if (s.relay) rows.push({ icon: '🤝', u: s.relay.u, text: 'En yardımsever: ' + s.relay.u.name + ' (' + s.relay.n + ' kez para uzattı)' });
    rows.push({ icon: '😂', text: 'Günün anı: ' + s.moment, wrap: true });
    var ry = y + 210;
    for (var i = 0; i < rows.length; i++) {
      var rk = clamp((k - 0.5 - i * 0.35) / 0.35, 0, 1);
      if (rk <= 0) continue;
      var r = rows[i];
      ctx.save(); ctx.globalAlpha = a * rk; ctx.translate((1 - LG.ease.outCubic(rk)) * 80, 0);
      ui.emoji(ctx, r.icon, x + 60, ry, 46);
      var tx = x + 100;
      if (r.u) { ui.avatar(ctx, r.u, tx + 26, ry, 24, { ringWidth: 3 }); tx += 62; }
      ui.text(ctx, r.text, tx, ry + 2, { size: r.wrap ? 30 : 34, align: 'left', maxWidth: x + w - 30 - tx, color: '#fff' });
      ctx.restore();
      ry += 74;
    }
    var left = Math.max(0, Math.ceil(11 - k));
    ui.text(ctx, 'Sıradaki sefer: ' + s.next + '  ·  ' + left + ' sn', 540, y + h - 40, { size: 28, color: '#bde0fe', maxWidth: 900 });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Sunucu kısayolları
  // ---------------------------------------------------------------------------
  LG.onKey('n', 'Sonraki durağa hemen geç', function () {
    if (G.state === 'drive' || G.state === 'depart') G.brakeNow = true;
    else if (G.state === 'stopped' || G.state === 'estop') G.forceGo = true;
    else if (G.state === 'summary') G.forceGo = true;
  });
  LG.onKey('b', 'Son durak (rotayı bitir)', function () {
    if (G.state === 'summary') { G.forceGo = true; return; }
    if (G.state === 'final') return;
    G.skipToEnd = true;
    if (G.state === 'drive' || G.state === 'depart') G.brakeNow = true;
    else if (G.state === 'stopped') G.forceGo = true;
  });
  LG.onKey('g', 'Korna çal', function () { honk(); });
  LG.onKey('f', 'Frene asıl (Bi dakka!)', function () { emergency(true); });
  LG.onKey('k', 'Klimayı aç (camlar)', function () { klima(); });
  LG.onKey('t', 'Arabesk müzik', function () { music(); });

  // Simülatör: dolmuştakiler sık sık "inecek var" der
  LG.sim.comments = D.SIM_COMMENTS;
  LG.sim.genComment = function (u) {
    if (byUser.has(u.id) && Math.random() < 0.35) return pick(D.SIM_ABOARD);
    return null;
  };

  // ---------------------------------------------------------------------------
  LG.start({
    id: 'dolmus',
    title: 'İnecek Var! 🚐',
    init: function () {
      var start = LG.store.get('dolmus:route', 0) | 0;
      setRoute(start, start);
      G.plateText = routeSign(); G.plateFlip = -1; G.nextPlate = null;
      initScene();
      startStopState('stopped');
      LG.music.play('chill');
    },
    update: update,
    render: function (ctx, t) {
      computeBT();
      var space = fx.rocket && fx.rocket.t >= 4.0 && fx.rocket.t < 10.5;
      ctx.save();
      ui.applyShake(ctx);
      if (space) {
        drawSpace(ctx, t);
      } else {
        drawBackground(ctx, t);
        // gölge
        var sh = clamp(1 - bus.alt / 400, 0.2, 1);
        ctx.fillStyle = 'rgba(0,0,0,' + 0.3 * sh + ')';
        ctx.beginPath(); ctx.ellipse(BUS_X, GROUND + 2, 400 * sh, 16 * sh, 0, 0, TAU); ctx.fill();
        drawSpeedLines(ctx);
        if (flyK > 0.02) { toWorld(-366, -150, tmp); A.rainbow(ctx, tmp.x, tmp.y, t, flyK); }
        drawBus(ctx, t, false);
        drawWind(ctx, t);
        drawProps(ctx, t);
        for (var fc = 0; fc < fClouds.length; fc++) A.cloud(ctx, fClouds[fc].x, fClouds[fc].y, fClouds[fc].s, 0.93);
        var showSign = G.state === 'brake' ? true : G.signX > -200 && G.signX < W + 200;
        if (showSign) A.stopSign(ctx, G.signX, 1150, G.signName, 1);
        drawCrowdAndWalkers(ctx, t);
        drawAllTags(ctx, t);
        drawBubbles(ctx);
        drawNotesWorld(ctx, t);
      }
      ctx.restore();
      drawHUD(ctx, t);
      drawBanner(ctx, t);
      drawToasts(ctx);
      drawBigTexts(ctx, t);
      drawSummary(ctx, t);
    },
  });
})();
