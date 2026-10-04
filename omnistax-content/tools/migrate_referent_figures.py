#!/usr/bin/env python3
"""Give every referents row the list of figures that draw it (RULES item 7, Colour).

A referent used to name one figure, `figure`; it now lists every figure that
draws it, `figures`, since its colour is one across the section and has to keep
clear of every figure it is drawn in. Each row's list is its old figure, then
every other figure of the section whose figures.js draws it with F.ref, in the
order the section sets its figures. Which figure draws what is read the way the
app's checker reads it (omnistax-web/src/lib/content/figrefs.ts, run through
scripts/figure-refs.ts), so the two agree.

    python3 omnistax-content/tools/migrate_referent_figures.py <book> [--dry-run]

Only the referents array of a section.json is rewritten, in the file's own form;
the rest of the file is left byte for byte. A section already migrated, with
nothing new drawn, has nothing to change.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from typing import Mapping, Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ost  # noqa: E402

FigureId = str
RefId = str
SectionId = str
RowDTO = dict
Drawn = Mapping[FigureId, Sequence[RefId]]            # one section: each figure and the referents it draws


@dataclass(frozen=True)
class Change:
    section: SectionId
    referent: RefId
    migrated: bool                                    # it named one `figure` and now lists `figures`
    added: tuple[FigureId, ...]                       # the figures it gained beyond the ones it listed
    undrawn: tuple[FigureId, ...]                     # figures it lists whose script draws it nowhere


def drawn_in_book(book_dir: str) -> dict[SectionId, Drawn]:
    """Every section's figures and the referents each draws, as the app's checker reads them."""
    env = {**os.environ, "PATH": ost.NODE_BIN + os.pathsep + os.environ.get("PATH", "")}
    done = subprocess.run(["npx", "tsx", "scripts/figure-refs.ts", book_dir], cwd=ost.WEB, env=env,
                          capture_output=True, text=True, check=True)
    return json.loads(done.stdout)


def migrate_row(row: RowDTO, order: Sequence[FigureId], drawn: Drawn) -> RowDTO:
    """The row with `figures` where `figure` stood: what it listed, then every figure that draws it."""
    listed = list(row.get("figures") or ([row["figure"]] if row.get("figure") else []))
    found = [f for f in order if row.get("id") in drawn.get(f, ()) and f not in listed]
    return {("figures" if k == "figure" else k): (listed + found if k in ("figure", "figures") else v) for k, v in row.items()}


def migrate_rows(section: SectionId, rows: Sequence[RowDTO], order: Sequence[FigureId], drawn: Drawn) -> tuple[list[RowDTO], list[Change]]:
    new = [migrate_row(r, order, drawn) for r in rows]
    changes = [Change(section, str(r.get("id")), "figure" in r,
                      tuple(f for f in n["figures"] if f not in (r.get("figures") or [r.get("figure")])),
                      tuple(f for f in n["figures"] if r.get("id") not in drawn.get(f, ())))
               for r, n in zip(rows, new)]
    return new, changes


def array_span(text: str, key: str) -> Optional[tuple[int, int]]:
    """Where the top-level array `key` of a JSON object stands in its text, brackets included."""
    depth, i, start = 0, 0, None
    while i < len(text):
        c = text[i]
        if c == '"':
            j = i + 1
            while text[j] != '"':
                j += 2 if text[j] == "\\" else 1
            if depth == 1 and start is None and text[i + 1:j] == key and text[j + 1:].lstrip().startswith(":"):
                start = text.index("[", j)
                depth_at, k = 0, start
                while True:
                    if text[k] == '"':
                        k += 1
                        while text[k] != '"':
                            k += 2 if text[k] == "\\" else 1
                    elif text[k] in "[{":
                        depth_at += 1
                    elif text[k] in "]}":
                        depth_at -= 1
                        if depth_at == 0:
                            return start, k + 1
                    k += 1
            i = j + 1
            continue
        depth += 1 if c in "[{" else -1 if c in "]}" else 0
        i += 1
    return None


def rewrite(text: str, record: dict, table: str) -> str:
    """The file with only `table` printed again, in the form ost's writer gives the whole file."""
    whole = ost.dumps_like(record, text)
    old, new = array_span(text, table), array_span(whole, table)
    if old is None or new is None:
        return whole
    out = text[:old[0]] + whole[new[0]:new[1]] + text[old[1]:]
    if json.loads(out) != record:
        raise ost.Refused(f"rewriting {table} changed more than {table}")
    return out


def write_text(path: str, text: str) -> None:
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix=".ost-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(tmp, path)
    except BaseException:
        os.path.exists(tmp) and os.remove(tmp)
        raise


def section_files(book_dir: str) -> list[str]:
    return sorted(os.path.join(d, "section.json") for d, _, files in os.walk(book_dir) if "section.json" in files)


def migrate_book(book_dir: str, drawn: Mapping[SectionId, Drawn], dry_run: bool) -> list[Change]:
    changes: list[Change] = []
    for path in section_files(book_dir):
        text = ost.read_text(path)
        record = json.loads(text)
        rows = record.get("referents") or []
        if not rows:
            continue
        sid = str(record.get("id"))
        new, found = migrate_rows(sid, rows, [f["id"] for f in record.get("figures") or []], drawn.get(sid, {}))
        changes += found
        if new != rows and not dry_run:
            write_text(path, rewrite(text, {**record, "referents": new}, "referents"))
    return changes


def report(changes: Sequence[Change]) -> str:
    migrated = [c for c in changes if c.migrated]
    gained = [c for c in changes if c.added]
    undrawn = [c for c in changes if c.undrawn]
    lines = [f"{len(changes)} referents, {len(migrated)} migrated from figure, {len(gained)} gained figures"]
    lines += [f"  {c.section} {c.referent} + {', '.join(c.added)}" for c in gained]
    lines += [f"{len(undrawn)} list a figure whose script draws them nowhere F.ref can be read"]
    lines += [f"  {c.section} {c.referent}: {', '.join(c.undrawn)}" for c in undrawn]
    return "\n".join(lines)


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("book", help="a book id, such as college-physics-2e")
    p.add_argument("--dry-run", action="store_true", help="say what would change and write nothing")
    args = p.parse_args(argv)
    try:
        book = ost.book_of(args.book)
    except ost.Refused as e:
        print(e, file=sys.stderr)
        return 1
    print(report(migrate_book(book.dir, drawn_in_book(book.dir), args.dry_run)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
