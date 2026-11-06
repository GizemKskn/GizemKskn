/*
 * Çay Ocağı — veri: menü, günün sohbeti konuları, kahvehane muhabbeti, teşekkür ve espri satırları.
 * KURALLAR: Siyaset, din, futbol kulübü, gerçek kişi/marka YOK. Her şey zararsız ve sıcak.
 */
(function () {
  'use strict';
  var D = (window.CAY_DATA = {});

  // Menü: komut kelimeleri (Türkçe karakter duyarsız, tam kelime). Sıra önemli: önce özel olanlar.
  // item: masaya gelen şey, v: çeşit, label: sipariş balonunda görünen yazı
  D.ORDERS = [
    { words: ['tavşan kanı', 'tavsan kani'], item: 'cay', v: 'tavsan', label: 'tavşan kanı', icon: '🫖' },
    { words: ['demli', 'koyu çay', 'demli çay', 'demlisinden'], item: 'cay', v: 'demli', label: '1 demli', icon: '🫖' },
    { words: ['açık', 'acik', 'açık çay', 'açığından'], item: 'cay', v: 'acik', label: '1 açık', icon: '🫖' },
    { words: ['çay', 'cay', 'çayy', 'caay', 'çaycı', 'cayci', 'tea', 'çaylar', 'çayımı', 'çayı'], item: 'cay', v: 'normal', label: '1 çay', icon: '🫖' },
    { words: ['kahve', 'türk kahvesi', 'kahvesi', 'coffee', 'sade kahve', 'orta kahve', 'şekerli kahve', 'kahveci'], item: 'kahve', v: 'orta', label: '1 kahve', icon: '☕' },
    { words: ['oralet', 'portakal çayı'], item: 'oralet', v: 'portakal', label: '1 oralet', icon: '🍊' },
    { words: ['salep', 'sahlep'], item: 'salep', v: 'salep', label: '1 salep', icon: '🤎', secret: true },
    { words: ['ıhlamur', 'ihlamur', 'bitki çayı', 'adaçayı', 'ada çayı'], item: 'ihlamur', v: 'ihlamur', label: '1 ıhlamur', icon: '🌿', secret: true },
    { words: ['soda', 'maden suyu', 'maden', 'gazoz'], item: 'su', v: 'soda', label: '1 soda', icon: '🫧' },
    { words: ['su', 'bir su', 'su ver', 'water'], item: 'su', v: 'su', label: '1 su', icon: '💧' },
    { words: ['simit', 'simitçi', 'simitci', 'poğaça', 'pogaca', 'açma'], item: 'simit', v: 'simit', label: '1 simit', icon: '🥯' },
    { words: ['tost', 'kaşarlı', 'karışık tost', 'tostçu'], item: 'tost', v: 'tost', label: '1 tost', icon: '🥪' },
    { words: ['ayran', 'ayranı'], item: 'ayran', v: 'ayran', label: '1 ayran', icon: '🥛' },
  ];
  D.COFFEE_SUGAR = { sade: ['sade'], orta: ['orta'], sekerli: ['şekerli', 'sekerli', 'tatlı'] };

  D.WORDS = {
    hesap: ['hesap', 'hesap lütfen', 'hesabı', 'kalkıyorum', 'kalkiyorum', 'görüşürüz', 'gorusuruz', 'iyi geceler', 'bye', 'kaçtım', 'kactim'],
    benden: ['benden', 'çay benden', 'ısmarlıyorum', 'ismarliyorum', 'ikram benden'],
    tavla: ['tavla', 'zar', 'zar at', 'zarat', 'düşeş', 'duses', 'okey'],
    pisi: ['pisi', 'pisipisi', 'pisi pisi', 'kedi', 'miyav', 'sarman', 'mırmır', 'pısı'],
  };

  // GÜNÜN SOHBETİ — [soru, [A etiketi, kelimeler...], [B etiketi, kelimeler...]]
  D.TOPICS = [
    ['Çay demli mi açık mı?', ['Demli', 'demli', 'koyu'], ['Açık', 'açık', 'acik']],
    ['Kış mı yaz mı?', ['Kış', 'kış', 'kis'], ['Yaz', 'yaz']],
    ['Simit mi poğaça mı?', ['Simit', 'simit'], ['Poğaça', 'poğaça', 'pogaca']],
    ['Kedi mi köpek mi?', ['Kedi', 'kedi', 'pisi'], ['Köpek', 'köpek', 'kopek', 'kuçu']],
    ['Sabah insanı mı, gece kuşu mu?', ['Sabah', 'sabah', 'sabahçı'], ['Gece', 'gece', 'gece kuşu']],
    ['Deniz mi dağ mı?', ['Deniz', 'deniz'], ['Dağ', 'dağ', 'dag']],
    ['Tatlı mı tuzlu mu?', ['Tatlı', 'tatlı', 'tatli'], ['Tuzlu', 'tuzlu']],
    ['Menemen soğanlı mı soğansız mı?', ['Soğanlı', 'soğanlı', 'soganli'], ['Soğansız', 'soğansız', 'sogansiz']],
    ['Çay mı kahve mi?', ['Çay', 'çay', 'cay'], ['Kahve', 'kahve']],
    ['Baklava mı künefe mi?', ['Baklava', 'baklava'], ['Künefe', 'künefe', 'kunefe']],
    ['Mantı mı lahmacun mu?', ['Mantı', 'mantı', 'manti'], ['Lahmacun', 'lahmacun']],
    ['Döner: dürüm mü ekmek arası mı?', ['Dürüm', 'dürüm', 'durum'], ['Ekmek', 'ekmek', 'ekmek arası']],
    ['Film mi dizi mi?', ['Film', 'film'], ['Dizi', 'dizi']],
    ['Kitap mı podcast mi?', ['Kitap', 'kitap'], ['Podcast', 'podcast', 'podcast']],
    ['Şehir mi köy mü?', ['Şehir', 'şehir', 'sehir'], ['Köy', 'köy', 'koy']],
    ['Yağmur mu kar mı?', ['Yağmur', 'yağmur', 'yagmur'], ['Kar', 'kar']],
    ['Pijama mı eşofman mı?', ['Pijama', 'pijama'], ['Eşofman', 'eşofman', 'esofman']],
    ['Pizza mı hamburger mi?', ['Pizza', 'pizza'], ['Hamburger', 'hamburger', 'burger']],
    ['Dondurma: külah mı kase mi?', ['Külah', 'külah', 'kulah', 'kornet'], ['Kase', 'kase']],
    ['Patates: ketçap mı mayonez mi?', ['Ketçap', 'ketçap', 'ketcap'], ['Mayonez', 'mayonez']],
    ['Tatil: otel mi kamp mı?', ['Otel', 'otel'], ['Kamp', 'kamp']],
    ['Yazılı mesaj mı sesli mesaj mı?', ['Yazılı', 'yazılı', 'yazili', 'yazı'], ['Sesli', 'sesli']],
    ['İlkbahar mı sonbahar mı?', ['İlkbahar', 'ilkbahar', 'bahar'], ['Sonbahar', 'sonbahar', 'güz']],
    ['Sıcak çikolata mı salep mi?', ['Çikolata', 'çikolata', 'cikolata'], ['Salep', 'salep', 'sahlep']],
    ['Lokum mu helva mı?', ['Lokum', 'lokum'], ['Helva', 'helva']],
    ['Börek mi gözleme mi?', ['Börek', 'börek', 'borek'], ['Gözleme', 'gözleme', 'gozleme']],
    ['Kumpir mi midye mi?', ['Kumpir', 'kumpir'], ['Midye', 'midye']],
    ['Yürüyüş mü bisiklet mi?', ['Yürüyüş', 'yürüyüş', 'yuruyus'], ['Bisiklet', 'bisiklet']],
    ['Plaj mı havuz mu?', ['Plaj', 'plaj', 'deniz'], ['Havuz', 'havuz']],
    ['Karpuz mu kavun mu?', ['Karpuz', 'karpuz'], ['Kavun', 'kavun']],
    ['Mercimek mi ezogelin mi?', ['Mercimek', 'mercimek'], ['Ezogelin', 'ezogelin']],
    ['Kahvaltıda kaşar mı beyaz peynir mi?', ['Kaşar', 'kaşar', 'kasar'], ['Beyaz', 'beyaz', 'beyaz peynir']],
    ['Zeytin siyah mı yeşil mi?', ['Siyah', 'siyah'], ['Yeşil', 'yeşil', 'yesil']],
    ['Yumurta rafadan mı katı mı?', ['Rafadan', 'rafadan'], ['Katı', 'katı', 'kati']],
    ['Çay bardağı ince belli mi kupa mı?', ['İnce belli', 'ince', 'ince belli'], ['Kupa', 'kupa']],
    ['Öğle uykusu şart mı?', ['Şart', 'şart', 'sart', 'evet'], ['Gerek yok', 'gerek yok', 'hayır', 'hayir']],
    ['Tavla mı okey mi?', ['Tavla', 'tavla'], ['Okey', 'okey']],
    ['Kuru fasulye pilavla mı ekmekle mi?', ['Pilav', 'pilav', 'pilavla'], ['Ekmek', 'ekmek', 'ekmekle']],
    ['Pizzaya ananas olur mu?', ['Olur', 'olur'], ['Olmaz', 'olmaz']],
    ['Çiğ köfte acılı mı acısız mı?', ['Acılı', 'acılı', 'acili'], ['Acısız', 'acısız', 'acisiz']],
    ['Lahmacun limonlu mu limonsuz mu?', ['Limonlu', 'limonlu'], ['Limonsuz', 'limonsuz']],
    ['Sahilde güneş mi gölge mi?', ['Güneş', 'güneş', 'gunes'], ['Gölge', 'gölge', 'golge']],
    ['Sütlaç mı kazandibi mi?', ['Sütlaç', 'sütlaç', 'sutlac'], ['Kazandibi', 'kazandibi']],
    ['Mandalina mı portakal mı?', ['Mandalina', 'mandalina'], ['Portakal', 'portakal']],
    ['Pazar kahvaltısı evde mi dışarıda mı?', ['Evde', 'evde', 'ev'], ['Dışarıda', 'dışarıda', 'disarida', 'dışarı']],
    ['Kış akşamı: battaniye mi soba başı mı?', ['Battaniye', 'battaniye'], ['Soba', 'soba', 'soba başı']],
    ['Kestane mi mısır mı?', ['Kestane', 'kestane'], ['Mısır', 'mısır', 'misir']],
    ['Telefon sessizde mi sesli mi?', ['Sessiz', 'sessiz', 'sessizde'], ['Sesli', 'sesli']],
    ['Erken gelen mi geç kalan mı?', ['Erken', 'erken'], ['Geç', 'geç', 'gec']],
    ['Ev kuşu mu gezgin mi?', ['Ev kuşu', 'ev', 'evci'], ['Gezgin', 'gezgin', 'gezmek']],
  ];

  // Kahvehane muhabbeti (simülatör için)
  D.CHATTER = [
    'Akşamlar hayırlı olsun', 'Ocak sıcak mı?', 'Çaycı bakar mısın!', 'Hava ne güzel bugün', 'Tavla oynayan var mı?',
    'Simitçi nerede kaldı?', 'Benim çay soğudu 😂', 'Kolay gelsin çaycı', 'Ellerine sağlık', 'Bu kedi kimin?',
    'Radyoyu açın biraz', 'Merhaba kahvehane', 'Akşam akşam çay iyi gider', 'Yer var mı?', 'Şu köşe bizim masa',
    'Gazete kimde?', 'Abi bir bakar mısın', 'Ben müdavimim 😎', 'İlk defa geldim', 'Çok güzel ortam',
    'Huzur burada', 'Yarın yine geliriz', 'Çay demlenmiş mi?', 'Şeker var mı?', 'Sohbet koyu bugün',
    'Selam millet', 'Kahvehane full 😂', 'Kedi çok tatlı', 'Masa bizim!', 'Bugün çok yoruldum',
    'Burası çok huzurlu', 'Çaycı koş koş 😂', 'Geldim ben', 'Kalabalık bugün', 'Hayırlı akşamlar ahali',
    'İş çıkışı tam ilaç', 'Bir de lokum olsa', 'Annem selam söyledi', 'Kim kazandı tavlayı?', 'Çay bardağı ince belli olmalı',
  ];

  // Teşekkür (ikram edilen kişi söyler) — {n} = ikram eden
  D.THANKS = ['Sağ ol {n}!', 'Eksik olma {n}!', 'Var ol {n}! 🫖', 'Çok yaşa {n}!', 'Eyvallah {n}!', 'Ellerine sağlık {n}!'];

  // Çaycının lafları
  D.CAYCI = {
    idle: ['Çaylar taze!', 'Demlik tıkır tıkır 🫖', 'Buyurun, oturun!', 'Bir çay içmeden gitmek yok!', 'Ocak yanıyor, çay hazır'],
    rush: ['Geliyooor!', 'Hop hop!', 'Çaylar uçuyor!', 'Yetiş çırak!', 'Aman dökmeyelim!'],
    brew: ['Taze demliyorum, az sabır!', 'Demlik tazeleniyor ⏳'],
    ready: ['Taze çay geldi! 🫖', 'Tavşan kanı demlendi!'],
    secret: 'Gizli menüden! 🤫',
  };

  // Tavla çiftleri
  D.DICE_NAMES = { '1-1': 'Hep yek!', '2-2': 'Dubara!', '3-3': 'Dü se!', '4-4': 'Dört cihar!', '5-5': 'Dü beş!', '6-6': 'DÜŞEŞ!', '5-6': 'Şeş beş!', '6-5': 'Şeş beş!' };

  // Tavla oynayan iki emekli (boş kahvehaneyi canlı tutar; masa dolunca yer açarlar)
  D.NPC = [
    { id: 'npc_riza', name: 'Rıza Amca', emoji: '👴', hue: 28 },
    { id: 'npc_nuri', name: 'Nuri Dayı', emoji: '🧔', hue: 200 },
  ];
  D.NPC_LINES = ['Hadi at zarı!', 'Mars ettim seni!', 'Bu oyun bitmez 😄', 'Şeş beş geldi!', 'Bir el daha!', 'Kahveler benden!', 'Gençler oturun, yer var', 'Eskiden çay 25 kuruştu…'];

  // Kahve içenlere küçük şaka fal (hediye ödülü DEĞİL; sadece espri)
  D.FAL = [
    'Fincanda kuş var: güzel haber yolda 🕊️', 'Bir yol görünüyor: kısa bir gezme 🛣️', 'Kalp çıktı: biri seni anıyor 💕',
    'Balık var: bereketli bir hafta 🐟', 'Anahtar görünüyor: bir kapı açılacak 🔑', 'Ağaç var: sağlam dostlar 🌳',
    'Çiçek açmış: keyifli günler 🌸', 'Merdiven var: adım adım yükseliş 🪜', 'Kedi var: tatlı bir sürpriz 🐈',
  ];

  D.RESULT_QUIPS = ['Kahvehane kararını verdi!', 'Masalar konuştu, karar çıktı!', 'Tartışma bitti, çaylar tazelensin!', 'Ahali hakemlik etti!'];
})();
