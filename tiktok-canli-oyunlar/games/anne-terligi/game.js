/*
 * ANNE TERLİĞİ! 🩴 — "kırmızı ışık / yeşil ışık"ın Türk evi hali (aile dostu şakşak komedi).
 * Gece yarısı pijamalı çocuklar buzdolabındaki baklavaya sinsice ilerler; anne dönünce kıpırdayan terliği yer.
 *
 *   💬 Yorum yaz (ya da "katıl")      → çocuğun koridordaki başlangıç çizgisinde belirir
 *   🚶 "git / ilerle / yürü / koş"     → bir adım
 *   ❤️ Her 10 beğeni                   → minik adım
 *   🔴 Anne bakarken kıpırdarsan       → TERLİK! (başa yuvarlanırsın, elenmezsin)
 *   🎁 Hediye                          → anneyi oyala: herkes için yeşil süre (kozmetik/topluluk etkisi; ödül yok)
 *
 * Sunucu: T = anne şimdi dönsün · G = yeşil (anne işine dönsün) · N = yeni tur · B = turu bitir
 * URL: ?tur=150 (tur saniyesi) · ?kazanan=10 (tur kaç kişide biter) · ?adim=0.085 (adım büyüklüğü)
 */
(function () {
  'use strict';
  var ui = LG.ui, A = window.ATArt, G = A.GEO;
  var W = LG.W, TAU = Math.PI * 2;
  ui.celebrateEnabled = false;            // hediye kutlamalarını oyun kendisi çiziyor
  ui.toastPos = { x: LG.SAFE.x + 10, y: 1150 };

  var CFG = {
    roundLen: LG.clamp(LG.qn('tur', 150), 45, 600),
    maxWin: LG.clamp(LG.qn('kazanan', 10), 1, 10),
    step: LG.clamp(LG.qn('adim', 0.085), 0.02, 0.5),
    tiny: 0.028,
    finalSec: 30,
    endCard: 9,
  };
  var FULL_CAP = 34, MINI_CAP = 70, START_CAP = 14, TAG_CAP = 16;

  var TREATS = [
    { id: 'baklava', name: 'BAKLAVA', acc: 'BAKLAVAYI', lab: 'Baklavayı', emoji: '🍯' },
    { id: 'sarma', name: 'SARMA', acc: 'SARMAYI', lab: 'Sarmayı', emoji: '🍃' },
    { id: 'lokum', name: 'LOKUM', acc: 'LOKUMU', lab: 'Lokumu', emoji: '🍬' },
    { id: 'dondurma', name: 'DONDURMA', acc: 'DONDURMAYI', lab: 'Dondurmayı', emoji: '🍦' },
    { id: 'kofte', name: 'KURU KÖFTE', acc: 'KÖFTEYİ', lab: 'Kuru köfteyi', emoji: '🧆' },
  ];
  var GIT = ['git', 'ilerle', 'yürü', 'yuru', 'koş', 'kos', 'ileri', 'adım', 'adim', 'go', 'gidiyorum', 'yürüyorum'];
  var HINTS = ['💬 Yorum yaz → oyuna gir', '🚶 git yaz → bir adım at', '🔴 Anne bakarken kıpırdama!', '❤️ 10 beğeni → minik adım', '🎁 Hediye → anneyi oyala (herkes ilerler)'];

  // Yol geometrisi (koridor: aşağıda başlangıç çizgisi, yukarıda mutfak + buzdolabı)
  var Y0 = 1180, YT = 760, FX = 818, FY = 752, PH = 0.88;
  var SEAT_Y = 716;
  var HIT_DUR = 1.0;

  // ---------------------------------------------------------------------------
  // Durum
  // ---------------------------------------------------------------------------
  var board = new LG.Board();
  var kids = new Map(), kidList = [];
  var wt = 0;                         // dünya zamanı (ağır çekimde yavaşlar)
  var S = {
    round: 0, treat: TREATS[0], phase: 'play', roundT: 0, endT: 0, introT: 0, final: false,
    winners: [], hits: 0, hitKids: new Set(), endAt: 0, rainT: -1, rainBy: null, sum: null,
    fridgeOpen: 0, fridgeOpenT: 0, ts: 1, vaseBroken: false, roundStart: 0,
  };
  var mom = {
    st: 'busy', t: 0, dur: 6, x: 540, tx: 540, act: 'bulasik', view: 'away', flip: 1, face: 1,
    armPh: 0, tilt: 0, throwT: 0, walkPh: 0, walking: false, prop: null, scan: 0, still: false,
    redId: 0, slowDone: false, lastFake: false, distract: null, queued: null, cool: 0,
    bubble: null, pendingTurn: false, clatT: 0, caughtAny: false,
  };
  var cat = null;
  var pending = [], flights = [], comics = [], floorS = [], shards = [], rainP = [];
  var feedArr = [], banners = [], banner = null, bannerGap = 0, bigs = [], big = null;
  var slow = { on: false, after: 0, max: 0, fx: 540, fy: 900 };
  var cam = { z: 1 };
  var visFull = [], visMini = [], drawList = [], tagList = [], hiddenCount = 0, selT = 0, selDirty = true;
  var bg = null, chalkCv = null, chalkT = 0, chalkDirty = true;
  var L = layout();

  function layout() {
    var c = LG.CAM;
    if (c && c.y < 700 && c.x > 500) return { titleX: 380, titleW: 600, signX: 405, signW: 440, treatX: -999, timerX: 110 };
    if (c && c.y < 700) return { titleX: 700, titleW: 600, signX: 675, signW: 440, treatX: -999, timerX: 970 };
    return { titleX: 540, titleW: 700, signX: 540, signW: 600, treatX: 110, timerX: 970 };
  }

  function isRed() { return mom.st === 'turn' || mom.st === 'look'; }
  function isWarn() { return mom.st === 'warn' || mom.st === 'fake'; }
  function smooth01(v) { v = LG.clamp(v, 0, 1); return v * v * (3 - 2 * v); }

  // ---------------------------------------------------------------------------
  // Çocuklar
  // ---------------------------------------------------------------------------
  var PJ = [['#ff8fab', '#d6587a'], ['#8ecae6', '#4f8fb8'], ['#95e6a4', '#53a866'], ['#ffd6a5', '#d99a55'], ['#cdb4db', '#9474b0'],
    ['#ffadad', '#cf6464'], ['#a0c4ff', '#5d84d4'], ['#fdffb6', '#c4c053'], ['#ffc6ff', '#c27fc2'], ['#9bf6ff', '#4fb5c2']];
  var SKINS = ['#f8d5b8', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

  function makeKid(u) {
    var h = LG.hash(u.id);
    var pj = PJ[h % PJ.length];
    return {
      id: u.id, u: u,
      look: { col: pj[0], colD: pj[1], skin: SKINS[(h >>> 4) % SKINS.length], pat: (h >>> 8) % 3, cap: ((h >>> 11) % 3) === 0, capCol: PJ[(h >>> 13) % PJ.length][1] },
      head: null, headPhoto: false,
      lane: 0.06 + ((h >>> 16) % 1000) / 1000 * 0.88,
      dz: (((h >>> 6) % 100) / 100 - 0.5) * 36,
      ph: (h % 628) / 100,
      fp: (h >>> 3) % 6,
      p: 0, pFrom: 0, stepT: 1, stepDur: 0.3, stepN: 0,
      state: 'idle', st: 0, terlik: 0, pillow: 0, likeAcc: 0,
      joinT: LG.time, lastAct: LG.time, lastMove: -99, lastStep: -99, caughtRed: -1, dazeT: 0,
      x: 0, y: Y0, s: 1, vis: 0, rank: 0, seat: -1, heartT: 0, glowT: 0,
      hx0: 0, hy0: 0, hs0: 1, wx0: 0, wy0: 0, ws0: 1, hopT: 0,
    };
  }
  function headOf(k) {
    var photo = !!LG.avatarImg(k.u);
    if (!k.head || (photo && !k.headPhoto)) {
      var c = k.head || document.createElement('canvas');
      c.width = c.height = 60;
      var x = c.getContext('2d');
      x.clearRect(0, 0, 60, 60);
      ui.avatar(x, k.u, 30, 30, 26, { ring: '#fff', ringWidth: 3.5 });
      k.head = c; k.headPhoto = photo;
    }
    return k.head;
  }
  var tmpP = { x: 0, y: 0, s: 1 };
  function scaleAt(y) { return LG.lerp(0.6, 1.2, LG.clamp((y - FY) / (Y0 - FY), 0, 1)); }
  function pathPoint(k, p, out) {
    var x, y;
    var q = Math.min(1, p / PH);
    var e = 1 - Math.pow(1 - q, 1.35);
    y = LG.lerp(Y0 + k.dz, YT + k.dz * 0.15, e);
    var conv = smooth01((q - 0.3) / 0.7);
    var u = LG.lerp(k.lane, 0.48 + k.lane * 0.46, conv);
    var fe = A.floorEdge(y);
    x = LG.lerp(fe.l + 40, fe.r - 40, u);
    if (p > PH) {
      var q2 = smooth01((p - PH) / (1 - PH));
      x = LG.lerp(x, FX, q2); y = LG.lerp(y, FY, q2);
    }
    out.x = x; out.y = y; out.s = scaleAt(y);
    return out;
  }
  function dispP(k) { return k.stepT >= 1 ? k.p : LG.lerp(k.pFrom, k.p, LG.ease.outCubic(k.stepT)); }
  function seatPos(i) { return { x: 70 + i * 27, y: SEAT_Y - (i % 2) * 7 }; }

  function ensureKid(u, quiet) {
    var k = kids.get(u.id);
    if (k) return k;
    k = makeKid(u);
    kids.set(u.id, k); kidList.push(k);
    pathPoint(k, 0, k);
    if (kidList.length > 1600) prune(300);
    if (!quiet) LG.sfx('join');
    feedJoin(u);
    selDirty = true;
    return k;
  }
  function prune(n) {
    var cand = kidList.filter(function (k) { return k.state === 'idle' && k.p <= 0 && k.vis === 0; });
    cand.sort(function (a, b) { return a.lastAct - b.lastAct; });
    var rm = new Set();
    for (var i = 0; i < Math.min(n, cand.length); i++) rm.add(cand[i].id);
    kidList = kidList.filter(function (k) { if (rm.has(k.id)) { kids.delete(k.id); return false; } return true; });
  }
  function canAct(k) { return S.phase === 'play' && k.state === 'idle' && k.dazeT <= 0; }

  function tryMove(k, amt, isLike, auto) {
    if (!canAct(k)) return false;
    if (LG.time - k.lastStep < (isLike ? 0.18 : 0.32)) return false;
    if (!auto) k.lastAct = LG.time;
    if (isRed()) { caught(k); return false; }
    k.lastStep = LG.time;
    k.pFrom = dispP(k);
    k.p = Math.min(1, k.p + amt * (S.final ? 2 : 1));
    k.stepT = 0; k.stepDur = isLike ? 0.28 : 0.42; k.stepN++;
    k.lastMove = LG.time;
    if (k.p >= 1) reach(k);
    else if (!auto) LG.sfx('tick', { gap: 60 });
    selDirty = true;
    return true;
  }

  function caught(k) {
    if (k.caughtRed === mom.redId) return;
    k.caughtRed = mom.redId;
    pathPoint(k, dispP(k), k);
    k.p = dispP(k); k.stepT = 1;
    k.state = 'caught'; k.st = 0;
    pending.push(k);
    selDirty = true;
  }

  function reach(k) {
    k.state = 'won'; k.st = 0;
    pathPoint(k, dispP(k), tmpP);
    k.wx0 = tmpP.x; k.wy0 = tmpP.y; k.ws0 = tmpP.s;
    k.stepT = 1; k.p = 1;
    S.winners.push(k);
    k.rank = S.winners.length; k.seat = k.rank - 1;
    board.add(k.u, 1); chalkDirty = true;
    k.u.data.atTreats = (k.u.data.atTreats || 0) + 1;
    S.fridgeOpenT = 1.8;
    var medal = k.rank <= 3 ? ['🥇', '🥈', '🥉'][k.rank - 1] + ' ' : '';
    addBanner({ kind: 'win', user: k.u, text: medal + S.treat.acc + ' KAPTI: ' + k.u.name + '!', sub: k.rank + '. sırada buzdolabına ulaştı · +1 ' + S.treat.emoji, icon: S.treat.emoji, color: '#ffd166', dur: 2.6, front: k.rank <= 3 });
    ui.float('KAPTI! ' + S.treat.emoji, G.FRIDGE.x + 60, G.FRIDGE.y - 10, { color: '#ffd166', size: 52, life: 1.8 });
    ui.burst(FX + 30, FY - 80, { count: k.rank === 1 ? 70 : 34, speed: 650 });
    LG.sfx('coin'); LG.sfx(k.rank === 1 ? 'fanfare' : 'win');
    if (k.rank === 1) ui.shake(8, 0.3);
    if (S.winners.length >= CFG.maxWin && !S.endAt) S.endAt = S.roundT + 2.6;
    selDirty = true;
  }

  // ---------------------------------------------------------------------------
  // Terlik fırlatma
  // ---------------------------------------------------------------------------
  var nextLaunch = 0, lastAyy = 0;
  function headPos(k) { return { x: k.x, y: k.y - 88 * k.s }; }
  function updateThrows(dtw) {
    var canLaunch = mom.st === 'look' || (mom.st === 'turn' && mom.t > 0.18);
    if (pending.length && canLaunch && wt >= nextLaunch) {
      var k = pending.shift();
      if (k.state === 'caught') {
        if (flights.length >= 9) impact(k, null);
        else launch(k);
      }
      nextLaunch = wt + (pending.length > 8 ? 0.07 : flights.length > 3 ? 0.11 : 0.18);
    }
    if (pending.length && (mom.st === 'back' || mom.st === 'busy' || mom.st === 'end')) {
      // anne geri döndü ama listede kalanlar var: anında (uçuşsuz) terlik
      while (pending.length) { var kk = pending.shift(); if (kk.state === 'caught') impact(kk, null); }
    }
    for (var i = flights.length - 1; i >= 0; i--) {
      var f = flights[i];
      f.t += dtw / f.dur;
      if (f.t >= 1) { flights.splice(i, 1); impact(f.k, f); }
    }
  }
  function launch(k) {
    mom.face = 1; mom.tx = mom.x;
    var hand = A.momHand(mom.x, G.KF);
    var hp = headPos(k);
    var slowMo = !mom.slowDone && k.vis === 2;
    if (slowMo) {
      mom.slowDone = true;
      slow.on = true; slow.after = 0; slow.max = 3.2; slow.fx = LG.clamp(hp.x, 200, 880); slow.fy = LG.clamp(hp.y - 40, 520, 1100);
    }
    if (!mom.caughtAny) {
      mom.caughtAny = true;
      say(LG.pick(['GÖRDÜM SENİ! 😤', 'YAKALADIM!', 'Al sana terlik!', 'Gel buraya bakayım!', 'Kıpırdama dedim!']), 1.5);
    }
    flights.push({ k: k, x0: hand.x, y0: hand.y, x1: hp.x, y1: hp.y, t: 0, dur: slowMo ? 0.62 : 0.5, slow: slowMo, spin: LG.rand(13, 18) * (Math.random() < 0.5 ? -1 : 1) });
    mom.throwT = 0.001;
    LG.sfx('whoosh');
  }
  function flightPos(f, u) {
    var arc = 150 + Math.abs(f.x1 - f.x0) * 0.18;
    return { x: LG.lerp(f.x0, f.x1, u), y: LG.lerp(f.y0, f.y1, u) - Math.sin(u * Math.PI) * arc };
  }
  function impact(k, f) {
    var hp = headPos(k);
    var big = f && f.slow;
    if (k.state !== 'caught') return;
    if (k.pillow > 0) {
      k.pillow--; k.state = 'idle'; k.dazeT = 0.4;
      comic(hp.x, hp.y - 46 * k.s, 'PUF!', '#d7c8ff', 46 * Math.max(0.8, k.s), -0.15);
      dropSlip(hp.x, hp.y, k.x + LG.rand(-70, 70), k.y + 8, k.s);
      ui.float('🛡️ Yastık kurtardı!', hp.x, hp.y - 90 * k.s, { color: '#d7c8ff', size: 32, life: 1.4 });
      LG.sfx('boing');
      if (big) slow.after = 0.35;
      return;
    }
    k.terlik++;
    k.u.data.atTerlik = (k.u.data.atTerlik || 0) + 1;
    S.hits++; S.hitKids.add(k.id);
    k.state = 'hit'; k.st = 0;
    k.hx0 = k.x; k.hy0 = k.y; k.hs0 = k.s;
    k.p = 0; k.pFrom = 0; k.stepT = 1;
    comic(hp.x + 10, hp.y - 30 * k.s, LG.pick(['ŞAP!', 'PAT!', 'BONK!', 'ŞLAK!']), '#ffd23f', (big ? 72 : 48) * Math.max(0.75, k.s), LG.rand(-0.3, 0.3));
    if (big || LG.time - lastAyy > 0.3) { lastAyy = LG.time; ui.float(LG.pick(['AYY!', 'AYY!', 'OFF!', 'ANNEEE!']), hp.x, hp.y - 70 * k.s, { color: '#ff8fab', size: big ? 64 : 40, life: 1.3 }); }
    if (k.vis) ui.burst(hp.x, hp.y, { count: big ? 10 : 4, shape: 'emoji', emoji: '⭐', speed: 380, size: 12, life: 0.9, gravity: 600 });
    dropSlip(hp.x, hp.y, k.x + LG.rand(-60, 60), k.y + LG.rand(-6, 10), k.s);
    ui.shake(big ? 20 : 7, big ? 0.45 : 0.22);
    LG.sfx('clap'); LG.sfx('boing');
    if (big || Math.random() < 0.25) LG.sfx('laugh');
    if (big) { slow.after = 0.45; ui.flash('#ffffff', 0.18); }
    selDirty = true;
  }
  function comic(x, y, text, col, sz, rot) {
    comics.push({ x: x, y: y, text: text, col: col, sz: sz, rot: rot || 0, t: 0, dur: 0.9 });
    if (comics.length > 8) comics.shift();
  }
  function dropSlip(x0, y0, x1, y1, s) {
    floorS.push({ x0: x0, y0: y0, x1: x1, y1: y1, s: s, t: 0, r0: Math.random() * 6, r1: LG.rand(-0.7, 0.7) });
    if (floorS.length > 40) floorS.shift();
  }

  // ---------------------------------------------------------------------------
  // Anne (durum makinesi)
  // ---------------------------------------------------------------------------
  function say(text, dur) { mom.bubble = { text: text, t: 0, dur: dur || 1.6 }; }
  function musicOn() {
    if (S.phase !== 'play') return;
    var want = S.final ? 'race' : 'chill';
    if (LG.music.style !== want) LG.music.play(want);
  }
  function musicOff() { LG.music.stop(); }

  function startBusy(d) {
    mom.st = 'busy'; mom.t = 0;
    mom.dur = d != null ? d : S.final ? LG.rand(3.4, 6) : LG.rand(4.6, 8.6);
    if (!mom.distract) {
      mom.act = Math.random() < 0.62 ? 'bulasik' : 'tencere';
      mom.tx = mom.act === 'bulasik' ? 540 : 700;
    }
    mom.view = 'away'; mom.flip = 1; mom.prop = null; mom.still = false; mom.tilt = 0;
    musicOn();
  }
  function startWarn(d) {
    mom.st = 'warn'; mom.t = 0; mom.dur = d || LG.rand(0.6, 1.2);
    mom.still = true; mom.tilt = 0.14;
    musicOff();
    LG.sfx('drum');
    say('👀 Hmm?', mom.dur + 0.4);
  }
  function afterWarn() {
    if (!mom.lastFake && Math.random() < 0.22) {
      mom.st = 'fake'; mom.t = 0; mom.dur = 0.9; mom.lastFake = true; mom.tilt = -0.1;
      say(LG.pick(['Neyse… 🤷‍♀️', 'Bana öyle geldi…', 'Rüzgâr herhalde…']), 1.3);
    } else startTurn();
  }
  function startTurn() {
    mom.st = 'turn'; mom.t = 0; mom.dur = 0.24;
    mom.redId++; mom.slowDone = false; mom.lastFake = false; mom.caughtAny = false;
    mom.tx = mom.x; mom.still = true; mom.prop = null; mom.face = 1;
    nextLaunch = wt + 0.2;
    musicOff();
    LG.sfx('honk');
    ui.flash('#ff2d2d', 0.22);
    ui.shake(5, 0.15);
  }
  function startLook() {
    mom.st = 'look'; mom.t = 0;
    mom.dur = S.final ? LG.rand(2.1, 3.2) : LG.rand(2.4, 3.8);
    mom.view = 'front'; mom.flip = 1; mom.tilt = 0;
    say(LG.pick(['Ne oluyor orada?! 🤨', 'Kim kıpırdadı?', 'Uyumadınız mı siz?!', 'Hıh?!', 'Bana bakın bakayım!']), 1.3);
  }
  function startBack() {
    mom.st = 'back'; mom.t = 0; mom.dur = 0.24;
    if (!mom.caughtAny) say(LG.pick(['Hıı… iyi.', 'Uslu durun!', 'Hmph.']), 1.0);
  }

  var DIS = {
    cat: { dur: 5, tier: 2, label: 'Kedinin peşinde 🐈', title: 'KEDİ VAZOYU DEVİRDİ! 🐈', icon: '🐈' },
    phone: { dur: 10, tier: 3, label: 'Telefonda dedikodu 📞', title: 'TELEFON ÇALDI! 📞', icon: '📞' },
    guests: { dur: 15, tier: 4, label: 'Misafir karşılıyor 🚪', title: 'TEYZELER MİSAFİRLİĞE GELDİ! 👵', icon: '👵' },
  };
  // Hediye → anneyi oyala. 'started' | 'extended' | 'queued' | 'none' döner.
  function distract(kind, user, mult) {
    if (S.phase !== 'play' || S.rainT >= 0) return 'none';
    var d = DIS[kind];
    var add = d.dur * (mult || 1);
    if (mom.distract) {
      var md = mom.distract;
      if (d.tier > DIS[md.kind].tier) { md.kind = kind; md.k0 = md.t; md.user = user; initDistract(md); }
      var rem = md.dur - md.t;
      var newRem = Math.min(rem + add, 26 - md.t, 18);
      md.dur = md.t + Math.max(rem, newRem);
      md.thanks = user;
      return 'extended';
    }
    if (mom.cool > 0 || (mom.x < 150 && !mom.distract)) {
      var q = mom.queued;
      if (!q) mom.queued = { kind: kind, user: user, dur: add };
      else { if (d.tier > DIS[q.kind].tier) { q.kind = kind; q.user = user; } q.dur = Math.min(16, q.dur + add); }
      return 'queued';
    }
    beginDistract(kind, user, add);
    return 'started';
  }
  function beginDistract(kind, user, dur) {
    var wasRed = isRed();
    mom.distract = { kind: kind, user: user, thanks: user, t: 0, k0: 0, dur: Math.min(18, dur), sayT: 0.8, line: 0, autoT: 1.2 };
    mom.st = 'away'; mom.t = 0; mom.view = 'away'; mom.flip = 1; mom.still = false; mom.tilt = 0;
    // anne hedefe kilitlenmişken gelen hediye: bekleyen terlikler iptal, çocuklar kurtulur
    if (pending.length) {
      for (var i = 0; i < pending.length; i++) {
        var k = pending[i];
        if (k.state === 'caught') { k.state = 'idle'; ui.float('Kurtuldu! 😅', k.x, k.y - 120 * k.s, { color: '#06d6a0', size: 30, life: 1.2 }); }
      }
      pending = [];
    }
    if (wasRed) ui.float('Aaa!', mom.x, 420, { color: '#fff', size: 44 });
    initDistract(mom.distract);
    musicOn();
  }
  function initDistract(md) {
    if (md.kind === 'cat') {
      cat = { t: 0, x: -80, y: G.KF, vx: 0, vase: !S.vaseBroken, crashT: -1 };
      mom.tx = 450; mom.prop = null;
      say('Pisi?! Ne yapıyorsun orada!', 1.6);
      LG.sfx('zap');
    } else if (md.kind === 'phone') {
      mom.tx = Math.min(Math.max(mom.x, 480), 700); mom.prop = null;
      comic(mom.x + 120, 470, 'DIRIIIN!', '#9bf6ff', 46, 0.12);
      LG.sfx('bell');
      say('Alo? Aaa sen misin! 📞', 1.8);
    } else if (md.kind === 'guests') {
      comic(150, 560, 'DİNG DONG!', '#ffd166', 54, -0.12);
      LG.sfx('bell'); setTimeout(function () { LG.sfx('bell'); }, 350);
      mom.tx = -180; mom.prop = null;
      say('Geliyoruuum! 🏃‍♀️', 1.6);
    }
  }
  var PHONE_LINES = ['Ay kız duydun mu…', 'Komşunun kızı nişanlanmış!', 'Yok artııık! 😱', 'Sus sus, anlat!', 'Hıı hıı… 🙄', 'Kayınvaliden ne dedi?', 'Vallahi billahi!'];
  var GUEST_LINES = ['Hoş bulduk kızım! 🤗', 'Çay koy da içelim ☕', 'Maşallah ne güzel olmuş ev!', 'Çocuklar uyudu mu?', 'Börek getirdik! 🥟'];
  function updateDistract(dtw) {
    var md = mom.distract;
    md.t += dtw;
    md.sayT -= dtw;
    if (md.kind === 'cat') {
      updateCat(dtw);
      if (cat && cat.crashT >= 0.4) mom.tx = LG.clamp(cat.x + (cat.flip ? 60 : -60), 250, 790);
      if (md.sayT <= 0) { md.sayT = 1.8; say(LG.pick(['Pisi pisi! Gel buraya!', 'Vazom! Vazooom! 😫', 'Yakalarsam görürsün!']), 1.4); }
    } else if (md.kind === 'phone') {
      mom.prop = md.t - md.k0 > 0.6 ? 'phone' : null;
      if (md.sayT <= 0) { md.sayT = 2.1; say(PHONE_LINES[md.line++ % PHONE_LINES.length], 1.9); }
    } else if (md.kind === 'guests') {
      mom.tx = -180;
      if (md.sayT <= 0 && mom.x < 0) { md.sayT = 2.3; md.guestLine = GUEST_LINES[md.line++ % GUEST_LINES.length]; md.guestLineT = 0; }
      if (md.guestLineT != null) md.guestLineT += dtw;
      // topluluk yardımı: misafir varken herkes sinsice ilerler
      md.autoT -= dtw;
      if (md.autoT <= 0 && mom.x < 200) {
        md.autoT = 2.0;
        var n = 0;
        for (var i = 0; i < kidList.length; i++) {
          var k = kidList[i];
          if (k.state === 'idle' && (k.p > 0 || LG.time - k.lastAct < 60)) { if (tryMove(k, CFG.tiny, true, true)) n++; }
        }
        if (n) LG.sfx('tick');
      }
    }
    if (md.t >= md.dur) endDistract();
  }
  function endDistract() {
    var md = mom.distract;
    mom.distract = null;
    mom.cool = 7; mom.prop = null;
    var walk = Math.abs(540 - mom.x) / 280;
    if (md && md.kind === 'cat' && cat) cat.leaving = true;
    mom.act = 'bulasik'; mom.tx = 540;
    startBusy(Math.max(2.2, walk + 1.4));
    say(md && md.kind === 'guests' ? 'Çocuklar uyuyor mu acaba? 🤨' : 'Neyse, ben işime bakayım… 🤨', 1.6);
  }
  function updateCat(dtw) {
    if (!cat) return;
    cat.t += dtw;
    var t = cat.t;
    if (cat.leaving) {
      cat.x -= 520 * dtw; cat.flip = true; cat.y = G.KF;
      if (cat.x < -120) cat = null;
      return;
    }
    if (t < 0.6) { cat.x = LG.lerp(-80, 290, t / 0.6); cat.y = G.KF; cat.flip = false; }
    else if (t < 0.9) { var u = (t - 0.6) / 0.3; cat.x = LG.lerp(290, 322, u); cat.y = LG.lerp(G.KF, 612, u) - Math.sin(u * Math.PI) * 70; }
    else if (t < 1.3) { cat.x = 322 + Math.sin(t * 30) * 3; cat.y = 612; }
    else {
      if (cat.crashT < 0) cat.crashT = 0;
      var u2 = t - 1.3;
      if (u2 < 0.35) { cat.x = LG.lerp(322, 250, u2 / 0.35); cat.y = LG.lerp(612, G.KF, u2 / 0.35) - Math.sin(u2 / 0.35 * Math.PI) * 50; cat.flip = true; }
      else { var nx = 470 + Math.sin((u2 - 0.35) * 1.5 + 4.2) * 340; cat.flip = nx < cat.x; cat.x = nx; cat.y = G.KF - Math.abs(Math.sin(u2 * 9)) * 10; }
    }
    if (cat.crashT >= 0) {
      cat.crashT += dtw;
      if (cat.vase && cat.crashT >= 0.4) {
        cat.vase = false; S.vaseBroken = true;
        comic(390, 680, 'ŞANGIR!', '#9bf6ff', 54, 0.1);
        LG.sfx('zap'); LG.sfx('splash'); ui.shake(8, 0.25);
        ui.burst(372, 735, { count: 18, colors: ['#1d4e89', '#ffffff', '#e63946'], speed: 440, size: 13, gravity: 1600 });
        for (var i = 0; i < 7; i++) shards.push({ x: 372 + LG.rand(-55, 55), y: 736 + LG.rand(-4, 6), r: LG.rand(0, 6), c: LG.pick(['#1d4e89', '#ffffff', '#1d4e89', '#ff8fab']) });
      }
    }
  }

  function updateMom(dtw) {
    mom.t += dtw;
    if (mom.bubble) { mom.bubble.t += dtw; if (mom.bubble.t > mom.bubble.dur) mom.bubble = null; }
    var dx = mom.tx - mom.x;
    if (Math.abs(dx) > 3 && mom.st !== 'turn' && mom.st !== 'look') {
      mom.walking = true;
      var sp = mom.distract && mom.distract.kind === 'cat' ? 420 : 300;
      mom.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dtw);
      mom.walkPh += dtw * 13;
      mom.face = dx < 0 ? -1 : 1;
    } else { mom.walking = false; if (mom.st !== 'away') mom.face = 1; }
    if (!mom.still && (mom.st === 'busy' || mom.st === 'away')) mom.armPh += dtw * 9;
    if (mom.throwT > 0) { mom.throwT += dtw; if (mom.throwT > 0.3) mom.throwT = 0; }
    if (mom.cool > 0) mom.cool -= dtw;
    switch (mom.st) {
      case 'busy':
        mom.clatT -= dtw;
        if (mom.clatT <= 0 && !mom.walking) {
          mom.clatT = LG.rand(0.3, 0.75);
          LG.sfx('tick', { gap: 50 });
          if (Math.random() < 0.35) ui.float(mom.act === 'bulasik' ? LG.pick(['şıkır', 'tıngır', 'şırıl']) : LG.pick(['fokur', 'fıkır']), mom.x + LG.rand(-70, 70), 590, { color: 'rgba(205,239,253,0.9)', size: 26, life: 0.9, vy: -70 });
        }
        if (mom.t >= mom.dur && !mom.walking && mom.x > 200) startWarn();
        break;
      case 'warn': if (mom.t >= mom.dur) afterWarn(); break;
      case 'fake': if (mom.t >= mom.dur) startBusy(LG.rand(1.6, 3)); break;
      case 'turn':
        var u = mom.t / mom.dur;
        mom.flip = Math.abs(Math.cos(Math.PI * Math.min(1, u)));
        mom.view = u < 0.5 ? 'away' : 'front';
        if (mom.t >= mom.dur) startLook();
        break;
      case 'look':
        mom.scan = Math.sin(wt * 2.6);
        if (mom.t >= mom.dur) startBack();
        break;
      case 'back':
        var ub = mom.t / mom.dur;
        mom.flip = Math.abs(Math.cos(Math.PI * Math.min(1, ub)));
        mom.view = ub < 0.5 ? 'front' : 'away';
        if (mom.t >= mom.dur) startBusy();
        break;
      case 'away': updateDistract(dtw); break;
    }
    if (mom.queued && mom.cool <= 0 && S.phase === 'play' && mom.x > 150 && (mom.st === 'busy' || isWarn() || isRed())) {
      var q = mom.queued; mom.queued = null;
      beginDistract(q.kind, q.user, q.dur);
    }
    if (mom.pendingTurn && !mom.distract && S.phase === 'play' && mom.x > 200 && (mom.st === 'busy' || isWarn())) { mom.pendingTurn = false; startTurn(); }
    if (cat && !mom.distract) updateCat(dtw);
  }

  // ---------------------------------------------------------------------------
  // Tur akışı
  // ---------------------------------------------------------------------------
  function newRound() {
    S.round++;
    S.treat = TREATS[(S.round - 1) % TREATS.length];
    S.phase = 'play'; S.roundT = 0; S.endT = 0; S.introT = 3.4; S.final = false;
    S.winners = []; S.hits = 0; S.hitKids = new Set(); S.endAt = 0; S.rainT = -1; S.rainBy = null; S.sum = null;
    S.vaseBroken = false; S.roundStart = LG.time;
    pending = []; flights = []; floorS = []; shards = []; rainP = [];
    cat = null; mom.distract = null; mom.queued = null; mom.cool = 0; mom.pendingTurn = false;
    // eski (5 dk'dır sessiz) çocukları temizle, diğerlerini başlangıca diz
    var now = LG.time;
    kidList = kidList.filter(function (k) {
      if (now - k.lastAct > 300) { kids.delete(k.id); return false; }
      k.p = 0; k.pFrom = 0; k.stepT = 1; k.state = 'idle'; k.st = 0; k.terlik = 0; k.dazeT = 0; k.rank = 0; k.seat = -1; k.caughtRed = -1;
      pathPoint(k, 0, k);
      return true;
    });
    mom.x = 540; mom.tx = 540; mom.face = 1;
    startBusy(6.5);
    LG.sfx('go');
    selDirty = true;
  }
  function endRound(reason) {
    if (S.phase !== 'play') return;
    S.phase = 'end'; S.endT = 0;
    var top = null;
    for (var i = 0; i < kidList.length; i++) { var k = kidList[i]; if (k.terlik > 0 && (!top || k.terlik > top.terlik)) top = k; }
    var everyone = 0;
    if (reason === 'rain') {
      for (var j = 0; j < kidList.length; j++) {
        var kk = kidList[j];
        if (kk.lastAct >= S.roundStart && kk.rank === 0) { board.add(kk.u, 1); everyone++; }
      }
      chalkDirty = true;
    }
    S.sum = {
      reason: reason, winners: S.winners.map(function (k) { return k.u; }), hits: S.hits, hitKids: S.hitKids.size,
      top: top ? top.u : null, topN: top ? top.terlik : 0, by: S.rainBy, everyone: everyone,
      next: TREATS[S.round % TREATS.length],
    };
    pending = [];
    for (var m = 0; m < kidList.length; m++) if (kidList[m].state === 'caught') kidList[m].state = 'idle';
    mom.distract = null; mom.queued = null; mom.prop = null; mom.pendingTurn = false;
    mom.st = 'end'; mom.t = 0; mom.view = 'front'; mom.flip = 1; mom.tx = mom.x < 200 ? 540 : mom.x; mom.still = true;
    if (cat) cat.leaving = true;
    say(S.sum.winners.length || reason === 'rain' ? 'Hadi bakalım, herkes yatağa! 😤' : 'Kimse kapamadı! Anne kazandı 😎🩴', 3);
    LG.music.stop();
    LG.sfx(S.sum.winners.length || reason === 'rain' ? 'fanfare' : 'lose');
    if (S.sum.winners.length || reason === 'rain') ui.rain({ count: 110 });
    slow.on = false;
  }
  function baklavaRain(user) {
    if (S.phase !== 'play' || S.rainT >= 0) return false;
    S.rainT = 0; S.rainBy = user;
    rainP = [];
    for (var i = 0; i < 70; i++) rainP.push({ x: LG.rand(40, 1040), y: LG.rand(-900, 120), vy: LG.rand(380, 620), r: LG.rand(0, 6), vr: LG.rand(-4, 4), s: LG.rand(0.7, 1.25) });
    mom.distract = null; mom.queued = null; pending = [];
    mom.st = 'away'; mom.view = 'front'; mom.flip = 1; mom.still = true;
    mom.distract = { kind: 'rain', user: user, thanks: user, t: 0, k0: 0, dur: 99, sayT: 99, line: 0, autoT: 99 };
    say('Bu ne bereket böyle?! 😍', 2.6);
    for (var j = 0; j < kidList.length; j++) if (kidList[j].state === 'caught') kidList[j].state = 'idle';
    LG.sfx('mega'); ui.flash('#ffd166', 0.4); ui.shake(16, 0.6);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Bildirim akışı, alt şerit (banner) ve büyük mesajlar
  // ---------------------------------------------------------------------------
  var lastJoinFeed = -9;
  function feed(icon, text, color) {
    feedArr.unshift({ icon: icon, text: text, color: color || '#fff', t: 0, w: 0 });
    if (feedArr.length > 4) feedArr.length = 4;
  }
  function feedJoin(u) {
    var f = feedArr[0];
    if (f && f.join && LG.time - lastJoinFeed < 1.2) {
      f.n++; f.text = f.first + ' +' + f.n + ' kişi geldi'; f.t = 0; f.w = 0;
    } else {
      feed('👋', u.name + ' geldi', '#ffe9a8');
      feedArr[0].join = true; feedArr[0].n = 0; feedArr[0].first = u.name;
    }
    lastJoinFeed = LG.time;
  }
  function addBanner(o) {
    o.t = 0; o.dur = o.dur || 2.4; o.extra = 0;
    if (o.key) {
      for (var i = 0; i < banners.length; i++) {
        if (banners[i].key === o.key) { banners[i].extra++; banners[i].user = o.user; banners[i].text = o.text; return; }
      }
    }
    if (o.front) banners.unshift(o); else banners.push(o);
    if (banners.length > 5) {
      for (var j = banners.length - 1; j >= 0 && banners.length > 5; j--) if (banners[j].kind !== 'win') banners.splice(j, 1);
      if (banners.length > 5) banners.length = 5;
    }
  }
  function addBig(o) {
    o.t = 0; o.dur = o.dur || 2.8;
    bigs.push(o);
    if (bigs.length > 3) bigs.shift();
  }

  // ---------------------------------------------------------------------------
  // Olaylar
  // ---------------------------------------------------------------------------
  LG.on('chat', function (e) {
    if (!e.user) return;
    var k = ensureKid(e.user);
    k.lastAct = LG.time;
    if (LG.cmd.has(e.raw, GIT)) tryMove(k, CFG.step, false);
    selDirty = true;
  });
  LG.on('like', function (e) {
    if (!e.user) return;
    var k = ensureKid(e.user, true);
    k.likeAcc += e.count;
    if (k.vis && LG.time - k.heartT > 0.9) {
      k.heartT = LG.time;
      ui.float('❤', k.x + LG.rand(-20, 20), k.y - 125 * k.s, { color: '#ff4d6d', size: 26 + 10 * k.s, life: 1.1, vy: -90 });
    }
    var n = Math.floor(k.likeAcc / 10);
    if (n > 0) {
      k.likeAcc -= n * 10;
      if (canAct(k)) { k.lastAct = LG.time; tryMove(k, CFG.tiny * Math.min(n, 3), true); }
    }
  });
  LG.on('follow', function (e) {
    if (!e.user) return;
    var k = ensureKid(e.user, true);
    feed('➕', e.user.name + ' takip etti, sağ ol! 💚', '#7dffb0');
    k.glowT = 2;
    LG.sfx('heart');
  });
  LG.on('share', function (e) {
    if (!e.user) return;
    ensureKid(e.user, true);
    feed('↗️', e.user.name + ' paylaştı, sağ ol! 💙', '#9bd8ff');
    LG.sfx('heart');
  });
  LG.on('gift', function (e) {
    if (!e.user) return;
    var u = e.user, g = e.gift, tier = g.tier;
    var k = ensureKid(u, true);
    k.lastAct = LG.time; k.glowT = 3;
    k.pillow = Math.min(3, k.pillow + 1);   // kozmetik yastık kalkanı: bir sonraki terliği savuşturur
    var gem = LG.giftEmoji(g);
    if (S.phase !== 'play') {
      feed(gem, u.name + ' — çok teşekkürler! 💖', '#ffd166'); LG.sfx('coin');
      return;
    }
    var bigOk = tier >= 3 ? ui.spotlightAllowed(u, tier) : true;
    if (tier <= 1) {
      feed(gem, u.name + ' → 🛡️ yastık kalkanı aldı!', '#d7c8ff');
      if (k.vis) ui.float('🛡️', k.x, k.y - 130 * k.s, { size: 40, life: 1.2 });
      LG.sfx('pop');
      return;
    }
    if (tier === 2) {
      var r2 = distract('cat', u, Math.min(g.count, 3));
      addBanner({ kind: 'gift', key: 'cat', user: u, text: '🐈 KEDİ VAZOYU DEVİRDİ!', sub: 'Teşekkürler ' + u.name + '! ' + (r2 === 'queued' ? 'Sırada: anneyi kedi oyalayacak' : 'Anne kedinin peşinde — herkes ilerlesin!'), icon: gem, color: '#ffb4d9', dur: 2.4 });
      LG.sfx('coin');
      return;
    }
    if (tier >= 5 && bigOk) {
      if (baklavaRain(u)) {
        addBig({ title: S.treat.name + ' YAĞMURU!', sub: 'Herkes kazandı! Tur bitiyor 🎉', thanks: 'Teşekkürler ' + u.name + '! 💖', icon: S.treat.emoji, user: u, color: '#ffd166', dur: 3.2, treat: true });
        return;
      }
    }
    var kind = tier === 3 ? 'phone' : 'guests';
    if (!bigOk) {
      // aynı kişiden art arda büyük hediye: sade teşekkür + küçük etki
      var r0 = distract(kind, u, 0.5);
      feed(gem, u.name + ' — teşekkürler! 💖 ' + (r0 === 'none' ? '' : DIS[kind].icon), '#ffd166');
      LG.sfx('coin');
      return;
    }
    var r = distract(kind, u, 1);
    var D = DIS[kind];
    addBig({ title: D.title, sub: r === 'queued' ? 'Sırada: anne birazdan oyalanacak ⏳' : r === 'extended' ? 'Anne daha da oyalanıyor — devam!' : kind === 'phone' ? 'Anne 10 sn telefonda — herkes ilerlesin!' : 'Anne kapıda — herkes sinsice ilerliyor!', thanks: 'Teşekkürler ' + u.name + '! 💖', icon: gem, user: u, color: kind === 'phone' ? '#9bf6ff' : '#ffd166', dur: 3 });
    LG.sfx(tier >= 4 ? 'fanfare' : 'levelup');
    ui.burst(540, 940, { count: tier >= 4 ? 90 : 50, speed: 750 });
    if (tier >= 4) ui.shake(10, 0.35);
  });

  // ---------------------------------------------------------------------------
  // Sunucu kısayolları
  // ---------------------------------------------------------------------------
  LG.onKey('t', 'Anne ŞİMDİ dönsün (sen annesin!)', function () {
    if (S.phase !== 'play') return;
    if (mom.distract) { mom.pendingTurn = true; feed('🎮', 'Anne oyalanınca hemen dönecek!', '#ffd166'); return; }
    if (isRed()) { mom.dur += 1.5; return; }
    if (mom.x <= 200) { mom.pendingTurn = true; return; }
    startTurn();
    say('BİR DAKİKA! 😠', 1.2);
  });
  LG.onKey('g', 'Yeşil ışık: anne işine dönsün', function () {
    if (S.phase !== 'play' || mom.distract) return;
    if (isRed() || isWarn()) {
      if (pending.length) { pending.forEach(function (k) { if (k.state === 'caught') k.state = 'idle'; }); pending = []; }
      mom.st = 'back'; mom.t = 0; mom.dur = 0.24;
      say('Neyse… 🙄', 1);
    } else if (mom.st === 'busy') mom.dur += 4;
  });
  LG.onKey('n', 'Yeni tur (yeni ikram)', function () { newRound(); });
  LG.onKey('b', 'Turu bitir (özet kartı)', function () { endRound('host'); });

  // Simülatör: oyuna uygun yorumlar
  LG.sim.comments = [['git', 7], ['ilerle', 2], ['yürü', 2], ['koş', 2], ['katıl', 3], ['anne bakıyor!', 1], ['😂😂', 1], ['baklava benim', 1]];
  LG.sim.genComment = function (u) {
    var k = kids.get(String(u.id));
    var r = Math.random();
    if (!k) return r < 0.45 ? 'katıl' : r < 0.75 ? LG.pick(['git', 'ilerle', 'yürü']) : null;
    if (k.state === 'seated' || k.state === 'won' || k.state === 'toTable') return LG.pick(['nefis 😋', 'kaptıııım 🍯', 'afiyet olsun bana', '😂😂', 'anne görmedi 🤫']);
    if (r < (isRed() ? 0.4 : 0.72)) return LG.pick(['git', 'git', 'git', 'ilerle', 'yürü', 'koş', 'gittt', 'git git']);
    if (r < 0.92) return LG.pick(['anne bakıyor!!', 'kaç kaç 😂', 'terlik geliyor 🩴', 'dur dur!', 'annem de aynısı 😂', 'ayyy', 'baklava benim', 'kıpırdamayın!', 'sessiz olun 🤫']);
    return null;
  };

  // ---------------------------------------------------------------------------
  // Güncelleme
  // ---------------------------------------------------------------------------
  function select() {
    var arr = [];
    var now = LG.time;
    for (var i = 0; i < kidList.length; i++) {
      var k = kidList[i];
      k.vis = 0;
      if (k.state === 'won' || k.state === 'toTable' || k.state === 'seated') continue;
      var anim = k.state !== 'idle' || k.dazeT > 0 || now - k.joinT < 3 || now - k.lastMove < 1.2;
      k._anim = anim;
      k._sc = anim ? 3e6 + k.lastAct : k.p > 0 ? 2e6 + k.p * 1e5 + k.lastAct * 0.01 : 1e6 + k.lastAct;
      arr.push(k);
    }
    arr.sort(function (a, b) { return b._sc - a._sc; });
    visFull = []; visMini = []; hiddenCount = 0;
    var startShown = 0;
    for (var j = 0; j < arr.length; j++) {
      var kk = arr[j];
      var atStart = kk.p <= 0 && kk.state === 'idle';
      if (visFull.length < FULL_CAP && (!atStart || kk._anim || startShown < START_CAP)) {
        if (atStart) startShown++;
        visFull.push(kk); kk.vis = 2; continue;
      }
      if (visMini.length < MINI_CAP && !atStart) { visMini.push(kk); kk.vis = 1; continue; }
      hiddenCount++;
    }
    // isim etiketi adayları
    var cand = [];
    for (var m = 0; m < visFull.length; m++) {
      var c = visFull[m];
      var pr = 0;
      if (c.state === 'hit' || c.state === 'caught') pr = 5;
      else if (now - c.joinT < 3.5) pr = 3.5;
      else if (now - c.lastMove < 4) pr = 4;
      else if (c.p > 0.45) pr = 2 + c.p;
      else if (c.pillow > 0 || c.glowT > 0) pr = 1.5;
      if (pr > 0) { c._tp = pr + c.p * 0.5 + (c.lastAct - now) * 0.001; cand.push(c); }
    }
    cand.sort(function (a, b) { return b._tp - a._tp; });
    tagList = cand.slice(0, TAG_CAP);
  }

  function updateKids(dtw) {
    for (var i = 0; i < kidList.length; i++) {
      var k = kidList[i];
      if (k.stepT < 1) k.stepT = Math.min(1, k.stepT + dtw / k.stepDur);
      if (k.dazeT > 0) k.dazeT -= dtw;
      if (k.glowT > 0) k.glowT -= dtw;
      var st = k.state;
      if (st === 'idle') {
        if (k.vis) pathPoint(k, dispP(k), k);
      } else if (st === 'caught') {
        k.st += dtw;
        if (k.st > 7) k.state = 'idle';
      } else if (st === 'hit') {
        k.st += dtw;
        var u = Math.min(1, k.st / HIT_DUR);
        pathPoint(k, 0, tmpP);
        var e = LG.ease.inOutSine(u);
        k.x = LG.lerp(k.hx0, tmpP.x, e); k.y = LG.lerp(k.hy0, tmpP.y, e); k.s = LG.lerp(k.hs0, tmpP.s, e);
        if (k.st >= HIT_DUR) { k.state = 'idle'; k.dazeT = 1.5; pathPoint(k, 0, k); }
      } else if (st === 'won') {
        k.st += dtw;
        var uw = LG.ease.outCubic(Math.min(1, k.st / 0.4));
        k.x = LG.lerp(k.wx0, FX, uw); k.y = LG.lerp(k.wy0, FY, uw); k.s = LG.lerp(k.ws0, scaleAt(FY), uw);
        if (k.st > 1.7) { k.state = 'toTable'; k.st = 0; k.hopT = -1; }
      } else if (st === 'toTable') {
        k.st += dtw;
        var sp = seatPos(k.seat);
        if (k.hopT < 0) {
          var d = sp.x - k.x;
          k.x += Math.sign(d) * Math.min(Math.abs(d), 330 * dtw);
          k.y = FY; k.s = scaleAt(FY);
          if (Math.abs(d) < 1) k.hopT = 0;
        } else {
          k.hopT += dtw;
          var uh = Math.min(1, k.hopT / 0.32);
          k.y = LG.lerp(FY, sp.y, uh); k.s = LG.lerp(scaleAt(FY), 0.52, uh);
          if (uh >= 1) { k.state = 'seated'; k.st = 0; }
        }
      } else if (st === 'seated') {
        var sp2 = seatPos(k.seat);
        k.x = sp2.x; k.y = sp2.y; k.s = 0.52;
      }
    }
  }

  function updateFx(dtw, dt) {
    for (var i = comics.length - 1; i >= 0; i--) { comics[i].t += dt; if (comics[i].t > comics[i].dur) comics.splice(i, 1); }
    for (var j = floorS.length - 1; j >= 0; j--) { floorS[j].t += dtw; if (floorS[j].t > 12) floorS.splice(j, 1); }
    for (var f = feedArr.length - 1; f >= 0; f--) { feedArr[f].t += dt; if (feedArr[f].t > 5.5) feedArr.splice(f, 1); }
    // alt şerit
    if (banner) { banner.t += dt; if (banner.t > banner.dur) { banner = null; bannerGap = banners.length > 2 ? 0.6 : 1.6; } }
    else { bannerGap -= dt; if (bannerGap <= 0 && banners.length && S.introT <= 0) banner = banners.shift(); }
    if (big) { big.t += dt; if (big.t > big.dur) big = null; }
    else if (bigs.length && S.introT <= 0) big = bigs.shift();
    // buzdolabı kapısı
    if (S.fridgeOpenT > 0) S.fridgeOpenT -= dt;
    S.fridgeOpen += ((S.fridgeOpenT > 0 ? 1 : 0) - S.fridgeOpen) * Math.min(1, dt * 7);
    // ikram yağmuru
    if (S.rainT >= 0) {
      for (var r = 0; r < rainP.length; r++) {
        var p = rainP[r];
        p.y += p.vy * dt; p.r += p.vr * dt;
        if (p.y > 1260 && S.rainT < 2.4) { p.y = LG.rand(-200, -40); p.x = LG.rand(40, 1040); }
      }
    }
  }

  function update(dt) {
    // ağır çekim
    if (slow.on) {
      slow.max -= dt;
      if (slow.after > 0) { slow.after -= dt; if (slow.after <= 0) slow.on = false; }
      if (slow.max <= 0) slow.on = false;
    }
    var target = slow.on ? 0.3 : 1;
    S.ts += (target - S.ts) * Math.min(1, dt * (slow.on ? 14 : 5));
    cam.z += ((slow.on ? 1.14 : 1) - cam.z) * Math.min(1, dt * (slow.on ? 5 : 3));
    var dtw = dt * S.ts;
    wt += dtw;

    if (S.phase === 'play') {
      S.roundT += dtw;
      if (S.introT > 0) S.introT -= dt;
      var rem = CFG.roundLen - S.roundT;
      if (!S.final && rem <= CFG.finalSec && S.rainT < 0) {
        S.final = true;
        addBig({ title: '⏰ SON 30 SANİYE!', sub: 'Adımlar artık 2 KAT! 🏃', thanks: 'Ama anne de daha sık dönüyor 😱', icon: '⏰', color: '#ff8fab', dur: 2.8 });
        LG.sfx('countdown');
        if (mom.st === 'busy' || mom.st === 'away') musicOn();
      }
      if (S.final && rem > 0 && rem <= 5 && Math.floor(rem) !== Math.floor(rem + dtw)) LG.sfx('countdown');
      if (rem <= 0) endRound('time');
      else if (S.endAt && S.roundT >= S.endAt) endRound('full');
      else if (S.rainT >= 0) { S.rainT += dt; if (S.rainT > 3.4) endRound('rain'); }
    } else if (S.phase === 'end') {
      S.endT += dt;
      if (S.endT > CFG.endCard) newRound();
    }
    updateMom(dtw);
    updateThrows(dtw);
    updateKids(dtw);
    updateFx(dtw, dt);
    selT -= dt;
    if (selT <= 0 || (selDirty && selT < 0.3)) { select(); selT = 0.5; selDirty = false; }
    chalkT -= dt;
  }

  // ---------------------------------------------------------------------------
  // Çizim
  // ---------------------------------------------------------------------------
  function framePose(k) {
    return { bodyY: 0, rot: 0, lift: 0, tx: 0, fl: [-8, 0], fr: [8, 0], hl: [-21, -36], hr: [21, -36], handsFront: false, hold: null, pillow: k.pillow, sq: 0 };
  }
  function frozenPose(k, P, t) {
    switch (k.fp) {
      case 0: P.fl = [-3, -17]; P.fr = [8, 0]; P.hl = [-36, -64]; P.hr = [36, -62]; break;              // flamingo
      case 1: P.hl = [-14, -100]; P.hr = [15, -98]; P.fl = [-11, 0]; P.fr = [11, 0]; break;             // heykel
      case 2: P.fl = [-19, 0]; P.fr = [17, -6]; P.hl = [-32, -44]; P.hr = [27, -66]; P.rot = 0.06; break; // yarım adım
      case 3: P.handsFront = true; P.hl = [-7, -80]; P.hr = [7, -80]; P.bodyY = 2; break;              // ağzını kapatan
      case 4: P.bodyY = 11; P.fl = [-15, 0]; P.fr = [15, 0]; P.hl = [-27, -30]; P.hr = [27, -30]; break; // çömelen
      default: P.rot = -0.13; P.hl = [-11, -40]; P.hr = [11, -40]; P.fl = [-5, 0]; P.fr = [10, 0]; break; // masum ıslık
    }
    P.tx = Math.sin(t * 37) * 0.7;   // titreme
  }
  function kidPose(k) {
    var P = framePose(k), t = wt + k.ph, st = k.state;
    if (st === 'idle') {
      if (k.stepT < 1) {
        var sw = Math.sin(k.stepT * Math.PI), leg = k.stepN % 2 ? 1 : -1;
        P.lift = sw * 13; P.rot = 0.05 * leg;
        P.fl = [-9 - leg * 7 * sw, leg < 0 ? -10 * sw : 0]; P.fr = [9 + leg * 7 * sw, leg > 0 ? -10 * sw : 0];
        P.hl = [-30, -60 - 5 * sw]; P.hr = [30, -60 + 4 * sw]; P.sq = -0.05 * sw;
      } else if (k.dazeT > 0) {
        P.bodyY = 7; P.rot = Math.sin(t * 5) * 0.13; P.hl = [-22, -28]; P.hr = [22, -28]; P.fl = [-12, 0]; P.fr = [12, 0];
      } else if (isRed() || (mom.st === 'back' && mom.t < 0.12)) {
        frozenPose(k, P, t);
      } else if (isWarn()) {
        P.handsFront = true; P.hl = [-9, -80]; P.hr = [9, -80]; P.bodyY = 3; P.tx = Math.sin(t * 30) * 0.6;
      } else {
        var b = Math.sin(t * 3);
        P.bodyY = 3 + b * 1.4; P.hl = [-24, -46 + b * 2]; P.hr = [24, -46 - b * 2]; P.fl = [-10, 0]; P.fr = [10, 0];
      }
    } else if (st === 'caught') {
      P.hl = [-27, -94]; P.hr = [27, -94]; P.tx = Math.sin(t * 60) * 1.6; P.sq = 0.04;
    } else if (st === 'hit') {
      var u = Math.min(1, k.st / HIT_DUR);
      P.lift = Math.sin(u * Math.PI) * 150 / Math.max(0.5, k.s);
      P.rot = u * TAU * 1.5 * (k.fp % 2 ? 1 : -1);
      P.hl = [-30, -70 + Math.sin(t * 30) * 12]; P.hr = [30, -70 - Math.sin(t * 30) * 12];
      P.fl = [-14, -8 + Math.sin(t * 25) * 8]; P.fr = [14, -8 - Math.sin(t * 25) * 8];
      if (u > 0.85) P.sq = (1 - u) * 1.5;
    } else if (st === 'won') {
      P.hold = S.treat.id; P.hl = [-22, -94]; P.hr = [24, -100];
      P.lift = Math.abs(Math.sin(k.st * 9)) * 16;
    } else if (st === 'toTable') {
      var wp = Math.sin(t * 15);
      P.hold = S.treat.id; P.hr = [22, -62]; P.hl = [-24, -44];
      P.fl = [-8 + wp * 7, -Math.max(0, wp) * 7]; P.fr = [8 - wp * 7, -Math.max(0, -wp) * 7];
      P.lift = Math.abs(wp) * 4 + (k.hopT >= 0 ? Math.sin(Math.min(1, k.hopT / 0.32) * Math.PI) * 26 : 0);
    } else if (st === 'seated') {
      var eat = Math.sin(t * 2.6) > 0.35;
      P.handsFront = true; P.hold = S.treat.id; P.hl = [-15, -58]; P.hr = eat ? [5, -80] : [18, -62];
      P.bodyY = eat ? 1.5 : 0; P.pillow = 0;
    }
    return P;
  }

  function drawKid(ctx, k) {
    var age = LG.time - k.joinT;
    var pop = age < 0.45 ? Math.max(0.05, LG.ease.outBack(age / 0.45)) : 1;
    var P = kidPose(k);
    if (k.glowT > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, k.glowT) * 0.5;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.ellipse(k.x, k.y, 34 * k.s, 10 * k.s, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    A.kid(ctx, k.look, k.x, k.y, k.s * pop, P, headOf(k));
    var hx = k.x, hy = k.y - (88 + (P.lift || 0)) * k.s;
    if (k.state === 'caught') {
      ui.text(ctx, '!', hx + 26 * k.s, hy - 42 * k.s, { size: 54 * k.s, color: '#ff3b3b' });
    } else if (k.dazeT > 0 && k.state === 'idle') {
      for (var i = 0; i < 3; i++) {
        var a = wt * 5 + i * TAU / 3;
        A.star(ctx, hx + Math.cos(a) * 28 * k.s, hy - 28 * k.s + Math.sin(a) * 8 * k.s, 8 * k.s, a, i === 1 ? '#fff3a0' : '#ffd23f');
      }
    }
  }
  function drawMini(ctx, k) {
    var s = k.s, x = k.x, y = k.y;
    var bob = k.stepT < 1 ? Math.sin(k.stepT * Math.PI) * 8 * s : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y, 16 * s, 4.5 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = k.look.col;
    A.rr(ctx, x - 13 * s, y - 50 * s - bob, 26 * s, 46 * s, 10 * s); ctx.fill();
    ctx.drawImage(headOf(k), x - 20 * s, y - 86 * s - bob, 40 * s, 40 * s);
  }

  var tagRects = [];
  function drawTags(ctx) {
    tagRects.length = 0;
    var now = LG.time;
    for (var i = 0; i < tagList.length; i++) {
      var k = tagList[i];
      if (!k.vis) continue;
      var size = k.s > 0.92 ? 26 : k.s > 0.75 ? 23 : 20;
      var isNew = now - k.joinT < 3.5;
      var lead = k.p > 0.6;
      var col = isNew ? '#2b2100' : lead ? '#ffd166' : '#fff';
      var bgc = isNew ? 'rgba(255,209,102,0.95)' : null;
      var cv = ui.nameTag(k.u, size, col, bgc);
      var x = k.x, y = k.y - 122 * k.s - cv.height / 2 - (k.pillow ? 26 * k.s : 0);
      if (k.state === 'hit') y -= Math.sin(Math.min(1, k.st / HIT_DUR) * Math.PI) * 150;
      // basit çakışma önleme: bir kez yukarı kaydır, yine çakışırsa atla
      var ok = true;
      for (var pass = 0; pass < 2; pass++) {
        ok = true;
        for (var r = 0; r < tagRects.length; r++) {
          var q = tagRects[r];
          if (Math.abs(q.x - x) < (q.w + cv.width) * 0.45 && Math.abs(q.y - y) < (q.h + cv.height) * 0.45) { ok = false; break; }
        }
        if (ok) break;
        y -= cv.height + 2;
      }
      if (!ok) continue;
      tagRects.push({ x: x, y: y, w: cv.width, h: cv.height });
      ctx.drawImage(cv, Math.round(x - cv.width / 2), Math.round(y - cv.height / 2));
      if (k.terlik > 0) {
        var bx = x + cv.width / 2 + 6;
        A.drawSprite(ctx, A.slipperSprite(34), bx + 14, y, -0.5, 0.9);
        ui.text(ctx, 'x' + k.terlik, bx + 32, y + 2, { size: size * 0.95, align: 'left', color: '#ffb3c1' });
      }
    }
  }

  function drawMom(ctx) {
    var m = {
      view: mom.view, flip: mom.flip, face: mom.face, armPh: mom.armPh, tilt: mom.tilt + (mom.st === 'warn' ? Math.sin(wt * 6) * 0.05 : 0),
      throwT: mom.throwT, walkPh: mom.walkPh, walking: mom.walking, prop: mom.prop, scan: mom.scan,
      still: mom.still || mom.walking, alpha: 1,
    };
    A.mom(ctx, m, mom.x, G.KF, wt);
    // sinsi ipuçları: köpük / buhar
    if (mom.st === 'busy' && !mom.walking) {
      ctx.save();
      for (var i = 0; i < 6; i++) {
        var ph = (wt * 0.7 + i / 6) % 1;
        var bx = mom.act === 'bulasik' ? 540 + Math.sin(i * 7.3 + wt * 1.3) * 34 : 696 + Math.sin(i * 5.1 + wt) * 16;
        var by = (mom.act === 'bulasik' ? 600 : 560) - ph * 100;
        ctx.globalAlpha = (1 - ph) * 0.7;
        if (mom.act === 'bulasik') { ctx.strokeStyle = '#e0f7ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 4 + (i % 3) * 2.5, 0, TAU); ctx.stroke(); }
        else { ctx.fillStyle = '#f1f1f1'; ctx.beginPath(); ctx.arc(bx, by, 6 + ph * 10, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    }
  }
  function drawMomBubble(ctx) {
    var b = mom.bubble;
    if (!b) return;
    var a = Math.min(1, b.t / 0.12, (b.dur - b.t) / 0.25);
    var hx = mom.x, hy = 500;
    // balon başın yanında: anne sağdaysa sola, soldaysa sağa açılır (üstteki tabela ve süreye değmez)
    var right = hx < 620;
    var bx = right ? Math.max(hx + 62, 120) : hx - 62, by = 460, align = right ? 'left' : 'right';
    if (mom.x < 0) { bx = 150; hx = 20; align = 'left'; }
    var sc = b.t < 0.18 ? LG.ease.outBack(b.t / 0.18) : 1;
    ctx.save();
    ctx.translate(bx, by); ctx.scale(sc, sc); ctx.translate(-bx, -by);
    A.bubble(ctx, bx, by, b.text, { size: 31, maxW: right ? Math.min(420, 1060 - bx) : Math.min(420, bx - 20), align: align, tx: hx + (right ? 30 : -30), ty: hy, alpha: a, fill: isRed() ? '#ffe3e3' : '#fff' });
    ctx.restore();
  }
  function drawGuests(ctx) {
    var md = mom.distract;
    if (!md || md.kind !== 'guests' || mom.x > 60) return;
    var bob = Math.sin(wt * 4) * 4;
    ui.emoji(ctx, '👵', 34, 700 + bob, 64);
    ui.emoji(ctx, '🧕', 92, 712 - bob, 56);
    if (md.guestLine && md.guestLineT < 2.0) {
      A.bubble(ctx, 210, 610, md.guestLine, { size: 30, maxW: 380, tx: 70, ty: 660, alpha: Math.min(1, md.guestLineT / 0.15, (2 - md.guestLineT) / 0.25) });
    }
  }
  function drawCat(ctx, front) {
    if (!front) {
      if (!S.vaseBroken && (!cat || cat.vase)) {
        var wob = cat && cat.t > 0.9 && (cat.crashT < 0) ? Math.sin(cat.t * 40) * 0.14 : 0;
        if (!(cat && cat.crashT >= 0)) A.vase(ctx, 360, 612, 0.95, wob);
      }
      if (cat && cat.vase && cat.crashT >= 0 && cat.crashT < 0.4) {
        var u = cat.crashT / 0.4;
        A.vase(ctx, LG.lerp(360, 372, u), LG.lerp(612, 738, u * u), 0.95, u * 2.6);
      }
      for (var i = 0; i < shards.length; i++) {
        var s = shards[i];
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.r); ctx.fillStyle = s.c;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -6); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    if (!cat) return;
    var onFloor = cat.y > 700;
    if (onFloor === !!front) A.cat(ctx, cat.x, cat.y, 1.45, wt, cat.flip);
  }

  function drawFlights(ctx) {
    var spr = A.slipperSprite(78);
    for (var i = 0; i < flights.length; i++) {
      var f = flights[i];
      var s = LG.lerp(0.75, Math.max(0.6, f.k.s), f.t);
      if (f.slow) {
        for (var g = 3; g >= 1; g--) {
          var tu = Math.max(0, f.t - g * 0.045);
          var gp = flightPos(f, tu);
          A.drawSprite(ctx, spr, gp.x, gp.y, tu * f.spin, s, 0.18 * (4 - g));
        }
      }
      var p = flightPos(f, f.t);
      A.drawSprite(ctx, spr, p.x, p.y, f.t * f.spin, s);
    }
  }
  function drawFloorSlips(ctx) {
    var spr = A.slipperSprite(56);
    for (var i = 0; i < floorS.length; i++) {
      var f = floorS[i];
      var u = Math.min(1, f.t / 0.42);
      var x = LG.lerp(f.x0, f.x1, u), y = LG.lerp(f.y0, f.y1, u) - Math.sin(u * Math.PI) * 70 * f.s;
      var a = f.t > 10 ? Math.max(0, (12 - f.t) / 2) : 1;
      A.drawSprite(ctx, spr, x, y, LG.lerp(f.r0, f.r1 + 6.283, u), f.s * 0.9, a);
    }
  }
  function drawComics(ctx) {
    for (var i = 0; i < comics.length; i++) {
      var c = comics[i];
      var sc = c.t < 0.14 ? LG.ease.outBack(c.t / 0.14) : 1;
      var a = c.t > c.dur - 0.2 ? (c.dur - c.t) / 0.2 : 1;
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      A.comic(ctx, c.x, c.y, c.text, c.sz * sc, c.col, c.rot);
      ctx.restore();
    }
  }
  function drawCrowd(ctx) {
    if (hiddenCount <= 0) return;
    var x0 = 180, y0 = 1168;
    ctx.save();
    for (var i = 0; i < 9; i++) {
      var hx = x0 - 90 + (i % 5) * 42 + (i > 4 ? 21 : 0), hy = y0 - (i > 4 ? 52 : 26) + Math.sin(wt * 2 + i) * 2;
      ctx.fillStyle = 'hsl(' + (i * 47 % 360) + ',35%,' + (i > 4 ? 38 : 48) + '%)';
      ctx.beginPath(); ctx.arc(hx, hy - 24, 17, 0, TAU); ctx.fill();
      A.rr(ctx, hx - 16, hy - 8, 32, 30, 10); ctx.fill();
    }
    ctx.restore();
    var txt = '👥 +' + LG.fmt(hiddenCount) + ' kişi';
    ui.panel(ctx, x0 - 112, y0 - 26, 224, 50, { r: 25, fill: 'rgba(20,10,40,0.82)', border: 'rgba(255,209,102,0.8)', lineWidth: 3 });
    ui.text(ctx, txt, x0, y0 + 1, { size: 30, color: '#ffd166', maxWidth: 200 });
  }

  function drawChalk(ctx) {
    var B = G.BOARD;
    if (!chalkCv || (chalkDirty && chalkT <= 0)) {
      chalkCv = chalkCv || document.createElement('canvas');
      chalkCv.width = B.w; chalkCv.height = B.h;
      var c = chalkCv.getContext('2d');
      c.clearRect(0, 0, B.w, B.h);
      var chalk = { stroke: false, color: 'rgba(245,250,240,0.95)' };
      ui.text(c, '🍯 Baklavacılar', B.w / 2, 26, { size: 32, stroke: false, color: '#fff3c4', maxWidth: B.w - 20 });
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(22, 48); c.lineTo(B.w - 22, 50); c.stroke();
      var rows = board.top(4);
      if (!rows.length) {
        ui.text(c, 'Buzdolabına ilk', B.w / 2, 96, { size: 26, stroke: false, color: chalk.color });
        ui.text(c, 'varan buraya', B.w / 2, 128, { size: 26, stroke: false, color: chalk.color });
        ui.text(c, 'yazılır! ✍️', B.w / 2, 160, { size: 26, stroke: false, color: chalk.color });
      }
      for (var i = 0; i < rows.length; i++) {
        var y = 76 + i * 34;
        ui.text(c, (i + 1) + '. ' + rows[i].user.name, 16, y, { size: 26, align: 'left', stroke: false, color: i === 0 ? '#ffe680' : chalk.color, maxWidth: B.w - 90 });
        ui.text(c, '×' + rows[i].score, B.w - 14, y, { size: 26, align: 'right', stroke: false, color: '#ffd1dc' });
      }
      chalkDirty = false; chalkT = 1;
    }
    ctx.drawImage(chalkCv, B.x, B.y);
  }

  function drawSign(ctx) {
    var red = isRed(), warn = isWarn(), end = S.phase === 'end';
    var w = L.signW, h = 98, cx = L.signX, cy = 352;
    var c1, c2, lamp, text, sub, prog = -1;
    if (end) { c1 = '#5a189a'; c2 = '#240046'; lamp = '#c77dff'; text = 'TUR BİTTİ'; sub = 'Herkes yatağa! 🛏️'; }
    else if (red) { c1 = '#d00000'; c2 = '#6a040f'; lamp = '#ff3b3b'; text = 'ANNE BAKIYOR!'; sub = 'KIPIRDAMA! 🙈'; }
    else if (warn) { c1 = '#e85d04'; c2 = '#9d0208'; lamp = '#ffc300'; text = 'HMM…?'; sub = 'Anne şüphelendi! 👀'; }
    else {
      c1 = '#2a9d8f'; c2 = '#14514a'; lamp = '#3dff8f'; text = 'ANNE MEŞGUL';
      if (mom.distract && mom.distract.kind !== 'rain') {
        var md = mom.distract;
        sub = DIS[md.kind].label + ' · sağ ol ' + md.thanks.name + '!';
        prog = 1 - md.t / md.dur;
      } else if (mom.distract) sub = S.treat.name + ' YAĞMURU! ' + S.treat.emoji;
      else if (mom.queued) sub = 'Sırada: ' + DIS[mom.queued.kind].label;
      else sub = mom.walking ? 'Mutfakta dolanıyor — ilerle!' : mom.act === 'bulasik' ? 'Bulaşık yıkıyor 🍽️ — ilerle!' : 'Yemek karıştırıyor 🍲 — ilerle!';
    }
    var pulse = red ? 1 + Math.sin(LG.time * 16) * 0.03 : warn ? 1 + Math.sin(LG.time * 34) * 0.018 : 1;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(pulse, pulse);
    ctx.globalAlpha = red ? 0.45 + Math.sin(LG.time * 16) * 0.15 : 0.28;
    ctx.fillStyle = lamp;
    A.rr(ctx, -w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 38); ctx.fill();
    ctx.globalAlpha = 1;
    A.rr(ctx, -w / 2, -h / 2, w, h, 30);
    var g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.stroke();
    // lamba
    var lx = -w / 2 + 54;
    var on = !warn || Math.sin(LG.time * 22) > -0.2;
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(lx, 0, 33, 0, TAU); ctx.fill();
    if (on) {
      var lg = ctx.createRadialGradient(lx - 8, -8, 3, lx, 0, 30);
      lg.addColorStop(0, '#fff'); lg.addColorStop(0.35, lamp); lg.addColorStop(1, c2);
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(lx, 0, 27, 0, TAU); ctx.fill();
    }
    var tx = 30;
    ui.text(ctx, text, tx, -14, { size: red ? 54 : 50, color: '#fff', maxWidth: w - 140, strokeColor: 'rgba(0,0,0,0.6)' });
    ui.text(ctx, sub, tx, 28, { size: 25, color: red ? '#ffe066' : '#e9fff9', maxWidth: w - 140, strokeColor: 'rgba(0,0,0,0.55)' });
    if (prog >= 0) {
      A.rr(ctx, -w / 2 + 100, h / 2 - 11, w - 140, 6, 3); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
      A.rr(ctx, -w / 2 + 100, h / 2 - 11, (w - 140) * LG.clamp(prog, 0, 1), 6, 3); ctx.fillStyle = '#b8ffdf'; ctx.fill();
    }
    ctx.restore();
  }

  function drawHud(ctx) {
    // başlık + sallanan terlik
    var tw = Math.sin(LG.time * 3) * 0.12;
    ui.text(ctx, 'ANNE TERLİĞİ!', L.titleX - 34, 268, { size: 66, color: '#ffd166', maxWidth: L.titleW - 120, strokeWidth: 12, strokeColor: '#2b0f3a' });
    A.drawSprite(ctx, A.slipperSprite(92), L.titleX + 262, 266, -0.5 + tw, 0.9);
    drawSign(ctx);
    // ikram rozeti
    if (L.treatX > 0) {
      var tx = L.treatX, ty = 344;
      ctx.save();
      ctx.beginPath(); ctx.arc(tx, ty, 58, 0, TAU);
      ctx.fillStyle = 'rgba(25,15,50,0.85)'; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = '#ffd166'; ctx.stroke();
      ctx.restore();
      var bob = Math.sin(LG.time * 2.4) * 3;
      ctx.drawImage(A.treatSprite(S.treat.id, 86), tx - 47, ty - 50 + bob);
      ui.text(ctx, S.treat.name, tx, ty + 76, { size: 24, color: '#ffe8a3', maxWidth: 150 });
    }
    // süre + buzdolabı sayacı
    var rem = Math.max(0, CFG.roundLen - S.roundT);
    var lab = S.phase === 'end' ? '🌙' : Math.floor(rem / 60) + ':' + ('0' + Math.floor(rem % 60)).slice(-2);
    ui.timerRing(ctx, L.timerX, 344, 58, S.phase === 'end' ? 0 : rem / CFG.roundLen, lab, { color: S.final ? '#ff8fab' : '#ffd166' });
    ui.text(ctx, '🏁 ' + S.winners.length + '/' + CFG.maxWin, L.timerX, 420, { size: 26, color: '#b8ffdf' });
  }

  function drawFeed(ctx) {
    for (var i = 0; i < feedArr.length; i++) {
      var f = feedArr[i];
      var a = Math.min(1, f.t / 0.2, (5.5 - f.t) / 0.5);
      if (!f.w) { ctx.font = ui.font(27, 800); f.w = Math.min(400, ctx.measureText(f.text).width + 64); }
      var y = 792 + i * 48;
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      ui.panel(ctx, 12, y - 21, f.w, 42, { r: 21, fill: 'rgba(10,6,28,0.78)', border: false });
      ui.emoji(ctx, f.icon, 35, y, 26);
      ui.text(ctx, f.text, 54, y + 1, { size: 27, align: 'left', color: f.color, maxWidth: f.w - 64, strokeWidth: 3 });
      ctx.restore();
    }
  }

  function drawBannerStrip(ctx) {
    var x = 70, y = 1206, w = 940, h = 82;
    if (!banner) {
      ui.hintBar(ctx, 100, 1212, 880, HINTS, { h: 74, size: 36 });
      return;
    }
    var b = banner;
    var a = Math.min(1, b.t / 0.18, (b.dur - b.t) / 0.25);
    var sc = b.t < 0.25 ? LG.ease.outBack(b.t / 0.25) : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(540, y + h / 2); ctx.scale(sc, sc); ctx.translate(-540, -(y + h / 2));
    var fill = b.kind === 'win' ? 'rgba(70,40,0,0.9)' : 'rgba(55,15,70,0.9)';
    ui.panel(ctx, x, y, w, h, { r: h / 2, fill: fill, border: b.color, lineWidth: 5 });
    if (b.user) ui.avatar(ctx, b.user, x + 44, y + h / 2, 32, { ring: b.color, ringWidth: 4 });
    ui.text(ctx, b.text, x + 92, y + 28, { size: 34, align: 'left', color: '#fff', maxWidth: w - 200 });
    ui.text(ctx, b.sub + (b.extra ? '  (+' + b.extra + ' kişi daha 💖)' : ''), x + 92, y + 62, { size: 23, align: 'left', color: b.color, maxWidth: w - 200 });
    ui.emoji(ctx, b.icon, x + w - 50, y + h / 2 + Math.sin(LG.time * 8) * 4, 52);
    ctx.restore();
  }

  function drawBig(ctx) {
    var b = big;
    if (!b) return;
    var a = Math.min(1, b.t / 0.2, (b.dur - b.t) / 0.3);
    var sc = LG.ease.outBack(Math.min(1, b.t / 0.4));
    var cx = 540, cy = 930, w = 920, h = 230;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    var rg = ctx.createRadialGradient(0, 0, 40, 0, 0, 520);
    rg.addColorStop(0, 'rgba(255,215,120,0.35)'); rg.addColorStop(1, 'rgba(255,215,120,0)');
    ctx.fillStyle = rg; ctx.fillRect(-560, -300, 1120, 600);
    ui.panel(ctx, -w / 2, -h / 2, w, h, { r: 40, fill: 'rgba(40,14,70,0.94)', border: b.color, lineWidth: 6 });
    var tx = -w / 2 + 36;
    if (b.user) { ui.avatar(ctx, b.user, -w / 2 + 92, 0, 62, { ring: b.color, ringWidth: 5 }); tx = -w / 2 + 176; }
    var tw = w / 2 - 150 - tx;
    ui.text(ctx, b.title, tx, -58, { size: 52, align: 'left', color: b.color, maxWidth: tw });
    ui.text(ctx, b.sub, tx, 4, { size: 36, align: 'left', color: '#fff', maxWidth: tw });
    if (b.thanks) ui.text(ctx, b.thanks, tx, 60, { size: 34, align: 'left', color: '#ffe8a3', maxWidth: tw });
    if (b.treat) ctx.drawImage(A.treatSprite(S.treat.id, 120), w / 2 - 146, -64 + Math.sin(LG.time * 6) * 6);
    else ui.emoji(ctx, b.icon, w / 2 - 82, Math.sin(LG.time * 6) * 6, 96);
    ctx.restore();
  }

  function drawIntro(ctx) {
    if (S.introT <= 0 || S.phase !== 'play') return;
    var t = 3.4 - S.introT;
    var a = Math.min(1, t / 0.25, S.introT / 0.35);
    var sc = LG.ease.outBack(Math.min(1, t / 0.45));
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(540, 930); ctx.scale(sc, sc);
    ui.panel(ctx, -440, -150, 880, 300, { r: 44, fill: 'rgba(25,10,55,0.93)', border: '#ffd166', lineWidth: 6 });
    ui.text(ctx, S.round + '. TUR', 0, -104, { size: 40, color: '#b8ffdf' });
    ctx.drawImage(A.treatSprite(S.treat.id, 120), -330, -70 + Math.sin(LG.time * 5) * 5);
    ctx.drawImage(A.treatSprite(S.treat.id, 120), 206, -70 - Math.sin(LG.time * 5) * 5);
    ui.text(ctx, S.treat.name + ' PEŞİNDE!', 0, -24, { size: 64, color: '#ffd166', maxWidth: 520 });
    ui.text(ctx, 'Buzdolabına ilk ' + CFG.maxWin + ' kişi ulaşsın 🏁', 0, 44, { size: 32, color: '#fff', maxWidth: 560 });
    ui.text(ctx, '“git” yaz → adım at · anne bakınca DUR!', 0, 100, { size: 30, color: '#ffb3c1', maxWidth: 760 });
    ctx.restore();
  }

  function drawSummary(ctx) {
    var sm = S.sum;
    if (!sm || S.phase !== 'end') return;
    var t = S.endT;
    var a = Math.min(1, t / 0.3, (CFG.endCard - t) / 0.4);
    var sc = LG.ease.outBack(Math.min(1, t / 0.5));
    var cx = 540, cy = 980, w = 960, h = 440;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    ui.panel(ctx, -w / 2, -h / 2, w, h, { r: 44, fill: 'rgba(22,10,48,0.95)', border: '#ffd166', lineWidth: 6 });
    var title = sm.reason === 'rain' ? S.treat.name + ' YAĞMURU! ' + S.treat.emoji : 'TUR BİTTİ! 🌙';
    ui.text(ctx, title, 0, -h / 2 + 50, { size: 58, color: '#ffd166', maxWidth: w - 60 });
    var y = -h / 2 + 112;
    if (sm.reason === 'rain' && sm.by) {
      ui.text(ctx, 'Herkes kazandı! 💖 Teşekkürler ' + sm.by.name, 0, y, { size: 32, color: '#b8ffdf', maxWidth: w - 60 });
      y += 52;
    }
    ui.text(ctx, S.treat.lab + ' kapanlar:', -w / 2 + 40, y, { size: 32, align: 'left', color: '#fff' });
    y += 50;
    if (!sm.winners.length) {
      ui.text(ctx, sm.reason === 'rain' ? 'Yağmurda herkes payını aldı! ' + S.treat.emoji : 'Kimse kapamadı! Anne kazandı 😎', 0, y, { size: 32, color: '#ffb3c1', maxWidth: w - 80 });
      y += 50;
    } else {
      var medals = ['🥇', '🥈', '🥉'];
      var n = Math.min(3, sm.winners.length);
      var colW = (w - 80) / 3;
      for (var i = 0; i < n; i++) {
        var px = -w / 2 + 40 + i * colW;
        ui.emoji(ctx, medals[i], px + 22, y, 40);
        ui.avatar(ctx, sm.winners[i], px + 74, y, 26, { ringWidth: 3 });
        ui.text(ctx, sm.winners[i].name, px + 108, y + 2, { size: 28, align: 'left', maxWidth: colW - 116 });
      }
      y += 46;
      if (sm.winners.length > 3) {
        var rest = sm.winners.slice(3, 7).map(function (u) { return u.name; }).join(', ');
        if (sm.winners.length > 7) rest += ' +' + (sm.winners.length - 7);
        ui.text(ctx, rest, 0, y, { size: 26, color: '#ddd', maxWidth: w - 80 });
        y += 40;
      }
    }
    y += 8;
    A.drawSprite(ctx, A.slipperSprite(46), -w / 2 + 64, y, -0.4);
    ui.text(ctx, 'Terlik yiyenler: ' + sm.hitKids + ' kişi · toplam ' + sm.hits + ' terlik', -w / 2 + 100, y + 2, { size: 30, align: 'left', color: '#ffb3c1', maxWidth: w - 140 });
    y += 48;
    if (sm.top) {
      ui.text(ctx, '🤕 En çok terlik yiyen: ' + sm.top.name + ' (' + sm.topN + ')', -w / 2 + 40, y, { size: 30, align: 'left', color: '#fff', maxWidth: w - 80 });
    } else {
      ui.text(ctx, '😇 Kimse terlik yemedi — ne uslu çocuklar!', -w / 2 + 40, y, { size: 30, align: 'left', color: '#fff', maxWidth: w - 80 });
    }
    var left = Math.max(0, Math.ceil(CFG.endCard - t));
    ui.text(ctx, 'Sıradaki ikram: ' + sm.next.name + ' ' + sm.next.emoji + '  ·  ' + left, 0, h / 2 - 34, { size: 28, color: '#b8ffdf', maxWidth: w - 80 });
    ctx.restore();
  }

  function drawAttract(ctx) {
    if (kidList.length > 0 || S.phase !== 'play' || S.introT > 0) return;
    var bob = Math.sin(LG.time * 3) * 6;
    ui.panel(ctx, 140, 880, 800, 150, { r: 40, fill: 'rgba(20,10,45,0.78)', border: 'rgba(255,209,102,0.7)' });
    ui.text(ctx, '💬 Yorum yaz → pijamalı çocuğun çıksın!', 540, 930 + bob * 0.3, { size: 38, color: '#fff', maxWidth: 740 });
    ui.text(ctx, '🍯 Anne görmeden baklavayı kap!', 540, 984, { size: 32, color: '#ffd166', maxWidth: 740 });
  }

  function drawRain(ctx) {
    if (S.rainT < 0) return;
    var spr = A.treatSprite(S.treat.id, 64);
    for (var i = 0; i < rainP.length; i++) {
      var p = rainP[i];
      if (p.y < -60 || p.y > 1300) continue;
      A.drawSprite(ctx, spr, p.x, p.y, p.r, p.s);
    }
  }

  function render(ctx) {
    if (!bg) bg = A.buildBackground();
    ctx.save();
    ui.applyShake(ctx);
    if (cam.z > 1.002) {
      ctx.translate(slow.fx, slow.fy); ctx.scale(cam.z, cam.z); ctx.translate(-slow.fx, -slow.fy);
    }
    ctx.drawImage(bg, 0, 0);
    // buzdolabı
    var glow = 0.6 + 0.4 * Math.sin(LG.time * 2.4);
    A.fridge(ctx, wt, S.fridgeOpen, glow, S.treat.id);
    drawChalk(ctx);
    drawCat(ctx, false);
    drawMom(ctx);
    drawCat(ctx, true);
    // masadakiler (masanın arkasında)
    for (var i = 0; i < S.winners.length; i++) if (S.winners[i].state === 'seated') drawKid(ctx, S.winners[i]);
    A.table(ctx);
    for (var w = 0; w < S.winners.length; w++) {
      var sk = S.winners[w];
      if (sk.state === 'seated' && sk.rank <= 3) ui.emoji(ctx, ['🥇', '🥈', '🥉'][sk.rank - 1], sk.x, sk.y - 82, 24);
    }
    drawGuests(ctx);
    drawFloorSlips(ctx);
    drawCrowd(ctx);
    // koridordaki çocuklar (derinliğe göre)
    drawList.length = 0;
    for (var a = 0; a < visFull.length; a++) drawList.push(visFull[a]);
    for (var b = 0; b < visMini.length; b++) drawList.push(visMini[b]);
    for (var c = 0; c < S.winners.length; c++) if (S.winners[c].state === 'won' || S.winners[c].state === 'toTable') drawList.push(S.winners[c]);
    drawList.sort(function (p, q) { return p.y - q.y; });
    for (var d = 0; d < drawList.length; d++) {
      var k = drawList[d];
      if (k.vis === 1) drawMini(ctx, k); else drawKid(ctx, k);
    }
    drawFlights(ctx);
    drawComics(ctx);
    drawTags(ctx);
    // kazananların isimleri (buzdolabında / yolda)
    for (var e = 0; e < S.winners.length; e++) {
      var wk = S.winners[e];
      if (wk.state === 'won' || wk.state === 'toTable') ui.drawNameTag(ctx, wk.u, wk.x, wk.y - 110 * wk.s - 18, 20, '#2b2100', 'rgba(255,209,102,0.95)');
    }
    drawRain(ctx);
    drawMomBubble(ctx);
    ctx.restore();

    // ağır çekim kenar karartması
    if (cam.z > 1.01) {
      var va = (cam.z - 1) / 0.14;
      ctx.save();
      var vg = ctx.createRadialGradient(540, 900, 260, 540, 900, 900);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (0.55 * va) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, LG.H);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = Math.min(1, va);
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 232, W, 22); ctx.fillRect(0, 1186, W, 22);
      ctx.restore();
      ui.text(ctx, '🎬 AĞIR ÇEKİM', 540, 1166, { size: 36, color: 'rgba(255,255,255,' + Math.min(1, va) + ')' });
    }
    // kırmızı ışıkta ekran kenarı kızarır
    if (isRed()) {
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.sin(LG.time * 10) * 0.06;
      ctx.lineWidth = 26; ctx.strokeStyle = '#ff2d2d';
      ctx.strokeRect(13, 220, W - 26, 1090);
      ctx.restore();
    }
    drawHud(ctx);
    drawFeed(ctx);
    drawAttract(ctx);
    drawIntro(ctx);
    drawBig(ctx);
    drawSummary(ctx);
    drawBannerStrip(ctx);
  }

  LG.start({
    id: 'anne-terligi',
    title: 'Anne Terliği! 🩴',
    init: function () {
      bg = A.buildBackground();
      newRound();
    },
    update: function (dt) { update(dt); },
    render: function (ctx) { render(ctx); },
  });
})();
