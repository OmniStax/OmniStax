/* The release notes, read at build time from omnistax-web/releases/: one
   Markdown file per release, its version and title in the front matter, a
   Chinese note optionally beside it as <name>.zh-CN.md. A note that fails the
   check fails the build (docs/release-plan.md, decisions 6 to 8). */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { marked } from 'marked';
import { type Locale, tIn } from '../i18n/index';
import { compareVersions, VERSION, type Version } from '../releases/version';

export type Note = { readonly version: Version; readonly title: string; readonly desktop: boolean; readonly html: string; readonly zh?: { readonly title: string; readonly html: string } };

const Front = z.object({ version: z.string().regex(VERSION), title: z.string().min(1), desktop: z.boolean().optional() }).strict();
const scalar = (raw: string): string | boolean => {
  const s = raw.trim();
  return s === 'true' ? true : s === 'false' ? false : s.replace(/^(['"])(.*)\1$/, '$2');
};

/* One file: its front matter checked, its body as HTML, images beside the notes served from /releases/images/. */
export const parseNote = (name: string, text: string): Note => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`releases/${name}: no front matter`);
  const fields = Object.fromEntries(m[1].split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#')).map((l) => {
    const at = l.indexOf(':');
    return at < 0 ? [l.trim(), ''] : [l.slice(0, at).trim(), scalar(l.slice(at + 1).replace(/\s+#.*$/, ''))];
  }));
  const front = Front.safeParse(fields);
  if (!front.success) throw new Error(`releases/${name}: ${front.error.issues.map((i) => `${i.path.join('.') || 'front matter'} ${i.message}`).join('; ')}`);
  const html = (marked.parse(m[2], { async: false }) as string).replace(/(src|href)="(?:\.\/)?images\//g, '$1="/releases/images/');
  return { version: front.data.version as Version, title: front.data.title, desktop: front.data.desktop ?? false, html };
};

export const NOTES_DIR = path.resolve(process.cwd(), 'releases');

/* Every note, newest first; none when the folder is missing. */
export const readNotes = (dir: string = NOTES_DIR): readonly Note[] => {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const read = (f: string): Note => parseNote(f, fs.readFileSync(path.join(dir, f), 'utf8'));
  const notes = files.filter((f) => !f.endsWith('.zh-CN.md')).map((f) => {
    const note = read(f); const zhFile = f.replace(/\.md$/, '.zh-CN.md');
    if (!files.includes(zhFile)) return note;
    const zh = read(zhFile);
    if (zh.version !== note.version) throw new Error(`releases/${zhFile}: version ${zh.version} is not ${note.version}`);
    return { ...note, zh: { title: zh.title, html: zh.html } };
  });
  const seen = new Set<string>();
  for (const n of notes) { if (seen.has(n.version)) throw new Error(`releases: version ${n.version} is used twice`); seen.add(n.version); }
  return [...notes].sort((a, b) => compareVersions(b.version, a.version));
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* The What's new page as a fragment the shell adopts, like the about page. */
export const whatsNewHtml = (notes: readonly Note[], locale: Locale = 'en'): string => {
  const own = (n: Note) => (locale === 'zh-CN' && n.zh ? n.zh : n);
  const body = notes.length === 0
    ? `<p>${esc(tIn(locale, 'about.whatsNew.empty'))}</p>`
    : notes.map((n) => `<section class="note" id="v${esc(n.version)}">
    <h2>${esc(own(n).title)}</h2>
    <p class="version">${esc(n.version)}</p>
    ${own(n).html}
  </section>`).join('\n  ');
  return `<article class="page" data-page="whatsnew">
  <header><h1>${esc(tIn(locale, 'about.whatsNew.title'))}</h1></header>
  ${body}
</article>`;
};
