# 🎮 TikTok Canlı Yayın Oyunları — Buradan Başla

İzleyicilerin **yorum, beğeni ve hediyeleriyle** oynadığı etkileşimli canlı yayın oyunları. Kendi sayfanda yayın yapmak ve diğer yayıncılara satmak için hazırlandı. Tarayıcıda çalışır, kurulum gerektirmez.

## İlk 10 dakika
1. **`index.html`** dosyasını çift tıkla → oyun kataloğu açılır.
2. Bir oyunun **▶ Demo** düğmesine bas → sahte izleyicilerle oyunu izle.
   - **S** simülatör paneli: kendin yorum yaz, hediye gönder, 300 kişilik akın yap.
   - **H** o oyunun kısayolları.
3. Beğendiklerini not et. Sonra **[docs/KURULUM.md](docs/KURULUM.md)** ile OBS'e bağla.

## Klasörler
| Klasör | İçinde ne var? |
|---|---|
| `games/` | Oyunlar (her biri kendi klasöründe) + `oyunlar.js` katalog |
| `shared/` | Ortak altyapı: TikTok/TikFinity bağlantısı, simülatör, küfür filtresi, ses, çizim, **sunucu paneli** (`host.html`), lisans |
| `bridge/` | Yerel köprü: TikTok yayınındaki olayları oyunlara iletir. `baslat.bat` / `test-modu.bat`. Her yayının istatistiğini `oturumlar/` altına kaydeder |
| `docs/` | Rehberler (aşağıda) |
| `tools/` | Test, kapak görseli, **lisans üretme** ve **satış paketi** araçları |

## Belgeler
| Belge | Ne zaman okunur? |
|---|---|
| [KURULUM.md](docs/KURULUM.md) | Oyunu OBS/TikTok'a bağlarken |
| [YAYIN-REHBERI.md](docs/YAYIN-REHBERI.md) | İlk yayından önce: kurallar, ne söylenir, eller kamerası, güvenlik |
| [IS-PLANI.md](docs/IS-PLANI.md) | Ne kadar kazanılır, fiyatlar, satış kanalları, vergi |
| [TIKTOK-SAYFA-PLANI.md](docs/TIKTOK-SAYFA-PLANI.md) | Sayfa adı, bio, kısa video ve yayın takvimi |
| [MUSTERI-REHBERI.md](docs/MUSTERI-REHBERI.md) | Oyunları satın alan yayıncıya verilecek kısa rehber |
| [OYUN-FIKIRLERI.md](docs/OYUN-FIKIRLERI.md) | Henüz yapılmamış 29 puanlı oyun fikri |
| [tools/OYUN-YAPIM-REHBERI.md](tools/OYUN-YAPIM-REHBERI.md) | Yeni oyun yaparken (API ve tasarım kuralları) |

## Öne çıkanlar
- **Güvenli Mod (her zaman açık):** hediyeyle şans/ödül yok, hediye dilenme yok, tek kişi ekranı tekelleyemez, küfür filtresi açık. TikTok'un Eylül 2026 kurallarına göre tasarlandı.
- **Sunucu paneli:** kimi selamlayacağını, kime teşekkür edeceğini gösterir. Oyunu panelden yönetirsin (OBS'teki oyun klavye almaz). ⭐ ile klip anı işaretlersin.
- **Eller kamerada formatı:** linke `&cam=br` ekle, kameran için çerçeve çizilsin.
- **Lisans sistemi:** satarken alıcının TikTok hesabına bağlı, sahtesi üretilemeyen lisans (`tools/lisans.js`). Lisanssız kopyada "DEMO" filigranı görünür.
- **Satış paketi:** `node tools/paketle.js --ad paket-v1 --iletisim "Instagram @hesabın"`.

## Komutlar (Node.js 20+ gerekir)
```bash
cd bridge && npm install                 # köprü kurulumu (bir kez)
node bridge/server.js kullaniciadin      # gerçek yayına bağlan
node bridge/server.js --test             # TikTok'suz test olayları
node tools/test-game.js games/dolmus     # bir oyunu otomatik test et
node tools/kapak.js                      # katalog kapak görsellerini üret
node tools/lisans.js anahtar-olustur     # (bir kez) satış için gizli anahtar
node tools/lisans.js uret alici_hesabi --gun 30
node tools/paketle.js --ad paket-v1
```

> Bu oyunlar TikTok veya ByteDance ile bağlantılı değildir. TikTok'un resmi bir canlı yayın API'si olmadığından bağlantı, açık kaynaklı resmi olmayan araçlarla kurulur ve TikTok değişiklik yaptığında geçici olarak bozulabilir.
