/*
 * Ortak çizim araçları: yazı, panel, avatar, karakter, parçacık, kutlama,
 * hedef çubuğu, liderlik tablosu, ipucu şeridi, sarsıntı, yardım ekranı.
 */
(function () {
  'use strict';
  var LG = (window.LG = window.LG || {});
  var ui = (LG.ui = {});
  var FONT = '"Baloo 2","Nunito","Segoe UI","Trebuchet MS",system-ui,sans-serif';
  ui.FONT = FONT;
  ui.EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  // ---------------------------------------------------------------------------
  // Temel çizim
  // ---------------------------------------------------------------------------
  ui.font = function (size, weight) { return (weight || 800) + ' ' + Math.round(size) + 'px ' + FONT; };

  ui.text = function (ctx, str, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = o.font || ui.font(o.size || 40, o.weight);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.maxWidth) {
      var w = ctx.measureText(str).width;
      if (w > o.maxWidth) {
        var s = (o.size || 40) * o.maxWidth / w;
        ctx.font = ui.font(s, o.weight);
      }
    }
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur || 12; }
    if (o.stroke !== false) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.strokeWidth || Math.max(3, (o.size || 40) * 0.16);
      ctx.strokeStyle = o.strokeColor || 'rgba(0,0,0,0.85)';
      ctx.strokeText(str, x, y);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  ui.emoji = function (ctx, e, x, y, size, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha *= alpha;
    ctx.font = Math.round(size) + 'px ' + ui.EMOJI_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e, x, y);
    ctx.restore();
  };

  ui.roundRect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  ui.panel = function (ctx, x, y, w, h, o) {
    o = o || {};
    ctx.save();
    ui.roundRect(ctx, x, y, w, h, o.r != null ? o.r : 28);
    ctx.fillStyle = o.fill || 'rgba(10,10,30,0.62)';
    ctx.fill();
    if (o.border !== false) {
      ctx.lineWidth = o.lineWidth || 4;
      ctx.strokeStyle = o.border || 'rgba(255,255,255,0.18)';
      ctx.stroke();
    }
    ctx.restore();
  };

  ui.gradientBg = function (ctx, top, bottom) {
    var g = ctx.createLinearGradient(0, 0, 0, LG.H);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LG.W, LG.H);
  };

  // ---------------------------------------------------------------------------
  // İsim etiketi önbelleği (yüzlerce isim için hızlı çizim)
  // ---------------------------------------------------------------------------
  var tagCache = new Map();
  ui.nameTag = function (u, size, color, bg) {
    size = size || 26;
    var key = u.id + '|' + size + '|' + (color || '') + '|' + (bg || '') + '|' + u.name;
    var c = tagCache.get(key);
    if (c) return c;
    if (tagCache.size > 3000) tagCache.clear();
    c = document.createElement('canvas');
    var cx = c.getContext('2d');
    cx.font = ui.font(size, 800);
    var w = Math.ceil(cx.measureText(u.name).width) + size;
    var h = Math.ceil(size * 1.5);
    c.width = w; c.height = h;
    cx.font = ui.font(size, 800);
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    if (bg) {
      ui.roundRect(cx, 0, 0, w, h, h / 2);
      cx.fillStyle = bg; cx.fill();
    } else {
      cx.lineJoin = 'round'; cx.lineWidth = Math.max(3, size * 0.22); cx.strokeStyle = 'rgba(0,0,0,0.85)';
      cx.strokeText(u.name, w / 2, h / 2 + 1);
    }
    cx.fillStyle = color || '#fff';
    cx.fillText(u.name, w / 2, h / 2 + 1);
    tagCache.set(key, c);
    return c;
  };
  ui.drawNameTag = function (ctx, u, x, y, size, color, bg) {
    var c = ui.nameTag(u, size, color, bg);
    ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
    return c;
  };

  // ---------------------------------------------------------------------------
  // Avatar: profil fotoğrafı varsa onu, yoksa renkli daire + emoji/baş harf
  // ---------------------------------------------------------------------------
  ui.avatar = function (ctx, u, x, y, r, o) {
    o = o || {};
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = o.bg || u.color;
    ctx.fill();
    var img = LG.avatarImg(u);
    if (img) {
      ctx.save();
      ctx.clip();
      ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
      ctx.restore();
    } else if (o.initial) {
      ctx.fillStyle = '#fff';
      ctx.font = ui.font(r * 1.1, 900);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Array.from(u.name)[0].toUpperCase(), x, y + r * 0.05);
    } else {
      ctx.font = Math.round(r * 1.25) + 'px ' + ui.EMOJI_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(u.emoji, x, y + r * 0.08);
    }
    if (o.ring !== false) {
      ctx.lineWidth = o.ringWidth || Math.max(3, r * 0.14);
      ctx.strokeStyle = o.ring || '#fff';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Sevimli karakter (prosedürel). s = ölçek (≈ boy/100)
  // opts: { color, skin, hat:'none'|'cap'|'crown'|'flower'|'party'|'fez', dance:0..1 faz, arms:'up'|'side'|'wave',
  //         face:'happy'|'wow'|'sad'|'cool', scarf: renk, skirt: true, flip }
  // ---------------------------------------------------------------------------
  var SKINS = ['#f8d5b8', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
  ui.person = function (ctx, x, y, s, u, o) {
    o = o || {};
    var hue = u ? u.hue : 200;
    var body = o.color || 'hsl(' + hue + ',70%,52%)';
    var skin = o.skin || SKINS[(u ? LG.hash(u.id) : 0) % SKINS.length];
    var ph = o.dance || 0;
    var bob = Math.sin(ph * Math.PI * 2) * 4 * s;
    ctx.save();
    ctx.translate(x, y + bob);
    if (o.flip) ctx.scale(-1, 1);
    ctx.scale(s, s);
    ctx.lineCap = 'round';
    // gölge
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 50 - bob / s, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
    // bacaklar
    var legA = Math.sin(ph * Math.PI * 2) * 0.35;
    ctx.strokeStyle = '#333'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-7, 22); ctx.lineTo(-9 + legA * 14, 47); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, 22); ctx.lineTo(9 - legA * 14, 47); ctx.stroke();
    // gövde
    ctx.fillStyle = body;
    ui.roundRect(ctx, -17, -8, 34, 34, 12); ctx.fill();
    if (o.skirt) { ctx.beginPath(); ctx.moveTo(-20, 14); ctx.lineTo(20, 14); ctx.lineTo(26, 32); ctx.lineTo(-26, 32); ctx.closePath(); ctx.fill(); }
    if (o.scarf) { ctx.fillStyle = o.scarf; ctx.fillRect(-17, -6, 34, 7); }
    // kollar
    ctx.strokeStyle = body; ctx.lineWidth = 8;
    var arms = o.arms || 'side';
    var wave = Math.sin(ph * Math.PI * 4) * 6;
    if (arms === 'up') {
      ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(-26, -28 + wave); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, -2); ctx.lineTo(26, -28 - wave); ctx.stroke();
    } else if (arms === 'wave') {
      ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(-24, 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, -2); ctx.lineTo(28, -24 + wave); ctx.stroke();
    } else if (arms === 'hold') {
      ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(-30, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, -2); ctx.lineTo(30, 4); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(-22, 20 + wave * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, -2); ctx.lineTo(22, 20 - wave * 0.3); ctx.stroke();
    }
    // baş
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, -26, 19, 0, Math.PI * 2); ctx.fill();
    // saç
    ctx.fillStyle = o.hair || ['#2b1b0e', '#4a2c17', '#111', '#7a4b1e', '#c9a14a', '#b5462e'][LG.hash((u ? u.id : '') + 'h') % 6];
    ctx.beginPath(); ctx.arc(0, -30, 19, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    if (o.longHair) { ctx.fillRect(-19, -32, 7, 26); ctx.fillRect(12, -32, 7, 26); }
    // yüz
    var face = o.face || 'happy';
    ctx.fillStyle = '#222';
    if (face === 'cool') {
      ctx.fillRect(-13, -30, 26, 7);
    } else {
      ctx.beginPath(); ctx.arc(-7, -27, 2.8, 0, Math.PI * 2); ctx.arc(7, -27, 2.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (face === 'wow') { ctx.arc(0, -17, 4, 0, Math.PI * 2); }
    else if (face === 'sad') { ctx.arc(0, -13, 6, Math.PI * 1.15, Math.PI * 1.85); }
    else { ctx.arc(0, -21, 6, Math.PI * 0.15, Math.PI * 0.85); }
    ctx.stroke();
    // yanak
    ctx.fillStyle = 'rgba(255,90,90,0.35)';
    ctx.beginPath(); ctx.arc(-12, -20, 3.5, 0, Math.PI * 2); ctx.arc(12, -20, 3.5, 0, Math.PI * 2); ctx.fill();
    // şapka
    var hat = o.hat || 'none';
    if (hat === 'crown') {
      ctx.fillStyle = '#ffd400';
      ctx.beginPath(); ctx.moveTo(-14, -42); ctx.lineTo(-14, -56); ctx.lineTo(-7, -48); ctx.lineTo(0, -60); ctx.lineTo(7, -48); ctx.lineTo(14, -56); ctx.lineTo(14, -42); ctx.closePath(); ctx.fill();
    } else if (hat === 'cap') {
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, -38, 15, Math.PI, 0); ctx.fill(); ctx.fillRect(0, -40, 24, 5);
    } else if (hat === 'party') {
      ctx.fillStyle = 'hsl(' + ((hue + 180) % 360) + ',80%,60%)';
      ctx.beginPath(); ctx.moveTo(-10, -42); ctx.lineTo(10, -42); ctx.lineTo(0, -68); ctx.closePath(); ctx.fill();
    } else if (hat === 'flower') {
      ui.emoji(ctx, '🌸', 12, -44, 18);
    } else if (hat === 'fez') {
      ctx.fillStyle = '#b3141c'; ctx.fillRect(-11, -58, 22, 16); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -58); ctx.lineTo(9, -48); ctx.stroke();
    } else if (hat === 'kerchief') { // yazma/çember
      ctx.fillStyle = o.hatColor || '#e8432b'; ctx.beginPath(); ctx.arc(0, -30, 21, Math.PI * 1.0, Math.PI * 2.0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 7, -40, 2, 0, Math.PI * 2); ctx.fill(); }
    } else if (hat === 'kalpak') { // Karadeniz başlığı
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-16, -54, 32, 14); ctx.beginPath(); ctx.arc(0, -54, 16, Math.PI, 0); ctx.fill();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Parçacıklar ve uçan yazılar (oyun üstü katman)
  // ---------------------------------------------------------------------------
  var parts = [];
  var floats = [];
  var CONF_COLORS = ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff9f1c', '#ffffff'];
  ui.burst = function (x, y, o) {
    o = o || {};
    var n = Math.min(o.count || 30, 400 - parts.length);
    for (var i = 0; i < n; i++) {
      var a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || Math.PI * 2) : Math.random() * Math.PI * 2;
      var sp = (o.speed || 600) * (0.4 + Math.random() * 0.8);
      parts.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 200),
        life: (o.life || 1.4) * (0.7 + Math.random() * 0.6), t: 0,
        size: (o.size || 14) * (0.6 + Math.random() * 0.8),
        color: o.color || LG.pick(o.colors || CONF_COLORS),
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        shape: o.shape || 'confetti', emoji: o.emoji, g: o.gravity != null ? o.gravity : 1400,
      });
    }
  };
  ui.rain = function (o) { // ekran boyu konfeti yağmuru
    o = o || {};
    var n = o.count || 120;
    for (var i = 0; i < n && parts.length < 450; i++) {
      parts.push({
        x: Math.random() * LG.W, y: -50 - Math.random() * 600, vx: (Math.random() - 0.5) * 120, vy: 200 + Math.random() * 300,
        life: 4 + Math.random() * 2, t: 0, size: (o.size || 18) * (0.6 + Math.random() * 0.8), color: LG.pick(o.colors || CONF_COLORS),
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, shape: o.shape || 'confetti', emoji: o.emoji, g: 120,
      });
    }
  };
  ui.float = function (text, x, y, o) {
    o = o || {};
    if (floats.length > 80) floats.shift();
    floats.push({ text: text, x: x, y: y, t: 0, life: o.life || 1.6, color: o.color || '#fff', size: o.size || 44, vy: o.vy || -120, emoji: o.emoji });
  };

  // ---------------------------------------------------------------------------
  // Ekran efektleri
  // ---------------------------------------------------------------------------
  var shakeT = 0, shakeI = 0, flashT = 0, flashDur = 0, flashColor = '#fff';
  ui.shake = function (intensity, dur) { shakeI = Math.max(shakeI, intensity || 12); shakeT = Math.max(shakeT, dur || 0.4); };
  ui.applyShake = function (ctx) {
    if (shakeT > 0) ctx.translate((Math.random() - 0.5) * shakeI * 2, (Math.random() - 0.5) * shakeI * 2);
  };
  ui.flash = function (color, dur) { flashColor = color || '#fff'; flashDur = flashT = dur || 0.35; };

  // ---------------------------------------------------------------------------
  // Kutlamalar (hediye teşekkürü) — kuyruklu, üst üste binmez
  // ---------------------------------------------------------------------------
  var celebQueue = [];
  var celeb = null;
  var toasts = [];
  ui.celebrateEnabled = true;
  // Varsayılan hediye kutlaması. Oyunlar LG.ui.celebrateEnabled=false yapıp kendi kutlamasını çizebilir.
  ui.celebrate = function (evt, o) {
    o = o || {};
    var g = evt.gift, u = evt.user;
    var tier = g ? g.tier : (o.tier || 3);
    var text = o.text || (u.name + (g ? ' · ' + g.name + (g.count > 1 ? ' x' + g.count : '') : ''));
    var sub = o.sub || (tier >= 5 ? 'MUHTEŞEM! Teşekkürler 💖' : tier >= 4 ? 'Çok teşekkürler! 💖' : 'Teşekkürler!');
    if (tier <= 2) {
      ui.toast(text, { icon: g ? LG.giftEmoji(g) : '🎁', color: '#ffd166' });
      LG.sfx(tier === 1 ? 'pop' : 'coin');
      return;
    }
    if (celebQueue.length > 6) celebQueue.shift();
    celebQueue.push({ user: u, text: text, sub: sub, tier: tier, emoji: g ? LG.giftEmoji(g) : (o.emoji || '🎉'), t: 0, dur: tier >= 6 ? 6 : tier >= 5 ? 4.5 : tier >= 4 ? 3 : 2.2 });
  };
  ui.toast = function (text, o) {
    o = o || {};
    toasts.unshift({ text: text, icon: o.icon || '•', color: o.color || '#fff', t: 0, life: o.life || 3.2 });
    if (toasts.length > 5) toasts.length = 5;
  };
  ui.toastPos = { x: LG.SAFE.x + 10, y: LG.SAFE.bottom - 150 }; // oyun değiştirebilir (en alttaki bildirimin y'si; yukarı doğru yığılır)
  ui.toastsEnabled = true;

  // ---------------------------------------------------------------------------
  // Hedef çubuğu, sayaç, liderlik tablosu, ipucu şeridi
  // ---------------------------------------------------------------------------
  ui.goalBar = function (ctx, x, y, w, h, value, max, o) {
    o = o || {};
    var f = LG.clamp(max ? value / max : 0, 0, 1);
    ctx.save();
    ui.roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = o.bg || 'rgba(0,0,0,0.55)'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
    if (f > 0) {
      ui.roundRect(ctx, x + 4, y + 4, Math.max(h - 8, (w - 8) * f), h - 8, (h - 8) / 2);
      var g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, o.color1 || '#ff4d6d'); g.addColorStop(1, o.color2 || '#ffd166');
      ctx.fillStyle = g; ctx.fill();
      // parıltı
      var sx = x + ((LG.time * 300) % (w + 200)) - 100;
      ctx.save(); ctx.clip();
      var sg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
    ctx.restore();
    var label = o.label != null ? o.label : LG.fmt(value) + ' / ' + LG.fmt(max);
    ui.text(ctx, (o.icon ? o.icon + ' ' : '') + label, x + w / 2, y + h / 2 + 2, { size: h * 0.55, maxWidth: w - 20 });
  };

  ui.timerRing = function (ctx, x, y, r, frac, label, o) {
    o = o || {};
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = o.bg || 'rgba(0,0,0,0.6)'; ctx.fill();
    ctx.lineWidth = r * 0.18; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = frac < 0.25 ? '#ff4d6d' : o.color || '#ffd166';
    ctx.beginPath(); ctx.arc(x, y, r * 0.85, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * LG.clamp(frac, 0, 1)); ctx.stroke();
    ctx.restore();
    ui.text(ctx, label, x, y + 2, { size: r * 0.75 });
  };

  // Dönen ipucu şeridi: ["💬 Yorum yaz → katıl", "❤️ Beğen → hızlanır", ...]
  ui.hintBar = function (ctx, x, y, w, lines, o) {
    o = o || {};
    if (!lines || !lines.length) return;
    var per = o.period || 3.2;
    var i = Math.floor(LG.time / per) % lines.length;
    var p = (LG.time % per) / per;
    var a = p < 0.08 ? p / 0.08 : p > 0.92 ? (1 - p) / 0.08 : 1;
    var h = o.h || 74;
    ui.panel(ctx, x, y, w, h, { r: h / 2, fill: o.fill || 'rgba(0,0,0,0.6)', border: o.border || 'rgba(255,255,255,0.25)' });
    ui.text(ctx, lines[i], x + w / 2, y + h / 2 + 2, { size: o.size || 38, alpha: a, maxWidth: w - 40, color: o.color || '#fff' });
  };

  // Liderlik tablosu
  function Board(opts) {
    this.opts = opts || {};
    this.scores = new Map();
    this._top = [];
    this._dirty = true;
    this._lastSort = 0;
  }
  Board.prototype.add = function (u, pts) {
    if (!u) return 0;
    var e = this.scores.get(u.id);
    if (!e) { e = { user: u, score: 0 }; this.scores.set(u.id, e); }
    e.score += pts;
    this._dirty = true;
    return e.score;
  };
  Board.prototype.set = function (u, pts) { this.add(u, 0); this.scores.get(u.id).score = pts; this._dirty = true; };
  Board.prototype.get = function (u) { var e = u && this.scores.get(u.id); return e ? e.score : 0; };
  Board.prototype.reset = function () { this.scores.clear(); this._top = []; this._dirty = true; };
  Board.prototype.top = function (n) {
    var now = performance.now();
    if (this._dirty && now - this._lastSort > 200) {
      this._top = Array.from(this.scores.values()).filter(function (e) { return e.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 20);
      this._dirty = false; this._lastSort = now;
    }
    return this._top.slice(0, n || 5);
  };
  Board.prototype.rank = function (u) {
    var arr = Array.from(this.scores.values()).sort(function (a, b) { return b.score - a.score; });
    for (var i = 0; i < arr.length; i++) if (arr[i].user.id === u.id) return i + 1;
    return 0;
  };
  Board.prototype.draw = function (ctx, x, y, w, o) {
    o = o || {};
    var rows = this.top(o.n || 5);
    var rowH = o.rowH || 54;
    var head = o.title ? 62 : 14;
    var h = head + Math.max(1, rows.length) * rowH + 14;
    ui.panel(ctx, x, y, w, h, { fill: o.fill || 'rgba(10,10,30,0.66)' });
    if (o.title) ui.text(ctx, o.title, x + w / 2, y + 34, { size: 34, color: o.titleColor || '#ffd166', maxWidth: w - 30 });
    if (!rows.length) {
      ui.text(ctx, o.empty || 'İlk sen ol!', x + w / 2, y + head + rowH / 2, { size: 28, color: 'rgba(255,255,255,0.7)' });
      return h;
    }
    var medals = ['🥇', '🥈', '🥉'];
    for (var i = 0; i < rows.length; i++) {
      var ry = y + head + i * rowH + rowH / 2;
      var r = rows[i];
      if (i < 3) ui.emoji(ctx, medals[i], x + 32, ry, rowH * 0.62);
      else ui.text(ctx, String(i + 1), x + 32, ry, { size: 28, color: '#ccc' });
      ui.avatar(ctx, r.user, x + 80, ry, rowH * 0.36, { ringWidth: 3 });
      ui.text(ctx, r.user.name, x + 112, ry, { size: 30, align: 'left', maxWidth: w - 230 });
      ui.text(ctx, (o.fmt ? o.fmt(r.score) : LG.fmt(r.score)) + (o.unit || ''), x + w - 18, ry, { size: 30, align: 'right', color: o.scoreColor || '#ffd166' });
    }
    return h;
  };
  LG.Board = Board;

  // ---------------------------------------------------------------------------
  // Kare güncelleme + üst katman çizimi (LG.start tarafından çağrılır)
  // ---------------------------------------------------------------------------
  ui.update = function (dt) {
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeI = 0; }
    if (flashT > 0) flashT -= dt;
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.vx *= 0.99;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (var j = floats.length - 1; j >= 0; j--) {
      var f = floats[j]; f.t += dt; f.y += f.vy * dt;
      if (f.t >= f.life) floats.splice(j, 1);
    }
    for (var k = toasts.length - 1; k >= 0; k--) { toasts[k].t += dt; if (toasts[k].t > toasts[k].life) toasts.splice(k, 1); }
    if (!celeb && celebQueue.length) {
      celeb = celebQueue.shift();
      celeb.t = 0;
      if (celeb.tier >= 5) { LG.sfx('mega'); ui.rain({ count: celeb.tier >= 6 ? 260 : 160 }); ui.flash('#fff', 0.4); ui.shake(18, 0.6); }
      else if (celeb.tier >= 4) { LG.sfx('fanfare'); ui.burst(LG.W / 2, LG.SAFE.y + 260, { count: 120, speed: 900 }); }
      else { LG.sfx('levelup'); ui.burst(LG.W / 2, LG.SAFE.y + 220, { count: 50, speed: 600 }); }
    }
    if (celeb) { celeb.t += dt; if (celeb.t >= celeb.dur) celeb = null; }
  };

  function drawParticles(ctx) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var a = 1 - p.t / p.life;
      ctx.globalAlpha = Math.min(1, a * 2);
      if (p.shape === 'emoji') {
        ui.emoji(ctx, p.emoji || '⭐', p.x, p.y, p.size * 2);
      } else if (p.shape === 'circle') {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  var helpOn = false;
  ui.toggleHelp = function () { helpOn = !helpOn; };
  var connShowT = 0, lastConn = '';
  LG.on && LG.on('connection', function () { connShowT = 5; });

  ui.renderOverlay = function (ctx) {
    drawParticles(ctx);
    for (var i = 0; i < floats.length; i++) {
      var f = floats[i];
      var a = 1 - f.t / f.life;
      var sc = f.t < 0.15 ? LG.ease.outBack(f.t / 0.15) : 1;
      if (f.emoji) ui.emoji(ctx, f.emoji, f.x, f.y - f.size, f.size * 1.2 * sc, a);
      ui.text(ctx, f.text, f.x, f.y, { size: f.size * sc, color: f.color, alpha: a });
    }
    // Toast yığını
    if (ui.toastsEnabled) {
      for (var t = 0; t < toasts.length; t++) {
        var to = toasts[t];
        var ta = to.t < 0.25 ? to.t / 0.25 : to.t > to.life - 0.4 ? (to.life - to.t) / 0.4 : 1;
        var ty = ui.toastPos.y - t * 62;
        ctx.save(); ctx.globalAlpha = ta;
        ctx.font = ui.font(32, 800);
        var tw = Math.min(700, ctx.measureText(to.text).width + 90);
        ui.panel(ctx, ui.toastPos.x, ty - 27, tw, 54, { r: 27, fill: 'rgba(0,0,0,0.6)', border: false });
        ui.emoji(ctx, to.icon, ui.toastPos.x + 32, ty, 32);
        ui.text(ctx, to.text, ui.toastPos.x + 58, ty + 2, { size: 30, align: 'left', color: to.color, maxWidth: tw - 75 });
        ctx.restore();
      }
    }
    // Hediye kutlaması
    if (celeb && ui.celebrateEnabled) {
      var c = celeb, p = c.t / c.dur;
      var inA = Math.min(1, c.t / 0.35), outA = Math.min(1, (c.dur - c.t) / 0.4);
      var al = Math.min(inA, outA);
      var cy = LG.SAFE.y + (c.tier >= 5 ? 420 : 210);
      var sc = LG.ease.outBack(Math.min(1, c.t / 0.45));
      ctx.save();
      ctx.globalAlpha = al;
      if (c.tier >= 5) {
        ctx.fillStyle = 'rgba(0,0,0,' + 0.45 * al + ')';
        ctx.fillRect(0, 0, LG.W, LG.H);
        var rays = ctx.createRadialGradient(LG.W / 2, cy, 10, LG.W / 2, cy, 700);
        rays.addColorStop(0, 'rgba(255,215,0,0.55)'); rays.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = rays; ctx.fillRect(0, 0, LG.W, LG.H);
      }
      ctx.translate(LG.W / 2, cy); ctx.scale(sc, sc);
      var bw = c.tier >= 5 ? 920 : 860, bh = c.tier >= 5 ? 300 : 170;
      ui.panel(ctx, -bw / 2, -bh / 2, bw, bh, { r: 40, fill: c.tier >= 5 ? 'rgba(60,20,90,0.92)' : 'rgba(20,20,50,0.88)', border: '#ffd166', lineWidth: 6 });
      var ar = c.tier >= 5 ? 90 : 56;
      ui.avatar(ctx, c.user, -bw / 2 + ar + 30, 0, ar, { ring: '#ffd166', ringWidth: 6 });
      var bob = Math.sin(LG.time * 8) * 8;
      ui.emoji(ctx, c.emoji, bw / 2 - 90, bob, c.tier >= 5 ? 130 : 90);
      var tx = -bw / 2 + ar * 2 + 60;
      ui.text(ctx, c.text, tx, c.tier >= 5 ? -40 : -24, { size: c.tier >= 5 ? 58 : 44, align: 'left', maxWidth: bw - ar * 2 - 220, color: '#fff' });
      ui.text(ctx, c.sub, tx, c.tier >= 5 ? 50 : 34, { size: c.tier >= 5 ? 46 : 34, align: 'left', maxWidth: bw - ar * 2 - 220, color: '#ffd166' });
      ctx.restore();
    }
    if (flashT > 0) {
      ctx.save(); ctx.globalAlpha = (flashT / flashDur) * 0.7; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, LG.W, LG.H); ctx.restore();
    }
    // Marka (@kullanıcıadı)
    if (LG.config.brand) {
      ui.text(ctx, LG.config.brand, LG.W / 2, LG.SAFE.bottom + 26, { size: 30, color: 'rgba(255,255,255,0.75)', strokeColor: 'rgba(0,0,0,0.5)' });
    }
    // Bağlantı durumu (değişince 5 sn görünür)
    if (!LG.config.hideStatus && (connShowT > 0 || LG.config.debug)) {
      connShowT -= 1 / 60;
      var st = LG.conn.state;
      var col = st === 'bağlı' ? '#06d6a0' : st === 'simülasyon' ? '#4cc9f0' : '#ff4d6d';
      ctx.save();
      ctx.globalAlpha = LG.config.debug ? 1 : Math.min(1, Math.max(0, connShowT));
      ui.panel(ctx, LG.W - 360, LG.SAFE.y - 70, 320, 50, { r: 25, fill: 'rgba(0,0,0,0.6)', border: false });
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(LG.W - 330, LG.SAFE.y - 45, 10, 0, Math.PI * 2); ctx.fill();
      ui.text(ctx, LG.conn.source === 'sim' ? 'Simülasyon' : (LG.conn.source || '') + ' ' + st, LG.W - 310, LG.SAFE.y - 43, { size: 26, align: 'left', maxWidth: 260 });
      ctx.restore();
    }
    if (LG.config.debug) {
      ui.text(ctx, 'FPS ' + Math.round(LG.fps) + ' · izleyici ' + LG.users.size + ' · parçacık ' + parts.length, 20, LG.H - 30, { size: 26, align: 'left' });
    }
    if (helpOn) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, LG.W, LG.H);
      ui.text(ctx, '⌨️ Kısayollar', LG.W / 2, 300, { size: 64, color: '#ffd166' });
      var keys = LG.keyHelp();
      for (var h = 0; h < keys.length; h++) {
        ui.text(ctx, keys[h].key.toUpperCase(), 200, 420 + h * 64, { size: 40, color: '#4cc9f0' });
        ui.text(ctx, keys[h].desc, 270, 420 + h * 64, { size: 36, align: 'left', maxWidth: 760 });
      }
      ctx.restore();
    }
  };
})();
