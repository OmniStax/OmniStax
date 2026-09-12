#!/usr/bin/env python3
"""`ost`: read and write a book's content tables.

A book is three kinds of file — `book.json`, a `chapter.json` per chapter and a
`section.json` per section — and every array field of each is a table of flat
rows (docs/content-tables.md). Agents that build sections need a few rows out
of files that are growing to thousands, and they need to write one row without
learning of a mistake only when the app is built. `ost` is that: it queries,
validates, writes one row at a time and runs the app's own checker. It holds no
rule about content; every rule it knows is the shape of a row.

    python3 omnistax-content/tools/ost.py <command> ...

Commands: books, show, rows, find, add, set, del, merge, log, check, ids.
`-h` on any of them. The reference is tools/README.md.
"""
from __future__ import annotations

import argparse
import fcntl
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Optional, Sequence

# ---------------------------------------------------------------- type aliases

BookId = str          # a book's own id, "chemistry-2e"
TableName = str       # a table of one of the three files, "coverage"
SectionId = str       # a section as the book prints it, "1.4", or "intro"
ChapterDir = str      # a chapter's directory, "ch01"
FieldName = str
RowDTO = dict[str, Any]       # one row as it sits on disk
RecordDTO = dict[str, Any]    # one whole file as it sits on disk
Key = tuple[str, ...]         # the values that identify a row in its table

TOOLS = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.dirname(TOOLS)
REPO = os.path.dirname(CONTENT)
WEB = os.path.join(REPO, "omnistax-web")
NODE_BIN = os.environ.get("OMNISTAX_NODE_BIN", "/home/flober/.nvm/versions/node/v20.20.2/bin")
LOCK = "/tmp/omnistax-mergebook.lock"
STAGED_TABLES = ("types", "symbols", "concepts", "concept_prereqs")


class Refused(Exception):
    """An error the reader should see as one line, and nothing written."""


# ------------------------------------------------------- the shape of the rows
# What `content-format.md` says, in the little of it a writer has to check
# before the app's checker is worth waiting for: which fields a table has,
# which it must have, and which are drawn from a fixed list.

@dataclass(frozen=True)
class Field:
    required: bool = False
    kind: str = "str"                     # str | num | bool | list | obj
    enum: tuple[str, ...] = ()


@dataclass(frozen=True)
class Table:
    level: str                            # book | chapter | section
    key: Key                              # the fields that identify a row
    fields: dict[FieldName, Field]
    show: tuple[FieldName, ...]           # the fields a plain line prints


def _f(required: bool = False, kind: str = "str", enum: Sequence[str] = ()) -> Field:
    return Field(required, kind, tuple(enum))


KIND = ("idea", "result", "skill")
VERB = ("introduces", "uses", "reinforces")
BLOOM = ("Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create")
FIGURE = ("sim", "figure", "photo")

TABLES: dict[TableName, Table] = {
    "types": Table("book", ("id",), {
        "id": _f(True), "label": _f(True), "dimension": _f()}, ("id", "label", "dimension")),
    "symbols": Table("book", ("sym",), {
        "sym": _f(True), "latex": _f(True), "type": _f(), "macro": _f()}, ("sym", "latex", "type", "macro")),
    "exercise_kinds": Table("book", ("id",), {
        "id": _f(True), "label": _f(True)}, ("id", "label")),
    "concepts": Table("book", ("id",), {
        "id": _f(True), "kind": _f(True, enum=KIND), "section": _f(True), "name": _f(True),
        "why": _f(), "evidence": _f(), "eq": _f()}, ("id", "kind", "section", "name", "why")),
    "concept_prereqs": Table("book", ("concept", "prereq"), {
        "concept": _f(True), "prereq": _f(True)}, ("concept", "prereq")),
    "sheets": Table("book", ("id",), {
        "id": _f(True), "title": _f(True), "kind": _f(True, enum=("elements", "table")),
        "file": _f(True)}, ("id", "kind", "title", "file")),

    "sections": Table("chapter", ("id",), {
        "id": _f(True), "module": _f(), "title": _f(True), "slug": _f()}, ("id", "title", "module", "slug")),
    "variables": Table("chapter", ("section", "sym"), {
        "sym": _f(True), "type": _f(), "meaning": _f(True), "unit": _f(), "section": _f(True),
        "anchor": _f()}, ("section", "sym", "type", "unit", "meaning")),
    "equations": Table("chapter", ("id",), {
        "id": _f(True), "concept": _f(), "section": _f(True), "latex": _f(True), "ktex": _f(),
        "condition": _f(), "anchor": _f(), "important": _f(kind="bool")},
        ("id", "section", "latex", "concept", "important")),
    "glossary": Table("chapter", ("section", "term"), {
        "section": _f(True), "term": _f(True), "definition": _f(True)}, ("section", "term", "definition")),

    "figures": Table("section", ("id",), {
        "id": _f(True), "kind": _f(True, enum=FIGURE), "number": _f(), "folds": _f(kind="list"),
        "originals": _f(kind="list"), "original_caption": _f(), "widths": _f(kind="list"),
        "draws": _f(kind="list")}, ("id", "kind", "number", "folds", "draws")),
    "coverage": Table("section", ("span", "concept", "verb"), {
        "span": _f(True), "concept": _f(True), "verb": _f(True, enum=VERB)}, ("span", "concept", "verb")),
    "exercises": Table("section", ("id",), {
        "id": _f(True), "source_id": _f(True), "source_section": _f(), "kind": _f(True),
        "bloom": _f(True, enum=BLOOM), "tag": _f(), "place": _f(True, kind="obj"), "cite": _f(),
        "figure": _f(kind="obj"), "prompt": _f(True), "answer": _f(True, kind="obj")},
        ("id", "kind", "bloom", "place", "prompt")),
    "exercise_concepts": Table("section", ("exercise", "concept"), {
        "exercise": _f(True), "concept": _f(True), "weight": _f(kind="num")},
        ("exercise", "concept", "weight")),
}

KINDS_OK = {"str": str, "num": (int, float), "bool": bool, "list": list, "obj": dict}


def table_of(name: TableName) -> Table:
    if name not in TABLES:
        raise Refused(f"no table {name!r}; the tables are {', '.join(sorted(TABLES))}")
    return TABLES[name]


def key_of(table: Table, row: RowDTO) -> Key:
    return tuple(str(row.get(f, "")) for f in table.key)


def validate(table: Table, row: RowDTO) -> None:
    """One line about the first thing wrong with a row, or nothing."""
    if not isinstance(row, dict):
        raise Refused("a row must be a JSON object")
    for name, value in row.items():
        field = table.fields.get(name)
        if field is None:
            raise Refused(f"unknown field {name!r}; the fields are {', '.join(table.fields)}")
        if value is not None and not isinstance(value, KINDS_OK[field.kind]):
            raise Refused(f"field {name!r} should be a {field.kind}, got {type(value).__name__}")
        if field.enum and value not in field.enum:
            raise Refused(f"field {name!r} is {value!r}; it must be one of {', '.join(field.enum)}")
    for name, field in table.fields.items():
        if field.required and row.get(name) in (None, ""):
            raise Refused(f"field {name!r} is required")


# ------------------------------------------------------------ reading the disk
# Nothing is read that a command does not need: a `rows` on a section table
# opens that one section.json and neither the chapter nor the book.

@dataclass(frozen=True)
class Book:
    id: BookId
    dir: str

    @property
    def book_path(self) -> str:
        return os.path.join(self.dir, "book.json")


def read_text(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


def load(path: str) -> RecordDTO:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise Refused(f"no {os.path.relpath(path, REPO)}")
    except json.JSONDecodeError as e:
        raise Refused(f"{os.path.relpath(path, REPO)} does not parse: {e}")


def books() -> list[Book]:
    found = []
    for name in sorted(os.listdir(CONTENT)):
        path = os.path.join(CONTENT, name, "book.json")
        if os.path.exists(path):
            try:
                found.append(Book(json.loads(read_text(path))["id"], os.path.join(CONTENT, name)))
            except Exception:
                continue
    return found


def book_of(book_id: BookId) -> Book:
    for b in books():
        if b.id == book_id:
            return b
    raise Refused(f"no book {book_id!r}; the books are {', '.join(b.id for b in books())}")


def chapter_dirs(book: Book) -> list[ChapterDir]:
    return sorted(d for d in os.listdir(book.dir) if re.fullmatch(r"ch\d\d", d))


def chapter_dir_of(book: Book, named: str) -> ChapterDir:
    """A chapter by its directory ("ch01"), its number ("1") or a section of it ("1.4")."""
    name = named.split(".")[0]
    if re.fullmatch(r"ch\d\d", named):
        want = named
    elif re.fullmatch(r"\d+", name):
        want = f"ch{int(name):02d}"
    else:
        raise Refused(f"{named!r} names no chapter; say 1, 01 or ch01")
    if want not in chapter_dirs(book):
        raise Refused(f"{book.id} has no chapter {want}")
    return want


def chapter_path(book: Book, named: str) -> str:
    return os.path.join(book.dir, chapter_dir_of(book, named), "chapter.json")


def section_path(book: Book, section: SectionId) -> str:
    """`1.4`, a chapter's own `1.intro`, or the book's own `intro`."""
    if section in ("intro", "summary"):
        return os.path.join(book.dir, section, "section.json")
    head, _, tail = section.partition(".")
    if tail in ("intro", "summary"):
        return os.path.join(book.dir, chapter_dir_of(book, head), tail, "section.json")
    return os.path.join(book.dir, chapter_dir_of(book, section), section, "section.json")


def is_built(book: Book, section: SectionId) -> bool:
    try:
        return os.path.exists(section_path(book, section))
    except Refused:
        return False


@dataclass(frozen=True)
class Place:
    """Which file a table's rows live in, and which one this command means."""
    path: str
    label: str            # what an error calls the file


def place_of(book: Book, table: Table, chapter: Optional[str], section: Optional[SectionId]) -> Place:
    if table.level == "book":
        return Place(book.book_path, "book.json")
    if table.level == "chapter":
        named = chapter or section
        if named is None:
            raise Refused(f"a {table.level} table needs --chapter N (or --section N.M)")
        d = chapter_dir_of(book, named)
        return Place(os.path.join(book.dir, d, "chapter.json"), f"{d}/chapter.json")
    if section is None:
        raise Refused("a section table needs --section N.M")
    return Place(section_path(book, section), f"{section}/section.json")


def rows_of(record: RecordDTO, name: TableName) -> list[RowDTO]:
    value = record.get(name, [])
    return list(value) if isinstance(value, list) else []


# ---------------------------------------------------- writing, keeping the form
# The files were written by several hands: one indents by a space and another by
# two, one sets a coverage row on its own line and another all on one. A write
# of one row should leave every other byte as it was, so the writer learns the
# form of the file it is about to rewrite and prints in it.

_WS = re.compile(r"[ \t\n\r]*")
_DEC = json.JSONDecoder()
Style = dict[tuple, Any]      # a path in the record -> how it was printed


def _scan(text: str, i: int, path: tuple, style: Style, raws: dict[tuple, str]) -> int:
    """Walk the text beside its value, noting how each container and number was set."""
    i = _WS.match(text, i).end()
    ch = text[i]
    if ch in "{[":
        start, i, n = i, i + 1, 0
        close = "}" if ch == "{" else "]"
        i = _WS.match(text, i).end()
        if text[i] == close:
            i += 1
        else:
            while True:
                if ch == "{":
                    key, i = _DEC.scan_once(text, _WS.match(text, i).end())
                    i = _scan(text, _WS.match(text, i).end() + 1, path + (key,), style, raws)
                else:
                    i = _scan(text, i, path + (n,), style, raws)
                    n += 1
                i = _WS.match(text, i).end()
                if text[i] == ",":
                    i += 1
                    continue
                i += 1
                break
        style[path] = "\n" not in text[start:i]
        return i
    value, end = _DEC.scan_once(text, i)
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        raws[path] = text[i:end]
    return end


def learn(text: str) -> tuple[int, Style, dict[tuple, str]]:
    style: Style = {}
    raws: dict[tuple, str] = {}
    _scan(text, 0, (), style, raws)
    m = re.search(r"\n( +)\"", text)
    return (len(m.group(1)) if m else 2), style, raws


def _collapsed(path: tuple) -> tuple:
    return tuple("[]" if isinstance(p, int) else p for p in path)


def _majority(style: Style) -> dict[tuple, bool]:
    tally: dict[tuple, list[int]] = {}
    for path, inline in style.items():
        t = tally.setdefault(_collapsed(path), [0, 0])
        t[1 if inline else 0] += 1
    return {k: v[1] > v[0] for k, v in tally.items()}


def _render(v: Any, ind: int, style: Style, maj: dict[tuple, bool],
            raws: dict[tuple, str], path: tuple, level: int) -> str:
    inline = style.get(path, maj.get(_collapsed(path), False))
    pad, pad2 = " " * (ind * level), " " * (ind * (level + 1))
    inner = 0 if inline else level + 1
    if isinstance(v, dict):
        if not v:
            return "{}"
        items = [(json.dumps(k, ensure_ascii=False),
                  _render(x, ind, style, maj, raws, path + (k,), inner)) for k, x in v.items()]
        if inline:
            return "{ " + ", ".join(f"{k}: {s}" for k, s in items) + " }"
        return "{\n" + ",\n".join(pad2 + k + ": " + s for k, s in items) + "\n" + pad + "}"
    if isinstance(v, list):
        if not v:
            return "[]"
        items = [_render(x, ind, style, maj, raws, path + (i,), inner) for i, x in enumerate(v)]
        if inline:
            return "[" + ", ".join(items) + "]"
        return "[\n" + ",\n".join(pad2 + s for s in items) + "\n" + pad + "]"
    if isinstance(v, (int, float)) and not isinstance(v, bool) and path in raws:
        try:
            if json.loads(raws[path]) == v:
                return raws[path]
        except ValueError:
            pass
    return json.dumps(v, ensure_ascii=False)


def dumps_like(value: RecordDTO, text: str) -> str:
    """Print `value` as `text` was printed: the same indent, the same rows set inline."""
    ind, style, raws = learn(text)
    return _render(value, ind, style, _majority(style), raws, (), 0) + "\n"


def write_record(path: str, record: RecordDTO) -> None:
    """Write temp, parse it back, rename: the file on disk is never half a record."""
    text = dumps_like(record, read_text(path)) if os.path.exists(path) \
        else json.dumps(record, indent=1, ensure_ascii=False) + "\n"
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix=".ost-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        with open(tmp, encoding="utf-8") as f:
            json.load(f)
        os.replace(tmp, path)
    except BaseException:
        os.path.exists(tmp) and os.remove(tmp)
        raise


# ------------------------------------------------------------------ the checker

def run_checker(book_id: BookId) -> tuple[int, list[str]]:
    """`npm run check:content` for one book: its exit code and the lines it printed."""
    env = dict(os.environ, OMNISTAX_BOOKS=book_id)
    if os.path.isdir(NODE_BIN):
        env["PATH"] = NODE_BIN + os.pathsep + env.get("PATH", "")
    try:
        done = subprocess.run(["npm", "run", "--silent", "check:content"], cwd=WEB, env=env,
                              capture_output=True, text=True)
    except FileNotFoundError:
        raise Refused("npm is not on PATH; set OMNISTAX_NODE_BIN to the node bin directory")
    return done.returncode, (done.stdout + done.stderr).splitlines()


GROUP = re.compile(r"^(\d+) (error|warning|note)s?$")


@dataclass(frozen=True)
class Finding:
    level: str            # error | warning | note
    where: str
    what: str

    def line(self) -> str:
        return f"  {self.level}  {self.where}  {self.what}"


def findings(lines: Sequence[str]) -> list[Finding]:
    """The checker groups its findings under a heading and sets each off by two spaces."""
    level, found = "error", []
    for ln in lines:
        head = GROUP.match(ln.strip()) if not ln.startswith("  ") else None
        if head:
            level = head.group(2)
        elif ln.startswith("  ") and ln.strip():
            where, _, what = ln.strip().partition("  ")
            found.append(Finding(level, where, what.strip()))
    return found


def naming(found: Sequence[Finding], prefix: str) -> list[Finding]:
    return [f for f in found if f.where.startswith(prefix)]


def report_write(book_id: BookId, prefix: str) -> int:
    """After a write: only what the checker says about the file that changed."""
    _, lines = run_checker(book_id)
    named = naming(findings(lines), prefix)
    print("\n".join(f.line() for f in named) if named else "ok")
    return 1 if any(f.level == "error" for f in named) else 0


# ----------------------------------------------------------------- the commands

def out(rows: Iterable[RowDTO], fields: Optional[Sequence[FieldName]], as_json: bool,
        show: Sequence[FieldName]) -> None:
    rows = [{k: v for k, v in row.items() if fields is None or k in fields} for row in rows]
    if as_json:
        print(json.dumps(rows, indent=1, ensure_ascii=False))
        return
    for row in rows:
        names = fields or [f for f in show if f in row] or list(row)
        print(" · ".join(cell(row.get(n)) for n in names if row.get(n) not in (None, "", [], {})))


def cell(value: Any) -> str:
    if isinstance(value, (dict, list)):
        text = json.dumps(value, ensure_ascii=False)
    elif isinstance(value, bool):
        text = "yes" if value else "no"
    else:
        text = str(value)
    text = re.sub(r"\s+", " ", text)
    return text if len(text) <= 110 else text[:109] + "…"


def matches(row: RowDTO, wheres: Sequence[str]) -> bool:
    for where in wheres:
        if "~" in where and ("=" not in where or where.index("~") < where.index("=")):
            field, _, text = where.partition("~")
            if text.lower() not in cell(row.get(field, "")).lower():
                return False
        else:
            field, _, value = where.partition("=")
            if cell(row.get(field, "")) != value:
                return False
    return True


def cmd_books(args: argparse.Namespace) -> int:
    for b in books():
        record = load(b.book_path)
        built = len(record.get("chapters", []))
        print(f"{b.id} · {record.get('title', '')} · {built} chapter{'' if built == 1 else 's'} built")
    return 0


def cmd_rows(args: argparse.Namespace) -> int:
    table = table_of(args.table)
    section, chapter = args.section, args.chapter
    wheres = list(args.where)
    if table.level == "book" and section and "section" in table.fields:
        wheres.append(f"section={section}")
        section = None
    place = place_of(book_of(args.book), table, chapter, section)
    rows = [r for r in rows_of(load(place.path), args.table) if matches(r, wheres)]
    if table.level == "book" and args.chapter and "section" in table.fields:
        head = chapter_dir_of(book_of(args.book), args.chapter)
        keep = {s["id"] for s in rows_of(load(os.path.join(book_of(args.book).dir, head, "chapter.json")), "sections")}
        rows = [r for r in rows if r.get("section") in keep]
    out(rows, args.fields.split(",") if args.fields else None, args.json, table.show)
    return 0


def cmd_find(args: argparse.Namespace) -> int:
    book = book_of(args.book)
    text = args.text.lower()
    hits: list[str] = []

    def look(where: str, *values: Any) -> None:
        if any(text in str(v).lower() for v in values if v not in (None, "")):
            hits.append(f"{where} · " + " · ".join(cell(v) for v in values if v not in (None, "")))

    record = load(book.book_path)
    for t in record.get("types", []):
        look("book.json types", t.get("id"), t.get("label"))
    for s in record.get("symbols", []):
        look("book.json symbols", s.get("sym"), s.get("latex"), s.get("macro"))
    for c in record.get("concepts", []):
        look(f"book.json concepts[{c.get('section')}]", c.get("id"), c.get("name"))
    for s in record.get("sheets", []):
        look("book.json sheets", s.get("id"), s.get("title"))
    for d in chapter_dirs(book):
        path = os.path.join(book.dir, d, "chapter.json")
        if not os.path.exists(path):
            continue
        chapter = load(path)
        for s in rows_of(chapter, "sections"):
            look(f"{d}/chapter.json sections", s.get("id"), s.get("title"))
        for v in rows_of(chapter, "variables"):
            look(f"{d}/chapter.json variables[{v.get('section')}]", v.get("sym"), v.get("meaning"))
        for e in rows_of(chapter, "equations"):
            look(f"{d}/chapter.json equations[{e.get('section')}]", e.get("id"), e.get("latex"))
        for g in rows_of(chapter, "glossary"):
            look(f"{d}/chapter.json glossary[{g.get('section')}]", g.get("term"), g.get("definition"))
        for s in rows_of(chapter, "sections"):
            spath = os.path.join(book.dir, d, str(s.get("id")), "section.json")
            if not os.path.exists(spath):
                continue
            section = load(spath)
            for f in rows_of(section, "figures"):
                look(f"{s.get('id')}/section.json figures", f.get("id"), f.get("number"), f.get("original_caption"))
            for e in rows_of(section, "exercises"):
                look(f"{s.get('id')}/section.json exercises", e.get("id"), e.get("source_id"), e.get("prompt"))
    print("\n".join(hits) if hits else f"nothing in {book.id} says {args.text!r}")
    return 0


def cmd_show(args: argparse.Namespace) -> int:
    book = book_of(args.book)
    named = args.section or args.chapter      # "show book 1.4" means the section, not its chapter
    if named is None:
        return show_book(book)
    return show_section(book, named) if "." in named or named in ("intro", "summary") \
        else show_chapter(book, named)


def show_book(book: Book) -> int:
    record = load(book.book_path)
    print(f"{record.get('title')} ({book.id}) · {record.get('publisher')} · {record.get('license')}")
    print("types: " + ", ".join(t["id"] for t in rows_of(record, "types")))
    print(f"symbols: {len(rows_of(record, 'symbols'))} · concepts: {len(rows_of(record, 'concepts'))}"
          f" · edges: {len(rows_of(record, 'concept_prereqs'))}"
          f" · exercise kinds: {', '.join(k['id'] for k in rows_of(record, 'exercise_kinds'))}")
    for d in chapter_dirs(book):
        path = os.path.join(book.dir, d, "chapter.json")
        if not os.path.exists(path):
            continue
        chapter = load(path)
        sections = rows_of(chapter, "sections")
        built = [s["id"] for s in sections if is_built(book, str(s["id"]))]
        listed = " in the book" if d in record.get("chapters", []) else " (not in chapters)"
        print(f"{d} · chapter {chapter.get('id')} · {chapter.get('title')} · "
              f"{len(built)}/{len(sections)} built{'' if built else ''}{listed}"
              + (": " + ", ".join(built) if built else ""))
    for s in rows_of(record, "sheets"):
        print(f"sheet {s.get('id')} · {s.get('kind')} · {s.get('title')}")
    return 0


def show_chapter(book: Book, named: str) -> int:
    chapter = load(chapter_path(book, named))
    print(f"chapter {chapter.get('id')} · {chapter.get('title')} · {chapter.get('dir')}")
    concepts = [c for c in rows_of(load(book.book_path), "concepts")]
    for s in rows_of(chapter, "sections"):
        sid = str(s.get("id"))
        n = (len([v for v in rows_of(chapter, "variables") if v.get("section") == sid]),
             len([e for e in rows_of(chapter, "equations") if e.get("section") == sid]),
             len([g for g in rows_of(chapter, "glossary") if g.get("section") == sid]),
             len([c for c in concepts if c.get("section") == sid]))
        print(f"{sid} · {'built' if is_built(book, sid) else 'unbuilt'} · {s.get('title')} · "
              f"{n[0]} variables · {n[1]} equations · {n[2]} glossary · {n[3]} concepts")
    for role in ("intro", "summary"):
        if chapter.get(role):
            print(f"{role} · {'built' if os.path.exists(os.path.join(book.dir, str(chapter.get('dir')), role, 'section.json')) else 'unbuilt'}"
                  f" · module {chapter[role].get('module')}")
    return 0


def show_section(book: Book, section: SectionId) -> int:
    record = load(section_path(book, section))
    print(f"{record.get('id')} · {record.get('title')} · built {record.get('built')}")
    if record.get("lead"):
        print(f"lead: {record['lead']}")
    for f in rows_of(record, "figures"):
        number = f" · {f['number']}" if f.get("number") else ""
        folds = " + " + " + ".join(f["folds"]) if f.get("folds") else ""
        draws = " · draws " + ", ".join(f["draws"]) if f.get("draws") else ""
        print(f"figure {f.get('id')} · {f.get('kind')}{number}{folds}{draws}")
    spans: dict[str, list[str]] = {}
    for c in rows_of(record, "coverage"):
        spans.setdefault(str(c.get("concept")), []).append(str(c.get("verb")))
    for concept, verbs in sorted(spans.items()):
        print(f"concept {concept} · " + ", ".join(f"{verbs.count(v)} {v}" for v in dict.fromkeys(verbs)))
    kinds: dict[str, int] = {}
    for e in rows_of(record, "exercises"):
        kinds[str(e.get("kind"))] = kinds.get(str(e.get("kind")), 0) + 1
    print("exercises: " + (", ".join(f"{n} {k}" for k, n in kinds.items()) if kinds else "none")
          + f" · {len(rows_of(record, 'exercise_concepts'))} exercise_concepts rows")
    if record.get("notes"):
        print(f"notes: {record['notes']}")
    if record.get("exercise_notes"):
        print(f"exercise notes: {record['exercise_notes']}")
    return 0


def cmd_ids(args: argparse.Namespace) -> int:
    path = os.path.join(os.path.dirname(section_path(book_of(args.book), args.section)), "text.html")
    if not os.path.exists(path):
        raise Refused(f"no {os.path.relpath(path, REPO)}")
    html = read_text(path)
    print("\n".join(dict.fromkeys(re.findall(r'\sid="([^"]+)"', html))))
    return 0


def cmd_check(args: argparse.Namespace) -> int:
    book_of(args.book)
    code, lines = run_checker(args.book)
    if args.section:
        named = naming(findings(lines), f"{args.section}/")
        print("\n".join(f.line() for f in named) if named else "ok")
        return 1 if any(f.level == "error" for f in named) else 0
    print("\n".join(lines))
    return code


# ------------------------------------------------------------------- the writes

def parse_row(text: str) -> RowDTO:
    try:
        row = json.loads(text)
    except json.JSONDecodeError as e:
        raise Refused(f"the row is not JSON: {e}")
    if not isinstance(row, dict):
        raise Refused("the row must be a JSON object")
    return row


def find_row(table: Table, rows: Sequence[RowDTO], wanted: str) -> int:
    keys = [w for w in wanted.split("/")]
    for i, row in enumerate(rows):
        if list(key_of(table, row)) == keys or (len(table.key) == 1 and row.get(table.key[0]) == wanted):
            return i
    raise Refused(f"no row {wanted!r}; a row of this table is named by {'/'.join(table.key)}")


def apply_write(table: Table, rows: list[RowDTO], args: argparse.Namespace) -> list[RowDTO]:
    """The one pure step of a write: the table's rows before, and after."""
    if args.command == "add":
        row = parse_row(args.row)
        validate(table, row)
        if any(key_of(table, r) == key_of(table, row) for r in rows):
            raise Refused(f"{'/'.join(key_of(table, row))} is already a row of {args.table}")
        return rows + [row]
    if args.command == "del":
        i = find_row(table, rows, args.id)
        return rows[:i] + rows[i + 1:]
    i = find_row(table, rows, args.id)
    row = parse_row(args.row)
    merged = row if args.replace else {**rows[i], **row}
    merged = {k: v for k, v in merged.items() if v is not None}
    validate(table, merged)
    if key_of(table, merged) != key_of(table, rows[i]) and \
            any(key_of(table, r) == key_of(table, merged) for j, r in enumerate(rows) if j != i):
        raise Refused(f"{'/'.join(key_of(table, merged))} is already a row of {args.table}")
    return rows[:i] + [merged] + rows[i + 1:]


def cmd_write(args: argparse.Namespace) -> int:
    book = book_of(args.book)
    table = table_of(args.table)
    if table.level == "book":
        if args.table not in STAGED_TABLES:
            raise Refused(f"{args.table} is a row of book.json that no chapter stages; edit it by hand")
        return write_staged(book, table, args)
    place = place_of(book, table, args.chapter, args.section)
    record = load(place.path)
    record[args.table] = apply_write(table, rows_of(record, args.table), args)
    write_record(place.path, record)
    print(f"{args.command}: {place.label} {args.table} now has {len(record[args.table])} rows")
    return report_write(book.id, place.label)


def staged_path(book: Book, chapter: ChapterDir) -> str:
    return os.path.join(book.dir, chapter, "book-rows.json")


def seed_staged(book: Book, chapter: ChapterDir) -> RecordDTO:
    """What the chapter owns in book.json today, so a first write stages the whole of it."""
    record = load(book.book_path)
    sections = {s["id"] for s in rows_of(load(os.path.join(book.dir, chapter, "chapter.json")), "sections")}
    concepts = [c for c in rows_of(record, "concepts") if c.get("section") in sections]
    ids = {c["id"] for c in concepts}
    state_path = os.path.join(book.dir, "tools", "merge-state.json")
    state = load(state_path).get(chapter, {}) if os.path.exists(state_path) else {}
    mine_syms, mine_types = set(state.get("symbols", [])), set(state.get("types", []))
    return {
        "types": [t for t in rows_of(record, "types") if t["id"] in mine_types],
        "symbols": [s for s in rows_of(record, "symbols") if s["sym"] in mine_syms],
        "concepts": concepts,
        "concept_prereqs": [e for e in rows_of(record, "concept_prereqs") if e.get("concept") in ids],
    }


def write_staged(book: Book, table: Table, args: argparse.Namespace) -> int:
    """A book.json row is never edited by hand: it is staged and merged."""
    named = args.chapter or args.section
    if named is None:
        raise Refused(f"a write to {args.table} needs --chapter N: it is staged there and merged")
    chapter = chapter_dir_of(book, named)
    path = staged_path(book, chapter)
    staged = load(path) if os.path.exists(path) else seed_staged(book, chapter)
    for name in STAGED_TABLES:
        staged.setdefault(name, [])
    staged[args.table] = apply_write(table, list(staged[args.table]), args)
    write_record(path, staged)
    print(f"{args.command}: {chapter}/book-rows.json {args.table} now has {len(staged[args.table])} rows")
    merge_chapter(book, chapter)
    return report_write(book.id, "book.json")


# --------------------------------------------------------- mergebook, from here
# mergebook.py is the book's own, and stays the book's own: it is imported and
# called under the same lock, so that an agent needs one tool and not two.

def mergebook(book: Book) -> Any:
    path = os.path.join(book.dir, "tools", "mergebook.py")
    if not os.path.exists(path):
        raise Refused(f"{book.id} keeps no tools/mergebook.py")
    spec = importlib.util.spec_from_file_location(f"mergebook_{book.id.replace('-', '_')}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def under_lock(run: Callable[[], None]) -> None:
    with open(LOCK, "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        run()


def merge_chapter(book: Book, chapter: ChapterDir) -> None:
    module = mergebook(book)
    try:
        under_lock(lambda: module.merge(chapter))
    except SystemExit as e:
        raise Refused(str(e.code))


def cmd_merge(args: argparse.Namespace) -> int:
    book = book_of(args.book)
    merge_chapter(book, chapter_dir_of(book, args.chapter))
    return report_write(book.id, "book.json")


def cmd_log(args: argparse.Namespace) -> int:
    book = book_of(args.book)
    module = mergebook(book)
    try:
        under_lock(lambda: module.log(chapter_dir_of(book, args.chapter)))
    except SystemExit as e:
        raise Refused(str(e.code))
    return 0


# ------------------------------------------------------------------ the parsing

def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="ost", description=__doc__.split("\n\n")[0],
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    subs = p.add_subparsers(dest="command", required=True)

    subs.add_parser("books", help="every book, with its id, title and chapters built")

    show = subs.add_parser("show", help="a summary of a book, a chapter or a section")
    show.add_argument("book")
    show.add_argument("chapter", nargs="?", help="a chapter, as 1, 01 or ch01")
    show.add_argument("section", nargs="?", help="a section, as 1.4")

    rows = subs.add_parser("rows", help="the rows of one table, filtered")
    rows.add_argument("book")
    rows.add_argument("table", help=", ".join(sorted(TABLES)))
    rows.add_argument("--where", action="append", default=[], metavar="field=value",
                      help="field=value for an exact match, field~text for a substring")
    rows.add_argument("--fields", help="the fields to print, comma separated")
    rows.add_argument("--section", help="the section whose file to read, or whose rows to keep")
    rows.add_argument("--chapter", help="the chapter whose file to read, or whose rows to keep")
    rows.add_argument("--json", action="store_true", help="the rows as they sit on disk")

    find = subs.add_parser("find", help="search ids, titles, symbols, concepts and glossary terms")
    find.add_argument("book")
    find.add_argument("text")

    for name, help_text in (("add", "write one new row"),
                            ("set", "merge fields into one row"),
                            ("del", "remove one row")):
        w = subs.add_parser(name, help=help_text)
        w.add_argument("book")
        w.add_argument("table")
        if name != "add":
            w.add_argument("id", help="the row, named by its key fields joined with /")
        if name != "del":
            w.add_argument("row", help="the row, or the fields to merge, as a JSON object")
        w.add_argument("--section")
        w.add_argument("--chapter")
        if name == "set":
            w.add_argument("--replace", action="store_true", help="replace the row rather than merge into it")

    for name in ("merge", "log"):
        m = subs.add_parser(name, help=f"mergebook's {name}, under the same lock")
        m.add_argument("book")
        m.add_argument("chapter")

    check = subs.add_parser("check", help="the app's checker for one book")
    check.add_argument("book")
    check.add_argument("--section", help="only the findings that name this section")

    ids = subs.add_parser("ids", help="every id of a section's text.html, which anchors may name")
    ids.add_argument("book")
    ids.add_argument("section")
    return p


COMMANDS: dict[str, Callable[[argparse.Namespace], int]] = {
    "books": cmd_books, "show": cmd_show, "rows": cmd_rows, "find": cmd_find,
    "add": cmd_write, "set": cmd_write, "del": cmd_write,
    "merge": cmd_merge, "log": cmd_log, "check": cmd_check, "ids": cmd_ids,
}


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parser().parse_args(argv)
    try:
        return COMMANDS[args.command](args)
    except Refused as e:
        print(f"ost: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
