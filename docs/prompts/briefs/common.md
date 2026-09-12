# Common brief for a build job

Fill the angle brackets. Every agent of the job reads this first.

- Repository `/home/flober/repos/OmniStax`, main checkout. Never run a git command that writes; the orchestrator commits. Other agents work in this checkout at the same time: touch only what your task brief says you own.
- Book: `omnistax-content/<Book Title>/` (`$BOOK`), id `<book-id>`, bundle at `$BOOK/source/…` (read-only). Convert a module with `python3 tools/convert.py <N.M>` from `$BOOK`.
- Tables: read and write them only through `python3 omnistax-content/tools/ost.py` (`show`, `rows`, `find`, `add`, `set`, `del`, `merge`, `log`, `check`, `ids`; reference `omnistax-content/tools/README.md`). Never open `book.json` or a `chapter.json` to search it.
- App: `omnistax-web/`, with `export PATH=/home/flober/.nvm/versions/node/v20.20.2/bin:$PATH`; `OMNISTAX_BOOKS=<book-id> npm run check:content`, `OMNISTAX_BOOKS=<book-id> ./node_modules/.bin/astro build --outDir <your scratch>/dist` (never the default `dist`; retry once after a minute on a clobbered cache). Pages at `/<book-id>/<chapter dir>/<section>/`.
- Scratch: `<scratch dir>/<your task>/`; scripts longer than a line go in a file there. Port: the one your launch message gives.
- Read (root rule 27): root `RULES.md`; `$BOOK/RULES.md` and `COLOR.md`; the chapter's `config.md` and `COLOR.md`; your `source.md`; the template section the book's rules name for your kind of page; `docs/prompts/interactive-figures.md` if you build figures; `ost show` for the book, chapter and section.
- Standing decisions for this job: <one line each: check-in policy per rules 2, 5, 15; what is built; the model name for `ai`; `built` date>.
- Report under 30 lines: what you built with counts, `## Wanted at chapter level` copied exactly, anything wrong in the rules or the app.
