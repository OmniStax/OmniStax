#!/usr/bin/env python3
"""Give every figure the AI made its own `ai`, so its mark can say who made it.

A `sim` or `figure` row without `ai` takes the section's `ai.figures`, each
entry with `part: "built"`. A section with no `ai.figures` drew nothing of its
own and is listed instead. The old prose credit ("Claude Opus 5, with Claude
Fable 5.1") is read as the app reads it (schema.ts, `parseAiMakers`). A row that already has `ai` is left alone, so a
second run finds nothing to do.

    python3 omnistax-content/tools/backfill_ai.py [book id ...] [--dry-run]

With no book named it backfills every book.
"""
from __future__ import annotations

import argparse
import glob
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ost  # noqa: E402

MADE = ("sim", "figure")
NAMES = {"Claude Fable 5.1": "claude-fable-5-1", "Claude Opus 5": "claude-opus-5", "Claude Opus 5.5": "claude-opus-5-5"}


def makers_of(credit: object) -> list[dict]:
    """The section's figure makers, the old prose read into models; none where it names none."""
    if not isinstance(credit, str):
        return credit if isinstance(credit, list) else []
    models = [NAMES[n.strip()] for n in re.split(r",\s*with\s+|\s+and\s+|,\s*", credit) if n.strip() in NAMES]
    return [{"model": m} for m in dict.fromkeys(models or ["claude-opus-5"])]


def backfill(record: ost.RecordDTO) -> int:
    """Rows given `ai` in place; how many."""
    makers = makers_of((record.get("ai") or {}).get("figures"))
    if not makers:
        return 0
    rows = [f for f in ost.rows_of(record, "figures") if f.get("kind") in MADE and "ai" not in f]
    for f in rows:
        f["ai"] = [{**m, "part": "built"} for m in makers]
    return len(rows)


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("books", nargs="*")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args(argv)
    for book in [ost.book_of(b) for b in args.books] or ost.books():
        given = files = 0
        bare: list[str] = []
        for path in sorted(glob.glob(os.path.join(book.dir, "**", "section.json"), recursive=True)):
            record = ost.load(path)
            n = backfill(record)
            if not makers_of((record.get("ai") or {}).get("figures")) and any(f.get("kind") in MADE for f in ost.rows_of(record, "figures")):
                bare.append(os.path.relpath(path, book.dir))
            if n and not args.dry_run:
                ost.write_record(path, record)
            given, files = given + n, files + bool(n)
        print(f"{book.id}: {given} figure rows given ai in {files} section.json")
        for b in bare:
            print(f"  no ai.figures, left alone: {b}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
