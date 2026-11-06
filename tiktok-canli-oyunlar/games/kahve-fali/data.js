/*
 * Fal Masası — fal üretici veri seti.
 * Parçalar birleştirilerek (açılış + zaman + anlam + espri) binlerce farklı fal çıkar.
 * KURALLAR: Her zaman neşeli. Korkutucu, sağlık/ölüm/hastalık, gerçek para tahmini YOK.
 * Eğlence amaçlıdır.
 */
(function () {
  'use strict';

  // Fincanda görülen semboller: e = emoji, ad = kartta görünen büyük yazı, t = uygun konular
  var SYMBOLS = {
    balik: { e: '🐟', ad: 'BALIK', t: ['para', 'genel'], open: [
      'Fincanında kocaman bir balık görüyorum…',
      'Şu kenarda kuyruğunu sallayan bir balık var…',
      'Telvenin içinde bir balık yüzüyor, hem de keyifle…'] },
    kus: { e: '🐦', ad: 'KUŞ', t: ['ask', 'okul', 'genel'], open: [
      'Fincanın ağzında kanatlarını açmış bir kuş var…',
      'Bak bak, şuraya bir kuş konmuş…',
      'Fincanında cıvıl cıvıl bir kuş görüyorum…'] },
    yol: { e: '🛣️', ad: 'YOL', t: ['yol'], open: [
      'Fincanın dibinden kenarına uzanan bir yol var…',
      'Telvede upuzun, aydınlık bir yol açılmış…'] },
    yuzuk: { e: '💍', ad: 'YÜZÜK', t: ['ask'], open: [
      'Fincanın kenarında parıl parıl bir yüzük görüyorum…',
      'Şu köşede yuvarlak bir halka var, tıpkı bir yüzük…'] },
    kalp: { e: '❤️', ad: 'KALP', t: ['ask', 'genel'], open: [
      'Fincanında kocaman bir kalp var…',
      'Telvenin ortasında pır pır eden bir kalp görüyorum…',
      'Bak şuraya, iki kalp yan yana durmuş…'] },
    at: { e: '🐎', ad: 'AT', t: ['yol', 'okul', 'genel'], open: [
      'Fincanında dörtnala koşan bir at var…',
      'Şu kenarda yelesi rüzgârda uçuşan bir at görüyorum…'] },
    dag: { e: '⛰️', ad: 'DAĞ', t: ['okul', 'genel'], open: [
      'Fincanında heybetli bir dağ var ama tepesi güneşli…',
      'Telvede bir dağ yükseliyor, arkasında da gökkuşağı…'] },
    anahtar: { e: '🔑', ad: 'ANAHTAR', t: ['para', 'okul'], open: [
      'Fincanın dibinde bir anahtar duruyor…',
      'Şu köşede minicik, parlak bir anahtar görüyorum…'] },
    goz: { e: '👁️', ad: 'GÖZ', t: ['ask', 'genel'], open: [
      'Fincanında kocaman bir göz var, sana göz kırpıyor…',
      'Telvenin içinden bir göz bakıyor, merak etme, sevgiyle bakıyor…'] },
    hilal: { e: '🌙', ad: 'HİLAL', t: ['genel'], open: [
      'Fincanın kenarında ince bir hilal parlıyor…',
      'Telvede bir hilal belirmiş, ferahlık işareti…'] },
    agac: { e: '🌳', ad: 'AĞAÇ', t: ['genel'], open: [
      'Fincanında dalları dolu bir ağaç var…',
      'Şurada kökleri sağlam, yemyeşil bir ağaç görüyorum…'] },
    kedi: { e: '🐱', ad: 'KEDİ', t: ['genel'], open: [
      'Fincanında bir kedi oturmuş, sana bakıyor…',
      'Telvede kıvrılmış, mışıl mışıl uyuyan bir kedi görüyorum…',
      'Şu kenarda bıyıklarını yalayan bir kedi var…'] },
    ucak: { e: '✈️', ad: 'UÇAK', t: ['yol'], open: [
      'Fincanında havalanan bir uçak var…',
      'Telvenin üstünde bir uçak süzülüyor…'] },
    kese: { e: '💰', ad: 'KESE', t: ['para'], open: [
      'Fincanının dibinde ağzı bağlı bir kese görüyorum…',
      'Şu köşede tombul mu tombul bir kese duruyor…'] },
    gul: { e: '🌹', ad: 'GÜL', t: ['ask'], open: [
      'Fincanında açmış bir gül var…',
      'Telvede kat kat yaprakları olan bir gül görüyorum…'] },
    yilan: { e: '🐍', ad: 'YILAN', t: ['genel'], open: [
      'Fincanında bir yılan var ama korkma, gözlüklü ve çok kibar…',
      'Şu kenarda kıvrılmış bir yılan görüyorum, sadece güneşleniyor…'] },
    yildiz: { e: '⭐', ad: 'YILDIZ', t: ['para', 'okul', 'genel'], open: [
      'Fincanının tam ortasında bir yıldız parlıyor…',
      'Telvede pırıl pırıl bir yıldız var…'] },
    kapi: { e: '🚪', ad: 'KAPI', t: ['para', 'genel'], open: [
      'Fincanında aralık duran bir kapı görüyorum…',
      'Şu kenarda bir kapı var, tokmağı bile belli…'] },
    mektup: { e: '✉️', ad: 'MEKTUP', t: ['ask', 'genel'], open: [
      'Fincanında katlanmış bir mektup var…',
      'Telvenin içinde zarfı mühürlü bir mektup görüyorum…'] },
    tac: { e: '👑', ad: 'TAÇ', t: ['para', 'genel'], open: [
      'Fincanının kenarında bir taç parlıyor…',
      'Telvede sivri uçlu, gösterişli bir taç belirmiş…'] },
    kelebek: { e: '🦋', ad: 'KELEBEK', t: ['ask', 'genel'], open: [
      'Fincanında kanatları açık bir kelebek var…',
      'Şu kenarda bir kelebek uçuşuyor…'] },
    kopek: { e: '🐶', ad: 'KÖPEK', t: ['genel'], open: [
      'Fincanında kuyruk sallayan bir köpek görüyorum…',
      'Telvede kulakları dimdik bir köpek oturuyor…'] },
    balon: { e: '🎈', ad: 'BALON', t: ['yol', 'genel'], open: [
      'Fincanında havaya yükselen bir balon var…',
      'Telvenin üstünde ipi uçuşan bir balon görüyorum…'] },
    kitap: { e: '📚', ad: 'KİTAP', t: ['okul'], open: [
      'Fincanında açık duran bir kitap var…',
      'Şu köşede üst üste dizilmiş kitaplar görüyorum…'] },
    gemi: { e: '⛵', ad: 'GEMİ', t: ['yol'], open: [
      'Fincanında yelkenleri şişmiş bir gemi var…',
      'Telvede limana yanaşan bir gemi görüyorum…'] },
    kep: { e: '🎓', ad: 'KEP', t: ['okul'], open: [
      'Fincanında havaya atılmış bir kep var…',
      'Telvede bir mezuniyet kepi görüyorum…'] },
    semsiye: { e: '☂️', ad: 'ŞEMSİYE', t: ['genel'], open: [
      'Fincanında açık bir şemsiye var…',
      'Şu kenarda rengârenk bir şemsiye duruyor…'] },
    bavul: { e: '🧳', ad: 'BAVUL', t: ['yol'], open: [
      'Fincanında kapağı açık bir bavul var…',
      'Telvede tekerlekli bir bavul görüyorum, yola hazır…'] },
    tavsan: { e: '🐰', ad: 'TAVŞAN', t: ['genel'], open: [
      'Fincanında kulakları dimdik bir tavşan var…',
      'Şu kenarda hoplaya zıplaya giden bir tavşan görüyorum…'] },
  };

  // Konular: yorumdaki kelimeler falın temasını seçer
  var TOPICS = {
    genel: { icon: '🔮', label: 'Genel fal' },
    ask: { icon: '💘', label: 'Aşk falı', words: ['ask', 'aski', 'askim', 'asik', 'sevgili', 'sevgilim', 'love', 'evlilik', 'evlenmek', 'flort', 'crush'] },
    para: { icon: '💰', label: 'İş & para falı', words: ['para', 'is', 'maas', 'kariyer', 'patron', 'money', 'zengin', 'ticaret'] },
    okul: { icon: '📚', label: 'Okul falı', words: ['okul', 'sinav', 'sinavim', 'ders', 'lgs', 'yks', 'kpss', 'ales', 'tyt', 'ayt', 'universite', 'vize', 'final'] },
    yol: { icon: '🧳', label: 'Yol falı', words: ['yol', 'tatil', 'seyahat', 'gezi', 'yolculuk', 'travel', 'ucak', 'tatile'] },
  };

  // Anlam (cümlenin yüklemi — zaman ifadesinden sonra gelir; küçük harfle başlar)
  var MEANINGS = {
    genel: [
      'kısmetin kapıya dayanacak',
      'sevindirici bir haber alacaksın',
      'eski bir tanıdık seni arayacak',
      'beklediğin o mesaj nihayet gelecek',
      'içindeki sıkıntı çay şekeri gibi eriyecek',
      'bir dileğin sessizce gerçekleşecek',
      'kapın çalınacak, gelen eli boş gelmeyecek',
      'biri seni çok güzel anlatacak, kulakların çınlayacak',
      'kalabalık bir sofrada kahkaha atacaksın',
      'uzun zamandır aradığın bir eşyayı bulacaksın',
      'adını duyunca gülümseyen biri karşına çıkacak',
      'tatlı cinsinden bir sürpriz seni bulacak',
      'yüzünü güldürecek bir davet alacaksın',
      'kafandaki soru kendiliğinden cevaplanacak',
      'sağ ayakla yeni bir başlangıç yapacaksın',
      'evine bereket, sofrana neşe gelecek',
      'yaptığın bir iyilik katlanarak geri dönecek',
      'şansın hiç olmadığı kadar açılacak',
      'yeni bir dost hayatına neşe katacak',
      'uzaktan gelen bir haber gönlünü ferahlatacak',
    ],
    ask: [
      'kalbinin kapısını biri çalacak',
      'sana gizliden gizliye bakan biri cesaretini toplayacak',
      'bir mesajın sonundaki kalp emojisi seni şaşırtacak',
      'eski bir hayranın yeniden ortaya çıkacak',
      'gözlerinin içine bakan birinin yüzü kızaracak',
      'aşk hayatında güneş açacak',
      'biri sana bir şarkı ithaf edecek, hem de nakaratıyla',
      'kalbin pır pır edecek, hem de boşuna değil',
      'birinin aklı sürekli sende olacak',
      'tatlı bir buluşma seni bekleyecek',
      'romantik bir sürpriz kapına gelecek',
      'biri sana çiçek gibi bir söz söyleyecek',
    ],
    para: [
      'emeğinin karşılığını göreceksin',
      'iş yerinde adın güzel anılacak',
      'bir indirim kodu seni bulacak',
      'bir kapı açılacak, ardından güzel bir teklif gelecek',
      'patronun seni bir gün herkesin önünde övecek',
      'aklına parlak bir fikir düşecek, herkes bayılacak',
      'masana gelen ikram çaylarının sayısı artacak',
      'bir projede yıldızın parlayacak',
      'işlerin yağ gibi akacak',
      'bereketli bir dönem başlayacak',
      'unuttuğun bir iyiliğin tatlı bir teşekkürle geri dönecek',
      'yeni bir sorumluluk sana çok yakışacak',
    ],
    okul: [
      'çalıştığın konudan soru çıkacak',
      'kalemin hiç sekmeyecek',
      'ilk aklına gelen şık doğru çıkacak',
      'hocan seni sınıfta övecek',
      'zor sandığın ders sana kolay gelecek',
      'karnendeki notlar seni gülümsetecek',
      'kütüphanede şansın açılacak',
      'ezberlediğin formül tam zamanında aklına gelecek',
      'bir arkadaşın sana altın değerinde bir not paylaşacak',
      'sınav kâğıdını gülümseyerek teslim edeceksin',
      'sıranın üstündeki yazılar bile sana şans getirecek',
    ],
    yol: [
      'bir yolculuk planı kapını çalacak',
      'uzak bir şehirden güzel bir haber alacaksın',
      'deniz kokan bir tatil seni çağıracak',
      'önünde bir yol açılacak, sonu güzel',
      'beklenmedik bir gezi planı çıkacak',
      'yolda tanışacağın biri sana güzel bir hikâye anlatacak',
      'pasaportun değilse bile gönlün yollara düşecek',
      'otobüste cam kenarı sana çıkacak',
      'yeni bir şehirde kendini evinde hissedeceksin',
      'kısa ama çok güzel bir kaçamak yapacaksın',
      'bavulun hafif, gönlün hafif bir yola çıkacaksın',
    ],
  };

  // Ünlü zaman ifadeleri (cümlenin başına gelir)
  var TIMING = [
    'Üç vakte kadar',
    'Üç günde, üç haftada ya da üç ayda',
    'Bir sabah, bir çay saatinde',
    'Bu hafta bitmeden',
    'İlk yağmurdan sonra',
    'Dolunay dolmadan',
    'Bir salı akşamı, hiç beklemediğin bir anda',
    'Kahven soğumadan',
    'İki demlik çay arasında',
    'Pazartesi sendromu geçmeden',
    'Telefonunun şarjı yüzde bire inmeden',
    'Bir sonraki bayramdan önce',
    'Kapı zili iki kez çaldığında',
    'Sabah alarmını üçüncü kez ertelediğinde',
    'Çaydanlık fokurdarken',
    'Bir cuma akşamı, simit kokusu eşliğinde',
  ];

  // Modern, komik kapanış cümleleri
  var TWISTS = [
    'Ama önce şarjını doldur.',
    'Yanında bir simit olsun.',
    'Kargon yolda, takip numarası kaderinde yazıyor.',
    'Annen haklıydı, bunu da bil.',
    'Bu arada bir kedi seni seçecek.',
    'Bu arada çamaşırlar kurumuş olabilir, bir bak.',
    'Gelen mesaja hemen "tamam" yazma, biraz naz yap.',
    'Fincanın dibinde bir de lahmacun görüyorum, akşam yemeği belli.',
    'Şanslı rengin: çay rengi.',
    'Şanslı sayın 7, şanslı atıştırmalığın çekirdek.',
    'Wi-Fi şifreni kimseye verme, kader öyle diyor.',
    'Ayakkabılarını ters koyma, kısmet kaçmasın.',
    'Komşu teyze bu işten çoktan haberdar, dikkat et.',
    'Bu falı okuyan herkesin de gözü aydın.',
    'Ekstra bilgi: bugün çayını az şekerli iç.',
    'Kahveyi kim yaptıysa ellerine sağlık.',
    'Fincanı yıkamadan önce bir dilek tut.',
    'Ve evet, o dizinin yeni bölümü de yakında.',
    'Dolapta unuttuğun bir çikolata seni bekliyor.',
    'Bir dahaki falında lokum da isterim.',
    'Ama önce yatağını topla.',
    'Telefonunun ekranını sil, kısmet net görünsün.',
    'Bu sırrı sadece sen, ben ve yorumdaki herkes biliyor.',
    'Bu arada saçların bugün çok iyi.',
    'Aklına gelen ilk şarkıyı aç, kaderin ritmi o.',
    'Bir kuş sana göz kırpacak, sen de kırp.',
    'Otobüse koşarken yavaşla, o otobüs seni bekleyecek.',
    'Fincan bunu söylerken bana göz kırptı.',
    'Bir teyze sana "maşallah" diyecek, nazar boncuğunu tak.',
    'Bunu duyan çaydanlık bile sevindi.',
    'Kaderin şu an çevrimiçi, yazmasını bekle.',
    'Şemsiyeni yanına al, kısmet yağmurlu gelebilir.',
    'Pencerene bir kedi gelirse selam ver, haberci o.',
    'Ama önce bulaşıkları yıka, kader temiz mutfak sever.',
    'Fincanın kenarında bir de pizza dilimi var, akşam belli oldu.',
    'Annen arayınca açmayı unutma, haber ondan gelebilir.',
    'Bu falın tadı lokum gibi, afiyet olsun.',
    'Zil çalarsa terliklerini giy, öyle aç.',
    'Kader de senin gibi düşünüyor: önce kahvaltı.',
    'Bir sonraki mesajda üç emoji olacak, saymayı unutma.',
    'Kısmetin o kadar büyük ki fincana zor sığdı.',
    'Yalnız o "son bir bölüm" asla son olmayacak.',
    'Şanslı günün çarşamba, şanslı içeceğin ayran.',
    'Yastığını çevir, serin tarafı şans getirir.',
    'Kapının önündeki ayakkabılar sana bir şey anlatmak istiyor.',
    'Bir de kayıp çorabının tekini bulacaksın, mucize gibi.',
    'Telefonu yüzüstü bırak, şans ekrandan kaçmasın.',
    'Bu falın ekran görüntüsünü al, bir gün gülerek bakarsın.',
    'Kahvenin köpüğü kadar hafif bir hafta seni bekliyor.',
    'Balkondaki çiçeğe su ver, o da senin için sevinecek.',
    'Ama dikkat: kader bile pazartesileri sevmez.',
    'Şanslı kelimen: "aynen".',
    'Kader bu konuda net: tatlıyı hak ettin.',
    'Yanında annenin börek tarifi olsun, işler açılır.',
    'En sevdiğin kupada çay iç, enerji değişir.',
    'Bir köpek sana kuyruk sallayacak, onaylandın demektir.',
    'Gelen ilk "nbr" mesajına hemen cevap verme.',
    'Bu fincan senden çok memnun, beş yıldız verdi.',
    'Ama önce gülümse, kader kayıtta.',
    'Telvesi bile seni seviyor, bunu bil.',
    'Unutma: kader de bazen "görüldü" atar ama sonra döner.',
    'Eski bir ceketin cebinden tatlı bir anı çıkacak.',
    'Falın tutarsa gelip haber ver, birlikte sevinelim.',
    'Fincan söyledi, ben sadece aracıyım.',
    'Bu arada bulaşık makinesi seni bekliyor, haberin olsun.',
    'Bugün aynaya bakınca kendine bir gülücük borçlusun.',
    'Bir çay daha demle, sohbet uzun.',
    'Kaderin playlisti bugün çok iyi, sesi aç.',
  ];

  // Köpüklü kahve modu alt başlıkları
  var KOPUK = [
    'Köpük bol, kısmet bol!',
    'Köpüklü fal: şans iki katı!',
    'Bu köpük var ya, mutluluk habercisi!',
    'Köpüğü taşan fincan, gönlü taşan insan!',
    'Beğenilerle köpürdü, bereketle doldu!',
  ];
  // Altın fincan alt başlıkları
  var ALTIN = [
    'Altın fincan, parıl parıl bir fal!',
    'Altın fincanın hatırı kırk yıl!',
    'Masanın en parlak fincanı!',
  ];

  // Büyük açılım: Geçmiş / Şimdi / Gelecek kısa satırları
  var SPREAD = {
    gecmis: [
      'Bir zamanlar çok güldün, o gün hâlâ seni anıyor.',
      'Eski bir dert çoktan bitti, sen hâlâ hatırlıyorsun.',
      'Kaybettiğin şarj aleti mutlu bir hayat sürüyor.',
      'Bir zamanlar aldığın kararın meyvesini topluyorsun.',
      'Çocukken yediğin o dondurma hâlâ kalbinde.',
      'Eski bir dostun seni hep iyi anıyor.',
      'Yorgun günler geride kaldı, iyi ki sabrettin.',
      'Geçmişte bir kedi seni sevmişti, hâlâ seviyor.',
      'Bir sınavı son anda geçmiştin, kader not aldı.',
      'Geçen bayram yediğin baklava hâlâ konuşuluyor.',
      'Bir şarkıyı çok dinlemiştin, o şarkı hâlâ senin.',
      'Geride bıraktığın bir alışkanlık sana el sallıyor.',
    ],
    simdi: [
      'Şu an tam yerindesin, kahven de sıcak.',
      'Şu an biri seni düşünüyor, kulakların çınlıyor mu?',
      'Şimdi sabır zamanı, çay demleniyor.',
      'Şu an enerjin çok yüksek, ekran bile parlıyor.',
      'Şu an kararsızsın ama kalbin yolu biliyor.',
      'Şimdi küçük bir mola ver, hak ettin.',
      'Şu an bu yayını izliyorsun, bu bile bir işaret.',
      'Şimdi elindeki fırsatın kıymetini bil.',
      'Şu an etrafın seni sevenlerle dolu.',
      'Şimdi gülümse, kader kayıtta.',
      'Şu an bir eşiktesin, hem de kolay olanından.',
      'Şimdi tam dilek tutma zamanı.',
    ],
    gelecek: [
      'Yakında güzel bir haberle uyanacaksın.',
      'İleride bugünü gülerek anlatacaksın.',
      'Önündeki yol çiçekli, ayakkabını iyi seç.',
      'Yakında bir kutlamanın baş tacı olacaksın.',
      'Gelecekte bolca kahkaha var, hazırlan.',
      'Yakında bir kapı açılacak, ardında sürpriz var.',
      'Gelecek hafta şansın tavan yapacak.',
      'Küçük ama tatlı bir dileğin gerçek olacak.',
      'Seni bekleyen yeni bir dost var.',
      'Yakında bir yolculuk seni çağıracak.',
      'Bir kedi senin için mırlayacak.',
      'İleride biri sana "iyi ki varsın" diyecek.',
    ],
  };

  // Ekspres fal (kalabalıkta 6 fincan birden) kısa satırları
  var EXPRESS = [
    'Kısmetin açık, kapıyı kapatma!',
    'Bir mesaj geliyor, emojili hem de.',
    'Yakında güzel bir sürpriz var.',
    'Şansın bu hafta çok yüksek.',
    'Bir dileğin gerçekleşmek üzere.',
    'Gülümse, biri seni düşünüyor.',
    'Yolun açık, hem de cam kenarı.',
    'Kahven bitmeden haber alacaksın.',
    'Bir kedi seni seçecek.',
    'Tatlı bir davet geliyor.',
    'Uzaktan sevindirici bir haber var.',
    'Bugün senin günün!',
    'Sana teşekkür borçlu biri var.',
    'Kayıp eşyan bulunacak.',
    'Kalbin hafifleyecek.',
    'Güzel bir sürpriz kapında.',
    'Bir iyiliğin geri dönecek.',
    'Yeni bir dost geliyor.',
    'Sevdiğin şarkı tam zamanında çalacak.',
    'Şanslı rengin bugün yeşil.',
    'Bir kahkaha seni bekliyor.',
    'Uzun bir yol, güzel bir son.',
    'Telefonun güzel bir haberle titreyecek.',
    'Kısmetin lokum gibi tatlı.',
    'Gönlün ferahlayacak.',
    'Çayın hep demli olsun!',
    'Bir sürpriz, bir de simit var.',
    'Hafta sonun çok neşeli geçecek.',
  ];

  window.FAL_DATA = {
    SYMBOLS: SYMBOLS, TOPICS: TOPICS, MEANINGS: MEANINGS, TIMING: TIMING, TWISTS: TWISTS,
    KOPUK: KOPUK, ALTIN: ALTIN, SPREAD: SPREAD, EXPRESS: EXPRESS,
  };

  // ---------------------------------------------------------------------------
  // Üretici: yakın zamanda kullanılan parçaları tekrar etmemeye çalışır
  // ---------------------------------------------------------------------------
  var recent = {};
  function pickFresh(key, arr, keep) {
    var r = recent[key] || (recent[key] = []);
    keep = Math.min(keep || 12, Math.floor(arr.length * 0.6));
    var idx, tries = 0;
    do { idx = Math.floor(Math.random() * arr.length); tries++; } while (r.indexOf(idx) >= 0 && tries < 20);
    r.push(idx); if (r.length > keep) r.shift();
    return arr[idx];
  }
  var SYM_KEYS = Object.keys(SYMBOLS);
  var SYM_BY_TOPIC = {};
  SYM_KEYS.forEach(function (k) {
    SYMBOLS[k].key = k;
    SYMBOLS[k].t.forEach(function (t) { (SYM_BY_TOPIC[t] = SYM_BY_TOPIC[t] || []).push(k); });
  });

  function pickSymbol(topic, avoid) {
    var pool = (topic && topic !== 'genel' && Math.random() < 0.7) ? SYM_BY_TOPIC[topic] : SYM_KEYS;
    var k, tries = 0;
    do { k = pickFresh('sym', pool, 8); tries++; } while (avoid && avoid.indexOf(k) >= 0 && tries < 10);
    return SYMBOLS[k];
  }

  function fortune(topic) {
    topic = topic || 'genel';
    var sym = pickSymbol(topic);
    var opening = pickFresh('open_' + sym.key, sym.open, 2);
    var mPool = (topic !== 'genel' && Math.random() < 0.8) ? MEANINGS[topic] : MEANINGS.genel;
    var meaning = pickFresh('m_' + (mPool === MEANINGS.genel ? 'genel' : topic), mPool, 10);
    var timing = pickFresh('timing', TIMING, 8);
    var twist = pickFresh('twist', TWISTS, 30);
    return { sym: sym, text: opening + ' ' + timing + ' ' + meaning + '. ' + twist };
  }

  function spread(topic) {
    var used = [];
    var out = [['GEÇMİŞ', 'gecmis'], ['ŞİMDİ', 'simdi'], ['GELECEK', 'gelecek']].map(function (p) {
      var s = pickSymbol(topic, used);
      used.push(s.key);
      return { label: p[0], sym: s, text: pickFresh('sp_' + p[1], SPREAD[p[1]], 6) };
    });
    return out;
  }

  function express() {
    return { sym: pickSymbol('genel'), text: pickFresh('express', EXPRESS, 14) };
  }

  window.FAL_GEN = {
    fortune: fortune, spread: spread, express: express,
    kopuk: function () { return pickFresh('kopuk', KOPUK, 2); },
    altin: function () { return pickFresh('altin', ALTIN, 1); },
  };
})();
