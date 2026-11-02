#!/usr/bin/env python3
"""Merge one chapter's staged book-level rows into book.json, or append its log pass.

Several agents build chapters in parallel and book.json is one file, so a
chapter never edits book.json by hand. It writes what it wants added at book
level into `<chapter dir>/book-rows.json`:

    {
      "types":           [ {id, label, dimension}, ... ],       # new types only, in hue order
      "symbols":         [ {sym, latex, type?, macro?}, ... ],  # new symbols only
      "concepts":        [ {id, kind, section, name, statement?, eq?}, ... ],
      "concept_prereqs": [ {concept, prereq}, ... ]
    }

and runs

    python3 tools/mergebook.py merge ch04

which takes a lock, updates every row the chapter owns (concepts whose
section is in the chapter, the edges out of them, and the symbols and types
this chapter merged before) from the staged rows where it stands, drops an
owned row the staged rows leave out, appends a staged row that is new, adds
the chapter dir to `chapters` in numeric order, and writes book.json
atomically. No row moves: a re-merge that changes nothing leaves book.json as
it was, so run it after every change to book-rows.json.

Ownership rules the merge enforces (it refuses and prints the offenders):
  - a staged concept id may not exist under another chapter's section, unless
    it stands there as a placeholder pointing at one of this chapter's sections;
  - a concept already in book.json under this chapter's sections that the staged
    rows leave out is withdrawn, unless another chapter's edge rests on it;
  - a staged symbol `sym` or `macro`, or a staged type `id`, may not already
    exist in book.json unless this chapter merged it earlier; the one exception
    is a symbol of the book's own, merged by no chapter, which a chapter adopts
    by staging it with its other fields as they are and a `macro` of its own;
  - a staged edge's `concept` must be one of this chapter's concepts, and its
    `prereq` must exist in book.json or in the staged rows.

The log pass:

    python3 tools/mergebook.py log ch04

appends `<chapter dir>/log-pass.md` to LOG.md as the next numbered pass
(the file's first line is the pass title, without the "## Pass N" prefix)
and deletes the staged file.
"""
import fcntl
import json
import os
import re
import sys
import tempfile
from datetime import date

BOOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(BOOK, "tools", "merge-state.json")
LOCK = "/tmp/omnistax-mergebook.lock"


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_atomic(path, text):
    d = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(dir=d, prefix=".tmp-", suffix=".json")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


def chapter_number(ch):
    """The order a chapter dir sorts in: the numbered chapters by number, then the
    lettered appendices (appA is a chapter of this book, id A) after them by letter."""
    m = re.fullmatch(r"ch(\d\d)", ch)
    if m:
        return int(m.group(1))
    m = re.fullmatch(r"app([A-Z])", ch)
    if m:
        return 100 + ord(m.group(1))
    sys.exit(f"chapter dir must look like ch04 or appA, got {ch}")


def update_in_place(rows, staged, key, owned):
    """Return `rows` with every owned row replaced by its staged version where
    it stands, an owned row no longer staged dropped, and a staged row that is
    new appended at the end, in staged order. `key` names a row."""
    by_key = {key(r): r for r in staged}
    out = []
    for r in rows:
        k = key(r)
        if k not in owned:
            out.append(r)
        elif k in by_key:
            out.append(by_key.pop(k))
    out.extend(r for r in staged if by_key.pop(key(r), None) is not None)
    return out


def merge(ch):
    n = chapter_number(ch)
    chdir = os.path.join(BOOK, ch)
    staged_path = os.path.join(chdir, "book-rows.json")
    if not os.path.exists(staged_path):
        sys.exit(f"no {staged_path}")
    staged = load(staged_path)
    for key in ("types", "symbols", "concepts", "concept_prereqs"):
        staged.setdefault(key, [])
    unknown = set(staged) - {"types", "symbols", "concepts", "concept_prereqs"}
    if unknown:
        sys.exit(f"book-rows.json has unknown keys: {sorted(unknown)}")

    chapter = load(os.path.join(chdir, "chapter.json"))
    if chapter.get("dir") != ch:
        sys.exit(f"{ch}/chapter.json dir is {chapter.get('dir')!r}, expected {ch!r}")
    my_sections = {s["id"] for s in chapter["sections"]}

    book = load(os.path.join(BOOK, "book.json"))
    state = load(STATE) if os.path.exists(STATE) else {}
    mine = state.get(ch, {"symbols": [], "types": []})
    errors = []

    # concepts
    staged_ids = [c["id"] for c in staged["concepts"]]
    if len(set(staged_ids)) != len(staged_ids):
        errors.append("duplicate concept ids in staged rows")
    for c in staged["concepts"]:
        if c.get("section") not in my_sections:
            errors.append(f"concept {c['id']} names section {c.get('section')!r}, not one of {ch}'s")
    placeholders = {c["id"] for c in book["concepts"] if c["section"] in my_sections}
    referenced = {e["prereq"] for e in book["concept_prereqs"] if e["concept"] not in placeholders}
    for pid in sorted(placeholders - set(staged_ids)):
        if pid in referenced:
            errors.append(f"concept {pid} is missing from the staged rows but another chapter's edge rests on it; keep it or move it")
        else:
            print(f"mergebook: {ch} withdraws {pid} (no other chapter rests on it)")
    others = {c["id"]: c["section"] for c in book["concepts"] if c["section"] not in my_sections}
    for cid in staged_ids:
        if cid in others:
            errors.append(f"concept {cid} already exists under section {others[cid]}")

    # edges
    known = set(others) | set(staged_ids)
    for e in staged["concept_prereqs"]:
        if e["concept"] not in staged_ids:
            errors.append(f"edge {e['concept']} -> {e['prereq']}: concept is not one of {ch}'s")
        if e["prereq"] not in known:
            errors.append(f"edge {e['concept']} -> {e['prereq']}: prereq does not exist")

    # symbols
    owners = {sym: c for c, rows in state.items() for sym in rows.get("symbols", [])}
    book_syms = {s["sym"]: s for s in book["symbols"]}

    def bare(s):
        return {k: v for k, v in s.items() if k != "macro"}

    adopted = {s["sym"] for s in staged["symbols"]
               if s["sym"] in book_syms and s["sym"] not in owners and bare(s) == bare(book_syms[s["sym"]])}
    owned_syms = set(mine["symbols"]) | adopted
    other_syms = set(book_syms) - owned_syms
    other_macros = {s.get("macro") for s in book["symbols"] if s["sym"] not in owned_syms} - {None}
    seen_syms, seen_macros = set(), set()
    for s in staged["symbols"]:
        if s["sym"] in other_syms and owners.get(s["sym"]):
            errors.append(f"symbol {s['sym']} belongs to {owners[s['sym']]}; stage a change to it there")
        elif s["sym"] in other_syms:
            errors.append(f"symbol {s['sym']} is the book's own; a chapter adopts it only to give it a macro, its other fields as they are")
        if s.get("macro") and s["macro"] in other_macros:
            errors.append(f"macro {s['macro']} already exists in book.json under another sym")
        if s["sym"] in seen_syms:
            errors.append(f"symbol {s['sym']} staged twice")
        if s.get("macro") and s["macro"] in seen_macros:
            errors.append(f"macro {s['macro']} staged twice")
        seen_syms.add(s["sym"])
        if s.get("macro"):
            seen_macros.add(s["macro"])

    # types
    other_types = {t["id"] for t in book["types"] if t["id"] not in mine["types"]}
    for t in staged["types"]:
        if t["id"] in other_types:
            errors.append(f"type {t['id']} already exists in book.json")
    type_ids = other_types | {t["id"] for t in staged["types"]}
    for s in staged["symbols"]:
        if s.get("type") and s["type"] not in type_ids:
            errors.append(f"symbol {s['sym']} names type {s['type']}, which does not exist")

    if errors:
        print(f"mergebook: {ch} refused:")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    # apply
    # Every table keeps its rows where they stand: the order of `types` is the
    # order the colour scheme deals hues along, and a re-merge that changes no
    # row must leave every table, and the diff, as it was. A row this chapter
    # owns is replaced where it stands; a new row is appended.
    edge = lambda e: (e["concept"], e["prereq"])
    mine_ids = placeholders | set(staged_ids)
    book["concepts"] = update_in_place(book["concepts"], staged["concepts"], lambda c: c["id"], placeholders)
    book["concept_prereqs"] = update_in_place(book["concept_prereqs"], staged["concept_prereqs"], edge,
                                              {edge(e) for e in book["concept_prereqs"] if e["concept"] in mine_ids})
    book["symbols"] = update_in_place(book["symbols"], staged["symbols"], lambda s: s["sym"], owned_syms)
    book["types"] = update_in_place(book["types"], staged["types"], lambda t: t["id"], set(mine["types"]))
    if ch not in book["chapters"]:
        book["chapters"] = sorted(book["chapters"] + [ch], key=chapter_number)

    write_atomic(os.path.join(BOOK, "book.json"), json.dumps(book, indent=2, ensure_ascii=False) + "\n")
    state[ch] = {"symbols": [s["sym"] for s in staged["symbols"]], "types": [t["id"] for t in staged["types"]]}
    write_atomic(STATE, json.dumps(state, indent=2) + "\n")
    print(f"mergebook: {ch} merged: {len(staged['concepts'])} concepts, {len(staged['concept_prereqs'])} edges, "
          f"{len(staged['symbols'])} symbols, {len(staged['types'])} types; chapters now {book['chapters']}")


def log(ch):
    chapter_number(ch)
    staged_path = os.path.join(BOOK, ch, "log-pass.md")
    if not os.path.exists(staged_path):
        sys.exit(f"no {staged_path}")
    text = open(staged_path, encoding="utf-8").read().strip("\n")
    title, _, body = text.partition("\n")
    title = re.sub(r"^#+\s*", "", title).strip()
    title = re.sub(r"^Pass( \d+)? \([^)]*\):\s*", "", title)
    logp = os.path.join(BOOK, "LOG.md")
    existing = open(logp, encoding="utf-8").read()
    nums = [int(m) for m in re.findall(r"^#{2,3} Pass (\d+)", existing, re.M)]
    n = (max(nums) if nums else 0) + 1
    entry = f"\n\n## Pass {n} ({date.today().isoformat()}): {title}\n\n{body.strip()}\n"
    with open(logp, "a", encoding="utf-8") as f:
        f.write(entry)
    os.remove(staged_path)
    print(f"mergebook: appended Pass {n} for {ch} to LOG.md")


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in ("merge", "log"):
        sys.exit("usage: mergebook.py merge|log chNN")
    with open(LOCK, "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        (merge if sys.argv[1] == "merge" else log)(sys.argv[2])


if __name__ == "__main__":
    main()
