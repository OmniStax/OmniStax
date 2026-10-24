#!/usr/bin/env python3
"""Compare a translated page with its source page: what must be byte for byte, is it?

    python3 -I omnistax-content/tools/translation_parity.py "omnistax-content/College Physics 2e" \\
        "omnistax-content/College Physics 2e/translations/zh-CN" ch02/2.1 [ch02/2.2 ...]
    python3 -I omnistax-content/tools/translation_parity.py SOURCE TARGET --chapter ch02

For each page it reports, as `file: finding`, one line per difference:

- text.html: the sequence of tags with their attributes (every `id`, `class`,
  `href`, `src`, `data-*`, the eyebrow texts) must be identical; a tag added,
  dropped, reordered or re-attributed is a finding. Translated attributes
  (`alt`, `data-original-caption`) are compared only for presence.
- section.json: every field translate.md item 5 lists as kept must be equal;
  a translated string field that is still identical to the source and contains
  Latin letters is reported as `untranslated?` (a short label like "SI" is
  often right; read the list).
- figures.js: the code outside string literals, template literals and comments
  must be identical; where it differs, the first differing line is printed.
  A forced scenario (a collapsed plural branch) differs here on purpose: say
  so in the chapter's config.md.

A page with no finding prints `ok`. The exit is 1 when a tag or kept-field
finding exists, 0 otherwise (`untranslated?` and figures.js code findings are
reported, not failed, since both can be right).
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import sys
from html.parser import HTMLParser
from typing import Any

KEPT_SECTION = ("id", "module", "chapter", "coverage", "exercise_concepts")
KEPT_FIGURE = ("id", "kind", "number", "folds", "originals", "widths", "draws", "conventions", "facts")
KEPT_EXERCISE = ("id", "source_id", "source_section", "source_number", "origin", "kind", "bloom", "place", "cite")
KEPT_ANSWER = ("type", "value", "unit", "tol", "part", "correct", "generated_by")
KEPT_PART = ("part", "value", "unit", "tol")
KEPT_FOOTNOTE = ("id", "kind", "number", "figure")
KEPT_REFERENT = ("id", "figures")
TRANSLATED_ATTRS = {"alt", "data-original-caption", "title", "aria-label"}
LATIN = re.compile(r"[A-Za-z]{3,}")


BLOCKS = {"section", "p", "h1", "h2", "h3", "h4", "h5", "ul", "ol", "li", "table", "thead", "tbody", "tr", "td", "th",
          "figure", "figcaption", "div", "img", "blockquote", "pre", "dl", "dt", "dd", "hr", "br", "aside", "details", "summary"}
EYEBROW_KEPT = re.compile(r"^(Figure|Sim)\b")


class Shape(HTMLParser):
    """The block tags of a page in order, each with the multiset of inline tags inside it.

    Chinese word order moves a span within its sentence, so inline tags are
    compared as a multiset per block, never as a sequence (translate.md 5:
    'a span is never dropped, added or moved to another block').
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.items: list[str] = []
        self._inline: list[list[str]] = []
        self._eyebrow = 0
        self._stack: list[str] = []

    def _attr(self, attrs: list[tuple[str, Any]]) -> str:
        return " ".join(f"{k}" if k in TRANSLATED_ATTRS else f"{k}={v}" for k, v in sorted(attrs))

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Any]]) -> None:
        self._stack.append(tag)
        if tag in BLOCKS:
            self._flush()
            self.items.append(f"<{tag} {self._attr(attrs)}>")
            self._inline.append([])
        else:
            if self._inline:
                self._inline[-1].append(f"<{tag} {self._attr(attrs)}>")
            else:
                self.items.append(f"<{tag} {self._attr(attrs)}>")
        if tag == "span" and any(k == "class" and "eyebrow" in (v or "") for k, v in attrs):
            self._eyebrow = len(self._stack)

    def _flush(self) -> None:
        if self._inline:
            inl = self._inline.pop()
            if inl:
                self.items.append("inline:" + " ".join(sorted(inl)))

    def handle_endtag(self, tag: str) -> None:
        if tag in BLOCKS:
            self._flush()
            self.items.append(f"</{tag}>")
        if self._eyebrow and len(self._stack) == self._eyebrow:
            self._eyebrow = 0
        if self._stack and self._stack[-1] == tag:
            self._stack.pop()

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, Any]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag in BLOCKS:
            self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        if self._eyebrow and data.strip() and EYEBROW_KEPT.match(data.strip()):
            (self._inline[-1] if self._inline else self.items).append(f"eyebrow:{data.strip()}")


def shape(path: str) -> list[str]:
    p = Shape()
    p.feed(open(path, encoding="utf-8").read())
    p._flush()
    return p.items


def html_findings(src: str, dst: str) -> list[str]:
    a, b = shape(src), shape(dst)
    if a == b:
        return []
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == "equal":
            continue
        if op == "replace" and i2 - i1 == 1 and j2 - j1 == 1 and a[i1].startswith("inline:") and b[j1].startswith("inline:"):
            sa, sb = a[i1][7:].split(" <"), b[j1][7:].split(" <")
            from collections import Counter
            ca, cb = Counter(sa), Counter(sb)
            out.append(f"inline tags of a block differ: missing {list((ca - cb).elements())[:4]} extra {list((cb - ca).elements())[:4]}")
        else:
            out.append(f"blocks {op}: source {a[i1:i2][:3]} → translation {b[j1:j2][:3]}")
        if len(out) >= 12:
            out.append("…")
            break
    return out


def kept_equal(name: str, a: Any, b: Any, keys: tuple[str, ...], out: list[str]) -> None:
    for k in keys:
        if a.get(k) != b.get(k):
            out.append(f"kept field {name}.{k} differs: {json.dumps(a.get(k), ensure_ascii=False)[:60]} → {json.dumps(b.get(k), ensure_ascii=False)[:60]}")


def untranslated(name: str, a: Any, b: Any, out: list[str]) -> None:
    if isinstance(a, str) and a == b and LATIN.search(a):
        out.append(f"untranslated? {name}: {a[:70]!r}")


def section_findings(src: str, dst: str) -> tuple[list[str], list[str]]:
    a, b = json.load(open(src, encoding="utf-8")), json.load(open(dst, encoding="utf-8"))
    hard: list[str] = []
    soft: list[str] = []
    kept_equal("section", a, b, KEPT_SECTION, hard)
    for field in ("title", "short", "lead", "summary_html", "notes", "exercises_lead", "exercise_notes"):
        untranslated(field, a.get(field), b.get(field), soft)
    for i, (x, y) in enumerate(zip(a.get("objectives", []), b.get("objectives", []))):
        untranslated(f"objectives[{i}]", x, y, soft)
    if len(a.get("objectives", [])) != len(b.get("objectives", [])):
        hard.append("objectives count differs")
    for table, keys, label in (("figures", KEPT_FIGURE, "figures"), ("exercises", KEPT_EXERCISE, "exercises"),
                               ("footnotes", KEPT_FOOTNOTE, "footnotes"), ("referents", KEPT_REFERENT, "referents")):
        ra, rb = a.get(table, []), b.get(table, [])
        if [r.get("id") for r in ra] != [r.get("id") for r in rb]:
            hard.append(f"{table} ids differ: {[r.get('id') for r in ra]} → {[r.get('id') for r in rb]}")
            continue
        for x, y in zip(ra, rb):
            nm = f"{label}[{x.get('id')}]"
            kept_equal(nm, x, y, keys, hard)
            if table == "figures":
                untranslated(nm + ".original_caption", x.get("original_caption"), y.get("original_caption"), soft)
            if table == "referents":
                untranslated(nm + ".label", x.get("label"), y.get("label"), soft)
            if table == "footnotes":
                untranslated(nm + ".html", x.get("html"), y.get("html"), soft)
            if table == "exercises":
                untranslated(nm + ".prompt", x.get("prompt"), y.get("prompt"), soft)
                untranslated(nm + ".changes", x.get("changes"), y.get("changes"), soft)
                ax, ay = x.get("answer") or {}, y.get("answer") or {}
                kept_equal(nm + ".answer", ax, ay, KEPT_ANSWER, hard)
                for f in ("hint", "solution"):
                    untranslated(nm + f".answer.{f}", ax.get(f), ay.get(f), soft)
                if len(ax.get("options", []) or []) != len(ay.get("options", []) or []):
                    hard.append(f"{nm}.answer.options count differs")
                for i, (o1, o2) in enumerate(zip(ax.get("options", []) or [], ay.get("options", []) or [])):
                    untranslated(f"{nm}.answer.options[{i}]", o1, o2, soft)
                pa, pb = ax.get("parts", []) or [], ay.get("parts", []) or []
                if len(pa) != len(pb):
                    hard.append(f"{nm}.answer.parts count differs")
                for p1, p2 in zip(pa, pb):
                    kept_equal(nm + ".answer.parts", p1, p2, KEPT_PART, hard)
    return hard, soft


STRINGS = re.compile(r"""('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(/\*[\s\S]*?\*/|//[^\n]*)""")


def code_only(path: str) -> list[str]:
    text = open(path, encoding="utf-8").read()
    text = STRINGS.sub(lambda m: '""' if m.group(1) else "", text)
    return [ln.rstrip() for ln in text.splitlines() if ln.strip()]


def figures_findings(src: str, dst: str) -> list[str]:
    a, b = code_only(src), code_only(dst)
    if a == b:
        return []
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
        if op == "equal":
            continue
        out.append(f"code {op}: {' | '.join(a[i1:i2][:2])[:110]} → {' | '.join(b[j1:j2][:2])[:110]}")
        if len(out) >= 8:
            out.append("…")
            break
    return out


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("source")
    p.add_argument("target")
    p.add_argument("pages", nargs="*", help="chNN/N.M, chNN/intro …")
    p.add_argument("--chapter", help="every page of this chapter directory")
    args = p.parse_args(argv)
    pages = list(args.pages)
    if args.chapter:
        ch = os.path.join(args.target, args.chapter)
        pages += [f"{args.chapter}/{d}" for d in sorted(os.listdir(ch)) if os.path.isdir(os.path.join(ch, d))]
    failed = False
    for page in pages:
        s, t = os.path.join(args.source, page), os.path.join(args.target, page)
        lines: list[str] = []
        if os.path.exists(os.path.join(s, "text.html")):
            f = html_findings(os.path.join(s, "text.html"), os.path.join(t, "text.html"))
            failed |= bool(f)
            lines += [f"text.html: {x}" for x in f]
        if os.path.exists(os.path.join(s, "section.json")):
            hard, soft = section_findings(os.path.join(s, "section.json"), os.path.join(t, "section.json"))
            failed |= bool(hard)
            lines += [f"section.json: {x}" for x in hard + soft]
        if os.path.exists(os.path.join(s, "figures.js")):
            lines += [f"figures.js: {x}" for x in figures_findings(os.path.join(s, "figures.js"), os.path.join(t, "figures.js"))]
        print(f"{page}: {'ok' if not lines else ''}")
        for ln in lines:
            print(f"  {ln}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
