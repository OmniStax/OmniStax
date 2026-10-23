# Internationalization: handoff (2026-10-22)

Issue #42. The work is on branch `claude/modest-meitner-6xqa4p`, fifteen
commits from `f639e6d` to `a9e6af1`, plus the owner's `3518eb3` adding the
translation skill. This note carries what was built, how it was verified,
the decisions taken on the owner's behalf, and what is left, so a session
that did not watch the work can pick it up. The design it was built from is
in `i18n-plan.md` beside this file.

## What was built

**The UI catalog** (`omnistax-web/src/lib/i18n/`). Every platform text the
app shows lives in `en/<area>.ts`, one file per part of the app, 1,510 keys,
merged flat; `zh-CN/` has the same keys, typed against `en`, so a missing
key fails `npm run check`. Components read `i18n.t(key, params)`; pure
modules read `t()` or `tIn(locale, …)`; templates take `{name}` and
`{n, plural, one {…} other {…}}` through `Intl.PluralRules`. Commands
re-register when the language changes so the palette searches translated
labels. What the build writes beside a book's prose (figure, notes,
previous/next, the credit, the section summary heading) is rendered in the
book's language, not the reader's. `npm run lint:i18n` lists text still
written in place (`--summary`, `--unused`); `scripts/i18n-allow.txt` holds
the exceptions, each with a reason. `src/lib/i18n/GLOSSARY.md` fixes the
product terms every catalog writes the same way. The `en/` files are the
exhaustive list of platform texts issue #46 asked for.

**The reader's language.** Chosen in this order: `?lang=` on the address
(stored, then dropped from the address), the persisted `omnistax-lang`,
the browser's best match against the catalogs, English. Settings has a
Language row (System / English / 中文（简体）); the palette has "Change
language"; the choice rides in the reader-profile backup. The shell root
carries `lang` of the UI language; every article carries `lang` of its
book; a book's pages carry the book's language on `<html>`.

**Translated books.** `book.json` gains `language` (BCP 47, `en` when
absent, the checker warns), `translation_of` and a `translation`
provenance block (translator, effort, date, authority, glossary, source
commit). A translation is a book of its own under
`omnistax-content/<Title>/translations/<tag>/` with id `<source-id>-<tag>`, keeps
every id of its source, and the content check compares the chapter dirs
and the section, concept, form, symbol, type, exercise, figure and span
ids, one error per set that differs. It has no `media/`: image sizes and
the served images come from its source. `library.json` carries `language`
and `translationOf`; Find a textbook lists editions under their source;
a book row's menu offers "Open in <language>" and the palette "Book:
switch language", both opening the same section in the sibling edition.

**The rules.** `docs/prompts/translate.md` (RULES.md item 30): standard
terms from the field's authority, recorded in the book's glossary before
use; the same tone, register, sentence order and paragraphing; nothing
added or dropped except in a forced scenario, each written down in the
chapter's `config.md` and the book's `translation-notes.md`; exactly which
fields are translated and which stay. `omnistax-content/tools/
scaffold_translation.py` makes the folder.

**The pilot.** `omnistax-content/College Physics 2e/translations/zh-CN/`
(`college-physics-2e-zh-cn`, 大学物理（第2版）), chapter 1 only: the
introduction and 1.1–1.4, every field, text node, figure string and
exercise, with `glossary.zh-CN.json` (253 terms) and 22 forced scenarios.
Its `LOG.md` records the four passes.

## How it was verified

From `omnistax-web`, all at the final commit:

- `npm test`: 981 pass, 0 fail.
- `npm run check`: 0 errors, 0 warnings.
- `npm run lint:i18n`: no UI text outside the catalog; `--unused`: every
  key named under `src/`.
- `npm run check:content`: no errors on all six books; the five English
  books warn that `language` is not declared.
- `OMNISTAX_BOOKS=college-physics-2e,college-physics-2e-zh-cn npm run
  build`: 286 pages; the pilot's pages carry `<html lang="zh-CN">` and
  `<article lang="zh-CN">`, `dist/media/ch01` holds the source's 21
  images, `library.json` lists both editions.
- A Playwright run against the built site: `?lang=zh-CN` switches the
  shell, the Settings row shows, the book-row menu offers the Chinese
  edition and opens the same section in it, System returns to the
  browser's language.

## Decisions taken on the owner's behalf

- Mastery and practice stay per book; they are not merged across
  editions through the shared concept ids.
- The pilot's title is 大学物理（第2版）: there is no official OpenStax
  translation, and Chinese marks editions that way rather than "2e".
- Figure eyebrows ("Figure 1.3", "Sim") stay English because the checker
  matches them exactly; prose citations read 图 1.3 and do not link yet.
- `answer.unit` and `answer.parts[].part` stay English per the rules,
  though readers may see them.
- The photo credit label is 来源 everywhere; names stay as printed.
- Numeric placeholders stand against their measure word without a space
  (第{n}页); placeholders carrying Latin values take spaces (移除 {name}).
- The front page and 404 stay English for every reader for now; a
  per-language front page is a route passing its locale to `aboutHtml`.

## Left to do

1. **Confirm the terms at termonline.cn.** The build environment's
   network policy blocked the site, so 153 glossary rows carry
   `confirm: termonline` and 8 book labels `confirm: owner`. The weakest,
   per the translators: 百分不确定度, 换算因子, 尾数, 近代物理学, 劲度系数,
   扫描隧穿显微镜, 放射性年代测定, 电子组态. Allow `www.termonline.cn` under
   the environment's Network access first. The translation skill under
   `.claude/skills/translation-skill` can run the verification.
2. **Confirm the UI glossary** (`src/lib/i18n/GLOSSARY.md`): 资源管理器,
   编组, 窗格, 练习轮, 掌握度, 新鲜度 and the rest.
3. **Humanizer review** of the five translated pages and the zh-CN
   catalog, as `LOG.md` defers it.
4. **Read-through in `npm run dev`** of the pilot's sims: nobody has
   looked at the Chinese headlines and readouts on screen for clipping.
5. **Declare `language: "en"`** on the five English books to silence the
   new warning (through `ost` or `scaffold_translation.py labels`, never by
   hand).
6. Smaller: localise the figure eyebrows and teach the figure-link pattern
   图 N.M; make `answer.unit` and part labels translatable if wanted; a
   `/zh-CN/` front page; `.claude/skills/caveman` is a symlink that
   resolves only on the owner's machine.
