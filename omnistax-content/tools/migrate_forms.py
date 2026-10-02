#!/usr/bin/env python3
"""Fold a book's equations and glossary rows onto their concepts (issue #39).

Before the fold a concept's facts stood in four tables: `book.json` `concepts`,
and each chapter's `equations`, `glossary` and `variables`. After it the concept
is the one record:

- every equations row becomes one of its concept's `forms`, keeping its id; the
  main form comes first: the concept's old `eq` where that is an important
  equation of its own, else its first important equation, else its first;
- every glossary row's word joins its concept's `terms`, and the glossary's own
  definition is dropped, since a built concept states itself;
- the concept takes one `symbol`, the one its variables rows write most often;
  where two tie, a definition takes the first its own section gives, and any
  other kind takes none;
- `eq`, `equations`, `glossary` and `important` are gone.

An equation id the book uses twice keeps it where it comes first and takes the
chapter's number after it elsewhere (`eq-efficiency` in ch15 is
`eq-efficiency-15`). A concept's `eq` that names another concept's equation is
dropped with the rest of `eq`.

    python3 omnistax-content/tools/migrate_forms.py <book> [--dry-run]

Writes book.json, every chapter's staged book-rows.json and every chapter.json
under the mergebook lock. A book already folded has nothing to change.
"""
from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass, field
from typing import Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ost  # noqa: E402

ConceptId = str
EquationId = str
ChapterDir = str
RowDTO = dict
RecordDTO = dict

FORM_FIELDS = ("id", "latex", "ktex", "condition", "section", "anchor")
CONCEPT_ORDER = ("id", "kind", "section", "name", "symbol", "terms", "statement", "forms")


@dataclass(frozen=True)
class Equation:
    chapter: ChapterDir
    row: RowDTO


@dataclass
class Fold:
    forms: dict[ConceptId, list[RowDTO]] = field(default_factory=dict)
    terms: dict[ConceptId, list[str]] = field(default_factory=dict)
    symbols: dict[ConceptId, str] = field(default_factory=dict)
    renamed: list[tuple[EquationId, EquationId]] = field(default_factory=list)


def chapter_number(d: ChapterDir) -> str:
    return str(int(d[2:]))


def unique_ids(equations: Sequence[Equation]) -> tuple[list[Equation], list[tuple[str, str]]]:
    """The equations with every id the book uses twice made unique, and what was renamed."""
    seen: set[str] = set()
    out, renamed = [], []
    for e in equations:
        eid = e.row["id"]
        if eid in seen:
            new = f"{eid}-{chapter_number(e.chapter)}"
            n = 2
            while new in seen:
                new, n = f"{eid}-{chapter_number(e.chapter)}-{n}", n + 1
            renamed.append((f"{e.chapter}:{eid}", new))
            e = Equation(e.chapter, {**e.row, "id": new})
        seen.add(e.row["id"])
        out.append(e)
    return out, renamed


def form_of(row: RowDTO, home: str) -> RowDTO:
    form = {k: row[k] for k in FORM_FIELDS if k in row and row[k] not in (None, "")}
    return {k: v for k, v in form.items() if not (k == "section" and v == home)}


def main_first(rows: list[RowDTO], hint: Optional[str]) -> list[RowDTO]:
    """The main form first: the hinted one where it is important, else the first important one, else the first."""
    important = [r for r in rows if r.get("important")]
    main = next((r for r in important if r["id"] == hint), None) or (important[0] if important else rows[0])
    return [main] + [r for r in rows if r is not main]


def symbol_of(rows: Sequence[RowDTO], home: str, kind: str) -> Optional[str]:
    """The symbol the book writes the concept with most often. Where two tie, a
    definition takes the one its own section gives first, else the book's first;
    any other kind takes none, since a law is not denoted by one of its symbols."""
    counts: dict[str, int] = {}
    for r in rows:
        counts[r["sym"]] = counts.get(r["sym"], 0) + 1
    best = [sym for sym, n in counts.items() if n == max(counts.values(), default=0)]
    if len(best) == 1:
        return best[0]
    ordered = [r["sym"] for r in rows if r.get("section") == home] + [r["sym"] for r in rows]
    return next((sym for sym in ordered if sym in best), None) if kind == "definition" else None


def fold_of(concepts: Sequence[RowDTO], chapters: dict[ChapterDir, RecordDTO]) -> Fold:
    home = {c["id"]: c["section"] for c in concepts}
    kinds = {c["id"]: c["kind"] for c in concepts}
    hint = {c["id"]: c.get("eq") for c in concepts}
    equations, renamed = unique_ids([Equation(d, e) for d, ch in chapters.items() for e in ost.rows_of(ch, "equations")])
    fold = Fold(renamed=renamed)
    by_concept: dict[ConceptId, list[RowDTO]] = {}
    for e in equations:
        cid = e.row.get("concept")
        if cid in home:
            by_concept.setdefault(cid, []).append(e.row)
    fold.forms = {cid: [form_of(r, home[cid]) for r in main_first(rows, hint.get(cid))] for cid, rows in by_concept.items()}
    for ch in chapters.values():
        for g in ost.rows_of(ch, "glossary"):
            cid, term = g.get("concept"), g.get("term", "").strip()
            words = fold.terms.setdefault(cid, []) if cid in home else None
            if words is not None and term and term.lower() not in {w.lower() for w in words}:
                words.append(term)
    variables: dict[ConceptId, list[RowDTO]] = {}
    for ch in chapters.values():
        for v in ost.rows_of(ch, "variables"):
            if v.get("concept") in home:
                variables.setdefault(v["concept"], []).append(v)
    fold.symbols = {cid: s for cid, rows in variables.items() if (s := symbol_of(rows, home[cid], kinds[cid])) is not None}
    return fold


def folded(c: RowDTO, fold: Fold) -> RowDTO:
    """A concept row with its symbol, terms and forms, `eq` gone; what it already carries is kept."""
    cid = c["id"]
    terms = list(c.get("terms", [])) + [t for t in fold.terms.get(cid, []) if t.lower() not in {w.lower() for w in c.get("terms", [])}]
    forms = list(c.get("forms", [])) + [f for f in fold.forms.get(cid, []) if f["id"] not in {g["id"] for g in c.get("forms", [])}]
    cell = {**{k: v for k, v in c.items() if k != "eq"},
            **({"symbol": c.get("symbol") or fold.symbols[cid]} if c.get("symbol") or cid in fold.symbols else {}),
            **({"terms": terms} if terms else {}), **({"forms": forms} if forms else {})}
    return {k: cell[k] for k in [*CONCEPT_ORDER, *[k for k in cell if k not in CONCEPT_ORDER]] if k in cell}


def chapter_after(record: RecordDTO) -> RecordDTO:
    return {k: v for k, v in record.items() if k not in ("equations", "glossary")}


def plan(book: ost.Book) -> tuple[dict[str, RecordDTO], Fold]:
    record = ost.load(book.book_path)
    chapters = {d: ost.load(os.path.join(book.dir, d, "chapter.json"))
                for d in ost.chapter_dirs(book) if os.path.exists(os.path.join(book.dir, d, "chapter.json"))}
    fold = fold_of(ost.rows_of(record, "concepts"), chapters)
    writes: dict[str, RecordDTO] = {}
    after = {**record, "concepts": [folded(c, fold) for c in ost.rows_of(record, "concepts")]}
    if after != record:
        writes[book.book_path] = after
    for d, ch in chapters.items():
        path = os.path.join(book.dir, d, "chapter.json")
        if chapter_after(ch) != ch:
            writes[path] = chapter_after(ch)
        staged_path = os.path.join(book.dir, d, "book-rows.json")
        if os.path.exists(staged_path):
            staged = ost.load(staged_path)
            staged_after = {**staged, "concepts": [folded(c, fold) for c in ost.rows_of(staged, "concepts")]}
            if staged_after != staged:
                writes[staged_path] = staged_after
    return writes, fold


def run(book_id: str, dry_run: bool) -> int:
    book = ost.book_of(book_id)
    writes, fold = plan(book)
    print(f"{book.id}: {sum(len(f) for f in fold.forms.values())} forms on {len(fold.forms)} concepts, "
          f"{sum(len(t) for t in fold.terms.values())} terms on {len(fold.terms)}, {len(fold.symbols)} symbols")
    for old, new in fold.renamed:
        print(f"  renamed {old} -> {new}")
    for path in writes:
        print(f"{'would write' if dry_run else 'writes'} {os.path.relpath(path, book.dir)}")
    if not dry_run:
        for path, record in writes.items():
            ost.write_record(path, record)
    print("nothing to change" if not writes else f"{len(writes)} files {'to write' if dry_run else 'written'}")
    return 0


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(prog="migrate_forms", description=__doc__.split("\n\n")[0])
    p.add_argument("book")
    p.add_argument("--dry-run", action="store_true", help="say what would change and write nothing")
    args = p.parse_args(argv)
    result: list[int] = []
    try:
        ost.under_lock(lambda: result.append(run(args.book, args.dry_run)))
    except ost.Refused as e:
        print(f"migrate_forms: {e}", file=sys.stderr)
        return 1
    return result[0]


if __name__ == "__main__":
    sys.exit(main())
