/*
 * BİL BAKALIM! 🧠 — canlı yayında yorumla oynanan hızlı bilgi yarışması.
 *
 * Tur = 10 soru, 4 oyun türü otomatik döner:
 *   ❓ Çoktan seçmeli (15 sn) : a/b/c/d (ya da şıkkın kendisi) yaz — ilk cevabın geçerli.
 *                                100 puan + hız bonusu (en fazla +100). Canlı oy çubukları.
 *   🔤 Kelime avı (25 sn)      : karışık harflerden kelimeyi bul — ilk 3 doğru 300/200/100.
 *                                Her 5 sn'de bir harf açılır.
 *   🧩 Emoji bilmece (25 sn)   : emojilerin anlattığını yaz — ilk 3 doğru 300/200/100.
 *   🚗 Plaka bilmecesi (25 sn) : "61 hangi il?" — ilk 3 doğru 300/200/100.
 * 10. soru FİNAL (x2). Tur sonunda kürsü (ilk 3 taçlı), sonra otomatik yeni tur.
 *
 * Beğeni  : JOKER çubuğu dolar → sıradaki çoktan seçmeli soruda YARI YARIYA (iki yanlış şık gider).
 * Hediye  : 1. kademe kalp + teşekkür; 2+ SÜPER JOKER (herkes için bir yanlış şık silinir ya da
 *           bir harf açılır); 4+ ÇİFTE PUAN TURU (sıradaki soru herkese x2). Hediye, gönderenin
 *           puanını ASLA değiştirmez — tamamen topluluk yararına.
 * Takip / paylaşım : teşekkür + joker çubuğuna katkı.
 * Kısayollar: N sıradaki soru, B cevabı göster, K soruyu değiştir, T +10 sn, J jokeri doldur, R yeni tur.
 */
(function () {
  'use strict';
  var ui = LG.ui;
  var D = window.BB_DATA;
  var W = LG.W, H = LG.H;
  var TAU = Math.PI * 2;
  var clamp = LG.clamp, ease = LG.ease;

  ui.celebrateEnabled = false; // kendi kutlama şeridimiz var
  ui.toastsEnabled = false;    // bildirimler ipucu şeridinde gösterilir

  // ---------------------------------------------------------------------------
  // Yerleşim (1080x1920 — önemli her şey y 230..1300 arasında)
  // ---------------------------------------------------------------------------
  var TOP = { y: 242, h: 86 };
  var CARD = { x: 60, y: 352, w: 960 };
  var MC_CARD_H = 268, W_CARD_H = 350;          // 352..620 / 352..702
  var OPT = { x: 60, y: 636, w: 960, h: 84, gap: 12 }; // 636..1008
  var TICK = { x: 50, y: 1016, w: 980, h: 60 };        // son cevap verenlerin isimleri ..1076
  var SLOT_Y = 714, SLOT_H = 120;               // 714..834
  var WIN_Y = 846, WIN_H = 128;                 // 846..974
  var GUESS_Y = 986;                            // 986..1070
  var HINT = { x: 80, y: 1084, w: 920, h: 66 }; // ..1150
  var LB = { x: 40, y: 1164, w: 1000, h: 130 }; // ..1294
  var TIMER = { x: CARD.x + CARD.w - 76, y: CARD.y + 78, r: 60 };

  var OPT_COL = ['#ff4d6d', '#38b6ff', '#ffc233', '#1fd19a'];
  var OPT_LET = ['A', 'B', 'C', 'D'];
  var INK = '#1d1340';
  var MODES = {
    mc: { name: 'ÇOKTAN SEÇMELİ', icon: '❓', col: '#7b5cff', dur: 15 },
    word: { name: 'KELİME AVI', icon: '🔤', col: '#ff8a1c', dur: 25 },
    emoji: { name: 'EMOJİ BİLMECE', icon: '🧩', col: '#ff4fa3', dur: 25 },
    plate: { name: 'PLAKA BİLMECESİ', icon: '🚗', col: '#12b886', dur: 25 },
  };
  var PATTERNS = [
    ['mc', 'word', 'mc', 'emoji', 'mc', 'plate', 'mc', 'word', 'emoji', 'mc'],
    ['mc', 'emoji', 'mc', 'plate', 'mc', 'word', 'mc', 'emoji', 'word', 'mc'],
    ['mc', 'plate', 'mc', 'word', 'mc', 'emoji', 'mc', 'word', 'plate', 'mc'],
  ];
  var Q_PER_ROUND = 10;
  var INTRO_T = 1.1, SUSP_MC = 1.25, SUSP_W = 0.6, REVEAL_MC = 5.6, REVEAL_W = 5.2, PODIUM_T = 11.5, RINTRO_T = 3.6;
  var WIN_PTS = [300, 200, 100], LATE_PTS = 25;

  var HINTS = {
    mc: ['💬 Cevabını yaz: a, b, c ya da d', '⚡ İlk bilen ekstra puan', '❤️ Beğen → joker açılır', '🎁 Hediye → herkese süper joker'],
    word: ['💬 Kelimeyi bul, yorumlara yaz', '🥇 İlk 3 doğru: 300 · 200 · 100 puan', '⏳ Her 5 saniyede bir harf açılır', '❤️ Beğen → joker açılır', '🎁 Hediye → herkese süper joker'],
    emoji: ['💬 Emojilerin anlattığını yaz', '🥇 İlk 3 doğru: 300 · 200 · 100 puan', '🧩 Kategoriye bak, harfler açılacak', '❤️ Beğen → joker açılır', '🎁 Hediye → herkese süper joker'],
    plate: ['💬 İlin adını yorumlara yaz', '🥇 İlk 3 doğru: 300 · 200 · 100 puan', '🚗 Belki senin şehrin gelir!', '❤️ Beğen → joker açılır', '🎁 Hediye → herkese süper joker'],
    idle: ['💬 Yeni turda sen de yaz, katıl!', '🏆 10 soruda en çok puanı topla', '❤️ Beğen → joker açılır', '🎁 Hediye → herkese süper joker'],
  };

  // ---------------------------------------------------------------------------
  // Yardımcılar
  // ---------------------------------------------------------------------------
  function now() { return LG.time || 0; }
  // Renkli emoji glifleri fillStyle'ın saydamlığını miras alır → her zaman opak renkle çiz
  function emo(ctx, e, x, y, size, alpha) { ctx.fillStyle = '#000'; ui.emoji(ctx, e, x, y, size, alpha); }
  function trUpper(s) { return String(s).replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase(); }
  function compact(s) { return LG.cmd.norm(s).replace(/[^a-z0-9]/g, ''); }
  function tokens(s) { return LG.cmd.norm(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean); }
  function secs(t) { return (Math.round(t * 10) / 10).toFixed(1).replace('.', ',') + ' sn'; }
  function trunc(s, n) { var a = Array.from(String(s)); return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join(''); }
  var mctx = document.createElement('canvas').getContext('2d');
  function measure(str, size, weight) { mctx.font = ui.font(size, weight || 800); return mctx.measureText(str).width; }
  function wrap(text, size, maxW) {
    mctx.font = ui.font(size, 800);
    var words = String(text).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (cur && mctx.measureText(test).width > maxW) { lines.push(cur); cur = words[i]; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function fitWrap(text, maxW, sizes, maxLines) {
    var r = null, fallback = null;
    for (var i = 0; i < sizes.length; i++) {
      r = { lines: wrap(text, sizes[i], maxW), size: sizes[i] };
      if (r.lines.length > maxLines) continue;
      // tek başına kalan kısa son satırı (ör. '…"') sevmiyoruz: daha küçük boyutu dene
      var lastShort = r.lines.length > 1 && Array.from(r.lines[r.lines.length - 1]).length < 6;
      if (!lastShort) return r;
      if (!fallback) fallback = r;
    }
    return fallback || r;
  }
  function txt(ctx, s, x, y, size, color, o) {
    o = o || {};
    o.size = size; o.color = color;
    if (o.stroke === undefined) o.stroke = false;
    ui.text(ctx, s, x, y, o);
  }

  // Tekrarsız soru torbası (yayınlar arasında da hatırlanır)
  function Bag(key, n) {
    this.key = 'bilbakalim:bag:' + key; this.n = n;
    var l = LG.store.get(this.key, null);
    this.list = Array.isArray(l) && l.every(function (v) { return v === (v | 0) && v >= 0 && v < n; }) ? l : null;
  }
  Bag.prototype.next = function () {
    if (!this.list || !this.list.length) {
      this.list = [];
      for (var i = 0; i < this.n; i++) this.list.push(i);
      LG.shuffle(this.list);
    }
    var v = this.list.pop();
    LG.store.set(this.key, this.list);
    return v;
  };
  var bags = {};

  // ---------------------------------------------------------------------------
  // Durum
  // ---------------------------------------------------------------------------
  var round = 1, qNum = 0, pattern = PATTERNS[0];
  var phase = 'none', phaseT = 0;
  var Q = null;
  var board = new LG.Board();
  var streak = new Map();          // user.id -> art arda doğru
  var roundPlayers = new Set();
  var joker = { v: 0.15, shown: 0.15, target: 320, armed: false, pulse: 0, heartT: 0 };
  var pendingSuper = 0, pendingDouble = null;
  var banners = [], banner = null;
  var feed = [], feedCur = null, feedT = 0, lastFeedEnd = -99;
  var lastSec = -1, tempoUp = false, drumN = 0;
  var podium = null;
  var lbTop = [], lbPos = new Map();
  var bgCanvas = null, logoCanvas = null;
  var sparkles = [], glyphs = [];
  var introCount = -1;
  var hintAnchor = 0;
  var spotLast = new Map(), capThanked = new Set();
  // Sıralama: puan, eşitlikte toplam cevap süresi az olan önde (kürsüde eşitlik adil çözülsün)
  var tbreak = new Map(), rankCache = [], rankDirty = true, rankAt = -9;
  function addScore(u, pts, t) {
    board.add(u, pts);
    tbreak.set(u.id, (tbreak.get(u.id) || 0) + (t || 0));
    rankDirty = true;
  }
  function rankTop(n, force) {
    var tm = now();
    if (rankDirty && (force || tm - rankAt > 0.25)) {
      var arr = [];
      board.scores.forEach(function (e) { if (e.score > 0) arr.push(e); });
      arr.sort(function (a, b) { return (b.score - a.score) || ((tbreak.get(a.user.id) || 0) - (tbreak.get(b.user.id) || 0)); });
      rankCache = arr.slice(0, 10); rankDirty = false; rankAt = tm;
    }
    return rankCache.slice(0, n);
  }
  var DECOYS = {};                 // kelime/plaka: "toplu tahmin" (rize trabzon ordu…) yakalamak için

  // ---------------------------------------------------------------------------
  // Soru üretimi
  // ---------------------------------------------------------------------------
  function isNumeric(s) { return /^[%]?-?\d+([.,]\d+)?( ?(°C|km|sayı))?$/.test(String(s).trim()); }
  function numOf(s) { var m = String(s).match(/-?\d+([.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : NaN; }

  function makeQuestion(mode, num, forceIdx) {
    function pick(bag) { return forceIdx != null ? forceIdx : bags[bag].next(); }
    var q = {
      mode: mode, num: num, t: 0, dur: MODES[mode].dur, baseDur: MODES[mode].dur, left: MODES[mode].dur,
      mult: 1, double: null, answers: new Map(), total: 0, recent: [],
      solved: new Set(), guessers: new Map(), winners: [], late: 0, guesses: [],
      removedBySuper: 0, superLetters: 0, revealedAt: null, ring: 0, closing: false, born: now(),
      tick: [], tickQ: [], lastTick: -9, guessQ: [], lastGuess: -9,
    };
    if (mode === 'mc') {
      var it = D.mc[pick('mc')];
      q.cat = it[0]; q.text = it[1];
      var opts = [{ text: it[2], correct: true }, { text: it[3] }, { text: it[4] }, { text: it[5] }];
      if (opts.every(function (o) { return isNumeric(o.text); })) opts.sort(function (a, b) { return numOf(a.text) - numOf(b.text); });
      else LG.shuffle(opts);
      q.opts = opts.map(function (o) {
        return { text: o.text, correct: !!o.correct, norm: tokens(o.text).join(' '), num: numOf(o.text), votes: 0, shown: 0, voters: [], removed: false, remT: 0, pulse: 0 };
      });
      for (var i = 0; i < 4; i++) if (q.opts[i].correct) q.correctIdx = i;
      var f = fitWrap(q.text, CARD.w - 240, [60, 56, 52, 48], 2);
      if (f.lines.length > 2) f = fitWrap(q.text, CARD.w - 240, [46, 42, 38, 34], 3);
      q.lines = f.lines; q.size = f.size;
    } else {
      if (mode === 'word') {
        var w = D.word[pick('word')];
        q.cat = w[0]; q.answer = w[1];
        q.accept = [compact(w[1])].concat(((D.wordAlts || {})[w[1]] || []).map(compact));
        q.title = 'Harfleri sırala, kelimeyi bul!';
      } else if (mode === 'emoji') {
        var e = D.emoji[pick('emoji')];
        q.emojis = e[0]; q.answer = e[1]; q.cat = e[2];
        q.accept = [compact(e[1])].concat((e[3] || []).map(compact));
        q.title = 'Bu emojiler neyi anlatıyor?';
      } else {
        var p = D.plates[pick('plate')];
        q.code = p[0]; q.answer = p[1]; q.cat = 'Plaka';
        q.codeStr = (p[0] < 10 ? '0' : '') + p[0];
        q.accept = [compact(p[1])].concat((p[2] || []).map(compact));
        q.title = LG.pick(['Hangi ilin plakası ' + q.codeStr + '?', q.codeStr + ' hangi il?', 'Plaka kodu ' + q.codeStr + ' olan il hangisi?']);
      }
      q.letters = Array.from(trUpper(q.answer));
      q.rev = q.letters.map(function (ch) { return ch === ' ' ? -1 : 0; });  // -1 boşluk, 0 gizli, >0 açılma zamanı
      q.nLetters = q.letters.filter(function (ch) { return ch !== ' '; }).length;
      q.nWords = q.answer.split(' ').length;
      q.maxReveal = mode === 'emoji' ? Math.max(1, Math.floor(q.nLetters * 0.55)) : Math.max(1, q.nLetters - 2);
      q.nextHint = mode === 'word' ? 5 : 8;
      layoutSlots(q);
      if (mode === 'word') {
        var tiles = q.letters.slice();
        for (var tries = 0; tries < 30; tries++) { LG.shuffle(tiles); if (tiles.join('') !== q.letters.join('')) break; }
        q.tiles = tiles.map(function (ch) { return { ch: ch, used: false, ph: Math.random() * TAU }; });
      }
    }
    var m = MODES[mode];
    q.chip = m.icon + ' ' + m.name + (q.cat && mode !== 'plate' ? ' · ' + trUpper(q.cat) : '');
    q.chipW = measure(q.chip, 26, 900) + 44;
    return q;
  }

  // Cevap kutucuklarını (harf kutuları) 1 ya da 2 satıra yerleştir
  function layoutSlots(q) {
    var words = trUpper(q.answer).split(' ').map(function (w) { return Array.from(w); });
    var gap = 8, maxW = 980;
    function lineW(ws, s) {
      var n = 0; for (var i = 0; i < ws.length; i++) n += ws[i].length;
      return n * s + (n - ws.length) * gap + (ws.length - 1) * (s * 0.55 + gap);
    }
    var lines, s;
    for (s = 96; s >= 56; s -= 2) if (lineW(words, s) <= maxW) break;
    if (s >= 56) lines = [words];
    else {
      var best = 1, bestMax = 1e9;
      for (var k = 1; k < words.length; k++) {
        var a = lineW(words.slice(0, k), 50), b = lineW(words.slice(k), 50);
        if (Math.max(a, b) < bestMax) { bestMax = Math.max(a, b); best = k; }
      }
      lines = words.length > 1 ? [words.slice(0, best), words.slice(best)] : [words];
      for (s = 54; s > 24; s -= 2) { var ok = true; for (var li = 0; li < lines.length; li++) if (lineW(lines[li], s) > maxW) ok = false; if (ok) break; }
    }
    q.slotS = s;
    q.slots = [];
    var idx = 0;
    var totalH = lines.length * s + (lines.length - 1) * 10;
    for (var L = 0; L < lines.length; L++) {
      var ws = lines[L];
      var x = W / 2 - lineW(ws, s) / 2;
      var y = SLOT_Y + SLOT_H / 2 - totalH / 2 + L * (s + 10) + s / 2;
      for (var wi = 0; wi < ws.length; wi++) {
        for (var ci = 0; ci < ws[wi].length; ci++) {
          q.slots.push({ i: idx, x: x + s / 2, y: y, ch: ws[wi][ci] });
          idx++;
          x += s + gap;
        }
        idx++; // boşluk
        x += s * 0.55;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Akış
  // ---------------------------------------------------------------------------
  function setPhase(p) {
    phase = p; phaseT = 0;
    if (p === 'intro' || p === 'podium' || p === 'roundIntro') hintAnchor = now();
  }

  function startRound(n) {
    round = n; qNum = 0;
    pattern = PATTERNS[(n - 1) % PATTERNS.length];
    board.reset(); streak.clear(); roundPlayers.clear();
    tbreak.clear(); rankCache = []; rankDirty = true;
    lbPos.clear(); lbTop = [];
    podium = null; Q = null;
    LG.music.play('quiz');
    if (n > 1) { setPhase('roundIntro'); introCount = -1; LG.sfx('whoosh'); }
    else nextQuestion();
  }

  function nextQuestion() {
    if (qNum >= Q_PER_ROUND) { startPodium(); return; }
    qNum++;
    Q = makeQuestion(pattern[qNum - 1], qNum);
    applyMult(Q);
    if (pendingDouble) {
      Q.double = pendingDouble; pendingDouble = null; applyMult(Q);
      pushBanner({ icon: '⚡', title: 'ÇİFTE PUAN TURU!', sub: Q.double.name + ' sayesinde bu soru herkese x' + Q.mult + ' 💖', col: '#ffc233', user: Q.double, dur: 2.8, prio: 2 });
      LG.sfx('fanfare');
      ui.burst(W / 2, CARD.y + 40, { count: 70, speed: 800 });
    }
    lastSec = -1;
    setTempo(false);
    setPhase('intro');
    hintAnchor = now();
    LG.sfx('whoosh');
    if (qNum === Q_PER_ROUND) {
      pushBanner({ icon: '🏁', title: 'FİNAL SORUSU!', sub: 'Puanlar x' + Q.mult + ' — sıralama son anda değişebilir!', col: '#ffc233', dur: 2.8, prio: 2 });
      LG.sfx('levelup');
      ui.burst(W / 2, CARD.y + 20, { count: 50, speed: 700, colors: ['#ffc233', '#ff7a1c', '#ffffff'] });
    }
  }
  function applyMult(q) { q.mult = 1 + (q.num === Q_PER_ROUND ? 1 : 0) + (q.double ? 1 : 0); }

  function replaceQuestion() {
    if (!Q) return;
    var keepDouble = Q.double;
    Q = makeQuestion(Q.mode, qNum);
    Q.double = keepDouble; applyMult(Q);
    lastSec = -1; setTempo(false);
    setPhase('intro');
    LG.sfx('whoosh');
    pushFeed('Soru değiştirildi — yenisi geliyor!', { icon: '⏭️', col: '#9ad1ff', prio: 1 });
  }

  function beginAsk() {
    setPhase('ask');
    LG.sfx('go');
    // Beğeni jokeri: YARI YARIYA
    if (Q.mode === 'mc' && joker.armed) {
      var n = removeWrong(2);
      if (n > 0) {
        joker.armed = false; joker.v = 0.08; joker.shown = 0.08;
        joker.target = Math.min(6000, Math.round(joker.target * 1.45)); // kalabalık yayında her soru kolaylaşmasın
        Q.half = true;
        pushBanner({ icon: '🃏', title: 'YARI YARIYA!', sub: 'Beğenileriniz sayesinde iki yanlış şık gitti ❤️', col: '#ff4d6d', dur: 2.6 });
        LG.sfx('zap');
      }
    }
    // Bekleyen süper joker
    if (pendingSuper > 0) {
      var used = false;
      if (Q.mode === 'mc') { if (removeWrong(1)) { Q.removedBySuper++; used = true; } }
      else if (revealLetter()) { Q.superLetters++; used = true; }
      if (used) {
        pendingSuper = 0;
        pushFeed('Süper joker devrede: ' + (Q.mode === 'mc' ? 'bir yanlış şık silindi!' : 'bir harf açıldı!'), { icon: '⚡', col: '#4cc9f0', prio: 1 });
        LG.sfx('zap');
      }
    }
  }

  function goSuspense() {
    if (!Q || (phase !== 'ask' && phase !== 'intro')) return;
    Q.left = 0;
    drumN = 0;
    setTempo(false);
    setPhase('suspense');
  }

  function doReveal() {
    Q.revealedAt = now();
    setPhase('reveal');
    var bestStreak = null;
    function bump(u, ok) {
      var s = ok ? (streak.get(u.id) || 0) + 1 : 0;
      streak.set(u.id, s);
      if (ok && s >= 3 && (!bestStreak || s > bestStreak.s)) bestStreak = { u: u, s: s };
    }
    if (Q.mode === 'mc') {
      var ci = Q.correctIdx, correct = [];
      Q.answers.forEach(function (a) {
        if (a.opt === ci) {
          var bonus = Math.round(100 * clamp(1 - a.t / Q.baseDur, 0, 1));
          a.pts = (100 + bonus) * Q.mult;
          addScore(a.user, a.pts, a.t);
          correct.push(a);
          bump(a.user, true);
        } else bump(a.user, false);
      });
      correct.sort(function (x, y) { return x.t - y.t; });
      Q.correct = correct;
      Q.first = correct[0] || null;
      // isim şeridi: artık en hızlı doğru bilenleri gösterir
      Q.tickQ = [];
      Q.tick = correct.slice(0, 10).map(function (a, i) { return { user: a.user, opt: ci, ok: true, at: now() + i * 0.06, x: -1 }; });
      var oy = OPT.y + ci * (OPT.h + OPT.gap) + OPT.h / 2;
      if (correct.length) {
        LG.sfx('correct'); LG.sfx('clap');
        ui.burst(W / 2, oy, { count: 70, speed: 750, up: 300 });
        ui.shake(7, 0.25);
      } else LG.sfx('wrong');
    } else {
      Q.guessers.forEach(function (u, id) { bump(u, Q.solved.has(id)); });
      if (Q.winners.length) { LG.sfx('correct'); LG.sfx('clap'); ui.burst(W / 2, SLOT_Y + 60, { count: 60, speed: 700 }); }
      else LG.sfx('wrong');
    }
    if (bestStreak) {
      pushFeed(bestStreak.u.name + ' ' + bestStreak.s + ' soru üst üste bildi! 🔥', { icon: '🔥', col: '#ff9f1c', prio: 1 });
      LG.sfx('levelup');
    }
  }

  function startPodium() {
    setPhase('podium');
    hintAnchor = now();
    Q = null;
    setTempo(false);
    var top = rankTop(5, true);
    podium = { top: top, players: roundPlayers.size, boomed: false, stage: 0 };
    LG.music.play('party');
    LG.sfx('drum');
  }

  function setTempo(up) {
    if (up === tempoUp) return;
    tempoUp = up;
    LG.music.setTempo(up ? 1.3 : 1);
  }

  // ---------------------------------------------------------------------------
  // Jokerler
  // ---------------------------------------------------------------------------
  function removeWrong(n) {
    if (!Q || Q.mode !== 'mc') return 0;
    var cand = Q.opts.filter(function (o) { return !o.correct && !o.removed; });
    if (cand.length <= 1) return 0; // en az bir yanlış şık kalsın
    var k = Math.min(n, cand.length - 1);
    // önce en az oy alanları sil (kimsenin kararını gereksiz bozmasın)
    LG.shuffle(cand).sort(function (a, b) { return a.votes - b.votes; });
    for (var i = 0; i < k; i++) { cand[i].removed = true; cand[i].remT = 0; }
    ui.shake(5, 0.2);
    return k;
  }
  function revealLetter() {
    if (!Q || Q.mode === 'mc') return false;
    var open = 0, hidden = [];
    for (var i = 0; i < Q.rev.length; i++) {
      if (Q.rev[i] > 0) open++;
      else if (Q.rev[i] === 0) hidden.push(i);
    }
    if (!hidden.length || open >= Q.maxReveal) return false;
    var idx = LG.pick(hidden);
    Q.rev[idx] = now();
    if (Q.tiles) {
      for (var k = 0; k < Q.tiles.length; k++) if (!Q.tiles[k].used && Q.tiles[k].ch === Q.letters[idx]) { Q.tiles[k].used = true; break; }
    }
    LG.sfx('bell');
    return true;
  }

  // ---------------------------------------------------------------------------
  // Bildirim şeridi + büyük afiş kuyruğu
  // ---------------------------------------------------------------------------
  function pushFeed(text, o) {
    o = o || {};
    if (o.key) {
      for (var i = 0; i < feed.length; i++) if (feed[i].key === o.key) { feed[i].count++; feed[i].text = o.mk(feed[i]); return; }
    }
    var f = { text: text, icon: o.icon || '•', col: o.col || '#fff', prio: o.prio || 0, key: o.key, mk: o.mk, count: 1, first: o.first };
    if (feed.length >= 5) {
      var drop = -1;
      for (var j = 0; j < feed.length; j++) if (feed[j].prio === 0) { drop = j; break; }
      feed.splice(drop >= 0 ? drop : 0, 1);
    }
    feed.push(f);
  }
  function pushBanner(b) {
    for (var i = 0; i < banners.length; i++) {
      if (b.user && banners[i].user === b.user && banners[i].title === b.title) { banners[i].combo = (banners[i].combo || 1) + 1; return; }
    }
    b.prio = b.prio || 1;
    if (banners.length >= 4) {
      // kuyruk doluysa en düşük öncelikli en eski afişi at (büyük hediye kutlaması asla kaybolmasın)
      var lo = -1;
      for (var j = 0; j < banners.length; j++) if (lo < 0 || banners[j].prio < banners[lo].prio) lo = j;
      if (banners[lo].prio > b.prio) return;
      banners.splice(lo, 1);
    }
    b.dur = b.dur || 2.6;
    // yüksek öncelikli afiş sıranın önüne geçer
    var at = banners.length;
    while (at > 0 && banners[at - 1].prio < b.prio) at--;
    banners.splice(at, 0, b);
  }

  // ---------------------------------------------------------------------------
  // Olaylar
  // ---------------------------------------------------------------------------
  function joinMsg(f) { return f.count > 1 ? f.first + ' ve ' + (f.count - 1) + ' kişi daha aramıza katıldı!' : f.first + ' aramıza katıldı, hoş geldin!'; }

  LG.on('chat', function (e) {
    var u = e.user;
    if (!u) return;
    if (e.isNew) pushFeed(u.name + ' aramıza katıldı, hoş geldin!', { icon: '👋', col: '#b8f2ff', key: 'join', prio: 0, first: u.name, mk: joinMsg });
    if (!Q || (phase !== 'intro' && phase !== 'ask')) return;
    if (Q.mode === 'mc') answerMC(u, e);
    else answerWord(u, e);
  });

  var LETTERS = ['a', 'b', 'c', 'd'];
  function pickChoice(e) {
    var toks = tokens(e.raw), n = toks.join(' ');
    var idx = -1;
    if (toks.length <= 4) {
      // "b", "B!", "bence b", "c şıkkı", "cevap: d" — iki farklı harf ("a b") geçersiz
      for (var i = 0; i < toks.length; i++) {
        var k = LETTERS.indexOf(toks[i]);
        if (k >= 0) { if (idx >= 0 && idx !== k) return -1; idx = k; }
      }
    } else idx = LETTERS.indexOf(toks[0]); // uzun yorumda yalnız ilk kelime
    if (idx >= 0) return idx;
    // şıkkın kendisi yazıldıysa
    var hit = -1;
    for (var j = 0; j < Q.opts.length; j++) {
      var on = Q.opts[j].norm;
      if (on.length >= 2 && (n === on || (on.length >= 4 && (' ' + n + ' ').indexOf(' ' + on + ' ') >= 0))) { if (hit >= 0) return -1; hit = j; }
    }
    if (hit >= 0) return hit;
    // sadece sayı yazıldıysa (ör. "100" → "100 °C")
    if (/^-?\d+$/.test(n)) {
      var v = parseInt(n, 10), m = -1;
      for (var q = 0; q < Q.opts.length; q++) if (Q.opts[q].num === v) { if (m >= 0) return -1; m = q; }
      return m;
    }
    return -1;
  }

  function answerMC(u, e) {
    if (Q.answers.has(u.id)) return; // ilk cevap geçerli
    var idx = pickChoice(e);
    if (idx < 0) return;
    var o = Q.opts[idx];
    if (o.removed) return;
    var t = phase === 'ask' ? Q.t : 0;
    Q.answers.set(u.id, { user: u, opt: idx, t: t });
    Q.total++;
    o.votes++;
    o.voters.push(u); if (o.voters.length > 5) o.voters.shift();
    o.pulse = 1;
    Q.recent.unshift(u); if (Q.recent.length > 3) Q.recent.length = 3;
    Q.lastVoteT = now();
    roundPlayers.add(u.id);
    // isim şeridine sıraya koy (kalabalıkta en yenileri tutulur)
    Q.tickQ.push({ user: u, opt: idx, ok: false });
    if (Q.tickQ.length > 8) Q.tickQ.shift();
    LG.sfx('pop', { gap: 110 });
  }

  // Tek yorumda birden çok aday cevap ("rize trabzon ordu giresun") → toplu tahmin, kabul edilmez
  function isShotgun(toks) {
    var set = DECOYS[Q.mode];
    if (!set) return false;
    for (var i = 0; i < toks.length; i++) {
      if (set.has(toks[i]) && Q.accept.indexOf(toks[i]) < 0) return true;
    }
    return false;
  }
  function answerWord(u, e) {
    if (Q.solved.has(u.id)) return;
    var c = compact(e.raw);
    if (!c) return;
    Q.guessers.set(u.id, u);
    roundPlayers.add(u.id);
    var toks = tokens(e.raw);
    var ok = false;
    if (!isShotgun(toks)) {
      var shortMsg = toks.length <= Q.nWords + 2;
      for (var i = 0; i < Q.accept.length && !ok; i++) {
        var a = Q.accept[i];
        if (!a) continue;
        // "kirpidir", "61 trabzon", "65 van", "cevap: kirpi" kabul; uzun cümle içinde geçmesi kabul değil
        if (c === a || (a.length >= 4 && shortMsg && c.indexOf(a) >= 0)) ok = true;
        else if (shortMsg) for (var ti = 0; ti < toks.length; ti++) if (toks[ti] === a) { ok = true; break; }
      }
    }
    if (ok) {
      Q.solved.add(u.id);
      if (Q.winners.length < 3) {
        var rank = Q.winners.length;
        var pts = WIN_PTS[rank] * Q.mult;
        addScore(u, pts, phase === 'ask' ? Q.t : 0);
        Q.winners.push({ user: u, pts: pts, t: phase === 'ask' ? Q.t : 0, at: now() });
        var wx = winX(rank) + 155;
        ui.burst(wx, WIN_Y + 60, { count: rank === 0 ? 50 : 30, speed: 600 });
        ui.float('+' + pts, wx, WIN_Y + 10, { color: '#ffc233', size: 48 });
        if (rank === 0) { LG.sfx('correct'); ui.shake(8, 0.3); } else LG.sfx('coin');
        if (Q.winners.length === 3 && phase === 'ask' && Q.left > 4) { Q.left = 4; Q.closing = true; }
      } else {
        Q.late++;
        addScore(u, LATE_PTS * Q.mult, phase === 'ask' ? Q.t : 0);
        addGuess(u, null, true);
        LG.sfx('pop');
      }
    } else if (!e.flagged && e.text) {
      addGuess(u, e.text, false);
    }
  }
  // Tahmin kartları: sakin yayında anında, kalabalıkta saniyede ~6 tane (her isim okunabilsin)
  function addGuess(u, text, ok) {
    var gq = { user: u, text: text ? trunc(text.trim(), 13) : '', ok: ok };
    if (ok) {
      // doğru bilenler öne
      var k = 0; while (k < Q.guessQ.length && Q.guessQ[k].ok) k++;
      Q.guessQ.splice(k, 0, gq);
    } else Q.guessQ.push(gq);
    if (Q.guessQ.length > 10) {
      var drop = -1;
      for (var j = 0; j < Q.guessQ.length; j++) if (!Q.guessQ[j].ok) { drop = j; break; }
      Q.guessQ.splice(drop >= 0 ? drop : 0, 1);
    }
  }
  function flushQueues() {
    var t = now();
    if (Q.guessQ.length && t - Q.lastGuess >= 0.16) {
      var gq = Q.guessQ.shift(); gq.at = t;
      Q.guesses.unshift(gq); if (Q.guesses.length > 6) Q.guesses.length = 6;
      Q.lastGuess = t;
    }
    if (Q.tickQ.length && t - Q.lastTick >= 0.14 && Q.revealedAt == null) {
      var tk = Q.tickQ.pop(); // en yenisi
      if (Q.tickQ.length > 4) Q.tickQ.splice(0, Q.tickQ.length - 4);
      tk.at = t; tk.x = -1;
      Q.tick.unshift(tk); if (Q.tick.length > 9) Q.tick.length = 9;
      Q.lastTick = t;
    }
  }

  function armJoker(byHost) {
    joker.v = 1; joker.armed = true; joker.pulse = 1;
    pushBanner({ icon: '🃏', title: byHost ? 'Sunucudan joker hediyesi!' : 'Beğenileriniz jokeri açtı!', sub: 'Sıradaki çoktan seçmeli soruda YARI YARIYA ❤️', col: '#ff4d6d', dur: 3 });
    LG.sfx('levelup');
    ui.burst(895, TOP.y + 60, { count: 40, speed: 500, colors: ['#ff4d6d', '#ffc233', '#ffffff'] });
  }
  LG.on('like', function (e) {
    joker.heartT += 1;
    if (!joker.armed) {
      joker.v += e.count / joker.target;
      if (joker.v >= 1) armJoker(false);
    }
  });
  // Büyük kutlama izni (ortak spotlightAllowed bu hediyeyi de jetona saydığı için tek seferde
  // 5000+ jetonluk hediye hiç kutlanmıyordu; burada hediyeden ÖNCEKİ toplam kullanılır).
  function bigAllowed(u, g) {
    if (g.tier < 3) return true;
    if (LG.spotlightMuted && LG.spotlightMuted.has(u.id)) return false;
    var cap = LG.config.softcap;
    if (cap > 0 && u.coins - g.total > cap) {
      if (!capThanked.has(u.id)) { capThanked.add(u.id); pushFeed(u.name + ', efsanesin! Çok teşekkürler 💖', { icon: '👑', col: '#ffd166', prio: 1 }); }
      return false;
    }
    var n = performance.now() / 1000, last = spotLast.get(u.id);
    if (last != null && n - last < (LG.config.spotlightCooldown || 25)) return false;
    spotLast.set(u.id, n);
    return true;
  }
  function thanksFeed(u, g, em, extra) {
    pushFeed(u.name + ', ' + g.name + (g.count > 1 ? ' x' + g.count : '') + ' için teşekkürler! 💖' + (extra || ''), { icon: em, col: '#ffd6e0', prio: 1, key: 'thx', first: u.name,
      mk: function (f) { return f.first + ' ve ' + (f.count - 1) + ' kişiye teşekkürler! 💖'; } });
  }
  LG.on('gift', function (e) {
    var g = e.gift, u = e.user;
    if (!u) return;
    var tier = g.tier, em = LG.giftEmoji(g);
    if (tier <= 1) {
      thanksFeed(u, g, em);
      for (var k = 0; k < Math.min(3, g.count); k++) ui.float('❤', LG.rand(160, 920), LG.rand(1020, 1110), { color: '#ff4d6d', size: 50, vy: -170, life: 1.8 });
      LG.sfx('heart');
      return;
    }
    var res = applySuper();
    var dbl = false;
    if (tier >= 4 && !pendingDouble) { pendingDouble = u; dbl = true; }
    var big = bigAllowed(u, g);
    var subSuper = res === 'mc' ? 'Herkes için bir yanlış şık silindi ✂️' : res === 'letter' ? 'Herkese bir harf açıldı 🔤' : res === 'pending' ? 'Sıradaki soruda herkese süper joker ⚡' : '';
    var shortRes = res === 'mc' ? ' ✂️ 1 şık gitti' : res === 'letter' ? ' 🔤 1 harf açıldı' : res === 'pending' ? ' ⚡ sıradaki soruya joker' : '';
    if (tier >= 4 && big) {
      // büyük hediye: büyük teşekkür afişi (5+ kademede "kahraman" afişi)
      pushBanner({ icon: em, user: u, tier: tier, col: '#ffc233', dur: tier >= 5 ? 4 : 3, prio: tier >= 5 ? 3 : 2, hero: tier >= 5,
        title: tier >= 5 ? u.name + ' · ' + g.name + (g.count > 1 ? ' x' + g.count : '') : (dbl ? 'ÇİFTE PUAN TURU! 🎉' : u.name + ', çok teşekkürler! 💖'),
        sub: tier >= 5 ? (dbl ? 'MUHTEŞEM! Sıradaki soru herkese x2 🎉' : 'MUHTEŞEMSİN! Çok teşekkürler 💖')
          : dbl ? u.name + ' sayesinde sıradaki soru herkese x2' : (subSuper || 'Çifte puan zaten sırada ⚡ Harikasın!') });
      if (res) pushFeed('Süper joker: ' + subSuper, { icon: '⚡', col: '#9be7ff', prio: 1 });
    } else if (res && big) {
      // joker gerçekten bir şey yaptıysa (soru başına 1 kez) mavi afiş
      pushBanner({ icon: em, user: u, tier: tier, col: '#38b6ff', title: 'SÜPER JOKER! ⚡ ' + u.name, sub: subSuper, prio: 1 });
    } else {
      // etkisi olmayan küçük hediyeler üst şeridi kapatmasın: ipucu şeridinde toplu teşekkür
      thanksFeed(u, g, em, shortRes ? ' ·' + shortRes : '');
      if (dbl) pushFeed('Çifte puan sırada: sıradaki soru herkese x2 ⚡', { icon: '⚡', col: '#ffc233', prio: 1 });
    }
    if (tier >= 5 && big) {
      LG.sfx('mega'); ui.rain({ count: tier >= 6 ? 240 : 150 }); ui.flash('#fff3b0', 0.35); ui.shake(16, 0.6);
      ui.burst(170, TOP.y + 60, { count: 8, speed: 650, shape: 'emoji', emoji: '⭐', size: 16, up: 420, life: 1.2 });
      ui.burst(910, TOP.y + 60, { count: 8, speed: 650, shape: 'emoji', emoji: '💖', size: 16, up: 420, life: 1.2 });
    } else if (tier >= 4) {
      LG.sfx('fanfare'); ui.burst(W / 2, TOP.y + 60, { count: 90, speed: 900 });
    } else {
      LG.sfx(res ? 'zap' : 'coin'); ui.burst(W / 2, TOP.y + 60, { count: res ? 30 : 12, speed: 600, colors: ['#38b6ff', '#9be7ff', '#ffffff'] });
    }
  });
  function applySuper() {
    if (Q && (phase === 'intro' || phase === 'ask')) {
      // aktif soru: soru başına en fazla 1 şık / 2 harf (oyun kolaylaşmasın)
      if (Q.mode === 'mc') {
        if (Q.removedBySuper < 1 && removeWrong(1)) { Q.removedBySuper++; return 'mc'; }
      } else if (Q.superLetters < 2 && revealLetter()) { Q.superLetters++; return 'letter'; }
      return null;
    }
    // soru arası (cevap gösterimi, kürsü): sıradaki soruya sakla
    if (pendingSuper < 1) { pendingSuper = 1; return 'pending'; }
    return null;
  }
  LG.on('follow', function (e) {
    if (!e.user) return;
    pushFeed(e.user.name + ' takip etti — hoş geldin! Jokere +%3', { icon: '➕', col: '#7dffcf', prio: 1, key: 'fol', first: e.user.name,
      mk: function (f) { return f.first + ' ve ' + (f.count - 1) + ' kişi takip etti — hoş geldiniz!'; } });
    if (!joker.armed) joker.v = Math.min(0.999, joker.v + 0.03);
    LG.sfx('heart');
  });
  LG.on('share', function (e) {
    if (!e.user) return;
    pushFeed(e.user.name + ' yayını paylaştı, teşekkürler! Jokere +%6', { icon: '↗️', col: '#9ad1ff', prio: 1, key: 'shr', first: e.user.name,
      mk: function (f) { return f.first + ' ve ' + (f.count - 1) + ' kişi paylaştı — teşekkürler!'; } });
    if (!joker.armed) joker.v = Math.min(0.999, joker.v + 0.06);
    LG.sfx('coin');
  });

  // ---------------------------------------------------------------------------
  // Sunucu kısayolları
  // ---------------------------------------------------------------------------
  LG.onKey('n', 'Sıradaki soruya hemen geç', function () {
    if (phase === 'podium') startRound(round + 1);
    else nextQuestion();
  });
  LG.onKey('b', 'Cevabı şimdi göster', function () { goSuspense(); });
  LG.onKey('k', 'Bu soruyu değiştir (aynı türde yenisi)', function () {
    if (Q && (phase === 'intro' || phase === 'ask' || phase === 'suspense')) replaceQuestion();
  });
  LG.onKey('t', 'Süreye +10 saniye ekle', function () {
    if (Q && (phase === 'intro' || phase === 'ask')) {
      Q.left += 10; Q.dur = Math.max(Q.dur, Q.left); Q.closing = false;
      pushFeed('Sunucu süreye +10 saniye ekledi', { icon: '⏱️', col: '#ffe08a', prio: 1 });
      LG.sfx('coin');
    }
  });
  LG.onKey('j', 'Beğeni jokerini hemen doldur', function () {
    if (!joker.armed) armJoker(true);
  });
  LG.onKey('r', 'Yeni tur başlat (puanlar sıfırlanır)', function () { startRound(round + 1); });

  // ---------------------------------------------------------------------------
  // Simülatör yorumları
  // ---------------------------------------------------------------------------
  var CHATTER = ['bildim!', 'kolaydı 😎', 'zormuş ya', 'bir daha!', 'selam herkese', 'süper oyun', '😂😂', 'hadi hadi', 'yetiştim mi?', 'ilk ben!', 'çok güzel', 'sıradaki soru 🔥'];
  var PLATE_NAMES = D.plates.map(function (p) { return p[1]; });
  function variant(ans) {
    var r = Math.random();
    if (r < 0.35) return ans;
    if (r < 0.6) return LG.cmd.norm(ans);
    if (r < 0.75) return trUpper(ans);
    if (r < 0.88) return ans.replace(/ /g, '');
    return ans + ' !';
  }
  LG.sim.genComment = function () {
    if (!Q || (phase !== 'intro' && phase !== 'ask')) return LG.pick(CHATTER);
    if (Math.random() < 0.08) return LG.pick(CHATTER);
    if (Q.mode === 'mc') {
      var live = [];
      for (var i = 0; i < 4; i++) if (!Q.opts[i].removed) live.push(i);
      var idx = Math.random() < 0.55 ? Q.correctIdx : LG.pick(live);
      var l = 'abcd'[idx], f = Math.random();
      if (f < 0.55) return l;
      if (f < 0.7) return l.toUpperCase();
      if (f < 0.8) return l + ' şıkkı';
      if (f < 0.88) return 'bence ' + l;
      return Q.opts[idx].text;
    }
    var open = 0; for (var k = 0; k < Q.rev.length; k++) if (Q.rev[k] > 0) open++;
    var pc = 0.05 + 0.4 * clamp(Q.t / Q.baseDur, 0, 1) + 0.3 * open / Math.max(1, Q.nLetters);
    if (Math.random() < pc) return variant(Q.answer);
    if (Q.mode === 'word') {
      var same = D.word.filter(function (w) { return w[0] === Q.cat && w[1] !== Q.answer; });
      return LG.pick(same.length ? same : D.word)[1];
    }
    if (Q.mode === 'emoji') return LG.pick(D.emoji)[1];
    return LG.pick(PLATE_NAMES);
  };
  LG.sim.comments = [['a', 3], ['b', 3], ['c', 3], ['d', 3], ['bildim!', 1], ['selam', 1]];

  // ---------------------------------------------------------------------------
  // Güncelleme
  // ---------------------------------------------------------------------------
  function update(dt) {
    phaseT += dt;
    switch (phase) {
      case 'intro':
        if (phaseT >= INTRO_T) beginAsk();
        break;
      case 'ask':
        Q.t += dt; Q.left -= dt;
        if (Q.mode !== 'mc' && Q.t >= Q.nextHint) { revealLetter(); Q.nextHint += 5; }
        var sec = Math.ceil(Q.left);
        if (sec !== lastSec) {
          lastSec = sec;
          if (sec <= 5 && sec >= 1) { LG.sfx('countdown'); Q.ring = 1; }
        }
        setTempo(Q.left <= 5);
        if (Q.left <= 0) goSuspense();
        break;
      case 'suspense':
        var sl = Q.mode === 'mc' ? SUSP_MC : SUSP_W;
        var beat = Math.floor(phaseT / 0.22);
        if (beat >= drumN && phaseT < sl - 0.1) { drumN = beat + 1; LG.sfx('drum'); }
        if (phaseT >= sl) doReveal();
        break;
      case 'reveal':
        if (phaseT >= (Q.mode === 'mc' ? REVEAL_MC : REVEAL_W)) nextQuestion();
        break;
      case 'podium':
        updatePodium();
        if (phaseT >= PODIUM_T) startRound(round + 1);
        break;
      case 'roundIntro':
        var c = Math.ceil(RINTRO_T - 0.6 - phaseT);
        if (c !== introCount && c >= 1 && c <= 3) { introCount = c; LG.sfx('countdown'); }
        if (phaseT >= RINTRO_T) nextQuestion();
        break;
    }
    if (Q) {
      flushQueues();
      if (Q.mode === 'mc') updateTicker(dt);
      Q.ring = Math.max(0, Q.ring - dt * 3);
      if (Q.mode === 'mc') {
        for (var i = 0; i < 4; i++) {
          var o = Q.opts[i];
          var tgt = Q.total ? o.votes / Q.total : 0;
          o.shown += (tgt - o.shown) * Math.min(1, dt * 6);
          o.pulse = Math.max(0, o.pulse - dt * 3);
          if (o.removed) o.remT += dt;
        }
      }
    }
    // joker çubuğu
    joker.shown += (joker.v - joker.shown) * Math.min(1, dt * 5);
    joker.pulse = Math.max(0, joker.pulse - dt * 0.8);
    if (joker.heartT > 0) {
      joker.heartT = Math.min(joker.heartT, 4) - dt * 6;
      if (Math.random() < dt * 9) ui.float('❤', LG.rand(780, 1010), TOP.y + 70, { color: '#ff4d6d', size: 30, vy: -60, life: 0.9 });
    }
    // afiş
    if (!banner && banners.length) {
      banner = banners.shift(); banner.t = 0;
      if (banners.length >= 2) banner.dur = Math.min(banner.dur, 1.9);
    }
    if (banner) { banner.t += dt; if (banner.t >= banner.dur) banner = null; }
    // bildirim şeridi
    if (feedCur) { feedT += dt; if (feedT >= feedCur.dur) { feedCur = null; lastFeedEnd = now(); } }
    // Bildirimler ipucu şeridini tamamen kapatmasın: her bildirimden sonra en az bir ipucu
    // satırı görünür; yeni sorunun ilk saniyelerinde ise sadece "nasıl oynanır" ipucu görünür.
    var hold = (phase === 'intro') || (phase === 'ask' && Q && Q.t < 3.2);
    if (!feedCur && feed.length && !hold && now() - lastFeedEnd > 2.9) {
      var nxIdx = 0;
      for (var fi = 0; fi < feed.length; fi++) if (feed[fi].prio > 0) { nxIdx = fi; break; }
      feedCur = feed.splice(nxIdx, 1)[0]; feedT = 0;
      feedCur.dur = 2.4;
    }
    // liderlik animasyonu
    lbTop = rankTop(5);
    for (var r = 0; r < lbTop.length; r++) {
      var id = lbTop[r].user.id;
      var tx = lbSlotX(r);
      var p = lbPos.get(id);
      if (!p) { p = { x: tx, born: now() }; lbPos.set(id, p); }
      p.x += (tx - p.x) * Math.min(1, dt * 7);
      p.seen = now();
    }
    if (lbPos.size > 40) lbPos.forEach(function (v, k) { if (now() - v.seen > 2) lbPos.delete(k); });
    // ambiyans
    for (var s = 0; s < sparkles.length; s++) {
      var sp = sparkles[s];
      sp.y -= sp.v * dt;
      if (sp.y < -20) { sp.y = H + 20; sp.x = Math.random() * W; }
    }
  }

  function updatePodium() {
    if (!podium) return;
    var t = phaseT;
    if (podium.stage === 0 && t > 0.5) { podium.stage = 1; LG.sfx('drum'); }
    if (podium.stage === 1 && t > 1.0) { podium.stage = 2; LG.sfx('drum'); }
    if (podium.stage === 2 && t > 1.6) {
      podium.stage = 3;
      LG.sfx('fanfare'); LG.sfx('win');
      ui.rain({ count: 200 });
      ui.shake(14, 0.5);
      ui.flash('#fff3b0', 0.3);
      if (podium.top[0]) ui.burst(W / 2, 700, { count: 120, speed: 1000 });
    }
    if (podium.stage === 3 && t > 3.2) { podium.stage = 4; LG.sfx('clap'); }
  }

  // ---------------------------------------------------------------------------
  // Çizim — arka plan
  // ---------------------------------------------------------------------------
  function buildBg() {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var b = c.getContext('2d');
    var g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#120838'); g.addColorStop(0.35, '#2a0f64'); g.addColorStop(0.7, '#1a1260'); g.addColorStop(1, '#070f3a');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    var r = b.createRadialGradient(W / 2, 640, 40, W / 2, 640, 900);
    r.addColorStop(0, 'rgba(150,100,255,0.45)'); r.addColorStop(1, 'rgba(150,100,255,0)');
    b.fillStyle = r; b.fillRect(0, 0, W, H);
    // nokta deseni
    b.fillStyle = 'rgba(255,255,255,0.05)';
    for (var y = 20; y < H; y += 54) for (var x = (y / 54 % 2) * 27 + 14; x < W; x += 54) { b.beginPath(); b.arc(x, y, 2.4, 0, TAU); b.fill(); }
    // dev soru işaretleri
    var cols = ['#ff4d6d', '#38b6ff', '#ffc233', '#1fd19a', '#b388ff'];
    b.textAlign = 'center'; b.textBaseline = 'middle';
    for (var i = 0; i < 16; i++) {
      b.save();
      b.translate(LG.rand(0, W), LG.rand(0, H));
      b.rotate(LG.rand(-0.5, 0.5));
      b.globalAlpha = LG.rand(0.05, 0.1);
      b.fillStyle = cols[i % cols.length];
      b.font = ui.font(LG.rand(120, 280), 900);
      b.fillText(i % 3 === 0 ? '!' : '?', 0, 0);
      b.restore();
    }
    // sahne zemini (alt dekor)
    var fl = b.createLinearGradient(0, 1300, 0, H);
    fl.addColorStop(0, 'rgba(0,0,0,0)'); fl.addColorStop(1, 'rgba(0,0,0,0.45)');
    b.fillStyle = fl; b.fillRect(0, 1300, W, H - 1300);
    for (var k = 0; k < 7; k++) {
      var lx = 80 + k * 153;
      var lg = b.createRadialGradient(lx, 1700, 4, lx, 1700, 160);
      lg.addColorStop(0, 'rgba(255,200,90,0.22)'); lg.addColorStop(1, 'rgba(255,200,90,0)');
      b.fillStyle = lg; b.fillRect(lx - 160, 1540, 320, 320);
    }
    return c;
  }
  function buildLogo() {
    var c = document.createElement('canvas');
    c.width = 420; c.height = 110;
    var b = c.getContext('2d');
    b.textAlign = 'left'; b.textBaseline = 'middle';
    b.font = ui.font(58, 900);
    var str = 'Bil Bakalım!';
    var tw = b.measureText(str).width;
    var x0 = (420 - tw - 62) / 2;
    b.lineJoin = 'round';
    b.lineWidth = 14; b.strokeStyle = '#1a0b46'; b.strokeText(str, x0, 58);
    var g = b.createLinearGradient(0, 22, 0, 90);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffc233'); g.addColorStop(1, '#ff7a1c');
    b.fillStyle = g; b.fillText(str, x0, 56);
    b.font = '52px ' + ui.EMOJI_FONT;
    b.fillStyle = '#000';
    b.fillText('🧠', x0 + tw + 8, 58);
    return c;
  }

  function drawBg(ctx, t) {
    ctx.drawImage(bgCanvas, 0, 0);
    // dönen ışık huzmeleri (kartın arkasında)
    ctx.save();
    ctx.translate(W / 2, 620);
    ctx.rotate(t * 0.06);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (var i = 0; i < 14; i++) {
      ctx.rotate(TAU / 14);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-70, -1100); ctx.lineTo(70, -1100); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // parıltılar
    for (var s = 0; s < sparkles.length; s++) {
      var sp = sparkles[s];
      var a = 0.25 + 0.35 * Math.sin(t * sp.f + sp.ph);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = sp.c;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // Çizim — üst şerit
  // ---------------------------------------------------------------------------
  function drawTop(ctx, t) {
    // Soru sayacı
    ui.panel(ctx, 40, TOP.y, 280, TOP.h, { r: 30, fill: 'rgba(12,6,40,0.72)', border: 'rgba(255,255,255,0.22)' });
    var label = phase === 'podium' ? '🏆 TUR ' + round + ' BİTTİ' : phase === 'roundIntro' ? '🎬 TUR ' + round : 'SORU ' + qNum + '/' + Q_PER_ROUND;
    ui.text(ctx, label, 180, TOP.y + 30, { size: 34, color: '#fff', maxWidth: 250 });
    for (var i = 0; i < Q_PER_ROUND; i++) {
      var dx = 180 + (i - 4.5) * 24, dy = TOP.y + 64;
      var done = phase === 'podium' || i < qNum - 1 || (i === qNum - 1 && phase === 'reveal');
      var cur = i === qNum - 1 && phase !== 'podium' && phase !== 'reveal';
      ctx.beginPath();
      ctx.arc(dx, dy, cur ? 8 + Math.sin(t * 6) * 1.5 : 7, 0, TAU);
      ctx.fillStyle = done ? '#ffc233' : cur ? '#ffffff' : 'rgba(255,255,255,0.22)';
      if (i === Q_PER_ROUND - 1 && !done && !cur) ctx.fillStyle = 'rgba(255,120,60,0.6)';
      ctx.fill();
    }
    // Logo
    var bob = Math.sin(t * 2.2) * 3;
    var sc = 1 + Math.sin(t * 1.6) * 0.015;
    ctx.save();
    ctx.translate(W / 2, TOP.y + TOP.h / 2 + bob);
    ctx.scale(sc, sc);
    ctx.drawImage(logoCanvas, -logoCanvas.width / 2, -logoCanvas.height / 2);
    ctx.restore();
    // Joker çubuğu
    var jx = 760, jw = 280;
    var armed = joker.armed;
    var glow = armed ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
    ui.panel(ctx, jx, TOP.y, jw, TOP.h, { r: 30, fill: armed ? 'rgba(90,10,40,0.82)' : 'rgba(12,6,40,0.72)', border: armed ? 'rgba(255,' + Math.round(120 + 100 * glow) + ',140,1)' : 'rgba(255,255,255,0.22)', lineWidth: armed ? 6 : 4 });
    emo(ctx, '🃏', jx + 36, TOP.y + 30, 32);
    ui.text(ctx, armed ? 'JOKER HAZIR!' : 'JOKER', jx + 62, TOP.y + 31, { size: 28, align: 'left', color: armed ? '#ffd6e0' : '#fff' });
    if (!armed) ui.text(ctx, '%' + Math.floor(joker.shown * 100), jx + jw - 20, TOP.y + 31, { size: 28, align: 'right', color: '#ffb3c1' });
    var bx = jx + 18, by = TOP.y + 54, bw = jw - 36, bh = 20;
    ui.roundRect(ctx, bx, by, bw, bh, 10); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    var fw = Math.max(bh, bw * clamp(joker.shown, 0, 1));
    ui.roundRect(ctx, bx, by, fw, bh, 10);
    var g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#ff4d6d'); g.addColorStop(1, '#ffc233');
    ctx.fillStyle = g; ctx.fill();
    ui.text(ctx, '❤️ beğen', bx + bw / 2, by + bh / 2 + 1, { size: 17, color: '#fff', strokeWidth: 3 });
  }

  // ---------------------------------------------------------------------------
  // Çizim — soru kartı
  // ---------------------------------------------------------------------------
  function cardH() { return Q && Q.mode === 'mc' ? MC_CARD_H : W_CARD_H; }

  function drawCard(ctx, t) {
    var h = cardH();
    var x = CARD.x, y = CARD.y, w = CARD.w;
    var cx = x + w / 2, cy = y + h / 2;
    var sx = 1, back = false, rot = 0, lift = 0;
    if (phase === 'intro') {
      var p = clamp(phaseT / 0.6, 0, 1);
      sx = Math.max(0.02, ease.outBack(p));
      lift = (1 - ease.outCubic(p)) * 40;
    }
    if (Q.revealedAt != null) {
      var rp = clamp((now() - Q.revealedAt) / 0.55, 0, 1);
      var c = Math.cos(rp * Math.PI);
      sx = Math.max(0.02, Math.abs(c)) * (1 + 0.06 * Math.sin(rp * Math.PI));
      back = rp >= 0.5;
    }
    if (phase === 'suspense') rot = Math.sin(phaseT * 40) * 0.006;
    ctx.save();
    ctx.translate(cx, cy + lift);
    ctx.rotate(rot);
    ctx.scale(sx, 1);
    ctx.translate(-cx, -cy);
    // gölge
    ui.roundRect(ctx, x + 6, y + 14, w, h, 38);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    // gövde
    ui.roundRect(ctx, x, y, w, h, 38);
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    if (back) { g.addColorStop(0, '#f2fff8'); g.addColorStop(1, '#d4f7e6'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ece6ff'); }
    ctx.fillStyle = g; ctx.fill();
    var hurry = phase === 'ask' && Q.left <= 5 && Math.sin(t * 12) > 0;
    ctx.lineWidth = hurry ? 9 : 6;
    ctx.strokeStyle = back ? '#1fd19a' : hurry ? '#ff4d6d' : MODES[Q.mode].col;
    ctx.stroke();
    if (!back) drawFront(ctx, x, y, w, h, t);
    else drawBack(ctx, x, y, w, h, t);
    ctx.restore();
    // mod rozeti (kartın üst kenarında)
    var chipX = x + 28, chipY = y - 24;
    ui.roundRect(ctx, chipX, chipY, Q.chipW, 48, 24);
    ctx.fillStyle = MODES[Q.mode].col; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke();
    ui.text(ctx, Q.chip, chipX + Q.chipW / 2, chipY + 25, { size: 26, color: '#fff', strokeWidth: 4, strokeColor: 'rgba(0,0,0,0.35)' });
    if (Q.mult > 1) {
      var mtxt = Q.double && Q.num === Q_PER_ROUND ? '🏁⚡ FİNAL + ÇİFTE x' + Q.mult : Q.double ? '⚡ ÇİFTE PUAN x' + Q.mult : '🏁 FİNAL x' + Q.mult;
      var mw = measure(mtxt, 26, 900) + 40;
      var mx = chipX + Q.chipW + 14;
      var pul = 1 + Math.sin(t * 7) * 0.04;
      ctx.save(); ctx.translate(mx + mw / 2, chipY + 24); ctx.scale(pul, pul);
      ui.roundRect(ctx, -mw / 2, -24, mw, 48, 24);
      ctx.fillStyle = '#ffc233'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ui.text(ctx, mtxt, 0, 1, { size: 26, color: INK, stroke: false });
      ctx.restore();
    }
    if (phase === 'intro' || phase === 'ask' || phase === 'suspense') drawTimer(ctx, t);
  }

  function drawTimer(ctx, t) {
    var frac = phase === 'intro' ? 1 : clamp(Q.left / Q.dur, 0, 1);
    var sec = phase === 'intro' ? Math.ceil(Q.left) : Math.max(0, Math.ceil(Q.left));
    var low = phase === 'ask' && Q.left <= 5;
    var s = 1 + Q.ring * 0.18;
    var tx = TIMER.x, ty = TIMER.y, r = TIMER.r;
    ctx.save();
    ctx.translate(tx, ty); ctx.scale(s, s);
    if (low) {
      ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, TAU);
      ctx.fillStyle = 'rgba(255,77,109,' + (0.25 + 0.25 * Math.sin(t * 12)) + ')'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = INK; ctx.fill();
    ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, TAU); ctx.stroke();
    ctx.strokeStyle = low ? '#ff4d6d' : frac < 0.5 ? '#ffc233' : '#1fd19a';
    ctx.beginPath(); ctx.arc(0, 0, r - 12, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
    ctx.restore();
    if (phase === 'suspense') emo(ctx, '🥁', tx, ty + 2, 52 * s);
    else ui.text(ctx, String(sec), tx, ty + 3, { size: 52 * s, color: low ? '#ffb3c1' : '#fff', stroke: false });
  }

  function drawFront(ctx, x, y, w, h, t) {
    var tx = x + (w - 150) / 2 + 10; // sağda sayaç var
    if (Q.mode === 'mc') {
      var lh = Q.size * 1.14;
      var total = Q.lines.length * lh;
      var top = y + 30 + (h - 30 - 58) / 2 - total / 2 + lh / 2 + 2;
      for (var i = 0; i < Q.lines.length; i++) txt(ctx, Q.lines[i], tx, top + i * lh, Q.size, INK, { maxWidth: w - 230 });
      // hız bonusu göstergesi (sayaç altında)
      if (phase === 'ask' || phase === 'intro') {
        var bon = Math.round(100 * clamp(1 - Q.t / Q.baseDur, 0, 1));
        ui.roundRect(ctx, TIMER.x - 46, TIMER.y + 70, 92, 34, 17);
        ctx.fillStyle = bon > 0 ? '#ffc233' : 'rgba(0,0,0,0.15)'; ctx.fill();
        txt(ctx, '⚡+' + bon, TIMER.x, TIMER.y + 88, 24, INK);
      }
      // alt satır
      ctx.save();
      ctx.globalAlpha = 0.9;
      ui.roundRect(ctx, x + 18, y + h - 52, w - 36, 38, 19);
      ctx.fillStyle = 'rgba(123,92,255,0.12)'; ctx.fill();
      ctx.restore();
      txt(ctx, '💬 Yaz: a · b · c · d', x + 40, y + h - 32, 27, '#5b45c9', { align: 'left' });
      var info = '🗳️ ' + LG.fmt(Q.total) + ' cevap';
      txt(ctx, info, x + w - 40, y + h - 32, 27, '#5b45c9', { align: 'right', maxWidth: w - 400 });
      return;
    }
    var col = MODES[Q.mode].col;
    if (Q.mode === 'word') {
      txt(ctx, Q.title, tx, y + 56, 40, INK, { maxWidth: w - 230 });
      var ce = (D.catEmoji || {})[Q.cat] || '💡';
      txt(ctx, 'İpucu: ' + ce + ' ' + Q.cat, tx, y + 110, 40, col, { maxWidth: w - 230 });
      // karışık harfler
      var n = Q.tiles.length, gap = 12;
      var s = Math.min(104, (w - 80 - (n - 1) * gap) / n);
      var sx0 = x + w / 2 - (n * s + (n - 1) * gap) / 2 + s / 2;
      for (var k = 0; k < n; k++) {
        var tl = Q.tiles[k];
        var bx = sx0 + k * (s + gap), by = y + 222 + Math.sin(t * 2.4 + tl.ph) * 6;
        var ang = Math.sin(t * 1.7 + tl.ph) * 0.06;
        ctx.save();
        ctx.translate(bx, by); ctx.rotate(ang);
        ctx.globalAlpha = tl.used ? 0.35 : 1;
        ui.roundRect(ctx, -s / 2 + 3, -s / 2 + 7, s, s * 1.08, 16); ctx.fillStyle = 'rgba(60,20,0,0.35)'; ctx.fill();
        ui.roundRect(ctx, -s / 2, -s / 2, s, s * 1.08, 16);
        var tg = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
        tg.addColorStop(0, tl.used ? '#ddd' : '#ffe08a'); tg.addColorStop(1, tl.used ? '#bbb' : '#ff9f1c');
        ctx.fillStyle = tg; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
        txt(ctx, tl.ch, 0, s * 0.06, s * 0.66, INK);
        ctx.restore();
      }
      var foot = Q.closing ? '🏁 İlk 3 belli oldu! Son saniyeler…' : '⏳ Her 5 saniyede bir harf açılır';
      txt(ctx, foot, x + w / 2, y + h - 34, 28, '#7a5a2a');
    } else if (Q.mode === 'emoji') {
      txt(ctx, Q.title, tx, y + 58, 42, INK, { maxWidth: w - 230 });
      var ne = Q.emojis.length;
      var es = ne >= 4 ? 120 : 140;
      var step = es * 1.25;
      var ex0 = x + w / 2 - (ne - 1) * step / 2;
      for (var j = 0; j < ne; j++) {
        var eb = Math.sin(t * 3 + j * 1.3) * 8;
        var esc = 1 + Math.sin(t * 2 + j) * 0.04;
        if (phase === 'intro') esc *= ease.outBack(clamp((phaseT - 0.3 - j * 0.12) / 0.4, 0, 1));
        ctx.beginPath(); ctx.arc(ex0 + j * step, y + 192, es * 0.62, 0, TAU);
        ctx.fillStyle = 'rgba(255,79,163,0.10)'; ctx.fill();
        emo(ctx, Q.emojis[j], ex0 + j * step, y + 196 + eb, es * esc);
      }
      var hint = 'İpucu: ' + Q.cat + ' · ' + (Q.nWords > 1 ? Q.nWords + ' kelime' : Q.nLetters + ' harf');
      txt(ctx, hint, x + w / 2, y + h - 34, 30, '#b0306f');
    } else {
      txt(ctx, Q.title, tx, y + 62, 48, INK, { maxWidth: w - 230 });
      drawPlate(ctx, x + w / 2, y + 196, 620, 140, Q.codeStr, true, t);
      txt(ctx, '💬 İlin adını yaz · İlk 3 doğru kazanır', x + w / 2, y + h - 34, 28, '#0f7d5c');
    }
  }

  function drawPlate(ctx, cx, cy, w, h, code, mask, t) {
    ctx.save();
    ctx.translate(cx, cy);
    if (mask) ctx.rotate(Math.sin(t * 1.5) * 0.015);
    ui.roundRect(ctx, -w / 2 + 6, -h / 2 + 10, w, h, 16); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    ui.roundRect(ctx, -w / 2, -h / 2, w, h, 16); ctx.fillStyle = '#fbfbfb'; ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = '#111'; ctx.stroke();
    // mavi şerit
    var sw = w * 0.11;
    ctx.save();
    ui.roundRect(ctx, -w / 2, -h / 2, w, h, 16); ctx.clip();
    ctx.fillStyle = '#1f4fd6'; ctx.fillRect(-w / 2, -h / 2, sw, h);
    ctx.restore();
    ui.text(ctx, 'TR', -w / 2 + sw / 2, h * 0.28, { size: h * 0.22, color: '#fff', stroke: false });
    ctx.font = ui.font(h * 0.62, 900);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    var rest = mask ? '  ? ? ?' : '';
    var cw = ctx.measureText(code).width, rw = ctx.measureText(rest).width;
    var x0 = -w / 2 + sw + (w - sw - cw - rw) / 2;
    ctx.fillStyle = '#111'; ctx.fillText(code, x0, h * 0.04);
    if (mask) { ctx.fillStyle = '#9aa0a6'; ctx.fillText(rest, x0 + cw, h * 0.04); }
    ctx.restore();
  }

  function drawBack(ctx, x, y, w, h, t) {
    var cx = x + w / 2;
    if (Q.mode === 'mc') {
      var o = Q.opts[Q.correctIdx];
      txt(ctx, '✅ DOĞRU CEVAP', cx, y + 42, 30, '#0a9f6b');
      txt(ctx, OPT_LET[Q.correctIdx] + ') ' + o.text, cx, y + 104, 64, INK, { maxWidth: w - 80 });
      if (Q.first) {
        var s1 = '⚡ İlk bilen: ' + Q.first.user.name + ' · ' + secs(Q.first.t) + ' · +' + Q.first.pts;
        var st = streak.get(Q.first.user.id) || 0;
        if (st >= 2) s1 += '  🔥' + st;
        var tw = Math.min(w - 160, measure(s1, 38, 800));
        ui.avatar(ctx, Q.first.user, cx - tw / 2 - 34, y + 170, 26, { ring: '#7b5cff', ringWidth: 4 });
        txt(ctx, s1, cx + 16, y + 170, 38, '#6a2be0', { maxWidth: w - 160 });
        var names = [];
        for (var i = 1; i < Math.min(Q.correct.length, 5); i++) names.push(Q.correct[i].user.name);
        var more = Q.correct.length - 1 - names.length;
        var s2 = '🎉 ' + Q.correct.length + ' kişi bildi' + (names.length ? ': ' + names.join(', ') : '') + (more > 0 ? ' +' + more : '');
        txt(ctx, s2, cx, y + 226, 30, '#335', { maxWidth: w - 70 });
      } else {
        txt(ctx, '😅 Bu soruyu kimse bilemedi!', cx, y + 170, 40, '#e63946');
        txt(ctx, 'Sıradaki soruda şansını dene 💪', cx, y + 224, 30, '#335');
      }
      return;
    }
    txt(ctx, '✅ CEVAP', cx, y + 44, 32, '#0a9f6b');
    var ans = trUpper(Q.answer);
    if (Q.mode === 'emoji') {
      var ne = Q.emojis.length;
      for (var j = 0; j < ne; j++) emo(ctx, Q.emojis[j], cx + (j - (ne - 1) / 2) * 84, y + 116, 66);
      txt(ctx, ans, cx, y + 204, 70, INK, { maxWidth: w - 80 });
    } else if (Q.mode === 'plate') {
      drawPlate(ctx, cx, y + 116, 300, 66, Q.codeStr, false, t);
      txt(ctx, ans, cx, y + 212, 74, INK, { maxWidth: w - 80 });
    } else {
      txt(ctx, ans, cx, y + 140, 104, INK, { maxWidth: w - 80 });
      txt(ctx, ((D.catEmoji || {})[Q.cat] || '') + ' ' + Q.cat, cx, y + 214, 36, '#7a5a2a');
    }
    var foot;
    if (Q.winners.length) {
      var med = ['🥇', '🥈', '🥉'], parts = [];
      for (var k = 0; k < Q.winners.length; k++) parts.push(med[k] + ' ' + Q.winners[k].user.name);
      foot = parts.join('   ') + (Q.late ? '   · +' + Q.late + ' kişi daha bildi' : '');
    } else foot = '😅 Bu sefer kimse bilemedi!';
    txt(ctx, foot, cx, y + h - 40, 32, Q.winners.length ? '#335' : '#e63946', { maxWidth: w - 70 });
  }

  // ---------------------------------------------------------------------------
  // Çizim — şıklar (çoktan seçmeli)
  // ---------------------------------------------------------------------------
  function drawOptions(ctx, t) {
    var revealed = Q.revealedAt != null && now() - Q.revealedAt > 0.3;
    for (var i = 0; i < 4; i++) {
      var o = Q.opts[i];
      var x = OPT.x, y = OPT.y + i * (OPT.h + OPT.gap), w = OPT.w, h = OPT.h;
      var off = 0, a = 1;
      if (phase === 'intro') {
        var p = clamp((phaseT - 0.25 - i * 0.09) / 0.45, 0, 1);
        off = (1 - ease.outBack(p)) * (i % 2 ? -1 : 1) * 1100;
      }
      if (o.removed) {
        var rp = clamp(o.remT / 0.5, 0, 1);
        a = 1 - 0.68 * rp;
        if (rp < 1) off += Math.sin(o.remT * 60) * 10 * (1 - rp);
      }
      var isC = revealed && o.correct;
      if (revealed && !o.correct) a = Math.min(a, 0.42);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(off, 0);
      var sc = 1 + o.pulse * 0.025 + (isC ? 0.03 + 0.015 * Math.sin(t * 8) : 0);
      ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
      if (isC) {
        ui.roundRect(ctx, x - 10, y - 10, w + 20, h + 20, (h + 20) / 2);
        ctx.fillStyle = 'rgba(31,209,154,' + (0.35 + 0.2 * Math.sin(t * 8)) + ')'; ctx.fill();
      }
      ui.roundRect(ctx, x, y, w, h, h / 2);
      ctx.fillStyle = isC ? 'rgba(10,70,50,0.92)' : 'rgba(14,8,48,0.82)'; ctx.fill();
      // oy çubuğu
      var fw = (w - 12) * clamp(o.shown, 0, 1);
      if (fw > 4) {
        ctx.save();
        ui.roundRect(ctx, x, y, w, h, h / 2); ctx.clip();
        ctx.globalAlpha *= 0.42;
        ctx.fillStyle = isC ? '#1fd19a' : OPT_COL[i];
        ctx.fillRect(x + 6, y + 6, fw, h - 12);
        ctx.restore();
      }
      ui.roundRect(ctx, x, y, w, h, h / 2);
      ctx.lineWidth = isC ? 7 : 4;
      ctx.strokeStyle = isC ? '#1fd19a' : OPT_COL[i];
      ctx.stroke();
      // harf rozeti
      ctx.beginPath(); ctx.arc(x + h / 2, y + h / 2, h / 2 - 10, 0, TAU);
      ctx.fillStyle = isC ? '#1fd19a' : OPT_COL[i]; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke();
      txt(ctx, OPT_LET[i], x + h / 2, y + h / 2 + 3, 46, INK);
      // metin
      ui.text(ctx, o.text, x + h + 14, y + h / 2 + 2, { size: 44, align: 'left', maxWidth: w - h - 300, color: '#fff' });
      if (!o.removed) {
        // yüzde
        var pct = Q.total ? Math.round(o.votes / Q.total * 100) : 0;
        ui.text(ctx, '%' + pct, x + w - 28, y + h / 2 + 2, { size: 38, align: 'right', color: isC ? '#b6ffe3' : '#ffe08a' });
        // son oy verenlerin minik avatarları
        var ax = x + w - 150;
        for (var v = o.voters.length - 1, n = 0; v >= 0 && n < 5; v--, n++) {
          ui.avatar(ctx, o.voters[v], ax - n * 26, y + h / 2, 19, { ringWidth: 3, ring: OPT_COL[i] });
        }
      }
      if (revealed) emo(ctx, o.correct ? '✅' : '❌', x + h - 16, y + 16, 34);
      ctx.restore();
      if (o.removed) {
        var rq = clamp(o.remT / 0.35, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 30, y + h / 2); ctx.lineTo(x + 30 + (w - 60) * rq, y + h / 2); ctx.stroke();
        ctx.restore();
        if (o.remT < 1.2) emo(ctx, '✂️', x + 30 + (w - 60) * rq, y + h / 2, 56);
        else ui.text(ctx, '✂️ ELENDİ', x + w - 40, y + h / 2 + 2, { size: 32, align: 'right', color: '#ffb3c1' });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // İsim şeridi (çoktan seçmeli): cevap veren herkesin adı ~1 sn içinde görünür;
  // cevap gösteriminde en hızlı doğru bilenler sıralanır.
  // ---------------------------------------------------------------------------
  function updateTicker(dt) {
    var x = TICK.x + 10 + (Q.revealedAt != null && Q.tick.length ? 160 : 0);
    for (var i = 0; i < Q.tick.length; i++) {
      var tk = Q.tick[i];
      if (!tk.w) tk.w = ui.nameTag(tk.user, 28).width + 48;
      if (tk.x < 0) tk.x = x - 50;
      tk.x += (x - tk.x) * Math.min(1, dt * 12);
      x += tk.w + 8;
    }
  }
  function drawTicker(ctx, t) {
    var y = TICK.y, h = TICK.h, rv = Q.revealedAt != null;
    ui.panel(ctx, TICK.x, y, TICK.w, h, { r: h / 2, fill: 'rgba(10,6,40,0.62)', border: rv ? 'rgba(31,209,154,0.6)' : 'rgba(255,255,255,0.16)', lineWidth: 3 });
    if (!Q.tick.length) {
      var msg = rv ? '😅 Bu soruyu bilen olmadı — sıradakinde sen bil!' : '💬 a, b, c ya da d yaz — adın burada görünsün!';
      ui.text(ctx, msg, TICK.x + TICK.w / 2, y + h / 2 + 1, { size: 30, color: 'rgba(255,255,255,0.85)', maxWidth: TICK.w - 40, strokeWidth: 4 });
      return;
    }
    ctx.save();
    ui.roundRect(ctx, TICK.x, y, TICK.w, h, h / 2); ctx.clip();
    if (rv) ui.text(ctx, '✅ Bilenler', TICK.x + 88, y + h / 2 + 1, { size: 29, color: '#7dffcf', strokeWidth: 4 });
    for (var i = 0; i < Q.tick.length; i++) {
      var tk = Q.tick[i];
      if (tk.x > TICK.x + TICK.w || !tk.w) break;
      var age = now() - tk.at;
      if (age < 0) continue;
      var sc = 0.6 + 0.4 * ease.outBack(clamp(age / 0.3, 0, 1));
      var cw = tk.w, ch = 46, cx = tk.x, cy = y + h / 2;
      var col = tk.ok ? '#1fd19a' : OPT_COL[tk.opt];
      ctx.save();
      ctx.globalAlpha = clamp(age / 0.18, 0, 1);
      ctx.translate(cx + cw / 2, cy); ctx.scale(sc, sc); ctx.translate(-(cx + cw / 2), -cy);
      ui.roundRect(ctx, cx, cy - ch / 2, cw, ch, ch / 2);
      ctx.fillStyle = tk.ok ? 'rgba(8,70,50,0.96)' : 'rgba(24,12,66,0.96)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
      ui.avatar(ctx, tk.user, cx + 23, cy, 18, { ringWidth: 3, ring: col });
      ui.drawNameTag(ctx, tk.user, cx + 42 + (cw - 48) / 2, cy + 1, 28);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Çizim — kelime modları: harf kutuları, ilk 3, tahminler
  // ---------------------------------------------------------------------------
  function winX(i) { return 60 + i * 325; }

  function drawSlots(ctx, t) {
    var s = Q.slotS;
    var rv = Q.revealedAt != null;
    for (var k = 0; k < Q.slots.length; k++) {
      var sl = Q.slots[k];
      var open = Q.rev[sl.i] > 0, at = Q.rev[sl.i];
      var finalOpen = rv && now() - Q.revealedAt > 0.2 + k * 0.05;
      var sx = 1, showCh = open || finalOpen;
      var fa = finalOpen && !open ? Q.revealedAt + 0.2 + k * 0.05 : at;
      if (showCh) {
        var p = clamp((now() - fa) / 0.35, 0, 1);
        sx = Math.max(0.05, Math.abs(Math.cos(p * Math.PI)));
        if (p < 0.5) showCh = false;
      }
      ctx.save();
      ctx.translate(sl.x, sl.y);
      ctx.scale(sx, 1);
      ui.roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.2);
      if (showCh) {
        var g = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
        if (finalOpen && !open) { g.addColorStop(0, '#b6ffe3'); g.addColorStop(1, '#1fd19a'); }
        else { g.addColorStop(0, '#fff3b0'); g.addColorStop(1, '#ffc233'); }
        ctx.fillStyle = g;
      } else ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = showCh ? '#fff' : 'rgba(255,255,255,0.35)'; ctx.stroke();
      if (showCh) txt(ctx, sl.ch, 0, s * 0.05, s * 0.68, INK);
      else txt(ctx, '?', 0, s * 0.04, s * 0.5, 'rgba(255,255,255,0.28)');
      ctx.restore();
    }
  }

  function drawWinners(ctx, t) {
    var med = ['🥇', '🥈', '🥉'];
    for (var i = 0; i < 3; i++) {
      var x = winX(i), y = WIN_Y, w = 310, h = WIN_H;
      var wn = Q.winners[i];
      if (!wn) {
        ctx.save();
        ui.roundRect(ctx, x, y, w, h, 26);
        ctx.fillStyle = 'rgba(10,6,40,0.55)'; ctx.fill();
        ctx.setLineDash([14, 10]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.stroke();
        ctx.restore();
        emo(ctx, med[i], x + 58, y + h / 2, 56, 0.55);
        ui.text(ctx, '+' + WIN_PTS[i] * Q.mult, x + 200, y + 46, { size: 40, color: 'rgba(255,224,138,0.75)' });
        ui.text(ctx, 'Sen ol!', x + 200, y + 92, { size: 28, color: 'rgba(255,255,255,0.6)' });
        continue;
      }
      var p = clamp((now() - wn.at) / 0.45, 0, 1);
      var sc = ease.outBack(p);
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
      ui.roundRect(ctx, x, y, w, h, 26);
      var g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, i === 0 ? '#5a3a00' : i === 1 ? '#3a3f55' : '#4a2a12'); g.addColorStop(1, 'rgba(10,6,40,0.9)');
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = i === 0 ? '#ffc233' : i === 1 ? '#d9e2f2' : '#e0a060'; ctx.stroke();
      ui.avatar(ctx, wn.user, x + 62, y + h / 2 + 4, 40, { ring: '#fff', ringWidth: 4 });
      emo(ctx, med[i], x + 30, y + 26, 40);
      ui.text(ctx, wn.user.name, x + 114, y + 40, { size: 30, align: 'left', maxWidth: w - 126 });
      ui.text(ctx, '+' + wn.pts, x + 114, y + 82, { size: 36, align: 'left', color: '#ffc233' });
      ui.text(ctx, '⚡ ' + secs(wn.t), x + 114, y + 112, { size: 22, align: 'left', color: 'rgba(255,255,255,0.75)' });
      ctx.restore();
    }
  }

  function drawGuesses(ctx) {
    var gs = Q.guesses;
    for (var i = 0; i < gs.length && i < 6; i++) {
      var gq = gs[i];
      var age = now() - gq.at;
      var a = clamp(1 - (age - 5) / 1.5, 0, 1) * clamp(age / 0.2, 0, 1);
      if (a <= 0) continue;
      var col = i % 3, row = Math.floor(i / 3);
      var x = 60 + col * 325, y = GUESS_Y + row * 44, w = 310, h = 38;
      ctx.save();
      ctx.globalAlpha = a;
      ui.roundRect(ctx, x, y, w, h, 19);
      ctx.fillStyle = gq.ok ? 'rgba(31,209,154,0.35)' : 'rgba(255,255,255,0.10)'; ctx.fill();
      ui.avatar(ctx, gq.user, x + 20, y + h / 2, 15, { ringWidth: 2 });
      var s = gq.ok ? gq.user.name + ' bildi! ✅' : gq.user.name + ': ' + gq.text;
      ui.text(ctx, s, x + 42, y + h / 2 + 1, { size: 24, align: 'left', maxWidth: w - 54, color: gq.ok ? '#d6fff0' : '#e8e4ff', strokeWidth: 3 });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Çizim — ipucu şeridi / bildirim, liderlik, afiş
  // ---------------------------------------------------------------------------
  function drawHint(ctx, y) {
    if (feedCur) {
      var p = feedT, d = feedCur.dur;
      var a = Math.min(1, p / 0.18, (d - p) / 0.25);
      var slide = (1 - ease.outCubic(clamp(p / 0.3, 0, 1))) * 40;
      ui.panel(ctx, HINT.x, y, HINT.w, HINT.h, { r: HINT.h / 2, fill: 'rgba(20,8,60,0.88)', border: feedCur.col, lineWidth: 4 });
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      emo(ctx, feedCur.icon, HINT.x + 44, y + HINT.h / 2 + slide, 38);
      ui.text(ctx, feedCur.text, HINT.x + HINT.w / 2 + 24, y + HINT.h / 2 + 2 + slide, { size: 33, color: feedCur.col, maxWidth: HINT.w - 110 });
      ctx.restore();
      return;
    }
    var lines = Q && phase !== 'podium' && phase !== 'roundIntro' ? HINTS[Q.mode] : HINTS.idle;
    // soru başında ilk satırdan ("💬 Cevabını yaz…") başlayan dönen ipucu
    var per = 2.9, el = Math.max(0, now() - hintAnchor);
    var li = Math.floor(el / per) % lines.length, lp = (el % per) / per;
    var la = lp < 0.08 ? lp / 0.08 : lp > 0.93 ? (1 - lp) / 0.07 : 1;
    if (el < per) la = Math.max(la, lp < 0.5 ? 1 : la);
    ui.panel(ctx, HINT.x, y, HINT.w, HINT.h, { r: HINT.h / 2, fill: 'rgba(10,6,40,0.74)', border: 'rgba(255,255,255,0.28)' });
    ui.text(ctx, lines[li], HINT.x + HINT.w / 2, y + HINT.h / 2 + 2, { size: 35, alpha: la, maxWidth: HINT.w - 50 });
  }

  function lbSlotX(i) { return LB.x + 110 + 89 + i * 178; }

  function drawBoard(ctx, t) {
    ui.panel(ctx, LB.x, LB.y, LB.w, LB.h, { r: 32, fill: 'rgba(10,6,40,0.74)', border: 'rgba(255,194,51,0.45)' });
    emo(ctx, '🏆', LB.x + 56, LB.y + 48, 50);
    ui.text(ctx, 'TUR ' + round, LB.x + 56, LB.y + 100, { size: 24, color: '#ffc233' });
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(LB.x + 108, LB.y + 16, 3, LB.h - 32);
    if (!lbTop.length) {
      ui.text(ctx, 'İlk puanı sen kap! 💬 Cevabını yorumlara yaz', LB.x + 110 + (LB.w - 110) / 2, LB.y + LB.h / 2, { size: 32, color: 'rgba(255,255,255,0.8)', maxWidth: LB.w - 150 });
      return;
    }
    var med = ['🥇', '🥈', '🥉'];
    for (var i = 0; i < lbTop.length; i++) {
      var e = lbTop[i], u = e.user;
      var pos = lbPos.get(u.id);
      var cx = pos ? pos.x : lbSlotX(i);
      var pop = pos ? ease.outBack(clamp((now() - pos.born) / 0.4, 0, 1)) : 1;
      ctx.save();
      ctx.translate(cx, LB.y + 44); ctx.scale(pop, pop);
      ui.avatar(ctx, u, 0, 0, 31, { ring: i === 0 ? '#ffc233' : '#fff', ringWidth: 4 });
      ctx.restore();
      if (i < 3) emo(ctx, med[i], cx - 38, LB.y + 20, 30);
      else ui.text(ctx, String(i + 1), cx - 38, LB.y + 22, { size: 26, color: '#ccc' });
      var st = streak.get(u.id) || 0;
      if (st >= 2) {
        ui.roundRect(ctx, cx + 14, LB.y + 6, 54, 28, 14); ctx.fillStyle = '#ff6a00'; ctx.fill();
        ui.text(ctx, '🔥' + st, cx + 41, LB.y + 21, { size: 20, color: '#fff', strokeWidth: 3 });
      }
      var tag = ui.nameTag(u, 22);
      var tw = Math.min(tag.width, 170);
      ctx.drawImage(tag, Math.round(cx - tw / 2), Math.round(LB.y + 88 - tag.height / 2), tw, tag.height);
      ui.text(ctx, LG.fmt(e.score), cx, LB.y + 114, { size: 25, color: '#ffc233', strokeWidth: 4 });
    }
  }

  function drawBanner(ctx, t) {
    if (!banner) return;
    var b = banner, d = b.dur, hero = !!b.hero;
    var inP = ease.outBack(clamp(b.t / 0.35, 0, 1));
    var outP = clamp((d - b.t) / 0.28, 0, 1);
    var x = 40, w = 1000, h = hero ? 128 : 88;
    var y = TOP.y - 4 - (1 - inP) * (h + 60) - (1 - ease.outCubic(outP)) * (h + 70);
    ctx.save();
    ctx.globalAlpha = clamp(outP * 3, 0, 1);
    if (hero) {
      // altın ışık huzmeleri (yalnız afiş bandında — soru kartının üstüne taşmaz)
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, Math.max(0, y + h + 6)); ctx.clip();
      ctx.translate(W / 2, y + h / 2);
      ctx.rotate(t * 0.5);
      ctx.fillStyle = 'rgba(255,215,90,0.16)';
      for (var r = 0; r < 12; r++) {
        ctx.rotate(TAU / 12);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -620); ctx.lineTo(60, -620); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ui.roundRect(ctx, x, y + 8, w, h, 30); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ui.roundRect(ctx, x, y, w, h, 30);
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    if (hero) { g.addColorStop(0, '#4a1a00'); g.addColorStop(0.5, '#8a4b00'); g.addColorStop(1, '#4a1a00'); }
    else { g.addColorStop(0, '#2a0f64'); g.addColorStop(0.5, '#3b1590'); g.addColorStop(1, '#2a0f64'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = hero ? 8 : 6; ctx.strokeStyle = hero ? 'hsl(' + (40 + Math.sin(t * 6) * 10) + ',100%,' + (60 + Math.sin(t * 9) * 10) + '%)' : b.col; ctx.stroke();
    // parıltı
    ctx.save(); ui.roundRect(ctx, x, y, w, h, 30); ctx.clip();
    var shx = x - 200 + ((b.t * 900) % (w + 400));
    var sg = ctx.createLinearGradient(shx - 80, 0, shx + 80, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,' + (hero ? 0.32 : 0.22) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
    ctx.restore();
    var ar = hero ? 50 : 36;
    var lx = x + ar + 22;
    if (b.user) ui.avatar(ctx, b.user, lx, y + h / 2, ar, { ring: hero ? '#ffd166' : b.col, ringWidth: hero ? 6 : 5 });
    var bob = Math.sin(t * 8) * 4;
    var es = hero ? 84 + Math.sin(t * 5) * 6 : 54;
    emo(ctx, b.icon || '🎉', b.user ? x + w - (hero ? 72 : 56) : lx, y + h / 2 + bob, es);
    var tx0 = b.user ? x + ar * 2 + 40 : x + 104;
    var title = b.title + (b.combo > 1 ? ' x' + b.combo : '');
    var mw = w - (tx0 - x) - (hero ? 140 : 100);
    if (hero) {
      ui.text(ctx, title, tx0, y + 44, { size: 44, align: 'left', color: '#fff3b0', maxWidth: mw, strokeWidth: 7 });
      ui.text(ctx, b.sub, tx0, y + 92, { size: 34, align: 'left', color: '#ffffff', maxWidth: mw });
    } else {
      ui.text(ctx, title, tx0, y + 30, { size: 35, align: 'left', color: b.col, maxWidth: mw });
      ui.text(ctx, b.sub, tx0, y + 65, { size: 28, align: 'left', color: '#fff', maxWidth: mw });
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Çizim — kürsü ve tur girişi
  // ---------------------------------------------------------------------------
  function drawCrown(ctx, x, y, s, c1, c2) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-42, 22); ctx.lineTo(-50, -20); ctx.lineTo(-24, 2); ctx.lineTo(0, -34); ctx.lineTo(24, 2); ctx.lineTo(50, -20); ctx.lineTo(42, 22); ctx.closePath();
    var g = ctx.createLinearGradient(0, -34, 0, 22);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(40,20,0,0.7)'; ctx.stroke();
    ctx.fillStyle = 'rgba(40,20,0,0.25)'; ctx.fillRect(-42, 10, 84, 10);
    var jw = [[-50, -20, '#ff4d6d'], [0, -34, '#38b6ff'], [50, -20, '#1fd19a']];
    for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(jw[i][0], jw[i][1], 7, 0, TAU); ctx.fillStyle = jw[i][2]; ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  var PODIUM_SLOTS = [
    { rank: 1, x: 250, h: 230, delay: 1.0, c1: '#eef3ff', c2: '#9aa8c4', crown: ['#ffffff', '#b8c4dc'] },
    { rank: 0, x: 540, h: 320, delay: 1.6, c1: '#ffe27a', c2: '#d98a00', crown: ['#fff3b0', '#ffb400'] },
    { rank: 2, x: 830, h: 170, delay: 0.5, c1: '#ffc58a', c2: '#a8581c', crown: ['#ffd2a6', '#c06a28'] },
  ];
  var PODIUM_BASE = 1104;

  function drawPodium(ctx, t) {
    var pt = phaseT;
    // ışık huzmeleri
    ctx.save();
    for (var k = 0; k < 2; k++) {
      var ox = k ? W + 40 : -40;
      var ang = Math.sin(t * 0.9 + k * 2) * 0.35 + (k ? -0.55 : 0.55);
      ctx.save();
      ctx.translate(ox, 240); ctx.rotate(ang);
      var lg = ctx.createLinearGradient(0, 0, 0, 1000);
      lg.addColorStop(0, 'rgba(255,240,180,0.28)'); lg.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.lineTo(190, 1000); ctx.lineTo(-190, 1000); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    var tp = ease.outBack(clamp(pt / 0.6, 0, 1));
    ctx.save();
    ctx.translate(W / 2, 408); ctx.scale(tp, tp);
    ui.text(ctx, '🏆 TUR ' + round + ' ŞAMPİYONLARI', 0, 0, { size: 66, color: '#ffc233', maxWidth: 980, strokeWidth: 12 });
    ctx.restore();
    var top = podium ? podium.top : [];
    if (!top.length) {
      ui.text(ctx, 'Bu tur puan alan olmadı 😅', W / 2, 640, { size: 56, color: '#fff' });
      ui.text(ctx, 'Yeni turda ilk puanı sen kap!', W / 2, 720, { size: 44, color: '#ffe08a' });
    } else {
      ui.text(ctx, 'Tebrikler! 🎉 ' + LG.fmt(podium.players) + ' kişi yarıştı', W / 2, 478, { size: 36, color: '#fff', alpha: clamp((pt - 0.4) / 0.4, 0, 1) });
    }
    for (var i = 0; i < PODIUM_SLOTS.length; i++) {
      var ps = PODIUM_SLOTS[i];
      var e = top[ps.rank];
      var gp = clamp((pt - ps.delay) / 0.7, 0, 1);
      var hh = ps.h * ease.outBack(gp);
      if (hh <= 1) continue;
      var bw = 270, bx = ps.x - bw / 2, by = PODIUM_BASE - hh;
      ui.roundRect(ctx, bx + 6, by + 10, bw, hh, 18); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
      ui.roundRect(ctx, bx, by, bw, hh + 20, 18);
      var g = ctx.createLinearGradient(0, by, 0, by + hh);
      g.addColorStop(0, ps.c1); g.addColorStop(1, ps.c2);
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.stroke();
      ctx.save(); ctx.globalAlpha = 0.28;
      ui.text(ctx, String(ps.rank + 1), ps.x, by + hh - 56, { size: 110, color: '#fff', stroke: false });
      ctx.restore();
      if (!e) { ui.text(ctx, '—', ps.x, by + 50, { size: 40, color: 'rgba(0,0,0,0.4)', stroke: false }); continue; }
      ui.text(ctx, e.user.name, ps.x, by + 42, { size: 36, color: '#fff', maxWidth: bw - 24, strokeWidth: 7 });
      ui.text(ctx, LG.fmt(e.score) + ' puan', ps.x, by + 88, { size: 32, color: '#2a1300', stroke: false });
      var ap = ease.outBack(clamp((pt - ps.delay - 0.45) / 0.45, 0, 1));
      if (ap <= 0) continue;
      var ar = ps.rank === 0 ? 80 : 66;
      var ay = by - ar - 18 + (ps.rank === 0 ? Math.sin(t * 3) * 6 : 0);
      ctx.save();
      ctx.translate(ps.x, ay); ctx.scale(ap, ap);
      if (ps.rank === 0) {
        var rg = ctx.createRadialGradient(0, 0, ar * 0.6, 0, 0, ar * 1.9);
        rg.addColorStop(0, 'rgba(255,215,0,0.55)'); rg.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, ar * 1.9, 0, TAU); ctx.fill();
      }
      ui.avatar(ctx, e.user, 0, 0, ar, { ring: ps.crown[1], ringWidth: 7 });
      drawCrown(ctx, 0, -ar - 26 + Math.sin(t * 4 + i) * 3, ps.rank === 0 ? 1.15 : 0.9, ps.crown[0], ps.crown[1]);
      ctx.restore();
    }
    // 4. ve 5.
    var rest = [];
    for (var r = 3; r < top.length; r++) rest.push((r + 1) + '. ' + top[r].user.name + ' (' + LG.fmt(top[r].score) + ')');
    var left = Math.max(0, Math.ceil(PODIUM_T - pt));
    if (rest.length) ui.text(ctx, rest.join('   ·   '), W / 2, PODIUM_BASE + 52, { size: 32, color: '#e8e4ff', maxWidth: 980 });
    ui.text(ctx, '🎬 Yeni tur ' + left + ' sn sonra başlıyor', W / 2, PODIUM_BASE + (rest.length ? 100 : 66), { size: 34, color: '#ffe08a' });
  }

  function drawRoundIntro(ctx, t) {
    var p = ease.outBack(clamp(phaseT / 0.5, 0, 1));
    var x = 90, y = 400, w = 900, h = 640;
    ctx.save();
    ctx.translate(W / 2, y + h / 2); ctx.scale(p, p); ctx.translate(-W / 2, -(y + h / 2));
    ui.roundRect(ctx, x + 6, y + 14, w, h, 44); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    ui.roundRect(ctx, x, y, w, h, 44);
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ece6ff');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = '#7b5cff'; ctx.stroke();
    txt(ctx, 'TUR ' + round, W / 2, y + 96, 110, '#7b5cff');
    txt(ctx, 'Hazır mısın? 10 soru, 4 oyun!', W / 2, y + 190, 44, INK);
    var rows = [['❓', 'Çoktan seçmeli — a/b/c/d yaz'], ['🔤', 'Kelime avı — harfleri sırala'], ['🧩', 'Emoji bilmece — ne anlatıyor?'], ['🚗', 'Plaka bilmecesi — hangi il?']];
    for (var i = 0; i < rows.length; i++) {
      var ry = y + 270 + i * 62;
      emo(ctx, rows[i][0], x + 120, ry, 44);
      txt(ctx, rows[i][1], x + 165, ry + 2, 36, '#3b2d7a', { align: 'left' });
    }
    var c = Math.ceil(RINTRO_T - 0.6 - phaseT);
    var cs = c >= 1 ? String(c) : 'BAŞLA!';
    var cp = 1 + 0.25 * (1 - ((RINTRO_T - 0.6 - phaseT) % 1));
    ctx.save(); ctx.translate(W / 2, y + h - 66); ctx.scale(cp, cp);
    txt(ctx, cs, 0, 0, 72, '#ff4d6d');
    ctx.restore();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Ana çizim
  // ---------------------------------------------------------------------------
  function render(ctx, t) {
    drawBg(ctx, t);
    ctx.save();
    ui.applyShake(ctx);
    drawTop(ctx, t);
    if (phase === 'podium') {
      drawPodium(ctx, t);
      drawHint(ctx, 1230);
    } else if (phase === 'roundIntro') {
      drawRoundIntro(ctx, t);
      drawHint(ctx, HINT.y);
      drawBoard(ctx, t);
    } else if (Q) {
      if (Q.mode === 'mc') { drawOptions(ctx, t); drawTicker(ctx, t); }
      else { drawSlots(ctx, t); drawWinners(ctx, t); drawGuesses(ctx); }
      drawCard(ctx, t);
      drawHint(ctx, HINT.y);
      drawBoard(ctx, t);
    }
    drawBanner(ctx, t);
    ctx.restore();
    ctx.fillStyle = '#000'; // ortak katmandaki emoji parçacıkları saydam dolguyu miras almasın
  }

  // Test/geliştirme kancası (yayında etkisi yok)
  window.BB_DEBUG = {
    state: function () { return { phase: phase, round: round, qNum: qNum, mode: Q && Q.mode, answer: Q && (Q.answer || (Q.opts && Q.opts[Q.correctIdx].text)), joker: joker.v, armed: joker.armed }; },
    jump: function (mode) { if (Q) { Q = makeQuestion(mode, qNum || 1); applyMult(Q); setPhase('intro'); } },
    reveal: goSuspense,
    podium: function () { qNum = Q_PER_ROUND; startPodium(); },
    next: nextQuestion,
    toQuestion: function (n) { qNum = n - 1; nextQuestion(); },
    newRound: function () { startRound(round + 1); },
    // forceQ('plate', 65) → 65 plakalı il sorusu; forceQ('emoji', 3) → 3. emoji bilmece
    forceQ: function (mode, n) {
      Q = makeQuestion(mode, qNum || 1, mode === 'plate' ? n - 1 : n); applyMult(Q); setPhase('ask');
    },
    tryAnswer: function (user, text) {
      LG.emit({ type: 'chat', user: user, text: text });
      var u = LG.user(user);
      return Q.mode === 'mc' ? (Q.answers.has(u.id) ? Q.answers.get(u.id).opt : -1) : Q.solved.has(u.id);
    },
  };

  LG.start({
    id: 'bil-bakalim',
    title: 'Bil Bakalım! 🧠',
    init: function () {
      bags.mc = new Bag('mc', D.mc.length);
      bags.word = new Bag('word', D.word.length);
      bags.emoji = new Bag('emoji', D.emoji.length);
      bags.plate = new Bag('plate', D.plates.length);
      bgCanvas = buildBg();
      logoCanvas = buildLogo();
      // toplu tahmin yakalayıcı: aynı türdeki tüm olası cevaplar (normalize, tek kelime)
      DECOYS.plate = new Set(); DECOYS.word = new Set();
      D.plates.forEach(function (p) { [p[1]].concat(p[2] || []).forEach(function (n) { DECOYS.plate.add(compact(n)); }); });
      D.word.forEach(function (w) { DECOYS.word.add(compact(w[1])); });
      var cols = ['#ffffff', '#ffe08a', '#b8f2ff', '#ffb3c1'];
      for (var i = 0; i < 46; i++) sparkles.push({ x: Math.random() * W, y: Math.random() * H, r: LG.rand(1.5, 3.8), v: LG.rand(8, 30), f: LG.rand(1, 3), ph: Math.random() * TAU, c: LG.pick(cols) });
      startRound(1);
    },
    update: update,
    render: render,
  });
})();
