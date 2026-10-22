# Prompt: translating a book

What an agent translating a book, a chapter or a section needs: the terminology authority, the fidelity rule and its few exceptions, exactly which strings of each file are translated and which are kept byte for byte, the glossary, the provenance, and the check. Root item 30 points here. A translation is a book of its own that keeps every id of its source, so the same place can be opened in either edition; nothing in this prompt changes what the source says.

## Inputs

The root `RULES.md`; the source book's `RULES.md` and `COLOR.md`; the translated book's `RULES.md` (its "Translation" section), `glossary.<tag>.json` and `translation-notes.md`; the translated chapter's `config.md`; the source section's `source.md` and `plan.md`, read for meaning only and never copied; and the section's four files as the scaffold copied them. Read the glossary before the first sentence.

## 1. Folder, id and title

1. A translation lives in `omnistax-content/<Source folder> (<tag>)/`, where `<tag>` is the BCP 47 tag of its language (`College Physics 2e (zh-CN)`). The pair sorts together and the app finds it as it finds any folder with a `book.json`.
2. Its id is `<source id>-<tag lowercased>` (`college-physics-2e-zh-cn`). The id names URL routes, the reader's storage keys and the offline release, so it stays lowercase ASCII with hyphens.
3. Its `title` is the title in the target language, as a reader of that language would look the book up; an edition marker is written the way that language writes one (`（第2版）`, not `2e`).
4. `language` is the tag, `translation_of` the source's id, and `translation` the provenance record of item 9.
5. The folder is made by `omnistax-content/tools/scaffold_translation.py`, never by hand: it copies what is translated, leaves out what is not, and writes the new files empty. Its docstring says exactly what it copies.
6. Every id is the source's: chapter directories, section ids, concept ids, form ids, symbol keys, type ids, exercise kind ids, exercise ids, figure ids, referent ids, footnote ids, derivation ids and every `id` of `text.html`. The content check compares them with the source and an extra or missing one is an error.

## 2. Terminology

1. Use the field's standard term, never a coined one. When unsure, look the term up before writing it; when no source can be reached, say so in the glossary entry's `note` and in `translation-notes.md`, and the term stays to be confirmed.
2. For Chinese the authority is the national standard terminology of 全国科学技术名词审定委员会, searched at 术语在线 (https://www.termonline.cn/), in the subject's own list (物理学名词, 化学名词, 数学名词, 计量学名词). Units and their names follow GB 3100–3102 (国际单位制及其应用; 量和单位), and measurement words follow JJF 1001 (通用计量术语及定义). Where the publisher has an official translation of the book, its terms come first and `translation.authority` names it; OpenStax publishes no Chinese College Physics, so the termonline entry is cited.
3. Where the authority lists two forms, take the one it marks as preferred (规范名), never the 又称 or 曾称; write the authority's characters (黏度, not 粘度).
4. A term, once chosen, is written identically everywhere: prose, concept `name`, `terms` and `statement`, variable meanings, type labels, figure labels, hover names, readouts and exercises. It is in the glossary before it is used.
5. A term already in the glossary is never decided again. A section agent that meets a new term adds it with `"pending": true` and its section id; the orchestrator resolves it before the chapter is checked.
6. A label of the book's own apparatus (Check Your Understanding, Making Connections, Take-Home Experiment) has no authority. Render it once in the plain register of the target language's textbooks, record it in the glossary with `authority: "book"`, and list it for the owner.
7. Names of people keep the standard rendering where one exists (牛顿, 居里) and the original otherwise; product and place names follow the same test. Element names are the authority's (氢, 氦).

## 3. Fidelity

1. Same tone, register, sentence order and paragraphing as the source. A sentence of the source is a sentence of the translation, in the same place; two sentences are never merged and one is never split unless the target grammar forces it.
2. Nothing is added, dropped, summarised, explained or improved. The book's humour, examples, numbers, names, units and asides stay; an error of the book stays and its correction stays a correction (root item 13).
3. The book's emphasis stays where it is: `<strong>`, `<em>` and every span wrap the translated words that carry the same meaning, however the order of the words changes.
4. Numbers, symbols and units are kept as printed. A digit group separator follows the target language only where its standard requires it (Chinese keeps 299,792,458 as printed); decimal points never change.
5. Punctuation follows the target language in prose (Chinese full-width ，。：；“”（）), ASCII inside math and code.
6. The only exceptions are the forced scenarios of item 4. Anything that is not one of them is translated as the source is.

## 4. Forced scenarios

A forced scenario is a place where a faithful translation is impossible as the source stands. Each is resolved the plainest way the target language allows and is written down twice: a row of the forced-scenario table in the translated chapter's `config.md`, and an entry in `translation-notes.md` at the book's root (file, span or line, what was done, why). Nothing else may differ from the source.

1. English grammar in figure code: plural branches (`z === 1 ? ' electron' : ' electrons'`), `a`/`an` from a regular expression, ordinal words built by rule. The branch collapses to the one target form; the code around it stays.
2. Wordplay, a pun or a mnemonic that works only in English. Translated for meaning, the English kept in parentheses where the passage turns on it.
3. A sentence about English itself: spelling, an abbreviation's letters, the origin of an English word. Kept with the English word in parentheses.
4. A unit, idiom or cultural reference with no equivalent. The unit keeps its symbol and takes the target name in prose (ft, 英尺); an idiom is translated for meaning.
5. A collision: the standard translation of one term is also the standard translation of another the book distinguishes (power and the power of a lens). The more specific term takes the authority's qualified form, and both are glossary rows.
6. An app label the checker reads: a figure's eyebrow (`Figure 1.10`, `Sim`) is chrome, matched exactly against its row, and stays as written until the app localises it. A citation of a figure in the prose (`Figure 1.3`) is translated (`图 1.3`), and is plain text until the app's figure link pattern reads the target word; this is recorded once per book, not per citation.
7. A string length the layout cannot carry (a slider name that wraps the track below 120 px, root rule 26.12). Use the standard short form where the authority gives one; otherwise keep the full term and let the track take its own line.

## 5. What is translated, and what is kept

Read off `College Physics 2e/ch01/1.1` and `docs/content-format.md`. Translated means every reader-visible string of the field; kept means byte for byte. A field not named here does not occur in the source and is translated if a reader sees it and kept otherwise.

### `book.json`

| translated | kept |
| --- | --- |
| `title` | `id` (the translation's own), `publisher`, `authors`, `source_url`, `sources`, `copyright`, `license`, `license_url`, `openstax`, `highlights`, `chapters` (cut to the chapters translated, in source order), `intro`, `summary`, `colours` |
| `types[].label`, `types[].dimension` where it is a word | `types[].id`, `types[].dimension` where it is a unit |
| `exercise_kinds[].label` | `exercise_kinds[].id` |
| `exercise_sources[].title`, `.short` only where the source has an official title in the target language | `exercise_sources[]` otherwise, and `.id`, `.author`, `.url`, `.license`, `.license_url` |
| `concepts[].name`, `.terms`, `.statement` | `concepts[].id`, `.kind`, `.section`, `.symbol`, `.type` |
| `forms[].condition` | `forms[].id`, `.latex`, `.ktex`, `.section`, `.anchor`, except a `\text{…}` word inside them, which is translated |
| `sheets[].title` | `sheets[].id`, `.kind`, `.file` |
| | `symbols` (every field), `concept_prereqs` |
| new: `language`, `translation_of`, `translation` | |

The `concepts` table is copied whole, since every id is compared. Concepts of chapters not yet translated keep their English name and statement, and `translation-notes.md` says so.

### `<chapter>/chapter.json`

| translated | kept |
| --- | --- |
| `title`, `sections[].title`, `variables[].meaning` | `id`, `dir`, `intro`, `summary`, `sections[].{id,module,slug}`, `variables[].{sym,concept,type,ref,unit,section,anchor,redefines}` |

### `<section>/section.json`

| translated | kept |
| --- | --- |
| `title`, `short`, `lead`, `objectives[]`, `summary_html`, `notes`, `exercises_lead`, `exercise_notes` | `id`, `module`, `chapter` |
| `figures[].original_caption`, `figures[].withheld` | `figures[].{id,kind,number,folds,originals,widths,draws,conventions,facts}`, existing `figures[].ai` entries |
| `referents[].label` | `referents[].{id,figures}` |
| `exercises[].prompt`, `.changes`, `.tag`, `.figure.{alt,caption}`, `answer.{options[],hint,solution}`, `answer.parts[].hint` | `exercises[].{id,source_id,source_section,source_number,origin,kind,bloom,place,cite}`, `.figure.src`, `answer.{type,value,unit,tol,part,correct,generated_by}`, `answer.parts[].{part,value,unit,tol}` |
| `footnotes[].html` | `footnotes[].{id,kind,number,figure}` |
| `derivations[].what`, `.source`, node `then.why`, step `cap`, fact `text`, `src` and `note` words, every `\text{…}` in their TeX | `derivations[].id`, every `tex` outside `\text{…}`, `\mk{key}` keys, `uses`, `step`, `num`, `map` |
| | `coverage`, `exercise_concepts` |
| `ai`: the translator appended as a maker (item 9) | `built`: set to the translation date |

### `<section>/text.html`

| translated | kept |
| --- | --- |
| every text node of the prose, headings (`<h2>`–`<h4>`, the worked example's `Example 1.1 · …`, `Strategy`, `Solution`, `Discussion`), table cells and table heads, a boxed note's eyebrow (`<div class="eyebrow">Models, Theories, and Laws</div>`), a table's eyebrow, a figure's `<figcaption>` text after its eyebrow and a sim's `sim-head` text after its eyebrow | every tag and its nesting, the `<section id>` blocks and their order, every `id`, `class`, `href`, `src`, `data-concept`, `data-ref`, `data-type`, `data-figure`, `data-original`, `data-width`, `data-original-width`, `data-place` |
| `alt`, `data-original-caption` | a figure's `<span class="eyebrow">` (`Figure 1.10`, `Sim`; item 4.6) |
| words inside `\text{…}` in math (`\text{volume of stack}`) | all LaTeX outside `\text{…}`, every `\k` macro, SI and other unit symbols inside `\text{…}` (`\text{m}`, `\text{kg}`, `\text{in.}`), `<sup class="fn" data-note>` markers, `&#36;` and `＄` |
| the photo credit's words (`credit:`) | the credit's names (`Tinh tế Photo/Flickr`) |

A span wraps the translated words that name its concept or referent; a span is never dropped, added or moved to another block, and the `ost ids` list of the section is identical before and after.

### `<section>/figures.js`

Code is kept: every identifier, id (`sim-atom-model`), class, `cls`, `key`, colour call (`F.el('e-')`, `C('t')`), number, layout constant, symbol table (`SYMB`), regular expression that is not grammar, and every comment. Translated are only the strings a reader sees:

1. `ctl`, `choice` and `select` names: the words of `label` (`'\\text{electrons}'`, `'\\text{mantissa } m'`; a `\k` macro label stays), option `label`s that are words, and `aria`.
2. `headline(...)` and `topline(...)` sentences, `v.headline` and `S.headline`.
3. `text(ctx, '…')` and `label(ctx, '…')` strings, legend lines, hover `name`s, `note` sentences and the `small` line of a readout.
4. The words of a readout's `\text{…}`; its TeX otherwise.
5. Display arrays of words (`NAMES`, `WORDS`, `ORD` in 1.1) and unit words; a unit symbol stays.
6. Grammar built from English (plural branches, `an`/`a`, ordinal rules) collapses to the target form: a forced scenario of item 4.1, recorded.

A translated string keeps its `$…$` runs and macros so the type colours still reach it. `node --check figures.js` passes after every edit.

### Not copied, and new

Not copied: `source.md`, `plan.md`, `exploration.md`, `book-rows.json` (ost seeds a fresh one on its first staged write), `concept-migration.json`, `media/` (the app serves the source's media for a translation, so `text.html` and the rows keep the source's `/media/…` paths), the book's `tools/` except `mergebook.py` and `merge-state.json`, which `ost` needs to stage a concept, and the book's own `intro/` and `summary/` until they are translated. Copied as they are: `COLOR.md` and every chapter's `COLOR.md`. New per book: `RULES.md` (the source's, with a "Translation" section), `LOG.md`, `translation-notes.md`, `glossary.<tag>.json`. New per chapter: `config.md`, holding the settings of the translation pass and the forced-scenario table.

## 6. The glossary

`glossary.<tag>.json` at the translated book's root, named by `translation.glossary`, one row per term, sorted by `source`:

```json
{
  "language": "zh-CN",
  "authorities": [
    { "id": "termonline", "name": "全国科学技术名词审定委员会 术语在线", "url": "https://www.termonline.cn/" }
  ],
  "terms": [
    { "source": "displacement", "target": "位移", "authority": "termonline", "url": "<the entry's own page>", "concept": "displacement", "note": "" }
  ]
}
```

1. `source` is the term as the book writes it, lowercase unless it is a name or a label; `target` the chosen term; `authority` an id of `authorities`; `url` the entry's own page where one can be linked; `concept` the concept id it names, where it names one; `note` why, where the choice needed a reason (a collision, a preferred form, an authority that could not be reached).
2. Type labels, exercise kind labels and the book's apparatus labels are rows too, so the UI-adjacent words of the book are fixed in one place.
3. A row whose authority could not be reached carries `"confirm": "termonline"` (or the authority's id), and a row of the book's own labels `"confirm": "owner"`; the field is taken out when the term is confirmed and its entry URL written.
4. A pending row carries `"pending": true` and `"section"`; it is resolved, or the term re-decided across every section, before the chapter is checked.
5. Every `concepts[].name` of a translated chapter is the `target` of a row.

## 7. Order of work

1. The scaffold, then the glossary of the chapter and the book-level labels: `title`, `types[].label`, `exercise_kinds[].label`, `sheets[].title`, the chapter's concepts and its `chapter.json`. `concepts` are written with `ost set <translation id> concepts <concept id> --chapter N '{"name": …}'`; `chapter.json` rows with `ost set <translation id> sections|variables <row> --chapter N`; the book's and the chapters' own `title`, `types`, `exercise_kinds` and `sheets`, which no chapter stages, with `scaffold_translation.py labels`. `book.json` is never edited by hand.
2. Then the sections, one agent each, in parallel: `section.json`, `text.html`, `figures.js` and nothing else. A `section.json` may be rewritten whole once from the copy, then corrected row by row with `ost set`.
3. Then the orchestrator resolves pending glossary rows, greps every section for each `target` and each superseded form, and runs item 8 on the chapter.

## 8. Verification, per section

1. `npm run check:content -- --books <translation id>` in `omnistax-web`: no errors. Warnings are read and either fixed or listed in `LOG.md`.
2. Parity with the source clean: the same ids everywhere (item 1.6); the content check reports every difference as an error.
3. `node --check` on every `figures.js` the section touched.
4. `npm run dev`, open the page, and read every headline, label, readout and caption once at the sliders' default and extremes: nothing clipped, no English left that the tables above translate.
5. A grep of the section for every glossary `source` term left untranslated, and for every superseded target.

## 9. Provenance

1. `book.json` `translation`: `translator`, the model's API id (`claude-opus-5-5`) or a person; `effort`, the model's effort; `date`, the ISO date; `glossary`, the glossary's file name; `authority` and `authority_url`, where a published translation's terms were followed; `source_commit`, the commit of the source the scaffold copied, and `source_release` where the offline catalog names one.
2. Every section the translator touches appends itself to `ai.text`, and to `ai.figures` where it translated `figures.js`, as a maker `{"model": <API id>, "effort": …}` after the source's makers, unless it is already listed (root item 17). A figure row with its own `ai` list gains `{"model", "effort", "part": "翻译"}`, the part written in the book's language.
3. `built` is the translation date.
4. `LOG.md` records each pass: what was translated, by which model at which effort, the forced scenarios it added, the pending terms it raised, and the checker's result.

## 10. Review

The translation is reviewed for naturalness by a human reader of the language after it is built, the owner's humanizer pass. That review is deferred to the owner and is not part of an agent's pass; `LOG.md` says it is outstanding until the owner records it. A reviewer's change of a term is a glossary change first and then a change everywhere the term stands.
