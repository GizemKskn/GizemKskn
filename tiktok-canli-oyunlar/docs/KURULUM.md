# Kurulum Rehberi

Bu rehber, oyunları kendi bilgisayarında TikTok canlı yayınına bağlamak için adım adım ne yapacağını anlatır. Önce **TikTok'a bağlanmadan** dene, sonra yayına geç.

---

## 0. Neye ihtiyacın var?

| Gerekli | Neden |
|---|---|
| Windows 10/11 bilgisayar (Mac de olur) | Oyunlar tarayıcıda çalışır; yayın programı bilgisayarda olmalı |
| Google Chrome veya Edge | Oyunları denemek için |
| **OBS Studio** (ücretsiz) veya **TikTok LIVE Studio** | Oyun ekranını yayına vermek için |
| **Node.js 20+** (ücretsiz) *veya* **TikFinity** | Yorum/hediye olaylarını oyuna taşımak için (ikisinden biri yeter) |
| TikTok hesabı: 18 yaş üstü, canlı yayın açabilen | Hediye alabilmek için 18+ şart |
| Telefon veya web kamerası | Ellerinin göründüğü kamera (yüz gerekmez) |

---

## 1. Önce TikTok'a bağlanmadan dene (5 dakika)

1. Klasördeki **`index.html`** dosyasını çift tıkla → oyun kataloğu açılır.
2. Bir oyunun **▶ Demo** düğmesine bas. Sahte izleyiciler oyuna katılır.
3. Klavye kısayolları:
   - **S**: simülatör paneli (kendi yorumunu yaz, hediye gönder, 300 kişi akını).
   - **D**: demo botlarını başlat/durdur.
   - **H**: oyuna özel kısayollar.
   - **M**: ses aç/kapat.
4. Tarayıcı sesi ilk tıklamaya kadar kapalı tutar. Ses gelmezse ekrana bir kez tıkla.

---

## 2. Yorum ve hediyeleri oyuna taşıma: iki yol

### Yol A — Kendi köprümüz (ücretsiz, önerilen)

1. https://nodejs.org adresinden **LTS** sürümünü indir ve kur ("Next, Next" yeterli).
2. `bridge` klasöründeki **`test-modu.bat`** dosyasını çift tıkla. İlk seferde gerekli dosyaları kendisi indirir (1–2 dakika). Bu mod TikTok'a bağlanmaz, her saniye sahte bir olay gönderir.
3. Tarayıcıda `http://localhost:8787` adresini aç. Oyun listesi açılır. Bir oyunun **🎥 Yayın linkini kopyala** düğmesine bas. Link bu biçimdedir:
   ```
   http://localhost:8787/games/<oyun>/index.html?source=bridge
   ```
   Bu linki tarayıcıda açarsan sahte olayların geldiğini görürsün. **Bağlantı çalışıyor demektir.**
4. Gerçek yayın için **`baslat.bat`** dosyasını çift tıkla ve TikTok kullanıcı adını `@` olmadan yaz.
   - Köprü, sen canlı yayına girene kadar her 20 saniyede bir tekrar dener.
   - Yayına girince `✅ ... yayınına bağlandı` yazar.
5. Kullanıcı adını her seferinde yazmak istemezsen `ayarlar.ornek.json` dosyasını `ayarlar.json` adıyla kopyala ve içine `"kullanici": "kullaniciadin"` yaz.

> ⚠️ TikTok'un resmi bir canlı yayın API'si yok. Köprü, açık kaynaklı ve resmi olmayan `tiktok-live-connector` kütüphanesini kullanıyor. TikTok bir şey değiştirirse birkaç gün çalışmayabilir. O zaman köprü klasöründe `npm update` çalıştır ya da Yol B'yi kullan. Ücretsiz kullanımda günlük bağlantı sınırı var; çok sık yeniden bağlanırsan sınıra takılabilirsin.

### Yol B — TikFinity (hazır uygulama)

1. TikFinity masaüstü uygulamasını kur ve TikTok kullanıcı adınla bağlan.
2. Oyun linkine `?source=tikfinity` ekle. Katalogda "Bağlantı: TikFinity" seçip linki kopyalaman yeterli.
3. Oyunlar TikFinity'nin yerel WebSocket'ine (`ws://localhost:21213`) bağlanır.
   - ⚠️ Bu adres TikFinity'nin belgelerinde değil, topluluk projelerinden biliniyor. Gerçek yayında bir kez test et.
   - Bağlanmazsa Yol A'yı kullan.

---

## 3. OBS ayarı (dikey 1080×1920)

1. **Ayarlar → Video**: Temel çözünürlük **1080×1920**, Çıkış **1080×1920**, FPS **30** (bilgisayar güçlüyse 60).
2. **Kaynaklar → + → Tarayıcı**:
   - URL: katalogdan kopyaladığın yayın linki.
   - Genişlik **1080**, Yükseklik **1920**.
   - ✅ "Sesi OBS ile kontrol et" (oyun müziği yayına gitsin).
   - ✅ "Görünür değilken kaynağı kapat" işaretli **olmasın**.
3. **Eller kamerası** (yüz yok):
   - **+ → Video Yakalama Aygıtı** ile kameranı ekle.
   - Kamerayı masaya, sadece ellerini ve masanı görecek şekilde yerleştir.
   - Önerilen yer **sağ alt** köşe. TikTok yorumları solda aktığı için bu bölge açık kalır.
   - Linke `&cam=br` eklersen oyun bu köşeye renkli bir "🎥 CANLI" çerçevesi çizer, kamerayı çerçevenin içine oturt (x 700, y 1310, 340×255).
   - Diğer köşeler: `cam=bl` (sol alt), `cam=tr` (sağ üst), `cam=tl` (sol üst).
4. **Mikrofon**: konuşman çok önemli. TikTok "yayıncı varlığı" arıyor.

### OBS'ten TikTok'a nasıl yayın yapılır?

- **TikTok LIVE Studio** (Windows): "Pencere/Ekran yakalama" ile Chrome'da tam ekran açtığın oyunu ya da OBS'in "Sanal Kamera" çıkışını kaynak olarak ekle. Ayrıca kamera kaynağı ekle.
  - Takipçi şartı resmi olarak doğrulanamadı; 2024 tarihli eski bir sayfada oyun yayıncıları için 1.000, diğerleri için 10.000 takipçi yazıyordu.
- **Yayın anahtarı (stream key)** varsa: OBS → Ayarlar → Yayın → Özel → TikTok'un verdiği sunucu ve anahtar.
- **Telefon**: telefondan canlı yayın açıp oyunu göstermek zordur. Bilgisayar önerilir.

> Not: Bazı tarayıcı kaynağı sürümlerinde boyut 0×0 kalabiliyor. Öyle olursa oyunu Chrome'da açıp **F11** ile tam ekran yap ve "Pencere yakalama" kullan.

---

## 4. Sunucu paneli (yayında görünmez)

Katalogdaki **🎙️ Sunucu paneli** düğmesi ya da `shared/host.html?source=bridge` adresi. Ayrı bir pencerede ya da ikinci ekranda açık tut:

- **Selamla**: ilk kez yorum yazan / beğenen kişiler. Adını söyle, sonra tıkla.
- **Teşekkür et**: hediye gönderenler. Teşekkür et, sonra tıkla.
- **Yorumlar**: filtreye takılan yorumlar kırmızı görünür.
- **Söyleyebileceklerin**: seçtiğin oyuna özel hazır cümleler.
- **🎮 Oyunu buradan yönet**: OBS'teki oyun klavyeden tuş almaz. Paneldeki düğmeler ("N · Yeni tur" gibi) köprü üzerinden oyuna iletilir. Bunun için köprünün açık olması gerekir.
- **🔇**: bir izleyicinin büyük ekran kutlamalarını sadeleştirir. Örneğin biri reşit olmadığını söylerse ya da kendini kaybetmiş gibi hediye gönderiyorsa kullan.
- 45 dakikada bir mola hatırlatır. Ayrılırken TikTok'ta yayını **duraklat**.

> Oyunu Chrome'da açıp "Pencere yakalama" ile yayınlıyorsan, Chrome penceresi seçiliyken klavye kısayolları doğrudan da çalışır.

---

## 5. Sorun giderme

| Sorun | Çözüm |
|---|---|
| Oyun açılıyor ama yorumlar gelmiyor | Köprü penceresinde "bağlandı" yazıyor mu? Kullanıcı adı doğru mu? Yayın açık mı? `http://localhost:8787/durum` adresine bak. |
| `8787 portu kullanımda` | Köprü zaten açık. Diğer pencereyi kapat. |
| Ses yok | Ekrana bir kez tıkla. OBS'te "Sesi OBS ile kontrol et" açık mı, ses karıştırıcıda tarayıcı kaynağı sessizde mi? |
| Oyun yavaş | OBS FPS'ini 30 yap, Chrome'da donanım hızlandırmayı aç, başka sekmeleri kapat. |
| Küfürlü isim/yorum ekranda | Filtre otomatik çalışır. Kaçanları linke `&block=kelime1,kelime2` ekleyerek engelle. |
| TikTok bağlanmıyor (imza/403 hatası) | Köprü klasöründe `npm update` çalıştır. Hâlâ olmuyorsa TikFinity'ye (Yol B) geç. |

---

## 6. Linkte kullanılabilecek ayarlar

| Parametre | Örnek | Anlamı |
|---|---|---|
| `source` | `bridge`, `tikfinity`, `auto`, `sim` | Olayların kaynağı |
| `brand` | `@kullaniciadi` | Ekranın altına kullanıcı adını yazar |
| `cam` | `br`, `bl`, `tr`, `tl` | Eller kamerası çerçevesi |
| `music` | `0` | Müziği kapat (efektler kalır) |
| `vol` | `0.5` | Ses seviyesi |
| `mute` | `1` | Tüm sesleri kapat |
| `block` | `kelime1,kelime2` | Ek yasaklı kelimeler |
| `sim` / `demo` | `1` | Simülatör paneli / sahte izleyiciler (sadece test için) |
| `transparent` | `1` | Arka planı şeffaf yap (oyun destekliyorsa) |
| `debug` | `1` | FPS ve bağlantı bilgisi göster |
| `footer` | `0` | "Hediye zorunlu değil" notunu gizle (önerilmez) |
| `softcap` | `5000` | Bir izleyici bu oturumda bu kadar jetonu geçince büyük kutlamalar sadeleşir (0 = kapalı) |
| `cooldown` | `25` | Aynı kişiye iki büyük kutlama arasında en az kaç saniye geçsin |
