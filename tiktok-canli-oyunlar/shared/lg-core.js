/*
 * LG (Live Games) çekirdeği — tüm oyunların ortak altyapısı.
 * Klasik <script> olarak yüklenir (file:// ile de çalışır, derleme gerekmez).
 *
 * Birleşik olay biçimi (tüm kaynaklar bu biçime çevrilir):
 *   { type:'chat',   user, text }
 *   { type:'like',   user, count, total }
 *   { type:'gift',   user, gift:{ id, name, coins, count, total, tier, image } }
 *   { type:'follow', user }
 *   { type:'share',  user }
 *   { type:'join',   user }
 *   { type:'sub',    user }
 *   { type:'viewers', count }
 *   user = { id, name, nick, avatar, color, hue, emoji, isNew, ...istatistikler }
 *
 * Kaynaklar (URL parametresi ?source=):
 *   auto      — önce köprü (bridge), sonra TikFinity dener (varsayılan)
 *   bridge    — bizim Node köprüsü: ws://localhost:8787
 *   tikfinity — TikFinity masaüstü uygulaması: ws://localhost:21213
 *   sim       — sadece simülatör (TikTok bağlantısı yok)
 */
(function () {
  'use strict';

  var LG = (window.LG = window.LG || {});
  LG.version = '1.0.0';

  // ---------------------------------------------------------------------------
  // Ayarlar (URL parametreleri)
  // ---------------------------------------------------------------------------
  var qs = new URLSearchParams(location.search);
  function qp(name, def) {
    var v = qs.get(name);
    return v === null || v === '' ? def : v;
  }
  function qb(name, def) {
    var v = qs.get(name);
    if (v === null) return def;
    return v === '' || v === '1' || v === 'true' || v === 'evet';
  }
  function qn(name, def) {
    var v = parseFloat(qs.get(name));
    return isFinite(v) ? v : def;
  }
  LG.config = {
    source: qp('source', 'auto'), // auto | bridge | tikfinity | sim
    bridgeUrl: qp('bridge', 'ws://localhost:8787'),
    tikfinityUrl: qp('tikfinity', 'ws://localhost:21213'),
    sim: qb('sim', false), // simülatör panelini göster
    demo: qb('demo', false), // otomatik sahte izleyiciler
    bots: qn('bots', 40), // demo bot sayısı
    rate: qn('rate', 1), // demo olay hızı çarpanı
    debug: qb('debug', false),
    mute: qb('mute', false),
    vol: qn('vol', 0.7),
    music: qb('music', true),
    brand: qp('brand', ''), // ekranda gösterilecek @kullanıcıadı
    lang: qp('lang', 'tr'),
    transparent: qb('transparent', false),
    block: (qp('block', '') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
    hideStatus: qb('hidestatus', false),
    cam: qp('cam', ''), // eller kamerası çerçevesi: br | bl | tr | tl (boş = kapalı)
    footer: qb('footer', true), // "Hediye zorunlu değil" notu
    softcap: qn('softcap', 5000), // bir izleyici bu oturumda bu kadar jetonu geçince kutlamalar sadeleşir (0 = kapalı)
    spotlightCooldown: qn('cooldown', 25), // aynı kişi için büyük kutlamalar arası en az saniye
    renk: qn('renk', 0), // renk teması: tüm renkleri bu kadar derece kaydır (0-360). Her yayıncının oyunu farklı görünsün diye.
  };
  LG.qp = qp; LG.qb = qb; LG.qn = qn;

  // Tasarım çözünürlüğü: dikey TikTok (1080x1920)
  LG.W = 1080;
  LG.H = 1920;
  // TikTok izleyici arayüzünün kapatmadığı "güvenli alan".
  // Üstte yayıncı adı/izleyici sayısı, altta yorum akışı ve hediye çubuğu, sağda butonlar var.
  LG.SAFE = { x: 40, y: 230, w: 1000, h: 1070 }; // y: 230..1300
  LG.SAFE.bottom = LG.SAFE.y + LG.SAFE.h;
  // Eller kamerası için önerilen alan (OBS'te kamera kaynağını buraya yerleştirin).
  // Varsayılan "br": sağ alt — TikTok yorum akışı solda olduğu için bu bölge çoğunlukla açık kalır.
  LG.CAM_SLOTS = {
    br: { x: 700, y: 1310, w: 340, h: 255 },
    bl: { x: 40, y: 1310, w: 340, h: 255 },
    tr: { x: 700, y: 240, w: 340, h: 255 },
    tl: { x: 40, y: 240, w: 340, h: 255 },
  };
  LG.CAM = LG.CAM_SLOTS[LG.config.cam] || null;

  // ---------------------------------------------------------------------------
  // Yardımcılar
  // ---------------------------------------------------------------------------
  LG.now = function () { return performance.now() / 1000; };
  LG.rand = function (a, b) { return a + Math.random() * (b - a); };
  LG.randi = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
  LG.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  LG.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  LG.lerp = function (a, b, t) { return a + (b - a) * t; };
  LG.ease = {
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    outBack: function (t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    inOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    outElastic: function (t) { var c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; },
  };
  LG.hash = function (str) {
    var h = 2166136261;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  LG.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  LG.fmt = function (n) {
    n = Math.round(n);
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace('.0', '') + 'B';
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  LG.store = {
    get: function (k, def) {
      try { var v = localStorage.getItem('lg:' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem('lg:' + k, JSON.stringify(v)); } catch (e) { /* yok say */ }
    },
  };
  LG.log = function () {
    if (LG.config.debug && window.console) console.log.apply(console, ['[LG]'].concat([].slice.call(arguments)));
  };

  // ---------------------------------------------------------------------------
  // Olay yolu (event bus)
  // ---------------------------------------------------------------------------
  var handlers = {};
  LG.on = function (type, fn) {
    (handlers[type] = handlers[type] || []).push(fn);
    return function off() {
      var a = handlers[type] || [];
      var i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    };
  };
  function fire(type, evt) {
    var a = handlers[type];
    if (!a) return;
    for (var i = 0; i < a.length; i++) {
      try { a[i](evt); } catch (e) { console.error('[LG] olay işleyici hatası', type, e); }
    }
  }
  LG.fire = fire; // oyunlar kendi olaylarını da yayınlayabilir
  LG.stats = { chats: 0, likes: 0, gifts: 0, coins: 0, follows: 0, shares: 0, joins: 0, viewers: 0, startedAt: Date.now() };

  // Tüm kaynaklardan gelen olaylar buradan geçer.
  LG.emit = function (evt) {
    if (!evt || !evt.type) return;
    if (evt.user) evt.user = LG.user(evt.user);
    var u = evt.user;
    switch (evt.type) {
      case 'chat':
        var cleaned = LG.filter ? LG.filter.clean(evt.text || '') : { text: evt.text || '', flagged: false };
        evt.raw = evt.text || '';
        evt.text = cleaned.text;
        evt.flagged = cleaned.flagged;
        evt.norm = LG.cmd.norm(evt.raw);
        LG.stats.chats++;
        if (u) { u.comments++; u.lastChat = evt.text; }
        break;
      case 'like':
        evt.count = Math.max(1, evt.count | 0 || 1);
        LG.stats.likes += evt.count;
        if (u) u.likes += evt.count;
        break;
      case 'gift':
        var g = evt.gift || (evt.gift = {});
        g.count = Math.max(1, g.count | 0 || 1);
        g.coins = Math.max(0, +g.coins || 0);
        g.total = g.coins * g.count;
        g.tier = LG.giftTier(g.coins);
        if (!g.name) g.name = 'Hediye';
        LG.stats.gifts += g.count;
        LG.stats.coins += g.total;
        if (u) { u._coinsBeforeLast = u.coins; u.coins += g.total; u.giftCount += g.count; }
        break;
      case 'follow': LG.stats.follows++; if (u) u.followed = true; break;
      case 'share': LG.stats.shares++; if (u) u.shares++; break;
      case 'join': LG.stats.joins++; break;
      case 'viewers': LG.stats.viewers = evt.count | 0; break;
    }
    if (u) {
      u.lastSeen = LG.now();
      // "Yeni" = bu yayında ilk kez etkileşime giren (sadece izlemeye girmek sayılmaz)
      evt.isNew = false;
      if (evt.type !== 'join' && u._isNewFlag) { evt.isNew = true; u._isNewFlag = false; }
    }
    LG.log(evt.type, u && u.name, evt.text || (evt.gift && evt.gift.name) || evt.count || '');
    fire(evt.type, evt);
    fire('any', evt);
    if (evt.isNew) fire('newUser', evt);
    if (LG.hostBus) LG.hostBus.post(evt);
  };

  // ---------------------------------------------------------------------------
  // İzleyici kayıtları
  // ---------------------------------------------------------------------------
  var EMOJIS = ['😀', '😎', '🤠', '🥳', '😺', '🐶', '🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐨', '🐰', '🐻', '🐷', '🐮', '🐔', '🐧', '🦄', '🐙', '🐳', '🦋', '🐞', '🌻', '🍉', '🍩', '⚡', '🔥', '⭐'];
  LG.users = new Map();
  LG.user = function (raw) {
    if (!raw) return null;
    if (raw.__lg) return raw;
    var id = String(raw.id || raw.uniqueId || raw.userId || raw.name || raw.nick || 'anon');
    var u = LG.users.get(id);
    if (!u) {
      var h = LG.hash(id);
      var nick = String(raw.nick || raw.nickname || raw.name || raw.uniqueId || id);
      u = {
        __lg: true,
        id: id,
        uniqueId: String(raw.name || raw.uniqueId || id),
        nick: nick,
        name: LG.filter ? LG.filter.name(nick, id) : nick.slice(0, 16),
        avatar: raw.avatar || raw.profilePictureUrl || '',
        hue: h % 360,
        color: 'hsl(' + (h % 360) + ',75%,60%)',
        emoji: EMOJIS[h % EMOJIS.length],
        firstSeen: LG.now(),
        lastSeen: LG.now(),
        comments: 0, likes: 0, coins: 0, giftCount: 0, shares: 0,
        followed: false,
        data: {}, // oyunların kendi verileri için
        _isNewFlag: true,
      };
      LG.users.set(id, u);
      if (LG.users.size > 5000) {
        // En eski kayıtları temizle (bellek koruması)
        var cut = 1000;
        for (var k of LG.users.keys()) { if (cut-- <= 0) break; LG.users.delete(k); }
      }
    } else if (raw.avatar && !u.avatar) {
      u.avatar = raw.avatar;
    }
    return u;
  };

  // Profil fotoğrafı önbelleği (yüklenemezse null döner, oyun yedek çizim yapar)
  var imgCache = new Map();
  LG.avatarImg = function (u) {
    if (!u || !u.avatar) return null;
    var c = imgCache.get(u.avatar);
    if (c === undefined) {
      if (imgCache.size > 600) imgCache.clear();
      var img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.onload = function () { img._ok = true; };
      img.onerror = function () { imgCache.set(u.avatar, null); };
      img.src = u.avatar;
      imgCache.set(u.avatar, img);
      return null;
    }
    return c && c._ok ? c : null;
  };

  // ---------------------------------------------------------------------------
  // Hediyeler
  // ---------------------------------------------------------------------------
  // Simülatör ve isimlendirme için yaygın hediyeler (gerçek değer olaydaki coins alanından gelir).
  LG.GIFTS = [
    { id: 5655, name: 'Gül', en: 'Rose', coins: 1, emoji: '🌹' },
    { id: 5269, name: 'TikTok', en: 'TikTok', coins: 1, emoji: '🎵' },
    { id: 6064, name: 'GG', en: 'GG', coins: 1, emoji: '🎮' },
    { id: 5827, name: 'Dondurma', en: 'Ice Cream Cone', coins: 1, emoji: '🍦' },
    { id: 5487, name: 'Parmak Kalp', en: 'Finger Heart', coins: 5, emoji: '🫰' },
    { id: 5658, name: 'Parfüm', en: 'Perfume', coins: 20, emoji: '🧴' },
    { id: 5879, name: 'Donut', en: 'Doughnut', coins: 30, emoji: '🍩' },
    { id: 6247, name: 'Kalp Eller', en: 'Hand Hearts', coins: 100, emoji: '🫶' },
    { id: 5585, name: 'Konfeti', en: 'Confetti', coins: 100, emoji: '🎊' },
    { id: 6267, name: 'Corgi', en: 'Corgi', coins: 299, emoji: '🐕' },
    { id: 7168, name: 'Para Tabancası', en: 'Money Gun', coins: 500, emoji: '💸' },
    { id: 5886, name: 'Galaksi', en: 'Galaxy', coins: 1000, emoji: '🌌' },
    { id: 6090, name: 'Havai Fişek', en: 'Fireworks', coins: 1088, emoji: '🎆' },
    { id: 6369, name: 'Aslan', en: 'Lion', coins: 29999, emoji: '🦁' },
    // Türkiye'ye özel hediyeler (adlar TikTok'ta farklı dillerde gelebilir; LG.giftIs ile kontrol edin)
    { id: 9001, name: 'Türk Kahvesi', en: 'Turkish Coffee', coins: 5, emoji: '☕', tr: true },
    { id: 9002, name: 'Çay', en: 'Tea', coins: 50, emoji: '🫖', tr: true },
    { id: 9003, name: 'Buket', en: 'Bouquet', coins: 100, emoji: '💐', tr: true },
    { id: 9004, name: 'Rüzgar Dansözü', en: 'Wind Dancer', coins: 300, emoji: '💃', tr: true },
    { id: 9005, name: 'Kurt', en: 'Wolf', coins: 5500, emoji: '🐺', tr: true },
    { id: 7312, name: 'Evren', en: 'TikTok Universe', coins: 44999, emoji: '🪐' },
  ];
  var giftByName = {};
  LG.GIFTS.forEach(function (g) { giftByName[g.en.toLowerCase()] = g; giftByName[g.name.toLowerCase()] = g; });
  LG.giftInfo = function (nameOrEn) { return giftByName[String(nameOrEn || '').toLowerCase()] || null; };
  // Hediye adı listedeki kelimelerden birini içeriyor mu? Ör: LG.giftIs(e.gift, ['çay', 'tea'])
  LG.giftIs = function (gift, words) {
    if (!gift) return false;
    var n = ' ' + LG.cmd.norm((gift.name || '') + ' ' + (gift.en || '')) + ' ';
    for (var i = 0; i < words.length; i++) { if (n.indexOf(' ' + LG.cmd.norm(words[i]) + ' ') >= 0) return true; }
    return false;
  };
  // Kademe: 1 (1-4 jeton) … 6 (10.000+ jeton)
  LG.giftTier = function (coins) {
    if (coins >= 10000) return 6;
    if (coins >= 1000) return 5;
    if (coins >= 100) return 4;
    if (coins >= 30) return 3;
    if (coins >= 5) return 2;
    return 1;
  };
  LG.giftEmoji = function (gift) {
    var info = gift && (LG.giftInfo(gift.name) || LG.giftInfo(gift.en));
    if (info) return info.emoji;
    var t = gift ? gift.tier || LG.giftTier(gift.coins) : 1;
    return ['🎁', '🌹', '💝', '🍩', '🎊', '🌌', '🦁'][t] || '🎁';
  };

  // ---------------------------------------------------------------------------
  // Komut ayrıştırma (Türkçe karakter duyarsız)
  // ---------------------------------------------------------------------------
  var TR_MAP = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i̇': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  LG.cmd = {
    // "KIZZZ!!" -> "kiz"; "Çay İSTİYORUM" -> "cay istiyorum"
    norm: function (text) {
      var s = String(text || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
      s = s.replace(/[çğıöşüâîû]|i̇/g, function (ch) { return TR_MAP[ch] || ch; });
      s = s.normalize ? s.normalize('NFKD').replace(/[̀-ͯ]/g, '') : s;
      s = s.replace(/[^a-z0-9#@!?+\-\s]/g, ' ');
      s = s.replace(/(.)\1{2,}/g, '$1'); // 3+ tekrar eden harfi teke indir
      return s.replace(/\s+/g, ' ').trim();
    },
    words: function (text) { return LG.cmd.norm(text).split(' ').filter(Boolean); },
    // Metin, listedeki kelimelerden birini (tam kelime olarak) içeriyor mu?
    has: function (text, list) {
      var w = ' ' + LG.cmd.norm(text) + ' ';
      for (var i = 0; i < list.length; i++) {
        var k = LG.cmd.norm(list[i]);
        if (k && w.indexOf(' ' + k + ' ') >= 0) return true;
      }
      return false;
    },
    // Listeden ilk eşleşen kelimeyi döndürür (anahtar = liste öğesi)
    match: function (text, map) {
      var w = ' ' + LG.cmd.norm(text) + ' ';
      for (var key in map) {
        var arr = map[key];
        for (var i = 0; i < arr.length; i++) {
          var k = LG.cmd.norm(arr[i]);
          if (k && w.indexOf(' ' + k + ' ') >= 0) return key;
        }
      }
      return null;
    },
    number: function (text) {
      var m = String(text || '').match(/-?\d+/);
      return m ? parseInt(m[0], 10) : null;
    },
    // Tek harf/rakam cevap (quiz için): "a", "A)", "b şıkkı", "2"
    choice: function (text, options) {
      var n = LG.cmd.norm(text);
      var first = n.split(' ')[0] || '';
      first = first.replace(/[^a-z0-9]/g, '');
      for (var i = 0; i < options.length; i++) {
        if (first === LG.cmd.norm(options[i])) return i;
      }
      return -1;
    },
  };

  // ---------------------------------------------------------------------------
  // Türkçe ekler: LG.tr.den('Ayşe') -> "Ayşe'den", LG.tr.e('Ali') -> "Ali'ye", LG.tr.in('Murat') -> "Murat'ın"
  // Rakamla/tek harfle biten adlar okunuşa göre çekilir ('34'ten, 'Gizem K'dan).
  // ---------------------------------------------------------------------------
  (function () {
    var BACK = 'aıouAIOU', FRONT = 'eiöüEİÖÜ', VOWELS = 'aıoueiöüAIOUEİÖÜâîû';
    var HARD = 'fstkçşhpFSTKÇŞHP';
    var LETTER = { a: 'a', b: 'be', c: 'ce', ç: 'çe', d: 'de', e: 'e', f: 'fe', g: 'ge', ğ: 'ge', h: 'he', ı: 'ı', i: 'i', j: 'je', k: 'ka', l: 'le', m: 'me', n: 'ne', o: 'o', ö: 'ö', p: 'pe', q: 'ku', r: 're', s: 'se', ş: 'şe', t: 'te', u: 'u', ü: 'ü', v: 've', w: 've', x: 'iks', y: 'ye', z: 'ze' };
    var DIGIT = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
    var TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
    function spoken(name) {
      var s = String(name || '').replace(/[^\p{L}\p{N}]+$/u, '');
      if (!s) return 'e';
      var m = s.match(/(\d+)$/);
      if (m) {
        var n = parseInt(m[1], 10);
        if (n === 0) return 'sıfır';
        if (n % 1000 === 0) return 'bin';
        if (n % 100 === 0) return 'yüz';
        if (n % 10 === 0) return TENS[(n % 100) / 10];
        return DIGIT[n % 10];
      }
      var parts = s.split(/[\s_.\-]+/);
      var last = parts[parts.length - 1];
      if (last.length === 1 && LETTER[last.toLocaleLowerCase('tr')]) return LETTER[last.toLocaleLowerCase('tr')];
      // Sesli harf yoksa (kısaltma: bjk, gs) harf harf okunur
      if (!/[aıoueiöüâîû]/i.test(last) && last.length <= 4) return LETTER[last.slice(-1).toLocaleLowerCase('tr')] || last;
      return last;
    }
    function info(name) {
      var w = spoken(name);
      var lastV = '';
      for (var i = w.length - 1; i >= 0; i--) if (VOWELS.indexOf(w[i]) >= 0) { lastV = w[i]; break; }
      var back = lastV ? BACK.indexOf(lastV) >= 0 || 'âû'.indexOf(lastV) >= 0 : false;
      var round = 'oöuüOÖUÜ'.indexOf(lastV) >= 0;
      var lastC = w[w.length - 1];
      return { back: back, round: round, endsVowel: VOWELS.indexOf(lastC) >= 0, hard: HARD.indexOf(lastC) >= 0 };
    }
    function ap(name, suffix) { return String(name) + '’' + suffix; }
    LG.tr = {
      den: function (n) { var f = info(n); return ap(n, (f.hard ? 't' : 'd') + (f.back ? 'an' : 'en')); },
      de: function (n) { var f = info(n); return ap(n, (f.hard ? 't' : 'd') + (f.back ? 'a' : 'e')); },
      e: function (n) { var f = info(n); return ap(n, (f.endsVowel ? 'y' : '') + (f.back ? 'a' : 'e')); },
      i: function (n) { var f = info(n); var v = f.back ? (f.round ? 'u' : 'ı') : (f.round ? 'ü' : 'i'); return ap(n, (f.endsVowel ? 'y' : '') + v); },
      in: function (n) { var f = info(n); var v = f.back ? (f.round ? 'u' : 'ı') : (f.round ? 'ü' : 'i'); return ap(n, (f.endsVowel ? 'n' : '') + v + 'n'); },
      ile: function (n) { var f = info(n); return String(n) + (f.endsVowel ? ' ile' : ' ile'); },
    };
  })();

  // ---------------------------------------------------------------------------
  // Bağlantı adaptörleri
  // ---------------------------------------------------------------------------
  LG.conn = { state: 'kapalı', source: null, lastEventAt: 0 };
  function setConn(state, source) {
    LG.conn.state = state;
    LG.conn.source = source;
    fire('connection', { state: state, source: source });
  }

  // TikTok-Live-Connector / TikFinity tarzı ham kullanıcı -> sade kullanıcı
  function rawUser(d) {
    if (!d) return null;
    var u = d.user || d;
    var pic = u.profilePictureUrl || '';
    if (!pic && u.profilePicture) {
      var p = u.profilePicture;
      pic = (p.url && p.url[0]) || (p.urls && p.urls[0]) || (p.urlList && p.urlList[0]) || '';
    }
    var uid = u.uniqueId || u.displayId || u.userId || d.uniqueId || d.userId;
    if (!uid && !u.nickname) return null;
    return {
      id: String(uid || u.nickname),
      name: String(u.uniqueId || u.displayId || uid || ''),
      nick: String(u.nickname || d.nickname || uid || ''),
      avatar: pic,
    };
  }
  LG.rawUser = rawUser;

  // Hediye serisi (streak) takibi: aynı serideki tekrarları fark olarak ilet
  var streaks = new Map();
  function normalizeGift(d) {
    var det = d.giftDetails || d.extendedGiftInfo || {};
    var giftType = d.giftType != null ? d.giftType : det.giftType;
    var coins = d.diamondCount != null ? d.diamondCount : det.diamondCount != null ? det.diamondCount : det.diamond_count;
    var name = d.giftName || det.giftName || det.name || 'Hediye';
    var id = d.giftId || det.id || name;
    var repeat = d.repeatCount || 1;
    var user = rawUser(d);
    var key = (user ? user.id : '?') + ':' + id + ':' + (d.groupId || '');
    var delta = repeat;
    if (giftType === 1) {
      var prev = streaks.get(key) || 0;
      delta = Math.max(0, repeat - prev);
      if (d.repeatEnd) streaks.delete(key); else streaks.set(key, repeat);
      if (streaks.size > 2000) streaks.clear();
    }
    if (delta <= 0) return null;
    var info = LG.giftInfo(name);
    var img = '';
    var gi = det.giftImage || det.image || det.icon;
    if (gi) img = (gi.url && gi.url[0]) || (gi.url_list && gi.url_list[0]) || '';
    return {
      type: 'gift',
      user: user,
      gift: { id: id, name: info ? info.name : name, en: name, coins: +coins || (info ? info.coins : 1), count: delta, image: img || d.giftPictureUrl || '' },
    };
  }

  // TikFinity / TLC v1 biçimindeki ham olayı birleşik biçime çevir
  LG.normalizeRaw = function (event, d) {
    d = d || {};
    switch (event) {
      case 'chat': return { type: 'chat', user: rawUser(d), text: d.comment || d.text || '' };
      case 'like': return { type: 'like', user: rawUser(d), count: d.likeCount || 1, total: d.totalLikeCount || 0 };
      case 'gift': return normalizeGift(d);
      case 'follow': return { type: 'follow', user: rawUser(d) };
      case 'share': return { type: 'share', user: rawUser(d) };
      case 'social':
        var a = String(d.displayType || d.action || d.label || '').toLowerCase();
        if (a.indexOf('follow') >= 0 || a === '1') return { type: 'follow', user: rawUser(d) };
        if (a.indexOf('share') >= 0 || a === '3') return { type: 'share', user: rawUser(d) };
        return null;
      case 'member': return { type: 'join', user: rawUser(d) };
      case 'subscribe': return { type: 'sub', user: rawUser(d) };
      case 'roomUser': return { type: 'viewers', count: d.viewerCount || 0 };
      default: return null;
    }
  };

  function Socket(url, label, onMessage) {
    var self = this;
    this.url = url; this.label = label; this.ws = null; this.alive = false; this.closed = false; this.retry = 0;
    this.open = function () {
      if (self.closed) return;
      try { self.ws = new WebSocket(url); } catch (e) { return self.schedule(); }
      self.ws.onopen = function () { self.alive = true; self.retry = 0; setConn('bağlı', label); };
      self.ws.onmessage = function (m) {
        LG.conn.lastEventAt = Date.now();
        var data;
        try { data = JSON.parse(m.data); } catch (e) { return; }
        onMessage(data);
      };
      self.ws.onclose = function () {
        var was = self.alive; self.alive = false;
        if (was) setConn('koptu', label);
        self.schedule();
      };
      self.ws.onerror = function () { /* onclose zaten tetiklenir */ };
    };
    this.schedule = function () {
      if (self.closed) return;
      self.retry++;
      var delay = Math.min(15000, 1000 * Math.pow(1.6, self.retry));
      setTimeout(self.open, delay);
    };
    this.close = function () { self.closed = true; try { self.ws && self.ws.close(); } catch (e) {} };
    this.send = function (obj) {
      if (self.ws && self.alive && self.ws.readyState === 1) { try { self.ws.send(JSON.stringify(obj)); return true; } catch (e) {} }
      return false;
    };
  }
  var sockets = [];

  function connectBridge() {
    var sk = new Socket(LG.config.bridgeUrl, 'köprü', function (msg) {
      if (msg && msg.type === 'status') { fire('bridgeStatus', msg); return; }
      if (msg && msg.type === 'control') { handleControl(msg); return; }
      if (msg && msg.type) LG.emit(msg);
    });
    sockets.push(sk);
    return sk;
  }

  // ---------------------------------------------------------------------------
  // Uzaktan kontrol (sunucu paneli → köprü → oyun). OBS'teki oyun klavye alamadığı için
  // sunucu panelindeki düğmeler bu yolla oyunun kısayollarını tetikler.
  //   { type:'control', action:'key', key:'n', game:'dolmus' }
  //   { type:'control', action:'mute', userId:'...' }   bu kişinin büyük kutlamalarını sadeleştir
  // ---------------------------------------------------------------------------
  LG.spotlightMuted = new Set();
  function handleControl(c) {
    if (!c || (c.game && LG.gameId && c.game !== LG.gameId)) return;
    if (c.action === 'key' && c.key) {
      var k = String(c.key).toLowerCase();
      for (var i = 0; i < keyHandlers.length; i++) if (keyHandlers[i].key === k) { try { keyHandlers[i].fn({ remote: true }); } catch (e) { console.error(e); } }
    } else if (c.action === 'mute' && c.userId) LG.spotlightMuted.add(String(c.userId));
    else if (c.action === 'unmute' && c.userId) LG.spotlightMuted.delete(String(c.userId));
    fire('control', c);
  }
  LG.handleControl = handleControl;
  // Kontrol mesajı gönder (sunucu paneli kullanır). Köprü yoksa aynı tarayıcıdaki sekmelere gider.
  LG.sendControl = function (msg) {
    var m = Object.assign({ type: 'control' }, msg);
    var sent = false;
    for (var i = 0; i < sockets.length; i++) if (sockets[i].send(m)) sent = true;
    try { if (LG.hostBus) LG.hostBus.channel.postMessage({ __control: m }); } catch (e) {}
    return sent;
  };
  function connectTikfinity() {
    return new Socket(LG.config.tikfinityUrl, 'TikFinity', function (msg) {
      if (!msg) return;
      var evt = LG.normalizeRaw(msg.event, msg.data);
      if (evt) LG.emit(evt);
    });
  }

  LG.connect = function () {
    var src = LG.config.source;
    if (src === 'sim') { setConn('simülasyon', 'sim'); return; }
    if (src === 'bridge') { connectBridge().open(); return; }
    if (src === 'tikfinity') { connectTikfinity().open(); return; }
    // auto: ikisini de dene; ilk olay gelen kazanır, diğeri kapatılır.
    var a = connectBridge(), b = connectTikfinity();
    var chosen = null;
    LG.on('connection', function (c) {
      if (chosen || c.state !== 'bağlı') return;
      chosen = c.source;
      if (chosen === 'köprü') b.close(); else a.close();
    });
    a.open(); b.open();
  };

  // ---------------------------------------------------------------------------
  // Sunucu paneline yayın (aynı tarayıcıdaki diğer sekmeler için)
  // ---------------------------------------------------------------------------
  try {
    if ('BroadcastChannel' in window) {
      var bc = new BroadcastChannel('lg-host');
      LG.hostBus = {
        post: function (evt) {
          try {
            bc.postMessage({
              type: evt.type, text: evt.text, count: evt.count, isNew: evt.isNew, flagged: evt.flagged,
              gift: evt.gift && { name: evt.gift.name, coins: evt.gift.coins, count: evt.gift.count, tier: evt.gift.tier },
              user: evt.user && { id: evt.user.id, name: evt.user.name, coins: evt.user.coins, comments: evt.user.comments, likes: evt.user.likes },
              game: LG.gameId || '',
            });
          } catch (e) { /* yok say */ }
        },
        channel: bc,
      };
      bc.onmessage = function (m) { if (m && m.data && m.data.__control) handleControl(m.data.__control); };
    }
  } catch (e) { /* yok say */ }

  // ---------------------------------------------------------------------------
  // Tuval, ölçekleme ve oyun döngüsü
  // ---------------------------------------------------------------------------
  LG.keys = {};
  var keyHandlers = [];
  LG.onKey = function (key, desc, fn) { keyHandlers.push({ key: key.toLowerCase(), desc: desc, fn: fn }); };
  LG.keyHelp = function () { return keyHandlers.map(function (k) { return { key: k.key, desc: k.desc }; }); };

  LG.start = function (game) {
    LG.game = game;
    LG.gameId = game.id || '';
    document.title = (game.title || 'Canlı Oyun') + (LG.config.brand ? ' — ' + LG.config.brand : '');
    var canvas = document.createElement('canvas');
    canvas.width = LG.W; canvas.height = LG.H;
    canvas.id = 'lg-canvas';
    document.body.appendChild(canvas);
    if (LG.config.transparent) document.documentElement.classList.add('lg-transparent');
    if (LG.config.renk) canvas.style.filter = 'hue-rotate(' + LG.config.renk + 'deg)';
    var ctx = canvas.getContext('2d');
    LG.canvas = canvas; LG.ctx = ctx;

    function fit() {
      var s = Math.min(window.innerWidth / LG.W, window.innerHeight / LG.H);
      canvas.style.width = Math.floor(LG.W * s) + 'px';
      canvas.style.height = Math.floor(LG.H * s) + 'px';
      LG.scale = s;
    }
    window.addEventListener('resize', fit);
    fit();

    // Fare/dokunma koordinatlarını oyun koordinatına çevir
    LG.toGame = function (clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      return { x: (clientX - r.left) / r.width * LG.W, y: (clientY - r.top) / r.height * LG.H };
    };

    // Klavye
    window.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      var k = e.key.toLowerCase();
      LG.keys[k] = true;
      if (LG.audio) LG.audio.unlock();
      for (var i = 0; i < keyHandlers.length; i++) {
        if (keyHandlers[i].key === k) { e.preventDefault(); keyHandlers[i].fn(e); }
      }
    });
    window.addEventListener('keyup', function (e) { LG.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('pointerdown', function () { if (LG.audio) LG.audio.unlock(); });

    // Varsayılan kısayollar
    LG.onKey('h', 'Kısayol yardımını aç/kapat', function () { LG.ui && LG.ui.toggleHelp(); });
    LG.onKey('m', 'Sesi aç/kapat', function () { if (LG.audio) LG.audio.toggleMute(); });
    LG.onKey('s', 'Simülatör panelini aç/kapat', function () { if (LG.sim) LG.sim.togglePanel(); });
    LG.onKey('d', 'Demo botlarını başlat/durdur', function () { if (LG.sim) LG.sim.toggleAuto(); });
    LG.onKey('p', 'Duraklat / devam', function () { LG.paused = !LG.paused; });

    if (game.init) game.init(ctx);
    LG.connect();
    if (LG.sim && (LG.config.sim || LG.config.demo || LG.config.source === 'sim')) LG.sim.init();

    var last = performance.now();
    var acc = 0;
    var frames = 0, fpsT = 0;
    LG.fps = 60;
    LG.time = 0;
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frames++; fpsT += dt;
      if (fpsT >= 1) { LG.fps = frames / fpsT; frames = 0; fpsT = 0; }
      if (!LG.paused) {
        LG.time += dt;
        try { if (game.update) game.update(dt, LG.time); } catch (e) { console.error('[LG] update hatası', e); }
        if (LG.ui) LG.ui.update(dt);
      }
      try {
        if (LG.config.transparent) ctx.clearRect(0, 0, LG.W, LG.H);
        if (game.render) game.render(ctx, LG.time);
        if (LG.ui) LG.ui.renderOverlay(ctx, LG.time);
      } catch (e) { console.error('[LG] render hatası', e); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    window.__LG_READY = true;
  };
})();
