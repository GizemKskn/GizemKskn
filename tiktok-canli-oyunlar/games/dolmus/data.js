/*
 * İnecek Var! — veri: rotalar, duraklar, gün saatleri, diyaloglar, süsler.
 */
(function () {
  'use strict';
  var D = (window.DOL = window.DOL || {});

  // Her rota 8 durak: ilk durak kalkış, son durak "SON DURAK".
  D.ROUTES = [
    { sign: 'KADIKÖY – BOSTANCI', stops: ['Kadıköy İskele', 'Altıyol', 'Kızıltoprak', 'Göztepe', 'Erenköy', 'Suadiye', 'Bağdat Caddesi', 'Bostancı'] },
    { sign: 'SİMİTÇİ ÖNÜ – AYRILIK ÇEŞMESİ – ÇAY BAHÇESİ', short: 'SİMİTÇİ ÖNÜ – ÇAY BAHÇESİ', stops: ['Simitçi Önü', 'Martı Durağı', 'Kedili Sokak', 'Ayrılık Çeşmesi', 'Pazar Yeri', 'Muhtarlık', 'Berber Önü', 'Çay Bahçesi'] },
    { sign: 'TEYZEMİN EVİ – DÜĞÜN SALONU', stops: ['Teyzemin Evi', 'Kuaför', 'Çiçekçi', 'Kuyumcu Önü', 'Fırın', 'Nikâh Dairesi', 'Davul Zurna', 'Düğün Salonu'] },
    { sign: 'KONAK – KARŞIYAKA', stops: ['Konak', 'Alsancak', 'Kordon', 'Pasaport', 'Bayraklı', 'Bostanlı', 'Çarşı', 'Karşıyaka'] },
    { sign: 'EV – İŞ (PAZARTESİ)', stops: ['Ev', 'Kapı Önü', 'Uykulu Köşe', 'Kahve Kuyruğu', 'Trafik', 'Yine Trafik', 'Patronun Kapısı', 'İş (Maalesef)'] },
    { sign: 'KIZILAY – ULUS', stops: ['Kızılay', 'Güvenpark', 'Sıhhiye', 'Opera', 'Hamamönü', 'Kale Yolu', 'Hacı Bayram', 'Ulus'] },
    { sign: 'ÜSKÜDAR – BEYKOZ (BOĞAZ HATTI)', short: 'ÜSKÜDAR – BEYKOZ', stops: ['Üsküdar', 'Kuzguncuk', 'Beylerbeyi', 'Çengelköy', 'Kandilli', 'Anadoluhisarı', 'Kanlıca (Yoğurtçu)', 'Beykoz'] },
    { sign: 'OKUL – KANTİN – EV', stops: ['Okul Kapısı', 'Kırtasiye', 'Kantin', 'Dershane', 'Tostçu', 'Parkın Önü', 'Bakkal', 'Ev (Ödev Var)'] },
    { sign: 'AYRILIK ÇEŞMESİ – BARIŞMA PARKI', stops: ['Ayrılık Çeşmesi', 'Hüzün Sokağı', 'Arabesk Köşe', 'Telefon Kulübesi', 'Özür Pastanesi', 'Çiçekçi', 'Sahil Yolu', 'Barışma Parkı'] },
  ];

  // Gün saatleri (her rotada sırayla değişir)
  D.PALETTES = [
    { id: 'sabah', skyTop: '#5ec8ff', skyBot: '#cdeeff', sea: '#2f8fd0', seaHi: '#8fd6ff', far: '#7fa6c4', farDark: '#6a8fae', sun: '#fff3b0', bldHue: [18, 42, 200, 350, 30], bldL: 70, night: false, haze: 'rgba(255,255,255,0.18)' },
    { id: 'gunbatimi', skyTop: '#ff7e5f', skyBot: '#ffd29a', sea: '#c0607a', seaHi: '#ffc2a0', far: '#8a5a7a', farDark: '#6d4766', sun: '#fff1c1', bldHue: [10, 30, 280, 340, 20], bldL: 62, night: false, haze: 'rgba(255,190,140,0.18)' },
    { id: 'gece', skyTop: '#0b1033', skyBot: '#33306b', sea: '#1d2a5c', seaHi: '#6c7fd6', far: '#232655', farDark: '#1a1c44', sun: '#f4f1d0', bldHue: [230, 250, 210, 280, 240], bldL: 30, night: true, haze: 'rgba(120,120,255,0.08)' },
    { id: 'ogle', skyTop: '#3fb3ff', skyBot: '#e6f7ff', sea: '#1f86c7', seaHi: '#a7e2ff', far: '#86a8bf', farDark: '#7495ad', sun: '#fffbe0', bldHue: [45, 15, 160, 200, 0], bldL: 74, night: false, haze: 'rgba(255,255,255,0.22)' },
  ];

  // Rastgele yolcu laflar
  D.CHATTER = [
    'Bi kenara çeker misin?', 'Kapı kapanmıyor!', 'Teyze otur yerime', 'Arkaya ilerleyelim!', 'Ayağıma bastın!',
    'Şoför bey, müsait bir yerde!', 'Biraz sıkışırsak bir kişi daha sığar', 'Kim simit yiyor?', 'Pencereyi açar mısın?',
    'Sonraki durakta uyandırın beni', 'Hafif sola kayalım', 'Bu dolmuş nereye gidiyor?', 'Para üstü gelmedi!',
    'Abi müziği aç!', 'Çantamı tutar mısın?', 'Yer var mı yer?', 'Oğlum otur şuraya', 'Ben burada doğdum sanki',
    'Şoför bey, kemerimi bulamıyorum', 'Biri benim kolumu gördü mü?', 'Kucağıma otur abla', 'Bu yol kısa değil mi?',
  ];
  D.DRIVER = ['Arkaya doğru ilerleyelim!', 'Boş yer var, boş!', 'Bir kişi daha alırız!', 'Sıkışın biraz!', 'Tek kişilik yer var!', 'Kapıyı itin, kapıyı!'];
  D.DRIVER_FULL = ['Bir kişi daha alırız, sorun yok!', 'Daha çok yer var!', 'Tavan da koltuk sayılır!', 'Sıkışın, sıkışın!'];
  D.FAST = ['Yavaş ol şoför bey!', 'Aman şoför bey!', 'Uçuyoruz!', 'Şoför bey, yarışta mıyız?', 'Midem kalktı!', 'Bu dolmuş F1 mi?!'];
  D.KLIMA = ['Oh be! 😌', 'Cereyan yapıyor, kapat!', 'Saçım bozuldu!', 'Oh mis gibi!', 'Kapat şu camı, üşüdüm!'];
  D.MUSIC = ['Aç sonuna kadar! 🎶', 'Ah bu şarkı… 😭', 'Bu benim şarkım!', 'Kısık sesle olsun!'];
  D.SLOW = ['Oh, sakin sakin…', 'Yürüsek daha hızlı 😅', 'Kaplumbağa geçti bizi'];
  D.HONK = ['DIIIT!', 'DÜÜT DÜÜT!', 'BİİİP!'];
  D.OFF = ['İnecek var!', 'Müsait bir yerde!', 'Durakta inecek!', 'Şoför bey, inecek var!'];
  D.BYE = ['Sağ ol şoför bey!', 'Hadi eyvallah!', 'Kolay gelsin!', 'Görüşürüz!', 'İyi seferler!'];
  D.PAY = ['Şoför bey, bir tam!', 'Bir öğrenci!', 'İki tam bir öğrenci!', 'Bir tam lütfen!'];
  D.PASS = ['Uzatır mısınız?', 'Al uzat', 'Şoföre uzat', 'Ön tarafa!'];
  D.THANKS = ['Sağ ol!', 'Eyvallah!', 'Teşekkürler!', 'Hayırlı işler!'];
  D.CHANGE = ['Para üstü!', 'Üstü kalsın? Yok yok, al!', 'Buyur üstü!'];
  D.CROWD_IN = ['Ben de geliyorum!', 'Bekle şoför bey!', 'Yer var mı?', 'Kapıyı aç!'];
  D.NOT_ON = ['Daha binmedim ki! 😅', 'Önce bineyim!', 'Ben duraktayım!'];

  // Süsler (30+ jeton) — rota boyunca birikir
  D.DECOR = [
    { id: 'puskul', name: 'Püsküllü perde', emoji: '🎀' },
    { id: 'zar', name: 'Tüylü zar', emoji: '🎲' },
    { id: 'nazar', name: 'Nazar boncuğu', emoji: '🧿' },
    { id: 'cicek', name: 'Çiçek çıkartma', emoji: '🌸' },
    { id: 'masallah', name: '"Maşallah" yazısı', emoji: '✨' },
    { id: 'led', name: 'Renkli LED şerit', emoji: '💡' },
    { id: 'jant', name: 'Parlak jantlar', emoji: '🛞' },
    { id: 'spoiler', name: 'Yarış spoyleri', emoji: '🏁' },
    { id: 'boynuz', name: 'Boynuz korna', emoji: '📯' },
    { id: 'kalp', name: 'Kalp çıkartma', emoji: '💖' },
  ];

  D.HINTS = [
    '💬 Yorum yaz → dolmuşa bin',
    '🛑 "inecek var" yaz → sonraki durakta in',
    '❤️ Beğen → dolmuş hızlanır',
    '🎁 Hediye → parayı şoföre uzat',
    '🎵 "müzik" · 🌬️ "klima" · 📯 "korna" yaz',
    '🐢 "yavaş" · 🚀 "bas" yaz → hızı sen seç',
  ];

  // Simülatör yorumları (normal yorumlar)
  D.SIM_COMMENTS = [
    ['selam', 3], ['merhaba şoför bey', 2], ['ben de bineyim', 2], ['yer var mı?', 2], ['inecek var', 3], ['müsait bir yerde', 1],
    ['durakta inecek', 1], ['klima', 2], ['müzik', 2], ['korna', 2], ['bas gaza', 1], ['bas', 1], ['yavaş', 2], ['şoför bey bir tam', 1],
    ['arkaya ilerleyin', 1], ['😂😂😂', 2], ['bostancı geçiyor mu?', 1], ['teyze otur', 1], ['kapıyı kapat', 1], ['sıkıştım 😂', 1],
    ['ben camdan bakayım', 1], ['ilk kez dolmuşa biniyorum', 1], ['bu ne kalabalık', 1],
  ];
  D.SIM_ABOARD = ['inecek var', 'müsait bir yerde', 'inecek', 'durakta inecek', 'klima', 'müzik', 'şoför bey hızlı gidiyoruz', 'sıkıştım', 'korna', 'yavaş'];
})();
