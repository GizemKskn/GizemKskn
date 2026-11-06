/*
 * Simülatör: TikTok'a bağlanmadan oyunları test etmek için sahte izleyiciler.
 *   ?sim=1   panel açılır (S tuşu ile de açılır)
 *   ?demo=1  otomatik sahte izleyiciler başlar (D tuşu ile de)
 *   ?bots=80&rate=2  bot sayısı ve hız çarpanı
 * Oyunlar kendi örnek yorumlarını şöyle tanımlar:
 *   LG.sim.comments = [ ['kız', 3], ['erkek', 3], ['horon', 1] ];   // [metin, ağırlık]
 *   ya da LG.sim.genComment = function (user) { return '...'; };
 */
(function () {
  'use strict';
  var LG = (window.LG = window.LG || {});

  var FIRST = ['ayse', 'mehmet', 'zeynep', 'ali', 'elif', 'mustafa', 'fatma', 'emre', 'merve', 'burak', 'esra', 'can', 'deniz', 'ece', 'kerem', 'selin',
    'hasan', 'busra', 'yusuf', 'irem', 'omer', 'sude', 'baris', 'gizem', 'onur', 'aslı', 'tuna', 'melis', 'kaan', 'derya', 'hakan', 'nur', 'cem', 'ebru',
    'lucas', 'maria', 'ahmed', 'nina', 'kenji', 'sofia', 'omar', 'lena', 'diego', 'yuki', 'fatima', 'ivan', 'chloe', 'arjun'];
  var SUFFIX = ['', '_34', '.06', '_61', '35', '_tr', '.official', '_x', '123', '_07', '.gs', '.fb', '_bjk', '_ts', '🌸', '✨', '_baba', '_kral', 'cim', '.k', '_42', '99', '_1905', '.y'];
  var NICK = ['Kral', 'Prenses', 'Çaycı', 'Simitçi', 'Dayı', 'Abla', 'Gece Kuşu', 'Uykusuz', 'Patron', 'Minnoş', 'Karadenizli', 'Egeli', 'Doğulu', 'İstanbullu', 'Ankaralı', 'Kahveci'];

  var GENERIC = [['selam', 4], ['merhaba', 3], ['harika', 2], ['😂😂😂', 2], ['ben de varım', 2], ['ilk!', 1], ['❤️❤️', 2], ['süper', 1], ['nasıl katılıyoruz?', 1], ['bu ne ya 😂', 1], ['hello from Germany', 1], ['iyi yayınlar', 2], ['devam', 1], ['🔥🔥', 1]];

  var sim = (LG.sim = {
    comments: null,
    genComment: null,
    bots: [],
    auto: false,
    panel: null,
    botTarget: LG.config ? LG.config.bots : 40,
    rate: LG.config ? LG.config.rate : 1,
  });

  var uid = 0;
  function makeBot() {
    uid++;
    var f = LG.pick(FIRST);
    var name = (Math.random() < 0.2 ? LG.pick(NICK).toLowerCase().replace(/\s/g, '_').replace(/[çğıöşü]/g, function (c) { return { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }[c]; }) : f) + LG.pick(SUFFIX);
    var nick = Math.random() < 0.6 ? f.charAt(0).toUpperCase() + f.slice(1) + (Math.random() < 0.3 ? ' ' + LG.pick(NICK) : '') : name;
    return { id: 'sim_' + uid + '_' + name, name: name, nick: nick, avatar: '' };
  }
  sim.makeBot = makeBot;

  function weighted(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i][1] || 1;
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) { r -= list[i][1] || 1; if (r <= 0) return list[i][0]; }
    return list[0][0];
  }
  function commentFor(u) {
    if (sim.genComment) { var c = sim.genComment(LG.user(u)); if (c) return c; }
    if (sim.comments && sim.comments.length && Math.random() < 0.85) return weighted(sim.comments);
    return weighted(GENERIC);
  }
  function giftPick() {
    var r = Math.random();
    var pool;
    if (r < 0.62) pool = LG.GIFTS.filter(function (g) { return g.coins === 1; });
    else if (r < 0.85) pool = LG.GIFTS.filter(function (g) { return g.coins >= 5 && g.coins < 30; });
    else if (r < 0.95) pool = LG.GIFTS.filter(function (g) { return g.coins >= 30 && g.coins < 100; });
    else if (r < 0.99) pool = LG.GIFTS.filter(function (g) { return g.coins >= 100 && g.coins < 1000; });
    else if (r < 0.998) pool = LG.GIFTS.filter(function (g) { return g.coins >= 1000 && g.coins < 10000; });
    else pool = LG.GIFTS.filter(function (g) { return g.coins >= 10000; });
    return LG.pick(pool);
  }

  // TikTok gecikmesini taklit et: ?lag=4 -> olaylar 3-5 sn gecikmeyle gelir (oylama/cevap testleri için)
  var LAG = LG.qn ? LG.qn('lag', 0) : 0;
  function send(evt) {
    if (LAG > 0) setTimeout(function () { LG.emit(evt); }, (LAG * (0.75 + Math.random() * 0.5)) * 1000);
    else LG.emit(evt);
  }
  // Seri hediye (aynı kişiden art arda): sim.giftStreak(kullanıcı, 'Gül', 10)
  sim.giftStreak = function (u, giftName, n) {
    u = u || randomBot(); n = n || 10;
    for (var i = 0; i < n; i++) (function (d) { setTimeout(function () { sim.gift(u, giftName || 'Gül', 1); }, d); })(i * 120);
  };

  // --- Tekil sahte olaylar (panel ve testler kullanır) -------------------------
  sim.chat = function (u, text) { u = u || randomBot(); send({ type: 'chat', user: u, text: text != null ? text : commentFor(u) }); };
  sim.like = function (u, n) { u = u || randomBot(); send({ type: 'like', user: u, count: n || LG.randi(1, 15) }); };
  sim.gift = function (u, giftName, count) {
    u = u || randomBot();
    var g = giftName ? LG.giftInfo(giftName) || LG.GIFTS[0] : giftPick();
    send({ type: 'gift', user: u, gift: { id: g.id, name: g.name, en: g.en, coins: g.coins, count: count || (g.coins < 10 ? LG.randi(1, 5) : 1) } });
  };
  sim.follow = function (u) { u = u || randomBot(); send({ type: 'follow', user: u }); };
  sim.share = function (u) { u = u || randomBot(); send({ type: 'share', user: u }); };
  sim.join = function (u) { u = u || newBot(); LG.emit({ type: 'join', user: u }); };
  function newBot() { var b = makeBot(); sim.bots.push(b); return b; }
  function randomBot() {
    if (!sim.bots.length || (sim.bots.length < sim.botTarget && Math.random() < 0.3)) return newBot();
    return LG.pick(sim.bots);
  }
  sim.randomBot = randomBot;

  // Yük testi: n yeni izleyici, sec saniye içinde yorum yazar
  sim.flood = function (n, sec) {
    n = n || 300; sec = sec || 8;
    for (var i = 0; i < n; i++) {
      (function (d) { setTimeout(function () { sim.chat(newBot()); }, d); })(Math.random() * sec * 1000);
    }
  };

  // --- Otomatik mod ------------------------------------------------------------
  var timer = null;
  function tick() {
    // saniyede ~ bot*0.02 yorum (40 botla dakikada ~48 yorum), ölçeklenebilir
    var dt = 0.25, k = sim.rate * dt;
    var n = Math.max(5, sim.botTarget);
    if (sim.bots.length < sim.botTarget && Math.random() < 0.5 * k * 4) sim.join();
    if (Math.random() < n * 0.02 * k) sim.chat();
    if (Math.random() < n * 0.006 * k) sim.chat();
    if (Math.random() < n * 0.03 * k) sim.like();
    if (Math.random() < n * 0.0035 * k) sim.gift();
    if (Math.random() < n * 0.0008 * k) sim.follow();
    if (Math.random() < n * 0.0004 * k) sim.share();
    LG.emit({ type: 'viewers', count: sim.bots.length });
  }
  sim.startAuto = function () { if (timer) return; sim.auto = true; timer = setInterval(tick, 250); for (var i = 0; i < Math.min(10, sim.botTarget); i++) newBot(); syncPanel(); };
  sim.stopAuto = function () { sim.auto = false; clearInterval(timer); timer = null; syncPanel(); };
  sim.toggleAuto = function () { if (sim.auto) sim.stopAuto(); else sim.startAuto(); };

  // --- Panel -------------------------------------------------------------------
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function syncPanel() {
    if (!sim.panel) return;
    var b = sim.panel.querySelector('[data-a=auto]');
    if (b) b.textContent = sim.auto ? '⏸ Demo durdur' : '▶ Demo başlat';
  }
  function buildPanel() {
    var p = el('div', { id: 'lg-sim' });
    p.innerHTML =
      '<div class="lg-sim-head">🧪 Simülatör <span class="lg-sim-x" title="Gizle (S)">×</span></div>' +
      '<button data-a="auto">▶ Demo başlat</button>' +
      '<label>Bot: <input type="range" min="5" max="600" step="5" data-a="bots"><b data-v="bots"></b></label>' +
      '<label>Hız: <input type="range" min="0.25" max="6" step="0.25" data-a="rate"><b data-v="rate"></b></label>' +
      '<div class="lg-row"><input data-a="who" placeholder="kullanıcı" value="ben_test"><input data-a="text" placeholder="yorum yaz + Enter"></div>' +
      '<div class="lg-row"><button data-a="chat">💬 Yorum</button><button data-a="like">❤️ x10</button><button data-a="follow">➕ Takip</button><button data-a="share">↗ Paylaş</button></div>' +
      '<div class="lg-gifts"></div>' +
      '<div class="lg-row"><button data-a="flood">🌊 300 kişi</button><button data-a="flood50">50 kişi</button></div>' +
      '<div class="lg-stats" data-v="stats"></div>';
    var gifts = p.querySelector('.lg-gifts');
    LG.GIFTS.forEach(function (g) {
      if ([1, 5, 30, 100, 500, 1000, 29999].indexOf(g.coins) < 0 || g.name === 'TikTok' || g.name === 'GG' || g.name === 'Dondurma' || g.name === 'Konfeti') return;
      var b = el('button', { 'data-gift': g.name, title: g.coins + ' jeton' }, g.emoji + ' ' + g.name + ' <small>' + g.coins + '</small>');
      gifts.appendChild(b);
    });
    document.body.appendChild(p);
    var me = function () {
      var who = (p.querySelector('[data-a=who]').value || 'ben_test').trim();
      return { id: 'manual_' + who, name: who, nick: who, avatar: '' };
    };
    var bots = p.querySelector('[data-a=bots]'), rate = p.querySelector('[data-a=rate]');
    bots.value = sim.botTarget; rate.value = sim.rate;
    function showVals() { p.querySelector('[data-v=bots]').textContent = sim.botTarget; p.querySelector('[data-v=rate]').textContent = sim.rate + 'x'; }
    showVals();
    bots.oninput = function () { sim.botTarget = +bots.value; showVals(); };
    rate.oninput = function () { sim.rate = +rate.value; showVals(); };
    p.addEventListener('click', function (e) {
      var t = e.target.closest('button,[data-a],.lg-sim-x');
      if (!t) return;
      if (LG.audio) LG.audio.unlock();
      if (t.classList.contains('lg-sim-x')) return sim.togglePanel();
      var g = t.getAttribute('data-gift');
      if (g) return sim.gift(e.shiftKey ? randomBot() : me(), g, 1);
      switch (t.getAttribute('data-a')) {
        case 'auto': sim.toggleAuto(); break;
        case 'chat':
          var txt = p.querySelector('[data-a=text]').value;
          sim.chat(me(), txt || undefined); break;
        case 'like': sim.like(me(), 10); break;
        case 'follow': sim.follow(me()); break;
        case 'share': sim.share(me()); break;
        case 'flood': sim.flood(300, 8); break;
        case 'flood50': sim.flood(50, 4); break;
      }
    });
    p.querySelector('[data-a=text]').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { sim.chat(me(), this.value || undefined); this.value = ''; }
      e.stopPropagation();
    });
    p.querySelector('[data-a=who]').addEventListener('keydown', function (e) { e.stopPropagation(); });
    setInterval(function () {
      var s = LG.stats;
      p.querySelector('[data-v=stats]').textContent = 'yorum ' + s.chats + ' · beğeni ' + s.likes + ' · hediye ' + s.gifts + ' (' + s.coins + ' jeton) · takip ' + s.follows + ' · FPS ' + Math.round(LG.fps || 0);
    }, 500);
    sim.panel = p;
    syncPanel();
  }
  sim.togglePanel = function () {
    if (!sim.panel) buildPanel();
    else sim.panel.style.display = sim.panel.style.display === 'none' ? '' : 'none';
  };
  sim.init = function () {
    if (LG.config.sim) buildPanel();
    if (LG.config.demo) sim.startAuto();
  };
})();
