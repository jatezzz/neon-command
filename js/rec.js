/*
    Play recorder for design research (JOHN-429). OFF for everybody: it only records in a browser where the owner
    turned it on with ?rec=on (and stops with ?rec=off). Nothing is recorded or sent otherwise.

    What it records, to see where a battle gets hard: every tap (where, on what, and whether it did anything), every
    key, the game's own events (buy, order, crystal, sudden death, end), failed buys and their reason, and every 2 s
    a snapshot of the battle (energy, cores, units per kind on each side, crystals). No personal data: a random id per
    session. It travels in small batches through the portal's anonymous counter (/e?ev=rec...).
*/
(function () {
    'use strict';
    var KEY = 'nc.rec', on = false;
    try {
        var m = /[?&]rec=(on|off)\b/.exec(window.location.search);
        if (m) { if (m[1] === 'on') { window.localStorage.setItem(KEY, '1'); } else { window.localStorage.removeItem(KEY); } }
        on = window.localStorage.getItem(KEY) === '1';
    } catch (err) { on = false; }
    if (!on || !window.NeonCommand || !window.NeonCommand.Game) { return; }

    var G = window.NeonCommand.Game.prototype, game = null;
    var sid = Math.random().toString(36).slice(2, 8), seq = 0, buf = [], size = 0, t0 = Date.now();
    var URL0 = 'https://games.johnandrestrujillo.com/e?ev=rec&g=neon-command&sid=' + sid;

    function now() { return ((Date.now() - t0) / 1000).toFixed(1); }
    function bt() { return game ? (game.battle || 0).toFixed(1) : '0'; }
    function push(fields) {
        var line = [now(), bt()].concat(fields).join(',');
        buf.push(line); size += line.length + 1;
        if (size > 1800) { flush(); }
    }
    function flush() {
        if (!buf.length) { return; }
        var url = URL0 + '&n=' + (seq++) + '&b=' + encodeURIComponent(buf.join('|'));
        buf = []; size = 0;
        try { if (navigator.sendBeacon) { navigator.sendBeacon(url); } else { (new Image()).src = url; } } catch (err) { /* never break the game */ }
    }
    setInterval(flush, 3000);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { push(['vis', document.hidden ? 'hidden' : 'shown']); flush(); });

    function units(side) {
        var c = { spark: 0, lancer: 0, bulwark: 0 };
        game.units.forEach(function (u) { if (u.side === side) { c[u.kind] = (c[u.kind] || 0) + 1; } });
        return c.spark + '/' + c.lancer + '/' + c.bulwark;
    }
    function snap() {
        game = game || window.game;
        if (!game || game.state !== 'play' || game.paused) { return; }
        push(['snap', 'e' + Math.floor(game.energy.you) + ':' + Math.floor(game.energy.bot),
              'hp' + Math.round(game.cores.you.hp) + ':' + Math.round(game.cores.bot.hp),
              'u' + units('you') + ':' + units('bot'), 'c' + game.owned('you') + ':' + game.owned('bot'),
              's' + game.score, 'sel' + game.selected]);
    }
    setInterval(function () { try { snap(); } catch (err) { /* ignore */ } }, 2000);

    //  The screen and the device, once per session.
    push(['hello', 'w' + window.innerWidth + 'x' + window.innerHeight, (('ontouchstart' in window) ? 'touch' : 'mouse'),
          window.self !== window.top ? 'portal' : 'page']);

    var tap = G.tap;
    G.tap = function (x, y) {
        game = this;
        var before = { e: this.energy && this.energy.you, sel: this.selected, st: this.state, n: this.units ? this.units.length : 0, paused: this.paused };
        var r = tap.apply(this, arguments);
        var what = 'field';
        if (before.paused) { what = 'pause-menu'; }
        else if (before.st !== 'play') { what = before.st; }
        else if (y >= window.NeonCommand.FIELD_B) {
            var b = this.barLayout().filter(function (q) { return x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h; })[0];
            what = b ? b.kind + ':' + b.unit : 'bar-empty';
        }
        push(['tap', Math.round(x), Math.round(y), what, before.sel === this.selected ? '' : 'sel>' + this.selected]);
        return r;
    };
    var buy = G.buy;
    G.buy = function (side, kind) {
        game = this;
        var ok = buy.apply(this, arguments);
        if (side === 'you' && !ok && this.state === 'play') {
            var mine = this.units.filter(function (u) { return u.side === 'you'; }).length;
            push(['deny', kind, this.energy.you < window.NeonCommand.UNITS[kind].cost ? 'energy' + Math.floor(this.energy.you) : (mine >= 30 ? 'cap' : 'other')]);
        }
        return ok;
    };
    var key = G.keyDown;
    G.keyDown = function (code) { game = this; push(['key', code, this.state]); return key.apply(this, arguments); };
    var log = G.log;
    G.log = function (name, extra) {
        game = this;
        var r = log.apply(this, arguments);
        var parts = [];
        Object.keys(extra || {}).forEach(function (k) { if (k !== 'at') { parts.push(k + '=' + extra[k]); } });
        push(['ev:' + name].concat(parts.join(' ')));
        if (name === 'run') { push(['lvl', this.level, 'map' + (this.plan && this.plan.name ? this.plan.name : '')]); }
        if (name === 'over') { snap(); push(['end', this.won ? 'won' : 'lost', 'bt' + Math.round(this.battle), 'hp' + Math.round(this.cores.you.hp) + ':' + Math.round(this.cores.bot.hp)]); flush(); }
        return r;
    };
})();
