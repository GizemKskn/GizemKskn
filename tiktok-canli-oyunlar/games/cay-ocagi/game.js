/*
 * ÇAY OCAĞI ☕ — mahallenin akşam çay bahçesi. Sohbet masalara oturur, sipariş verir, çaycı koşturur.
 *
 * Yorum : çay / demli / açık → masaya otur + çay; kahve, oralet, su, soda, simit, tost, ayran
 *         (gizli menü: salep, ıhlamur, tavşan kanı); başka her yorum → masandaki konuşma balonu;
 *         hesap → öde ve kalk; tavla / zar → masanda zar at; pisi / kedi → kedi yanına gelir;
 *         "çay benden" → masandakilere çay ısmarla (ücretsiz); "her zamanki" → favorin gelir;
 *         GÜNÜN SOHBETİ sırasında seçeneklerden birini yaz → oy.
 * Beğeni: çaycı hızlanır (hız göstergesi), semaver daha çok tüter; beğeni hedefi dolunca ocaktan herkese çay.
 * Hediye: 1 → BİR ÇAY DA BENDEN (masadaki rastgele birine ısmarla) · 2 / Türk Kahvesi → kahve + lokum
 *         3 / Çay → HERKESE ÇAY · 4 → simit + çay ikramı, saz havası, kedi dans eder
 *         5 → altın rezerve masa + havai fişek · 6 → "Bugün kahvehane senden!"
 * Takip : ocaktan bir çay · Paylaşım: simitçiden simit
 * Unvan : Yeni Gelen → Müdavim (3 ziyaret / 30 yorum) → Kahvehanenin Ağası/Ablası (10 / 150) — sadece katılımla.
 * Kısayollar: N yeni sohbet konusu · B sohbeti bitir · T ocaktan herkese çay · K günü kapat (özet kartı)
 */
(function () {
  'use strict';
  var ui = LG.ui, A = window.CAY_ART, D = window.CAY_DATA;
  var W = LG.W, H = LG.H, TAU = Math.PI * 2;
  var clamp = LG.clamp, lerp = LG.lerp;

  ui.celebrateEnabled = false; // kendi teşekkür şeridimiz ve kartlarımız var
  ui.toastsEnabled = false;

  // ===========================================================================
  // Yerleşim (1080x1920; önemli her şey y 230..1300 içinde)
  // ===========================================================================
  var L = {
    mx: function (x) { return x; },
    mxr: function (x) { return x; },
    mrect: function (x, y, w, h) { return { x: x, y: y, w: w, h: h }; },
  };
  L.COUNTER = { x: 40, y: 540, w: 400, h: 66 };
  L.BOARD = { x: 528, y: 414, w: 498, h: 170 };
  var DOOR = { x: 452, y: 432, w: 62, h: 174 };
  var SEMA = { x: 108, y: 540, s: 0.86 };
  var CUSHION = { x: 304, y: 534 };
  var RADIO = { x: 398, y: 470 };
  var COLS = [200, 540, 880];
  var ROWS = [736, 866, 996, 1126];
  var LANES = [664, 794, 924, 1054, 1192];
  var AISLES = [370, 710];
  var PLAQUE = { x: 540, y: 238 };
  var GAUGE = { x: 125, y: 336, r: 54, on: true };
  var PILL = { x: 960, y: 268, on: true };
  var LIKEBAR = { x: 296, y: 368, w: 488, h: 38 };
  var HINT = { x: 120, y: 1226, w: 840, h: 66 };
  var RIB = { y: 1180, h: 62 };
  var CARD = { x: 56, y: 410, w: 968, h: 196 };
  var BOARD_ALT = null;
  var CAM = LG.CAM;
  if (CAM && CAM.y < 700) {
    // Eller kamerası üstteyse başlığı ve göstergeleri kameradan uzaklaştır
    GAUGE.on = false; PILL.on = false;
    PLAQUE.x = CAM.x > W / 2 ? 372 : 708;
    if (CAM.x > W / 2) BOARD_ALT = { x: 54, y: 414, w: 498, h: 186 };
  }

  var HOME = { x: 214, y: LANES[0] }, POUR = { x: 176, y: LANES[0] };
  var CIRAK_HOME = { x: 483, y: LANES[0] }, CIRAK_POUR = { x: 258, y: LANES[0] };
  var ITEM_S = 1.3;
  var MIN_STAY = 8, LEAVE_DUR = 1.2, IDLE_LEAVE = 420;
  var VOTE_DUR = 50, RESULT_DUR = 12, TOPIC_GAP = 185;

  var HINTS = [
    '💬 çay yaz → masaya otur',
    '☕ kahve, simit, oralet de var',
    '❤️ Beğen → çaycı koşsun',
    '🎁 Hediye → birine çay ısmarla',
    '🎲 tavla yaz → zar at · 🐈 pisi yaz → kedi gelsin',
    '➕ Takip → ocaktan bir çay · 👋 hesap yaz → kalk',
  ];

  // ===========================================================================
  // Türkçe ekler: Ayşe'ye / Ayşe'nin / Ayşe'den (sonu rakamsa okunuşuna göre)
  // ===========================================================================
  var VOW = 'aeıioöuü';
  var D1 = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
  var D10 = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
  function spoken(name) {
    var s = String(name || '').toLocaleLowerCase('tr').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
    var m = s.match(/([a-zçğıöşü]+|[0-9]+)[^a-zçğıöşü0-9]*$/);
    if (!m) return '';
    var tok = m[1];
    if (!/^[0-9]+$/.test(tok)) return tok;
    var n = tok.replace(/^0+/, '');
    if (!n) return 'sıfır';
    var k = n.length;
    if (+n[k - 1]) return D1[+n[k - 1]];
    if (k > 1 && +n[k - 2]) return D10[+n[k - 2]];
    if (k > 2 && +n[k - 3]) return 'yüz';
    return k > 3 ? 'bin' : 'yüz';
  }
  function lastV(w) { for (var i = w.length - 1; i >= 0; i--) if (VOW.indexOf(w[i]) >= 0) return w[i]; return 'e'; }
  function endV(w) { return !!w && VOW.indexOf(w[w.length - 1]) >= 0; }
  function backV(v) { return 'aıou'.indexOf(v) >= 0; }
  function dat(n) { var w = spoken(n); return n + "'" + (endV(w) ? 'y' : '') + (backV(lastV(w)) ? 'a' : 'e'); }
  function gen(n) {
    var w = spoken(n), v = lastV(w);
    var h = 'aı'.indexOf(v) >= 0 ? 'ı' : 'ei'.indexOf(v) >= 0 ? 'i' : 'ou'.indexOf(v) >= 0 ? 'u' : 'ü';
    return n + "'" + (endV(w) ? 'n' : '') + h + 'n';
  }
  function abl(n) {
    var w = spoken(n);
    var hard = !!w && 'çfhkpsşt'.indexOf(w[w.length - 1]) >= 0;
    return n + "'" + (hard ? 't' : 'd') + (backV(lastV(w)) ? 'a' : 'e') + 'n';
  }
  function shortName(n, max) {
    var a = Array.from(String(n || ''));
    max = max || 10;
    return a.length > max ? a.slice(0, max - 1).join('') + '…' : a.join('');
  }
  function upTR(s) { return String(s).toLocaleUpperCase('tr'); }
  function qmi(wd) { // soru eki: mı / mi / mu / mü
    var v = lastV(spoken(wd) || 'e');
    return 'aı'.indexOf(v) >= 0 ? 'mı' : 'ei'.indexOf(v) >= 0 ? 'mi' : 'ou'.indexOf(v) >= 0 ? 'mu' : 'mü';
  }

  // ===========================================================================
  // Kalıcı kayıtlar: müdavimlik (katılımla) + günün çay sayacı
  // ===========================================================================
  var REG_KEY = 'cay-ocagi:mudavim', DAY_KEY = 'cay-ocagi:gun';
  var reg = LG.store.get(REG_KEY, null) || {};
  (function prune() {
    var ks = Object.keys(reg);
    if (ks.length > 4000) {
      ks.sort(function (a, b) { return (reg[a].l || 0) - (reg[b].l || 0); });
      for (var i = 0; i < ks.length - 3000; i++) delete reg[ks[i]];
    }
  })();
  var simReg = {}; // simülatör botları diske yazılmaz
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  var day = LG.store.get(DAY_KEY, null);
  if (!day || day.d !== todayStr()) day = { d: todayStr(), tea: 0, all: (day && day.all) || 0 };
  var dirty = false, saveT = 0;
  function save() {
    if (!dirty) return;
    dirty = false;
    LG.store.set(REG_KEY, reg);
    LG.store.set(DAY_KEY, day);
  }
  window.addEventListener('beforeunload', function () { dirty = true; save(); });

  var TITLES = ['Yeni Gelen', 'Müdavim', 'Kahvehanenin Ağası/Ablası'];
  function lvlOf(r) { return (r.v >= 10 || r.c >= 150) ? 2 : (r.v >= 3 || r.c >= 30) ? 1 : 0; }
  function titleOf(r) {
    var l = lvlOf(r);
    if (l < 2) return TITLES[l];
    return r.p === 'abla' ? 'Kahvehanenin Ablası' : r.p === 'aga' ? 'Kahvehanenin Ağası' : TITLES[2];
  }
  function isSimUser(u) { return /^(sim_|manual_|npc_)/.test(u.id); }
  function recOf(u) {
    var d = u.data.cay || (u.data.cay = {});
    if (d.rec) return d.rec;
    var sim = isSimUser(u);
    var store = sim ? simReg : reg;
    var r = store[u.id], now = Date.now();
    if (!r) {
      r = store[u.id] = { v: 1, c: 0, l: now, f: {} };
      // Demo modunda geri dönen izleyicileri canlandır (diske yazılmaz)
      if (sim && LG.config.demo && u.id.indexOf('sim_') === 0) {
        var roll = Math.random();
        if (roll < 0.09) r.v = LG.randi(10, 30); else if (roll < 0.3) r.v = LG.randi(3, 9);
      }
    } else if (now - (r.l || 0) > 2 * 3600 * 1000) r.v++;
    r.l = now; r.n = u.name;
    if (!r.f) r.f = {};
    d.rec = r; d.lvl = lvlOf(r);
    if (!sim) dirty = true;
    return r;
  }

  // Günün istatistikleri (K ile kapanış kartında)
  var dayItems = {}, dayAct = new Map(), treats = new Map(), pairs = new Map();
  var topicsDone = 0;
  function act(u, k) {
    if (!u || u.__npc) return;
    var a = dayAct.get(u.id);
    if (!a) { a = { u: u, c: 0, o: 0 }; dayAct.set(u.id, a); if (dayAct.size > 3000) dayAct.delete(dayAct.keys().next().value); }
    a[k]++;
  }
  function noteTreat(from, to) {
    if (!from) return;
    var t = treats.get(from.id) || { u: from, n: 0 };
    t.n++; treats.set(from.id, t);
    if (to && to.id !== from.id) {
      var key = from.id + '>' + to.id;
      var p = pairs.get(key) || { a: from, b: to, n: 0 };
      p.n++; pairs.set(key, p);
    }
  }

  // ===========================================================================
  // Sanat (bir kez çizilir)
  // ===========================================================================
  var ART = {};
  function buildArt() {
    if (BOARD_ALT) L.BOARD = { x: -999, y: -999, w: 10, h: 10 }; // tahtayı arka plana çizme
    ART.bg = A.buildBackground(L);
    if (BOARD_ALT) L.BOARD = BOARD_ALT;
    var g = ART.bg.getContext('2d');
    drawDoor(g);
    A.drawWires(g);
    ART.plaque = A.buildPlaque();
    ART.counter = A.buildCounter(L);
    ART.sema = A.buildSemaver();
    ART.table = A.buildTable(false);
    ART.tableV = vase(A.buildTable(false));
    ART.vip = A.buildTable(true);
    ART.vipV = vase(A.buildTable(true));
    ART.bulbs = A.lightBulbs();
    ART.plant = buildPlant();
  }
  function drawDoor(g) {
    var d = DOOR;
    g.save();
    g.fillStyle = '#2e1a0e'; g.fillRect(d.x - 7, d.y - 6, d.w + 14, d.h + 6);
    var gr = g.createLinearGradient(0, d.y, 0, d.y + d.h);
    gr.addColorStop(0, '#ffd890'); gr.addColorStop(0.6, '#e8964a'); gr.addColorStop(1, '#a8541f');
    g.fillStyle = gr; g.fillRect(d.x, d.y, d.w, d.h);
    // boncuklu perde
    for (var i = 0; i < 6; i++) {
      var bx = d.x + 7 + i * 9.6;
      for (var by = d.y + 6; by < d.y + d.h - 26; by += 8.5) {
        g.fillStyle = (i + Math.round(by / 8.5)) % 3 ? 'rgba(150,35,25,0.75)' : 'rgba(255,245,210,0.85)';
        A.ell(g, bx, by, 2.3, 3.1); g.fill();
      }
    }
    // kemer + nazar
    g.fillStyle = '#2e1a0e';
    g.beginPath(); g.moveTo(d.x - 7, d.y - 6); g.quadraticCurveTo(d.x + d.w / 2, d.y - 34, d.x + d.w + 7, d.y - 6); g.closePath(); g.fill();
    g.fillStyle = '#1f4f9a'; A.ell(g, d.x + d.w / 2, d.y - 14, 8, 8); g.fill();
    g.fillStyle = '#fff'; A.ell(g, d.x + d.w / 2, d.y - 14, 5, 5); g.fill();
    g.fillStyle = '#5fa8e8'; A.ell(g, d.x + d.w / 2, d.y - 14, 3, 3); g.fill();
    g.fillStyle = '#111'; A.ell(g, d.x + d.w / 2, d.y - 14, 1.5, 1.5); g.fill();
    // kapıdan taşan ışık
    g.globalCompositeOperation = 'lighter';
    var lg = g.createRadialGradient(d.x + d.w / 2, d.y + d.h, 4, d.x + d.w / 2, d.y + d.h, 180);
    lg.addColorStop(0, 'rgba(255,180,90,0.32)'); lg.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = lg; g.fillRect(d.x - 180, d.y + d.h - 180, d.w + 360, 360);
    g.restore();
  }
  function vase(c) {
    var g = c.getContext('2d');
    g.save(); g.translate(130, 40);
    g.fillStyle = 'rgba(210,235,255,0.6)';
    g.beginPath(); g.moveTo(-6, -6); g.lineTo(6, -6); g.lineTo(4, -22); g.lineTo(-4, -22); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = '#2f6a2a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -20); g.lineTo(-1, -34); g.stroke();
    g.fillStyle = '#2f6a2a'; A.ell(g, 4, -28, 4, 2); g.fill();
    g.fillStyle = '#d9262c'; A.ell(g, -1, -37, 6.5, 5); g.fill();
    g.fillStyle = '#ff6464'; A.ell(g, -2, -39, 3.5, 2.5); g.fill();
    g.restore();
    return c;
  }
  function buildPlant() {
    var c = A.cv(140, 170), g = c.getContext('2d');
    g.translate(70, 160);
    g.fillStyle = 'rgba(0,0,0,0.3)'; A.ell(g, 0, 0, 40, 9); g.fill();
    g.fillStyle = '#a8502c'; g.beginPath(); g.moveTo(-30, -44); g.lineTo(30, -44); g.lineTo(22, 0); g.lineTo(-22, 0); g.closePath(); g.fill();
    g.fillStyle = '#c4683a'; g.fillRect(-33, -50, 66, 10);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-20, -40, 6, 34);
    g.strokeStyle = '#5a3a1a'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -48); g.quadraticCurveTo(-6, -80, 2, -104); g.stroke();
    var greens = ['#2c5e2a', '#3a7434', '#4a8a3e', '#24502a'];
    for (var i = 0; i < 26; i++) {
      var a = i / 26 * TAU, rr = 22 + (i % 5) * 6;
      g.fillStyle = greens[i % 4];
      A.ell(g, Math.cos(a) * rr * 1.1, -118 + Math.sin(a) * rr * 0.75, 14, 10); g.fill();
    }
    g.fillStyle = '#6b8f3a'; for (var j = 0; j < 7; j++) { A.ell(g, -26 + j * 9, -112 + (j % 3) * 9, 3, 4); g.fill(); }
    return c;
  }

  // ===========================================================================
  // Masalar ve koltuklar
  // ===========================================================================
  var SLOT_ORDER = [[0, 1], [0, 0], [0, 2], [1, 1], [1, 0], [1, 2], [2, 1], [2, 0], [2, 2], [3, 1], [3, 0], [3, 2]];
  var tables = [];
  SLOT_ORDER.forEach(function (rc, i) {
    var tx = COLS[rc[1]], ty = ROWS[rc[0]];
    var t = { i: i, r: rc[0], col: rc[1], x: tx, y: ty, shown: i < 6, showT: i < 6 ? 9 : 0, vip: null, seats: [] };
    t.seats = [
      { t: t, k: 0, side: 'back', x: tx - 57, dx: tx - 57, dy: ty - 6, fx: tx - 30, fy: ty + 8, c: null, res: null },
      { t: t, k: 1, side: 'back', x: tx + 57, dx: tx + 57, dy: ty - 6, fx: tx + 30, fy: ty + 8, c: null, res: null },
      { t: t, k: 2, side: 'left', x: tx - 131, dx: tx - 86, dy: ty + 10, fx: tx - 68, fy: ty + 17, c: null, res: null },
      { t: t, k: 3, side: 'right', x: tx + 131, dx: tx + 86, dy: ty + 10, fx: tx + 68, fy: ty + 17, c: null, res: null },
    ];
    tables.push(t);
  });
  var ROW_TABLES = [[], [], [], []];
  tables.forEach(function (t) { ROW_TABLES[t.r].push(t); });
  ROW_TABLES.forEach(function (r) { r.sort(function (a, b) { return a.x - b.x; }); });
  var revealCD = 0;
  function revealTable() {
    for (var i = 0; i < tables.length; i++) {
      var t = tables[i];
      if (!t.shown) {
        t.shown = true; t.showT = 0;
        LG.sfx('whoosh');
        ui.float('Yeni masa açıldı! 🪑', t.x, t.y - 40, { color: '#ffe3a3', size: 30 });
        return t;
      }
    }
    return null;
  }
  function freeSeat() {
    var i, j, t, s;
    if (Math.random() < 0.65) {
      for (i = 0; i < tables.length; i++) {
        t = tables[i];
        if (!t.shown) continue;
        var off = LG.randi(0, 3);
        for (j = 0; j < 4; j++) { s = t.seats[(j + off) % 4]; if (!s.c && !s.res) return s; }
      }
      return null;
    }
    var all = [];
    for (i = 0; i < tables.length; i++) {
      t = tables[i];
      if (!t.shown) continue;
      for (j = 0; j < 4; j++) { s = t.seats[j]; if (!s.c && !s.res) all.push(s); }
    }
    return all.length ? LG.pick(all) : null;
  }
  function countFree() {
    var n = 0;
    for (var i = 0; i < tables.length; i++) {
      var t = tables[i];
      if (!t.shown) continue;
      for (var j = 0; j < 4; j++) if (!t.seats[j].c && !t.seats[j].res) n++;
    }
    return n;
  }

  // ===========================================================================
  // Müşteriler
  // ===========================================================================
  var custs = [];          // ekrandaki müşteriler (kalkanlar solarken de burada)
  var byId = new Map();    // oturan müşteri (user.id -> c)
  var chatList = [];       // aktif konuşma balonu olanlar
  var doorQ = [];          // yer bekleyenler
  var doorTimer = 0, doorLast = null;
  var humans = 0;          // oturan gerçek izleyici sayısı (her karede)

  function makeCust(u, seat, delay, npc) {
    var c = {
      user: u, seat: seat, born: LG.time + (delay || 0), last: LG.time, leaving: -1,
      od: null, of: null, ordImg: null, drink: null, food: null, bub: null,
      sipT: 0, nextSip: LG.rand(3, 6), eatT: 0, nextEat: LG.rand(4, 7),
      raiseT: 0, glow: 0, pop: 0, ph: Math.random() * 6, lvl: 0, npc: !!npc, vip: false,
      tag: null, tagKey: '', shirt: npc ? (u.id === 'npc_riza' ? '#6d5a48' : '#3f5a6d') : 'hsl(' + u.hue + ',46%,42%)',
      danceT: 0, falAt: 0, activeT: LG.time,
    };
    if (!npc) {
      var r = recOf(u);
      c.lvl = lvlOf(r);
    }
    seat.c = c;
    byId.set(u.id, c);
    custs.push(c);
    refreshTag(c);
    return c;
  }
  function refreshTag(c) {
    var pre = c.npc ? '' : c.vip ? '🌟 ' : c.lvl >= 2 ? '👑 ' : c.lvl >= 1 ? '☕ ' : '';
    var key = pre + '|' + c.user.name;
    if (key === c.tagKey) return;
    c.tagKey = key;
    c.tag = { id: c.user.id + '#' + pre, name: pre + shortName(c.user.name, 10) };
  }
  function tagStyle(c) {
    if (c.npc) return ['#ffe9c4', 'rgba(70,40,20,0.88)'];
    if (c.vip) return ['#3a2000', '#ffd54a'];
    if (c.lvl >= 2) return ['#ffe28a', 'rgba(110,55,0,0.94)'];
    if (c.lvl >= 1) return ['#ffe9c8', 'rgba(92,46,16,0.9)'];
    return ['#ffffff', 'rgba(25,12,5,0.76)'];
  }
  function evictCandidate() {
    var best = null, bs = Infinity;
    for (var i = 0; i < custs.length; i++) {
      var c = custs[i];
      if (c.leaving >= 0 || c.vip) continue;
      var score;
      if (c.npc) score = -1e9;
      else {
        if (LG.time - c.born < MIN_STAY) continue;
        if ((c.od && c.od.claimed) || c.raiseT > 0) continue;
        score = c.last;
      }
      if (score < bs) { bs = score; best = c; }
    }
    return best;
  }
  function vipSeatFor(uid) {
    for (var i = 0; i < tables.length; i++) if (tables[i].vip && tables[i].vip.user.id === uid) return tables[i].seats[0];
    return null;
  }
  function relocate(c) {
    var s = freeSeat();
    if (!s) { leave(c, 'Buyrun, yer sizin 😊'); return; }
    if (c.seat.c === c) c.seat.c = null;
    c.seat = s; s.c = c; c.born = LG.time; c.pop = 0;
  }
  function enqueueDoor(u) {
    var i = doorQ.indexOf(u);
    if (i >= 0) doorQ.splice(i, 1);
    doorQ.push(u);
    if (doorQ.length > 40) doorQ.shift();
    doorLast = u;
  }
  function seatUser(u, o) {
    o = o || {};
    var c = byId.get(u.id);
    if (c) return c;
    var seat = vipSeatFor(u.id), delay = 0;
    if (seat && seat.c) relocate(seat.c);
    if (!seat) seat = freeSeat();
    if (!seat && revealTable()) seat = freeSeat();
    if (!seat) {
      var ev = evictCandidate();
      if (ev) {
        seat = ev.seat;
        leave(ev, ev.npc ? 'Gençler oturun, yer var 😊' : LG.pick(['Hesap! 👋', 'Hesap! Kalkalım 👋', 'Buyrun, yer sizin 👋']));
        delay = 0.45;
      }
    }
    if (!seat) { if (!o.door) enqueueDoor(u); return null; }
    var di = doorQ.indexOf(u);
    if (di >= 0) doorQ.splice(di, 1);
    c = makeCust(u, seat, delay, false);
    arrive(c, o.isNew);
    return c;
  }
  function arrive(c, isNew) {
    var u = c.user, d = u.data.cay || {};
    LG.sfx(isNew ? 'join' : 'pop');
    puffAt(c.seat.x, c.seat.t.y - 20, 4);
    if (!d.greeted) {
      d.greeted = true;
      if (c.lvl >= 2) {
        sayW(cayci, 'Ooo ' + u.name + ' gelmiş! Başköşeye buyur! 👑', 3.2, true);
        sayCust(c, titleOf(d.rec) + ' geldi! 👑', 3.5, { name: u.name, bg: '#fff2c4' });
      } else if (c.lvl === 1) {
        sayW(cayci, 'Hoş geldin ' + u.name + '! Her zamankinden mi? 😄', 3, true);
        sayCust(c, 'Müdavim geldi ☕', 3, { name: u.name, bg: '#fff2c4' });
      } else if (isNew) {
        sayW(cayci, 'Hoş geldin ' + u.name + '! Ne içersin? 🫖', 2.6);
      }
    }
    if (d.pend) { var p = d.pend; d.pend = null; placeOrder(c, p, {}); }
  }
  function leave(c, text, pay) {
    if (c.leaving >= 0) return;
    c.leaving = 0;
    if (c.seat.c === c) c.seat.c = null;
    if (byId.get(c.user.id) === c) byId.delete(c.user.id);
    if (c.od) removeOrder(c.od);
    if (c.of) removeOrder(c.of);
    c.od = c.of = null; c.ordImg = null;
    if (text) sayCust(c, text, 1.6);
    if (pay) {
      LG.sfx('coin');
      ui.float('🪙', c.seat.x, c.seat.t.y - 70, { size: 34, vy: -90 });
    }
  }
  function payAndLeave(c) {
    if (c.npc) return;
    leave(c, LG.pick(['Hesap benden! 🪙', 'Hesap benden, kalkıyorum 👋', 'Eline sağlık çaycı, hesap benden!']), true);
  }

  // Konuşma balonları
  function sayCust(c, text, life, o) {
    o = o || {};
    if (!text) return;
    c.bub = {
      img: A.bubble(text, { size: o.size || 22, maxW: o.maxW || 300, name: o.name === undefined ? c.user.name : o.name, bg: o.bg, nameColor: o.nameColor }),
      t: LG.time, life: life || 4.5,
    };
    var i = chatList.indexOf(c);
    if (i >= 0) chatList.splice(i, 1);
    chatList.push(c);
    while (chatList.length > 13) { var old = chatList.shift(); old.bub = null; }
  }
  function refreshOrderImg(c) {
    if (!c.od && !c.of) { c.ordImg = null; c.ordMini = null; return; }
    var txt, mini;
    if (c.od && c.of) { txt = c.od.label + ' ' + c.od.icon + ' + ' + c.of.icon; mini = c.od.icon + c.of.icon; }
    else { var o = c.od || c.of; txt = o.label + ' ' + o.icon; mini = o.icon; }
    var gift = (c.od && c.od.gift) || (c.of && c.of.gift);
    c.ordImg = A.bubble(txt, { size: 20, bg: gift ? '#fff2b8' : '#fff1d6', border: '#c98b4a', maxW: 260 });
    c.ordMini = A.bubble(mini, { size: 17, bg: gift ? '#fff2b8' : '#fff1d6', border: '#c98b4a' });
  }

  // ===========================================================================
  // Siparişler
  // ===========================================================================
  var orders = [];
  var availCount = 0;
  var TRAY_COL = { kahve: '#4a2a14', su: 'rgba(160,215,255,0.85)', ayran: '#f6f6ee', tost: '#e6a64c', salep: '#f2e6cc', simit: '#c98a3c' };
  function findOrder(text) {
    for (var i = 0; i < D.ORDERS.length; i++) if (LG.cmd.has(text, D.ORDERS[i].words)) return D.ORDERS[i];
    return null;
  }
  function orderLabel(def, text) {
    if (def.item === 'kahve' && text) {
      var sug = LG.cmd.match(text, D.COFFEE_SUGAR);
      if (sug) return '1 ' + (sug === 'sekerli' ? 'şekerli' : sug) + ' kahve';
    }
    return def.label;
  }
  var DEF_CAY = { item: 'cay', v: 'normal', label: '1 çay', icon: '🫖' };
  var DEF_KAHVE = { item: 'kahve', v: 'orta', label: '1 kahve', icon: '☕' };
  var DEF_SIMIT = { item: 'simit', v: 'simit', label: '1 simit', icon: '🥯' };
  function teaFor(c) {
    var r = c.user.data && c.user.data.cay && c.user.data.cay.rec;
    var v = 'normal';
    if (r && r.f) { if ((r.f.demli || 0) > (r.f.acik || 0) && r.f.demli) v = 'demli'; else if (r.f.acik) v = 'acik'; }
    return { item: 'cay', v: v, label: v === 'demli' ? '1 demli' : v === 'acik' ? '1 açık' : '1 çay', icon: '🫖' };
  }
  function favOf(r) {
    var best = null, bn = 0;
    for (var k in r.f) if (r.f[k] > bn && k.indexOf('v:') !== 0) { bn = r.f[k]; best = k; }
    if (best === 'cay' || !best) {
      var v = (r.f.demli || 0) > (r.f.acik || 0) ? 'demli' : r.f.acik ? 'acik' : 'normal';
      return { item: 'cay', v: v, label: '1 ' + (v === 'demli' ? 'demli' : v === 'acik' ? 'açık' : 'çay'), icon: '🫖' };
    }
    for (var i = 0; i < D.ORDERS.length; i++) if (D.ORDERS[i].item === best) return D.ORDERS[i];
    return DEF_CAY;
  }
  function placeOrder(c, def, o) {
    o = o || {};
    if (!c || c.leaving >= 0) return null;
    var slot = (def.item === 'simit' || def.item === 'tost') ? 'food' : 'drink';
    var cur = slot === 'food' ? c.of : c.od;
    if (cur) {
      if (cur.claimed) return cur;      // yolda, ikinciyi alma
      removeOrder(cur);
    }
    var ord = {
      c: c, kind: def.item, v: def.v, label: o.label || def.label, icon: def.icon, slot: slot,
      by: def.item === 'simit' ? 'simitci' : 'cayci', t: LG.time, gift: !!o.gift, from: o.from || null,
      prio: o.prio || 0, round: o.round || 0, claimed: null, secret: !!def.secret,
    };
    if (slot === 'food') c.of = ord; else c.od = ord;
    orders.push(ord);
    refreshOrderImg(c);
    if (!o.silent) { LG.sfx('pop'); c.pop = 1; }
    if (!c.npc && !o.gift) {
      var r = recOf(c.user);
      r.f[def.item] = (r.f[def.item] || 0) + 1;
      if (def.item === 'cay' && def.v !== 'normal') r.f[def.v] = (r.f[def.v] || 0) + 1;
      act(c.user, 'o');
    }
    if (ord.by === 'simitci') callSimitci();
    if (def.secret && !o.silent) sayW(cayci, D.CAYCI.secret + ' ' + def.label + ' geliyor!', 2.4);
    return ord;
  }
  function removeOrder(o) {
    var i = orders.indexOf(o);
    if (i >= 0) orders.splice(i, 1);
    var c = o.c;
    if (c.od === o) c.od = null;
    if (c.of === o) c.of = null;
    refreshOrderImg(c);
  }
  function drinkPos(o) {
    var s = o.c.seat;
    return o.slot === 'food' ? { x: s.fx, y: s.fy } : { x: s.dx, y: s.dy };
  }
  function give(o) {
    var c = o.c;
    removeOrder(o);
    if (c.leaving >= 0) return;
    var it = { kind: o.kind, v: o.v, lv: 1, t: LG.time, from: o.from, gold: o.gift, emptyT: 0 };
    if (o.slot === 'food') { c.food = it; c.nextEat = LG.rand(3, 5); }
    else { c.drink = it; c.nextSip = LG.rand(2.2, 4.5); }
    c.pop = 1;
    LG.sfx('tick');
    var p = drinkPos(o);
    puffAt(p.x, p.y - 30, o.kind === 'cay' || o.kind === 'kahve' ? 3 : 1);
    dayItems[o.kind] = (dayItems[o.kind] || 0) + 1;
    if (o.kind === 'cay') { day.tea++; day.all = (day.all || 0) + 1; dirty = true; teaBump = 1; }
    if (o.from && o.from.id !== c.user.id) {
      c.glow = o.round ? 1.4 : 4.5;
      if (!o.round) sayCust(c, LG.pick(D.THANKS).replace('{n}', o.from.name), 3.2);
    }
    if (o.kind === 'kahve') {
      sayCust(c, 'Fincanı kapat, falına sonra bakarız 😄', 3.6, { name: '☕ Çaycı', bg: '#fffbe8', nameColor: '#7a1f12', maxW: 460 });
      c.falAt = LG.time + 24;
    }
    if (o.round && round && round.id === o.round) round.done++;
  }

  // Uçan / bırakılan ikramlar
  var flying = [];
  function launch(o, x0, y0, dur, peak) {
    var p = drinkPos(o);
    flying.push({ o: o, x0: x0, y0: y0, x1: p.x, y1: p.y, t: 0, dur: dur, peak: peak, spin: o.kind === 'simit' ? LG.rand(8, 14) : 0 });
  }

  // ===========================================================================
  // Çaycı ve çırak
  // ===========================================================================
  function makeWaiter(kind) {
    var home = kind === 'cayci' ? HOME : CIRAK_HOME;
    return {
      kind: kind, x: home.x, y: home.y, home: home, pour: kind === 'cayci' ? POUR : CIRAK_POUR,
      path: [], face: kind === 'cayci' ? 1 : -1, step: 0, moving: false, vx: 0, swing: 0, swingV: 0, lean: 0, sprint: false,
      state: 'idle', tray: [], trayCol: [], loadQ: [], targets: [], cur: null, timer: 0, tossCD: 0, rush: false,
      say: null, idleT: 0, s: kind === 'cayci' ? 1.14 : 1.02,
    };
  }
  var cayci = makeWaiter('cayci');
  var cirak = makeWaiter('cirak');
  var lastWSay = -99;
  function sayW(w, text, life, force) {
    if (!force && LG.time - lastWSay < 2.2) return;
    lastWSay = LG.time;
    w.say = { img: A.bubble(text, { size: 22, maxW: 540, bg: '#fffbe8', border: '#8a5428', name: w.kind === 'cayci' ? 'Çaycı' : 'Çırak', nameColor: '#7a1f12' }), t: 0, life: life || 2.4 };
  }
  function route(from, to) {
    if (Math.abs(from.y - to.y) < 3) return [{ x: to.x, y: to.y }];
    var best = AISLES[0], bc = Infinity;
    for (var i = 0; i < AISLES.length; i++) {
      var cst = Math.abs(from.x - AISLES[i]) + Math.abs(AISLES[i] - to.x);
      if (cst < bc) { bc = cst; best = AISLES[i]; }
    }
    return [{ x: best, y: from.y }, { x: best, y: to.y }, { x: to.x, y: to.y }];
  }
  function moveAlong(w, dt, spd) {
    var moved = 0, guard = 0;
    while (w.path.length && dt > 1e-5 && guard++ < 6) {
      var p = w.path[0], dx = p.x - w.x, dy = p.y - w.y, d = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(dx) > 1) w.face = dx > 0 ? 1 : -1;
      var step = spd * dt;
      if (d <= step) { w.x = p.x; w.y = p.y; w.path.shift(); dt -= d / spd; moved += d; }
      else { w.x += dx / d * step; w.y += dy / d * step; moved += step; dt = 0; }
    }
    return moved;
  }
  function servePt(o) {
    var s = o.c.seat;
    var x = s.side === 'left' ? s.x + 32 : s.side === 'right' ? s.x - 32 : s.x;
    return { x: clamp(x, 60, 1020), y: LANES[s.t.r] };
  }
  function handPos(w) {
    var bounce = w.moving ? Math.abs(Math.sin(w.step)) * 5 * w.s : 0;
    return { x: w.x + 26 * w.s * w.face, y: w.y - 30 * w.s - bounce };
  }
  function nnOrder(list, from) {
    var out = [], px = from.x, py = from.y, rest = list.slice();
    while (rest.length) {
      var bi = 0, bd = Infinity;
      for (var i = 0; i < rest.length; i++) {
        var sp = servePt(rest[i]);
        var dd = Math.abs(sp.x - px) + Math.abs(sp.y - py) * 1.4;
        if (dd < bd) { bd = dd; bi = i; }
      }
      var o = rest.splice(bi, 1)[0];
      out.push(o);
      var s2 = servePt(o); px = s2.x; py = s2.y;
    }
    return out;
  }
  function claim(w, cap, filter) {
    var list = [];
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      if (!o.claimed && o.by === 'cayci' && o.c.leaving < 0 && LG.time >= o.c.born && (!filter || filter(o))) list.push(o);
    }
    list.sort(function (a, b) { return b.prio - a.prio || a.t - b.t; });
    if (list.length > cap) list.length = cap;
    for (var j = 0; j < list.length; j++) list[j].claimed = w;
    return list;
  }
  function halfFilter(w) {
    // Herkese çay turunda işi bölüş: çaycı sol ve üst, çırak sağ ve alt
    return function (o) {
      var t = o.c.seat.t;
      var mine = t.col === 0 || (t.col === 1 && t.r <= 1);
      return w.kind === 'cayci' ? mine : !mine;
    };
  }
  function refreshTray(w) {
    w.trayCol = w.tray.map(function (o) {
      if (o.kind === 'cay') return A.TEA[o.v] || A.TEA.normal;
      if (o.kind === 'oralet') return A.TEA.portakal;
      if (o.kind === 'ihlamur') return A.TEA.ihlamur;
      return TRAY_COL[o.kind] || A.TEA.normal;
    });
  }
  function removeFromTray(w, o) {
    var i = w.tray.indexOf(o);
    if (i >= 0) { w.tray.splice(i, 1); refreshTray(w); }
  }
  function tryToss(w, range) {
    var h = handPos(w);
    for (var i = 0; i < w.targets.length; i++) {
      var o = w.targets[i], p = drinkPos(o);
      var dx = p.x - h.x, dy = p.y - h.y, d2 = dx * dx + dy * dy;
      if (d2 < range * range) {
        w.targets.splice(i, 1);
        removeFromTray(w, o);
        var d = Math.sqrt(d2);
        launch(o, h.x, h.y, 0.34 + d / 1500, 70 + d * 0.18);
        w.tossCD = round ? 0.05 : 0.09;
        LG.sfx('whoosh');
        return true;
      }
    }
    return false;
  }
  function finishRun(w) {
    w.tray.length = 0; refreshTray(w);
    w.targets.length = 0; w.cur = null;
    w.state = 'idle';
    w.path = [];
  }
  function updWaiter(w, dt) {
    var boost = speedMul * (round ? 1.7 : 1) * (w.rush ? 1.15 : 1);
    var spd = (w.kind === 'cayci' ? 300 : 280) * boost;
    var px = w.x;
    var moved = moveAlong(w, dt, spd);
    w.moving = moved > 0.01;
    w.step += moved * 0.055;
    var vx = (w.x - px) / Math.max(dt, 1e-3);
    w.vx = lerp(w.vx, vx, Math.min(1, dt * 12));
    var target = clamp(w.vx * 0.0007, -0.5, 0.5) + (w.moving ? Math.sin(w.step * 2) * 0.05 : 0);
    w.swingV += ((target - w.swing) * 55 - w.swingV * 3.2) * dt;
    w.swing = clamp(w.swing + w.swingV * dt, -0.8, 0.8);
    w.sprint = w.moving && boost > 1.9;
    w.lean = lerp(w.lean, w.moving ? Math.min(0.24, (boost - 1) * 0.13) : 0, Math.min(1, dt * 6));
    if (w.sprint && Math.random() < dt * 10) sweatDrop(w);
    if (w.moving && boost > 1.5 && Math.random() < dt * 7) puffAt(w.x - w.face * 14, w.y - 6, 1, 0.5);
    if (w.say) { w.say.t += dt; if (w.say.t > w.say.life) w.say = null; }
    w.tossCD -= dt;
    w.rush = availCount + w.targets.length > 12;

    switch (w.state) {
      case 'idle': {
        w.idleT += dt;
        var want = w.kind === 'cayci' ? availCount > 0 : (availCount >= 4 || (round && availCount > 0));
        if (want) {
          var cap = round ? 99 : (availCount > 12 ? 14 : 8);
          var got = claim(w, cap, round ? halfFilter(w) : null);
          if (!got.length) got = claim(w, cap, null);
          if (got.length) {
            availCount -= got.length;
            w.loadQ = got; w.state = 'toPour'; w.path = route(w, w.pour); w.idleT = 0;
            if (w.kind === 'cayci' && got.length >= 6 && Math.random() < 0.6) sayW(w, LG.pick(D.CAYCI.rush), 1.8);
            break;
          }
        }
        if (!w.path.length && (Math.abs(w.x - w.home.x) > 2 || Math.abs(w.y - w.home.y) > 2)) w.path = route(w, w.home);
        if (!w.path.length) {
          w.face = w.kind === 'cayci' ? 1 : -1;
          if (w.kind === 'cayci' && w.idleT > 14 && Math.random() < dt * 0.08) { sayW(w, LG.pick(D.CAYCI.idle), 2.6); w.idleT = 0; }
          // Beğeniler yağıyorsa boş durmaz: masalar arasında koşturur
          if (speedFrac > 0.4 && Math.random() < dt * (w.kind === 'cayci' ? 2.5 : 1.2)) {
            var lane = LG.randi(0, 3);
            w.path = route(w, { x: LG.rand(90, 990), y: LANES[lane] });
            if (w.kind === 'cayci' && Math.random() < 0.3) sayW(w, LG.pick(['Hop hop!', 'Geliyooor!', 'Beğeniler beni uçurdu! 💨', 'Masalar parlasın!']), 1.8);
          }
        }
        break;
      }
      case 'toPour':
        if (!w.path.length) { w.state = 'load'; w.timer = 0; w.face = -1; }
        break;
      case 'load': {
        w.timer += dt;
        var li = round ? 0.025 : 0.1 / boost;
        while (w.timer >= li && w.loadQ.length) {
          w.timer -= li;
          var lo = w.loadQ.shift();
          if (lo.c.leaving >= 0) { removeOrder(lo); continue; }
          w.tray.push(lo);
          refreshTray(w);
          LG.sfx('tick');
        }
        if (!w.loadQ.length) {
          w.targets = nnOrder(w.tray.slice(), w);
          w.state = 'deliver'; w.cur = null;
          puffAt(SEMA.x + 10, SEMA.y - 150, 2);
        }
        break;
      }
      case 'deliver': {
        for (var i = w.targets.length - 1; i >= 0; i--) {
          if (w.targets[i].c.leaving >= 0) { var dead = w.targets.splice(i, 1)[0]; removeFromTray(w, dead); removeOrder(dead); }
        }
        if ((round || w.rush) && w.tossCD <= 0 && w.targets.length) tryToss(w, round ? 430 : 300);
        if (!w.targets.length) { finishRun(w); break; }
        if (w.cur !== w.targets[0]) { w.cur = w.targets[0]; w.path = route(w, servePt(w.cur)); }
        if (!w.path.length) {
          w.state = 'serve';
          w.timer = round ? 0.05 : 0.2 / boost;
          w.face = drinkPos(w.cur).x >= w.x ? 1 : -1;
        }
        break;
      }
      case 'serve':
        w.timer -= dt;
        if (w.timer <= 0) {
          var so = w.targets.shift();
          if (so) {
            removeFromTray(w, so);
            if (so.c.leaving < 0) { var h = handPos(w); launch(so, h.x, h.y, 0.24, 36); }
            else removeOrder(so);
          }
          w.state = 'deliver'; w.cur = null;
        }
        break;
    }
  }

  // ===========================================================================
  // Simitçi
  // ===========================================================================
  var simitci = { on: false, x: -90, y: LANES[4], dir: 1, step: 0, cd: 0, wait: 0, all: null, from: null, say: null };
  function callSimitci() { if (!simitci.on && simitci.wait <= 0) simitci.wait = 1.0; }
  function simitAll(from) {
    simitci.all = new Set();
    simitci.from = from || null;
    if (!simitci.on) simitci.wait = 0.4;
  }
  function updSimitci(dt) {
    var s = simitci;
    if (!s.on) {
      var need = s.all;
      if (!need) for (var i = 0; i < orders.length; i++) if (orders[i].by === 'simitci') { need = true; break; }
      if (need && s.wait > 0) {
        s.wait -= dt;
        if (s.wait <= 0) {
          s.on = true; s.x = s.dir > 0 ? -90 : W + 90; s.cd = 0.4;
          s.say = { img: A.bubble(s.all ? 'Simitler benden! Taze taze! 🥯' : 'Simiiit! Taze simit! 🥯', { size: 22, maxW: 360, bg: '#fffbe8', border: '#8a5428', name: 'Simitçi', nameColor: '#7a4a22' }), t: 0, life: 2.8 };
          LG.sfx('bell');
        }
      } else if (need && s.wait <= 0) s.wait = 1.0;
      return;
    }
    var spd = (s.all ? 330 : 250) * Math.min(1.6, speedMul);
    s.x += s.dir * spd * dt;
    s.step += spd * dt * 0.05;
    if (s.say) { s.say.t += dt; if (s.say.t > s.say.life) s.say = null; }
    s.cd -= dt;
    if (s.cd <= 0) {
      var hx = s.x + s.dir * 6, hy = s.y - 150;
      var done = false;
      for (var j = 0; j < orders.length && !done; j++) {
        var o = orders[j];
        if (o.by !== 'simitci' || o.claimed || o.c.leaving >= 0 || LG.time < o.c.born) continue;
        if (Math.abs(o.c.seat.x - s.x) < 210) {
          o.claimed = s;
          var p = drinkPos(o), d = Math.hypot(p.x - hx, p.y - hy);
          launch(o, hx, hy, 0.4 + d / 1600, 90 + d * 0.15);
          LG.sfx('whoosh'); s.cd = 0.1; done = true;
        }
      }
      if (!done && s.all) {
        for (var k = 0; k < custs.length; k++) {
          var c = custs[k];
          if (c.leaving >= 0 || s.all.has(c) || LG.time < c.born || Math.abs(c.seat.x - s.x) > 240) continue;
          s.all.add(c);
          var fo = { c: c, kind: 'simit', v: 'simit', label: '1 simit', icon: '🥯', slot: 'food', by: 'simitci', t: LG.time, gift: true, from: s.from, prio: 0, round: 0, claimed: s };
          if (c.of && !c.of.claimed) removeOrder(c.of);
          var p2 = drinkPos(fo), d2 = Math.hypot(p2.x - hx, p2.y - hy);
          launch(fo, hx, hy, 0.4 + d2 / 1600, 90 + d2 * 0.15);
          LG.sfx('whoosh'); s.cd = 0.06; break;
        }
      }
    }
    if (s.x > W + 100 || s.x < -100) {
      s.on = false; s.dir = -s.dir; s.all = null; s.from = null;
      var more = false;
      for (var m = 0; m < orders.length; m++) if (orders[m].by === 'simitci' && !orders[m].claimed) { more = true; break; }
      s.wait = more ? 1.2 : 0;
    }
  }

  // ===========================================================================
  // Kedi (Sarman)
  // ===========================================================================
  var cat = { st: 'sleep', x: CUSHION.x, y: CUSHION.y, dir: -1, path: [], jump: null, sitT: 0, target: null, cd: 0, dance: 0, wander: LG.rand(50, 80), say: null };
  var CAT_FLOOR = { x: CUSHION.x + 36, y: LANES[0] };
  function catVisit(c) {
    if (!c || cat.cd > 0) return false;
    if (cat.st === 'sleep') {
      cat.target = c; cat.st = 'down';
      cat.jump = { x0: cat.x, y0: cat.y, x1: CAT_FLOOR.x, y1: CAT_FLOOR.y, t: 0, dur: 0.45 };
      LG.sfx('boing');
      catSay('Miyav? 🐾');
      return true;
    }
    if (cat.st === 'walk' || cat.st === 'sit' || cat.st === 'back') {
      cat.target = c; cat.st = 'walk';
      cat.path = route(cat, catSpot(c));
      return true;
    }
    return false;
  }
  function catSpot(c) {
    var s = c.seat;
    return { x: clamp(s.x + (s.side === 'right' ? -34 : 34), 50, 1030), y: LANES[s.t.r + 1] };
  }
  function catSay(t) { cat.say = { img: A.bubble(t, { size: 20, bg: '#fff0f4', border: '#d7869a' }), t: 0, life: 1.8 }; }
  function updCat(dt) {
    cat.cd -= dt;
    if (cat.dance > 0) cat.dance -= dt;
    if (cat.say) { cat.say.t += dt; if (cat.say.t > cat.say.life) cat.say = null; }
    switch (cat.st) {
      case 'sleep':
        cat.x = CUSHION.x; cat.y = CUSHION.y;
        cat.wander -= dt;
        if (cat.wander <= 0) {
          cat.wander = LG.rand(55, 90);
          var pool = custs.filter(function (c) { return c.leaving < 0 && LG.time > c.born; });
          if (pool.length) catVisit(LG.pick(pool));
        }
        break;
      case 'down': case 'up': {
        var j = cat.jump;
        j.t += dt / j.dur;
        var k = Math.min(1, j.t);
        cat.x = lerp(j.x0, j.x1, k);
        cat.y = lerp(j.y0, j.y1, k) - Math.sin(k * Math.PI) * 60;
        cat.dir = j.x1 >= j.x0 ? 1 : -1;
        if (k >= 1) {
          if (cat.st === 'down') {
            cat.st = 'walk';
            cat.path = cat.target && cat.target.leaving < 0 ? route(cat, catSpot(cat.target)) : [];
          } else { cat.st = 'sleep'; cat.cd = 6; }
        }
        break;
      }
      case 'walk': case 'back': {
        if (cat.st === 'walk' && (!cat.target || cat.target.leaving >= 0)) { cat.st = 'back'; cat.path = route(cat, CAT_FLOOR); }
        moveAlong(cat, dt, 230);
        if (!cat.path.length) {
          if (cat.st === 'walk') {
            cat.st = 'sit'; cat.sitT = 5.5;
            cat.dir = cat.target.seat.x >= cat.x ? 1 : -1;
            var tc = cat.target;
            tc.pop = 1;
            sayCust(tc, LG.pick(['Pisi pisi! 🐈', 'Gel bakalım Sarman 😻', 'Kedi bana geldi! 🐈']), 3);
            catSay(LG.pick(['Miyav 💕', 'Mrrr 😽', 'Miyav! 🐾']));
            LG.sfx('heart');
            ui.float('💕', cat.x, cat.y - 70, { size: 34, vy: -80 });
          } else {
            cat.st = 'up';
            cat.jump = { x0: cat.x, y0: cat.y, x1: CUSHION.x, y1: CUSHION.y, t: 0, dur: 0.45 };
          }
        }
        break;
      }
      case 'sit':
        cat.sitT -= dt;
        if (Math.random() < dt * 0.8) ui.float('💕', cat.x + LG.rand(-10, 10), cat.y - 60, { size: 24, vy: -70, life: 1.2 });
        if (cat.sitT <= 0 || !cat.target || cat.target.leaving >= 0) { cat.st = 'back'; cat.path = route(cat, CAT_FLOOR); cat.target = null; }
        break;
    }
  }
  function catOnCounter() { return cat.st === 'sleep' || ((cat.st === 'down' || cat.st === 'up') && cat.y < CUSHION.y + 40); }

  // ===========================================================================
  // Tavla zarları
  // ===========================================================================
  var dice = [];
  function rollDice(c) {
    if (!c || c.leaving >= 0) return;
    var d = c.user.data.cay || (c.user.data.cay = {});
    if (d.diceT && LG.time - d.diceT < 6) return;
    d.diceT = LG.time;
    var t = c.seat.t;
    for (var i = dice.length - 1; i >= 0; i--) if (dice[i].tb === t) dice.splice(i, 1);
    var a = LG.randi(1, 6), b = LG.randi(1, 6);
    dice.push({ tb: t, c: c, a: a, b: b, t: 0, x0: c.seat.x, y0: t.y - 60, x1: t.x + LG.rand(-14, 14), y1: t.y - 2, f1: 1, f2: 1, landed: false });
    if (dice.length > 6) dice.shift();
    LG.sfx('drum');
  }
  function updDice(dt) {
    for (var i = dice.length - 1; i >= 0; i--) {
      var d = dice[i];
      d.t += dt;
      if (d.t < 0.75) { if (Math.random() < 0.5) { d.f1 = LG.randi(1, 6); d.f2 = LG.randi(1, 6); } }
      else if (!d.landed) {
        d.landed = true; d.f1 = d.a; d.f2 = d.b;
        LG.sfx('tick');
        var key = d.a + '-' + d.b, nm = D.DICE_NAMES[key];
        var dbl = d.a === d.b;
        ui.float((nm || (d.a + ' · ' + d.b)) + (d.c.npc ? '' : ''), d.x1, d.y1 - 60, { color: dbl ? '#ffd166' : '#fff3d6', size: dbl ? 40 : 30, life: 1.8 });
        if (dbl) { LG.sfx(d.a === 6 ? 'win' : 'correct'); ui.burst(d.x1, d.y1 - 20, { count: d.a === 6 ? 40 : 18, speed: 380, up: 200 }); }
        if (d.c.leaving < 0 && Math.random() < 0.7 && !d.c.npc) sayCust(d.c, dbl ? LG.pick(['Çift geldi! 🎲', 'Oley, ' + (nm || 'çift') + '!']) : LG.pick(['Hadi bakalım 🎲', 'Zar benden!', 'Bu el benim 😎']), 2.4);
      }
      if (d.t > 4.2 || d.tb.seats.every(function (s) { return !s.c; })) dice.splice(i, 1);
    }
  }

  // ===========================================================================
  // Emekliler (boş kahvehaneyi canlı tutar, kalabalıkta yer açar)
  // ===========================================================================
  var NPCS = D.NPC.map(function (n) {
    return { __lg: true, __npc: true, id: n.id, name: n.name, nick: n.name, emoji: n.emoji, hue: n.hue, color: 'hsl(' + n.hue + ',50%,52%)', avatar: '', data: {} };
  });
  var npcAway = 0, npcTalk = 8;
  function npcCount() { var n = 0; for (var i = 0; i < NPCS.length; i++) if (byId.get(NPCS[i].id)) n++; return n; }
  function npcSit() {
    var order = [2, 1, 0, 5, 4, 3];
    for (var i = 0; i < order.length; i++) {
      var t = tables[order[i]];
      if (!t.shown || t.vip) continue;
      if (t.seats[0].c || t.seats[1].c || t.seats[0].res || t.seats[1].res) continue;
      for (var k = 0; k < 2; k++) {
        var c = makeCust(NPCS[k], t.seats[k], k * 0.3, true);
        c.lvl = 2;
      }
      return true;
    }
    return false;
  }
  function updNpc(dt) {
    var n = npcCount();
    if (n === 0) {
      npcAway += dt;
      if (npcAway > 20 && humans < 14 && countFree() > 8) { if (npcSit()) npcAway = 0; }
    } else {
      npcAway = 0;
      if (humans >= 38) {
        NPCS.forEach(function (u) { var c = byId.get(u.id); if (c) leave(c, 'Gençler oturun, yer var 😊'); });
        return;
      }
      npcTalk -= dt;
      if (npcTalk <= 0) {
        npcTalk = LG.rand(9, 15);
        var c = byId.get(LG.pick(NPCS).id);
        if (c && LG.time > c.born) {
          if (Math.random() < 0.55) { c.user.data.cay = c.user.data.cay || {}; c.user.data.cay.diceT = 0; rollDice(c); }
          sayCust(c, LG.pick(D.NPC_LINES), 3);
        }
      }
    }
  }

  // ===========================================================================
  // İkramlar: ısmarlama, herkese çay, VIP masa, havai fişek
  // ===========================================================================
  var round = null, roundSeq = 0;
  function seatedList(excludeId) {
    var out = [];
    for (var i = 0; i < custs.length; i++) {
      var c = custs[i];
      if (c.leaving < 0 && LG.time >= c.born - 0.5 && (!excludeId || c.user.id !== excludeId)) out.push(c);
    }
    return out;
  }
  function herkese(from, why) {
    var list = seatedList();
    if (!list.length) return false;
    if (round) { round.extra = true; }
    round = { id: ++roundSeq, from: from || null, why: why || 'gift', t: 0, total: 0, done: 0, raised: false };
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.od && c.od.claimed) continue;
      var o = placeOrder(c, teaFor(c), { gift: !!from, from: from, prio: 3, round: round.id, silent: true });
      if (o) round.total++;
    }
    if (from) noteTreat(from, null);
    LG.sfx('fanfare');
    ui.shake(6, 0.3);
    sayW(cayci, LG.pick(['Herkese çay geliyooor! 🫖', 'Çaylar uçuyor!', 'Yetiş çırak!']), 2.4, true);
    return true;
  }
  function raiseAll() {
    var r = round;
    var list = seatedList();
    for (var i = 0; i < list.length; i++) { list[i].raiseT = 2.8 + Math.random() * 0.4; list[i].pop = 1; }
    LG.shuffle(list);
    var n = Math.min(list.length, 6);
    for (var j = 0; j < n; j++) {
      var c = list[j];
      if (r.from && c.user.id === r.from.id) { sayCust(c, 'Afiyet olsun ahali! 🫖', 3); continue; }
      var txt = r.from ? LG.pick(D.THANKS).replace('{n}', r.from.name) : LG.pick(['Sağ ol çaycı! 🫖', 'Eyvallah ocak!', 'Ocağına sağlık! 🫖', 'Var ol çaycı!']);
      sayCust(c, txt, 3.2);
    }
    LG.sfx('clap'); LG.sfx('bell');
    ui.burst(W / 2, ROWS[1], { count: 60, speed: 700, up: 300 });
  }
  function treatRandom(from, n) {
    var cands = seatedList(from.id).filter(function (c) { return !(c.od && c.od.claimed); });
    cands.forEach(function (c) { c._k = (c.drink && c.drink.lv > 0.3 ? 1 : 0) + (c.npc ? 0.5 : 0) + Math.random(); });
    cands.sort(function (a, b) { return a._k - b._k; });
    var picked = cands.slice(0, n);
    var fc = byId.get(from.id);
    if (!picked.length) {
      if (fc) placeOrder(fc, teaFor(fc), { gift: true, prio: 2, silent: true });
      banner(from.name + ': Bir çay da benden! 🫖 Teşekkürler!', { icon: '🌹', user: from, key: 'tr' + from.id });
      return;
    }
    for (var i = 0; i < picked.length; i++) {
      var c = picked[i];
      placeOrder(c, teaFor(c), { gift: true, from: from, prio: 2, silent: true });
      c.glow = 6; c.pop = 1;
      noteTreat(from, c.user);
    }
    var txt = picked.length === 1 ? from.name + ', ' + dat(picked[0].user.name) + ' çay ısmarladı 🫖' : from.name + ', ' + picked.length + ' kişiye çay ısmarladı 🫖';
    banner(txt, { icon: '🫖', user: from, key: 'tr' + from.id, sub: 'BİR ÇAY DA BENDEN!' });
    if (fc) sayCust(fc, 'Bir çay da benden! 🫖', 2.6);
    LG.sfx('heart');
  }
  function freeTreat(c) {
    var d = c.user.data.cay;
    if (d.benT && LG.time - d.benT < 60) { sayCust(c, 'Çay benden! 🫖', 2); return; }
    d.benT = LG.time;
    var mates = c.seat.t.seats.map(function (s) { return s.c; }).filter(function (x) { return x && x !== c && x.leaving < 0; });
    if (!mates.length) {
      var all = seatedList(c.user.id);
      if (all.length) mates = [LG.pick(all)];
    }
    if (!mates.length) { placeOrder(c, teaFor(c), {}); return; }
    for (var i = 0; i < mates.length; i++) {
      var m = mates[i];
      if (m.od && m.od.claimed) continue;
      placeOrder(m, teaFor(m), { from: c.user, prio: 1, silent: true });
      m.glow = 4;
      noteTreat(c.user, m.user);
    }
    sayCust(c, 'Çaylar benden! 🫖', 2.6);
    banner(mates.length === 1 ? c.user.name + ', ' + dat(mates[0].user.name) + ' çay ısmarladı 🫖' : c.user.name + ' masaya çay ısmarladı 🫖', { icon: '🤝', user: c.user, small: true });
    LG.sfx('heart');
  }
  var vips = [];
  var VIP_SLOTS = [3, 0, 6, 4, 5, 9];
  function makeVip(u) {
    var ex = null;
    for (var i = 0; i < vips.length; i++) if (vips[i].user.id === u.id) ex = vips[i];
    var t;
    if (ex) t = ex.table;
    else {
      for (var j = 0; j < VIP_SLOTS.length && !t; j++) if (!tables[VIP_SLOTS[j]].vip) t = tables[VIP_SLOTS[j]];
      if (!t) {
        var old = vips.shift();
        t = old.table; t.seats[0].res = null; t.vip = null;
        var oc = byId.get(old.user.id); if (oc) { oc.vip = false; refreshTag(oc); }
      }
      if (!t.shown) { t.shown = true; t.showT = 0; }
      t.vip = { user: u, label: '👑 ' + gen(shortName(u.name, 14)) + ' masası', t: LG.time };
      vips.push({ user: u, table: t });
    }
    var s0 = t.seats[0];
    s0.res = u.id;
    var c = byId.get(u.id);
    if (s0.c && s0.c !== c) relocate(s0.c);
    if (c && c.seat !== s0) {
      if (c.seat.c === c) c.seat.c = null;
      c.seat = s0; s0.c = c; c.born = LG.time;
    } else if (!c) {
      c = makeCust(u, s0, 0, false);
      arrive(c, false);
    }
    c.vip = true; c.glow = 8; refreshTag(c);
    // masadaki misafirlere de çay
    for (var k = 1; k < 4; k++) { var g = t.seats[k].c; if (g && g.leaving < 0) { g.glow = 5; placeOrder(g, teaFor(g), { gift: true, from: u, prio: 3, silent: true }); } }
    placeOrder(c, DEF_KAHVE, { gift: true, prio: 4, silent: true });
    ui.burst(t.x, t.y - 30, { count: 70, speed: 600, up: 300, colors: ['#ffd400', '#fff3b0', '#ffb300', '#ffffff'] });
    return t;
  }
  var rockets = [];
  function fireworks(n) {
    for (var i = 0; i < n; i++) {
      rockets.push({ x: LG.rand(140, 940), y: 1300, vy: -LG.rand(1050, 1350), ty: LG.rand(250, 640), delay: i * LG.rand(0.18, 0.4), col: LG.pick(['#ffd166', '#ff4d6d', '#4cc9f0', '#06d6a0', '#b388ff', '#ff9f1c']), trail: [] });
    }
  }
  function updRockets(dt) {
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      if (r.delay > 0) { r.delay -= dt; continue; }
      r.trail.push(r.x, r.y);
      if (r.trail.length > 12) r.trail.splice(0, 2);
      r.y += r.vy * dt; r.vy += 380 * dt; r.x += Math.sin(r.y * 0.02) * 0.6;
      if (r.y <= r.ty || r.vy >= -80) {
        ui.burst(r.x, r.y, { count: 46, shape: 'circle', speed: 440, up: 0, gravity: 230, life: 1.4, size: 11, colors: [r.col, '#ffffff', '#fff3b0'] });
        LG.sfx('boom');
        rockets.splice(i, 1);
      }
    }
  }

  // ===========================================================================
  // GÜNÜN SOHBETİ
  // ===========================================================================
  var topic = { st: 'idle', next: 40, used: [], q: '', A: null, B: null, va: 0, vb: 0, voters: new Map(), t0: 0, res: null, resT: 0, show: 0.5, fade: 1, last: null };
  function startTopic() {
    var idx = 0, tries = 0;
    do { idx = LG.randi(0, D.TOPICS.length - 1); } while (topic.used.indexOf(idx) >= 0 && tries++ < 40);
    topic.used.push(idx);
    if (topic.used.length > 20) topic.used.shift();
    var T = D.TOPICS[idx];
    topic.q = T[0];
    topic.A = { label: T[1][0], words: T[1].slice(1), say: T[1][1] };
    topic.B = { label: T[2][0], words: T[2].slice(1), say: T[2][1] };
    topic.va = 0; topic.vb = 0; topic.voters.clear(); topic.show = 0.5;
    topic.st = 'vote'; topic.t0 = LG.time; topic.fade = 0; topic.res = null;
    LG.sfx('bell');
    banner('GÜNÜN SOHBETİ: ' + topic.q, { icon: '🗣️', sub: topic.A.say + ' ' + qmi(topic.A.say) + ', ' + topic.B.say + ' ' + qmi(topic.B.say) + '? Yaz bakalım!', big: true });
    sayW(cayci, 'Hadi bakalım, ne diyorsunuz? 😄', 2.6, true);
  }
  function tryVote(u, text) {
    var ha = LG.cmd.has(text, topic.A.words), hb = LG.cmd.has(text, topic.B.words);
    if (ha === hb) return null;
    var side = ha ? 'a' : 'b';
    var prev = topic.voters.get(u.id);
    if (prev === side) return side;
    if (prev === 'a') topic.va--; else if (prev === 'b') topic.vb--;
    topic.voters.set(u.id, side);
    if (side === 'a') topic.va++; else topic.vb++;
    voteFx(u, side);
    return side;
  }
  var voteFxBudget = 6;
  function voteFx(u, side) {
    if (voteFxBudget < 1) return;
    voteFxBudget--;
    var B = boardRect();
    var c = byId.get(u.id);
    var x = side === 'a' ? B.x + 90 : B.x + B.w - 90;
    ui.float('+1', x + LG.rand(-30, 30), B.y + 112, { color: side === 'a' ? '#ffb09a' : '#9fdcff', size: 30, vy: -60, life: 0.9 });
    if (c) c.pop = 1;
  }
  function endTopic() {
    if (topic.st !== 'vote') return;
    var tot = topic.va + topic.vb;
    var win = topic.va === topic.vb ? null : topic.va > topic.vb ? 'a' : 'b';
    topic.res = {
      win: win, tot: tot,
      pct: tot ? Math.round(Math.max(topic.va, topic.vb) / tot * 100) : 0,
      quip: tot === 0 ? 'Kimse oy vermedi, çaylar soğumasın! 😄' : win ? LG.pick(D.RESULT_QUIPS) : 'Berabere! Çaylar tazelensin 😄',
    };
    topic.st = 'result'; topic.resT = 0; topic.fade = 0;
    topicsDone++;
    var B = boardRect();
    if (tot > 0) {
      LG.sfx('win');
      ui.burst(B.x + B.w / 2, B.y + B.h / 2, { count: 80, speed: 700, up: 260 });
      var wl = win ? (win === 'a' ? topic.A.label : topic.B.label) : null;
      banner(win ? 'Kahvehane kararını verdi: ' + upTR(wl) + '! (%' + topic.res.pct + ')' : 'Sohbet berabere bitti! 🤝', { icon: '🏆', big: true });
      if (win) {
        topic.voters.forEach(function (side, id) {
          if (side !== win) return;
          var c = byId.get(id);
          if (c && c.leaving < 0) { c.raiseT = 2.4; c.pop = 1; }
        });
      }
      topic.last = { q: topic.q, win: wl, pct: topic.res.pct };
    }
  }
  function boardRect() { return BOARD_ALT || L.BOARD; }

  // ===========================================================================
  // Teşekkür şeridi ve büyük kartlar
  // ===========================================================================
  var ribQ = [], rib = null;
  function banner(text, o) {
    o = o || {};
    if (o.key) {
      for (var i = 0; i < ribQ.length; i++) if (ribQ[i].key === o.key) { ribQ[i].text = text; return; }
      if (rib && rib.key === o.key && rib.t < rib.dur - 0.8) { rib.text = text; rib.t = Math.min(rib.t, 0.4); return; }
    }
    ribQ.push({ text: text, sub: o.sub || '', icon: o.icon || '🫖', user: o.user || null, big: !!o.big, small: !!o.small, key: o.key || null, t: 0, dur: o.dur || (o.big ? 3.8 : o.small ? 2.4 : 3.2) });
    if (ribQ.length > 8) {
      for (var j = 0; j < ribQ.length; j++) if (!ribQ[j].big) { ribQ.splice(j, 1); break; }
      if (ribQ.length > 8) ribQ.shift();
    }
  }
  var cardQ = [], card = null;
  function bigCard(o) {
    if (cardQ.length > 4) cardQ.shift();
    cardQ.push({ title: o.title, sub: o.sub || '', user: o.user || null, icon: o.icon || '🫖', mega: !!o.mega, t: 0, dur: o.dur || (o.mega ? 5.5 : 3.4) });
  }

  // ===========================================================================
  // Görsel efektler: buhar, ter, notalar, ışık
  // ===========================================================================
  var steam = [], sweat = [], notes = [];
  function puffAt(x, y, n, sz) {
    for (var i = 0; i < n && steam.length < 100; i++) {
      steam.push({ x: x + LG.rand(-6, 6), y: y, vx: LG.rand(-10, 10), vy: LG.rand(-55, -30), t: 0, life: LG.rand(1.6, 2.6), s0: (sz || 1) * LG.rand(14, 22), s1: (sz || 1) * LG.rand(40, 60) });
    }
  }
  function sweatDrop(w) {
    if (sweat.length > 40) return;
    sweat.push({ x: w.x - w.face * 6, y: w.y - 136 * w.s, vx: -w.face * LG.rand(60, 160) + LG.rand(-40, 40), vy: LG.rand(-260, -140), t: 0 });
  }

  // ===========================================================================
  // Durum
  // ===========================================================================
  var likeHeat = 0, likeRate = 0, speedFrac = 0, speedMul = 1, needle = 0;
  var likeGoal = { v: 0, target: 3000 };
  var heartBudget = 8;
  var teaBump = 0;
  var megaT = 0, partyT = 0, musicBackT = 0;
  var summ = null;

  // ===========================================================================
  // Olaylar
  // ===========================================================================
  var BEN_WORDS = ['ben ablayım', 'ben ablayim', 'ben abla', 'ben ağayım', 'ben agayim', 'ben ağa', 'ben aga'];
  var HERZAMAN = ['her zamanki', 'her zamankinden', 'her zamankini', 'her zamankisi', 'hep aynısı'];

  LG.on('chat', function (e) {
    var u = e.user;
    if (!u) return;
    var r = recOf(u);
    var before = lvlOf(r);
    r.c++;
    if (!isSimUser(u)) dirty = true;
    act(u, 'c');
    var text = e.raw || '';
    if (before >= 2 && LG.cmd.has(text, BEN_WORDS)) r.p = LG.cmd.has(text, ['ben ablayım', 'ben ablayim', 'ben abla']) ? 'abla' : 'aga';
    if (topic.st === 'vote') tryVote(u, text);

    if (LG.cmd.has(text, D.WORDS.hesap)) {
      var lc = byId.get(u.id);
      if (lc) payAndLeave(lc);
      return;
    }
    var def = findOrder(text);
    if (!def && LG.cmd.has(text, HERZAMAN)) def = favOf(r);
    var c = seatUser(u, { isNew: e.isNew });
    if (!c) { if (def) u.data.cay.pend = def; return; }
    c.last = LG.time; c.activeT = LG.time;
    var after = lvlOf(r);
    if (after > before && !c.npc) levelUp(c, after);

    var treat = LG.cmd.has(text, D.WORDS.benden);
    if (treat) freeTreat(c);
    else if (def) placeOrder(c, def, { label: orderLabel(def, text) });
    if (LG.cmd.has(text, D.WORDS.tavla)) rollDice(c);
    if (LG.cmd.has(text, D.WORDS.pisi)) catVisit(c);

    var words = (e.norm || '').split(' ').length;
    var orderOnly = (def || treat) && words <= 3;
    if (!e.flagged && e.text && !orderOnly) sayCust(c, e.text, 4.6);
  });

  function levelUp(c, lvl) {
    c.lvl = lvl; refreshTag(c);
    c.pop = 1; c.glow = 3;
    var t = titleOf(recOf(c.user));
    sayCust(c, '🎉 Artık ' + t + '!', 3.5, { bg: '#fff2c4' });
    banner(c.user.name + ' artık ' + t + '! ' + (lvl >= 2 ? '👑' : '☕'), { icon: '🎉', small: true });
    LG.sfx('levelup');
    ui.burst(c.seat.x, c.seat.t.y - 70, { count: 26, speed: 380, up: 180 });
  }

  LG.on('like', function (e) {
    likeHeat += e.count;
    likeGoal.v += e.count;
    var c = e.user && byId.get(e.user.id);
    if (c) {
      c.last = LG.time;
      if (heartBudget >= 1) {
        heartBudget--;
        ui.float('❤', c.seat.x + LG.rand(-12, 12), c.seat.t.y - (c.seat.side === 'back' ? 92 : 80), { color: '#ff4d6d', size: 30, vy: -110, life: 1.1 });
      }
    }
    if (likeGoal.v >= likeGoal.target) {
      likeGoal.v = 0;
      likeGoal.target = Math.min(30000, Math.round(likeGoal.target * 1.35 / 100) * 100);
      if (herkese(null, 'like')) {
        bigCard({ title: 'BEĞENİLER DOLDU!', sub: 'Ocaktan herkese çay! Sağ olun ❤️', icon: '❤️' });
      }
    }
  });

  LG.on('gift', function (e) {
    var u = e.user, g = e.gift;
    if (!u || !g) return;
    var tier = g.tier;
    var isTea = LG.giftIs(g, ['çay', 'tea']);
    var isCoffee = LG.giftIs(g, ['türk kahvesi', 'turkish coffee', 'kahve', 'coffee']);
    if (isTea && tier < 3) tier = 3;
    recOf(u);
    var c = seatUser(u, { isNew: e.isNew });
    if (c) { c.last = LG.time; c.activeT = LG.time; c.pop = 1; }
    var gEmoji = LG.giftEmoji(g);
    // Not: LG.ui.spotlightAllowed yumuşak sınırı bu hediyeyi de sayarak kontrol ediyor (10.000+ tek hediye hep "sınır aşıldı" olur).
    // Bu yüzden kontrol sırasında bu hediyenin jetonunu geçici olarak düşüyoruz; sonraki hediyelerde sınır yine işler.
    var savedCoins = u.coins;
    u.coins = Math.max(0, u.coins - (g.total || 0));
    var spotOk = tier < 3 || ui.spotlightAllowed(u, tier);
    u.coins = savedCoins;
    if (!spotOk) {
      // Aynı kişiden art arda büyük hediye: ekranı tekellemeden sade teşekkür
      treatRandom(u, Math.min(3, g.count));
      banner(u.name + ', çok teşekkürler! 💖', { icon: gEmoji, user: u, key: 'ty' + u.id, small: true });
      return;
    }
    var name = u.name;
    if (tier >= 6) {
      makeVip(u);
      herkese(u, 'gift');
      simitAll(u);
      megaT = 12; partyT = 16;
      fireworks(16);
      ui.rain({ count: 200 }); ui.flash('#fff3c0', 0.5); ui.shake(18, 0.7);
      LG.sfx('mega');
      playParty(18);
      cat.dance = 16;
      bigCard({ title: 'Bugün kahvehane ' + abl(name) + '!', sub: 'Herkese çay + simit! Sağ ol ' + name + ' 💖', user: u, icon: gEmoji, mega: true, dur: 6.5 });
    } else if (tier >= 5) {
      var t = makeVip(u);
      herkese(u, 'gift');
      fireworks(9);
      partyT = 8;
      ui.shake(12, 0.5);
      LG.sfx('mega');
      bigCard({ title: gen(name) + ' masası açıldı!', sub: 'Altın masa bu akşam senin 👑 Herkese çay! Teşekkürler 💖', user: u, icon: gEmoji, mega: true });
      if (t) ui.float('👑 VIP', t.x, t.y - 120, { color: '#ffd400', size: 44 });
    } else if (tier >= 4) {
      herkese(u, 'gift');
      simitAll(u);
      playParty(16);
      cat.dance = 14; partyT = 6;
      bigCard({ title: 'SİMİT + ÇAY İKRAMI!', sub: name + ' ikram ediyor · Saz çalsın! 🎶 Teşekkürler 💖', user: u, icon: gEmoji });
    } else if (tier >= 3) {
      herkese(u, 'gift');
      bigCard({ title: isTea ? 'HERKESE ÇAY BENDEN! 🫖' : 'HERKESE ÇAY BENDEN!', sub: name + ' ısmarladı · Sağ ol ' + name + '! 💖', user: u, icon: gEmoji });
    } else if (tier >= 2) {
      if (c) placeOrder(c, DEF_KAHVE, { gift: true, prio: 4, silent: true, label: '1 kahve' });
      if (c) c.glow = 5;
      banner(isCoffee ? name + ', Türk kahveni aldık! Lokumu da yanında ☕' : name + ', sana bir Türk kahvesi + lokum! ☕', { icon: gEmoji, user: u, key: 'k' + u.id, sub: 'Teşekkürler 💖' });
      LG.sfx('coin');
    } else {
      treatRandom(u, Math.min(5, g.count));
      LG.sfx('coin');
    }
  });

  LG.on('follow', function (e) {
    var u = e.user;
    if (!u) return;
    recOf(u);
    var c = seatUser(u, {});
    if (c) placeOrder(c, teaFor(c), { prio: 1, silent: true, label: 'ocaktan çay' });
    banner(u.name + ' takip etti — ocaktan bir çay! 🫖', { icon: '➕', user: u, small: true });
    LG.sfx('heart');
  });
  LG.on('share', function (e) {
    var u = e.user;
    if (!u) return;
    recOf(u);
    var c = seatUser(u, {});
    if (c) placeOrder(c, DEF_SIMIT, { prio: 1, silent: true, label: 'simit ikramı' });
    banner(u.name + ' paylaştı — simitçiden simit! 🥯', { icon: '↗️', user: u, small: true });
  });

  function playParty(sec) {
    if (LG.config.music) { LG.music.play('halay'); musicBackT = sec; }
    partyT = Math.max(partyT, sec);
  }

  // ===========================================================================
  // Sunucu kısayolları
  // ===========================================================================
  LG.onKey('n', 'Yeni sohbet konusu (GÜNÜN SOHBETİ)', function () {
    if (summ) return;
    startTopic();
  });
  LG.onKey('b', 'Sohbet oylamasını bitir, sonucu göster', function () { endTopic(); });
  LG.onKey('t', 'Ocaktan herkese çay (sunucu ikramı)', function () {
    if (herkese(null, 'host')) bigCard({ title: 'OCAKTAN HERKESE ÇAY!', sub: 'Bu çaylar ocaktan, afiyet olsun! 🫖', icon: '🫖' });
    else banner('Önce birileri otursun, çaylar hazır! 🫖', { icon: '🫖', small: true });
  });
  LG.onKey('k', 'Günü kapat (özet kartı) / yeni gün', function () {
    if (summ) closeSummary(); else openSummary();
  });

  function openSummary() {
    var acts = Array.from(dayAct.values()).sort(function (a, b) { return (b.c + b.o * 2) - (a.c + a.o * 2); }).slice(0, 5);
    var tr = Array.from(treats.values()).sort(function (a, b) { return b.n - a.n; })[0] || null;
    var pr = Array.from(pairs.values()).sort(function (a, b) { return b.n - a.n; })[0] || null;
    summ = { t: 0, tea: day.tea, items: Object.assign({}, dayItems), acts: acts, tr: tr, pr: pr, topics: topicsDone, last: topic.last, people: dayAct.size };
    LG.sfx('fanfare');
  }
  function closeSummary() {
    summ = null;
    day.tea = 0; dirty = true; save();
    dayItems = {}; dayAct.clear(); treats.clear(); pairs.clear(); topicsDone = 0;
    banner('Yeni gün! Ocak yeniden yandı, çaylar taze 🫖', { icon: '☀️', big: true });
    LG.sfx('levelup');
  }

  // ===========================================================================
  // Simülatör yorumları
  // ===========================================================================
  var SIM_TEA = ['çay', 'çay', 'bir çay', 'çay ver', 'demli', 'açık', 'çay lütfen', 'demli bir çay', 'çaycı bir çay', 'açık olsun', 'bir demli çay alayım', 'çayy'];
  var SIM_OTHER = ['kahve', 'oralet', 'su', 'simit', 'tost', 'ayran', 'türk kahvesi', 'simit var mı', 'bir oralet', 'soda', 'sade kahve', 'salep', 'şekerli kahve', 'ıhlamur'];
  LG.sim.comments = SIM_TEA.map(function (t) { return [t, 3]; }).concat(SIM_OTHER.map(function (t) { return [t, 1]; }));
  LG.sim.genComment = function () {
    if (topic.st === 'vote' && Math.random() < 0.4) {
      var side = Math.random() < (topic.bias || (topic.bias = LG.rand(0.3, 0.7))) ? topic.A : topic.B;
      return Math.random() < 0.75 ? LG.pick(side.words) : side.say + ' tabii ki';
    }
    if (topic.st !== 'vote') topic.bias = 0;
    var r = Math.random();
    if (r < 0.30) return LG.pick(SIM_TEA);
    if (r < 0.46) return LG.pick(SIM_OTHER);
    if (r < 0.50) return LG.pick(['hesap', 'hesap lütfen', 'iyi geceler', 'görüşürüz']);
    if (r < 0.54) return LG.pick(['tavla', 'zar at', 'tavla oynayalım']);
    if (r < 0.57) return LG.pick(['pisi pisi', 'kedi', 'miyav']);
    if (r < 0.59) return 'çay benden';
    if (r < 0.61) return 'her zamanki';
    if (r < 0.93) return LG.pick(D.CHATTER);
    return LG.pick(['selam', 'merhaba', 'iyi yayınlar', '😂😂😂', 'harika', '❤️❤️', 'ben de geldim', 'hello from Germany']);
  };

  // ===========================================================================
  // Güncelleme
  // ===========================================================================
  function update(dt) {
    // beğeni → hız
    likeHeat *= Math.exp(-dt / 3);
    likeRate = likeHeat / 3;
    speedFrac = clamp(likeRate / 45, 0, 1);
    speedMul = 1 + 1.7 * speedFrac;
    needle += (speedFrac - needle) * Math.min(1, dt * 3);
    heartBudget = Math.min(8, heartBudget + dt * 8);
    voteFxBudget = Math.min(6, voteFxBudget + dt * 6);
    if (teaBump > 0) teaBump = Math.max(0, teaBump - dt * 3);
    if (megaT > 0) megaT -= dt;
    if (partyT > 0) partyT -= dt;
    if (musicBackT > 0) { musicBackT -= dt; if (musicBackT <= 0 && LG.config.music) LG.music.play('chill'); }
    if (summ) { summ.t += dt; if (summ.t > 40) closeSummary(); }

    // sohbet konusu
    topic.fade = Math.min(1, topic.fade + dt * 3);
    if (topic.st === 'idle' && LG.time >= topic.next && !summ) startTopic();
    else if (topic.st === 'vote') {
      var tot = topic.va + topic.vb;
      topic.show += ((tot ? topic.va / tot : 0.5) - topic.show) * Math.min(1, dt * 4);
      if (LG.time - topic.t0 >= VOTE_DUR) endTopic();
    } else if (topic.st === 'result') {
      topic.resT += dt;
      if (topic.resT >= RESULT_DUR) { topic.st = 'idle'; topic.next = LG.time + TOPIC_GAP; topic.fade = 0; }
    }

    // masalar
    var free = 0;
    for (var ti = 0; ti < tables.length; ti++) {
      var tb = tables[ti];
      if (tb.shown) { tb.showT += dt; for (var sj = 0; sj < 4; sj++) if (!tb.seats[sj].c && !tb.seats[sj].res) free++; }
    }
    revealCD -= dt;
    if (free < 2 && revealCD <= 0) { if (revealTable()) revealCD = 0.6; }

    // müşteriler
    humans = 0;
    for (var i = custs.length - 1; i >= 0; i--) {
      var c = custs[i];
      if (c.leaving >= 0) {
        c.leaving += dt;
        if (c.leaving > LEAVE_DUR) { custs.splice(i, 1); var ci = chatList.indexOf(c); if (ci >= 0) chatList.splice(ci, 1); }
        continue;
      }
      if (!c.npc) humans++;
      if (c.pop > 0) c.pop = Math.max(0, c.pop - dt / 0.35);
      if (c.glow > 0) c.glow -= dt;
      if (c.raiseT > 0) c.raiseT -= dt;
      if (c.bub && LG.time - c.bub.t > c.bub.life) { c.bub = null; var bi = chatList.indexOf(c); if (bi >= 0) chatList.splice(bi, 1); }
      var dk = c.drink;
      if (dk) {
        if (dk.lv > 0) {
          if (c.sipT > 0) {
            var before = c.sipT;
            c.sipT -= dt;
            if (before > 0.5 && c.sipT <= 0.5) { dk.lv = Math.max(0, dk.lv - 0.25); if (dk.lv < 0.02) dk.lv = 0; }
          } else if (c.raiseT <= 0) {
            c.nextSip -= dt;
            if (c.nextSip <= 0) { c.sipT = 1.0; c.nextSip = LG.rand(4.5, 8.5); }
          }
          var hot = dk.kind === 'cay' || dk.kind === 'kahve' || dk.kind === 'oralet' || dk.kind === 'salep' || dk.kind === 'ihlamur';
          if (hot && LG.time - dk.t < 22 && Math.random() < dt * 0.9) puffAt(c.seat.dx, c.seat.dy - 40, 1, 0.55);
        } else {
          dk.emptyT += dt;
          if (dk.emptyT > 30) c.drink = null;
        }
      }
      var fd = c.food;
      if (fd) {
        if (fd.lv > 0) {
          c.nextEat -= dt;
          if (c.nextEat <= 0) { c.nextEat = LG.rand(4, 7); fd.lv = Math.max(0, fd.lv - 0.25); if (fd.lv < 0.05) fd.lv = 0; }
        } else { fd.emptyT += dt; if (fd.emptyT > 3) c.food = null; }
      }
      if (c.falAt && LG.time >= c.falAt) {
        c.falAt = 0;
        sayCust(c, LG.pick(D.FAL), 4.5, { name: '🔮 Fincanında', bg: '#f6ecff', nameColor: '#6a3d9a', maxW: 460 });
      }
      if (!c.npc && !c.vip && LG.time - c.last > IDLE_LEAVE) leave(c, 'Hesap! İyi akşamlar 👋');
    }

    // kapıda bekleyenler
    doorTimer -= dt;
    if (doorQ.length && doorTimer <= 0) {
      var du = doorQ[doorQ.length - 1];
      if (byId.get(du.id) || seatUser(du, { door: true })) { var dqi = doorQ.indexOf(du); if (dqi >= 0) doorQ.splice(dqi, 1); doorTimer = 0.2; }
      else doorTimer = 0.5;
    }

    // siparişler
    availCount = 0;
    for (var oi = 0; oi < orders.length; oi++) {
      var o = orders[oi];
      if (!o.claimed && o.by === 'cayci' && o.c.leaving < 0 && LG.time >= o.c.born) availCount++;
    }
    updWaiter(cayci, dt);
    updWaiter(cirak, dt);
    updSimitci(dt);
    updCat(dt);
    updDice(dt);
    updNpc(dt);
    updRockets(dt);

    // herkese çay turu
    if (round) {
      round.t += dt;
      var pending = 0;
      for (var ri = 0; ri < orders.length; ri++) if (orders[ri].round === round.id) pending++;
      for (var fi = 0; fi < flying.length; fi++) if (flying[fi].o.round === round.id) pending++;
      if (!round.raised && (pending === 0 || round.t > 11)) { round.raised = true; raiseAll(); }
      if (round.raised && round.t > 14) round = null;
    }

    // uçan ikramlar
    for (var f = flying.length - 1; f >= 0; f--) {
      var fl = flying[f];
      fl.t += dt;
      if (fl.t >= fl.dur) {
        flying.splice(f, 1);
        if (fl.o.c.leaving < 0) give(fl.o);
        else { removeOrder(fl.o); puffAt(fl.x1, fl.y1 - 10, 2); }
      }
    }
    // buhar
    var steamRate = 2.5 + speedFrac * 14 + (round ? 6 : 0);
    if (Math.random() < dt * steamRate) puffAt(SEMA.x + LG.rand(-6, 6), SEMA.y - 162 * SEMA.s, 1, 1 + speedFrac * 0.5);
    if (Math.random() < dt * steamRate * 0.4) puffAt(SEMA.x - 40 * SEMA.s, SEMA.y - 152 * SEMA.s, 1, 0.7);
    for (var s = steam.length - 1; s >= 0; s--) {
      var p = steam[s];
      p.t += dt; if (p.t >= p.life) { steam.splice(s, 1); continue; }
      p.x += (p.vx + Math.sin(p.t * 2 + p.y * 0.01) * 12) * dt; p.y += p.vy * dt; p.vy *= 0.995;
    }
    for (var sw = sweat.length - 1; sw >= 0; sw--) {
      var d = sweat[sw];
      d.t += dt; d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.t > 0.9) sweat.splice(sw, 1);
    }
    // radyodan notalar
    var noteRate = partyT > 0 ? 3.2 : 0.6;
    if (Math.random() < dt * noteRate && notes.length < 24) notes.push({ x: RADIO.x + LG.rand(-14, 14), y: RADIO.y, t: 0, life: LG.rand(1.8, 2.6), ch: LG.pick(['♪', '♫', '♬']), sw: LG.rand(0, 6) });
    for (var ni = notes.length - 1; ni >= 0; ni--) { var nt = notes[ni]; nt.t += dt; nt.y -= 48 * dt; if (nt.t > nt.life) notes.splice(ni, 1); }

    // şerit + kartlar
    if (!rib && ribQ.length) { rib = ribQ.shift(); rib.t = 0; if (ribQ.length > 3) rib.dur *= 0.6; }
    if (rib) { rib.t += dt; if (rib.t >= rib.dur) rib = null; }
    if (!card && cardQ.length) { card = cardQ.shift(); card.t = 0; }
    if (card) { card.t += dt; if (card.t >= card.dur) card = null; }

    // kayıt
    saveT += dt;
    if (saveT > 8) { saveT = 0; save(); }
  }

  // ===========================================================================
  // Çizim
  // ===========================================================================
  var AN = { a: 1, s: 1, dy: 0, bob: 0 };
  function custAnim(c) {
    var age = LG.time - c.born;
    if (age < 0) return null;
    var s = age < 0.45 ? 0.3 + 0.7 * LG.ease.outBack(age / 0.45) : 1;
    var a = age < 0.15 ? age / 0.15 : 1, dy = 0;
    if (c.leaving >= 0) { var k = Math.min(1, c.leaving / LEAVE_DUR); a *= 1 - k; dy = -26 * k; }
    if (c.pop > 0) s *= 1 + Math.sin(c.pop * Math.PI) * 0.12;
    var bob = 0;
    if (megaT > 0 || (partyT > 0 && c.raiseT <= 0)) bob = -Math.abs(Math.sin(LG.time * 8 + c.ph)) * 9;
    AN.a = a; AN.s = s; AN.dy = dy; AN.bob = bob;
    return AN;
  }
  function liftedItem(g, it, x, y) {
    if (!it) { A.teaGlass(g, x, y, 1.0, A.TEA.normal, 1, false); return; }
    var k = it.kind;
    if (k === 'cay' || k === 'oralet' || k === 'ihlamur') A.teaGlass(g, x, y, 1.0, k === 'oralet' ? A.TEA.portakal : k === 'ihlamur' ? A.TEA.ihlamur : (A.TEA[it.v] || A.TEA.normal), Math.max(0.15, it.lv), false);
    else A.item(g, k, it.v, x, y, 0.95, Math.max(0.15, it.lv));
  }
  function drawGlow(g, x, y, sz, a) {
    if (a <= 0) return;
    g.save(); g.globalAlpha *= Math.min(1, a); g.globalCompositeOperation = 'lighter';
    g.drawImage(A.goldGlow, x - sz / 2, y - sz / 2, sz, sz);
    g.restore();
  }
  function drawBackCust(g, c) {
    var an = custAnim(c);
    if (!an) return;
    var s = c.seat, y = s.t.y;
    g.save();
    g.globalAlpha = an.a;
    g.translate(s.x, y + an.dy);
    if (an.s !== 1) { g.translate(0, -30); g.scale(an.s, an.s); g.translate(0, 30); }
    var bob = an.bob;
    var gl = c.vip ? 0.55 + Math.sin(LG.time * 3) * 0.15 : 0;
    if (c.glow > 0) gl = Math.max(gl, Math.min(1, c.glow) * (0.7 + Math.sin(LG.time * 8) * 0.3));
    if (gl > 0) drawGlow(g, 0, -62 + bob, 136, gl);
    g.fillStyle = c.shirt;
    ui.roundRect(g, -20, -52 + bob, 40, 52, 14); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.2)';
    g.beginPath(); g.moveTo(-7, -52 + bob); g.lineTo(0, -41 + bob); g.lineTo(7, -52 + bob); g.closePath(); g.fill();
    g.strokeStyle = c.shirt; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath();
    var holding = null;
    if (c.raiseT > 0) {
      var lift = Math.min(1, (3 - c.raiseT) * 4);
      g.moveTo(-14, -44 + bob); g.lineTo(-19, -10);
      g.moveTo(14, -44 + bob); g.lineTo(24, lerp(-20, -84, lift) + bob);
      holding = { x: 25, y: lerp(-14, -78, lift) + bob };
    } else if (c.sipT > 0 && c.drink) {
      var k = Math.sin(Math.PI * clamp(1 - c.sipT, 0, 1));
      g.moveTo(-14, -44 + bob); g.lineTo(-19, -10);
      g.moveTo(14, -44 + bob); g.lineTo(lerp(18, 14, k), lerp(-12, -60, k) + bob);
      holding = { x: lerp(18, 13, k), y: lerp(-6, -54, k) + bob };
    } else {
      g.moveTo(-14, -44 + bob); g.lineTo(-20, -8);
      g.moveTo(14, -44 + bob); g.lineTo(20, -8);
    }
    g.stroke();
    g.drawImage(A.avatar(c.user), -24, -90 + bob, 48, 48);
    if (c.lvl >= 1) A.kasket(g, 0, -66 + bob, 22, c.lvl >= 2);
    if (holding) liftedItem(g, c.raiseT > 0 ? (c.drink || null) : c.drink, holding.x, holding.y);
    g.restore();
  }
  function drawSideCust(g, c) {
    var an = custAnim(c);
    if (!an) return;
    var s = c.seat, y = s.t.y, dir = s.side === 'left' ? 1 : -1;
    g.save();
    g.globalAlpha = an.a;
    g.translate(s.x, y + an.dy);
    if (an.s !== 1) { g.translate(0, -20); g.scale(an.s, an.s); g.translate(0, 20); }
    var bob = an.bob;
    var gl = c.vip ? 0.55 : 0;
    if (c.glow > 0) gl = Math.max(gl, Math.min(1, c.glow) * (0.7 + Math.sin(LG.time * 8) * 0.3));
    if (gl > 0) drawGlow(g, 0, -50 + bob, 128, gl);
    // bacaklar
    g.strokeStyle = '#2b2b36'; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-6, 10); g.lineTo(-6 + dir * 10, 36); g.moveTo(6, 10); g.lineTo(6 + dir * 10, 36); g.stroke();
    g.fillStyle = c.shirt;
    ui.roundRect(g, -18, -32 + bob, 36, 46, 13); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath(); g.moveTo(-6, -32 + bob); g.lineTo(0, -22 + bob); g.lineTo(6, -32 + bob); g.closePath(); g.fill();
    g.strokeStyle = c.shirt; g.lineWidth = 9;
    g.beginPath();
    var holding = null;
    if (c.raiseT > 0) {
      var lift = Math.min(1, (3 - c.raiseT) * 4);
      g.moveTo(-dir * 13, -24 + bob); g.lineTo(-dir * 16, 6);
      g.moveTo(dir * 13, -24 + bob); g.lineTo(dir * 24, lerp(-4, -66, lift) + bob);
      holding = { x: dir * 25, y: lerp(2, -60, lift) + bob };
    } else if (c.sipT > 0 && c.drink) {
      var k = Math.sin(Math.PI * clamp(1 - c.sipT, 0, 1));
      g.moveTo(-dir * 13, -24 + bob); g.lineTo(-dir * 16, 6);
      g.moveTo(dir * 13, -24 + bob); g.lineTo(dir * lerp(26, 14, k), lerp(0, -40, k) + bob);
      holding = { x: dir * lerp(28, 14, k), y: lerp(6, -34, k) + bob };
    } else {
      g.moveTo(-dir * 13, -24 + bob); g.lineTo(-dir * 16, 6);
      g.moveTo(dir * 13, -24 + bob); g.lineTo(dir * 32, -4);
    }
    g.stroke();
    g.drawImage(A.avatar(c.user), -23, -77 + bob, 46, 46);
    if (c.lvl >= 1) A.kasket(g, 0, -54 + bob, 21, c.lvl >= 2);
    if (holding) liftedItem(g, c.drink, holding.x, holding.y);
    g.restore();
  }
  function drawItems(g, t) {
    for (var k = 0; k < 4; k++) {
      var s = t.seats[k], c = s.c;
      if (!c || LG.time < c.born) continue;
      if (c.food) A.item(g, c.food.kind, c.food.v, s.fx, s.fy, ITEM_S, c.food.lv);
      if (c.drink && !(c.sipT > 0) && !(c.raiseT > 0)) A.item(g, c.drink.kind, c.drink.v, s.dx, s.dy, ITEM_S, c.drink.lv);
      else if (c.drink && c.drink.kind === 'cay') { g.fillStyle = '#f4efe4'; A.ell(g, s.dx, s.dy, 13 * ITEM_S, 4 * ITEM_S); g.fill(); }
    }
  }
  function npcTable(t) { var a = t.seats[0].c, b = t.seats[1].c; return a && b && a.npc && b.npc && a.leaving < 0 && b.leaving < 0; }
  function drawTable(g, t) {
    var k = Math.min(1, t.showT / 0.5);
    var yo = k < 1 ? -70 * (1 - LG.ease.outBack(k)) : 0;
    var tav = npcTable(t);
    var spr = t.vip ? (tav ? ART.vip : ART.vipV) : (tav ? ART.table : ART.tableV);
    g.save();
    if (k < 1) g.globalAlpha = k;
    g.drawImage(spr, t.x - 130, t.y - 40 + yo);
    g.restore();
    if (k < 1) return;
    if (tav) A.tavla(g, t.x, t.y - 4, 1.3);
    drawItems(g, t);
    if (t.vip) {
      var vt = t.vip;
      if (!vt.tagU) vt.tagU = { id: 'vip#' + vt.user.id, name: vt.label };
      ui.drawNameTag(g, vt.tagU, t.x, t.y + 26, 18, '#3a2000', '#ffd54a');
    }
  }
  function drawEmptyBack(g, s) { A.drawChairBack(g, s.x, s.t.y - 14, 1.15); }
  function drawWalker(g, w) {
    if (w === cat) { drawCat(g); return; }
    if (w === simitci) {
      A.waiter(g, w.x, w.y, 1.02, { tabla: true, tray: false, vest: '#2e5e8c', shirt: '#f7e7c6', skin: '#d9a066', hair: '#6b6b6b', mustache: true, face: w.dir, step: w.step, moving: true, pants: '#3b3226' });
      return;
    }
    g.save();
    g.translate(w.x, w.y);
    if (w.lean) g.rotate(w.lean * w.face);
    var ck = w.kind === 'cayci';
    A.waiter(g, 0, 0, w.s, {
      vest: ck ? '#7a1f12' : null, shirt: '#f4f1ea', skin: ck ? '#e0ac69' : '#f1c27d', hair: '#1b120c',
      mustache: ck, cap: ck ? null : '#2a4d7a', apron: !ck, towel: ck,
      face: w.face, step: w.step, moving: w.moving, swing: w.swing * w.face,
      load: w.tray.length, colors: w.trayCol, wow: w.sprint, pants: ck ? '#2b2b36' : '#3a3f55',
    });
    g.restore();
  }
  function drawCat(g) {
    var st = cat.st;
    var mode = st === 'sleep' ? (cat.dance > 0 ? 'dance' : 'sleep') : st === 'sit' ? (cat.dance > 0 ? 'dance' : 'sit') : st === 'down' || st === 'up' ? 'jump' : 'walk';
    A.cat(g, cat.x, cat.y, 1.15, mode, LG.time, cat.dir);
  }
  var WALK = [];
  function drawWorld(g) {
    WALK.length = 0;
    WALK.push(cayci, cirak);
    if (simitci.on) WALK.push(simitci);
    if (!catOnCounter()) WALK.push(cat);
    WALK.sort(function (a, b) { return a.y - b.y; });
    var wi = 0;
    for (var r = 0; r < 4; r++) {
      var ty = ROWS[r], row = ROW_TABLES[r];
      while (wi < WALK.length && WALK[wi].y < ty - 16) drawWalker(g, WALK[wi++]);
      var i, t, k;
      for (i = 0; i < row.length; i++) {
        t = row[i];
        if (!t.shown) { g.drawImage(ART.plant, t.x - 44, t.y - 50, 88, 107); continue; }
        if (t.showT < 0.5) continue;
        for (k = 0; k < 2; k++) {
          var s = t.seats[k];
          drawEmptyBack(g, s);
        }
      }
      // kalkanlar (koltuk boşalmış olsa da)
      for (i = 0; i < custs.length; i++) { var lc = custs[i]; if (lc.seat.t.r === r && lc.seat.side === 'back' && lc.leaving >= 0) drawBackCust(g, lc); }
      for (i = 0; i < row.length; i++) {
        t = row[i];
        if (!t.shown) continue;
        for (k = 0; k < 2; k++) if (t.seats[k].c) drawBackCust(g, t.seats[k].c);
      }
      while (wi < WALK.length && WALK[wi].y < ty - 2) drawWalker(g, WALK[wi++]);
      for (i = 0; i < row.length; i++) if (row[i].shown) drawTable(g, row[i]);
      for (i = 0; i < row.length; i++) {
        t = row[i];
        if (!t.shown || t.showT < 0.5) continue;
        for (k = 2; k < 4; k++) {
          var ss = t.seats[k];
          A.drawStool(g, ss.x, t.y + 16, 1.05);
          if (ss.c) drawSideCust(g, ss.c);
        }
      }
      for (i = 0; i < custs.length; i++) { var lc2 = custs[i]; if (lc2.seat.t.r === r && lc2.seat.side !== 'back' && lc2.leaving >= 0) drawSideCust(g, lc2); }
    }
    while (wi < WALK.length) drawWalker(g, WALK[wi++]);
  }
  function drawDie(g, d) {
    var k = Math.min(1, d.t / 0.75);
    var x = lerp(d.x0, d.x1, k), y = lerp(d.y0, d.y1, k) - Math.sin(k * Math.PI) * 50 - (k < 1 ? Math.abs(Math.sin(k * 9)) * 16 * (1 - k) : 0);
    var a = d.t > 3.6 ? Math.max(0, 1 - (d.t - 3.6) / 0.6) : 1;
    g.save(); g.globalAlpha = a;
    var rot = k < 1 ? d.t * 14 : 0;
    var land = d.landed ? Math.max(0, 1 - (d.t - 0.75) * 5) : 0;
    var sz = 32 + land * 8;
    A.die(g, x - 19, y - 12, sz, d.f1, rot);
    A.die(g, x + 19, y - 8, sz, d.f2, -rot * 1.2);
    g.restore();
  }
  function drawBulbs(g, t) {
    var party = partyT > 0 || megaT > 0;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (var i = 0; i < ART.bulbs.length; i++) {
      var b = ART.bulbs[i];
      if (b.k === 2 && !party) continue; // direk ampulleri: parlama sadece kutlamada
      var tw = 0.62 + 0.38 * Math.sin(t * 2.1 + b.ph);
      if (party) tw = 0.5 + 0.5 * Math.sin(t * 9 + i * 0.7);
      g.globalAlpha = tw * (b.k === 2 ? 0.55 : 0.75);
      var sz = b.k === 0 ? 60 : 46;
      g.drawImage(A.glow, b.x - sz / 2, b.y + 4 - sz / 2, sz, sz);
    }
    g.restore();
    for (var j = 0; j < ART.bulbs.length; j++) {
      var bb = ART.bulbs[j];
      g.fillStyle = party ? 'hsl(' + ((j * 37 + t * 160) % 360) + ',90%,70%)' : (bb.k === 0 ? '#ffe7a8' : '#ffd27a');
      A.ell(g, bb.x, bb.y + 5, bb.k === 0 ? 5 : 4, bb.k === 0 ? 6 : 5); g.fill();
    }
  }
  function drawCounterArea(g, t) {
    var C = L.COUNTER, ct = ART.counter;
    g.drawImage(ct.canvas, C.x - ct.ox, C.y - ct.oy);
    // ocak közü
    var pulse = 0.55 + Math.sin(t * 3) * 0.15 + speedFrac * 0.3;
    drawGlow(g, SEMA.x, SEMA.y - 6, 110, pulse * 0.6);
    // semaver
    g.save();
    g.translate(SEMA.x, SEMA.y);
    g.scale(SEMA.s, SEMA.s);
    g.drawImage(ART.sema.canvas, -ART.sema.ox, -ART.sema.oy);
    g.restore();
    if (catOnCounter()) drawCat(g);
    // radyo notaları
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var a = Math.min(1, n.t * 3) * (1 - n.t / n.life);
      ui.text(g, n.ch, n.x + Math.sin(n.t * 3 + n.sw) * 10, n.y, { size: 30, color: partyT > 0 ? 'hsl(' + ((n.sw * 60 + t * 120) % 360) + ',90%,72%)' : '#ffe3a3', alpha: a, strokeWidth: 4 });
    }
  }
  function drawSteam(g) {
    for (var i = 0; i < steam.length; i++) {
      var p = steam[i], k = p.t / p.life;
      var sz = lerp(p.s0, p.s1, k);
      g.globalAlpha = (k < 0.15 ? k / 0.15 : 1 - k) * 0.42;
      g.drawImage(A.puff, p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#7fd3ff';
    for (var j = 0; j < sweat.length; j++) { var d = sweat[j]; A.ell(g, d.x, d.y, 3.2, 5); g.fill(); }
  }
  function drawFlying(g) {
    for (var i = 0; i < flying.length; i++) {
      var f = flying[i], k = f.t / f.dur;
      var x = lerp(f.x0, f.x1, k), y = lerp(f.y0, f.y1, k) - 4 * f.peak * k * (1 - k);
      if (f.spin) {
        g.save(); g.translate(x, y); g.rotate(f.t * f.spin);
        A.item(g, f.o.kind, f.o.v, 0, 6, ITEM_S, 1);
        g.restore();
      } else A.item(g, f.o.kind, f.o.v, x, y, ITEM_S, 1);
    }
  }
  function drawBub(g, b, x, y, t0) {
    var age = LG.time - t0;
    var sc = age < 0.18 ? 0.5 + 0.5 * LG.ease.outBack(age / 0.18) : 1;
    var bx = clamp(x - b.ax, 6, W - 6 - b.w);
    var by = y - b.ay;
    if (sc !== 1) {
      g.save(); g.translate(x, y); g.scale(sc, sc); g.drawImage(b.c, bx - x, by - y); g.restore();
    } else g.drawImage(b.c, bx, by);
  }
  var TAG_MAX = 28, TAGSORT = [], tagTimer = 0;
  function anchorOf(c) {
    var s = c.seat;
    return s.side === 'back' ? { x: s.x, y: s.t.y - 120, chat: s.t.y - 94, tag: s.t.y - 103 } : { x: s.x, y: s.t.y - 82, chat: s.t.y - 82, tag: s.t.y + 57 };
  }
  function drawTop(g, t) {
    var i, c, an;
    // davet: boş sandalye
    if (humans < 8) {
      var inv = null;
      for (i = 0; i < tables.length && !inv; i++) {
        var tb = tables[i];
        if (!tb.shown || tb.showT < 0.5) continue;
        for (var k = 0; k < 4; k++) if (!tb.seats[k].c && !tb.seats[k].res) { inv = tb.seats[k]; break; }
      }
      if (inv) {
        var hy = inv.side === 'back' ? inv.t.y - 66 : inv.t.y - 54;
        var pulse = 1 + Math.sin(t * 4) * 0.08;
        g.save();
        g.setLineDash([7, 6]); g.lineDashOffset = -t * 20;
        g.strokeStyle = 'rgba(255,236,190,0.9)'; g.lineWidth = 3;
        g.beginPath(); g.arc(inv.x, hy, 24 * pulse, 0, TAU); g.stroke();
        g.restore();
        ui.text(g, '+', inv.x, hy + 2, { size: 30, color: '#ffe9c4', strokeWidth: 4 });
        drawBub(g, A.bubble('çay yaz, otur! 🫖', { size: 20, bg: '#fffbe8', border: '#c98b4a' }), inv.x, hy - 32, -9);
      }
    }
    // zarlar (görünsün diye üst katmanda)
    for (i = 0; i < dice.length; i++) drawDie(g, dice[i]);
    // isim etiketleri: yalnızca son aktif ~28 kişi + VIP + emekliler (kalabalıkta okunaklı kalsın)
    tagTimer -= 1 / 60;
    if (tagTimer <= 0) {
      tagTimer = 0.25;
      TAGSORT.length = 0;
      for (i = 0; i < custs.length; i++) if (custs[i].leaving < 0 && !custs[i].npc && !custs[i].vip) TAGSORT.push(custs[i]);
      TAGSORT.sort(function (p, q) { return q.activeT - p.activeT; });
      for (i = 0; i < TAGSORT.length; i++) TAGSORT[i].showTag = i < TAG_MAX;
    }
    for (i = 0; i < custs.length; i++) {
      c = custs[i];
      an = custAnim(c);
      if (!an || c.bub && c.seat.side === 'back') continue;
      if (!c.npc && !c.vip && c.showTag === false && c.leaving < 0) continue;
      var ap = anchorOf(c);
      var st = tagStyle(c);
      var active = LG.time - c.activeT < 3 && c.leaving < 0;
      if (active) continue;
      g.globalAlpha = an.a;
      ui.drawNameTag(g, c.tag, ap.x, ap.tag + an.dy, 19, st[0], st[1]);
    }
    g.globalAlpha = 1;
    // sipariş balonları (4 sn sonra küçük simgeye döner)
    for (i = 0; i < custs.length; i++) {
      c = custs[i];
      if (!c.ordImg || c.bub || c.leaving >= 0 || LG.time < c.born) continue;
      var a2 = anchorOf(c);
      var ot = Math.max(c.od ? c.od.t : 0, c.of ? c.of.t : 0);
      var fresh = LG.time - ot < 4;
      var bob = Math.sin(t * 3 + c.ph) * 3;
      drawBub(g, fresh ? c.ordImg : c.ordMini, a2.x, a2.y + bob + (fresh ? 0 : 6), fresh ? ot : -9);
    }
    // aktif isimler (büyük)
    for (i = 0; i < custs.length; i++) {
      c = custs[i];
      if (LG.time - c.activeT >= 3 || c.leaving >= 0 || LG.time < c.born || (c.bub && c.seat.side === 'back')) continue;
      var a3 = anchorOf(c), st3 = tagStyle(c);
      ui.drawNameTag(g, c.tag, a3.x, a3.tag, 23, st3[0], st3[1]);
    }
    // konuşma balonları (yeni olan üstte)
    for (i = 0; i < chatList.length; i++) {
      c = chatList[i];
      if (!c.bub) continue;
      an = custAnim(c);
      if (!an) continue;
      var a4 = anchorOf(c);
      var age = LG.time - c.bub.t, life = c.bub.life;
      g.globalAlpha = Math.min(1, (life - age) / 0.35) * an.a;
      drawBub(g, c.bub.img, a4.x, a4.chat + an.dy, c.bub.t);
      g.globalAlpha = 1;
    }
    // çalışanların balonları
    drawSay(g, cayci.say, cayci.x, cayci.y - 160);
    drawSay(g, cirak.say, cirak.x, cirak.y - 150);
    if (simitci.on) drawSay(g, simitci.say, simitci.x, simitci.y - 190);
    if (cat.say) drawSay(g, cat.say, cat.x, cat.y - 76);
  }
  function drawSay(g, s, x, y) {
    if (!s) return;
    g.globalAlpha = Math.min(1, (s.life - s.t) / 0.3);
    drawBub(g, s.img, x, Math.max(y, 270), LG.time - s.t);
    g.globalAlpha = 1;
  }

  // ---- arayüz ----
  function drawPlaque(g, t) {
    var px = PLAQUE.x - 330, py = PLAQUE.y - 40;
    var sw = Math.sin(t * 1.3) * 0.012;
    g.save();
    g.translate(PLAQUE.x, PLAQUE.y - 40);
    g.rotate(sw);
    g.translate(-PLAQUE.x, -(PLAQUE.y - 40));
    g.drawImage(ART.plaque, px, py);
    var sc = 1 + teaBump * 0.12;
    g.translate(PLAQUE.x, PLAQUE.y + 99);
    g.scale(sc, sc);
    ui.text(g, '🫖 Bugün içilen çay: ' + LG.fmt(day.tea), 0, 1, { size: 27, color: teaBump > 0.3 ? '#fff6a0' : '#ffe9c4', maxWidth: 380, strokeColor: 'rgba(30,10,0,0.9)', strokeWidth: 5 });
    g.restore();
  }
  function drawGauge(g, t) {
    if (!GAUGE.on) return;
    var x = GAUGE.x, y = GAUGE.y, r = GAUGE.r;
    ui.panel(g, x - r - 18, y - r - 44, 2 * r + 36, r + 74, { r: 22, fill: 'rgba(36,16,6,0.82)', border: 'rgba(255,205,130,0.45)', lineWidth: 3 });
    ui.text(g, '❤️ ÇAYCI HIZI', x, y - r - 24, { size: 20, color: '#ffe3a3', maxWidth: 2 * r + 24, strokeWidth: 4 });
    g.save();
    g.lineCap = 'round';
    var segs = [['#5fbf6a', 0, 0.4], ['#ffd166', 0.4, 0.72], ['#ff5a4d', 0.72, 1]];
    g.lineWidth = 12;
    for (var i = 0; i < segs.length; i++) {
      g.strokeStyle = segs[i][0];
      g.beginPath(); g.arc(x, y, r - 8, Math.PI + segs[i][1] * Math.PI + 0.03, Math.PI + segs[i][2] * Math.PI - 0.03); g.stroke();
    }
    var jitter = needle > 0.72 ? Math.sin(t * 40) * 0.03 : 0;
    var ang = Math.PI + clamp(needle + jitter, 0, 1) * Math.PI;
    g.strokeStyle = '#fff6e0'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * (r - 14), y + Math.sin(ang) * (r - 14)); g.stroke();
    g.fillStyle = '#7a1f12'; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill();
    g.restore();
    var lbl = needle > 0.72 ? 'UÇUYOR! 💨' : needle > 0.4 ? 'Koşturuyor 🏃' : needle > 0.12 ? 'Hızlandı' : 'Ağır ağır';
    ui.text(g, lbl, x, y + 20, { size: needle > 0.72 ? 22 : 20, color: needle > 0.72 ? '#ffb4a8' : '#fff3d6', maxWidth: 2 * r + 24, strokeWidth: 4 });
  }
  function drawPill(g) {
    if (!PILL.on) return;
    var x = PILL.x, y = PILL.y;
    ui.panel(g, x - 76, y - 24, 152, 48, { r: 24, fill: 'rgba(36,16,6,0.82)', border: 'rgba(255,205,130,0.45)', lineWidth: 3 });
    ui.text(g, '🪑 ' + humans + ' kişi', x, y + 2, { size: 25, color: '#ffe9c4', maxWidth: 136, strokeWidth: 4 });
    if (doorQ.length) {
      ui.panel(g, x - 76, y + 30, 152, 42, { r: 21, fill: 'rgba(36,16,6,0.78)', border: false });
      ui.text(g, '🚪 ' + doorQ.length + ' kapıda', x, y + 52, { size: 21, color: '#ffd8a0', maxWidth: 136, strokeWidth: 4 });
    }
  }
  function drawLikeBar(g) {
    var b = LIKEBAR;
    ui.goalBar(g, b.x, b.y, b.w, b.h, likeGoal.v, likeGoal.target, {
      label: '❤️ ' + LG.fmt(likeGoal.v) + ' / ' + LG.fmt(likeGoal.target) + ' → ocaktan herkese çay',
      color1: '#ff6b6b', color2: '#ffc56b', bg: 'rgba(36,16,6,0.82)',
    });
  }
  function chalk(g, s, x, y, o) {
    o.stroke = false; // tebeşir: kontursuz (gölge bulanıklığı pahalı olduğu için yok)
    ui.text(g, s, x, y, o);
  }
  function drawBoard(g, t) {
    var B = boardRect();
    // Tahta duvarda ama okunsun diye önünden geçenlerin üstüne yeniden çizilir (çaycı "arkasından" geçer)
    if (!BOARD_ALT) g.drawImage(ART.bg, B.x - 12, B.y - 4, B.w + 24, B.h + 18, B.x - 12, B.y - 4, B.w + 24, B.h + 18);
    if (BOARD_ALT) {
      ui.panel(g, B.x - 8, B.y - 8, B.w + 16, B.h + 16, { r: 10, fill: '#6b3d1c', border: '#8a5428', lineWidth: 4 });
      ui.panel(g, B.x, B.y, B.w, B.h, { r: 4, fill: '#1e2c24', border: false });
    }
    var a = topic.fade;
    g.save();
    g.globalAlpha = a;
    var cx = B.x + B.w / 2;
    if (topic.st === 'vote') {
      var left = Math.max(0, VOTE_DUR - (LG.time - topic.t0));
      chalk(g, '🗣️ GÜNÜN SOHBETİ', B.x + 20, B.y + 25, { size: 25, color: '#ffe08a', align: 'left' });
      ui.timerRing(g, B.x + B.w - 32, B.y + 30, 22, left / VOTE_DUR, String(Math.ceil(left)), { bg: 'rgba(0,0,0,0.35)' });
      chalk(g, topic.q, cx, B.y + 66, { size: 35, color: '#fffdf2', maxWidth: B.w - 36 });
      var tot = topic.va + topic.vb;
      var pa = tot ? Math.round(topic.va / tot * 100) : 0, pb = tot ? 100 - pa : 0;
      chalk(g, upTR(topic.A.label) + (tot ? '  %' + pa : ''), B.x + 22, B.y + 106, { size: 30, color: '#ffb8a4', align: 'left', maxWidth: B.w / 2 - 30 });
      chalk(g, (tot ? '%' + pb + '  ' : '') + upTR(topic.B.label), B.x + B.w - 22, B.y + 106, { size: 30, color: '#a8e0ff', align: 'right', maxWidth: B.w / 2 - 30 });
      var bx = B.x + 22, bw = B.w - 44, by = B.y + 124, bh = 18;
      var split = bw * clamp(topic.show, 0.04, 0.96);
      g.fillStyle = '#e8735a'; ui.roundRect(g, bx, by, split, bh, 6); g.fill();
      g.fillStyle = '#4fa3d9'; ui.roundRect(g, bx + split, by, bw - split, bh, 6); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; ui.roundRect(g, bx, by, bw, bh, 6); g.stroke();
      chalk(g, '💬 yaz: ' + topic.A.say + ' / ' + topic.B.say + (tot ? '   · ' + tot + ' oy' : ''), cx, B.y + 158, { size: 21, color: 'rgba(255,250,235,0.85)', maxWidth: B.w - 30 });
    } else if (topic.st === 'result' && topic.res) {
      var res = topic.res;
      var pop = LG.ease.outBack(Math.min(1, topic.resT / 0.5));
      chalk(g, res.win ? '🏆 KAHVEHANE KARARINI VERDİ' : '🤝 SOHBETİN SONUCU', cx, B.y + 26, { size: 25, color: '#ffe08a', maxWidth: B.w - 30 });
      g.save(); g.translate(cx, B.y + 78); g.scale(pop, pop);
      if (res.win) chalk(g, upTR(res.win === 'a' ? topic.A.label : topic.B.label) + '  %' + res.pct, 0, 0, { size: 54, color: res.win === 'a' ? '#ffc2b0' : '#b8e6ff', maxWidth: B.w - 40 });
      else chalk(g, res.tot ? 'BERABERE!' : 'SESSİZLİK 😄', 0, 0, { size: 50, color: '#fffdf2' });
      g.restore();
      chalk(g, res.quip, cx, B.y + 124, { size: 24, color: '#fffdf2', maxWidth: B.w - 30 });
      chalk(g, topic.q + '  ·  ' + upTR(topic.A.label) + ' ' + topic.va + ' – ' + topic.vb + ' ' + upTR(topic.B.label), cx, B.y + 155, { size: 19, color: 'rgba(255,250,235,0.75)', maxWidth: B.w - 30 });
    } else {
      chalk(g, '— MENÜ —', cx, B.y + 24, { size: 26, color: '#ffe08a' });
      var colL = B.x + 24, colR = B.x + B.w / 2 + 8;
      var L1 = ['🫖 Çay (demli / açık)', '☕ Türk kahvesi', '🍊 Oralet  ·  🥛 Ayran'];
      var L2 = ['🥯 Simit  ·  🥪 Tost', '💧 Su  ·  🫧 Soda', '🎲 tavla  ·  🐈 pisi'];
      for (var i = 0; i < 3; i++) {
        chalk(g, L1[i], colL, B.y + 60 + i * 30, { size: 23, color: '#fffdf2', align: 'left', maxWidth: B.w / 2 - 30 });
        chalk(g, L2[i], colR, B.y + 60 + i * 30, { size: 23, color: '#fffdf2', align: 'left', maxWidth: B.w / 2 - 30 });
      }
      var nx = Math.max(0, topic.next - LG.time);
      var mm = Math.floor(nx / 60), ss = Math.floor(nx % 60);
      chalk(g, '🗣️ Günün sohbeti ' + mm + ':' + (ss < 10 ? '0' : '') + ss + ' sonra', cx, B.y + 154, { size: 20, color: 'rgba(255,236,190,0.85)', maxWidth: B.w - 30 });
    }
    g.restore();
  }
  function drawRibbon(g, t) {
    if (!rib) return;
    var r = rib, k = r.t;
    var inK = Math.min(1, k / 0.3), outK = Math.min(1, (r.dur - k) / 0.3);
    var a = Math.min(inK, outK);
    var xo = (1 - LG.ease.outCubic(inK)) * -160;
    var h = r.sub ? 74 : RIB.h, y = RIB.y - h / 2;
    var x = 64 + xo, w = W - 128;
    g.save();
    g.globalAlpha = a;
    var gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, r.big ? '#8a2318' : '#5a2c14'); gr.addColorStop(1, r.big ? '#5a120c' : '#3a1a0a');
    ui.roundRect(g, x, y, w, h, h / 2);
    g.fillStyle = gr; g.fill();
    g.lineWidth = 4; g.strokeStyle = r.big ? '#ffd166' : 'rgba(255,205,130,0.75)'; g.stroke();
    var tx = x + 40;
    if (r.user) { ui.avatar(g, r.user, x + h / 2 + 4, y + h / 2, h / 2 - 9, { ring: '#ffd166', ringWidth: 3 }); tx = x + h + 14; }
    ui.emoji(g, r.icon, x + w - 44, y + h / 2 + Math.sin(t * 6) * 3, 40);
    var maxW = x + w - 80 - tx;
    if (r.sub) {
      ui.text(g, r.text, tx, y + 27, { size: 29, align: 'left', color: '#fff3d6', maxWidth: maxW, strokeWidth: 5 });
      ui.text(g, r.sub, tx, y + 56, { size: 22, align: 'left', color: '#ffd166', maxWidth: maxW, strokeWidth: 4 });
    } else ui.text(g, r.text, tx, y + h / 2 + 2, { size: r.small ? 27 : 30, align: 'left', color: '#fff3d6', maxWidth: maxW, strokeWidth: 5 });
    g.restore();
  }
  function drawCard(g, t) {
    if (!card) return;
    var c = card, k = c.t;
    var a = Math.min(1, k / 0.25, (c.dur - k) / 0.35);
    var sc = LG.ease.outBack(Math.min(1, k / 0.45));
    g.save();
    if (c.mega) {
      g.globalAlpha = a * 0.55; g.fillStyle = '#0a0410'; g.fillRect(0, 0, W, H);
      g.globalAlpha = a;
      var cy0 = 760;
      g.save(); g.translate(W / 2, cy0); g.rotate(t * 0.4);
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(255,200,80,0.12)';
      for (var i = 0; i < 12; i++) {
        g.rotate(TAU / 12);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-50, -560); g.lineTo(50, -560); g.closePath(); g.fill();
      }
      g.restore();
      g.translate(W / 2, cy0); g.scale(sc, sc);
      var bw = 940, bh = 330;
      ui.panel(g, -bw / 2, -bh / 2, bw, bh, { r: 40, fill: 'rgba(70,14,10,0.94)', border: '#ffd166', lineWidth: 7 });
      if (c.user) ui.avatar(g, c.user, 0, -bh / 2 - 10, 74, { ring: '#ffd166', ringWidth: 7 });
      ui.emoji(g, c.icon, bw / 2 - 70, -bh / 2 + 50 + Math.sin(t * 6) * 6, 84);
      ui.emoji(g, '🫖', -bw / 2 + 70, -bh / 2 + 50 - Math.sin(t * 6) * 6, 70);
      ui.text(g, c.title, 0, 30, { size: 58, color: '#ffe08a', maxWidth: bw - 80, strokeWidth: 9 });
      ui.text(g, c.sub, 0, 104, { size: 32, color: '#fff3d6', maxWidth: bw - 80, strokeWidth: 6 });
    } else {
      g.globalAlpha = a;
      var C2 = CARD;
      g.translate(C2.x + C2.w / 2, C2.y + C2.h / 2); g.scale(sc, sc);
      ui.panel(g, -C2.w / 2, -C2.h / 2, C2.w, C2.h, { r: 34, fill: 'rgba(80,18,10,0.93)', border: '#ffd166', lineWidth: 6 });
      var tx = -C2.w / 2 + 40;
      if (c.user) { ui.avatar(g, c.user, -C2.w / 2 + 92, 0, 62, { ring: '#ffd166', ringWidth: 5 }); tx = -C2.w / 2 + 176; }
      else { ui.emoji(g, c.icon, -C2.w / 2 + 92, 0, 92); tx = -C2.w / 2 + 176; }
      ui.emoji(g, c.user ? c.icon : '🫖', C2.w / 2 - 74, Math.sin(t * 6) * 6, 76);
      ui.text(g, c.title, tx, -28, { size: 50, color: '#ffe08a', align: 'left', maxWidth: C2.w - (tx + C2.w / 2) - 140, strokeWidth: 8 });
      ui.text(g, c.sub, tx, 40, { size: 29, color: '#fff3d6', align: 'left', maxWidth: C2.w - (tx + C2.w / 2) - 140, strokeWidth: 5 });
    }
    g.restore();
  }
  function drawRockets(g) {
    for (var i = 0; i < rockets.length; i++) {
      var r = rockets[i];
      if (r.delay > 0) continue;
      g.strokeStyle = 'rgba(255,230,160,0.6)'; g.lineWidth = 3;
      g.beginPath();
      for (var j = 0; j < r.trail.length; j += 2) { if (j === 0) g.moveTo(r.trail[j], r.trail[j + 1]); else g.lineTo(r.trail[j], r.trail[j + 1]); }
      g.lineTo(r.x, r.y); g.stroke();
      g.fillStyle = '#fff6d0'; A.ell(g, r.x, r.y, 4, 4); g.fill();
    }
  }
  function drawSummary(g, t) {
    if (!summ) return;
    var s = summ, a = Math.min(1, s.t / 0.4);
    g.save();
    g.globalAlpha = a * 0.8; g.fillStyle = '#07030a'; g.fillRect(0, 0, W, H);
    g.globalAlpha = a;
    var x = 80, y = 262, w = 920, h = 1000;
    var sc = LG.ease.outBack(Math.min(1, s.t / 0.5));
    g.translate(W / 2, y + h / 2); g.scale(sc, sc); g.translate(-W / 2, -(y + h / 2));
    ui.panel(g, x - 10, y - 10, w + 20, h + 20, { r: 44, fill: '#5a3218', border: '#8a5428', lineWidth: 6 });
    ui.panel(g, x, y, w, h, { r: 36, fill: 'rgba(30,14,6,0.97)', border: '#e9b866', lineWidth: 4 });
    ui.text(g, '🌙 GÜNÜ KAPATTIK', W / 2, y + 62, { size: 56, color: '#ffe08a', strokeWidth: 9 });
    ui.text(g, '🫖 ' + LG.fmt(s.tea) + ' çay içildi', W / 2, y + 140, { size: 62, color: '#fff3d6', strokeWidth: 9 });
    var it = s.items, parts = [];
    [['kahve', '☕'], ['oralet', '🍊'], ['simit', '🥯'], ['tost', '🥪'], ['ayran', '🥛'], ['su', '💧'], ['salep', '🤎'], ['ihlamur', '🌿']].forEach(function (p) { if (it[p[0]]) parts.push(p[1] + ' ' + it[p[0]]); });
    ui.text(g, parts.length ? parts.join('   ') : 'Yarın simitler de gelsin! 🥯', W / 2, y + 200, { size: 30, color: '#ffd8a0', maxWidth: w - 60 });
    ui.text(g, '🏆 GÜNÜN MÜDAVİMLERİ', W / 2, y + 268, { size: 36, color: '#ffe08a' });
    if (!s.acts.length) ui.text(g, 'Masalar seni bekliyor! 💬', W / 2, y + 330, { size: 30, color: '#fff3d6' });
    for (var i = 0; i < s.acts.length; i++) {
      var ac = s.acts[i], ry = y + 326 + i * 70;
      var rr = ac.u.data && ac.u.data.cay && ac.u.data.cay.rec;
      ui.emoji(g, ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i], x + 70, ry, 40);
      ui.avatar(g, ac.u, x + 135, ry, 26, { ringWidth: 3 });
      ui.text(g, ac.u.name, x + 176, ry - 12, { size: 30, align: 'left', color: '#fff', maxWidth: 380 });
      ui.text(g, rr ? titleOf(rr) : TITLES[0], x + 176, ry + 18, { size: 21, align: 'left', color: '#ffd8a0', maxWidth: 380 });
      ui.text(g, ac.c + ' sohbet · ' + ac.o + ' sipariş', x + w - 40, ry, { size: 25, align: 'right', color: '#ffe9c4' });
    }
    var yy = y + 326 + Math.max(1, s.acts.length) * 70 + 20;
    if (s.tr) {
      ui.text(g, '🤝 En cömert: ' + s.tr.u.name + ' — ' + s.tr.n + ' kez ısmarladı', W / 2, yy, { size: 30, color: '#fff3d6', maxWidth: w - 60 });
      yy += 52;
    }
    if (s.pr) {
      ui.text(g, '💞 ' + s.pr.a.name + ' ➜ ' + s.pr.b.name + ': ' + s.pr.n + ' çay', W / 2, yy, { size: 30, color: '#ffc2d4', maxWidth: w - 60 });
      yy += 52;
    }
    if (s.last && s.last.win) {
      ui.text(g, '🗣️ ' + s.last.q + ' → ' + upTR(s.last.win) + ' (%' + s.last.pct + ')', W / 2, yy, { size: 26, color: '#b8e6ff', maxWidth: w - 60 });
      yy += 46;
    }
    ui.text(g, s.people + ' kişi uğradı · ' + s.topics + ' sohbet konusu', W / 2, y + h - 98, { size: 26, color: 'rgba(255,233,196,0.8)' });
    ui.text(g, 'Yarın yine bekleriz! ☕', W / 2, y + h - 48, { size: 38, color: '#ffe08a' });
    g.restore();
  }

  function render(ctx, t) {
    ctx.save();
    ui.applyShake(ctx);
    ctx.drawImage(ART.bg, 0, 0);
    drawBulbs(ctx, t);
    drawCounterArea(ctx, t);
    drawWorld(ctx);
    drawBoard(ctx, t);
    drawSteam(ctx);
    drawRockets(ctx);
    drawTop(ctx, t);
    drawPlaque(ctx, t);
    drawGauge(ctx, t);
    drawPill(ctx);
    drawLikeBar(ctx);
    var lines = HINTS;
    if (topic.st === 'vote') {
      var vl = '🗣️ ' + topic.A.say + ' / ' + topic.B.say + ' yaz → oy ver';
      lines = [vl, HINTS[0], vl, HINTS[2], vl, HINTS[1], vl, HINTS[3]];
    }
    ui.hintBar(ctx, HINT.x, HINT.y, HINT.w, lines, { h: HINT.h, size: 36, fill: 'rgba(36,16,6,0.85)', border: 'rgba(255,205,130,0.55)' });
    drawRibbon(ctx, t);
    var megaCard = card && card.mega;
    if (megaCard) drawFlying(ctx);
    drawCard(ctx, t);
    if (!megaCard) drawFlying(ctx);
    ctx.restore();
    drawSummary(ctx, t);
  }

  window.CAY_DEBUG = { topic: topic, tables: tables, custs: custs, waiters: [cayci, cirak], cat: cat };

  LG.start({
    id: 'cay-ocagi',
    title: 'Çay Ocağı ☕',
    init: function () {
      buildArt();
      npcSit();
      if (LG.config.music) LG.music.play('chill');
    },
    update: update,
    render: render,
  });
})();
