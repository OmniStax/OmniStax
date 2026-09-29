#!/usr/bin/env python3
"""Lint the AI-written, reader-facing text of a book against the voice rule (RULES.md §17).

Reads a book folder and scores every piece of text the AI wrote for the reader:
section leads (where `ai.text` is set), sim-head captions, `generated_by: ai`
solutions, hints, and concept `why` lines. Each item is flagged for passive
constructions, meta or reflective phrasing, hedging, and length.

    voicelint.py "College Physics 2e"                   per-chapter counts, for splitting a sweep
    voicelint.py "College Physics 2e" --list ch02 ch03  every flagged item of those chapters
    voicelint.py "College Physics 2e" --list --all      every item, flagged or not
    voicelint.py "College Physics 2e" --min 3            count or list only items scoring 3 or more
    voicelint.py "College Physics 2e" --json            the flagged items as JSON, for a script
"""
from __future__ import annotations

import argparse
import glob
import html
import json
import os
import re
import sys
from dataclasses import asdict, dataclass

Kind = str  # lead | caption | answer | hint | why

# The most words a piece of each kind should need, and the most any one sentence should.
LIMITS: dict[Kind, int] = {"lead": 80, "caption": 80, "answer": 150, "hint": 30, "why": 70}
SENTENCE_LIMIT = 40

PASSIVE = re.compile(
    r"\b(?:is|are|was|were|be|been|being|gets|got)\s+(?:\w+ly\s+)?"
    r"(?!(?:need|seed|speed|feed|bleed|breed|indeed|exceed|proceed|succeed)\b)"
    r"(?:\w+ed|shown|given|drawn|taken|seen|known|made|set|kept|held|found|chosen|written|left|put|built|told|meant)\b",
    re.I)
META = [
    r"\bhere we\b", r"\bwe (?:see|saw|chose|choose|pick|show|use|let)\b", r"\bnotice how\b", r"\bnote how\b",
    r"\bthis shows that\b", r"\bit is worth\b", r"\bworth noting\b", r"\bwhich is why the (?:figure|sim|simulation)\b",
    r"\bthe reader\b", r"\bthis (?:figure|sim|simulation|widget|demo|section|page|card)\b",
    r"\bthe (?:figure|sim|simulation|widget|demo)\b", r"\blet(?:'s| us)\b", r"\bon purpose\b", r"\bdeliberately\b",
    r"\bis meant to\b", r"\bin order to (?:show|make|keep)\b", r"\bwalks? (?:you )?through\b", r"\btake over\b",
    r"\bas (?:we|you) can see\b", r"\bkeep in mind\b", r"\bimportantly\b", r"\binterestingly\b",
]
HEDGE = [
    r"\bperhaps\b", r"\bsomewhat\b", r"\barguably\b", r"\bit (?:might|may) be\b", r"\bsort of\b",
    r"\bfairly\b", r"\bquite\b", r"\brather\b(?! than)", r"\bseems? to\b", r"\bin a sense\b", r"\bessentially\b", r"\bbasically\b",
]
META_RE = [re.compile(p, re.I) for p in META]
HEDGE_RE = [re.compile(p, re.I) for p in HEDGE]

MATH = re.compile(r"\$\$.*?\$\$|\$[^$]*\$|\\\(.*?\\\)|\\\[.*?\\\]", re.S)
TAG = re.compile(r"<[^>]+>")
SIM_HEAD = re.compile(r'<div\b[^>]*\bclass="[^"]*\bsim-head\b[^"]*"[^>]*>(.*?)</div>', re.S)
EYEBROW = re.compile(r'^\s*<span\b[^>]*\bclass="[^"]*\beyebrow\b[^"]*"[^>]*>.*?</span>', re.S)
SECTION_OF_FIGURE = re.compile(r'<figure\b[^>]*\bid="([^"]+)"')


@dataclass(frozen=True)
class Item:
    chapter: str
    where: str
    kind: Kind
    text: str
    words: int
    score: int
    flags: tuple[str, ...]


def plain(s: str) -> str:
    """The words a reader reads: math becomes a placeholder, markup and entities go."""
    return re.sub(r"\s+", " ", html.unescape(TAG.sub(" ", MATH.sub(" X ", s)))).strip()


def sentences(s: str) -> list[str]:
    return [x for x in re.split(r"(?<=[.!?])\s+(?=[A-Z(])", s) if x]


def lint(chapter: str, where: str, kind: Kind, raw: str) -> Item | None:
    text = plain(raw)
    if not text:
        return None
    words = len(text.split())
    passive = [m.group(0) for m in PASSIVE.finditer(text)]
    meta = [m.group(0) for r in META_RE for m in r.finditer(text)]
    hedge = [m.group(0) for r in HEDGE_RE for m in r.finditer(text)]
    long_sentences = [s for s in sentences(text) if len(s.split()) > SENTENCE_LIMIT]
    flags = (
        [f"passive: {p}" for p in passive]
        + [f"meta: {m}" for m in meta]
        + [f"hedge: {h}" for h in hedge]
        + ([f"long: {words} words > {LIMITS[kind]}"] if words > LIMITS[kind] else [])
        + [f"long sentence: {len(s.split())} words" for s in long_sentences]
    )
    score = len(passive) + 2 * len(meta) + len(hedge) + (words > LIMITS[kind]) + len(long_sentences)
    return Item(chapter, where, kind, text, words, score, tuple(flags))


def chapter_of(rel: str) -> str:
    head = rel.split(os.sep)[0]
    return head if re.fullmatch(r"ch\d+", head) else "book"


def section_items(book: str) -> list[Item]:
    out: list[Item] = []
    for path in sorted(glob.glob(os.path.join(book, "**", "section.json"), recursive=True)):
        rel = os.path.relpath(os.path.dirname(path), book)
        ch = chapter_of(rel)
        sec = json.load(open(path, encoding="utf-8"))
        if sec.get("ai") and sec.get("lead"):
            out.append(lint(ch, f"{rel} lead", "lead", sec["lead"]))
        for ex in sec.get("exercises", []):
            ans = ex.get("answer", {})
            at = f"{rel} {ex.get('id')}"
            if ans.get("generated_by") == "ai" and ans.get("solution"):
                out.append(lint(ch, at, "answer", ans["solution"]))
            hints = [ans.get("hint")] + [p.get("hint") for p in ans.get("parts", [])]
            out.extend(lint(ch, f"{at} hint", "hint", h) for h in hints if h)
        text_path = os.path.join(os.path.dirname(path), "text.html")
        if os.path.exists(text_path):
            page = open(text_path, encoding="utf-8").read()
            for m in SIM_HEAD.finditer(page):
                ids = SECTION_OF_FIGURE.findall(page, 0, m.start())
                out.append(lint(ch, f"{rel} {ids[-1] if ids else '?'}", "caption", EYEBROW.sub("", m.group(1))))
    return [i for i in out if i]


def why_items(book: str) -> list[Item]:
    meta = json.load(open(os.path.join(book, "book.json"), encoding="utf-8"))
    dirs = {c.split("ch")[-1].lstrip("0"): c for c in meta.get("chapter_dirs", meta.get("chapters", [])) if isinstance(c, str)}

    def ch(section: str) -> str:
        num = section.split(".")[0]
        return dirs.get(num, f"ch{int(num):02d}" if num.isdigit() else "book")

    rows = [lint(ch(c.get("section", "")), f"concept {c['id']}", "why", c["why"]) for c in meta.get("concepts", []) if c.get("why")]
    return [i for i in rows if i]


def chapter_key(ch: str) -> tuple[int, str]:
    return (int(ch[2:]), ch) if ch.startswith("ch") else (-1, ch)


def counts(items: list[Item], least: int) -> None:
    kinds = list(LIMITS)
    by: dict[str, list[Item]] = {}
    for i in items:
        by.setdefault(i.chapter, []).append(i)
    print(f"{'chapter':8} {'items':>6} {'flagged':>8} {'score':>6} {'words':>7}  " + " ".join(f"{k:>7}" for k in kinds))
    rows = sorted(by.items(), key=lambda kv: chapter_key(kv[0])) + [("total", items)]
    for ch, its in rows:
        flagged = [i for i in its if i.score >= least]
        per = " ".join(f"{sum(1 for i in flagged if i.kind == k):>7}" for k in kinds)
        print(f"{ch:8} {len(its):>6} {len(flagged):>8} {sum(i.score for i in its):>6} {sum(i.words for i in its):>7}  {per}")


def listing(items: list[Item]) -> None:
    for i in sorted(items, key=lambda i: (chapter_key(i.chapter), i.where, -i.score)):
        print(f"[{i.score}] {i.where} ({i.kind}, {i.words} words)")
        print(f"    {i.text}")
        for f in i.flags:
            print(f"    - {f}")


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("book", help="the book's folder, such as 'College Physics 2e'")
    p.add_argument("chapters", nargs="*", help="chapter dirs to keep, such as ch02; all when none")
    p.add_argument("--list", action="store_true", help="print the flagged items instead of the counts")
    p.add_argument("--all", action="store_true", help="with --list, print unflagged items too")
    p.add_argument("--json", action="store_true", help="print the items as JSON")
    p.add_argument("--min", type=int, default=1, help="the least score an item needs to count as flagged (default 1)")
    a = p.parse_intermixed_args(argv)
    items = section_items(a.book) + why_items(a.book)
    if a.chapters:
        items = [i for i in items if i.chapter in a.chapters]
    if a.json:
        print(json.dumps([asdict(i) for i in items if a.all or i.score >= a.min], ensure_ascii=False, indent=1))
    elif a.list:
        listing([i for i in items if a.all or i.score >= a.min])
    else:
        counts(items, a.min)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
