# Prep: one chapter, before its sections are built in parallel

You own `$BOOK/chNN/` except the section folders' `plan.md`, `text.html`, `figures.js`, `section.json`, and `book.json` only through `ost merge`. Model: <data model>.

1. `python3 tools/convert.py N` (every module, the introduction included). Read every `source.md`.
2. `chNN/exploration.md`: module table with counts; figure and table numbers in book order; what is new; sketches to replace and photographs; notes and PhET items; exercises that belong to another section; the chapter's answer to rule 23.
3. `chNN/config.md` (one line per setting, status line) and `chNN/COLOR.md` (what each section binds; the families of rule 7 it uses).
4. `chNN/chapter.json`: id, dir, title, intro, all sections, then variables, equations, glossary per section, no anchors. Write it whole once; correct with `ost set`.
5. `chNN/book-rows.json` then `ost merge <book> N`: symbols with `\k` macros for typed symbols the text writes (never restage an existing one); concepts per section (testable units, kinds idea/result/skill, canonical ids, why and evidence in the book's voice, eq where an equation states it; heavy section six to nine, thin two or three); prereq edges into built chapters and within the chapter; placeholders only inside the chapter.
6. Checks: `ost check <book>`, `npm test`.

Report: concept ids per section (id · kind · why), symbols added, equation ids, numbers the sections use, anything a section agent must know.
