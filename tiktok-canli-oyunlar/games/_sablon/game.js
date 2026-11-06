/*
 * ŞABLON OYUN — yeni oyunlar için başlangıç noktası.
 * Yorum yazan herkes meydana bir karakter olarak girer, beğeniler kalp uçurur,
 * hediyeler kutlanır, liderlik tablosu en aktifleri gösterir.
 */
(function () {
  'use strict';
  var ui = LG.ui;
  var people = [];               // ekrandaki karakterler
  var byId = new Map();
  var board = new LG.Board();
  var likeGoal = { value: 0, target: 500 };

  // Simülatörün üreteceği örnek yorumlar: [metin, ağırlık]
  LG.sim.comments = [['merhaba', 3], ['selam', 3], ['zıpla', 2], ['dans', 2]];

  function spawn(u) {
    var p = byId.get(u.id);
    if (p) return p;
    p = { user: u, x: LG.rand(120, 960), y: LG.rand(500, 1200), tx: 0, ty: 0, phase: Math.random(), jump: 0, born: LG.time };
    p.tx = p.x; p.ty = p.y;
    people.push(p); byId.set(u.id, p);
    if (people.length > 400) { var old = people.shift(); byId.delete(old.user.id); }
    return p;
  }

  LG.on('chat', function (e) {
    var p = spawn(e.user);
    board.add(e.user, 1);
    if (LG.cmd.has(e.raw, ['zıpla', 'zipla', 'jump'])) p.jump = 1;
    if (e.isNew) { LG.sfx('join'); ui.toast(e.user.name + ' katıldı', { icon: '👋' }); }
    else LG.sfx('pop');
  });
  LG.on('like', function (e) {
    likeGoal.value += e.count;
    var p = byId.get(e.user.id);
    ui.float('❤', p ? p.x : LG.rand(200, 880), p ? p.y - 80 : 1200, { color: '#ff4d6d', size: 40 });
    if (likeGoal.value >= likeGoal.target) {
      likeGoal.value = 0; likeGoal.target = Math.round(likeGoal.target * 1.5);
      ui.rain({ count: 150 }); LG.sfx('fanfare');
    }
  });
  LG.on('gift', function (e) {
    var p = spawn(e.user);
    board.add(e.user, e.gift.total * 10);
    p.jump = 1;
    ui.celebrate(e);
  });
  LG.on('follow', function (e) { ui.toast(e.user.name + ' takip etti', { icon: '➕', color: '#06d6a0' }); LG.sfx('heart'); });
  LG.on('share', function (e) { ui.toast(e.user.name + ' paylaştı', { icon: '↗️', color: '#4cc9f0' }); });

  LG.onKey('r', 'Meydanı sıfırla', function () { people = []; byId.clear(); board.reset(); });

  LG.start({
    id: 'sablon',
    title: 'Şablon Oyun',
    init: function () { LG.music.play('party'); },
    update: function (dt, t) {
      for (var i = 0; i < people.length; i++) {
        var p = people[i];
        p.phase += dt * 1.5;
        if (Math.random() < dt * 0.3) { p.tx = LG.rand(100, 980); p.ty = LG.rand(520, 1220); }
        p.x += (p.tx - p.x) * dt * 0.8;
        p.y += (p.ty - p.y) * dt * 0.8;
        if (p.jump > 0) p.jump = Math.max(0, p.jump - dt * 1.5);
      }
      people.sort(function (a, b) { return a.y - b.y; }); // derinlik
    },
    render: function (ctx, t) {
      ui.gradientBg(ctx, '#3a1c71', '#d76d77');
      ctx.save();
      ui.applyShake(ctx);
      for (var i = 0; i < people.length; i++) {
        var p = people[i];
        var jy = -Math.sin(p.jump * Math.PI) * 120;
        ui.person(ctx, p.x, p.y + jy, 1.1, p.user, { dance: p.phase, arms: p.jump > 0 ? 'up' : 'side' });
        ui.drawNameTag(ctx, p.user, p.x, p.y + jy - 95, 24);
      }
      ctx.restore();
      // Üst bilgi (güvenli alan içinde)
      ui.text(ctx, 'ŞABLON MEYDAN', LG.W / 2, LG.SAFE.y + 50, { size: 72, color: '#ffd166' });
      ui.goalBar(ctx, 140, LG.SAFE.y + 110, 800, 60, likeGoal.value, likeGoal.target, { icon: '❤️', label: 'Beğeni hedefi ' + likeGoal.value + '/' + likeGoal.target });
      board.draw(ctx, LG.SAFE.x, LG.SAFE.y + 200, 420, { title: 'En Aktifler', n: 5 });
      ui.hintBar(ctx, 140, LG.SAFE.bottom - 90, 800, ['💬 Yorum yaz → meydana gir', '🦘 "zıpla" yaz → zıpla', '❤️ Beğen → hedefi doldur', '🎁 Hediye → kutlama']);
    },
  });
})();
