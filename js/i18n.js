/*
    Texts for Neon Command in Spanish and English.

    Spanish is the default. English is used when the browser language is English, or with ?lang=en.
    The choice made with ?lang= is remembered in this browser.

    NeonI18n.t('key', {n: 3})  -> text with {n} replaced
    NeonI18n.number(1240)      -> "1.240" or "1,240"
    NeonI18n.shortDate(day)    -> "18 nov" or "Nov 18"
    NeonI18n.apply(root)       -> fills every element that has data-i18n="key"
*/
(function () {
    'use strict';

    var STRINGS = {
        es: {
            'rec.neon-command': 'Estrategia: gánale a mi bot.',
            'surrender': 'Rendirse',
            'sudden': '¡Muerte súbita!',
            'breach.bot': '¡Núcleo roto!',
            'breach.you': '¡Defiende tu núcleo!',
            'dom.you': '¡Dominas el mapa!',
            'dom.bot': '¡El bot domina el mapa!',
            'secondwind': '¡Segundo aire! +150⚡',
            'auto.on': 'Compra automática: sí (B)',
            'auto.off': 'Compra automática: no (B)',
            'auto.pill': 'AUTO',
            'coach.crystal': 'Cada 💎 te da +3⚡ por segundo',
            'resume': 'Seguir',
            'level.start': 'o toca fuera para empezar en {l}',
            'level.points': 'puntos',
            'level.hard': 'Difícil',
            'level.normal': 'Normal',
            'level.easy': 'Fácil',
            'level.pick': 'Elige la dificultad',
            'tip.counter': 'Chispa > Lanza > Escudo > Chispa',
            'coach.few': 'Solo {n}: júntalas antes de atacar',
            'coach.idle': 'Tienes {m}: llévalas juntas a un 💎',
            'coach.push': 'Tienes los 💎: lleva a las {m} a su núcleo',
            'coach.finish': 'Núcleo roto: gasta tus {e}⚡ y remata',
            'coach.assist': 'Fácil: grupos de 4 van solos a los 💎',
            'coach.empty': 'Sin unidades: compra antes de mover',
            'coach.energy': 'Tienes ⚡{e}: compra más unidades',
            'coach.outnumbered': 'Bot {b} vs tú {m}: defiende y junta más',
            'coach.counter': 'El bot usa {k}: {b} le hace doble daño',
            'energy': 'Energía',
            'lose': 'Derrota',
            'win': '¡Victoria!',
            'u.all': 'Todas',
            'u.bulwark': 'Escudo',
            'u.lancer': 'Lanza',
            'u.spark': 'Chispa',
            'rec.neon-stack': 'Un toque: apila la torre del día.',
            'share.line.lose': 'El bot ({d}) me ganó a los {w} · {s} pts',
            'share.line.win': 'Le gané al bot ({d}) en {w} · {s} pts',
            'rec.neon-bricks': 'Rompe ladrillos: un muro nuevo cada día.',
            'page.title': 'Neon Command: reto diario',
            'title.start.touch': 'Toca para empezar',
            'title.start.desktop': 'Pulsa Espacio o haz clic para empezar',
            'title.daily': 'Batalla del día #{n} · {date}',
            'title.shared': 'Batalla compartida #{n} · {date}',
            'title.status': 'Mejor de hoy: {best} · Racha: {streak}',
            'title.more': 'Más juegos en {host}',
            'info.today': 'jugar la batalla de hoy',
            'hud.wall': '{t}',
            'launch.touch': 'Compra unidades abajo y toca el mapa para moverlas',
            'launch.desktop': 'Compra unidades abajo y haz clic en el mapa para moverlas',
            'wall.clear': '¡Perfecto!',
            'wall.bonus': '+{p}',
            'power.wide': 'Bloque dorado ×2',
            'power.multi': '¡Racha!',
            'power.slow': 'Crece el bloque',
            'paused': 'Pausa',
            'paused.hint': 'Esc o P para seguir',
            'paused.hint.touch': 'Toca para seguir',
            'pad.pause': 'Pausa',
            'over.title': 'Batalla #{n} · {date}',
            'over.points': 'puntos',
            'over.meta': 'Victoria en {w} · ⚔️ {k} derribadas · {c} unidades',
            'over.meta.plain': 'Derrota a los {w} · ⚔️ {k} derribadas · {c} unidades',
            'over.best': 'Mejor de hoy: {best}',
            'over.newbest': '¡Nuevo mejor de hoy!',
            'over.streak.one': 'Racha: 1 día',
            'over.streak.many': 'Racha: {n} días',
            'over.share': 'Compartir resultado',
            'over.again': 'Jugar de nuevo',
            'over.whatsapp': 'Enviar por WhatsApp',
            'over.copy': 'Copiar texto',
            'over.copied': '¡Copiado!',
            'over.try': 'Prueba también',
            'over.more': 'Más juegos en {host}',
            'share.head': 'Neon Command · Batalla #{n} ({date})',
            'share.line': '{s} pts · piso {w}',
            'share.streak': 'racha {n}',
            'share.dare': '¿Me superas?',
            'share.dare.score': 'Te reto a superar mis {s}.',
            'target.title.bot': 'Meta: superar los {t} del bot',
            'target.title.player': 'Meta: superar {t} puntos',
            'target.verified': 'puntaje verificado',
            'target.declared': 'puntaje declarado por quien te retó',
            'target.hud': 'Meta {t}',
            'target.passed': '¡Superaste los {t}!',
            'over.win': '¡Ganaste por {n}!',
            'over.tie': 'Empate a {t}',
            'over.lose': 'Te faltaron {n}',
            'joke.win.bot.0': 'Humanos 1, máquinas 0.',
            'joke.win.bot.1': 'El bot pide revancha. Que espere.',
            'joke.win.bot.2': 'Ni entrenado me gana.',
            'joke.tie.bot.0': 'Empataste con un bot. No sé qué dice eso de ti.',
            'joke.tie.bot.1': 'Mismo puntaje que la máquina. Sospechoso.',
            'joke.tie.bot.2': 'Empate técnico. Nadie celebra.',
            'joke.lose.bot.0': 'El bot ni siquiera se esforzó.',
            'joke.lose.bot.1': 'La máquina sigue invicta. Por ahora.',
            'joke.lose.bot.2': 'Te ganó un programa de unas pocas líneas.',
            'joke.win.player.0': 'Avísale. Con cariño.',
            'joke.win.player.1': 'Que te devuelva el reto.',
            'joke.win.player.2': 'Eso no se queda así, seguro.',
            'joke.tie.player.0': 'Empate exacto. Eso casi nunca pasa.',
            'joke.tie.player.1': 'Alguien tiene que desempatar.',
            'joke.tie.player.2': 'Mismo puntaje. Qué coincidencia.',
            'joke.lose.player.0': 'Tan cerca. O no tanto.',
            'joke.lose.player.1': 'Una más y ya. Seguro.',
            'joke.lose.player.2': 'No le digas a nadie.',
            'share.win.bot': 'Le gané al bot por {n} 💪 (él hizo {t})',
            'share.tie.bot': 'Empaté a {t} con el bot 🤝',
            'share.lose.bot': 'Me faltaron {n} para los {t} del bot 😅',
            'share.win.player': 'Superé el reto de {t} por {n} 💪',
            'share.tie.player': 'Empaté el reto: {t} 🤝',
            'share.lose.player': 'Me faltaron {n} para el reto de {t} 😅',
            'info.desktop': 'Compra Chispas, Lanzas y Escudos abajo; elige un grupo y haz clic en el mapa para mandarlo. Cada cristal te da energía; destruye el núcleo del bot. Teclas: 1 2 3 compran · Q W E R eligen grupo · A ataca su núcleo · S toma un cristal · D vuelve a casa · B compra sola · Esc o P pausa. Cada día hay un mapa y un bot nuevos.',
            'info.touch': 'Compra unidades abajo, elige un grupo y toca el mapa para mandarlo. Captura cristales y destruye el núcleo del bot. Cada día hay un mapa y un bot nuevos.',
            'info.mute': 'silenciar',
            'info.unmute': 'activar sonido',
            'info.source': 'código en GitHub',
            'info.portal': 'más juegos',
            'rec.neon-raiders': 'Arcade de naves: supera al bot.',
            'rec.neon-highway': 'Carrera synthwave: mejora tu vuelta más rápida.'
        },
        en: {
            'rec.neon-command': 'Strategy: beat my bot.',
            'surrender': 'Give up',
            'sudden': 'Sudden death!',
            'breach.bot': 'Core broken!',
            'breach.you': 'Defend your core!',
            'dom.you': 'You rule the map!',
            'dom.bot': 'The bot rules the map!',
            'secondwind': 'Second wind! +150⚡',
            'auto.on': 'Auto-buy: on (B)',
            'auto.off': 'Auto-buy: off (B)',
            'auto.pill': 'AUTO',
            'coach.crystal': 'Each 💎 gives you +3⚡ per second',
            'resume': 'Continue',
            'level.start': 'or tap elsewhere to start on {l}',
            'level.points': 'points',
            'level.hard': 'Hard',
            'level.normal': 'Normal',
            'level.easy': 'Easy',
            'level.pick': 'Pick the difficulty',
            'tip.counter': 'Spark > Lancer > Bulwark > Spark',
            'coach.few': 'Only {n}: group up before attacking',
            'coach.idle': 'You have {m}: take them to a 💎 together',
            'coach.push': 'You hold the 💎: take all {m} to its core',
            'coach.finish': 'Core broken: spend your {e}⚡ and finish it',
            'coach.assist': 'Easy: groups of 4 go to the 💎 by themselves',
            'coach.empty': 'No units: buy before you move',
            'coach.energy': 'You have ⚡{e}: buy more units',
            'coach.outnumbered': 'Bot {b} vs you {m}: defend, group up',
            'coach.counter': 'Bot uses {k}: {b} deals double damage',
            'energy': 'Energy',
            'lose': 'Defeat',
            'win': 'Victory!',
            'u.all': 'All',
            'u.bulwark': 'Bulwark',
            'u.lancer': 'Lancer',
            'u.spark': 'Spark',
            'rec.neon-stack': 'One tap: stack the tower of the day.',
            'share.line.lose': 'The bot ({d}) beat me at {w} · {s} pts',
            'share.line.win': 'I beat the bot ({d}) in {w} · {s} pts',
            'rec.neon-bricks': 'Brick breaker: a new wall every day.',
            'page.title': 'Neon Command: daily challenge',
            'title.start.touch': 'Tap to start',
            'title.start.desktop': 'Press Space or click to start',
            'title.daily': 'Battle of the day #{n} · {date}',
            'title.shared': 'Shared battle #{n} · {date}',
            'title.status': 'Best today: {best} · Streak: {streak}',
            'title.more': 'More games at {host}',
            'info.today': "play today's battle",
            'hud.wall': '{t}',
            'launch.touch': 'Buy units below and tap the map to move them',
            'launch.desktop': 'Buy units below and click the map to move them',
            'wall.clear': 'Perfect!',
            'wall.bonus': '+{p}',
            'power.wide': 'Golden block ×2',
            'power.multi': 'Streak!',
            'power.slow': 'The block grows',
            'paused': 'Paused',
            'paused.hint': 'Esc or P to continue',
            'paused.hint.touch': 'Tap to continue',
            'pad.pause': 'Pause',
            'over.title': 'Battle #{n} · {date}',
            'over.points': 'points',
            'over.meta': 'Won in {w} · ⚔️ {k} destroyed · {c} units',
            'over.meta.plain': 'Lost at {w} · ⚔️ {k} destroyed · {c} units',
            'over.best': 'Best today: {best}',
            'over.newbest': 'New best today!',
            'over.streak.one': 'Streak: 1 day',
            'over.streak.many': 'Streak: {n} days',
            'over.share': 'Share result',
            'over.again': 'Play again',
            'over.whatsapp': 'Send on WhatsApp',
            'over.copy': 'Copy text',
            'over.copied': 'Copied!',
            'over.try': 'Try this next',
            'over.more': 'More games at {host}',
            'share.head': 'Neon Command · Battle #{n} ({date})',
            'share.line': '{s} pts · floor {w}',
            'share.streak': 'streak {n}',
            'share.dare': 'Can you beat me?',
            'share.dare.score': 'I dare you to beat my {s}.',
            'target.title.bot': "Goal: beat the bot's {t}",
            'target.title.player': 'Goal: beat {t} points',
            'target.verified': 'verified score',
            'target.declared': 'score declared by your challenger',
            'target.hud': 'Goal {t}',
            'target.passed': 'You passed {t}!',
            'over.win': 'You won by {n}!',
            'over.tie': 'Tied at {t}',
            'over.lose': '{n} short',
            'joke.win.bot.0': 'Humans 1, machines 0.',
            'joke.win.bot.1': 'The bot wants a rematch. Let it wait.',
            'joke.win.bot.2': 'Not even with training.',
            'joke.tie.bot.0': 'You tied with a bot. Not sure what that says about you.',
            'joke.tie.bot.1': 'Same score as the machine. Suspicious.',
            'joke.tie.bot.2': 'A technical draw. Nobody cheers.',
            'joke.lose.bot.0': 'The bot was not even trying.',
            'joke.lose.bot.1': 'The machine is still unbeaten. For now.',
            'joke.lose.bot.2': 'A program a few lines long beat you.',
            'joke.win.player.0': 'Let them know. Gently.',
            'joke.win.player.1': 'Now it is their turn.',
            'joke.win.player.2': 'This will not end here.',
            'joke.tie.player.0': 'An exact tie. That almost never happens.',
            'joke.tie.player.1': 'Somebody has to break it.',
            'joke.tie.player.2': 'Same score. What a coincidence.',
            'joke.lose.player.0': 'So close. Or not really.',
            'joke.lose.player.1': 'One more try. Just one.',
            'joke.lose.player.2': 'Tell no one.',
            'share.win.bot': 'I beat the bot by {n} 💪 (it scored {t})',
            'share.tie.bot': 'I tied the bot at {t} 🤝',
            'share.lose.bot': "I was {n} short of the bot's {t} 😅",
            'share.win.player': 'I beat the {t} challenge by {n} 💪',
            'share.tie.player': 'I tied the challenge: {t} 🤝',
            'share.lose.player': 'I was {n} short of the {t} challenge 😅',
            'info.desktop': "Buy Sparks, Lancers and Bulwarks below; pick a group and click the map to send it. Every crystal gives you energy; destroy the bot's core. Keys: 1 2 3 buy · Q W E R pick a group · A attacks its core · S takes a crystal · D comes home · B auto-buys · Esc or P pauses. Every day has a new map and a new bot.",
            'info.touch': "Buy units below, pick a group and tap the map to send it. Capture crystals and destroy the bot's core. Every day has a new map and a new bot.",
            'info.mute': 'mute',
            'info.unmute': 'unmute',
            'info.source': 'source on GitHub',
            'info.portal': 'more games',
            'rec.neon-raiders': 'Space shooter: beat the bot.',
            'rec.neon-highway': 'Synthwave racer: beat your fastest lap.'
        }
    };

    function pickLang() {
        var forced = (window.location.search.match(/[?&]lang=(es|en)\b/) || [])[1];
        try {
            if (forced) { window.localStorage.setItem('nc.lang', forced); return forced; }
            var saved = window.localStorage.getItem('nc.lang');
            if (saved === 'es' || saved === 'en') { return saved; }
        } catch (err) { if (forced) { return forced; } }
        var nav = (navigator.language || 'es').toLowerCase();
        return nav.indexOf('en') === 0 ? 'en' : 'es';
    }

    var lang = pickLang();

    function t(key, vars) {
        var text = STRINGS[lang][key];
        if (text === undefined) { text = STRINGS.es[key]; }
        if (text === undefined) { return key; }
        return text.replace(/\{(\w+)\}/g, function (m, name) {
            return vars && vars[name] !== undefined ? vars[name] : m;
        });
    }

    function number(n) {
        try { return Number(n).toLocaleString(lang === 'es' ? 'es-EC' : 'en-US'); } catch (err) { return String(n); }
    }

    //  Short date such as "18 nov" or "Nov 18" from a YYYY-MM-DD key.
    function shortDate(dayKey) {
        var p = dayKey.split('-');
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12);
        try { return d.toLocaleDateString(lang === 'es' ? 'es-EC' : 'en-US', { day: 'numeric', month: 'short' }).replace('.', ''); }
        catch (err) { return dayKey; }
    }

    function apply(root) {
        var nodes = (root || document).querySelectorAll('[data-i18n]');
        Array.prototype.forEach.call(nodes, function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
        document.documentElement.lang = lang;
        document.title = t('page.title');
    }

    window.NeonI18n = { lang: lang, t: t, number: number, shortDate: shortDate, apply: apply };
})();
