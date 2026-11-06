/*
 * Lisans kontrolü — SADECE satış paketlerine eklenir (tools/paketle.js ekler).
 * Kendi yayınlarında bu dosyaya ihtiyacın yok.
 *
 * Lisans anahtarı alıcının TikTok kullanıcı adına bağlıdır ve Ed25519 ile imzalıdır:
 * özel anahtar olmadan sahte lisans üretilemez. Anahtar yoksa ya da geçersizse oyun çalışır
 * ama ekranda "DEMO" filigranı görünür.
 *
 * Kullanım: oyun linkine ?lisans=TCO1.xxxxx eklenir (bir kez eklenince tarayıcı hatırlar).
 */
(function () {
  'use strict';
  var LG = window.LG;
  if (!LG) return;
  var PUB = '__LISANS_PUB__';            // paketleyici gerçek açık anahtarla değiştirir
  var CONTACT = '__LISANS_ILETISIM__';   // paketleyici satıcı iletişim bilgisiyle değiştirir

  function b64uToBytes(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function utf8(s) { return new TextEncoder().encode(s); }

  var state = { ok: false, reason: 'Lisans girilmedi', payload: null };
  LG.lisans = state;

  function check(key) {
    try {
      if (!key) return { ok: false, reason: 'Lisans girilmedi' };
      var parts = String(key).trim().split('.');
      if (parts.length !== 3 || parts[0] !== 'TCO1') return { ok: false, reason: 'Lisans biçimi hatalı' };
      var payloadJson = new TextDecoder().decode(b64uToBytes(parts[1]));
      var sig = b64uToBytes(parts[2]);
      if (!window.nacl || !window.nacl.sign) return { ok: false, reason: 'Doğrulama kütüphanesi yok' };
      var good = window.nacl.sign.detached.verify(utf8(parts[0] + '.' + parts[1]), sig, b64uToBytes(PUB));
      if (!good) return { ok: false, reason: 'Lisans imzası geçersiz' };
      var p = JSON.parse(payloadJson);
      if (p.e && Date.now() > new Date(p.e + 'T23:59:59').getTime()) return { ok: false, reason: 'Lisans süresi doldu (' + p.e + ')', payload: p };
      if (p.g && p.g !== '*' && LG.gameId && p.g.split(',').indexOf(LG.gameId) < 0) return { ok: false, reason: 'Bu oyun lisansta yok', payload: p };
      return { ok: true, reason: '', payload: p };
    } catch (e) {
      return { ok: false, reason: 'Lisans okunamadı' };
    }
  }

  var fromUrl = LG.qp('lisans', '');
  if (fromUrl) LG.store.set('lisans', fromUrl);
  var key = fromUrl || LG.store.get('lisans', '');

  function evaluate() {
    var r = check(key);
    state.ok = r.ok; state.reason = r.reason; state.payload = r.payload || null;
  }
  // LG.gameId, LG.start çağrılınca belli olur
  setTimeout(evaluate, 0);
  window.addEventListener('load', evaluate);

  // Köprü hangi hesaba bağlı? Lisans başka hesaba aitse DEMO'ya düş.
  LG.on('bridgeStatus', function (st) {
    evaluate();
    if (!state.ok || !state.payload || !st || !st.kullanici) return;
    if (String(st.kullanici).toLowerCase() !== String(state.payload.u).toLowerCase()) {
      state.ok = false;
      state.reason = 'Bu lisans @' + state.payload.u + ' hesabı için';
    }
  });

  // Filigran: lisans geçersizse üst katmana çizilir
  var t0 = 0;
  function drawWatermark(ctx) {
    if (state.ok) return;
    t0 += 1 / 60;
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.translate(LG.W / 2, LG.H / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.font = '900 150px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    for (var y = -1400; y <= 1400; y += 420) ctx.fillText('DEMO', ((y / 420) % 2) * 200, y);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = 'rgba(200,20,60,0.85)';
    ctx.fillRect(0, LG.SAFE.y - 10, LG.W, 64);
    ctx.font = '800 32px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('DEMO SÜRÜM · ' + state.reason + (CONTACT && CONTACT.indexOf('__') !== 0 ? ' · ' + CONTACT : ''), LG.W / 2, LG.SAFE.y + 22, LG.W - 40);
    ctx.restore();
  }
  function hook() {
    if (!LG.ui || !LG.ui.renderOverlay || LG.ui.__lisansHooked) return;
    var orig = LG.ui.renderOverlay;
    LG.ui.renderOverlay = function (ctx, t) { orig.call(LG.ui, ctx, t); drawWatermark(ctx); };
    LG.ui.__lisansHooked = true;
  }
  hook();
  window.addEventListener('load', hook);
})();
