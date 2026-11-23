/*
    Neon Command: a small real-time strategy game against a bot, on a map of the day.

    Your core is at the bottom, the bot's at the top. Energy comes in by itself and faster for every crystal you hold.
    Three units beat each other in a circle: Spark (fast) > Lancer (long range) > Bulwark (heavy) > Spark.
    Pick a group, tap the map to send it; units fight whatever comes within reach on the way. Destroy the bot's core.

    The day decides the crystals' positions and the bot's style (its army mix, how much it waits before attacking).
    Fixed 120 Hz simulation; the bot's decisions use the day's random numbers, so everyone faces the same opponent.
*/
(function () {
    'use strict';

    var W = 400, H = 640, TOP = 44, BAR = 104;           // HUD on top, the command bar at the bottom
    var FIELD_B = H - BAR;                                // bottom edge of the battlefield
    var STEP = 1 / 120;
    var CAP = 30;                                         // most units per side
    var UNITS = {
        spark:   { cost: 40, hp: 42,  speed: 60, range: 13, dmg: 7,  every: 0.45, r: 5, beats: 'lancer',  shape: 'tri' },
        lancer:  { cost: 60, hp: 48,  speed: 36, range: 88, dmg: 11, every: 1.0,  r: 6, beats: 'bulwark', shape: 'dia', shot: true },
        bulwark: { cost: 80, hp: 170, speed: 28, range: 15, dmg: 10, every: 0.8,  r: 8, beats: 'spark',   shape: 'sq' }
    };
    var ORDER = ['spark', 'lancer', 'bulwark'];
    var CORE_HP = 3500, CORE_R = 22;
    var CORE_ARMOR = 0.5;                                 // units do half damage to a core: a siege takes a while
    var START_ENERGY = 140, INCOME = 6, CRYSTAL_INCOME = 3;
    var CATCH_UP = 2;
    var SUDDEN = 480, SUDDEN2 = 600;                     // after 8 minutes cores lose their armour, after 10 they take double                                     // energy per second for every crystal the other side holds more
    var START_ARMY = ['spark', 'spark', 'lancer'];        // nobody starts empty
    //  Levels: how much energy the bot gets, how fast it thinks, how often it answers your mix, how long it waits before
    //  its first attack, how many units it adds to its push size, how many more units than yours it allows itself,
    //  and the score multiplier, so scores stay comparable across levels.
    var LEVELS = {
        easy:   { income: 0.70, think: 1.1,  counter: 0.4, grace: 120, attackPlus: 4, lead: 3,  mult: 0.6 },
        normal: { income: 0.85, think: 0.75, counter: 0.75, grace: 70, attackPlus: 2, lead: 6,  mult: 1.0 },
        hard:   { income: 1.00, think: 0.5,  counter: 1.0, grace: 30,  attackPlus: 0, lead: 99, mult: 1.4 }
    };
    var LEVEL_KEYS = ['easy', 'normal', 'hard'];
    var CAPTURE_R = 28, CAPTURE_TIME = 2.5;
    var SIDE = { you: { color: '#00f0ff', dim: 'rgba(0,240,255,0.25)' }, bot: { color: '#ff00c8', dim: 'rgba(255,0,200,0.25)' } };

    var I = window.NeonI18n, D = window.NeonDaily;

    //  The battlefield floor from the game's art (img/bg.jpg): a neon grid seen from above, magenta haze on the bot's side,
    //  cyan on yours. Dimmed under the units; the plain gradient shows until it loads.
    var BACKDROP = new Image(), backdropReady = false;
    BACKDROP.onload = function () { backdropReady = true; };
    BACKDROP.src = 'img/bg.jpg?v=1';
    function t(key, vars) { return I ? I.t(key, vars) : key; }
    function num(n) { return I ? I.number(n) : String(n); }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
    function calm() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    function mulberry(seed) {
        var a = seed >>> 0;
        return function () { a = (a + 0x6D2B79F5) >>> 0; var x = Math.imul(a ^ (a >>> 15), a | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    }

    // ------------------------------------------------------------------------------------- the battle of the day

    //  The map and the opponent of the day: crystals mirrored through the centre (fair for both sides), and the bot's style.
    function dayPlan() {
        var rng = D ? D.rng('battle') : mulberry(4242);
        var count = 2 + Math.floor(rng() * 2);          // 2 or 3 pairs, plus one in the middle
        var mid = (TOP + FIELD_B) / 2, crystals = [{ x: W / 2, y: mid }];
        for (var i = 0; i < count; i++) {
            for (var tries = 0; tries < 20; tries++) {
                var x = 50 + rng() * (W - 100), y = mid + 40 + rng() * 120;
                var ok = crystals.every(function (c) { return Math.abs(c.x - x) + Math.abs(c.y - y) > 90 && Math.abs(c.x - (W - x)) + Math.abs(c.y - (2 * mid - y)) > 90; });
                if (ok) { crystals.push({ x: x, y: y }, { x: W - x, y: 2 * mid - y }); break; }
            }
        }
        var w = [0.2 + rng(), 0.2 + rng(), 0.2 + rng()], sum = w[0] + w[1] + w[2];
        return {
            crystals: crystals,
            mix: { spark: w[0] / sum, lancer: w[1] / sum, bulwark: w[2] / sum },
            attackAt: 6 + Math.floor(rng() * 5),        // army size before the bot's first push
            counter: 0.5 + rng() * 0.35,                 // how often it answers your mix instead of following its own
            seed: Math.floor(rng() * 1e9)
        };
    }

    // ------------------------------------------------------------------------------------- sound

    function Sound() {
        this.mute = false;
        try { this.mute = window.localStorage.getItem('nc.mute') === '1'; } catch (err) { /* no storage */ }
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { this.ctx = null; }
        this.lastAt = {};
    }
    Sound.prototype.tone = function (freq, seconds, type, volume, slideTo, key) {
        if (this.mute || !this.ctx) { return; }
        try {
            var c = this.ctx, at = c.currentTime;
            if (key) { if (this.lastAt[key] && at - this.lastAt[key] < 0.06) { return; } this.lastAt[key] = at; }   // no machine-gun noise
            var o = c.createOscillator(), g = c.createGain();
            o.type = type || 'square'; o.frequency.setValueAtTime(freq, at);
            if (slideTo) { o.frequency.exponentialRampToValueAtTime(slideTo, at + seconds); }
            g.gain.setValueAtTime(volume || 0.06, at); g.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
            o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + seconds + 0.02);
        } catch (err) { /* sound must never break the game */ }
    };
    Sound.prototype.toggle = function () {
        this.mute = !this.mute;
        try { window.localStorage.setItem('nc.mute', this.mute ? '1' : '0'); } catch (err) { /* no storage */ }
        return this.mute;
    };
    Sound.prototype.unlock = function () { if (this.ctx && this.ctx.state === 'suspended') { this.ctx.resume(); } };

    // ------------------------------------------------------------------------------------- the game

    function Game(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.sound = new Sound();
        this.events = [];
        this.state = 'title';
        this.paused = false;
        this.time = 0;
        this.fx = { shake: 0, mag: 0, flash: 0, flashColor: '#ffffff' };
        this.best = D ? D.todayProgress().best : 0;
        this.streak = D ? D.currentStreak() : 0;
        this.plan = dayPlan();
        this.level = 'easy';                              // a first battle should be winnable; the choice is remembered
        try { var saved = window.localStorage.getItem('nc.level'); if (LEVELS[saved]) { this.level = saved; } } catch (err) { /* no storage */ }
        this.resetRun();
        this.resize();
    }

    Game.prototype.setLevel = function (key) {
        if (!LEVELS[key]) { return; }
        this.level = key;
        try { window.localStorage.setItem('nc.level', key); } catch (err) { /* no storage */ }
    };

    Game.prototype.log = function (name, extra) {
        var e = { ev: name, at: Date.now(), t: Math.round(this.time * 1000) / 1000, score: this.score };
        if (extra) { for (var k in extra) { e[k] = extra[k]; } }
        this.events.push(e);
        if (window.NeonStage) { window.NeonStage.event(name, e); }      // the shared universe reacts (neon-stage.js)
        if (this.events.length > 4000) { this.events.shift(); }
    };

    Game.prototype.resetRun = function () {
        var mid = (TOP + FIELD_B) / 2;
        this.battle = 0;                                  // seconds of battle
        this.score = 0; this.won = false;
        this.units = []; this.shots = []; this.particles = []; this.texts = [];
        this.cores = { you: { side: 'you', x: W / 2, y: FIELD_B - 34, hp: CORE_HP, cool: 0 }, bot: { side: 'bot', x: W / 2, y: TOP + 34, hp: CORE_HP, cool: 0 } };
        this.energy = { you: START_ENERGY, bot: START_ENERGY };
        this.crystals = this.plan.crystals.map(function (c) { return { x: c.x, y: c.y, owner: null, progress: 0, by: null }; });
        this.selected = 'all';
        this.rally = { x: W / 2, y: FIELD_B - 90 };
        this.botRng = mulberry(this.plan.seed);
        this.botThink = 0; this.botWant = null; this.botMode = 'gather';
        this.stats = { kills: 0, built: 0, crystals: 0, lost: 0, damage: 0 };
        this.endFor = 0;
        this.reported = -1;
        this.goalPassed = false;
        this.nextId = 1;
        this.queue = [];                                  // buys waiting for energy (yours only), at most 3
        //  The coach: one short tip at a time, when it helps (Easy and Normal). JOHN-429, from recorded play.
        this.coach = { on: this.level !== 'hard', gap: 4, said: {}, line: null, life: 0, pending: null };
        this.marker = null;
        void mid;
    };

    Game.prototype.clock = function () {
        var s = Math.floor(this.battle), m = Math.floor(s / 60);
        return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
    };

    Game.prototype.startRun = function () {
        this.resetRun();
        if (D) { D.onRunStart(); }
        this.log('run', { level: this.level });
        this.state = 'play';
        var self = this;
        ['you', 'bot'].forEach(function (side) { START_ARMY.forEach(function (k) { self.spawn(side, k); }); });
        this.announce();
    };
    Game.prototype.restart = function () { if (this.state === 'over') { this.startRun(); } };

    // ---------------------------------------------------------------- orders

    //  Build a unit at the core, if there is energy and room.
    Game.prototype.buy = function (side, kind) {
        var u = UNITS[kind], core = this.cores[side];
        if (this.state !== 'play' || this.energy[side] < u.cost) { return false; }
        var mine = this.units.filter(function (x) { return x.side === side; }).length;
        if (mine >= CAP) { return false; }
        this.energy[side] -= u.cost;
        this.spawn(side, kind);
        if (side === 'you') { this.stats.built += 1; this.sound.tone(330 + ORDER.indexOf(kind) * 110, 0.08, 'triangle', 0.06); }
        this.log('buy', { side: side, kind: kind });
        return true;
    };

    //  A buy without enough energy waits in line and happens by itself when the energy is there (no tapping again).
    Game.prototype.enqueue = function (kind) {
        var mine = this.units.filter(function (x) { return x.side === 'you'; }).length;
        if (this.state !== 'play' || this.queue.length >= 3 || mine + this.queue.length >= CAP) { return; }
        this.queue.push(kind);
        this.log('queue', { kind: kind, n: this.queue.length });
        this.sound.tone(440, 0.04, 'sine', 0.03);
    };
    Game.prototype.drainQueue = function () {
        while (this.queue.length && this.energy.you >= UNITS[this.queue[0]].cost) {
            if (!this.buy('you', this.queue[0])) { this.queue = []; break; }
            this.queue.shift();
        }
    };

    //  The coach: what a good player would whisper at this moment. One tip at a time, each with its own rest.
    Game.prototype.coachTick = function (dt) {
        var c = this.coach;
        if (c.life > 0) { c.life -= dt; }
        if (!c.on) { return; }
        c.gap -= dt;
        var self = this, mine = 0, kinds = { spark: 0, lancer: 0, bulwark: 0 }, botN = 0;
        this.units.forEach(function (u) { if (u.side === 'you') { mine++; } else { botN++; kinds[u.kind]++; } });
        var say = function (key, rest, vars) {
            if (c.gap > 0 || (c.said[key] !== undefined && self.battle - c.said[key] < rest)) { return false; }
            c.line = t('coach.' + key, vars || {}); c.life = 4.5; c.gap = 6; c.said[key] = self.battle;
            self.log('coach', { tip: key });
            return true;
        };
        if (c.pending) { var p = c.pending; c.pending = null; c.gap = Math.min(c.gap, 0); if (say(p, 12, { n: c.n })) { return; } }
        if (this.energy.you >= 150 && mine < CAP && say('energy', 20, { e: Math.floor(this.energy.you) })) { return; }
        //  A good army standing still while the bot holds the crystals: send it.
        if (mine >= 5 && this.battle - (c.lastOrder || 0) > 15 && this.owned('bot') >= 3 && say('idle', 20, { m: mine })) { return; }
        if (botN >= mine * 2 + 2 && say('outnumbered', 25, { b: botN, m: mine })) { return; }
        var top = ORDER.slice().sort(function (a, b) { return kinds[b] - kinds[a]; })[0];
        if (kinds[top] >= 3 && kinds[top] * 2 >= botN) {
            var beater = ORDER.filter(function (k) { return UNITS[k].beats === top; })[0];
            say('counter', 30, { k: t('u.' + top), b: t('u.' + beater) });
        }
    };
    Game.prototype.drawCoach = function (ctx) {
        var c = this.coach;
        if (this.state !== 'play' || this.paused || !c || !c.line || c.life <= 0) { return; }
        ctx.save(); ctx.globalAlpha = Math.min(1, c.life / 0.4);
        if (window.NeonStage && window.NeonStage.text) { window.NeonStage.text.plate(ctx, c.line, W / 2, TOP + 62, 14, '#ffffff', 0.6); }
        else { this.center(ctx, c.line, TOP + 62, 14, '#ffffff', true); }
        ctx.restore();
    };

    //  A new unit next to its core.
    Game.prototype.spawn = function (side, kind) {
        var u = UNITS[kind], core = this.cores[side];
        var dir = side === 'you' ? -1 : 1;
        var unit = { id: this.nextId++, side: side, kind: kind, x: core.x + (this.units.length % 5 - 2) * 9, y: core.y + dir * (CORE_R + 10),
                     hp: u.hp, cool: 0, target: null, goal: side === 'you' ? { x: this.rally.x, y: this.rally.y } : null, flash: 0 };
        this.units.push(unit);
        return unit;
    };

    //  Send the selected group (or everyone) to a point. They fight what they meet on the way.
    Game.prototype.order = function (x, y) {
        var sel = this.selected, n = 0;
        x = clamp(x, 10, W - 10); y = clamp(y, TOP + 10, FIELD_B - 10);
        this.units.forEach(function (u) {
            if (u.side === 'you' && (sel === 'all' || u.kind === sel)) { u.goal = { x: x, y: y }; n++; }
        });
        if (sel === 'all') { this.rally = { x: x, y: Math.max(y, (TOP + FIELD_B) / 2) }; }
        this.marker = { x: x, y: y, life: 0.6 };
        this.log('order', { sel: sel, x: Math.round(x), y: Math.round(y), n: n });
        this.coach.lastOrder = this.battle;
        if (n === 0) { this.coach.pending = 'empty'; }
        else if (y < (TOP + FIELD_B) / 2 && n < 4 && this.battle > 5) { this.coach.pending = 'few'; this.coach.n = n; }
        this.sound.tone(520, 0.05, 'sine', 0.05);
    };

    // ---------------------------------------------------------------- the bot

    Game.prototype.botUpdate = function (dt) {
        this.botThink -= dt;
        if (this.botThink > 0) { return; }
        var L = LEVELS[this.level];
        this.botThink = L.think;
        var r = this.botRng, plan = this.plan, self = this;
        //  What to build: often the answer to your most numerous unit, otherwise its own mix of the day.
        if (!this.botWant) {
            var yours = { spark: 0, lancer: 0, bulwark: 0 };
            this.units.forEach(function (u) { if (u.side === 'you') { yours[u.kind]++; } });
            var top = ORDER.slice().sort(function (a, b) { return yours[b] - yours[a]; })[0];
            if (yours[top] >= 3 && r() < plan.counter * L.counter) {
                this.botWant = ORDER.filter(function (k) { return UNITS[k].beats === top; })[0];
            } else {
                var x = r(), acc = 0;
                for (var i = 0; i < ORDER.length; i++) { acc += plan.mix[ORDER[i]]; if (x <= acc) { this.botWant = ORDER[i]; break; } }
                this.botWant = this.botWant || 'spark';
            }
        }
        //  On the easier levels the bot never builds far more units than you have.
        var mineCount = this.units.filter(function (u) { return u.side === 'you'; }).length;
        var botCount = this.units.filter(function (u) { return u.side === 'bot'; }).length;
        if (botCount < mineCount + L.lead && this.buy('bot', this.botWant)) { this.botWant = null; }
        //  Where to go: hold the crystals near home, push when the army is big enough, defend the core when attacked.
        var army = this.units.filter(function (u) { return u.side === 'bot'; });
        var threat = this.units.some(function (u) { return u.side === 'you' && dist2(u, self.cores.bot) < 130 * 130; });
        if (threat) { this.botMode = 'defend'; }
        else if ((army.length >= plan.attackAt + L.attackPlus && this.battle >= L.grace) || (this.battle >= SUDDEN && army.length >= 3)) { this.botMode = 'attack'; }
        else if (this.botMode !== 'attack' || army.length < (plan.attackAt + L.attackPlus) / 2) { this.botMode = 'gather'; }
        var goal;
        if (this.botMode === 'attack') { goal = { x: this.cores.you.x, y: this.cores.you.y }; }
        else if (this.botMode === 'defend') { goal = { x: this.cores.bot.x, y: this.cores.bot.y + 60 }; }
        else {
            var free = this.crystals.filter(function (c) { return c.owner !== 'bot'; })
                .sort(function (a, b) { return a.y - b.y; });
            goal = free.length ? { x: free[0].x, y: free[0].y } : { x: W / 2, y: (TOP + FIELD_B) / 2 - 40 };
        }
        army.forEach(function (u) { u.goal = goal; });
    };

    // ---------------------------------------------------------------- simulation

    Game.prototype.update = function (dt) {
        this.time += dt;
        if (this.state === 'play') {
            this.battle += dt;
            var oy = this.owned('you'), ob = this.owned('bot');
            this.energy.you += (INCOME + CRYSTAL_INCOME * oy + CATCH_UP * Math.max(0, ob - oy)) * dt;
            this.energy.bot += (INCOME + CRYSTAL_INCOME * ob + CATCH_UP * Math.max(0, oy - ob)) * dt * LEVELS[this.level].income;
            if (this.battle >= SUDDEN && this.battle - dt < SUDDEN) {
                this.log('sudden');
                this.texts.push({ x: W / 2, y: (TOP + FIELD_B) / 2 - 40, text: t('sudden'), life: 2.4, max: 2.4, big: true, color: '#ffdc3c' });
                this.sound.tone(200, 0.5, 'sawtooth', 0.07, 400);
            }
            this.drainQueue();
            this.coachTick(dt);
            this.botUpdate(dt);
            this.moveUnits(dt);
            this.fight(dt);
            this.capture(dt);
            this.moveShots(dt);
            if (this.cores.bot.hp <= 0) { this.finish(true); }
            else if (this.cores.you.hp <= 0) { this.finish(false); }
        } else if (this.state === 'ending') {
            this.endFor -= dt;
            this.moveShots(dt);
            if (this.endFor <= 0) { this.gameOver(); }
        }
        if (this.marker) { this.marker.life -= dt; if (this.marker.life <= 0) { this.marker = null; } }
        this.updateEffects(dt);
        if (window.PortalSDK && window.PortalSDK.reportScore && this.score !== this.reported && this.state !== 'title') {
            this.reported = this.score; window.PortalSDK.reportScore(this.score);
        }
    };

    Game.prototype.owned = function (side) { return this.crystals.filter(function (c) { return c.owner === side; }).length; };

    //  The closest enemy (unit or core) a unit can see.
    Game.prototype.enemyNear = function (u, reach) {
        var best = null, bd = reach * reach;
        for (var i = 0; i < this.units.length; i++) {
            var e = this.units[i];
            if (e.side === u.side || e.hp <= 0) { continue; }
            var d = dist2(u, e);
            if (d < bd) { bd = d; best = e; }
        }
        var core = this.cores[u.side === 'you' ? 'bot' : 'you'];
        var dc = dist2(u, core) - CORE_R * CORE_R;
        if (!best && dc < reach * reach) { best = core; }
        return best;
    };

    Game.prototype.moveUnits = function (dt) {
        var units = this.units;
        for (var i = 0; i < units.length; i++) {
            var u = units[i], spec = UNITS[u.kind];
            var sight = Math.max(spec.range, 60);
            u.target = this.enemyNear(u, sight);
            var tx, ty, stop;
            if (u.target) {
                tx = u.target.x; ty = u.target.y;
                stop = spec.range + (u.target.kind ? UNITS[u.target.kind].r : CORE_R) - 2;
            } else if (u.goal) {
                tx = u.goal.x; ty = u.goal.y; stop = 6;
            } else { continue; }
            var dx = tx - u.x, dy = ty - u.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
            var mx = 0, my = 0;
            if (d > stop) { mx = dx / d * spec.speed; my = dy / d * spec.speed; }
            //  Keep a little space from friends so groups spread instead of stacking.
            for (var j = 0; j < units.length; j++) {
                var o = units[j];
                if (o === u || o.side !== u.side) { continue; }
                var ox = u.x - o.x, oy = u.y - o.y, od = ox * ox + oy * oy, min = spec.r + UNITS[o.kind].r + 2;
                if (od > 0 && od < min * min) { var s = Math.sqrt(od); mx += ox / s * 40; my += oy / s * 40; }
            }
            u.x = clamp(u.x + mx * dt, 6, W - 6);
            u.y = clamp(u.y + my * dt, TOP + 6, FIELD_B - 6);
        }
    };

    Game.prototype.fight = function (dt) {
        var self = this;
        this.units.forEach(function (u) {
            var spec = UNITS[u.kind];
            u.cool -= dt; if (u.flash > 0) { u.flash -= dt; }
            var e = u.target;
            if (!e || e.hp <= 0 || u.cool > 0) { return; }
            var reach = spec.range + (e.kind ? UNITS[e.kind].r : CORE_R) + 1;
            if (dist2(u, e) > reach * reach) { return; }
            u.cool = spec.every;
            var dmg = spec.dmg * (e.kind && spec.beats === e.kind ? 2 : 1);
            if (spec.shot) {
                self.shots.push({ x: u.x, y: u.y, target: e, dmg: dmg, side: u.side, speed: 260 });
                self.sound.tone(900, 0.04, 'square', 0.025, 600, 'shot');
            } else {
                self.hit(e, dmg, u.side);
            }
        });
        //  The cores defend themselves a little, so a first rush is not the end.
        ['you', 'bot'].forEach(function (side) {
            var c = self.cores[side];
            c.cool -= dt;
            if (c.cool > 0) { return; }
            var e = self.enemyNear({ x: c.x, y: c.y, side: side }, 100);
            if (e && e.kind) { c.cool = 0.7; self.shots.push({ x: c.x, y: c.y, target: e, dmg: 16, side: side, speed: 320 }); }
        });
        //  Remove the dead.
        for (var i = this.units.length - 1; i >= 0; i--) {
            var u = this.units[i];
            if (u.hp > 0) { continue; }
            this.burst(u.x, u.y, SIDE[u.side].color, 10);
            if (u.side === 'bot') { this.stats.kills += 1; this.addScore(5); } else { this.stats.lost += 1; }
            this.sound.tone(u.side === 'bot' ? 220 : 160, 0.12, 'sawtooth', 0.05, 80, 'die');
            this.units.splice(i, 1);
        }
    };

    Game.prototype.hit = function (e, dmg, side) {
        if (!e.kind) { dmg *= this.battle >= SUDDEN2 ? 2 : (this.battle >= SUDDEN ? 1 : CORE_ARMOR); }
        e.hp -= dmg;
        if (e.kind) { e.flash = 0.08; }
        else {
            if (side === 'you' && this.state === 'play') { this.stats.damage += dmg; this.addScore(Math.round(dmg / 8)); }
            this.impact(e.side === 'you' ? 2 : 1, 0.08);
            this.sound.tone(e.side === 'you' ? 120 : 180, 0.08, 'square', 0.05, null, 'core');
        }
    };

    Game.prototype.moveShots = function (dt) {
        for (var i = this.shots.length - 1; i >= 0; i--) {
            var s = this.shots[i], e = s.target;
            if (e.hp <= 0 && e.kind) { this.shots.splice(i, 1); continue; }
            var dx = e.x - s.x, dy = e.y - s.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 6) { this.hit(e, s.dmg, s.side); this.shots.splice(i, 1); continue; }
            s.x += dx / d * s.speed * dt; s.y += dy / d * s.speed * dt;
        }
    };

    //  A crystal turns to the side whose units stand around it alone for a while.
    Game.prototype.capture = function (dt) {
        var self = this;
        this.crystals.forEach(function (c) {
            var you = 0, bot = 0;
            self.units.forEach(function (u) { if (dist2(u, c) < CAPTURE_R * CAPTURE_R) { if (u.side === 'you') { you++; } else { bot++; } } });
            var side = you && !bot ? 'you' : (bot && !you ? 'bot' : null);
            if (!side || side === c.owner) { if (!you && !bot) { c.progress = Math.max(0, c.progress - dt * 0.5); } return; }
            if (c.by !== side) { c.by = side; c.progress = 0; }
            c.progress += dt / CAPTURE_TIME;
            if (c.progress >= 1) {
                c.owner = side; c.progress = 0;
                self.log('crystal', { side: side });
                if (side === 'you') { self.addScore(25); self.sound.tone(660, 0.18, 'triangle', 0.07, 990); }
                self.burst(c.x, c.y, SIDE[side].color, 14);
            }
        });
    };

    Game.prototype.addScore = function (points) {
        this.score += points;
        var goal = D && D.target;
        if (goal && !this.goalPassed && this.score > goal.score) {
            this.goalPassed = true; this.log('goal');
            this.texts.push({ x: W / 2, y: 120, text: t('target.passed', { t: num(goal.score) }), life: 1.6, max: 1.6, big: true, color: '#ffdc3c' });
        }
    };

    //  The end: a win scores a bonus that is larger the faster it came and the more core you kept.
    Game.prototype.finish = function (won) {
        this.won = won;
        this.stats.crystals = this.owned('you');
        if (won) {
            var bonus = 1000 + Math.max(0, Math.round((600 - this.battle) * 3)) + Math.round(this.cores.you.hp / CORE_HP * 300);
            this.addScore(bonus);
        }
        this.score = Math.round(this.score * LEVELS[this.level].mult);       // the level multiplier keeps scores comparable
        this.log(won ? 'win' : 'lose', { seconds: Math.round(this.battle), level: this.level });
        this.texts.push({ x: W / 2, y: (TOP + FIELD_B) / 2, text: t(won ? 'win' : 'lose'), life: 2.2, max: 2.2, big: true, color: won ? '#00ff9c' : '#ff00c8' });
        this.impact(6, 0.4, won ? '#00ff9c' : '#ff00c8', [60, 40, 60]);
        var core = this.cores[won ? 'bot' : 'you'];
        this.burst(core.x, core.y, SIDE[core.side].color, 60);
        if (won) { [523, 659, 784, 1047].forEach(function (f, i) { var s = this; setTimeout(function () { s.sound.tone(f, 0.18, 'square', 0.07); }, i * 120); }, this); }
        else { this.sound.tone(300, 0.6, 'sawtooth', 0.08, 60); }
        this.state = 'ending'; this.endFor = 2.0;
        this.announce();
    };

    Game.prototype.gameOver = function () {
        this.state = 'over';
        this.log('over', { won: this.won });
        this.announce();
        var share = null, last = null;
        if (D) {
            D.onGameOver(this); share = D.shareMessage(); last = D.lastResult();
            this.best = D.todayProgress().best; this.streak = D.currentStreak();
        }
        if (window.PortalSDK && window.PortalSDK.gameOver) {
            var sdkArgs = [this.score, { level: this.won ? 1 : 0, share: share, outcome: last && last.outcome,
                headline: last && last.headline, joke: last && last.joke }];
            //  Let the shared celebration play over the game before the portal covers it with its own screen.
            setTimeout(function () { window.PortalSDK.gameOver.apply(window.PortalSDK, sdkArgs); }, window.NeonFx ? window.NeonFx.portalDelay() : 0);
        }
    };

    // ---------------------------------------------------------------- pause and input

    Game.prototype.announce = function () {
        try { document.body.setAttribute('data-state', this.paused ? 'paused' : this.state); } catch (err) { /* no page */ }
    };
    Game.prototype.pause = function () {
        if (this.paused || this.state !== 'play') { return false; }
        this.paused = true; this.log('pause'); this.announce(); return true;
    };
    Game.prototype.resume = function () {
        if (!this.paused) { return false; }
        this.paused = false; this.last = null; this.log('resume'); this.announce(); return true;
    };
    Game.prototype.requestPause = function (paused) {
        var sdk = window.PortalSDK;
        if (sdk && sdk.pause && sdk.resume) { if (paused) { sdk.pause(); } else { sdk.resume(); } }
        return paused ? this.pause() : this.resume();
    };

    function overlayShown() { var o = document.getElementById('gameover'); return !!(o && !o.hidden); }

    //  The command bar: three buy buttons on top, four group chips below. Returns what a point hits.
    Game.prototype.barLayout = function () {
        var y0 = FIELD_B + 6, bw = (W - 24 - 16) / 3, out = [];
        ORDER.forEach(function (k, i) { out.push({ kind: 'buy', unit: k, x: 12 + i * (bw + 8), y: y0, w: bw, h: 48 }); });
        var cw = (W - 24 - 18) / 4;
        ['all'].concat(ORDER).forEach(function (k, i) { out.push({ kind: 'sel', unit: k, x: 12 + i * (cw + 6), y: y0 + 56, w: cw, h: 36 }); });
        return out;
    };

    Game.prototype.levelButtons = function () {
        var w = 110, gap = 10, x0 = (W - 3 * w - 2 * gap) / 2;
        return LEVEL_KEYS.map(function (k, i) { return { key: k, x: x0 + i * (w + gap), y: 405, w: w, h: 46 }; });
    };
    Game.prototype.pauseButtons = function () {
        return { resume: { x: 100, y: 330, w: 200, h: 46 }, surrender: { x: 100, y: 392, w: 200, h: 46 } };
    };

    //  A tap or click at a point of the play field (in field units).
    Game.prototype.tap = function (x, y) {
        this.sound.unlock();
        if (this.paused) {
            var b = this.pauseButtons(), hitP = function (r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; };
            this.requestPause(false);
            if (hitP(b.surrender)) { this.log('surrender'); this.finish(false); }
            return;
        }
        if (this.state === 'title') {
            var lv = this.levelButtons().filter(function (r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; })[0];
            if (lv) { this.setLevel(lv.key); }
            this.startRun(); return;
        }
        if (this.state === 'over') { if (!(D && D.locked()) && !overlayShown()) { this.startRun(); } return; }
        if (this.state !== 'play') { return; }
        if (y >= FIELD_B) {
            var hitBtn = this.barLayout().filter(function (b) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; })[0];
            if (!hitBtn) { return; }
            if (hitBtn.kind === 'buy') { if (!this.buy('you', hitBtn.unit)) { this.enqueue(hitBtn.unit); } }
            else { this.selected = hitBtn.unit; this.sound.tone(700, 0.03, 'sine', 0.04); }
            return;
        }
        this.order(x, y);
    };
    //  Keyboard: 1 2 3 buy, Q W E R pick a group, Space starts, Esc or P pauses.
    Game.prototype.keyDown = function (code) {
        if (code === 27 || code === 80) { this.requestPause(!this.paused); return; }
        if (code === 32 || code === 13) {
            if (this.state === 'title' || (this.state === 'over' && !(D && D.locked()))) { this.startRun(); }
            else if (this.paused) { this.requestPause(false); }
            return;
        }
        var buys = { 49: 'spark', 50: 'lancer', 51: 'bulwark' }, sels = { 81: 'all', 87: 'spark', 69: 'lancer', 82: 'bulwark' };
        if (this.state === 'title' && buys[code]) { this.setLevel(LEVEL_KEYS[code - 49]); return; }
        if (this.state === 'play' && buys[code]) { if (!this.buy('you', buys[code])) { this.enqueue(buys[code]); } }
        if (this.state === 'play' && sels[code]) { this.selected = sels[code]; }
    };
    Game.prototype.keyUp = function () {};
    Game.prototype.fieldPoint = function (clientX, clientY) {
        var r = this.canvas.getBoundingClientRect();
        return { x: (clientX - r.left) * W / r.width, y: (clientY - r.top) * H / r.height };
    };

    // ---------------------------------------------------------------- effects

    Game.prototype.impact = function (magnitude, seconds, flashColor, vibrate) {
        if (!calm()) { this.fx.shake = seconds; this.fx.mag = magnitude; if (flashColor) { this.fx.flash = 0.2; this.fx.flashColor = flashColor; } }
        try { if (vibrate && navigator.vibrate) { navigator.vibrate(vibrate); } } catch (err) { /* not allowed */ }
    };
    Game.prototype.burst = function (x, y, color, count) {
        for (var i = 0; i < count && this.particles.length < 300; i++) {
            var a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 140;
            this.particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.3, color: color });
        }
    };
    Game.prototype.updateEffects = function (dt) {
        if (this.fx.shake > 0) { this.fx.shake -= dt; }
        if (this.fx.flash > 0) { this.fx.flash -= dt; }
        for (var i = this.particles.length - 1; i >= 0; i--) {
            var q = this.particles[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; q.life -= dt;
            if (q.life <= 0) { this.particles.splice(i, 1); }
        }
        for (var j = this.texts.length - 1; j >= 0; j--) {
            var tx = this.texts[j]; tx.life -= dt; if (!tx.big) { tx.y -= 30 * dt; }
            if (tx.life <= 0) { this.texts.splice(j, 1); }
        }
    };

    // ---------------------------------------------------------------- drawing

    Game.prototype.resize = function () {
        var dpr = Math.min(window.devicePixelRatio || 1, 2), r = this.canvas.getBoundingClientRect(), cssW = r.width || W;
        this.canvas.width = Math.round(cssW * dpr); this.canvas.height = Math.round(cssW * H / W * dpr);
        this.ratio = this.canvas.width / W;
    };

    function roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
    function hexagon(ctx, x, y, r) {
        ctx.beginPath();
        for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
        ctx.closePath();
    }
    function unitShape(ctx, shape, x, y, r, up) {
        ctx.beginPath();
        if (shape === 'tri') { var d = up ? -1 : 1; ctx.moveTo(x, y + d * r * 1.3); ctx.lineTo(x - r, y - d * r * 0.8); ctx.lineTo(x + r, y - d * r * 0.8); }
        else if (shape === 'dia') { ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r, y); }
        else { ctx.rect(x - r, y - r, r * 2, r * 2); }
        ctx.closePath();
    }

    Game.prototype.draw = function () {
        var ctx = this.ctx, i, self = this;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
        if (backdropReady) {
            ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
            var bs = Math.max(W / BACKDROP.width, (FIELD_B - TOP) / BACKDROP.height), bw = BACKDROP.width * bs, bh = BACKDROP.height * bs;
            ctx.drawImage(BACKDROP, (W - bw) / 2, TOP + (FIELD_B - TOP - bh) / 2, bw, bh);
            ctx.fillStyle = 'rgba(5,6,15,0.45)'; ctx.fillRect(0, TOP, W, FIELD_B - TOP);
        } else {
            var g = ctx.createLinearGradient(0, TOP, 0, FIELD_B);
            g.addColorStop(0, '#1a0820'); g.addColorStop(0.5, '#07081a'); g.addColorStop(1, '#03131a');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(177,77,255,0.10)'; ctx.lineWidth = 1;
            for (var gx = 0; gx <= W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, TOP); ctx.lineTo(gx, FIELD_B); ctx.stroke(); }
            for (var gy = TOP; gy <= FIELD_B; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.moveTo(0, (TOP + FIELD_B) / 2); ctx.lineTo(W, (TOP + FIELD_B) / 2); ctx.stroke(); ctx.setLineDash([]);

        ctx.save();
        if (this.fx.shake > 0 && !this.paused) { ctx.translate((Math.random() - 0.5) * this.fx.mag * 2, (Math.random() - 0.5) * this.fx.mag * 2); }
        //  Crystals.
        this.crystals.forEach(function (c) {
            var col = c.owner ? SIDE[c.owner].color : '#ffdc3c';
            ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.fillStyle = col; ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.moveTo(c.x, c.y - 11); ctx.lineTo(c.x + 7, c.y); ctx.lineTo(c.x, c.y + 11); ctx.lineTo(c.x - 7, c.y); ctx.closePath(); ctx.fill();
            ctx.restore();
            ctx.strokeStyle = c.owner ? SIDE[c.owner].dim : 'rgba(255,220,60,0.25)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(c.x, c.y, CAPTURE_R, 0, Math.PI * 2); ctx.stroke();
            if (c.progress > 0 && c.by) {
                ctx.strokeStyle = SIDE[c.by].color; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(c.x, c.y, CAPTURE_R, -Math.PI / 2, -Math.PI / 2 + c.progress * Math.PI * 2); ctx.stroke();
            }
        });
        //  Cores.
        ['bot', 'you'].forEach(function (side) {
            var c = self.cores[side], col = SIDE[side].color;
            //  A platform like the cover's: an outer ring of light, the hexagon, an inner ring.
            ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 14;
            hexagon(ctx, c.x, c.y, CORE_R + 9); ctx.stroke(); ctx.restore();
            ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(5,6,15,0.9)';
            hexagon(ctx, c.x, c.y, CORE_R); ctx.fill(); ctx.stroke(); ctx.restore();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; hexagon(ctx, c.x, c.y, CORE_R * 0.72); ctx.stroke();
            ctx.fillStyle = col; hexagon(ctx, c.x, c.y, CORE_R * 0.45 * (0.6 + 0.4 * Math.max(0, c.hp) / CORE_HP)); ctx.fill();
            var bw = 70, frac = Math.max(0, c.hp) / CORE_HP, by = side === 'bot' ? c.y + CORE_R + 6 : c.y - CORE_R - 10;
            ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(c.x - bw / 2, by, bw, 4);
            ctx.fillStyle = col; ctx.fillRect(c.x - bw / 2, by, bw * frac, 4);
        });
        //  Units.
        this.units.forEach(function (u) {
            var spec = UNITS[u.kind], col = u.flash > 0 ? '#ffffff' : SIDE[u.side].color;
            //  Its glow on the floor, slightly below, like the cover's reflections.
            ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = SIDE[u.side].color;
            ctx.beginPath(); ctx.ellipse(u.x, u.y + spec.r + 2, spec.r * 1.1, spec.r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            ctx.save(); ctx.shadowColor = SIDE[u.side].color; ctx.shadowBlur = 10; ctx.fillStyle = col;
            unitShape(ctx, spec.shape, u.x, u.y, spec.r, u.side === 'you'); ctx.fill();
            ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1;
            unitShape(ctx, spec.shape, u.x, u.y, spec.r, u.side === 'you'); ctx.stroke(); ctx.restore();
            if (u.side === 'you' && (self.selected === 'all' || self.selected === u.kind) && self.state === 'play') {
                ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(u.x, u.y, spec.r + 4, 0, Math.PI * 2); ctx.stroke();
            }
            if (u.hp < spec.hp) {
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(u.x - 8, u.y - spec.r - 7, 16, 3);
                ctx.fillStyle = SIDE[u.side].color; ctx.fillRect(u.x - 8, u.y - spec.r - 7, 16 * Math.max(0, u.hp) / spec.hp, 3);
            }
        });
        //  Shots.
        ctx.lineWidth = 2;
        this.shots.forEach(function (s) {
            ctx.strokeStyle = SIDE[s.side].color; ctx.beginPath(); ctx.moveTo(s.x, s.y);
            var dx = s.target.x - s.x, dy = s.target.y - s.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
            ctx.lineTo(s.x - dx / d * 8, s.y - dy / d * 8); ctx.stroke();
        });
        if (this.marker) {
            ctx.strokeStyle = 'rgba(255,255,255,' + this.marker.life + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(this.marker.x, this.marker.y, 14 - this.marker.life * 10, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
        for (i = 0; i < this.particles.length; i++) {
            var q = this.particles[i]; ctx.globalAlpha = Math.max(0, Math.min(1, q.life * 2)); ctx.fillStyle = q.color; ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < this.texts.length; i++) {
            var tx = this.texts[i]; ctx.globalAlpha = Math.min(1, tx.life / tx.max * 2);
            this.center(ctx, tx.text, tx.y, tx.big ? 36 : 14, tx.color, true);
        }
        ctx.globalAlpha = 1;
        this.drawHud(ctx);
        this.drawBar(ctx);
        this.drawCoach(ctx);
        if (this.fx.flash > 0) { ctx.fillStyle = this.fx.flashColor; ctx.globalAlpha = Math.min(0.3, this.fx.flash); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
        if (this.state === 'play' && this.battle < 6 && !this.paused) {
            this.center(ctx, t(this.touch ? 'launch.touch' : 'launch.desktop'), FIELD_B - 130, 13, '#e0e0f0');
            this.center(ctx, t('tip.counter'), FIELD_B - 112, 12, '#b0b0c0');
        }
        if (this.state === 'title') { this.drawTitle(ctx); }
        if (this.paused) { this.drawPause(ctx); }
    };

    Game.prototype.center = function (ctx, text, y, size, color, glow) {
        if (window.NeonStage && window.NeonStage.text) { window.NeonStage.text.center(ctx, text, W / 2, y, size, color, glow); return; }      // reads on any stage (neon-stage.js)
        ctx.save(); ctx.font = 'bold ' + size + 'px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
        ctx.fillStyle = color; ctx.fillText(text, W / 2, y); ctx.restore();
    };

    Game.prototype.drawHud = function (ctx) {
        ctx.fillStyle = 'rgba(5,6,15,0.9)'; ctx.fillRect(0, 0, W, TOP);
        ctx.strokeStyle = '#00f0ff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(0, TOP - 0.5); ctx.lineTo(W, TOP - 0.5); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = 'bold 20px Arial, sans-serif'; ctx.fillStyle = '#ffffff';
        ctx.fillText(num(this.score), 12, 18);
        var goal = D && D.target;
        if (goal) { ctx.font = 'bold 11px Arial, sans-serif'; ctx.fillStyle = this.goalPassed ? '#00ff9c' : '#ffdc3c'; ctx.fillText(t('target.hud', { t: num(goal.score) }) + (this.goalPassed ? ' ✓' : ''), 12, 36); }
        ctx.textAlign = 'center'; ctx.font = 'bold 14px Arial, sans-serif'; ctx.fillStyle = '#00f0ff';
        ctx.fillText(this.clock(), W / 2 - 20, 18);
        ctx.font = 'bold 11px Arial, sans-serif'; ctx.fillStyle = '#b0b0c0';
        ctx.fillText('💎 ' + this.owned('you') + ' · ' + this.owned('bot') + '   ' + t('level.' + this.level), W / 2 - 20, 36);
        ctx.textAlign = 'right'; ctx.font = 'bold 15px Arial, sans-serif'; ctx.fillStyle = '#ffdc3c';
        ctx.fillText('⚡ ' + Math.floor(this.energy.you), W - 56, 18);
    };

    Game.prototype.drawBar = function (ctx) {
        ctx.fillStyle = '#05060f'; ctx.fillRect(0, FIELD_B, W, BAR);
        ctx.strokeStyle = '#00f0ff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(0, FIELD_B + 0.5); ctx.lineTo(W, FIELD_B + 0.5); ctx.stroke(); ctx.globalAlpha = 1;
        var self = this, mine = { spark: 0, lancer: 0, bulwark: 0 }, total = 0;
        this.units.forEach(function (u) { if (u.side === 'you') { mine[u.kind]++; total++; } });
        this.barLayout().forEach(function (b) {
            if (b.kind === 'buy') {
                var spec = UNITS[b.unit], can = self.energy.you >= spec.cost && self.state === 'play' && total < CAP;
                ctx.fillStyle = can ? 'rgba(0,240,255,0.14)' : 'rgba(255,255,255,0.04)';
                roundRect(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
                if (!can && self.state === 'play') {                     // how far the energy is from this unit
                    var fr = Math.max(0, Math.min(1, self.energy.you / spec.cost));
                    ctx.save(); roundRect(ctx, b.x, b.y, b.w, b.h, 8); ctx.clip();
                    ctx.fillStyle = 'rgba(255,220,60,0.16)'; ctx.fillRect(b.x, b.y + b.h - 6, b.w * fr, 6); ctx.restore();
                }
                if (can && self.energy.you >= 150 && self.state === 'play') {   // energy piling up: the buttons call
                    ctx.save(); ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 8 + 8 * Math.abs(Math.sin(self.time * 4));
                    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2; roundRect(ctx, b.x, b.y, b.w, b.h, 8); ctx.stroke(); ctx.restore();
                }
                ctx.strokeStyle = can ? '#00f0ff' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = can ? '#00f0ff' : 'rgba(255,255,255,0.35)';
                unitShape(ctx, spec.shape, b.x + 18, b.y + b.h / 2, 7, true); ctx.fill();
                ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = 'bold 13px Arial, sans-serif';
                ctx.fillText(t('u.' + b.unit), b.x + 32, b.y + 17);
                ctx.font = '12px Arial, sans-serif'; ctx.fillStyle = can ? '#ffdc3c' : 'rgba(255,255,255,0.35)';
                ctx.fillText('⚡' + spec.cost, b.x + 32, b.y + 34);
                var waiting = self.queue ? self.queue.filter(function (k) { return k === b.unit; }).length : 0;
                if (waiting) {                                             // queued buys of this unit
                    ctx.fillStyle = '#ffdc3c'; ctx.beginPath(); ctx.arc(b.x + b.w - 12, b.y + 12, 9, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#05060f'; ctx.font = 'bold 11px Arial, sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText('+' + waiting, b.x + b.w - 12, b.y + 12.5);
                }
            } else {
                var on = self.selected === b.unit;
                ctx.fillStyle = on ? '#ff00c8' : 'rgba(255,255,255,0.05)';
                roundRect(ctx, b.x, b.y, b.w, b.h, 18); ctx.fill();
                ctx.strokeStyle = on ? '#ff00c8' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.fillStyle = on ? '#05060f' : '#e0e0f0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 12px Arial, sans-serif';
                var count = b.unit === 'all' ? total : mine[b.unit];
                ctx.fillText(t('u.' + b.unit) + ' ' + count, b.x + b.w / 2, b.y + b.h / 2);
            }
        });
    };

    Game.prototype.drawTitle = function (ctx) {
        //  The cover art behind the title (img/cover.jpg), dimmed; the plain dark veil until it loads.
        if (!(window.NeonStage && window.NeonStage.cover(ctx, 0, TOP, W, FIELD_B - TOP, 0.5))) {
            ctx.fillStyle = 'rgba(5,6,15,0.7)'; ctx.fillRect(0, TOP, W, FIELD_B - TOP);
        }
        //  The game's 3D logo (Blender, img/logo.png); the chrome words until it loads.
        if (!(window.NeonStage && window.NeonStage.text && window.NeonStage.text.logo(ctx, W / 2, 172, 320))) {
            this.center(ctx, 'NEON', 150, 52, '#ff00c8', true);
            this.center(ctx, 'COMMAND', 205, 52, '#00f0ff', true);
        }
        if (D) {
            this.center(ctx, t(D.otherDay() ? 'title.shared' : 'title.daily', { n: D.challengeNumber(), date: I.shortDate(D.today()) }), 262, 16, '#ffffff');
            var goal = D.target;
            if (goal) {
                this.center(ctx, t(goal.by === 'bot' ? 'target.title.bot' : 'target.title.player', { t: num(goal.score) }), 300, 17, '#ffdc3c', true);
                this.center(ctx, t(goal.verified ? 'target.verified' : 'target.declared'), 322, 12, goal.verified ? '#00ff9c' : '#b0b0c0');
            }
            if (this.best || this.streak) { this.center(ctx, t('title.status', { best: num(this.best), streak: this.streak }), 350, 13, '#b0b0c0'); }
        }
        this.center(ctx, t('tip.counter'), 365, 13, '#e0e0f0');
        this.center(ctx, t('level.pick'), 390, 13, '#b0b0c0');
        var self = this;
        this.levelButtons().forEach(function (b) {
            var on = self.level === b.key;
            ctx.fillStyle = on ? '#00f0ff' : 'rgba(5,6,15,0.82)';
            roundRect(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
            ctx.strokeStyle = on ? '#00f0ff' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = on ? '#05060f' : '#e0e0f0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'bold 15px Arial, sans-serif'; ctx.fillText(t('level.' + b.key), b.x + b.w / 2, b.y + 18);
            ctx.font = '11px Arial, sans-serif'; ctx.fillText('×' + LEVELS[b.key].mult + ' ' + t('level.points'), b.x + b.w / 2, b.y + 34);
        });
        if (window.NeonStage && window.NeonStage.text) {
            window.NeonStage.text.plate(ctx, t('level.start', { l: t('level.' + this.level) }), W / 2, 478, 15, '#ffffff', Math.abs(Math.sin(this.time * 3)));
        } else {
            ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(this.time * 3));
            this.center(ctx, t('level.start', { l: t('level.' + this.level) }), 478, 15, '#ffffff', true);
            ctx.globalAlpha = 1;
        }
    };

    Game.prototype.drawPause = function (ctx) {
        ctx.fillStyle = 'rgba(5,6,15,0.6)'; ctx.fillRect(0, TOP, W, FIELD_B - TOP);
        this.center(ctx, t('paused'), 260, 34, '#ffffff', true);
        this.center(ctx, t(this.touch ? 'paused.hint.touch' : 'paused.hint'), 296, 14, '#b0b0c0');
        var b = this.pauseButtons();
        ctx.fillStyle = 'rgba(0,240,255,0.15)'; roundRect(ctx, b.resume.x, b.resume.y, b.resume.w, b.resume.h, 10); ctx.fill();
        ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,0,200,0.12)'; roundRect(ctx, b.surrender.x, b.surrender.y, b.surrender.w, b.surrender.h, 10); ctx.fill();
        ctx.strokeStyle = '#ff00c8'; ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 16px Arial, sans-serif';
        ctx.fillStyle = '#00f0ff'; ctx.fillText(t('resume'), W / 2, b.resume.y + b.resume.h / 2);
        ctx.fillStyle = '#ff00c8'; ctx.fillText(t('surrender'), W / 2, b.surrender.y + b.surrender.h / 2);
    };

    // ---------------------------------------------------------------- the loop

    Game.prototype.frame = function (now) {
        var self = this;
        if (this.last == null) { this.last = now; }
        var elapsed = Math.min((now - this.last) / 1000, 0.1);
        this.last = now;
        if (!this.paused) { this.acc = (this.acc || 0) + elapsed; while (this.acc >= STEP) { this.update(STEP); this.acc -= STEP; } }
        else { this.time += elapsed; }
        this.draw();
        window.requestAnimationFrame(function (n) { self.frame(n); });
    };
    Game.prototype.start = function () {
        var self = this;
        if (window.PortalSDK && window.PortalSDK.on) {
            window.PortalSDK.on('PAUSE', function () { self.pause(); });
            window.PortalSDK.on('RESUME', function () { self.resume(); });
        }
        this.announce();
        window.requestAnimationFrame(function (n) { self.frame(n); });
    };

    window.NeonCommand = { Game: Game, dayPlan: dayPlan, UNITS: UNITS, LEVELS: LEVELS, W: W, H: H, FIELD_B: FIELD_B };
})();
