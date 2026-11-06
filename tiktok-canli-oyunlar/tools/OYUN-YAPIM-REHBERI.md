# Oyun Yapım Rehberi (geliştiriciler / yapay zekâ ajanları için)

Bu klasördeki her oyun, TikTok LIVE yayınında izleyicilerin **yorum / beğeni / hediye / takip / paylaşım** olaylarıyla oynanan, tarayıcıda çalışan bir HTML5 tuval (canvas) oyunudur. OBS veya TikTok LIVE Studio'ya "tarayıcı kaynağı" ya da pencere yakalama olarak eklenir.

## Dosya yapısı

```
shared/            ORTAK ALTYAPI — oyun yaparken DEĞİŞTİRME
  lg-core.js       olay yolu, kaynak bağlantıları, izleyici kayıtları, komut ayrıştırma, döngü
  lg-filter.js     küfür/spam filtresi (isimler ve yorumlar otomatik filtrelenir)
  lg-audio.js      kodla üretilen ses efektleri ve müzik (telif yok)
  lg-ui.js         çizim yardımcıları, karakter, avatar, parçacık, kutlama, liderlik tablosu
  lg-sim.js        simülatör (sahte izleyiciler)
  lg.css           temel stil
games/<oyun-id>/   her oyun kendi klasöründe
  index.html       ortak scriptleri SIRAYLA yükler, sonra game.js
  game.js          oyunun kendisi (gerekirse data.js vb. ek dosyalar)
games/_sablon/     başlangıç şablonu — kopyala ve uyarla
tools/test-game.js duman testi: node tools/test-game.js games/<oyun-id>
```

## Temel API (özet — ayrıntı için shared/*.js dosyalarını oku)

- `LG.start({ id, title, init(ctx), update(dt, t), render(ctx, t) })` — oyunu başlatır. Tuval her zaman **1080×1920** (dikey). `LG.W`, `LG.H`.
- `LG.SAFE = {x:40, y:230, w:1000, h:1070, bottom:1300}` — TikTok arayüzünün kapatmadığı alan. **Önemli her şey (başlık, skor, ana oyun alanı) bu alanın içinde olmalı.** Altta (y>1300) TikTok yorum akışı ve hediye çubuğu, üstte (y<230) yayıncı bilgisi var; oralara sadece arka plan/dekor koy.
- Olaylar: `LG.on('chat'|'like'|'gift'|'follow'|'share'|'join'|'viewers'|'newUser'|'any', fn)`
  - chat: `e.user, e.text (filtreli), e.raw (ham), e.norm (normalize), e.flagged, e.isNew`
  - like: `e.user, e.count`
  - gift: `e.user, e.gift = {name, coins, count, total, tier(1..6)}` (tier: 1=1-4 jeton, 2=5-29, 3=30-99, 4=100-999, 5=1000-9999, 6=10000+)
  - user: `{id, name (filtreli, ≤16 karakter), avatar, color, hue, emoji, comments, likes, coins, data:{}}`
- Komut: `LG.cmd.has(text, ['kız','kiz'])`, `LG.cmd.match(text, {sol:['sol','left'], sag:['sağ','sag']})`, `LG.cmd.number(text)`, `LG.cmd.choice(text, ['a','b','c','d'])`, `LG.cmd.norm(text)` — Türkçe karakter ve büyük/küçük harf duyarsız.
- Çizim: `LG.ui.text(ctx, str, x, y, {size, color, align, maxWidth, stroke})`, `LG.ui.panel`, `LG.ui.roundRect`, `LG.ui.emoji`, `LG.ui.avatar(ctx, user, x, y, r)`, `LG.ui.person(ctx, x, y, scale, user, {dance, arms, hat, face, color, skirt, scarf, flip})`, `LG.ui.drawNameTag(ctx, user, x, y, size)` (önbellekli, hızlı), `LG.ui.gradientBg`, `LG.ui.goalBar`, `LG.ui.timerRing`, `LG.ui.hintBar(ctx, x, y, w, lines)`.
- Efekt: `LG.ui.burst(x,y,{count,shape:'confetti'|'circle'|'emoji',emoji})`, `LG.ui.rain()`, `LG.ui.float(text,x,y,{color,size,emoji})`, `LG.ui.shake(i,dur)` + render'da `LG.ui.applyShake(ctx)`, `LG.ui.flash(color)`, `LG.ui.toast(text,{icon,color})`.
- Kutlama: `LG.ui.celebrate(e)` hediye için hazır teşekkür kutlaması (kademeye göre büyür, kuyrukludur). Kendi kutlamanı yapacaksan `LG.ui.celebrateEnabled = false`.
- Liderlik: `var b = new LG.Board(); b.add(user, pts); b.draw(ctx, x, y, w, {title, n, unit})`.
- Ses: `LG.sfx('pop'|'join'|'coin'|'heart'|'tick'|'whoosh'|'boing'|'honk'|'splash'|'zap'|'boom'|'bell'|'drum'|'clap'|'levelup'|'fanfare'|'win'|'lose'|'wrong'|'correct'|'countdown'|'go'|'laugh'|'mega')`, `LG.music.play('horon'|'halay'|'chill'|'race'|'party'|'quiz'|'tension')`, `LG.music.setTempo(x)`, `LG.music.stop()`.
- Yardımcılar: `LG.rand, LG.randi, LG.pick, LG.clamp, LG.lerp, LG.ease.outBack/outCubic/inOutSine/outElastic, LG.hash, LG.shuffle, LG.fmt, LG.store.get/set`.
- Sunucu klavye kısayolu: `LG.onKey('n', 'Yeni tur', fn)` (H tuşu tüm kısayolları gösterir; h, m, s, d, p ortak kullanılır — bunları kullanma).
- Simülatör örnek yorumları: `LG.sim.comments = [['kız',3],['erkek',3]]` veya `LG.sim.genComment = function(user){...}`.

## Tasarım kuralları (zorunlu)

1. **İlk 3 saniye**: Kaydırarak gelen biri ne olduğunu ve nasıl katılacağını hemen anlamalı. Büyük başlık + dönen ipucu şeridi (`hintBar`: "💬 Yorum yaz → …", "❤️ Beğen → …", "🎁 Hediye → …").
2. **İsim 1 saniyede ekranda**: Yorum yazan kişinin adı/karakteri anında görünmeli (tanınma en güçlü motivasyon).
3. **Ücretsiz eylemler önemli olmalı**: Yorum ve beğeni oyunu gözle görülür şekilde etkilemeli. Hediye vermeyenler de eğlenmeli; izlenme süresi algoritmayı besler.
4. **Hediye = kutlama ve görsel/kozmetik güç**, ASLA şans karşılığı ödül/para/çekiliş değil (TikTok kumar kuralı + TCK 228). Hediyeyle "çark çevirme", "ödül kazanma", "rastgele ödül" YOK. Rastgelelik olabilir ama değeri olan bir ödüle bağlanamaz.
5. **Hediye baskısı yok**: Ekranda "hediye at!" diye sürekli dilenen yazılar yok. İpucu şeridinde bir kez "🎁 Hediye → …(ne olduğu)" bilgisi yeterli. "İki taraf seç + hediye gönder" tek içerik olamaz; takımlar varsa yorumla katılınır ve yorum/beğeni de puan getirir.
6. **Kısa turlar ve doruk anı**: 1–5 dakikalık turlar, sonunda kazanan/kutlama ekranı, sonra otomatik yeni tur. Ayrıca sunucu klavyeyle turu başlatıp bitirebilmeli.
7. **Kalabalık yönetimi**: 300–500 eşzamanlı katılımcıda bile okunaklı ve akıcı olmalı (≥30 FPS). İsim etiketlerini yalnızca son aktif ~30–40 kişide ve liderlerde göster; eski katılımcıları solup çıkar ya da küçült. Nesne sayısına üst sınır koy.
8. **Telif yok**: Görseller kodla çizilir (şekiller + emoji), ses `LG.sfx`/`LG.music` ile üretilir. Kulüp logosu, dizi/marka adı, gerçek kişi, telifli müzik YOK. Başka bir oyunun birebir kopyası YOK.
9. **Moderasyon**: Ekrana yazdığın yorum metni için her zaman `e.text` (filtreli) kullan; `e.flagged` ise metni gösterme. İsimler zaten filtreli (`user.name`).
10. **Sunucu (eller kamerada)**: Sunucunun konuşabileceği anlar yarat (fal okuma, soru sorma, kazananı ilan etme). En az 2 kısayol tuşu ekle (ör. N = yeni tur, B = turu bitir).
11. **Türkçe arayüz** (oyun Türk kitlesine yönelikse). Uluslararası satılabilecek oyunlarda metinleri `var T = {...}` sözlüğünde topla ve `LG.config.lang === 'en'` ise İngilizce göster.
12. **Performans**: Her karede ağır işlem (sıralama, metin ölçme) yapma; önbellekle. `drawNameTag` hızlıdır, `ui.text` daha yavaştır.

## Test

```
node tools/test-game.js games/<oyun-id>            # hata yoksa çıkış 0; tools/shots/ altına 3 ekran görüntüsü
```
Ekran görüntülerini aç ve gerçekten bak: başlık okunuyor mu, güvenli alan dışına taşma var mı, 300 kişide karmaşa var mı, hediye kutlaması görünüyor mu? Elle denemek için tarayıcıda `index.html?sim=1&demo=1` aç (S = simülatör paneli, D = demo botları, H = kısayollar).
