#!/usr/bin/env node
/*  Writes img/units/<side>-<kind>.svg from js/unit-art.js (the same vectors the game draws). JOHN-429.
    Usage: node tools/unit_svgs.js   (from the repo root) */
'use strict';
var fs = require('fs'), path = require('path');
var A = require(path.join(__dirname, '..', 'js', 'unit-art.js'));
var BOX = { spark: [-58, -62, 116, 128], lancer: [-40, -110, 80, 184], bulwark: [-58, -80, 116, 140] };
var out = path.join(__dirname, '..', 'img', 'units');
fs.mkdirSync(out, { recursive: true });

Object.keys(A.ART).forEach(function (side) {
    Object.keys(A.ART[side]).forEach(function (kind) {
        var b = BOX[kind], glowCol = A.PALETTES[side].main, parts = [];
        A.ART[side][kind].forEach(function (p) {
            var attrs = 'id="' + p.id + '" d="' + p.d + '" fill="' + A.color(side, p.fill) + '"';
            if (p.anim === 'shield') { attrs += ' fill-opacity="0.85"'; }
            if (p.stroke) { attrs += ' stroke="' + A.color(side, p.stroke) + '" stroke-width="1.6" stroke-linejoin="round"'; }
            if (p.anim === 'glow' || p.anim === 'core' || p.anim === 'tip' || p.anim === 'shield' || p.anim === 'flame') { attrs += ' filter="url(#glow)"'; }
            if (p.anim) { attrs += ' data-anim="' + p.anim + '"'; }
            parts.push('  <path ' + attrs + '/>');
            if (p.anim === 'treadL' || p.anim === 'treadR') {          // the track segments
                var x0 = p.anim === 'treadL' ? (side === 'you' ? -47 : -48) : 28, w = side === 'you' ? 19 : 20, segs = [];
                for (var y = -30; y <= 30; y += 6) { segs.push('M' + (x0 + 1.5) + ',' + y + ' L' + (x0 + w - 1.5) + ',' + y); }
                parts.push('  <path d="' + segs.join(' ') + '" stroke="' + A.color(side, 'mid') + '" stroke-width="2.4" stroke-opacity="0.85" fill="none" data-anim="' + p.anim + '-segments"/>');
            }
        });
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + b.join(' ') + '" width="' + b[2] * 4 + '" height="' + b[3] * 4 + '">\n' +
            '  <title>Neon Command · ' + kind + ' (' + side + ')</title>\n' +
            '  <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/>' +
            '<feFlood flood-color="' + glowCol + '" flood-opacity="0.9"/><feComposite in2="b" operator="in" result="g"/>' +
            '<feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>\n' +
            parts.join('\n') + '\n</svg>\n';
        fs.writeFileSync(path.join(out, side + '-' + kind + '.svg'), svg);
        console.log('img/units/' + side + '-' + kind + '.svg');
    });
});
