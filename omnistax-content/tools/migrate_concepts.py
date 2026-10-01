#!/usr/bin/env python3
"""Apply the concept migration of RULES item 6, chapter by chapter.

Each chapter states its decisions in `<Book>/chNN/concept-migration.json`:

    {
      "chapter":    "ch07",
      "kinds":      { "<concept id>": "definition" },
      "statements": { "<concept id>": "<new statement>" },
      "new":        [ { "id", "kind", "section", "name", "statement", "introduces", "prereqs" } ],
      "glossary":   { "<section>/<term>": <ref> },
      "variables":  { "<section>/<sym>": <ref> },
      "equations":  { "<equation id>": <ref> },
      "edges":      [ [<concept ref>, <prereq ref>] ]
    }

A ref is a concept id (existing, or new in any chapter's file of the book) or
`@<name>`, matched without case against concept names (the part before the
first comma, `$…$` left out). `edges` is optional: prerequisite edges between
any two concepts, beside the ones each new concept's `prereqs` give.

    python3 omnistax-content/tools/migrate_concepts.py check <book> [chNN]
    python3 omnistax-content/tools/migrate_concepts.py apply <book> [--dry-run]

`check` prints every problem of the decision files and exits 1 if there is
one. `apply` checks every file of the book and writes nothing unless all of
them pass; then, under the mergebook lock, it sets kinds and statements, adds
the new concepts and their edges to book.json and to the chapter's staged
book-rows.json, adds the coverage row that introduces each new concept, and
sets `concept` on the glossary, variables and equations rows. Both commands
are idempotent.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable, Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ost  # noqa: E402

ConceptId = str
Ref = str                     # a concept id, or "@<name>"
ChapterDir = str
SectionId = str
RowKey = str                  # "7.1/work", "7.1/W" or "eq-work", as a decision file names a row
Problem = str
DecisionDTO = dict[str, Any]  # one concept-migration.json as it sits on disk
RowDTO = dict[str, Any]
RecordDTO = dict[str, Any]
Edge = tuple[ConceptId, ConceptId]   # (concept, prereq)

FILE = "concept-migration.json"
KINDS = ("definition", "axiom", "result", "idea", "skill")
TOP_KEYS = ("chapter", "kinds", "statements", "new", "glossary", "variables", "equations", "edges")
NEW_KEYS = ("id", "kind", "section", "name", "statement", "introduces", "prereqs")
ROW_TABLES = ("glossary", "variables", "equations")


# ------------------------------------------------------------- the book read once

@dataclass(frozen=True)
class Chapter:
    dir: ChapterDir
    sections: tuple[SectionId, ...]
    rows: dict[str, tuple[RowKey, ...]]          # glossary | variables | equations -> the keys a decision names them by


@dataclass(frozen=True)
class BookIndex:
    book: ost.Book
    concepts: dict[ConceptId, RowDTO]
    edges: frozenset[Edge]
    chapters: dict[ChapterDir, Chapter]
    decisions: dict[ChapterDir, DecisionDTO]
    unreadable: dict[ChapterDir, Problem]

    def chapter_of(self, section: SectionId) -> Optional[ChapterDir]:
        return next((d for d, ch in self.chapters.items() if section in ch.sections), None)

    def concepts_of(self, chapter: ChapterDir) -> list[ConceptId]:
        own = set(self.chapters[chapter].sections)
        return [cid for cid, c in self.concepts.items() if c.get("section") in own]


def row_key(table: str, row: RowDTO) -> RowKey:
    return str(row["id"]) if table == "equations" else f"{row['section']}/{row['term' if table == 'glossary' else 'sym']}"


def read_chapter(book: ost.Book, d: ChapterDir) -> Optional[Chapter]:
    path = os.path.join(book.dir, d, "chapter.json")
    if not os.path.exists(path):
        return None
    record = ost.load(path)
    return Chapter(d, tuple(str(s["id"]) for s in ost.rows_of(record, "sections")),
                   {t: tuple(row_key(t, r) for r in ost.rows_of(record, t)) for t in ROW_TABLES})


def read_decision(path: str) -> tuple[Optional[DecisionDTO], Optional[Problem]]:
    try:
        with open(path, encoding="utf-8") as f:
            value = json.load(f)
    except json.JSONDecodeError as e:
        return None, f"does not parse: {e}"
    return (value, None) if isinstance(value, dict) else (None, "is not a JSON object")


def index_of(book_id: str) -> BookIndex:
    book = ost.book_of(book_id)
    record = ost.load(book.book_path)
    chapters = {d: ch for d in ost.chapter_dirs(book) if (ch := read_chapter(book, d)) is not None}
    files = {d: os.path.join(book.dir, d, FILE) for d in chapters if os.path.exists(os.path.join(book.dir, d, FILE))}
    read = {d: read_decision(p) for d, p in files.items()}
    return BookIndex(
        book=book,
        concepts={c["id"]: c for c in ost.rows_of(record, "concepts")},
        edges=frozenset((e["concept"], e["prereq"]) for e in ost.rows_of(record, "concept_prereqs")),
        chapters=chapters,
        decisions={d: v for d, (v, _) in read.items() if v is not None},
        unreadable={d: p for d, (_, p) in read.items() if p is not None},
    )


# ---------------------------------------------------------------- the new concepts

def new_rows(decision: DecisionDTO) -> list[RowDTO]:
    rows = decision.get("new", [])
    return [r for r in rows if isinstance(r, dict)] if isinstance(rows, list) else []


def all_new(ix: BookIndex) -> list[tuple[ChapterDir, RowDTO]]:
    return [(d, r) for d, dec in sorted(ix.decisions.items()) for r in new_rows(dec) if isinstance(r.get("id"), str)]


def applied(ix: BookIndex, chapter: ChapterDir, row: RowDTO) -> bool:
    """A new concept already in book.json because an earlier apply put it there:
    same section, same name, and not also listed as an existing concept of its chapter."""
    there = ix.concepts.get(row.get("id"))
    kinds = ix.decisions.get(chapter, {}).get("kinds", {})
    return there is not None and there.get("section") == row.get("section") \
        and there.get("name") == row.get("name") and row.get("id") not in (kinds if isinstance(kinds, dict) else {})


# -------------------------------------------------------------------- the refs

def plain_name(name: str) -> str:
    """The name a ref is matched by: no $…$, nothing after the first comma, no case."""
    text = re.sub(r"\$[^$]*\$", "", name).split(",")[0]
    return re.sub(r"\s+", " ", text.replace("’", "'")).strip().lower()


def names_of(ix: BookIndex) -> dict[str, frozenset[ConceptId]]:
    named: dict[str, set[ConceptId]] = {}
    pairs = [(cid, c.get("name", "")) for cid, c in ix.concepts.items()] \
        + [(r["id"], r.get("name", "")) for _, r in all_new(ix)]
    for cid, name in pairs:
        named.setdefault(plain_name(str(name)), set()).add(cid)
    return {k: frozenset(v) for k, v in named.items()}


@dataclass(frozen=True)
class Resolver:
    ids: frozenset[ConceptId]
    names: dict[str, frozenset[ConceptId]]

    def __call__(self, ref: Any) -> tuple[Optional[ConceptId], Optional[Problem]]:
        if not isinstance(ref, str) or ref == "":
            return None, f"{ref!r} is no ref; write a concept id or @<name>"
        if not ref.startswith("@"):
            return (ref, None) if ref in self.ids else (None, f'"{ref}" is no concept id of the book or of any new list')
        hits = self.names.get(plain_name(ref[1:]), frozenset())
        if len(hits) == 1:
            return next(iter(hits)), None
        if not hits:
            return None, f'"{ref}" names no concept'
        return None, f'"{ref}" is ambiguous: {", ".join(sorted(hits))}'


def resolver_of(ix: BookIndex) -> Resolver:
    return Resolver(frozenset(ix.concepts) | frozenset(r["id"] for _, r in all_new(ix)), names_of(ix))


# ----------------------------------------------------------------- the problems

def spans_of(book: ost.Book, section: SectionId) -> Optional[frozenset[str]]:
    """The ids of the section's text, or nothing where the section has no text."""
    try:
        path = os.path.join(os.path.dirname(ost.section_path(book, section)), "text.html")
    except ost.Refused:
        return None
    return frozenset(re.findall(r'\sid="([^"]+)"', ost.read_text(path))) if os.path.exists(path) else None


def shape_problems(d: ChapterDir, dec: DecisionDTO) -> list[Problem]:
    maps = ("kinds", "statements", "glossary", "variables", "equations")
    return [f"unknown key {k!r}; the keys are {', '.join(TOP_KEYS)}" for k in dec if k not in TOP_KEYS] \
        + ([] if dec.get("chapter") == d else [f"chapter is {dec.get('chapter')!r}; this file is {d}'s"]) \
        + [f"{k} is not an object" for k in maps if not isinstance(dec.get(k, {}), dict)] \
        + ([] if isinstance(dec.get("new", []), list) else ["new is not a list"]) \
        + [f"new[{i}] is not an object" for i, r in enumerate(dec.get("new", []) if isinstance(dec.get("new", []), list) else []) if not isinstance(r, dict)] \
        + ([] if isinstance(dec.get("edges", []), list) else ["edges is not a list"])


def edge_pairs(dec: DecisionDTO) -> list[tuple[int, Any]]:
    edges = dec.get("edges", [])
    return list(enumerate(edges)) if isinstance(edges, list) else []


def is_pair(e: Any) -> bool:
    return isinstance(e, list) and len(e) == 2


def edge_problems(dec: DecisionDTO, resolve: Resolver) -> list[Problem]:
    return [p for i, e in edge_pairs(dec) for p in (
        [f"edges[{i}] is not a [concept, prereq] pair"] if not is_pair(e)
        else [f"edges[{i}] {side} {q}" for side, v in zip(("concept", "prereq"), e) for q in [resolve(v)[1]] if q])]


def table(dec: DecisionDTO, name: str) -> dict[str, Any]:
    value = dec.get(name, {})
    return value if isinstance(value, dict) else {}


def kind_problems(ix: BookIndex, d: ChapterDir, dec: DecisionDTO) -> list[Problem]:
    own = set(ix.concepts_of(d))
    already = {r.get("id") for r in new_rows(dec) if applied(ix, d, r)}
    kinds, statements = table(dec, "kinds"), table(dec, "statements")
    unknown = [f"{name}[{cid}] names no existing concept of {d}" + (f" (it is {ix.chapter_of(ix.concepts[cid]['section'])}'s)" if cid in ix.concepts else "")
               for name, keys in (("kinds", kinds), ("statements", statements)) for cid in keys if cid not in own]
    bad = [f"kinds[{cid}] is {k!r}; a kind is one of {', '.join(KINDS)}" for cid, k in kinds.items() if k not in KINDS]
    empty = [f"statements[{cid}] is empty" for cid, s in statements.items() if not isinstance(s, str) or not s.strip()]
    missing = [f"kinds misses {cid}" for cid in sorted(own) if cid not in kinds and cid not in already]
    return unknown + bad + empty + missing


def row_problems(ix: BookIndex, d: ChapterDir, dec: DecisionDTO, resolve: Resolver) -> list[Problem]:
    def one(name: str) -> list[Problem]:
        rows, given = ix.chapters[d].rows[name], table(dec, name)
        known = set(rows)
        return [f"{name}[{k}] names no {name} row of {d}" for k in given if k not in known] \
            + [f"{name} misses {k}" for k in rows if k not in given] \
            + [f"{name}[{k}]: {p}" for k, v in given.items() if k in known for p in [resolve(v)[1]] if p]
    return [p for name in ROW_TABLES for p in one(name)]


def new_problems(ix: BookIndex, d: ChapterDir, dec: DecisionDTO, resolve: Resolver) -> list[Problem]:
    others = [(od, r) for od, r in all_new(ix) if od != d]
    seen: dict[str, int] = {}

    def one(i: int, r: RowDTO) -> list[Problem]:
        cid = r.get("id")
        at = f"new[{cid if isinstance(cid, str) else i}]"
        fields = [f"{at} has unknown field {k!r}" for k in r if k not in NEW_KEYS] \
            + [f"{at} misses {k}" for k in NEW_KEYS if k not in r]
        if not isinstance(cid, str) or not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", cid):
            return fields + [f"{at} id {cid!r} is not kebab-case"]
        seen[cid] = seen.get(cid, 0) + 1
        there = ix.concepts.get(cid)
        collide = ([f"{at} is listed twice in this file"] if seen[cid] == 2 else []) \
            + ([f"{at} collides with the existing concept {cid} of section {there.get('section')}"]
               if there is not None and not applied(ix, d, r) else []) \
            + [f"{at} collides with a new concept of {od}" for od, o in others if o.get("id") == cid]
        section = r.get("section")
        where = [] if isinstance(section, str) and section in ix.chapters[d].sections \
            else [f"{at} section {section!r} is no section of {d}" + (f"; put it in {ix.chapter_of(section)}'s file" if isinstance(section, str) and ix.chapter_of(section) else "")]
        kind = [] if r.get("kind") in KINDS else [f"{at} kind {r.get('kind')!r} is not one of {', '.join(KINDS)}"]
        text = [f"{at} {k} is empty" for k in ("name", "statement") if k in r and (not isinstance(r[k], str) or not r[k].strip())]
        span = span_problems(ix, at, section, r.get("introduces")) if not where and "introduces" in r else []
        prereqs = r.get("prereqs", [])
        refs = [f"{at} prereqs is not a list"] if not isinstance(prereqs, list) \
            else [f"{at} prereq {p}" for v in prereqs for p in [resolve(v)[1]] if p]
        return fields + collide + where + kind + text + span + refs
    return [p for i, r in enumerate(new_rows(dec)) for p in one(i, r)]


def span_problems(ix: BookIndex, at: str, section: SectionId, span: Any) -> list[Problem]:
    ids = spans_of(ix.book, section)
    if span is None:
        return [] if ids is None else [f"{at} introduces nothing, and section {section} has text; name the span (ost ids)"]
    if ids is None:
        return [f"{at} introduces {span!r}, but section {section} has no text; write null"]
    return [] if span in ids else [f"{at} introduces {span!r}, which is no id of {section}'s text (ost ids)"]


def decision_edges(ix: BookIndex, d: ChapterDir, resolve: Resolver) -> list[Edge]:
    """Every edge one file adds: each new concept's prereqs, then its `edges`."""
    dec = ix.decisions[d]
    of_new = [(r["id"], cid) for r in new_rows(dec) if isinstance(r.get("id"), str)
              for v in (r.get("prereqs") if isinstance(r.get("prereqs"), list) else [])
              for cid in [resolve(v)[0]] if cid is not None]
    given = [(a, b) for _, e in edge_pairs(dec) if is_pair(e)
             for a, b in [(resolve(e[0])[0], resolve(e[1])[0])] if a is not None and b is not None]
    return of_new + given


def reaches(graph: dict[ConceptId, set[ConceptId]], start: ConceptId, goal: ConceptId) -> bool:
    seen, todo = set(), [start]
    while todo:
        node = todo.pop()
        if node == goal:
            return True
        if node not in seen:
            seen.add(node)
            todo.extend(graph.get(node, ()))
    return False


def cycle_problems(ix: BookIndex, d: ChapterDir, resolve: Resolver) -> list[Problem]:
    every = set(ix.edges) | {e for od in ix.decisions for e in decision_edges(ix, od, resolve)}
    graph: dict[ConceptId, set[ConceptId]] = {}
    for concept, prereq in every:
        graph.setdefault(concept, set()).add(prereq)
    return [f"edge {a} → {b} closes a cycle: {b} already rests on {a}"
            for a, b in decision_edges(ix, d, resolve) if (a, b) not in ix.edges and reaches(graph, b, a)]


def problems_of(ix: BookIndex, d: ChapterDir, resolve: Resolver) -> list[Problem]:
    if d in ix.unreadable:
        return [ix.unreadable[d]]
    dec = ix.decisions[d]
    shape = shape_problems(d, dec)
    return shape + kind_problems(ix, d, dec) + row_problems(ix, d, dec, resolve) \
        + new_problems(ix, d, dec, resolve) + edge_problems(dec, resolve) + cycle_problems(ix, d, resolve)


def counts(dec: DecisionDTO) -> str:
    return " · ".join(f"{len(dec.get(k) or [])} {k}" for k in ("kinds", "statements", "new", "glossary", "variables", "equations", "edges"))


def report(ix: BookIndex, chapters: Sequence[ChapterDir]) -> int:
    """Print each file's problems; the number of problems found."""
    resolve = resolver_of(ix)
    total = 0
    for d in chapters:
        found = problems_of(ix, d, resolve)
        total += len(found)
        head = f"{d}/{FILE}"
        print(f"{head}: ok · {counts(ix.decisions[d])}" if not found
              else f"{head}: {len(found)} problem{'' if len(found) == 1 else 's'}")
        print("".join(f"  {p}\n" for p in found), end="")
    return total


def files_of(ix: BookIndex) -> list[ChapterDir]:
    return sorted(set(ix.decisions) | set(ix.unreadable))


def cmd_check(args: argparse.Namespace) -> int:
    ix = index_of(args.book)
    chapters = files_of(ix) if args.chapter is None else [ost.chapter_dir_of(ix.book, args.chapter)]
    absent = [d for d in chapters if d not in ix.decisions and d not in ix.unreadable]
    if absent:
        raise ost.Refused(f"no {absent[0]}/{FILE}")
    total = report(ix, chapters)
    if args.chapter is None:
        waiting = [d for d in ix.chapters if d not in chapters]
        print(f"{len(chapters)} files, {total} problems" + (f"; no file yet for {', '.join(waiting)}" if waiting else ""))
    return 1 if total else 0


# ------------------------------------------------------------------- the writes
# Every write is one pure function from the rows before to the rows after, so
# that a second apply finds nothing to change.

def concept_row(r: RowDTO) -> RowDTO:
    return {"id": r["id"], "kind": r["kind"], "section": r["section"], "name": r["name"], "statement": r["statement"]}


def migrated(c: RowDTO, kinds: dict[ConceptId, str], statements: dict[ConceptId, str]) -> RowDTO:
    """A concept row with its kind and statement set; `why` read as the statement and `evidence` dropped."""
    statement = statements.get(c["id"], c.get("statement", c.get("why")))
    cell = {"kind": kinds.get(c["id"], c.get("kind")), "statement": statement}
    out = {("statement" if k == "why" else k): cell.get("statement" if k == "why" else k, v) for k, v in c.items() if k != "evidence"}
    if statement is None or "statement" in out:
        return out
    return {**{k: v for k, v in out.items() if k != "eq"}, "statement": statement, **({"eq": out["eq"]} if "eq" in out else {})}


def with_new(concepts: list[RowDTO], new: Sequence[RowDTO], sections: Sequence[SectionId]) -> list[RowDTO]:
    """Each new concept after the last of its own section, else of its chapter, else at the end; one already there is replaced."""
    def place(rows: list[RowDTO], r: RowDTO) -> list[RowDTO]:
        row = concept_row(r)
        at = next((i for i, c in enumerate(rows) if c.get("id") == row["id"]), None)
        if at is not None:
            return rows[:at] + [{**rows[at], **row}] + rows[at + 1:]
        same = [i for i, c in enumerate(rows) if c.get("section") == row["section"]]
        kin = [i for i, c in enumerate(rows) if c.get("section") in sections]
        cut = (same or kin or [len(rows) - 1])[-1] + 1
        return rows[:cut] + [row] + rows[cut:]
    out = list(concepts)
    for r in new:
        out = place(out, r)
    return out


def with_edges(edges: list[RowDTO], new: Iterable[Edge]) -> list[RowDTO]:
    have = {(e["concept"], e["prereq"]) for e in edges}
    added = [e for e in dict.fromkeys(new) if e not in have]
    return edges + [{"concept": a, "prereq": b} for a, b in added]


def with_concept(row: RowDTO, cid: ConceptId, after: str) -> RowDTO:
    """`concept` set on a row: where it stands, or else right after the field `after`."""
    if "concept" in row:
        return {k: (cid if k == "concept" else v) for k, v in row.items()}
    out: RowDTO = {}
    for k, v in row.items():
        out[k] = v
        if k == after:
            out["concept"] = cid
    return out if "concept" in out else {**out, "concept": cid}


CONCEPT_AFTER = {"glossary": "term", "variables": "sym", "equations": "id"}


def with_coverage(coverage: list[RowDTO], span: str, cid: ConceptId) -> list[RowDTO]:
    row = {"span": span, "concept": cid, "verb": "introduces"}
    if row in coverage:
        return coverage
    same = [i for i, r in enumerate(coverage) if r.get("span") == span]
    cut = same[-1] + 1 if same else len(coverage)
    return coverage[:cut] + [row] + coverage[cut:]


@dataclass
class Plan:
    """The files an apply rewrites, each the record after, with the reason it changes."""
    writes: dict[str, RecordDTO] = field(default_factory=dict)
    lines: dict[ChapterDir, list[str]] = field(default_factory=dict)


def plan_apply(ix: BookIndex) -> Plan:
    resolve = resolver_of(ix)
    plan = Plan()
    decided = sorted(ix.decisions)
    kinds = {cid: k for d in decided for cid, k in table(ix.decisions[d], "kinds").items()} \
        | {r["id"]: r["kind"] for _, r in all_new(ix)}
    statements = {cid: s for d in decided for cid, s in table(ix.decisions[d], "statements").items()} \
        | {r["id"]: r["statement"] for _, r in all_new(ix)}
    news = {d: new_rows(ix.decisions[d]) for d in decided}
    edges = {d: decision_edges(ix, d, resolve) for d in decided}
    section_of = {cid: c.get("section") for cid, c in ix.concepts.items()} | {r["id"]: r.get("section") for _, r in all_new(ix)}
    every_edge = [e for d in decided for e in edges[d]]

    def concepts_after(rows: list[RowDTO], only: Optional[ChapterDir]) -> list[RowDTO]:
        out = [migrated(c, kinds, statements) for c in rows]
        for d in decided if only is None else [only] if only in news else []:
            out = with_new(out, news[d], ix.chapters[d].sections)
        return out

    record = ost.load(ix.book.book_path)
    after = {**record,
             "concepts": concepts_after(ost.rows_of(record, "concepts"), None),
             "concept_prereqs": with_edges(ost.rows_of(record, "concept_prereqs"), every_edge)}
    if after != record:
        plan.writes[ix.book.book_path] = after

    for d in ix.chapters:
        staged_path = os.path.join(ix.book.dir, d, "book-rows.json")
        if not os.path.exists(staged_path):
            continue
        staged = ost.load(staged_path)
        mine = [e for e in every_edge if section_of.get(e[0]) in ix.chapters[d].sections]
        staged_after = {**staged,
                        "concepts": concepts_after(ost.rows_of(staged, "concepts"), d),
                        **({"concept_prereqs": with_edges(ost.rows_of(staged, "concept_prereqs"), mine)} if mine or "concept_prereqs" in staged else {})}
        if staged_after != staged:
            plan.writes[staged_path] = staged_after

    for d in decided:
        dec = ix.decisions[d]
        path = os.path.join(ix.book.dir, d, "chapter.json")
        chapter = ost.load(path)

        def rows_after(name: str) -> list[RowDTO]:
            given = table(dec, name)
            return [with_concept(r, cid, CONCEPT_AFTER[name]) if (cid := resolve(given.get(row_key(name, r), ""))[0]) else r
                    for r in ost.rows_of(chapter, name)]
        chapter_after = {**chapter, **{name: rows_after(name) for name in ROW_TABLES if name in chapter}}
        if chapter_after != chapter:
            plan.writes[path] = chapter_after

        for r in news[d]:
            if r.get("introduces") is None:
                continue
            spath = ost.section_path(ix.book, r["section"])
            section = plan.writes.get(spath) or ost.load(spath)
            section_after = {**section, "coverage": with_coverage(ost.rows_of(section, "coverage"), r["introduces"], r["id"])}
            if section_after != section:
                plan.writes[spath] = section_after

        changed_kinds = [cid for cid, k in table(dec, "kinds").items() if ix.concepts.get(cid, {}).get("kind") != k]
        changed_statements = [cid for cid, s in table(dec, "statements").items()
                              if ix.concepts.get(cid, {}).get("statement", ix.concepts.get(cid, {}).get("why")) != s]
        added = [r["id"] for r in news[d] if not applied(ix, d, r)]
        plan.lines[d] = [f"{len(changed_kinds)} kinds changed", f"{len(changed_statements)} statements rewritten",
                         f"{len(added)} concepts added", f"{len([e for e in edges[d] if e not in ix.edges])} edges added",
                         f"{sum(1 for r in news[d] if r.get('introduces') is not None)} introducing spans",
                         *(f"{len(table(dec, name))} {name} rows linked" for name in ROW_TABLES)]
    return plan


def cmd_apply(args: argparse.Namespace) -> int:
    def run() -> int:
        ix = index_of(args.book)
        if not ix.decisions and not ix.unreadable:
            raise ost.Refused(f"{ix.book.id} has no {FILE} in any chapter")
        if report(ix, files_of(ix)):
            print("apply: nothing written; fix the problems above")
            return 1
        plan = plan_apply(ix)
        for d, lines in plan.lines.items():
            print(f"{d}: " + ", ".join(lines))
        for path in plan.writes:
            print(f"{'would write' if args.dry_run else 'writes'} {os.path.relpath(path, ix.book.dir)}")
        if not args.dry_run:
            for path, record in plan.writes.items():
                ost.write_record(path, record)
        print("nothing to change" if not plan.writes else f"{len(plan.writes)} files {'to write' if args.dry_run else 'written'}")
        return 0
    result: list[int] = []
    ost.under_lock(lambda: result.append(run()))
    return result[0]


# ------------------------------------------------------------------ the parsing

def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="migrate_concepts", description=__doc__.split("\n\n")[0])
    subs = p.add_subparsers(dest="command", required=True)
    check = subs.add_parser("check", help="every problem of the decision files")
    check.add_argument("book")
    check.add_argument("chapter", nargs="?", help="one chapter's file, as 7, 07 or ch07")
    apply = subs.add_parser("apply", help="apply every chapter's file, or nothing")
    apply.add_argument("book")
    apply.add_argument("--dry-run", action="store_true", help="say what would change and write nothing")
    return p


COMMANDS: dict[str, Callable[[argparse.Namespace], int]] = {"check": cmd_check, "apply": cmd_apply}


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parser().parse_args(argv)
    try:
        return COMMANDS[args.command](args)
    except ost.Refused as e:
        print(f"migrate_concepts: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
