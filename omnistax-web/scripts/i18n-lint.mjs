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
       punctuation — or one given to a field such as label: or title:.
   It skips src/lib/i18n/, *.worker.ts, *.d.ts, and any line that mentions
   console., throw new Error or new Error(. Exit code 1 when a finding is left.
   `node scripts/i18n-lint.mjs src/components/views` lints only what it names. */
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
const scriptFindings = (src, starts, from, to) => literals(src, from, to)
  .filter(([, , before]) => !DOCS.test(before) && !TYPE.test(before))
  .filter(([, text, before]) => SENTENCE.test(text) || (FIELD.test(before) && /^[A-Z][a-z]/.test(text) && !/^[A-Z][a-z]+[A-Z]/.test(text)))
  .map(([offset, text]) => ({ line: lineAt(starts, offset), text }));

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
    if (!/^\{\s*@html\b/.test(src.slice(open, open + 12))) out.push(...scriptFindings(src, starts, open + 1, end - 1));
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

const results = [];
/* Files or folders named on the command line, else all of src/. */
const targets = process.argv.slice(2).map((a) => path.resolve(a));
const files = (targets.length ? targets : [SRC]).flatMap((t) => fs.statSync(t).isDirectory() ? walk(t) : [t]);
for (const abs of files.sort()) {
  const rel = path.relative(ROOT, abs);
  if (SKIP_FILE.test(rel) || SKIP_DIRS.some((d) => rel.startsWith(d))) continue;
  const src = fs.readFileSync(abs, 'utf8');
  const lines = src.split('\n');
  for (const f of findingsOf(rel, src)) {
    if (SKIP_LINE.test(lines[f.line - 1] ?? '')) continue;
    const shown = f.text.replace(/\s+/g, ' ').trim();
    const row = `${rel.split(path.sep).join('/')}:${f.line}: ${shown.length > 140 ? `${shown.slice(0, 139)}…` : shown}`;
    if (allow.some((re) => re.test(row))) continue;
    results.push(row);
  }
}
const unique = [...new Set(results)];
unique.forEach((r) => console.log(r));
if (unique.length) { console.error(`\n${unique.length} UI text${unique.length === 1 ? '' : 's'} not read from the catalog (src/lib/i18n/); allowlist in scripts/i18n-allow.txt.`); process.exit(1); }
console.error('i18n: no UI text outside the catalog.');
