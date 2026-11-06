/*
 * KARPUZ PATLAT! 🍉 — veri: metinler (TR/EN), meyveler, renk kelimeleri, simülatör yorumları.
 */
(function () {
  'use strict';
  var KP = (window.KP = window.KP || {});
  var EN = LG.config.lang === 'en';
  KP.EN = EN;

  var TR_TEXT = {
    title: 'KARPUZ PATLAT! 🍉',
    round: 'TUR',
    bandsUnit: 'LASTİK',
    tension: 'GERİLİM',
    pct: '%{n}',
    guessChip: 'TAHMİN',
    guessClosedChip: 'TAHMİN KAPANDI',
    levels: ['RAHAT 😌', 'GERİLİYOR 😬', 'ÇATIRDIYOR! 😰', 'HER AN PATLAYABİLİR! 😱'],
    burstLevel: 'PATLADI! 💥',
    lastTitle: 'SON LASTİK',
    heroesTitle: 'KAHRAMAN',
    emptyList: 'İlk sen ol!',
    hints: [
      '💬 Yorum yaz → lastik tak',
      '❤️ Beğen → ince lastik',
      '🎁 Hediye → kalın lastik',
      '🔢 Sayı yaz → kaçta patlar? Tahmin et',
      '🎨 Renk yaz → lastiğin o renk olsun',
      '💥 Kim patlatacak?',
    ],
    firstCall: '💬 Yorum yaz, ilk lastiği sen tak!',
    arrived: '{f} GELDİ!',
    ready: 'Lastikler hazır mı? 💬',
    roundN: '{n}. TUR',
    burster: '💥 PATLATAN 💥',
    burstEveryone: 'HEPİMİZ',
    together: 'Hep birlikte patlattık! 🎉',
    heroes: '🏆 Kahramanlar',
    statBands: '🎗️ {n} lastik',
    statPeople: '👥 {n} kişi',
    statTime: '⏱ {t}',
    closest: '🎯 En yakın tahmin: {name} ({g})',
    exact: '🎯 TAM BİLDİ: {name} ({g})!',
    guessesClosed: 'Tahminler kapandı!',
    thick: 'KALIN LASTİK! 💪',
    mega: 'MEGA SIKMA! 🗜️',
    rain: 'DEV LASTİK YAĞMURU! 🌧️',
    plusBands: '+{n} lastik',
    thanks: 'Teşekkürler 💖',
    thanksBig: 'Çok teşekkürler! 💖',
    thanksHuge: 'MUHTEŞEMSİN! Teşekkürler 💖',
    followed: '{name} takip etti 💖',
    shared: '{name} seyirci çağırdı 📣',
    newcomer: '👋 {name}',
    tease: 'ÇATIRT! 😱',
    kicked: 'Bu meyve kaçtı! 😅 Yenisi geliyor',
    waiting: '{n} lastik sırada! 🎗️',
    cleaning: 'Temizlik! 🧹',
    next: 'Sıradaki: {f}',
    giftBands: '{gift} → +{n} lastik',
  };

  var EN_TEXT = {
    title: 'POP THE MELON! 🍉',
    round: 'ROUND',
    bandsUnit: 'BANDS',
    tension: 'TENSION',
    pct: '{n}%',
    guessChip: 'GUESSES',
    guessClosedChip: 'GUESSES CLOSED',
    levels: ['CHILL 😌', 'STRETCHING 😬', 'CRACKING! 😰', 'ANY SECOND NOW! 😱'],
    burstLevel: 'BOOM! 💥',
    lastTitle: 'LATEST',
    heroesTitle: 'HEROES',
    emptyList: 'Be the first!',
    hints: [
      '💬 Comment → add a band',
      '❤️ Like → thin band',
      '🎁 Gift → thick band',
      '🔢 Type a number → guess the pop',
      '🎨 Type a color → color your band',
      '💥 Who will pop it?',
    ],
    firstCall: '💬 Comment to add the first band!',
    arrived: '{f} IS HERE!',
    ready: 'Bands ready? 💬',
    roundN: 'ROUND {n}',
    burster: '💥 POPPED BY 💥',
    burstEveryone: 'ALL OF US',
    together: 'We popped it together! 🎉',
    heroes: '🏆 Heroes',
    statBands: '🎗️ {n} bands',
    statPeople: '👥 {n} people',
    statTime: '⏱ {t}',
    closest: '🎯 Closest guess: {name} ({g})',
    exact: '🎯 SPOT ON: {name} ({g})!',
    guessesClosed: 'Guesses closed!',
    thick: 'THICK BAND! 💪',
    mega: 'MEGA SQUEEZE! 🗜️',
    rain: 'GIANT BAND RAIN! 🌧️',
    plusBands: '+{n} bands',
    thanks: 'Thank you 💖',
    thanksBig: 'Thank you so much! 💖',
    thanksHuge: 'YOU ARE AMAZING! 💖',
    followed: '{name} followed 💖',
    shared: '{name} called friends 📣',
    newcomer: '👋 {name}',
    tease: 'CRACK! 😱',
    kicked: 'This one got away! 😅 Next one coming',
    waiting: '{n} bands waiting! 🎗️',
    cleaning: 'Clean up! 🧹',
    next: 'Next: {f}',
    giftBands: '{gift} → +{n} bands',
  };

  KP.T = EN ? EN_TEXT : TR_TEXT;
  KP.fmt = function (s, o) {
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] != null ? o[k] : ''; });
  };

  // ---------------------------------------------------------------------------
  // Meyveler (sırayla döner). rx/ry = gövde yarıçapları, shape = siluet, pattern = kabuk deseni
  // ---------------------------------------------------------------------------
  KP.FRUITS = [
    {
      id: 'karpuz', name: 'KARPUZ', en: 'WATERMELON', emoji: '🍉', rx: 272, ry: 250, shape: 'round',
      skin: ['#a6e37a', '#4fae3c', '#1f6a22'], pattern: 'stripes', pc: '#1c5a20', outline: '#123d14',
      flesh: '#ff3b55', rind: '#f1fbd2', juice: '#ff2148', seed: '#1b1010', top: 'nub', word: 'PAT!', burst: 'juice',
    },
    {
      id: 'kavun', name: 'KAVUN', en: 'MELON', emoji: '🍈', rx: 270, ry: 222, shape: 'round',
      skin: ['#fff3a6', '#f0c741', '#a7801a'], pattern: 'net', pc: 'rgba(255,250,225,0.85)', outline: '#6e5310',
      flesh: '#ffae5c', rind: '#d8f0a4', juice: '#ffa53d', seed: '#fff0c8', top: 'nub', word: 'ŞAP!', burst: 'juice',
    },
    {
      id: 'balkabagi', name: 'BALKABAĞI', en: 'PUMPKIN', emoji: '🎃', rx: 280, ry: 212, shape: 'pumpkin',
      skin: ['#ffc061', '#f57d14', '#a84605'], pattern: 'ribs', pc: 'rgba(120,40,0,0.55)', outline: '#6b2c02',
      flesh: '#ff962a', rind: '#ffd28a', juice: '#ff8a12', seed: '#fff4d6', top: 'stem', word: 'BUM!', burst: 'juice',
    },
    {
      id: 'balon', name: 'DEV BALON', en: 'GIANT BALLOON', emoji: '🎈', rx: 252, ry: 262, shape: 'balloon',
      skin: ['#ff9ab4', '#ff2d62', '#9e0b37'], pattern: 'none', pc: '', outline: '#6d0626',
      flesh: '#ff5c86', rind: '#ff8fab', juice: '#ff3a6e', seed: '#ffd166', top: 'knot', word: 'POP!', burst: 'confetti',
    },
    {
      id: 'ananas', name: 'ANANAS', en: 'PINEAPPLE', emoji: '🍍', rx: 212, ry: 232, shape: 'barrel',
      skin: ['#ffe07a', '#e0a526', '#8f5a0e'], pattern: 'diamond', pc: 'rgba(255,240,170,0.7)', outline: '#5e3a06',
      flesh: '#ffe45c', rind: '#e8b33a', juice: '#ffd21f', seed: '#8a5a12', top: 'crown', word: 'ŞLAK!', burst: 'juice',
    },
  ];
  KP.fruitName = function (F) { return EN ? F.en : F.name; };

  // ---------------------------------------------------------------------------
  // Renk kelimeleri: yorumda geçerse lastik o renk olur
  // ---------------------------------------------------------------------------
  KP.COLORS = {
    '#ff2e43': ['kırmızı', 'kirmizi', 'red', 'kızıl'],
    '#2f7bff': ['mavi', 'blue'],
    '#1fd16b': ['yeşil', 'yesil', 'green'],
    '#ffd60a': ['sarı', 'sari', 'yellow'],
    '#9b5de5': ['mor', 'purple', 'lila'],
    '#ff5fb0': ['pembe', 'pink'],
    '#ff8c1a': ['turuncu', 'orange'],
    '#2a2a35': ['siyah', 'black', 'kara'],
    '#f4f4f4': ['beyaz', 'white'],
    '#1e3a8a': ['lacivert', 'navy'],
    '#18c7c7': ['turkuaz', 'turquoise'],
    '#ffc933': ['altın', 'altin', 'gold'],
  };

  // ---------------------------------------------------------------------------
  // Simülatör: oyuna uygun yorumlar (sayı tahmini, renk, "patlat" ve sohbet)
  // ---------------------------------------------------------------------------
  var GEN = [
    ['🍉🍉🍉', 3], ['dayan karpuz 😂', 2], ['patlayacak!!', 3], ['kaç lastik oldu?', 1], ['selam', 3], ['merhaba', 2],
    ['ben de lastik taktım', 2], ['😱😱', 2], ['aman yavaş', 1], ['bu sefer kesin patlar', 2], ['ilk kez izliyorum', 1],
    ['harika oyun', 1], ['❤️❤️', 2], ['bir tane daha', 2], ['çatlıyor bak', 2], ['hadi hadi hadi', 2], ['kim patlatacak', 1],
    ['gerildi resmen 😬', 1], ['ben patlatırım', 2], ['iyi yayınlar', 1], ['sulu sulu 😋', 1], ['😂😂', 2],
  ];
  function weighted(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i][1];
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
    return list[0][0];
  }
  KP.simComment = function () {
    var r = Math.random();
    if (r < 0.16) return Math.random() < 0.5 ? String(LG.randi(30, 180)) : LG.randi(30, 180) + ' de patlar';
    if (r < 0.32) return LG.pick(['kırmızı', 'mavi', 'yeşil', 'sarı', 'mor', 'pembe', 'turuncu', 'pembe olsun 💖', 'mavi lastik', 'altın', 'turkuaz', 'siyah']);
    if (r < 0.46) return LG.pick(['patlat!', 'hadi patlat', '💥💥', 'patlat şunu', 'patlaaat', 'hadi']);
    return weighted(GEN);
  };
})();
