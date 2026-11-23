#!/usr/bin/env node
/*  Writes img/favicon.svg: your Spark (the vector art in js/unit-art.js) on the game's dark tile with a neon edge. JOHN-429.
    PNG sizes are rendered from it by tools/icons.html (favicon-32, apple-touch-icon 180, icon-192, icon-512). */
'use strict';
var fs = require('fs'), path = require('path');
var A = require(path.join(__dirname, '..', 'js', 'unit-art.js'));
var you = A.PALETTES.you, parts = [];
A.ART.you.spark.forEach(function (p) {
    if (p.anim === 'flame') { return; }
    var a = 'd="' + p.d + '" fill="' + A.color('you', p.fill) + '"';
    if (p.stroke) { a += ' stroke="' + A.color('you', p.stroke) + '" stroke-width="2.4" stroke-linejoin="round"'; }
    if (p.anim === 'glow') { a += ' filter="url(#g)"'; }
    parts.push('    <path ' + a + '/>');
});
var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\n' +
    '  <title>Neon Command</title>\n' +
    '  <defs>\n' +
    '    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0d24"/><stop offset="1" stop-color="#05060f"/></linearGradient>\n' +
    '    <filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/>' +
    '<feFlood flood-color="' + you.main + '"/><feComposite in2="b" operator="in" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>\n' +
    '  </defs>\n' +
    '  <rect x="1.5" y="1.5" width="61" height="61" rx="14" fill="url(#bg)" stroke="#ff00c8" stroke-width="3"/>\n' +
    '  <g transform="translate(32 34) scale(0.52)">\n' + parts.join('\n') + '\n  </g>\n' +
    '</svg>\n';
fs.writeFileSync(path.join(__dirname, '..', 'img', 'favicon.svg'), svg);
console.log('img/favicon.svg');
