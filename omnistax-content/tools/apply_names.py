#!/usr/bin/env python3
"""Apply concept name decisions (RULES item 6, the 2026-10-02 paragraph on names).

A decision file names one chapter's renames:

    {"book": "college-physics-2e", "chapter": 1, "renames": [
      {"id": "<concept id>", "from": "<the name it had>", "name": "<the new name>",
       "statement": "<a new statement, where the cut gloss was not in it>",
       "formula": "<LaTeX the old name carried, where no form states it>"}]}

For each rename the concept takes the new name, and the new statement where one
is given. A formula no form of the concept states yet becomes a form of it: the
main form of a concept that has none, else an extra one after the rest. Its id
is `eq-<concept id>`, its LaTeX the formula with the book's macros put back into
their symbols, and its coloured form the formula itself where it writes a macro.

Nothing is written unless every file passes: every id names a concept, every
concept still has its old name or already the new one, and no two concepts of
the book end with the same name. Then book.json and the chapters' staged
book-rows.json are written under the mergebook lock. A second apply finds
nothing to change.

    python3 omnistax-content/tools/apply_names.py <file or directory>... [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ost  # noqa: E402

ConceptId = str
BookId = str
Problem = str
RowDTO = dict
RecordDTO = dict
RenameDTO = dict             # one entry of a decision file's renames
DecisionDTO = dict           # one decision file as it sits on disk

RENAME_KEYS = ("id", "from", "name", "statement", "formula")


def decision_files(paths: Sequence[str]) -> list[str]:
    return sorted(os.path.join(p, f) for p in paths if os.path.isdir(p) for f in os.listdir(p) if f.endswith(".json")) \
        + [p for p in paths if not os.path.isdir(p)]


def read_decision(path: str) -> tuple[Optional[DecisionDTO], Optional[Problem]]:
    try:
        with open(path, encoding="utf-8") as f:
            value = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        return None, f"{path}: does not read: {e}"
    if not isinstance(value, dict) or not isinstance(value.get("book"), str) or not isinstance(value.get("renames"), list):
        return None, f"{path}: is not {{book, chapter, renames: [...]}}"
    bad = [r for r in value["renames"] if not isinstance(r, dict) or not {"id", "name"} <= set(r) or set(r) - set(RENAME_KEYS)]
    return (None, f"{path}: a rename is not {{{', '.join(RENAME_KEYS)}}}: {bad[0]}") if bad else (value, None)


# ------------------------------------------------------------------ the maths

def squash(tex: str) -> str:
    """TeX as two spellings of one equation share it: no spacing of any kind."""
    return re.sub(r"\s+|\\[,;!:]|\\quad|\\ ", "", tex)


def plain(tex: str, macros: dict[str, str]) -> str:
    """The formula with every macro of the book put back into the LaTeX of its symbol."""
    return re.sub(r"\\[A-Za-z]+", lambda m: macros.get(m.group(0), m.group(0)), tex)


def states(form: RowDTO, formula: str, macros: dict[str, str]) -> bool:
    spellings = {squash(formula), squash(plain(formula, macros))}
    return bool(spellings & {squash(form.get("latex", "")), squash(form.get("ktex", "")), squash(plain(form.get("ktex", ""), macros))})


def new_form(cid: ConceptId, formula: str, macros: dict[str, str], taken: set[str]) -> RowDTO:
    base = f"eq-{cid}"
    fid, n = base, 2
    while fid in taken:
        fid, n = f"{base}-{n}", n + 1
    latex = plain(formula, macros)
    return {"id": fid, "latex": latex, **({"ktex": formula} if latex != formula else {})}


# ------------------------------------------------------------------ the plan

@dataclass
class Plan:
    problems: list[Problem] = field(default_factory=list)
    renames: dict[ConceptId, RenameDTO] = field(default_factory=dict)


def plan_of(concepts: Sequence[RowDTO], decisions: Sequence[tuple[str, DecisionDTO]]) -> Plan:
    plan = Plan()
    by_id = {c["id"]: c for c in concepts}
    for path, d in decisions:
        for r in d["renames"]:
            c = by_id.get(r["id"])
            if c is None:
                plan.problems.append(f"{os.path.basename(path)}: {r['id']} names no concept")
            elif c["name"] not in (r.get("from", c["name"]), r["name"]):
                plan.problems.append(f"{os.path.basename(path)}: {r['id']} is named {c['name']!r}, neither {r.get('from')!r} nor {r['name']!r}")
            elif r["id"] in plan.renames and plan.renames[r["id"]] != r:
                plan.problems.append(f"{os.path.basename(path)}: {r['id']} is renamed twice, differently")
            else:
                plan.renames[r["id"]] = r
    names: dict[str, list[ConceptId]] = {}
    for c in concepts:
        names.setdefault(plan.renames.get(c["id"], c)["name"].strip().lower(), []).append(c["id"])
    plan.problems += [f"{', '.join(ids)} would all be named {name!r}" for name, ids in names.items() if len(ids) > 1]
    return plan


def renamed(c: RowDTO, r: Optional[RenameDTO], macros: dict[str, str], taken: set[str]) -> RowDTO:
    """A concept row with its decision applied; the fields keep their places."""
    if r is None:
        return c
    forms = list(c.get("forms", []))
    formula = r.get("formula")
    if formula and not any(states(f, formula, macros) for f in forms):
        form = new_form(c["id"], formula, macros, taken)
        taken.add(form["id"])
        forms = forms + [form]
    out = {**c, "name": r["name"], **({"statement": r["statement"]} if r.get("statement") else {})}
    return {**out, "forms": forms} if forms else out


def records_after(book: ost.Book, plan: Plan) -> dict[str, RecordDTO]:
    record = ost.load(book.book_path)
    macros = {s["macro"]: s["latex"] for s in ost.rows_of(record, "symbols") if s.get("macro")}
    taken = {f["id"] for c in ost.rows_of(record, "concepts") for f in c.get("forms", [])}
    after = {**record, "concepts": [renamed(c, plan.renames.get(c["id"]), macros, taken) for c in ost.rows_of(record, "concepts")]}
    applied = {c["id"]: c for c in after["concepts"]}
    writes = {book.book_path: after} if after != record else {}
    for d in ost.chapter_dirs(book):
        path = os.path.join(book.dir, d, "book-rows.json")
        if not os.path.exists(path):
            continue
        staged = ost.load(path)
        staged_after = {**staged, "concepts": [applied.get(c["id"], c) if c["id"] in plan.renames else c for c in ost.rows_of(staged, "concepts")]}
        if staged_after != staged:
            writes[path] = staged_after
    return writes


def apply(book_id: BookId, decisions: Sequence[tuple[str, DecisionDTO]], dry_run: bool) -> int:
    book = ost.book_of(book_id)
    plan = plan_of(ost.rows_of(ost.load(book.book_path), "concepts"), decisions)
    if plan.problems:
        print(f"{book.id}: nothing written")
        for p in plan.problems:
            print(f"  {p}")
        return 1
    writes = records_after(book, plan)
    print(f"{book.id}: {len(plan.renames)} renames from {len(decisions)} files")
    for path in writes:
        print(f"{'would write' if dry_run else 'writes'} {os.path.relpath(path, book.dir)}")
    if not dry_run:
        for path, record in writes.items():
            ost.write_record(path, record)
    print("nothing to change" if not writes else f"{len(writes)} files {'to write' if dry_run else 'written'}")
    return 0


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(prog="apply_names", description=__doc__.split("\n\n")[0])
    p.add_argument("paths", nargs="+", help="decision files, or directories of them")
    p.add_argument("--dry-run", action="store_true", help="say what would change and write nothing")
    args = p.parse_args(argv)
    read = [(path, *read_decision(path)) for path in decision_files(args.paths)]
    unreadable = [problem for _, _, problem in read if problem]
    if unreadable:
        print("\n".join(unreadable))
        return 1
    by_book: dict[BookId, list[tuple[str, DecisionDTO]]] = {}
    for path, d, _ in read:
        by_book.setdefault(d["book"], []).append((path, d))
    results: list[int] = []
    try:
        ost.under_lock(lambda: results.extend(apply(b, ds, args.dry_run) for b, ds in by_book.items()))
    except ost.Refused as e:
        print(f"apply_names: {e}", file=sys.stderr)
        return 1
    return max(results, default=0)


if __name__ == "__main__":
    sys.exit(main())
