#!/usr/bin/env node
// Pre-render $...$ and $$...$$ in an HTML fragment with KaTeX (stdin -> stdout).
// Uses the same macros as the browser (shell/macros.json) so colour classes match.
const fs = require('fs'), path = require('path');
const katex = require(path.join(__dirname, '..', 'vendor', 'katex', 'katex.min.js'));
const macros = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'shell', 'macros.json'), 'utf8'));
const opt = { macros, trust: (c) => c.command === '\\htmlClass', strict: false, throwOnError: false, output: 'htmlAndMathml' };
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
let html = fs.readFileSync(0, 'utf8');
let n = 0;
html = html.replace(/\$\$([\s\S]+?)\$\$/g, (m, t) => { n++; return katex.renderToString(decode(t), Object.assign({ displayMode: true }, opt)); });
html = html.replace(/\$([^$\n][^$]*?)\$/g, (m, t) => { n++; return katex.renderToString(decode(t), Object.assign({ displayMode: false }, opt)); });
process.stdout.write(html);
process.stderr.write(n + ' math\n');
