#!/usr/bin/env node
/* `npm run lint:i18n`: find UI text written straight into the source instead of
   being read from the catalog (src/lib/i18n/). A heuristic, so it errs towards
   saying too much; what it should never say is listed in scripts/i18n-allow.txt.

   It reads src/**\/*.{svelte,ts,astro} and reports, as `file:line: text`:
   (a) text in .svelte/.astro markup — outside <script>, <style>, comments and
       {…} expressions — holding two Latin letters in a row;
   (b) the value of aria-label, title, placeholder, alt, label or
       aria-description written as a quoted string rather than an expression;
   (c) in .ts files, script blocks, Astro frontmatter and markup expressions
       (but never {@html …}), a string literal shaped like a sentence — a
       capitalised word followed by a space and a lowercase letter, or by
       punctuation — or one given to a field such as label: or title:;
   (d) a string literal holding HTML (fragment.ts and the other build-time
       writers): its text and its attributes are read as (a) and (b) read
       markup, so `<h2>Section summary</h2>` is found; and markup written
       inside an Astro expression ({cond && <p>Text</p>}) is read as markup.
   Svelte blocks ({#if}, {:else}, {/each}, {#snippet name(args)}, {@const},
   {@render}) are expressions; {@html …} is never read, nor are <style> and
   comments, and an attribute may run over several lines.
   It skips src/lib/i18n/, *.worker.ts, *.d.ts, and any line that mentions
   console., throw new Error or new Error(. Exit code 1 when a finding is left.
   `node scripts/i18n-lint.mjs src/components/views` lints only what it names.
   --summary prints the count of findings per directory (two levels under src/)
   instead of the findings. --unused instead lists every key of the English
   catalog that no file under src/ outside src/lib/i18n/ names (a key built
   as `area.thing.${x}` counts every key under that prefix as named), and
   exits 1 when one is left. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const ALLOW_FILE = path.join(ROOT, 'scripts', 'i18n-allow.txt');

const SKIP_DIRS = [path.join('src', 'lib', 'i18n') + path.sep];
const SKIP_FILE = /(\.worker\.ts|\.d\.ts)$/;
const SKIP_LINE = /console\.|throw new Error|new Error\(/;
const ATTRS = new Set(['aria-label', 'title', 'placeholder', 'alt', 'label', 'aria-description']);
const SENTENCE = /^[A-Z][a-z]+( [a-z…]|[.,:;!?…])/;
const FIELD = /(?:\b(?:label|title|text|placeholder|hint|message|detail|description|tooltip|ariaLabel|aria)\s*:\s*)$/;
const WORD = /[A-Za-z]{2}/;

const allow = fs.existsSync(ALLOW_FILE)
  ? fs.readFileSync(ALLOW_FILE, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => new RegExp(l))
  : [];

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : /\.(svelte|ts|astro)$/.test(e.name) ? [p] : [];
});

/* ---------- positions ---------- */

const lineStarts = (s) => { const out = [0]; for (let i = 0; i < s.length; i++) if (s[i] === '\n') out.push(i + 1); return out; };
const lineAt = (starts, offset) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= offset) lo = mid; else hi = mid - 1; } return lo + 1; };

/* ---------- script: string literals ---------- */

/* Where a `/` starts a regular expression rather than a division. */
const REGEX_BEFORE = /[(,=:[!&|?{};+\-*%<>~^]$|\b(?:return|typeof|case|do|else|in|of|void|yield|await)$/;

/* An escape at i, as [what it stands for, its length]. */
const unescape = (src, i) => {
  const c = src[i + 1] ?? '';
  const u = /^u([0-9a-fA-F]{4})/.exec(src.slice(i + 1, i + 6));
  if (u) return [String.fromCharCode(parseInt(u[1], 16)), 6];
  return [c === 'n' || c === 't' || c === 'r' ? ' ' : c, 2];
};

/* Every string literal of a stretch of script: [offset, text, before] where
   before is the code just ahead of it, and a template literal's ${…} parts
   read as {}. Comments and regular expressions are stepped over. */
const literals = (src, from = 0, to = src.length) => {
  const out = [];
  let i = from, last = '';   /* the code read since the last literal, for REGEX_BEFORE and FIELD */
  const push = (start, text) => { out.push([start, text, last.slice(-40)]); last = ''; };
  const readString = (q) => {
    const start = i; let text = ''; i++;
    while (i < to && src[i] !== q) {
      if (src[i] === '\\') { const [t, n] = unescape(src, i); text += t; i += n; continue; }
      if (src[i] === '\n') break;
      text += src[i++];
    }
    i++;
    push(start, text);
  };
  const readTemplate = () => {
    const start = i; let text = ''; i++;
    while (i < to && src[i] !== '`') {
      if (src[i] === '\\') { const [t, n] = unescape(src, i); text += t; i += n; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        let depth = 1; const inner = i + 2; i += 2;
        while (i < to && depth > 0) {
          const c = src[i];
          if (c === "'" || c === '"') { const keep = last; readString(c); last = keep; continue; }
          if (c === '`') { const keep = last; readTemplate(); last = keep; continue; }
          if (c === '{') depth++;
          else if (c === '}') depth--;
          i++;
        }
        text += '{}';
        continue;
      }
      text += src[i++];
    }
    i++;
    push(start, text);
  };
  while (i < to) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < to && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const end = src.indexOf('*/', i + 2); i = end < 0 ? to : end + 2; continue; }
    if (c === "'" || c === '"') { readString(c); continue; }
    if (c === '`') { readTemplate(); continue; }
    if (c === '/' && REGEX_BEFORE.test(last.trimEnd())) {
      i++; let cls = false;
      while (i < to && src[i] !== '\n') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false;
        else if (src[i] === '/' && !cls) break;
        i++;
      }
      i++; last = 'x';
      continue;
    }
    last += c; if (last.length > 200) last = last.slice(-100);
    i++;
  }
  return out;
};

/* A zod field's description is the content format's documentation, not UI. */
const DOCS = /\.describe\(\s*$/;
/* A string literal type: type Mode = 'A b' | 'C d'. A single | is a union, || is not. */
const TYPE = /(?:(?:^|[^|])\|\s*|\btype\s+\w+(?:<[^>]*>)?\s*=\s*)$/;
/* A literal that writes HTML: an element closed in it, </p> or <br/>. A message
   that only names a tag ("is named by no <span data-ref>") writes none. */
const HTML_TAG = /<\/[a-z][\w-]*>|<[a-z][\w-]*\b[^<>]*\/>/;
const htmlFindings = (offset, text, starts) => {
  const line = lineAt(starts, offset);
  return markupFindings(text, lineStarts(text), 0, text.length).map((f) => ({ line: line + f.line - 1, text: f.text }));
};
const scriptFindings = (src, starts, from, to) => literals(src, from, to)
  .filter(([, , before]) => !DOCS.test(before) && !TYPE.test(before))
  .flatMap(([offset, text, before]) => [
    ...(SENTENCE.test(text) || (FIELD.test(before) && /^[A-Z][a-z]/.test(text) && !/^[A-Z][a-z]+[A-Z]/.test(text)) ? [{ line: lineAt(starts, offset), text }] : []),
    ...(HTML_TAG.test(text) ? htmlFindings(offset, text, starts) : []),
  ]);

/* ---------- markup ---------- */

/* The index just past the } that closes the { at `open`, stepping over strings. */
const pastExpression = (src, open) => {
  let depth = 0, i = open;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      const q = c; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
      i++; continue;
    }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i + 1;
    i++;
  }
  return src.length;
};

/* Markup written inside an expression, as Astro allows: {nav.prev && <link …/>},
   {items.map((i) => <li>{i}</li>)}. A tag counts when the code before it ends
   in an operator that starts a value, so a comparison a < b is never one.
   Returns [start, end) ranges, end just past the element. */
const JSX_BEFORE = /(?:[(?:,[=]|&&|\|\||=>|\breturn)\s*$/;
const tagEnd = (src, i, to) => {   /* i at '<'; the index just past the '>' that closes this tag, and whether it closed itself */
  i += 1;
  while (i < to) {
    const c = src[i];
    if (c === '{') { i = pastExpression(src, i); continue; }
    if (c === '"' || c === "'") { const end = src.indexOf(c, i + 1); i = end < 0 ? to : end + 1; continue; }
    if (c === '>') return [i + 1, src[i - 1] === '/'];
    i++;
  }
  return [to, true];
};
const jsxRanges = (src, from, to) => {
  const out = [];
  for (let i = from; i < to; i++) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') { const q = c; i++; while (i < to && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
    if (c !== '<' || !/[A-Za-z]/.test(src[i + 1] ?? '') || !JSX_BEFORE.test(src.slice(Math.max(from, i - 12), i))) continue;
    const name = /^<([A-Za-z][\w:.-]*)/.exec(src.slice(i, i + 64))[1];
    let [end, self] = tagEnd(src, i, to), depth = self ? 0 : 1;
    while (depth > 0 && end < to) {
      const next = src.indexOf('<', end);
      if (next < 0 || next >= to) { end = to; break; }
      if (src.startsWith(`</${name}`, next)) { depth--; end = src.indexOf('>', next) + 1 || to; continue; }
      if (src.startsWith(`<${name}`, next) && /[\s/>]/.test(src[next + name.length + 1] ?? '')) { const [e, s2] = tagEnd(src, next, to); if (!s2) depth++; end = e; continue; }
      end = next + 1;
    }
    out.push([i, end]);
    i = end - 1;
  }
  return out;
};
/* An expression's findings: its markup read as markup, the rest as script. */
const expressionFindings = (src, starts, from, to) => {
  const out = [];
  let at = from;
  for (const [a, b] of jsxRanges(src, from, to)) {
    out.push(...scriptFindings(src, starts, at, a), ...markupFindings(src, starts, a, b));
    at = b;
  }
  out.push(...scriptFindings(src, starts, at, to));
  return out;
};

const ENTITY = /&[#\w]+;/g;
const markupFindings = (src, starts, from, to) => {
  const out = [];
  let text = '', textAt = -1;
  const flush = () => {
    const clean = text.replace(ENTITY, ' ').replace(/\s+/g, ' ').trim();
    if (WORD.test(clean)) out.push({ line: lineAt(starts, textAt), text: clean });
    text = ''; textAt = -1;
  };
  const expression = (open) => {
    const end = pastExpression(src, open);
    if (!/^\{\s*@html\b/.test(src.slice(open, open + 12))) out.push(...expressionFindings(src, starts, open + 1, end - 1));
    return end;
  };
  let i = from;
  while (i < to) {
    const c = src[i];
    if (src.startsWith('<!--', i)) { flush(); const end = src.indexOf('-->', i + 4); i = end < 0 ? to : end + 3; continue; }
    if (c === '{') { flush(); i = expression(i); continue; }
    if (c === '<' && /[A-Za-z/!]/.test(src[i + 1] ?? '')) {
      flush();
      const name = /^<\/?([A-Za-z][\w:.-]*)/.exec(src.slice(i, i + 64))?.[1]?.toLowerCase() ?? '';
      const closingTag = src[i + 1] === '/';
      i += 1;
      /* the attributes */
      while (i < to && src[i] !== '>') {
        if (src[i] === '{') { i = expression(i); continue; }
        const attr = /^\s*([^\s=>/{}]+)\s*=\s*(["'])/.exec(src.slice(i, i + 200));
        if (attr) {
          const q = attr[2], valueAt = i + attr[0].length, end = src.indexOf(q, valueAt);
          const value = src.slice(valueAt, end < 0 ? to : end);
          if (ATTRS.has(attr[1].toLowerCase()) && !value.trimStart().startsWith('{') && WORD.test(value))
            out.push({ line: lineAt(starts, valueAt), text: `${attr[1]}="${value.replace(/\s+/g, ' ').trim()}"` });
          /* an expression inside a quoted value: title="Open {name}" */
          for (let j = valueAt; j < (end < 0 ? to : end); j++) if (src[j] === '{') { const e = pastExpression(src, j); out.push(...scriptFindings(src, starts, j + 1, e - 1)); j = e - 1; }
          i = end < 0 ? to : end + 1;
          continue;
        }
        i++;
      }
      i++;
      if (!closingTag && (name === 'script' || name === 'style')) {
        const close = src.toLowerCase().indexOf(`</${name}`, i);
        const end = close < 0 ? to : close;
        if (name === 'script') out.push(...scriptFindings(src, starts, i, end));
        i = end;
      }
      continue;
    }
    if (textAt < 0 && /\S/.test(c)) textAt = i;
    text += c;
    i++;
  }
  flush();
  return out;
};

/* ---------- a file ---------- */

const findingsOf = (file, src) => {
  const starts = lineStarts(src);
  if (file.endsWith('.ts')) return scriptFindings(src, starts, 0, src.length);
  let from = 0;
  const found = [];
  if (file.endsWith('.astro')) {
    const fm = /^\s*---\r?\n([\s\S]*?)\r?\n---/.exec(src);
    if (fm) { found.push(...scriptFindings(src, starts, src.indexOf(fm[1]), src.indexOf(fm[1]) + fm[1].length)); from = fm[0].length + (fm.index ?? 0); }
  }
  return [...found, ...markupFindings(src, starts, from, src.length)];
};

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const unknown = [...flags].filter((f) => f !== '--summary' && f !== '--unused');
if (unknown.length) { console.error(`i18n-lint: unknown option ${unknown.join(' ')} (--summary, --unused)`); process.exit(2); }
/* Files or folders named on the command line, else all of src/. */
const targets = args.filter((a) => !a.startsWith('--')).map((a) => path.resolve(a));
const files = (targets.length ? targets : [SRC]).flatMap((t) => fs.statSync(t).isDirectory() ? walk(t) : [t]);
const shown = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const skipped = (rel) => SKIP_FILE.test(rel) || SKIP_DIRS.some((d) => rel.startsWith(d.split(path.sep).join('/')));

/* ---------- --unused: catalog keys no source names ---------- */

if (flags.has('--unused')) {
  const EN = path.join(SRC, 'lib', 'i18n', 'en');
  const keys = fs.readdirSync(EN).filter((f) => f.endsWith('.ts') && f !== 'index.ts').sort().flatMap((f) =>
    [...fs.readFileSync(path.join(EN, f), 'utf8').matchAll(/^\s*'([^']+)'\s*:/gm)].map((m) => ({ key: m[1], file: `src/lib/i18n/en/${f}` })));
  /* every source of src/, whatever the command line names: a key is used if anything uses it */
  const sources = walk(SRC).filter((abs) => !shown(abs).startsWith('src/lib/i18n/')).map((abs) => fs.readFileSync(abs, 'utf8')).join('\n');
  const quoted = new Set([...sources.matchAll(/['"`]([a-z][\w]*(?:\.[\w]+)+)['"`]/g)].map((m) => m[1]));
  /* a key put together at run time: `about.feature.${name}` names every key under about.feature. */
  const prefixes = [...new Set([...sources.matchAll(/`([a-z][\w]*(?:\.[\w]+)*\.)\$\{/g)].map((m) => m[1]))];
  const unused = keys.filter(({ key }) => !quoted.has(key) && !prefixes.some((p) => key.startsWith(p)));
  unused.forEach(({ key, file }) => console.log(`${file}: ${key}`));
  if (unused.length) { console.error(`\n${unused.length} of ${keys.length} catalog key${keys.length === 1 ? '' : 's'} named nowhere under src/.`); process.exit(1); }
  console.error(`i18n: all ${keys.length} catalog keys are named under src/.`);
  process.exit(0);
}

/* ---------- the lint ---------- */

const results = [];
for (const abs of files.sort()) {
  const rel = shown(abs);
  if (skipped(rel)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  const lines = src.split('\n');
  for (const f of findingsOf(rel, src)) {
    if (SKIP_LINE.test(lines[f.line - 1] ?? '')) continue;
    const text = f.text.replace(/\s+/g, ' ').trim();
    const row = `${rel}:${f.line}: ${text.length > 140 ? `${text.slice(0, 139)}…` : text}`;
    if (allow.some((re) => re.test(row))) continue;
    results.push(row);
  }
}
const unique = [...new Set(results)];
if (flags.has('--summary')) {
  /* by the directory two levels under src/ (src/lib/content, src/components/views), or the file's own folder above that */
  const dirOf = (row) => { const parts = row.slice(0, row.indexOf(':')).split('/'); return parts.slice(0, Math.min(3, parts.length - 1)).join('/'); };
  const counts = new Map();
  for (const r of unique) counts.set(dirOf(r), (counts.get(dirOf(r)) ?? 0) + 1);
  const rows = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const width = Math.max(5, ...rows.map(([d]) => d.length));
  rows.forEach(([d, n]) => console.log(`${d.padEnd(width)}  ${String(n).padStart(5)}`));
  console.log(`${'total'.padEnd(width)}  ${String(unique.length).padStart(5)}`);
} else unique.forEach((r) => console.log(r));
if (unique.length) { console.error(`\n${unique.length} UI text${unique.length === 1 ? '' : 's'} not read from the catalog (src/lib/i18n/); allowlist in scripts/i18n-allow.txt.`); process.exit(1); }
console.error('i18n: no UI text outside the catalog.');
