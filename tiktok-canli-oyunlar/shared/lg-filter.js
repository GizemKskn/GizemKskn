/*
 * Küfür / spam filtresi (Türkçe + İngilizce).
 * Yayında ekrana yazılan her isim ve yorum buradan geçer.
 * TikTok kurallarına göre yayında görünen her şeyden yayıncı sorumludur,
 * bu yüzden filtre varsayılan olarak AÇIK'tır.
 *
 * Ek yasaklı kelime: URL'ye ?block=kelime1,kelime2 ekleyin.
 */
(function () {
  'use strict';
  var LG = (window.LG = window.LG || {});

  // Türkçe yazımla birebir eşleşmesi gereken kelimeler (yanlış pozitifleri önlemek için:
  // ör. "sıkıştır", "sıkıntı" ı harfiyle yazılır ve engellenmez).
  var EXACT_TR = [
    'sik', 'sikim', 'siktir', 'sikerim', 'sikeyim', 'sikeim', 'sikik', 'sikiş', 'sikis', 'siktirgit', 'sikicem', 'sikecem',
    'sikmek', 'sikiyim', 'siktim', 'skm', 'skrm', 'sktr', 'sg', 'amk', 'amq', 'aq', 'amına', 'amina', 'amcık', 'amcik', 'amck',
    'oç', 'oc', 'o.ç', 'piç', 'göt', 'götveren', 'götlek', 'puşt', 'pust', 'ibne', 'ipne', 'mk', 'amınakoyim', 'aminakoyim',
  ];
  // Bu köklerle BAŞLAYAN kelimeler engellenir (normalize edilmiş, ascii)
  var PREFIX = [
    'orospu', 'orosbu', 'orspu', 'pezevenk', 'kahpe', 'yarrak', 'yarak', 'yarram', 'tasak', 'tassak', 'gavat', 'kaltak',
    'surtuk', 'yavsak', 'dalyarak', 'kancik', 'fahise', 'aminako', 'amcig', 'ibneli',
    'fuck', 'fck', 'shit', 'bitch', 'cunt', 'nigg', 'fagg', 'whore', 'slut', 'asshole', 'retard', 'pussy', 'porn', 'rape', 'dick',
  ];
  // Harfler arasına nokta/boşluk koyarak kaçmaya karşı, tüm mesaj birleşik hâlde aranır
  var SQUASH = ['orospu', 'siktir', 'sikerim', 'sikeyim', 'yarrak', 'pezevenk', 'fuck', 'nigger', 'nigga', 'bitch', 'kahpe', 'amcik'];

  var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
  var TR = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };

  function lowerTr(s) { return String(s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase(); }
  function asciiFold(s) { return s.replace(/[çğıöşüâîû]/g, function (c) { return TR[c]; }); }
  function leet(s) { return s.replace(/[013457@$!]/g, function (c) { return LEET[c]; }); }
  function collapse(s) { return s.replace(/(.)\1{1,}/g, '$1'); } // "ssiikk" -> "sik"

  var exactSet = new Set();
  EXACT_TR.forEach(function (w) { exactSet.add(lowerTr(w)); });
  function extraBlocked() { return (LG.config && LG.config.block) || []; }

  function isBadToken(tok) {
    if (!tok) return false;
    var low = lowerTr(tok).replace(/[^\p{L}\p{N}.]/gu, '');
    if (!low) return false;
    if (exactSet.has(low)) return true;
    var plain = low.replace(/\./g, '');
    if (exactSet.has(plain)) return true;
    var asc = collapse(leet(asciiFold(plain)));
    var asc2 = leet(asciiFold(plain));
    for (var i = 0; i < PREFIX.length; i++) {
      if (asc.indexOf(PREFIX[i]) === 0 || asc2.indexOf(PREFIX[i]) === 0) return true;
    }
    var extra = extraBlocked();
    for (var j = 0; j < extra.length; j++) {
      var e = collapse(leet(asciiFold(lowerTr(extra[j]))));
      if (e && (asc === e || asc.indexOf(e) === 0)) return true;
    }
    return false;
  }

  var URL_RE = /(https?:\/\/\S+|www\.\S+|\b\S+\.(com|net|org|tr|io|me|ly|gg|xyz|link|site|shop)\b\S*|t\.me\/\S+)/gi;
  var PHONE_RE = /(\+?\d[\d\s\-]{8,}\d)/g;
  var ZW_RE = /[​-‏‪-‮⁠-⁯﻿]/g;

  function clean(text) {
    var flagged = false;
    var s = String(text || '').replace(ZW_RE, '').slice(0, 200);
    if (URL_RE.test(s)) { flagged = true; s = s.replace(URL_RE, '***'); }
    URL_RE.lastIndex = 0;
    if (PHONE_RE.test(s)) { flagged = true; s = s.replace(PHONE_RE, '***'); }
    PHONE_RE.lastIndex = 0;
    var out = s.replace(/[^\s]+/g, function (tok) {
      if (isBadToken(tok)) { flagged = true; return '***'; }
      return tok;
    });
    var sqA = leet(asciiFold(lowerTr(s))).replace(/[^a-z]/g, '');
    var sqB = collapse(sqA);
    for (var i = 0; i < SQUASH.length; i++) {
      var root = SQUASH[i];
      if (sqA.indexOf(root) >= 0 || (root === collapse(root) && sqB.indexOf(root) >= 0)) { flagged = true; out = '***'; break; }
    }
    return { text: out, flagged: flagged };
  }

  function name(nick, id) {
    var s = String(nick || '').replace(ZW_RE, '').replace(/[\u0000-\u001F]/g, '').trim();
    var chars = Array.from(s);
    if (chars.length > 16) s = chars.slice(0, 15).join('') + '…';
    if (!s) s = String(id || 'izleyici').slice(0, 16);
    var c = clean(s);
    if (c.flagged) return 'İzleyici' + (LG.hash ? String(LG.hash(id || s) % 10000).padStart(4, '0') : '');
    return s;
  }

  LG.filter = { clean: clean, name: name, isBadToken: isBadToken };
})();
