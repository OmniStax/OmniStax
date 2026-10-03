#!/usr/bin/env python3
"""Declare each kind once, on the concept, and drop the type overrides that say nothing.

A symbol and a variables row inherit their type from the concepts they denote
(omnistax-web/src/lib/content/load.ts, `inheritedTypes`): a variables row from
its `concept`; a symbol from the concepts that name it as their `symbol`, else
from the concepts its variables rows name, when those concepts share one type.
A type stored on the row is an override.

The backfill types a concept where the book already says what it is:

- a definition, by its main symbol's type, else by the one type its variables
  rows carry;
- a result that names a quantity, its main symbol being the left-hand side of
  its main form, by that symbol's type;
- never an axiom, an idea or a skill.

A concept is left untyped where its sources carry two types, or where typing it
would colour a symbol or a row the book now sets in ink; the report lists both.
Then every stored type equal to the one inherited is removed, in book.json, the
chapters and the staged book-rows.json, so no rendered colour changes. A second
run finds nothing to do.

    python3 omnistax-content/tools/backfill_types.py [book id ...] [--dry-run]
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ost  # noqa: E402

ConceptId = str
TypeId = str
Sym = str
RowDTO = ost.RowDTO
RecordDTO = ost.RecordDTO
Path = str

TYPED_KINDS = ("definition", "result")
CONCEPT_ORDER = ("id", "kind", "section", "name", "symbol", "terms", "type", "statement", "forms")


@dataclass
class Report:
    typed: dict[str, list[ConceptId]] = field(default_factory=dict)        # route -> concepts
    conflicts: list[str] = field(default_factory=list)
    ink: list[str] = field(default_factory=list)
    removed: dict[str, int] = field(default_factory=dict)                   # "symbols" | "variables" -> count
    kept: dict[str, list[str]] = field(default_factory=dict)                # why -> rows


# ----------------------------------------------------- inheritance, as the app has it

def inherited(concepts: Sequence[RowDTO], variables: Sequence[RowDTO], types: dict[ConceptId, Optional[TypeId]]):
    """The type a symbol and a variables row inherit, given every concept's type."""
    naming: dict[Sym, list[ConceptId]] = {}
    for c in concepts:
        if c.get("symbol"):
            naming.setdefault(c["symbol"], []).append(c["id"])
    rows: dict[Sym, list[Optional[ConceptId]]] = {}
    for v in variables:
        rows.setdefault(v["sym"], []).append(v.get("concept"))

    def denoted(sym: Sym) -> list[Optional[ConceptId]]:
        return naming.get(sym) or rows.get(sym) or []

    def shared(ids: Sequence[Optional[ConceptId]]) -> Optional[TypeId]:
        ts = {types.get(i) if i else None for i in ids}
        return next(iter(ts)) if len(ts) == 1 else None

    return (lambda s: shared(denoted(s["sym"]))), (lambda v: types.get(v["concept"]) if v.get("concept") else None), denoted


# ------------------------------------------------------------------ the candidates

def lhs(latex: str) -> str:
    return re.sub(r"\s+", "", latex.split("=", 1)[0]) if "=" in latex else ""


def names_quantity(c: RowDTO, symbol: Optional[RowDTO]) -> bool:
    """A result whose main form's left-hand side is its main symbol."""
    forms = c.get("forms") or []
    if symbol is None or not forms:
        return False
    main = forms[0]
    return lhs(main.get("latex", "")) == re.sub(r"\s+", "", symbol["latex"]) \
        or (bool(symbol.get("macro")) and lhs(main.get("ktex", "")) == symbol["macro"])


def candidates(concepts: Sequence[RowDTO], symbols: dict[Sym, RowDTO], by_concept: dict[ConceptId, list[RowDTO]],
               report: Report) -> dict[ConceptId, tuple[TypeId, str]]:
    out: dict[ConceptId, tuple[TypeId, str]] = {}
    for c in concepts:
        if c.get("type") or c["kind"] not in TYPED_KINDS:
            continue
        main = symbols.get(c.get("symbol") or "")
        main_type = main.get("type") if main else None
        row_types = {v["type"] for v in by_concept.get(c["id"], []) if v.get("type")}
        if c["kind"] == "result" and not (main_type and names_quantity(c, main)):
            continue
        sources = row_types | ({main_type} if main_type else set())
        if len(sources) > 1:
            report.conflicts.append(f"{c['id']}: " + ", ".join(sorted(sources)))
            continue
        if main_type:
            out[c["id"]] = (main_type, "result" if c["kind"] == "result" else "symbol")
        elif row_types:
            out[c["id"]] = (next(iter(row_types)), "variables")
    return out


def drop_ink(chosen: dict[ConceptId, tuple[TypeId, str]], concepts: Sequence[RowDTO], symbols: Sequence[RowDTO],
             variables: Sequence[RowDTO], declared: dict[ConceptId, Optional[TypeId]], report: Report) -> dict[ConceptId, tuple[TypeId, str]]:
    """Leave out every candidate that would colour a symbol or a row now in ink, until none would."""
    while True:
        types = {**declared, **{k: t for k, (t, _) in chosen.items()}}
        of_symbol, of_variable, denoted = inherited(concepts, variables, types)
        blamed: dict[ConceptId, str] = {}
        for s in symbols:
            if not s.get("type") and of_symbol(s):
                for cid in denoted(s["sym"]):
                    if cid in chosen:
                        blamed.setdefault(cid, f"symbol {s['sym']}")
        for v in variables:
            if not v.get("type") and of_variable(v) and v["concept"] in chosen:
                blamed.setdefault(v["concept"], f"variables row {v['section']}/{v['sym']}")
        if not blamed:
            return chosen
        for cid, row in blamed.items():
            report.ink.append(f"{cid} ({chosen[cid][0]}): {row} is in ink")
        chosen = {k: x for k, x in chosen.items() if k not in blamed}


# ---------------------------------------------------------------------- the writes

def with_type(c: RowDTO, type_: TypeId) -> RowDTO:
    """The concept with its type, in the place the schema lists it."""
    out = {**c, "type": type_}
    order = {k: i for i, k in enumerate(CONCEPT_ORDER)}
    return dict(sorted(out.items(), key=lambda kv: order.get(kv[0], len(order))))


def without_type(row: RowDTO) -> RowDTO:
    return {k: v for k, v in row.items() if k != "type"}


def backfill(book: ost.Book, report: Report) -> dict[Path, RecordDTO]:
    record = ost.load(book.book_path)
    chapter_paths = [os.path.join(book.dir, d, "chapter.json") for d in record.get("chapters", [])]
    chapters = {p: ost.load(p) for p in chapter_paths if os.path.exists(p)}
    concepts = ost.rows_of(record, "concepts")
    symbols = ost.rows_of(record, "symbols")
    variables = [v for ch in chapters.values() for v in ost.rows_of(ch, "variables")]
    by_concept: dict[ConceptId, list[RowDTO]] = {}
    for v in variables:
        if v.get("concept"):
            by_concept.setdefault(v["concept"], []).append(v)
    declared = {c["id"]: c.get("type") for c in concepts}

    chosen = drop_ink(candidates(concepts, {s["sym"]: s for s in symbols}, by_concept, report),
                      concepts, symbols, variables, declared, report)
    for cid, (_, route) in chosen.items():
        report.typed.setdefault(route, []).append(cid)
    concepts_after = [with_type(c, chosen[c["id"]][0]) if c["id"] in chosen else c for c in concepts]
    types = {c["id"]: c.get("type") for c in concepts_after}
    of_symbol, of_variable, _ = inherited(concepts_after, variables, types)

    def strip(table: str, row: RowDTO, inherit: Optional[TypeId], label: str) -> RowDTO:
        if not row.get("type"):
            return row
        if row["type"] == inherit:
            report.removed[table] = report.removed.get(table, 0) + 1
            return without_type(row)
        why = "reaches no typed concept" if inherit is None else f"differs from the inherited {inherit}"
        report.kept.setdefault(f"{table}: {why}", []).append(f"{label} {row['type']}")
        return row

    symbols_after = [strip("symbols", s, of_symbol(s), s["sym"]) for s in symbols]
    writes: dict[Path, RecordDTO] = {}
    book_after = {**record, "concepts": concepts_after, "symbols": symbols_after}
    if book_after != record:
        writes[book.book_path] = book_after
    for p, ch in chapters.items():
        rows = [strip("variables", v, of_variable(v), f"{v['section']}/{v['sym']}") for v in ost.rows_of(ch, "variables")]
        if rows != ost.rows_of(ch, "variables"):
            writes[p] = {**ch, "variables": rows}
    writes.update(staged_writes(book, {c["id"]: c for c in concepts_after}, {s["sym"]: s for s in symbols_after}))
    return writes


def synced(row: RowDTO, final: Optional[RowDTO]) -> RowDTO:
    """A staged row with the type the book now gives it, every other field as staged."""
    if final is None or row.get("type") == final.get("type"):
        return row
    return with_type(row, final["type"]) if final.get("type") else without_type(row)


def staged_writes(book: ost.Book, concepts: dict[ConceptId, RowDTO], symbols: dict[Sym, RowDTO]) -> dict[Path, RecordDTO]:
    """The chapters' staged book-rows.json, which mergebook copies over book.json, carry the same types."""
    writes: dict[Path, RecordDTO] = {}
    for d in sorted(os.listdir(book.dir)):
        p = os.path.join(book.dir, d, "book-rows.json")
        if not os.path.exists(p):
            continue
        staged = ost.load(p)
        after = {**staged,
                 "concepts": [synced(c, concepts.get(c["id"])) for c in ost.rows_of(staged, "concepts")],
                 "symbols": [synced(s, symbols.get(s["sym"])) for s in ost.rows_of(staged, "symbols")]}
        after = {k: v for k, v in after.items() if k in staged}
        if after != staged:
            writes[p] = after
    return writes


# ---------------------------------------------------------------------- the report

def said(book: ost.Book, report: Report, writes: dict[Path, RecordDTO], dry_run: bool) -> str:
    typed = sum(len(v) for v in report.typed.values())
    lines = [f"{book.id}: {typed} concepts typed"
             + (" (" + ", ".join(f"{len(v)} by {k}" for k, v in sorted(report.typed.items())) + ")" if typed else ""),
             f"  conflicts: {len(report.conflicts)}" + "".join(f"\n    {c}" for c in report.conflicts),
             f"  left untyped, would colour ink: {len(report.ink)}" + "".join(f"\n    {c}" for c in report.ink),
             "  overrides removed: " + (", ".join(f"{n} {t}" for t, n in sorted(report.removed.items())) or "none")]
    for why, rows in sorted(report.kept.items()):
        lines.append(f"  overrides kept, {why}: {len(rows)} (e.g. {', '.join(rows[:6])})")
    lines.append("  nothing to change" if not writes else
                 f"  {len(writes)} files {'to write' if dry_run else 'written'}: "
                 + ", ".join(os.path.relpath(p, book.dir) for p in writes))
    return "\n".join(lines)


def run(book_id: str, dry_run: bool) -> None:
    book = ost.book_of(book_id)
    report = Report()
    writes = backfill(book, report)
    if not dry_run:
        for p, record in writes.items():
            ost.write_record(p, record)
    print(said(book, report, writes, dry_run))


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(prog="backfill_types", description=__doc__.split("\n\n")[0])
    p.add_argument("books", nargs="*", help="book ids; every book where none is named")
    p.add_argument("--dry-run", action="store_true", help="say what would change and write nothing")
    args = p.parse_args(argv)
    try:
        ost.under_lock(lambda: [run(b, args.dry_run) for b in (args.books or [b.id for b in ost.books()])])
    except ost.Refused as e:
        print(f"backfill_types: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
