# OmniStax i18n plan (issue #42)

> The design the i18n work of 2026-10-22 was built from, kept as written before the work began; where it and the code differ, the code and `i18n-handoff.md` are right.

Branch `claude/modest-meitner-6xqa4p`. Agents do not commit; the orchestrator does. Run everything from `/home/user/OmniStax/omnistax-web` (`npm install` already running). All paths below are verified to exist unless marked NEW.

Conventions to follow (already in the codebase): branded ids in `src/lib/types/ids.ts`; zod DTOs with `.describe()` on every field in `src/lib/content/schema.ts` (the docs generator `scripts/docs-content.ts` fails on an undescribed field); pure model in `.ts` + live store in `.svelte.ts` (`src/lib/settings/store.svelte.ts`, `src/lib/tips/{model.ts,store.svelte.ts}`); tests in `tests/*.test.ts` run by `node --test --import tsx` and import only pure `.ts` modules (never `.svelte.ts`); localStorage keys `omnistax-<name>` for scalar settings and `omnistax-<name>-v1` for records, written only when `readerWritesAllowed()` (`src/lib/backup/guard.ts`).

Execution order and parallelism:
0. **Foundation** (one agent, ~1 h): Step 1.A core + Step 2.A schema. Everything else depends on these.
1. **Step 2.B–E** (one agent) in parallel with **Step 1 extraction** (4 agents, disjoint trees) and **Step 3** (glossary agent first, then 5 section agents).
2. **Step 4** after Step 1 (needs the catalog and the store).
3. Final verification (bottom).

---

## STEP 1 — UI string catalog (`src/lib/i18n/`, NEW)

### 1.A Core (foundation agent)

Files (all NEW):

- `src/lib/i18n/en/index.ts` — the English source of truth, **one module per area, merged flat**:
  ```ts
  import { shell } from './shell'; import { settings } from './settings'; /* … one import per area file */
  export const en = { ...shell, ...settings, ...commands, ...explorer, ...views, ...exercises, ...practice, ...notes, ...files, ...drawer, ...chat, ...pomodoro, ...sheets, ...offline, ...tips, ...content, ...about } as const;
  export type MessageKey = keyof typeof en;
  export type Catalog = Readonly<Record<MessageKey, string>>;
  ```
  Each area file exports `export const settings = { 'settings.title': 'Settings', 'settings.theme.name': 'Theme', … } as const;`. Keys are dotted, `area.component.thing` (`explorer.menu.switchLanguage`, `palette.command.closeTab`, `findTextbook.size`), alphabetised inside a file. A test asserts the merged key count equals the sum of the area files' key counts (a duplicate key across files would silently override). Per-area files are the review list issue #46 wants: `grep -h "^  '" src/lib/i18n/en/*.ts` prints every platform text with its key. The foundation agent creates all area files as stubs so extraction agents never touch `index.ts`.
- `src/lib/i18n/zh-CN/index.ts` + the same area files, each typed `Readonly<Record<keyof typeof enSettings, string>>`, merged as `export const zhCN: Catalog = {...}` so a missing or extra key is a `npm run check` error. Filled in Step 4.
- `src/lib/i18n/index.ts` — **pure, no runes**, importable from tests and from `.ts` modules:
  - `export const LOCALES = ['en', 'zh-CN'] as const; export type Locale = typeof LOCALES[number]; export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', 'zh-CN': '中文（简体）' }` (names are in their own language, never translated).
  - `parseLocale(s: string | null | undefined): Locale | null` (exact match, case-insensitive on the region); `matchLocale(languages: readonly string[]): Locale` — first entry whose language subtag matches a catalog (`zh`, `zh-Hans`, `zh-Hans-CN`, `zh-TW` → `zh-CN` while it is the only Chinese catalog; anything else → `en`).
  - `format(template: string, params: Params, locale: Locale): string` — interpolation `{name}`; plural `{count, plural, one {# chapter} other {# chapters}}` resolved with `new Intl.PluralRules(locale).select(n)` (categories `zero|one|two|few|many|other`, `other` required, `#` = the number). No other ICU syntax. Unknown placeholder is left as written.
  - `tIn(locale, key, params?)`: catalog lookup falling back to `en`, then to the key itself. `t(key, params?)`: `tIn(current, …)` where `current` is a module-level `let`; `setCurrentLocale(l)` sets it and calls listeners registered by `onLocaleChange(cb)`.
  - `type Params = Readonly<Record<string, string | number>>; type TFn = (key: MessageKey, params?: Params) => string`.
- `src/lib/i18n/store.svelte.ts` — the live value, modelled on `settings/store.svelte.ts`:
  ```ts
  class I18n {
    choice = $state<Locale | 'system'>(readChoice());          // omnistax-lang, absent = system
    system = $state<Locale>(matchLocale(navigator.languages));
    get locale(): Locale { return this.choice === 'system' ? this.system : this.choice; }
    t = (key: MessageKey, params?: Params): string => { void this.locale; return tIn(this.locale, key, params); };
    setChoice(c: Locale | 'system'): void { … write/remove KEY; }
  }
  export const i18n = new I18n();
  ```
  An `$effect.root` (or Shell `$effect`) mirrors `i18n.locale` into `setCurrentLocale` so pure-module callers see the same language. Components write `{i18n.t('settings.title')}`; reading `this.locale` inside `t` makes every template expression reactive. Boot order (`?lang=`, persisted, navigator) is in Step 4.
- `tests/i18n.test.ts` (NEW): every locale has every key and no empty value; placeholders and plural categories in each translation match `en`'s; `format` plural for `en` (`1 chapter`, `2 chapters`) and `zh-CN` (`other` only); `matchLocale` cases above; `parseLocale('ZH-cn') === 'zh-CN'`.
- `scripts/i18n-lint.mjs` (NEW) + `package.json` script `"lint:i18n": "node scripts/i18n-lint.mjs"`: walks `src/**/*.{svelte,ts,astro}` and prints `file:line: text` for (a) template text nodes in `.svelte`/`.astro` markup (outside `<script>`, `<style>`, `{…}` expressions, `{@html}`) containing two or more consecutive Latin letters; (b) attribute values of `aria-label`, `title`, `placeholder`, `alt`, `label`, `aria-description` not beginning with `{`; (c) in `.ts` and script blocks, string literals matching `/^[A-Z][a-z]+( [a-z…]|[.,:;!?…])/` (sentence-shaped). Skips `src/lib/i18n/`, `tests/`, `*.worker.ts`, lines containing `console.`/`throw new Error`/`new Error(`, and paths or literals listed in `scripts/i18n-allow.txt` (one regex per line, with a comment saying why). Exit code 1 when any finding remains. Acceptance for Step 1 is `npm run lint:i18n` clean, `npm run check`, `npm test`.

**Non-reactive modules.** Keep it simple: a value computed from `t()` is computed when it is asked for, not stored.
- Commands: `src/lib/commands/builtin.ts` is pure and receives deps; add `readonly t: TFn` to `BuiltinDeps` (tests pass `tIn.bind(null,'en')` or `t`). Labels and groups become `d.t('commands.closeTab')`, `d.t('commands.group.layout')`. Group names are also keys (`commands.group.app|appearance|reading|layout|view`) — the palette fuzzy-matches `${group} ${label}` so it searches translated text. In `src/components/Shell.svelte`, replace the one-time `installCommands()` (line 157) by `$effect(() => { void i18n.locale; installCommands(); })` — `commands.register` replaces by id, so re-registration re-labels every command, and `src/lib/commands/setup.svelte.ts` `groupCommands()` follows. Chords (`defaults.ts`, `keys.svelte.ts`) are keyed by id and unaffected.
- Tips: `src/lib/tips/model.ts` `TIPS` becomes `export const tipsOf = (t: TFn): readonly Tip[]` (keys `tips.drawing`, `tips.drawing.action`, …); `stepTip`/`visit` take `count` already. `store.svelte.ts` `current` getter calls `tipsOf(i18n.t)`. `tests/tips.test.ts` passes `tipsOf((k) => k)`.
- Other constant tables: `VIEW_TITLE` in `src/lib/icons.ts` → `viewTitle(kind, t)`; `HINT`/`ROWS`/`THEME_OPTIONS`/`FONT_OPTIONS` labels → `$derived` in the component or functions of `t`; `BROWSER_NAMES` stay (product names). `src/lib/layout/titles.ts` `tabTitle` and `src/lib/sections/scope.ts` `targetLabel` take `t` or import `t` from `i18n/index.ts` (snapshot is fine: the tab strip re-renders on locale change because the Shell effect above also bumps a `$state` the strip reads — simplest: TabStrip reads `i18n.locale` once in its template).
- Pure modules covered by tests (`src/lib/exercises/check.ts` `'Pick one.'`, `src/lib/practice/model.ts` labels, `src/lib/history` undo labels, `src/lib/offline/*` messages): import `t` from `src/lib/i18n/index.ts`; tests run with the default locale `en`, so existing assertions hold; where a test wants another locale it calls `setCurrentLocale`.

**Astro and build-time strings.** Every page is `src/layouts/ShellPage.astro` (used by `Page.astro`, `src/pages/index.astro`, `404.astro`, `[book]/sheets/[sheet]/index.astro`). Strings written into static HTML — `src/lib/content/fragment.ts` (`'Figure'`, `'Notes'`, `'Corrections'`, `'Previous'`, `'Open a practice session on this section'`, `'This section has no exercises'`, "Section summary", the footer in `attribution.ts`), `roles.ts` `pageLabel`, `Page.astro` title separator — are rendered **in the book's language**: `fragment(book, chapter, s, nav)` gains `locale: Locale` (from `book.language`, Step 2) and uses `tIn(locale, 'content.previous')`. The about page (`src/lib/content/pages.ts`, `index.astro`) and `404.astro` stay English static HTML in this pass (noted limitation; a `/zh-CN/` front page is follow-up work).

**aria-label / title / placeholder / alt**: `aria-label={i18n.t('x')}`; template literals with values become params (`i18n.t('findTextbook.size', { chapters, sections })` with a plural template). Svelte snippets that take a label string keep taking strings; callers pass `i18n.t(...)`.

**Do not extract**: ids, keys, CSS classes, `data-*` values, localStorage keys, command ids, `console.*`/`throw` messages, test strings, KaTeX/LaTeX, book content and anything read from `book.json`/manifest (type labels, exercise kind labels, titles — those are content and come from the translated book), product names (OmniStax, OpenStax, Chrome, Pomodoro as a brand is fine to translate as 番茄钟), file extensions, units, the `ICON` SVGs, font names in `settings/fonts.ts`, the `BROWSER_NAMES`.

### 1.B Extraction split (4 agents, disjoint files)

Each agent owns the listed source files **and** the matching `en/<area>.ts` files; nobody else edits them. Each agent also adds to `scripts/i18n-allow.txt` only lines for its own files.

- **Agent S (shell)**: `src/components/{Shell,Rail,Sidebar,ViewBox,DocGroup,TabStrip,Pane,Palette,Browser,Settings,HighlightBar,Hover,Tooltip,SplitTree,SpotCurve,ShellLoader}.svelte`, `src/components/settings/`, `src/components/ui/`, `src/lib/commands/`, `src/lib/settings/`, `src/lib/layout/`, `src/lib/tips/`, `src/lib/icons.ts`, `src/lib/history/`, `src/lib/voice*.ts`, `src/lib/storage/`, `src/lib/backup/` (user-facing error strings only). Catalog files: `shell.ts`, `settings.ts`, `commands.ts`, `tips.ts`.
- **Agent V (views and practice)**: `src/components/views/`, `src/components/explorer/`, `src/components/exercises/`, `src/components/practice/`, `src/lib/explorer/`, `src/lib/practice/`, `src/lib/sections/`, `src/lib/search/`, `src/lib/offline/`, `src/lib/exercises/`, `src/lib/hover/`, `src/lib/colours/`. Catalog files: `views.ts`, `explorer.ts`, `exercises.ts`, `practice.ts`, `offline.ts`.
- **Agent N (the reader's own things)**: `src/components/{notes,files,drawer,chat,pomodoro,sheets}/`, `src/lib/{notes,files,drawer,chat,pomodoro,sheets,cas,grapher,sync,picker,tree,fig}/` (figlib's own chrome strings: transport button names, "Show original"). Catalog files: `notes.ts`, `files.ts`, `drawer.ts`, `chat.ts`, `pomodoro.ts`, `sheets.ts`.
- **Agent B (build-time and tooling)**: `src/lib/content/{fragment,attribution,roles,pages}.ts`, `src/layouts/*.astro`, `src/pages/**/*.astro`, `scripts/i18n-lint.mjs` hardening, `tests/i18n.test.ts` additions, `omnistax-web/README.md` section "Languages". Catalog files: `content.ts`, `about.ts`.

Each agent finishes with `npm run check`, `npm test`, and `npm run lint:i18n` reporting zero findings in its own paths.

---

## STEP 2 — Content schema, parity check, media, library, swap

### 2.A `book.json` schema (foundation agent)

In `src/lib/content/schema.ts` `BookSchema` (line 183), after `openstax`:
```ts
language: z.string().regex(/^[a-z]{2,3}(-[A-Za-z]{4})?(-[A-Z]{2})?$/).optional().describe('The language the book is written in, as a BCP 47 tag such as en or zh-CN; absent, en, and the content check warns. It is the lang of every page of the book and what the library lists the edition under.'),
translation_of: z.string().optional().describe('The id of the book this one translates, which must be a book of the same content root. A translation keeps every chapter directory, section id, concept id, form id, symbol key, exercise id, figure id and span id of its source, so the same place can be opened in either edition; the content check compares them.'),
translation: z.object({
  source_release: z.string().optional().describe('The release id of the source book the translation was made from, as the offline catalog names it, where one is known.'),
  source_commit: z.string().optional().describe('The git commit of the source book the translation was made from.'),
  translator: z.string().describe('Who made the translation: a model id (claude-fable-5-1) or a person.'),
  effort: z.enum(['low','medium','high','max']).optional().describe('The effort the model ran at, as rule 17 records it.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('The ISO date the translation was made.'),
  authority: z.string().optional().describe('The official or published translation whose terms this one follows, where one exists, named as its publisher names it.'),
  authority_url: z.string().url().optional().describe('That translation’s own page.'),
  glossary: z.string().describe('The glossary file under the book’s folder, such as glossary.zh-CN.json: every term chosen, its source term and the authority it was taken from.'),
}).strict().optional().describe('How the translation was made, where the book is one. Written on a book that names translation_of and nowhere else.'),
```
Transform output adds `language: b.language ?? 'en'`, `languageDeclared: b.language !== undefined`, `translationOf: b.translation_of`, `translation: b.translation`. Add a `.superRefine` on the object: `translation` without `translation_of` is a parse error. Add to `TABLES`: `translation: { level: 'book', file: 'book.json', field: 'translation', schema: TranslationSchema, note: '…' }` so the generated reference gets a part. `BookManifest` (line 730) gains `readonly language: string; readonly translationOf?: string`; `manifestOf` in `load.ts` (line 397) copies them. Run `npm run docs:content` (writes `/home/user/OmniStax/docs/content-format.md`; `docs/content-tables.md` it links to does not exist today — leave). Update `tests/fixtures/framed-book/book.json` only if the check below is made an error (it is a warning, so no).

### 2.B Checks (`src/lib/content/check.ts`)

- `checkLanguage: Check` → warning `book.json language` "is not declared; the book is read as en" when `!content.book.languageDeclared`; add to `CHECKS`.
- `checkTranslationMeta: Check` → error when `translationOf` names the book itself; warning when `translationOf` set and `translation` absent; warning when `translation.glossary` is set (file existence is checked in `scripts/check-content.ts`, which can read disk).
- `export const checkParity = (content: Content, source: Content): readonly Finding[]` (not a `Check`, since it reads two books). Enumerate exactly as the existing checks do: chapter dirs `book.chapterDirs` (translation's list must be a subset of the source's, in source order — a prefix is the normal pilot case); per listed chapter: `ch.dto.id`, `ch.dto.sections[].id` (identical sets), `ch.dto.variables` as `sym|section` pairs; built sections (`ch.sections[].dto.id`) must be built in the source; per built section: `dto.figures[].id`, `dto.exercises[].id`, `dto.exercise_concepts`, `dto.coverage` as `span|concept|verb`, `dto.referents[].id`, `dto.footnotes[].id`, `dto.derivations[].id`, and span anchors `localIds(s.textHtml)` (line 66), identical sets; book-wide: `concepts[].id`, `concepts[].forms[].id`, `symbols[].sym`, `types[].id`, `exercise_kinds[].id`, `sheets[].id` identical; `language` must differ from the source's. Every difference is an error with `where` = `book.json translation_of` or the section's `inSection(...)`. Add tests in `tests/content-check.test.ts`: for every loaded book with `translationOf`, load its source with `loadBooks(config.content.root, { kind: 'named', ids: [source] })` and assert no errors; plus a synthetic pair (copy of the fixture with one span renamed) that reports exactly one error.
- `scripts/check-content.ts`: after `loadBooks`, for each book with `translationOf` resolve the source through `findBooks(args.root)` (load it even if not in `--books`), run `checkParity`, and `fs.access` the glossary path (warning if missing).

### 2.C Media (reuse, no copying)

Today `loadBook` (load.ts line 418) reads sizes from `[root/media]` only, and `content.mjs` serves/copies `books.map(dir => dir/media)`. A translated book has **no `media/` folder** and its `text.html`/`figures` name the source's `/media/ch01/...` paths verbatim.
- `BookFolder` (load.ts line 456) gains `readonly translationOf?: BookId`; `findBooks` fills it from the parsed `book.json`.
- `loadBook(root, id, mediaRoots: readonly MediaRoot[] = [path.join(root,'media')])`; `loadBooks` and `bookTrees` pass `[own/media, sourceFolder/media]` when `translationOf` resolves in `found` (error if it does not: "translation_of names no book under the content root").
- `astro.config.mjs`: compute `mediaDirs = unique(books.flatMap(b => [b.dir, folderOf(b.translationOf)]))` and call `content(config.content.root, books.map(b => b.dir), mediaDirs)`; `content.mjs` takes the third argument for `mediaRoots` (serving and `copyMedia`), keeps `books` for `buildOfflineArtifacts`. So a build of only the translation still serves and ships its images; the offline release already hashes resolved `/media/` bytes (`scripts/build-offline.mjs` line 118–121), so nothing changes there. Document in `omnistax-web/README.md` under Configuration.

### 2.D Library and explorer

- `src/pages/library.json.ts` entry adds `language: m.language, ...(m.translationOf ? { translationOf: m.translationOf } : {})`. `src/lib/explorer/library.svelte.ts` `LibraryBookDTO` adds `language: string; translationOf?: string` (`parseBook` defaults `'en'`). New pure `src/lib/explorer/editions.ts`: `editionsOf(books, id)` (the source and every book whose `translationOf` is it, or whose source is the same), `siblingIn(books, id, language)`, `rootOf(books, id)`; `tests/editions.test.ts`.
- `src/components/explorer/FindTextbook.svelte`: list by `rootOf`; under a source row, one line per other edition: `LOCALE_NAMES`-style name of its language (from `Intl.DisplayNames(i18n.locale, {type:'language'})`, fallback the tag) with its own Add/offline controls; a translation whose source is not in the build lists on its own.
- Swap language: in `src/components/views/Explorer.svelte` `placeItems` (line 366) add, for a book row with more than one edition, one item per other edition: `t('explorer.menu.openIn', { language })` → `switchEdition(from, to)`. And a command `BUILTIN.switchLanguage = commandId('book-switch-language')`, label `commands.switchLanguage` ("Book: switch language"), group View, `when`: the focused tab is a section of a book with ≥2 editions, `choices`: the editions. `switchEdition` lives in `src/lib/explorer/editions.svelte.ts`: take the focused group's active key (`focusedGroup(layoutStore.layout).active`), `parseItemKey` → `sectionOfItem` gives `SectionRef {book, section}`; `library.add(to)`; `openDoc(sectionRef(to, ref.section), 'text')` from `src/lib/sections/nav.svelte.ts` — section ids are identical by the parity check, so the same page opens; if the sibling has not built that section (`registry.load` rejects) show the existing failure path and open the sibling's first built page from its manifest. Mastery stays per book (decided).

### 2.E `<html lang>`

`src/layouts/ShellPage.astro` gains `lang?: string` (default `'en'`) on `<html lang={lang}>`; `Page.astro` and `[book]/sheets/[sheet]/index.astro` pass `tree.manifest.language`. The page's `lang` is the **content** language — `src/lib/voice.ts` line 49 reads it for the article, which is right. The UI language goes on the shell root: `<div class="shell" lang={i18n.locale}>` in `Shell.svelte`; on pages with no book (`index.astro`, `404.astro`) the boot also sets `document.documentElement.lang = i18n.locale`.

---

## STEP 3 — Translation prompt and the pilot

### 3.A `docs/prompts/translate.md` (NEW) and `RULES.md` item 30

Add to root `RULES.md`: `## 30. Translating a book` — a translation is a book of its own under `omnistax-content/<Source folder> (<tag>)/` with its own id `<source-id>-<tag lowercased>`, `language`, `translation_of` and `translation` in `book.json`; every id is the source's; the rules are `docs/prompts/translate.md`; the humanizer review is the owner's, after. Amend the "Where things live" block with the `(<tag>)` folder line.

`docs/prompts/translate.md` (peer of `interactive-figures.md`, `derivations.md`) must state:

1. **Terminology.** Use the field's standard terms. For Chinese: the national standard terms of 全国科学技术名词审定委员会 at termonline.cn, and the publisher's official translation of the book where one exists (for OpenStax College Physics there is none official; cite the termonline entry). When unsure, look the term up; never coin one. A term, once chosen, is written identically everywhere (prose, concept names, statements, variable meanings, figure labels, exercises) and recorded in the glossary before use.
2. **Fidelity.** Same tone, register, sentence order and paragraphing as the source; nothing added, dropped, summarised or "improved"; the book's humour, examples, numbers, names and units stay. The only exceptions are forced scenarios, each written down: English-specific grammar in figure code (plural branches, `a`/`an`), wordplay, a unit or idiom with no equivalent, a sentence about English spelling, a term whose standard translation collides with another term's. Every such case is a line in the translated chapter's `config.md` table and in `translation-notes.md` at the translated book's root (NEW; one entry: file, span id, what was done, why).
3. **What is translated and what is verbatim** (exact positions, read off `College Physics 2e/ch01/1.1`):
   - `book.json`: translate `title`, `types[].label`, `exercise_kinds[].label`, `concepts[].{name,terms,statement}`, `forms[].condition`, `sheets[].title`. Verbatim: `id`s, `publisher`, `authors`, `copyright`, `license`, `license_url`, `source_url`, `openstax`, `highlights`, `chapters`, `symbols` (all fields), `concepts[].{id,kind,section,symbol,type}`, `forms[].{id,latex,ktex,section,anchor}`, `concept_prereqs`, `colours`, `exercise_sources`. New: `language`, `translation_of`, `translation`.
   - `chapter.json`: translate `title`, `sections[].title`, `variables[].meaning`. Verbatim: `id`, `dir`, `module`, `slug`, `intro`/`summary` records, `variables[].{sym,concept,type,ref,unit,section,anchor,redefines}`.
   - `section.json`: translate `title`, `short`, `lead`, `objectives[]`, `summary_html`, `notes`, `exercises_lead`, `exercise_notes`, `figures[].original_caption`, `referents[].name`/label, `exercises[].{prompt,options[],hint,solution,parts[].hint}`, `footnotes[].html`, derivation node text and reasons. Verbatim: `id`, `module`, `chapter`, `figures[].{id,kind,number,folds,originals,withheld,widths,draws,conventions,facts}`, `exercises[].{id,source_id,kind,bloom,place,cite,answer.type,value,unit,correct,generated_by,tolerance}`, `exercise_concepts`, `coverage`, `referents[].id` and `figures`, `ai` (append the translator as a maker per rule 17), `built` = the translation date.
   - `text.html`: translate every text node, `alt`, `data-original-caption`, and `\text{…}` inside math. Verbatim: tags, `id`, `class`, `data-concept`, `data-ref`, `data-type`, `data-figure`, `data-original`, `data-width`, `href`, `src`, `<sup class="fn" data-note>`, macros (`\kx`), all LaTeX outside `\text{}`, `&#36;`/`＄` conventions, `<section id>` structure.
   - `figures.js`: code verbatim; translate only strings the reader sees: `ctl` `label` (the `\text{}` content) and `aria`, `headline(ctx, …)`, `text(ctx, '…')` label strings, `note`/legend/hover-name strings, `readout` `\text{}` words, unit words, and display arrays such as `NAMES`/`WORDS`/`ORD` (1.1 lines 24–31, 52–64). Verbatim: ids (`sim-atom-model`), classes, keys, colour keys (`F.el('e-')`), numbers, `SYMB`, comments. English plural/article branches (`z === 1 ? ' electron' : ' electrons'`, `an`) collapse to one Chinese form: a forced scenario, listed.
   - Not copied: `source.md`, `plan.md`, `exploration.md`, `book-rows.json`, `concept-migration.json`. New per chapter: `config.md` (settings of the translation pass + forced-scenario table); new per book: `LOG.md`, `RULES.md` (the source's rules plus a "Translation" section), `COLOR.md` copied, `translation-notes.md`, `glossary.<tag>.json`.
4. **Glossary** `glossary.zh-CN.json` at the translated book's root, pointed to by `translation.glossary`: `{ "language": "zh-CN", "authorities": [{ "id": "termonline", "name": "全国科学技术名词审定委员会 术语在线", "url": "https://www.termonline.cn/" }], "terms": [{ "source": "displacement", "target": "位移", "authority": "termonline", "url": "…", "concept": "displacement", "note": "" }] }` sorted by `source`. Terms are added before they are used in prose; a term already present is never re-decided. A later check (follow-up) can verify every `concepts[].name` of the translation is a `target`.
5. **Verification per section**: `npm run check:content -- --books college-physics-2e-zh-cn` clean; parity against the source (2.B) clean; `node --check` on `figures.js`; open the page in `npm run dev` and read every headline/readout once.

### 3.B Folder, id, and what the pilot carries

- Folder `omnistax-content/College Physics 2e (zh-CN)/`, id `college-physics-2e-zh-cn`. Why: the id names URL routes (`/${id}/ch01/1.1/`), `omnistax-notes-<id>`/`omnistax-colours-<id>`/`omnistax-highlights-<id>` keys (backup regex `[^/]+` in `src/lib/backup/adapters.ts`), the colour export filename and the offline release — lowercase ASCII with hyphens keeps all of them safe; the folder keeps the source's name plus the tag so the pair sorts together and `findBooks` (any folder with a `book.json`) needs no change. `title` is the Chinese title (`大学物理 2e`, confirmed against the glossary step).
- `book.json` lists `"chapters": ["ch01"]` only. Verified safe: `loadBook` reads only listed chapters; `manifestOf` lists unbuilt sections "with nothing below"; `checkRefs` treats a concept whose section is in an unlisted chapter as info, not error (check.ts comment at line 104); `content-check.test.ts` requires at least one built section. The `concepts` table is copied **whole** (parity requires identical ids); only the 34 concepts with `section` `1.*` get translated `name`/`terms`/`statement` in the pilot; the rest keep English and `translation-notes.md` says so. `ch01/chapter.json` lists all four sections and the intro (all are built in the source: `1.1`–`1.4`, `ch01/intro`). The book-level `intro/` (Preface) is not copied in the pilot.
- Scaffold step (glossary agent, before translating): `omnistax-content/tools/scaffold_translation.py` (NEW, tested in `tools/tests/test_scaffold_translation.py`): copies `book.json` with `chapters` cut to the given dirs and the three new fields set, copies the chapter folders' `chapter.json`, `section.json`, `text.html`, `figures.js`, and writes empty `glossary.zh-CN.json`, `translation-notes.md`, `LOG.md`; respects rule 19 (never hand-edit `book.json`; later edits through `ost set`). Then `npm run check:content -- --books college-physics-2e-zh-cn` must pass (identical copy = parity clean).

### 3.C Parallel split for the pilot

1. **Glossary agent** (first, blocking): scaffold; harvest every candidate term from ch01 — `concepts[].{name,terms}` with `section` `1.*`, `types[].label`, `exercise_kinds[].label`, ch01 `variables[].meaning` nouns, section/chapter titles, boxed-note titles, figure headline nouns — look each up at termonline.cn (WebFetch/WebSearch), decide, write `glossary.zh-CN.json`; translate `book.json` `title`, `types[].label`, `exercise_kinds[].label`, the ch01 concepts via `ost set`, and `ch01/chapter.json`; write the UI/book term list for Step 4 to reuse (Explorer → 资源管理器 etc. live in the UI glossary, not here).
2. **Five section agents in parallel**: `ch01/intro`, `1.1`, `1.2`, `1.3`, `1.4` — each translates its `section.json`, `text.html`, `figures.js` only, reads the glossary first, and may **append** new terms to the glossary only under `"pending": true` with its section id; the orchestrator resolves pending terms and re-greps every section for consistency before the check.
3. Humanizer review: deferred to the owner (say so in `LOG.md`).

---

## STEP 4 — Language setting, detection, zh-CN catalog

- **Key**: `omnistax-lang`, values `en` | `zh-CN`; absent = System (same shape as `omnistax-theme`). Add to `KEYS`-style constant in `src/lib/i18n/store.svelte.ts`; reset through `settings.reset()` too.
- **Boot order** (in `I18n` construction + a `boot()` called from `Shell.svelte` `onMount` before `installCommands`): (1) `?lang=` in `location.search` → `parseLocale`; if valid, `setChoice(it)` (persist) and `history.replaceState` without the parameter; (2) persisted `omnistax-lang`; (3) `matchLocale(navigator.languages)`; (4) `'en'`. Then `setCurrentLocale(locale)`; `document.documentElement.lang = locale` only when the page carries no book (2.E); `<div class="shell" lang>` always. Listen to `languagechange` on `window` to refresh `system`.
- **Settings UI**: `src/components/Settings.svelte`, Appearance fold, **first row** before Theme: name `settings.language.name` ("Language"), segmented `role="radiogroup"` with System / English / 中文 (System shows the detected language in its hint: `settings.language.hint` "Follows your browser: {language}"), the `↺` back snippet resetting to System. Add `ROWS.language` words (`Language 语言 English 中文 locale`) so the filter finds it in either language.
- **Command**: `BUILTIN.language = commandId('language')`, label `commands.language` ("Change language"), group Appearance, `choices` = System + each `LOCALES` entry with `LOCALE_NAMES`, `detail` = current; commit `i18n.setChoice`. No preview.
- **Backup**: `src/lib/backup/schema.ts` appearance list (line 17–30) add `['omnistax-lang', (v) => v === 'en' || v === 'zh-CN']`; `categoryOf` returns `'appearance'` for it (the branch that handles `omnistax-theme`); `omnistax-web/docs/reader-backups.md` table row "Appearance and reading" gains `omnistax-lang`; `tests/backup.test.ts` add the round-trip case.
- **zh-CN catalog**: `src/lib/i18n/zh-CN/*.ts` filled by one agent after Step 1 lands, following `docs/prompts/translate.md` rules (termonline for physics words that appear in UI such as 质量/掌握度? — UI words are product terms, so the authority is the UI glossary). `src/lib/i18n/GLOSSARY.md` (NEW) fixes product terms once, to be confirmed by the owner: Explorer 资源管理器; OmniBooks (kept); Your Files 你的文件; Find a textbook 查找教材; Group 编组; Pane 窗格; Tab 标签页; Split 拆分; Command palette 命令面板; Settings 设置; Theme 主题; Concept map 概念图; Reference 参考; Definitions 定义; Formulas 公式; Annotations 批注; Highlight 高亮; Note 笔记; Drawing 手绘; Chat 对话; Pomodoro 番茄钟; Focus lock 专注锁定; Exercises 练习; Practice session 练习轮; Mastery 掌握度; Freshness 新鲜度; Try It 试一试; Figure 图; Sim 模拟; Derivation 推导; Sheet 参考表; Section 节; Chapter 章; Offline copy 离线副本; Update 更新; Backup 备份; Import 导入; Undo/Redo 撤销/重做; Zoom 缩放. Chinese punctuation (，。：) in prose strings, ASCII in keys; no plural branches (`other` only).

---

## Final verification checklist (orchestrator)

```
cd /home/user/OmniStax/omnistax-web
npm run check                        # astro check: catalogs typed, deps updated
npm test                             # includes tests/i18n.test.ts, editions.test.ts, parity tests
npm run lint:i18n                    # zero findings outside the allowlist
npm run docs:content && git diff --stat ../docs/content-format.md   # regenerated, no undescribed field
OMNISTAX_BOOKS=college-physics-2e,college-physics-2e-zh-cn npm run check:content   # no errors; parity clean; language warnings only on books that have not declared one (expected on the other four books until they add language: en)
OMNISTAX_BOOKS=college-physics-2e,college-physics-2e-zh-cn npm run build          # dist/college-physics-2e-zh-cn/ch01/1.1/index.html has <html lang="zh-CN">; dist/media/ch01/* present; dist/library.json carries language and translationOf
grep -c 'lang="zh-CN"' dist/college-physics-2e-zh-cn/ch01/1.1/index.html
python3 -I ../omnistax-content/tools/ost.py books                                  # lists both ids
```
Manual: `npm run dev`, open `/college-physics-2e/ch01/1.1/?lang=zh-CN` — UI in Chinese, explorer book-row menu offers 中文（简体）, choosing it opens `/college-physics-2e-zh-cn/ch01/1.1/`; Settings → Language → System returns to the browser language; export a backup and confirm `omnistax-lang` is in it. e2e not required.

### Critical files for implementation
- /home/user/OmniStax/omnistax-web/src/lib/content/schema.ts
- /home/user/OmniStax/omnistax-web/src/lib/content/check.ts
- /home/user/OmniStax/omnistax-web/src/lib/content/load.ts (with content.mjs and astro.config.mjs for media roots)
- /home/user/OmniStax/omnistax-web/src/lib/settings/store.svelte.ts (pattern for src/lib/i18n/store.svelte.ts, NEW)
- /home/user/OmniStax/omnistax-web/src/lib/commands/builtin.ts (with setup.svelte.ts and Shell.svelte for re-registration)
- /home/user/OmniStax/omnistax-web/src/lib/explorer/library.svelte.ts (with FindTextbook.svelte, Explorer.svelte, nav.svelte.ts for the swap)
