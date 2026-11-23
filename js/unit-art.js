/*
    Neon Command unit art (JOHN-429): vector parts traced from the approved references (A2 your units, B1 the bot's,
    C2 the animation states). One source for the game and for the SVG files in img/units/ (tools/unit_svgs.js).

    Local frame: the unit points up (forward is -y), centred on its middle, about 100 units across.
    Every part names a palette slot for its fill (and optionally its stroke) and, when it moves on its own, an anim:
      flame   the engine flame: stretches while moving, flickers
      tip     the lance tip: glows as it charges between shots
      shield  the bulwark shield: slams forward when it hits
      treadL / treadR  the tracks: their segments roll as it moves
      core    the bright heart of the unit
      glow    the outer silhouette: carries the neon glow
*/
(function (root) {
    'use strict';

    var PALETTES = {
        you: { main: '#00f0ff', light: '#c8fdff', mid: '#16b8e8', dark: '#0b5f92', deep: '#062640', line: '#e8feff' },
        bot: { main: '#ff00c8', light: '#ffc4f1', mid: '#d40aa9', dark: '#6a1d93', deep: '#2b0b42', line: '#ffe6f8' },
        gold: '#ffdc3c', white: '#ffffff'
    };

    //  Scale from art units to the unit's drawn radius R (pixels): s = R * SCALE[kind].
    var SCALE = { spark: 0.0228, lancer: 0.0253, bulwark: 0.025 };

    function mirror(d) {                                   // the right half of a symmetric path, from its left half
        return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, function (m, x, y) { return String(-parseFloat(x)) + ',' + y; });
    }

    var ART = {
        you: {
            spark: [
                { id: 'flame', d: 'M-5,30 L0,54 L5,30 Z', fill: 'light', anim: 'flame', origin: [0, 30] },
                { id: 'wings', d: 'M0,-46 L13,-16 L42,22 L44,30 L18,24 L9,32 L-9,32 L-18,24 L-44,30 L-42,22 L-13,-16 Z', fill: 'mid', stroke: 'line', anim: 'glow' },
                { id: 'panelL', d: 'M-13,-16 L-7,20 L-18,24 L-42,24 Z', fill: 'dark' },
                { id: 'panelR', d: mirror('M-13,-16 L-7,20 L-18,24 L-42,24 Z'), fill: 'dark' },
                { id: 'edgeL', d: 'M-13,-16 L-42,22 L-39,20 L-14,-11 Z', fill: 'light' },
                { id: 'edgeR', d: mirror('M-13,-16 L-42,22 L-39,20 L-14,-11 Z'), fill: 'light' },
                { id: 'body', d: 'M0,-44 L8,-10 L6,24 L0,30 L-6,24 L-8,-10 Z', fill: 'main' },
                { id: 'core', d: 'M0,-26 L4,-6 L0,10 L-4,-6 Z', fill: 'white', anim: 'core' },
                { id: 'nozzle', d: 'M-6,26 L6,26 L5,32 L-5,32 Z', fill: 'deep' }
            ],
            lancer: [
                { id: 'flame', d: 'M-4,42 L0,64 L4,42 Z', fill: 'light', anim: 'flame', origin: [0, 42] },
                { id: 'shaft', d: 'M-2.2,-36 L2.2,-36 L2.2,-84 L-2.2,-84 Z', fill: 'light', stroke: 'main' },
                { id: 'collar', d: 'M-3.5,-60 L3.5,-60 L3.5,-55 L-3.5,-55 Z', fill: 'gold' },
                { id: 'tip', d: 'M0,-100 L4.5,-86 L0,-81 L-4.5,-86 Z', fill: 'gold', anim: 'tip' },
                { id: 'blades', d: 'M0,-46 L22,-8 L17,2 L10,34 L0,42 L-10,34 L-17,2 L-22,-8 Z', fill: 'dark', stroke: 'line', anim: 'glow' },
                { id: 'hull', d: 'M0,-42 L13,-8 L8,32 L0,38 L-8,32 L-13,-8 Z', fill: 'main' },
                { id: 'facet', d: 'M0,-36 L7,-13 L0,6 L-7,-13 Z', fill: 'light' },
                { id: 'core', d: 'M0,-6 L3,4 L0,16 L-3,4 Z', fill: 'white', anim: 'core' },
                { id: 'nozzle', d: 'M-5,37 L5,37 L4,43 L-4,43 Z', fill: 'deep' }
            ],
            bulwark: [
                { id: 'treadL', d: 'M-47,-34 L-28,-34 L-28,36 L-47,36 Z', fill: 'deep', stroke: 'mid', anim: 'treadL' },
                { id: 'treadR', d: 'M28,-34 L47,-34 L47,36 L28,36 Z', fill: 'deep', stroke: 'mid', anim: 'treadR' },
                { id: 'hull', d: 'M-24,-32 L24,-32 L28,-22 L28,28 L20,36 L-20,36 L-28,28 L-28,-22 Z', fill: 'dark', stroke: 'line', anim: 'glow' },
                { id: 'nose', d: 'M-9,-42 L9,-42 L11,-30 L-11,-30 Z', fill: 'main' },
                { id: 'plate', d: 'M-16,-26 L16,-26 L20,-16 L20,14 L12,24 L-12,24 L-20,14 L-20,-16 Z', fill: 'main' },
                { id: 'turret', d: 'M-9,-20 L9,-20 L11,-6 L7,8 L-7,8 L-11,-6 Z', fill: 'mid' },
                { id: 'slits', d: 'M-15,-10 L-13,-10 L-13,6 L-15,6 Z M13,-10 L15,-10 L15,6 L13,6 Z', fill: 'light' },
                { id: 'core', d: 'M-2.5,-15 L2.5,-15 L2.5,2 L-2.5,2 Z', fill: 'white', anim: 'core' },
                { id: 'shield', d: 'M-44,-34 Q0,-64 44,-34 L40,-26 Q0,-52 -40,-26 Z', fill: 'light', stroke: 'white', anim: 'shield' }
            ]
        },
        bot: {
            spark: [
                { id: 'flame', d: 'M-5,28 L0,52 L5,28 Z', fill: 'light', anim: 'flame', origin: [0, 28] },
                { id: 'wings', d: 'M0,-48 L10,-14 L30,-4 L48,-16 L40,14 L22,18 L10,34 L0,28 L-10,34 L-22,18 L-40,14 L-48,-16 L-30,-4 L-10,-14 Z', fill: 'mid', stroke: 'line', anim: 'glow' },
                { id: 'panelL', d: 'M-10,-14 L-30,-4 L-40,14 L-22,18 L-8,8 Z', fill: 'main' },
                { id: 'panelR', d: mirror('M-10,-14 L-30,-4 L-40,14 L-22,18 L-8,8 Z'), fill: 'main' },
                { id: 'edgeL', d: 'M-30,-4 L-48,-16 L-44,-6 L-32,0 Z', fill: 'light' },
                { id: 'edgeR', d: mirror('M-30,-4 L-48,-16 L-44,-6 L-32,0 Z'), fill: 'light' },
                { id: 'finL', d: 'M-14,20 L-19,38 L-9,27 Z', fill: 'light' },
                { id: 'finR', d: mirror('M-14,20 L-19,38 L-9,27 Z'), fill: 'light' },
                { id: 'body', d: 'M0,-46 L9,-8 L5,26 L0,30 L-5,26 L-9,-8 Z', fill: 'mid' },
                { id: 'core', d: 'M0,-24 L5,-4 L0,14 L-5,-4 Z', fill: 'white', anim: 'core' }
            ],
            lancer: [
                { id: 'flame', d: 'M-4,40 L0,62 L4,40 Z', fill: 'light', anim: 'flame', origin: [0, 40] },
                { id: 'shaft', d: 'M-2.8,-38 L2.8,-38 L2.8,-84 L-2.8,-84 Z', fill: 'dark', stroke: 'main' },
                { id: 'collar', d: 'M-4,-64 L4,-64 L4,-60 L-4,-60 Z M-4,-54 L4,-54 L4,-50 L-4,-50 Z', fill: 'gold' },
                { id: 'tip', d: 'M0,-102 L5,-88 L0,-82 L-5,-88 Z', fill: 'gold', anim: 'tip' },
                { id: 'blades', d: 'M0,-46 L28,-10 L20,0 L12,28 L20,46 L5,36 L0,44 L-5,36 L-20,46 L-12,28 L-20,0 L-28,-10 Z', fill: 'mid', stroke: 'line', anim: 'glow' },
                { id: 'hull', d: 'M0,-42 L15,-10 L9,28 L0,36 L-9,28 L-15,-10 Z', fill: 'main' },
                { id: 'facet', d: 'M0,-34 L8,-12 L0,8 L-8,-12 Z', fill: 'light' },
                { id: 'core', d: 'M0,-4 L3,4 L0,16 L-3,4 Z', fill: 'white', anim: 'core' }
            ],
            bulwark: [
                { id: 'treadL', d: 'M-48,-32 L-28,-32 L-28,36 L-48,36 Z', fill: 'deep', stroke: 'mid', anim: 'treadL' },
                { id: 'treadR', d: 'M28,-32 L48,-32 L48,36 L28,36 Z', fill: 'deep', stroke: 'mid', anim: 'treadR' },
                { id: 'hull', d: 'M-24,-32 L24,-32 L28,-22 L28,28 L27,50 L15,36 L-15,36 L-27,50 L-28,28 L-28,-22 Z', fill: 'dark', stroke: 'line', anim: 'glow' },
                { id: 'plate', d: 'M-16,-28 L16,-28 L20,-18 L20,14 L12,24 L-12,24 L-20,14 L-20,-18 Z', fill: 'main' },
                { id: 'turret', d: 'M-9,-22 L9,-22 L12,-8 L8,10 L-8,10 L-12,-8 Z', fill: 'dark' },
                { id: 'slits', d: 'M-15,-12 L-13,-12 L-13,6 L-15,6 Z M13,-12 L15,-12 L15,6 L13,6 Z', fill: 'light' },
                { id: 'core', d: 'M-2.5,-16 L2.5,-16 L2.5,2 L-2.5,2 Z', fill: 'white', anim: 'core' },
                { id: 'shield', d: 'M-46,-30 L-40,-40 Q0,-66 40,-40 L46,-30 L40,-26 Q0,-52 -40,-26 Z', fill: 'light', stroke: 'white', anim: 'shield' }
            ]
        }
    };

    function color(side, key) {
        if (key === 'gold' || key === 'white') { return PALETTES[key]; }
        return PALETTES[side][key];
    }

    var api = { PALETTES: PALETTES, ART: ART, SCALE: SCALE, color: color };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; } else { root.NeonUnitArt = api; }
})(this);
