# Hoş geldin! Canlı Yayın Oyunları — Hızlı Başlangıç

Bu paket, TikTok canlı yayınında izleyicilerinin **yorum, beğeni ve hediyeleriyle** oynadığı etkileşimli oyunları içerir. Kurulum gerektirmez. Oyunlar tarayıcıda çalışır, Windows, Mac ve eski bilgisayarlarda da olur.

## 1. Hemen dene (2 dakika)
1. Zip'i bir klasöre çıkar.
2. `index.html` dosyasını çift tıkla.
3. Bir oyunun **▶ Demo** düğmesine bas. Sahte izleyicilerle nasıl göründüğünü gör.

Demo sırasında ekranda "DEMO" yazısı görünür. Lisansını eklediğinde kaybolur.

## 2. Lisansını ekle
Satın alırken TikTok kullanıcı adını vermiştin. Sana gönderilen lisans anahtarı **o hesaba** bağlıdır.
- Katalogdan kopyaladığın yayın linkinin sonuna `&lisans=ANAHTARIN` ekle.
- Tarayıcı anahtarı bir kez görünce hatırlar.

## 3. Yayına bağla
`docs/KURULUM.md` adım adım anlatıyor. Kısaca:
1. **Node.js** kur → `bridge/baslat.bat` çift tıkla → TikTok kullanıcı adını yaz. Ya da TikFinity kullanıyorsan linke `?source=tikfinity` yeterli.
2. OBS'te **Tarayıcı kaynağı** ekle → katalogdan kopyaladığın linki yapıştır → **1080 × 1920**.
3. `shared/host.html` (sunucu paneli) ayrı pencerede açık olsun: yeni gelenleri selamla, hediye gönderenlere teşekkür et, oyunu oradan yönet.

## 4. Güvenli Mod (her zaman açık)
Oyunlar TikTok'un Eylül 2026 canlı yayın kurallarına göre tasarlandı:
- Hediye karşılığı **şans/çekiliş/ödül yok**. TikTok bunu kumar sayıyor, Türkiye'de izinsiz çekiliş suç.
- Ekranda "hediye at" diye dilenen yazılar yok. Ücretsiz katılım her zaman mümkün.
- Bir kişi ekranı tekelleyemez: büyük kutlamalar arasında bekleme süresi ve oturum yumuşak sınırı var.
- İsim ve yorumlarda küfür/spam filtresi açık. Ek kelime için linke `&block=kelime1,kelime2` ekle.

**Senin sorumluluğun:** yayının başında ol, konuş, izleyicilerle etkileş. TikTok başında kimse olmayan ("AFK") yayınlarda para kazanmayı kapatabiliyor. Ayrılman gerekirse yayını duraklat.

## 5. Sık sorulanlar
- **Yorumlar oyuna gelmiyor?** Köprü penceresinde "bağlandı" yazıyor mu? Yayın açık mı? `http://localhost:8787/durum` adresine bak.
- **TikTok bir şey değiştirdi, bağlanmıyor?** Köprü klasöründe `npm update` çalıştır ya da TikFinity'yi kullan. TikTok'un resmi canlı yayın API'si olmadığı için bu ara sıra olabilir.
- **Ses yok?** Ekrana bir kez tıkla. OBS'te "Sesi OBS ile kontrol et" açık olsun.

---
Bu oyunlar TikTok veya ByteDance ile bağlantılı değildir. Kazanç garantisi verilmez: sonuç yayın düzenine, izleyici kitlesine ve içeriğe bağlıdır.
