#!/usr/bin/env python3
"""Declare each kind once, on the concept, and drop the type overrides that say nothing.

A symbol and a variables row inherit their type from the concepts they denote
(omnistax-web/src/lib/content/load.ts, `inheritedTypes`): a variables row from
its `concept`; a symbol from the concepts that name it as their `symbol`, else
from the concepts its variables rows name, when those concepts share one type.
A type stored on the row is an override, and a stored null sets the row in ink
whatever its concepts are.

The backfill types a concept where the book already says what it is:

- a definition, by its main symbol's type, else by the one type its variables
  rows carry;
- a result that names a quantity, by the type of its main symbol where that is
  the left-hand side of its main form; a result with no main symbol, by the type
  of the symbol its main form's left-hand side spells (\\text{} and braces
  aside) where one of the concept's own variables rows is a row of that symbol:
  a law whose left-hand side is another concept's quantity names none;
- never an axiom, an idea or a skill.

A concept is left untyped where its sources carry two types, or where its
left-hand side spells own symbols of two types; the report lists both, with every
row that goes from ink to a colour, which a stored null keeps in ink. Then
every stored type equal to the one inherited is removed, and every null where
nothing would be inherited, in book.json, the chapters and the staged
book-rows.json. A second run finds nothing to do.

    python3 omnistax-content/tools/backfill_types.py [book id ...] [--dry-run]

A symbol takes its type in each section from its variables row there, so a type
stored on a symbol belongs on those rows. `--move-symbol-types` does that alone:
each symbol's stored type, a null included, is set on every variables row of the
symbol that wears another, and taken off the symbol in book.json and the staged
book-rows.json. A section with no row of the symbol is listed, since there the
symbol now wears what its rows share across the book.

    python3 omnistax-content/tools/backfill_types.py --move-symbol-types [book id ...] [--dry-run]
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
SYMBOL_ORDER = ("sym", "latex", "type", "macro")
VARIABLE_ORDER = ("sym", "concept", "type", "ref", "meaning", "unit", "section", "anchor", "redefines")


@dataclass
class Report:
    typed: dict[str, list[ConceptId]] = field(default_factory=dict)        # route -> concepts
    conflicts: list[str] = field(default_factory=list)
    ambiguous: list[str] = field(default_factory=list)
    removed: dict[str, int] = field(default_factory=dict)                   # "symbols" | "variables" -> count
    kept: dict[str, list[str]] = field(default_factory=dict)                # why -> rows
    coloured: list[str] = field(default_factory=list)                       # rows that were ink and now wear a type
    recoloured: list[str] = field(default_factory=list)                     # symbols whose effective type changed


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


def effective(row: RowDTO, inherit: Optional[TypeId]) -> Optional[TypeId]:
    """A stored type wins, and a stored null is ink."""
    return row["type"] if "type" in row else inherit


# ------------------------------------------------------------------ the candidates

def lhs(latex: str) -> str:
    return re.sub(r"\s+", "", latex.split("=", 1)[0]) if "=" in latex else ""


def bare(latex: str) -> str:
    """LaTeX with no spacing, no \\text{} or \\mathrm{} wrapper and no braces, so two spellings of one symbol meet."""
    unwrapped = re.sub(r"\\(?:text|mathrm|rm)\s*\{([^{}]*)\}", r"\1", latex)
    return re.sub(r"[\s{}]", "", unwrapped)


def names_quantity(c: RowDTO, symbol: Optional[RowDTO]) -> bool:
    """A result whose main form's left-hand side is its main symbol."""
    forms = c.get("forms") or []
    if symbol is None or not forms:
        return False
    main = forms[0]
    return lhs(main.get("latex", "")) == re.sub(r"\s+", "", symbol["latex"]) \
        or (bool(symbol.get("macro")) and lhs(main.get("ktex", "")) == symbol["macro"])


def lhs_type(c: RowDTO, symbols: Sequence[RowDTO], worn: dict[Sym, Optional[TypeId]],
             own_rows: Sequence[RowDTO], report: Report) -> Optional[TypeId]:
    """The type of the symbol a result names: the left-hand side of its main form spells it, and one of the concept's
    own variables rows is a row of it. A law whose left-hand side is some other concept's quantity names none."""
    forms = c.get("forms") or []
    side = bare(lhs(forms[0].get("latex", ""))) if forms else ""
    macro = lhs(forms[0].get("ktex", "")) if forms else ""
    own = {v["sym"] for v in own_rows}
    hits = [s for s in symbols if s["sym"] in own and worn.get(s["sym"])
            and (bare(s["latex"]) == side or (macro and s.get("macro") == macro))] if side else []
    kinds = {worn[s["sym"]] for s in hits}
    if len(kinds) > 1:
        report.ambiguous.append(f"{c['id']}: " + ", ".join(f"{s['sym']} ({worn[s['sym']]})" for s in hits))
    return next(iter(kinds)) if len(kinds) == 1 else None


def candidates(concepts: Sequence[RowDTO], symbols: Sequence[RowDTO], worn: dict[Sym, Optional[TypeId]],
               by_concept: dict[ConceptId, list[RowDTO]], report: Report) -> dict[ConceptId, tuple[TypeId, str]]:
    by_sym = {s["sym"]: s for s in symbols}
    out: dict[ConceptId, tuple[TypeId, str]] = {}
    for c in concepts:
        if c.get("type") or c["kind"] not in TYPED_KINDS:
            continue
        main = by_sym.get(c.get("symbol") or "")
        main_type = main.get("type") if main else None
        own = by_concept.get(c["id"], [])
        row_types = {v["type"] for v in own if v.get("type")}
        if c["kind"] == "result":
            route = "result" if main_type and names_quantity(c, main) else "form" if main is None else None
            main_type = main_type if route == "result" else lhs_type(c, symbols, worn, own, report) if route else None
            if not main_type:
                continue
        else:
            route = "symbol" if main_type else "variables"
        sources = row_types | ({main_type} if main_type else set())
        if len(sources) > 1:
            report.conflicts.append(f"{c['id']}: " + ", ".join(sorted(sources)))
            continue
        if sources:
            out[c["id"]] = (next(iter(sources)), route)
    return out


# ---------------------------------------------------------------------- the writes

def placed(row: RowDTO, key: str, value: object, order: Sequence[str]) -> RowDTO:
    """The row with one field set, in the place its table lists it."""
    out = {**row, key: value}
    rank = {k: i for i, k in enumerate(order)}
    return dict(sorted(out.items(), key=lambda kv: rank.get(kv[0], len(rank))))


def with_type(c: RowDTO, type_: TypeId) -> RowDTO:
    """The concept with its type, in the place the schema lists it."""
    return placed(c, "type", type_, CONCEPT_ORDER)


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
    of_symbol_before, of_variable_before, _ = inherited(concepts, variables, declared)
    worn_before = {s["sym"]: effective(s, of_symbol_before(s)) for s in symbols}

    definitions = [c for c in concepts if c["kind"] != "result"]
    chosen = candidates(definitions, symbols, worn_before, by_concept, report)
    of_symbol_mid, _, _ = inherited(concepts, variables, {**declared, **{k: t for k, (t, _) in chosen.items()}})
    worn_mid = {s["sym"]: effective(s, of_symbol_mid(s)) for s in symbols}
    chosen.update(candidates([c for c in concepts if c["kind"] == "result"], symbols, worn_mid, by_concept, report))

    for cid, (_, route) in chosen.items():
        report.typed.setdefault(route, []).append(cid)
    concepts_after = [with_type(c, chosen[c["id"]][0]) if c["id"] in chosen else c for c in concepts]
    types = {c["id"]: c.get("type") for c in concepts_after}
    of_symbol, of_variable, _ = inherited(concepts_after, variables, types)

    for s in symbols:
        after = effective(s, of_symbol(s))
        if after != worn_before[s["sym"]]:
            report.recoloured.append(f"{s['sym']} {worn_before[s['sym']] or 'ink'} -> {after or 'ink'}")
    for v in variables:
        if effective(v, of_variable_before(v)) is None and effective(v, of_variable(v)) is not None:
            report.coloured.append(f"{v['section']}:{v['sym']} ({of_variable(v)})")

    def strip(table: str, row: RowDTO, inherit: Optional[TypeId], label: str) -> RowDTO:
        if "type" not in row or (row["type"] is not None and row["type"] != inherit):
            if row.get("type"):
                why = "reaches no typed concept" if inherit is None else f"differs from the inherited {inherit}"
                report.kept.setdefault(f"{table}: {why}", []).append(f"{label} {row['type']}")
            return row
        if row["type"] is None and inherit is not None:
            report.kept.setdefault(f"{table}: ink against the inherited type", []).append(f"{label} ({inherit})")
            return row
        report.removed[table] = report.removed.get(table, 0) + 1
        return without_type(row)

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


def synced(row: RowDTO, final: Optional[RowDTO], order: Sequence[str]) -> RowDTO:
    """A staged row with the type the book now gives it, a stored null included, every other field as staged."""
    if final is None or ("type" in row, row.get("type")) == ("type" in final, final.get("type")):
        return row
    return placed(row, "type", final["type"], order) if "type" in final else without_type(row)


def staged_writes(book: ost.Book, concepts: dict[ConceptId, RowDTO], symbols: dict[Sym, RowDTO]) -> dict[Path, RecordDTO]:
    """The chapters' staged book-rows.json, which mergebook copies over book.json, carry the same types."""
    writes: dict[Path, RecordDTO] = {}
    for d in sorted(os.listdir(book.dir)):
        p = os.path.join(book.dir, d, "book-rows.json")
        if not os.path.exists(p):
            continue
        staged = ost.load(p)
        after = {**staged,
                 "concepts": [synced(c, concepts.get(c["id"]), CONCEPT_ORDER) for c in ost.rows_of(staged, "concepts")],
                 "symbols": [synced(s, symbols.get(s["sym"]), SYMBOL_ORDER) for s in ost.rows_of(staged, "symbols")]}
        after = {k: v for k, v in after.items() if k in staged}
        if after != staged:
            writes[p] = after
    return writes


# ------------------------------------------------------------- symbol types to rows

@dataclass
class Moved:
    rows: list[str] = field(default_factory=list)          # "section/sym type" set on a row
    dropped: list[str] = field(default_factory=list)       # symbols whose stored type is gone
    rowless: list[str] = field(default_factory=list)       # symbols with no variables row to carry the type


def move_symbol_types(book: ost.Book, moved: Moved) -> dict[Path, RecordDTO]:
    """Every symbol's stored type onto the variables rows of the symbol that wear another, and off the symbol."""
    record = ost.load(book.book_path)
    chapter_paths = [os.path.join(book.dir, d, "chapter.json") for d in record.get("chapters", [])]
    chapters = {p: ost.load(p) for p in chapter_paths if os.path.exists(p)}
    kinds = {c["id"]: c.get("type") for c in ost.rows_of(record, "concepts")}
    stored = {s["sym"]: s["type"] for s in ost.rows_of(record, "symbols") if "type" in s}
    has_row = {v["sym"] for ch in chapters.values() for v in ost.rows_of(ch, "variables")}

    def carried(v: RowDTO) -> RowDTO:
        if v["sym"] not in stored or effective(v, kinds.get(v.get("concept") or "")) == stored[v["sym"]]:
            return v
        moved.rows.append(f"{v['section']}/{v['sym']} {stored[v['sym']] or 'null'}")
        return placed(v, "type", stored[v["sym"]], VARIABLE_ORDER)

    writes: dict[Path, RecordDTO] = {}
    for p, ch in chapters.items():
        rows = [carried(v) for v in ost.rows_of(ch, "variables")]
        if rows != ost.rows_of(ch, "variables"):
            writes[p] = {**ch, "variables": rows}
    moved.dropped.extend(stored)
    moved.rowless.extend(sym for sym in stored if sym not in has_row)
    symbols = [without_type(s) for s in ost.rows_of(record, "symbols")]
    if stored:
        writes[book.book_path] = {**record, "symbols": symbols}
    writes.update(staged_writes(book, {c["id"]: c for c in ost.rows_of(record, "concepts")}, {s["sym"]: s for s in symbols}))
    return writes


# ---------------------------------------------------------------------- the report

def said(book: ost.Book, report: Report, writes: dict[Path, RecordDTO], dry_run: bool) -> str:
    typed = sum(len(v) for v in report.typed.values())
    lines = [f"{book.id}: {typed} concepts typed"
             + (" (" + ", ".join(f"{len(v)} by {k}" for k, v in sorted(report.typed.items())) + ")" if typed else ""),
             "".join(f"\n    {cid} by {route}" for route, ids in sorted(report.typed.items()) for cid in ids),
             f"  conflicts: {len(report.conflicts)}" + "".join(f"\n    {c}" for c in report.conflicts),
             f"  ambiguous left-hand sides: {len(report.ambiguous)}" + "".join(f"\n    {c}" for c in report.ambiguous),
             f"  rows from ink to a type: {len(report.coloured)}" + "".join(f"\n    {c}" for c in report.coloured),
             f"  symbols whose type changed: {len(report.recoloured)}" + "".join(f"\n    {c}" for c in report.recoloured),
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


def run_move(book_id: str, dry_run: bool) -> None:
    book = ost.book_of(book_id)
    moved = Moved()
    writes = move_symbol_types(book, moved)
    if not dry_run:
        for p, record in writes.items():
            ost.write_record(p, record)
    print("\n".join([f"{book.id}: {len(moved.dropped)} symbol types moved",
                     f"  set on rows: {len(moved.rows)}" + "".join(f"\n    {r}" for r in moved.rows),
                     f"  with no row to carry them: {len(moved.rowless)}" + (f" ({', '.join(moved.rowless)})" if moved.rowless else ""),
                     "  nothing to change" if not writes else
                     f"  {len(writes)} files {'to write' if dry_run else 'written'}: " + ", ".join(os.path.relpath(p, book.dir) for p in writes)]))


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(prog="backfill_types", description=__doc__.split("\n\n")[0])
    p.add_argument("books", nargs="*", help="book ids; every book where none is named")
    p.add_argument("--dry-run", action="store_true", help="say what would change and write nothing")
    p.add_argument("--move-symbol-types", action="store_true", help="only move each symbol's stored type onto its variables rows")
    args = p.parse_args(argv)
    step = run_move if args.move_symbol_types else run
    try:
        ost.under_lock(lambda: [step(b, args.dry_run) for b in (args.books or [b.id for b in ost.books()])])
    except ost.Refused as e:
        print(f"backfill_types: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
