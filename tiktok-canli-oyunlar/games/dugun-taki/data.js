/*
 * Düğün Var! — metinler ve listeler.
 * Satış/uyarlama için: yazıları buradan değiştirmek yeterli.
 * URL ile kişiselleştirme: ?gelin=Ayşe&damat=Ali  (çift adları)  ·  ?tur=210 (düğün süresi, sn)
 */
(function () {
  'use strict';
  window.DUGUN_DATA = {
    T: {
      title: 'DÜĞÜN VAR!',
      now: 'Şimdi:',
      wedding: 'Düğün',
      newHava: 'Yeni hava',
      sec: 'sn',
      davul: 'DAVUL',
      davulHot: 'COŞUYOR!',
      davulMax: 'DAVULCU COŞTU! 🔥',
      defter: 'Takı Defteri',
      defterEmpty: 'Defter açık, kalem hazır ✍️',
      total: 'Toplam',
      halaybasi: 'HALAYBAŞI',
      newLeader: 'Yeni halaybaşı',
      leaderTop: '🧣 MENDİL EL DEĞİŞTİRDİ',
      takiTop: '📣 TAKI MERASİMİ',
      bigTop: '📣 TAKI MERASİMİ — ALKIŞLAR!',
      joinPrompt: '💬 Yorum yaz, halaya sen de katıl!',
      follow: 'davetli listesine eklendi 💌',
      share: 'düğünü duyurdu 📣',
      rose: 'gül yaprakları serpti',
      styleWon: 'ŞİMDİ:',
      styleKeep: 'devam!',
      davulcuPick: 'Davulcu seçti:',
      coupleDance: 'GELİN-DAMAT OYNASIN! 💃🕺',
      finale: '🎉 GECENİN FİNALİ! 🎉',
      finaleDone: 'TAMAM!',
      happy: 'bir yastıkta kocayın! 💐',
      stars: 'Gecenin yıldızları',
      guests: 'misafir halaya katıldı',
      noTaki: 'Takı: gönüller dolu 💖',
      nextWedding: 'Yeni düğün geliyor… 💍',
      started: 'BAŞLADI!',
      car: 'ARABA ANAHTARI! 🔑🚗',
      bilezik: 'BİLEZİK SETİ! 💍✨',
      hey: 'HEY!',
      shuffle: 'Halay karıştı! 🔀',
      hostGave: 'Sunucu mendili verdi 🎙️ — hadi bakalım, göster kendini!',
      hints: [
        '💬 Yorum yaz → halaya katıl',
        '🎶 halay/horon/çiftetelli yaz → oyun havası seç',
        '❤️ Beğen → davulcu coşsun',
        '🎁 Hediye → takı tak',
        '🙌 "hey" yaz → zıpla, bağır!',
      ],
    },
    // Takı türleri (hediye kademesine göre)
    TAKI: {
      c: { name: 'ÇEYREK ALTIN', short: 'Çeyrek', r: 12 },
      y: { name: 'YARIM ALTIN', short: 'Yarım', r: 15 },
      t: { name: 'TAM ALTIN', short: 'Tam', r: 19 },
      b: { name: 'BİLEZİK SETİ', short: 'Bilezik', r: 18 },
      k: { name: 'ARABA ANAHTARI', short: 'Araba 🚗', r: 22 },
    },
    // Düğün sunucusu tarzı komik akrabalık satırları
    RELATIONS: [
      'Gelinin halasının komşusu', 'Damadın askerlik arkadaşı', 'Kızın teyzesinin kuaförü', 'Mahallenin muhtarı',
      'Uzaktan akraba', 'Davetsiz ama sevimli misafir', 'Damadın çocukluk arkadaşı', 'Gelinin kuzeninin kuzeni',
      'Köyün en hızlı halaycısı', 'Damadın dayısının bacanağı', 'Gelinin ilkokul öğretmeni', 'Karşı komşunun kedisi adına',
      'Kına gecesinin yıldızı', 'Dünürün dünürü', 'Damadın annesinin manikürcüsü', 'Gelinin en yakın arkadaşı',
      'Mahallenin bakkalı', 'Yoldan geçerken davulu duyan', 'İnternetten gelen kuzen', 'Gelinin yengesinin halası',
      'Damadın halı saha arkadaşı', 'Gurbetçi amca (Almanya’dan)', 'Fotoğrafçının yardımcısı', 'Komşu köyün muhtarı',
      'Davulcunun annesi', 'Zurnacının hayranı', 'Gelinin kayınbiraderinin arkadaşı', 'Düğünü canlıdan izleyen akraba',
      'Damadın patronu (izin verdi!)', 'Halayı bölen ama sevilen dayı',
    ],
    CHEERS: ['Alkışlarınızla! 👏', 'Bir yastıkta kocayın! 💐', 'Var olun! 👏', 'Maşallah! 🧿', 'Gözünüz aydın! ✨', 'Alkışlar! 👏👏'],
    // Hediye adına göre ek (tat veren) satırlar — kademe her zaman belirleyici
    GIFT_FLAVOR: [
      { words: ['türk kahvesi', 'kahve', 'coffee'], line: '☕ Gelin kahvesi (tuzsuz!)' },
      { words: ['çay', 'tea'], line: '☕ Herkese çay benden!' },
      { words: ['buket', 'bouquet', 'gül', 'rose'], line: '💐 Gelin buketi de geldi!' },
      { words: ['rüzgar dansözü', 'dansöz', 'dancer'], line: '💃 Piste rüzgâr gibi daldı!' },
      { words: ['kurt', 'wolf'], line: '🐺 Kurt gibi misafir!' },
    ],
    // Henüz kimse yokken halayı çeken köy ahalisi (gerçek izleyiciler gelince masalara oturur)
    NPC: ['Hüsnü Dayı', 'Fadime Teyze', 'Rıza Amca', 'Nazmiye Hala', 'Bekir Enişte', 'Cemile Yenge', 'Kâmil Dede', 'Sabahat Abla', 'Şükrü Amca', 'Hayriye Nine',
      'Cafer Abi', 'Zehra Yenge', 'Necmi Amca', 'Ayten Teyze', 'Halil Dayı', 'Gülizar Hala', 'Yaşar Amca', 'Melahat Teyze', 'Recep Dayı',
      'Saniye Yenge', 'Kadir Abi', 'Emine Nine'],
    COUPLES: [['Zeynep', 'Emre'], ['Elif', 'Burak'], ['Ayşe', 'Mehmet'], ['Merve', 'Can'], ['Selin', 'Kerem'], ['Esra', 'Yusuf'],
      ['Derya', 'Onur'], ['Büşra', 'Ömer'], ['Gül', 'Hasan'], ['İrem', 'Barış'], ['Sude', 'Kaan'], ['Ebru', 'Cem']],
    // Oyun havaları: anahtar kelimeler yorumda geçerse oy sayılır
    STYLES: [
      { id: 'halay', name: 'HALAY', title: 'Halay', emoji: '🎶', music: 'halay', tempo: 1.0, speed: 1.0, link: 'shoulder', kw: ['halay', 'halaay', 'halay çek', 'halaya'] },
      { id: 'horon', name: 'HORON', title: 'Horon', emoji: '🌊', music: 'horon', tempo: 1.0, speed: 1.55, link: 'low', kw: ['horon', 'horona', 'hooron'] },
      { id: 'ciftetelli', name: 'ÇİFTETELLİ', title: 'Çiftetelli', emoji: '💃', music: 'party', tempo: 0.95, speed: 0.5, link: null, kw: ['çiftetelli', 'ciftetelli', 'çifte telli', 'cifte telli', 'çiftetelliii'] },
      { id: 'zeybek', name: 'ZEYBEK', title: 'Zeybek', emoji: '🦅', music: 'halay', tempo: 0.68, speed: 0.4, link: null, kw: ['zeybek', 'zeybeğe', 'zeybek oyna'] },
      { id: 'roman', name: 'ROMAN', title: 'Roman', emoji: '🎺', music: 'party', tempo: 1.12, speed: 0.85, link: null, kw: ['roman', 'roman havası', 'roman havasi'] },
      { id: 'kolbasti', name: 'KOLBASTI', title: 'Kolbastı', emoji: '🔥', music: 'horon', tempo: 1.08, speed: 1.2, link: 'shoulder', kw: ['kolbastı', 'kolbasti', 'kol bastı', 'kol basti'] },
    ],
    SIM_COMMENTS: [
      ['halay', 5], ['halay çekelim!', 2], ['horon', 5], ['horon horon 🌊', 2], ['çiftetelli', 3], ['zeybek', 3], ['roman havası', 2], ['roman', 2],
      ['kolbastı', 3], ['hey', 4], ['heeey 🙌', 2], ['oley', 2], ['maşallah', 3], ['mutluluklar 💐', 3], ['bir yastıkta kocayın', 2],
      ['gelin çok güzel', 2], ['damat yakışıklı', 2], ['davulcu süper 🥁', 2], ['davul davul!', 1], ['zurna çal', 1], ['alkışlar 👏', 2],
      ['ben de geldim', 2], ['halaybaşı ben olayım', 2], ['nerede bu düğün', 1], ['selam düğün evi', 2], ['oynayalım', 2],
    ],
  };
})();
