# Understanding Linear Algebra

The OmniStax edition of *Understanding Linear Algebra*, from David Austin (Grand Valley State University).
The app that reads it, the shared tools and the rules for building a book are in [OmniStax/OmniStax](https://github.com/OmniStax/OmniStax); this folder sits in that repository's `omnistax-content/` (a book is normally its own repository listed in `omnistax-content/books.json`, which `npm run books` clones; this one is to be moved there).

## Licence

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), © David Austin. Source: https://understandinglinearalgebra.org, PreTeXt at https://github.com/davidaustinm/ula (cloned read-only into `source/ula/`, gitignored).

## Building from the source

```
python3 tools/convert.py --index --all     # every source.md, toc.md, modules.json and media/
```

`PREFIG=<path to prefig>` renders the PreFigure diagrams the book ships no SVG for (`pip install prefig`; `prefig init` once).
