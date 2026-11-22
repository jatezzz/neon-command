/*  A simple test player for Neon Command: buys what beats the bot's most numerous unit, takes the nearest crystal,
    attacks the core once its army is big enough. Hooks into game.update (one decision every half second). */
(function () {
    function install(game, opts) {
        var o = Object.assign({ attackAt: 10, think: 0.5, counter: true, level: null }, opts || {});
        var orig = game.update, wait = 0, U = window.NeonCommand.UNITS;
        game.update = function (dt) {
            if (this.state === 'title') { if (o.level) { this.setLevel(o.level); } this.tap(200, 300); }
            wait -= dt;
            if (this.state === 'play' && wait <= 0) {
                wait = o.think;
                var bots = { spark: 0, lancer: 0, bulwark: 0 }, mine = [];
                this.units.forEach(function (u) { if (u.side === 'bot') { bots[u.kind]++; } else { mine.push(u); } });
                var top = Object.keys(bots).sort(function (a, b) { return bots[b] - bots[a]; })[0];
                var want = o.counter && bots[top] ? Object.keys(U).filter(function (k) { return U[k].beats === top; })[0] : ['spark', 'lancer', 'bulwark'][mine.length % 3];
                this.buy('you', want);
                this.selected = 'all';
                var free = this.crystals.filter(function (c) { return c.owner !== 'you'; }).sort(function (a, b) { return b.y - a.y; });
                if (mine.length >= o.attackAt || !free.length) { this.order(this.cores.bot.x, this.cores.bot.y); }
                else { this.order(free[0].x, free[0].y); }
            }
            orig.call(this, dt);
        };
        return game;
    }
    window.NCPlayer = { install: install };
})();
