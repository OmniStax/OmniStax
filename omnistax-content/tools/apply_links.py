#!/usr/bin/env python3
"""Apply symbol link decisions (RULES item 6, the 2026-10-02 paragraph on links).

A variables row's `concept` is the concept its symbol names, and only that. Two
kinds of decision file say what changes.

`links`: one file per chapter, naming only the rows that change:

    {"book": "college-physics-2e", "chapter": 13, "rows": [
      {"i": <index in the chapter's variables>, "sym": "<its sym>",
       "from": "<the concept it links to now, or null>", "to": "<the new concept, or null>"}]}

A row whose sym is not `sym`, or whose concept is neither `from` nor already
`to`, is refused, as is a `to` the book has no concept for.

`symbols`: one file per book, `symbols-<book-id>.json`, `{"<concept id>": "<sym>"}`,
the one symbol a concept is denoted by where its linked rows carry several. A
concept with no choice takes its one linked sym where it has exactly one, keeps
its symbol where that is still a linked sym, and otherwise has none. A choice
must be a sym linked to the concept.

Nothing is written unless every file of a book passes. book.json and the
chapters' staged book-rows.json are written under the mergebook lock. A second
apply finds nothing to change.

    python3 omnistax-content/tools/apply_links.py links <file or directory>... [--dry-run]
    python3 omnistax-content/tools/apply_links.py symbols <file>... [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Callable, Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ost  # noqa: E402

ConceptId = str
BookId = str
Sym = str
Path = str
Problem = str
RowDTO = dict
RecordDTO = dict
LinkDTO = dict               # one entry of a links file's rows
LinksDTO = dict              # one links file as it sits on disk
ChoicesDTO = dict            # a symbols file: concept id -> sym

LINK_KEYS = ("i", "sym", "from", "to")
SYMBOLS_FILE = re.compile(r"^symbols-(.+)\.json$")


@dataclass
class Plan:
    problems: list[Problem] = field(default_factory=list)
    writes: dict[Path, RecordDTO] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)


def read_json(path: Path) -> tuple[Optional[object], Optional[Problem]]:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f), None
    except (OSError, json.JSONDecodeError) as e:
        return None, f"{path}: does not read: {e}"


def decision_files(paths: Sequence[Path], wanted: Callable[[str], bool]) -> list[Path]:
    return sorted(os.path.join(p, f) for p in paths if os.path.isdir(p) for f in os.listdir(p) if wanted(f)) \
        + [p for p in paths if not os.path.isdir(p)]


def with_field(row: RowDTO, key: str, value: Optional[str], after: str) -> RowDTO:
    """The row with `key` set to `value`, or taken away where it is None; a new key goes after `after`."""
    if value is None:
        return {k: v for k, v in row.items() if k != key}
    if key in row:
        return {**row, key: value}
    items = list(row.items())
    at = next((n + 1 for n, (k, _) in enumerate(items) if k == after), len(items))
    return dict(items[:at] + [(key, value)] + items[at:])


# ------------------------------------------------------------------ links

def read_links(path: Path) -> tuple[Optional[LinksDTO], Optional[Problem]]:
    value, problem = read_json(path)
    if problem:
        return None, problem
    if not isinstance(value, dict) or not isinstance(value.get("book"), str) or not isinstance(value.get("rows"), list) \
            or "chapter" not in value:
        return None, f"{path}: is not {{book, chapter, rows: [...]}}"
    bad = [r for r in value["rows"] if not isinstance(r, dict) or not set(LINK_KEYS) <= set(r) or not isinstance(r["i"], int)]
    return (None, f"{path}: a row is not {{{', '.join(LINK_KEYS)}}}: {bad[0]}") if bad else (value, None)


def relinked(rows: Sequence[RowDTO], links: Sequence[LinkDTO], concepts: set[ConceptId], name: str) -> tuple[list[RowDTO], list[Problem]]:
    """A chapter's variables with its link decisions applied, and what stops them."""
    out, problems = list(rows), []
    for link in links:
        i, where = link["i"], f"{name} variables[{link['i']}]"
        if not 0 <= i < len(out):
            problems.append(f"{where}: the chapter has {len(out)} rows")
            continue
        row = out[i]
        if row.get("sym") != link["sym"]:
            problems.append(f"{where}: is {row.get('sym')!r}, not {link['sym']!r}")
        elif row.get("concept") not in (link["from"], link["to"]):
            problems.append(f"{where} {link['sym']}: links to {row.get('concept')!r}, neither {link['from']!r} nor {link['to']!r}")
        elif link["to"] is not None and link["to"] not in concepts:
            problems.append(f"{where} {link['sym']}: {link['to']!r} names no concept")
        else:
            out[i] = with_field(row, "concept", link["to"], "sym")
    return out, problems


def plan_links(book: ost.Book, decisions: Sequence[tuple[Path, LinksDTO]]) -> Plan:
    plan = Plan()
    concepts = {c["id"] for c in ost.rows_of(ost.load(book.book_path), "concepts")}
    by_chapter: dict[Path, list[LinkDTO]] = {}
    for path, d in decisions:
        try:
            chapter = ost.chapter_path(book, str(d["chapter"]))
        except ost.Refused as e:
            plan.problems.append(f"{os.path.basename(path)}: {e}")
            continue
        by_chapter.setdefault(chapter, []).extend(d["rows"])
    for chapter, links in by_chapter.items():
        record = ost.load(chapter)
        rows, problems = relinked(ost.rows_of(record, "variables"), links, concepts, os.path.relpath(chapter, book.dir))
        plan.problems += problems
        if rows != ost.rows_of(record, "variables"):
            plan.writes[chapter] = {**record, "variables": rows}
    plan.notes.append(f"{sum(len(d['rows']) for _, d in decisions)} rows from {len(decisions)} files")
    return plan


# ------------------------------------------------------------------ symbols

def read_choices(path: Path) -> tuple[Optional[tuple[BookId, ChoicesDTO]], Optional[Problem]]:
    named = SYMBOLS_FILE.match(os.path.basename(path))
    if not named:
        return None, f"{path}: is not named symbols-<book-id>.json"
    value, problem = read_json(path)
    if problem:
        return None, problem
    if not isinstance(value, dict) or not all(isinstance(v, str) for v in value.values()):
        return None, f"{path}: is not {{concept id: sym}}"
    return (named.group(1), value), None


def linked_syms(book: ost.Book) -> dict[ConceptId, list[Sym]]:
    """Every concept's linked syms, in the order the chapters give them."""
    out: dict[ConceptId, list[Sym]] = {}
    for d in ost.chapter_dirs(book):
        for v in ost.rows_of(ost.load(os.path.join(book.dir, d, "chapter.json")), "variables"):
            if v.get("concept") is not None and v["sym"] not in out.setdefault(v["concept"], []):
                out[v["concept"]].append(v["sym"])
    return out


def symbol_of(c: RowDTO, syms: Sequence[Sym], choice: Optional[Sym]) -> Optional[Sym]:
    if choice is not None:
        return choice
    if len(syms) == 1:
        return syms[0]
    return c.get("symbol") if c.get("symbol") in syms else None


def plan_symbols(book: ost.Book, choices: ChoicesDTO) -> Plan:
    plan = Plan()
    record = ost.load(book.book_path)
    concepts = ost.rows_of(record, "concepts")
    linked = linked_syms(book)
    known = {c["id"] for c in concepts}
    plan.problems += [f"{cid}: names no concept" for cid in choices if cid not in known]
    plan.problems += [f"{cid}: {sym!r} is not a sym linked to it ({', '.join(linked.get(cid, [])) or 'none'})"
                      for cid, sym in choices.items() if cid in known and sym not in linked.get(cid, [])]
    after = [with_field(c, "symbol", symbol_of(c, linked.get(c["id"], []), choices.get(c["id"])), "name") for c in concepts]
    changed = {c["id"]: c for c, was in zip(after, concepts) if c != was}
    if changed:
        plan.writes[book.book_path] = {**record, "concepts": after}
    for d in ost.chapter_dirs(book):
        path = os.path.join(book.dir, d, "book-rows.json")
        if not os.path.exists(path):
            continue
        staged = ost.load(path)
        staged_after = {**staged, "concepts": [changed.get(c["id"], c) for c in ost.rows_of(staged, "concepts")]}
        if staged_after != staged:
            plan.writes[path] = staged_after
    symbol = {c["id"]: c.get("symbol") for c in after}
    several = [(c["id"], linked[c["id"]]) for c in after if len(linked.get(c["id"], [])) > 1 and c["id"] not in choices]
    cleared = sum(1 for c in changed.values() if c.get("symbol") is None)
    plan.notes.append(f"{len(choices)} choices; {len(changed) - cleared} symbols set or changed, {cleared} cleared")
    plan.notes += [f"several linked syms, no choice, kept {symbol[cid]!r}: {cid} ({', '.join(syms)})" for cid, syms in several if symbol[cid]]
    plan.notes += [f"several linked syms, no choice, no symbol: {cid} ({', '.join(syms)})" for cid, syms in several if not symbol[cid]]
    return plan


# ------------------------------------------------------------------ running

def apply(book: ost.Book, plan: Plan, dry_run: bool) -> int:
    if plan.problems:
        print(f"{book.id}: nothing written")
        print("\n".join(f"  {p}" for p in plan.problems))
        return 1
    print(f"{book.id}: " + "\n  ".join(plan.notes))
    for path in plan.writes:
        print(f"{'would write' if dry_run else 'writes'} {os.path.relpath(path, book.dir)}")
    if not dry_run:
        for path, record in plan.writes.items():
            ost.write_record(path, record)
    print("nothing to change" if not plan.writes else f"{len(plan.writes)} files {'to write' if dry_run else 'written'}")
    return 0


def run_links(paths: Sequence[Path], dry_run: bool) -> int:
    read = [(path, *read_links(path)) for path in decision_files(paths, lambda f: f.endswith(".json") and not SYMBOLS_FILE.match(f))]
    unreadable = [problem for _, _, problem in read if problem]
    if unreadable:
        print("\n".join(unreadable))
        return 1
    by_book: dict[BookId, list[tuple[Path, LinksDTO]]] = {}
    for path, d, _ in read:
        by_book.setdefault(d["book"], []).append((path, d))
    results: list[int] = []
    ost.under_lock(lambda: results.extend(apply(ost.book_of(b), plan_links(ost.book_of(b), ds), dry_run) for b, ds in by_book.items()))
    return max(results, default=0)


def run_symbols(paths: Sequence[Path], dry_run: bool) -> int:
    read = [read_choices(path) for path in decision_files(paths, lambda f: bool(SYMBOLS_FILE.match(f)))]
    unreadable = [problem for _, problem in read if problem]
    if unreadable:
        print("\n".join(unreadable))
        return 1
    results: list[int] = []
    ost.under_lock(lambda: results.extend(apply(ost.book_of(b), plan_symbols(ost.book_of(b), cs), dry_run) for (b, cs), _ in read))
    return max(results, default=0)


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(prog="apply_links", description=__doc__.split("\n\n")[0])
    p.add_argument("mode", choices=("links", "symbols"))
    p.add_argument("paths", nargs="+", help="decision files, or directories of them")
    p.add_argument("--dry-run", action="store_true", help="say what would change and write nothing")
    args = p.parse_args(argv)
    try:
        return (run_links if args.mode == "links" else run_symbols)(args.paths, args.dry_run)
    except ost.Refused as e:
        print(f"apply_links: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
