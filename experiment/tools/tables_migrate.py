#!/usr/bin/env python3
"""Migrate OmniStax content from the document shape to the table shape.

Run from `experiment/`:

    python3 tools/tables_migrate.py            migrate, then self-check
    python3 tools/tables_migrate.py --check    self-check only

The target shape is `docs/claude/content-tables.md`. Three files own three
levels: `book.json` (the book and its concept graph), `<chapter>/chapter.json`
(the chapter's sections, variables, equations and glossary) and
`<chapter>/<section>/section.json` (the section, its figures, coverage and
exercises). Every array field is a table of flat rows; a row names another row
by id only.

The script is idempotent: if `book.json` already holds the table shape it
migrates nothing and only runs the check.
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections import OrderedDict

ROOT = os.getcwd()

# ---------------------------------------------------------------- utilities


def read(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def read_text(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write("\n")


def row(*pairs):
    """A row in a fixed key order; a pair whose value is None is left out."""
    out = OrderedDict()
    for key, value in pairs:
        if value is not None:
            out[key] = value
    return out


class Report:
    def __init__(self):
        self.lines = []

    def __call__(self, *parts):
        line = " ".join(str(p) for p in parts)
        self.lines.append(line)
        print(line)


say = Report()


def fail(message):
    print("FAIL: " + message, file=sys.stderr)
    sys.exit(1)


# ------------------------------------------------------------------ book.json

BOOK_SCALARS = [
    "id", "title", "publisher", "authors", "source_url", "copyright",
    "license", "license_url", "openstax", "chapters",
]

MACRO_RE = re.compile(
    r"^\\htmlClass\{kv-(?P<type>[a-z0-9-]+)\}\{\\htmlData\{sym=(?P<sym>.*?)\}\{(?P<latex>.*)\}\}$"
)


def build_symbols(old_macros, old_symbols):
    """The `symbols` table, from the old `macros` and `symbols` records.

    A symbol whose value names a macro carries the macro's name and the type
    the macro's `kv-` class declares; the rest are plain LaTeX the hover layer
    knows but the text writes out (`θ`).
    """
    rows = []
    used = {}
    for sym, value in old_symbols.items():
        if value in old_macros:
            expansion = old_macros[value]
            m = MACRO_RE.match(expansion)
            if not m:
                fail("macro %s does not match the typed-symbol pattern: %s" % (value, expansion))
            if m.group("sym") != sym:
                fail("macro %s writes sym=%s but the symbol table calls it %s"
                     % (value, m.group("sym"), sym))
            if value in used:
                fail("macro %s is referenced by both %s and %s" % (value, used[value], sym))
            used[value] = sym
            rows.append(row(("sym", sym), ("latex", m.group("latex")),
                            ("type", m.group("type")), ("macro", value)))
        else:
            rows.append(row(("sym", sym), ("latex", value)))
    unused = [m for m in old_macros if m not in used]
    if unused:
        fail("macros referenced by no symbol: " + ", ".join(sorted(unused)))
    return rows


def merge_concepts(chapters):
    """One concept table for the whole book, from every chapter's concepts.json.

    A chapter that only mentions a concept writes a placeholder stub; the
    chapter that introduces it writes the full row. The full row wins; two full
    rows are resolved in favour of the chapter the concept's section belongs to.
    """
    kept = OrderedDict()          # id -> (chapter_id, raw row)
    all_rows = []                 # (chapter_id, raw row), in read order
    for chap in chapters:
        path = os.path.join(chap["dir"], "concepts.json")
        for raw in read(path)["concepts"]:
            all_rows.append((chap["id"], raw))
            cid = raw["id"]
            if cid not in kept:
                kept[cid] = (chap["id"], raw)
                continue
            prev_chap, prev = kept[cid]
            prev_full = not prev.get("placeholder")
            this_full = not raw.get("placeholder")
            if this_full and not prev_full:
                kept[cid] = (chap["id"], raw)
            elif this_full and prev_full:
                owner = raw["section"].split(".")[0]
                pick_this = owner == chap["id"]
                if strip_concept(prev) != strip_concept(raw):
                    say("  warning: concept %r is a full row in both ch%s and ch%s; keeping the one from ch%s"
                        % (cid, prev_chap, chap["id"], chap["id"] if pick_this else prev_chap))
                if pick_this:
                    kept[cid] = (chap["id"], raw)

    concepts = [strip_concept(raw) for _, raw in kept.values()]

    # Prerequisite edges, in concept order, deduped. A discarded duplicate that
    # names an edge the kept row does not is reported rather than dropped.
    by_id = {}
    for _, raw in all_rows:
        by_id.setdefault(raw["id"], []).append(raw)
    prereqs = []
    seen = set()
    for cid in kept:
        keeper = kept[cid][1]
        edges = list(keeper.get("prereqs", []))
        for other in by_id[cid]:
            for p in other.get("prereqs", []):
                if p not in edges:
                    say("  warning: concept %r has prereq %r only in a discarded duplicate; keeping it"
                        % (cid, p))
                    edges.append(p)
        for p in edges:
            if (cid, p) not in seen:
                seen.add((cid, p))
                prereqs.append(row(("concept", cid), ("prereq", p)))
    return concepts, prereqs


def strip_concept(raw):
    return row(("id", raw["id"]), ("kind", raw.get("kind", "idea")),
               ("section", raw["section"]), ("name", raw["name"]),
               ("why", raw.get("why")), ("evidence", raw.get("evidence")),
               ("eq", raw.get("eq")))


def migrate_book(book, chapters):
    out = OrderedDict()
    for key in BOOK_SCALARS:
        if key in book:
            out[key] = book[key]
    out["types"] = [row(("id", tid), ("label", t["label"]), ("dimension", t.get("dimension")))
                    for tid, t in book["types"].items()]
    out["symbols"] = build_symbols(book.get("macros", {}), book.get("symbols", {}))
    out["exercise_kinds"] = [row(("id", kid), ("label", label))
                             for kid, label in book.get("exercise_kinds", {}).items()]
    concepts, prereqs = merge_concepts(chapters)
    out["concepts"] = concepts
    out["concept_prereqs"] = prereqs
    return out


# --------------------------------------------------------------- chapter.json


def condition_of(equation):
    """The condition the equation holds under, as the book states it. The old
    files carried one flag, `constant_a`; an equation that needed constant
    acceleration says so in words, and one that holds generally says nothing."""
    return "constant acceleration" if equation.get("constant_a") else None


def migrate_chapter(chapter, formulas):
    out = OrderedDict()
    for key in ("id", "dir", "title", "intro_module"):
        if key in chapter:
            out[key] = chapter[key]
    out["sections"] = chapter["sections"]
    out["variables"] = [
        row(("sym", v["sym"]), ("type", v.get("color")), ("meaning", v["meaning"]),
            ("unit", v.get("unit", "")), ("section", v["section"]), ("anchor", v.get("anchor")))
        for v in formulas.get("variables", [])
    ]
    out["equations"] = [
        row(("id", e["id"]), ("concept", e.get("concept")), ("section", e["section"]),
            ("latex", e["latex"]), ("ktex", e.get("ktex")),
            ("condition", condition_of(e)), ("anchor", e.get("anchor")),
            ("important", bool(e.get("important", False))))
        for e in formulas.get("equations", [])
    ]
    out["glossary"] = formulas.get("glossary", [])
    return out


# --------------------------------------------------------------- section.json

SECTION_SCALARS = ["id", "module", "chapter", "title", "short", "lead", "objectives",
                   "summary_html", "notes", "ai", "built"]

FIGURE_TAG_RE = re.compile(r"<figure\b[^>]*>", re.S)
ATTR_RE = re.compile(r"([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*\"([^\"]*)\"")

# A figure's block in figures.js starts where the module looks the figure up:
# `demo('<id>'`, `F.demo(root, '<id>'` or `F.byId(root, '<id>')`.
BLOCK_RE = re.compile(r"(?:F\.)?(?:demo|byId)\(\s*(?:root\s*,\s*)?'([^']+)'")
CLS_RE = re.compile(r"cls:\s*'([^']*)'")           # a slider's type class
COLOUR_RE = re.compile(r"\bC\(\s*'([^']*)'\s*\)")  # figlib's colour-by-type lookup
KMACRO_RE = re.compile(r"\\\\(k[A-Za-z]+)")        # a \k macro in a label or readout


def figure_rows(section_dir, html, types, macro_types):
    """The `figures` table: one row per <figure> in text.html, in document order.

    `draws` is what the figure's block in figures.js colours: the class of every
    slider, every `C('<type>')` lookup, and every `\\k` macro it writes into a
    label or readout (KaTeX wraps those in the type's `kv-` class).
    """
    js_path = os.path.join(section_dir, "figures.js")
    draws = {}
    if os.path.exists(js_path):
        js = read_text(js_path)
        starts = list(BLOCK_RE.finditer(js))
        for i, m in enumerate(starts):
            end = starts[i + 1].start() if i + 1 < len(starts) else len(js)
            body = js[m.start():end]
            found = draws.setdefault(m.group(1), set())
            names = CLS_RE.findall(body) + COLOUR_RE.findall(body)
            names += [macro_types[k] for k in KMACRO_RE.findall(body) if k in macro_types]
            found.update(n for n in names if n in types)

    rows = []
    for tag in FIGURE_TAG_RE.finditer(html):
        attrs = dict(ATTR_RE.findall(tag.group(0)))
        cls = attrs.get("class", "")
        kind = "demo" if "demo" in cls else "photo" if "photo" in cls else "figure"
        fid = attrs.get("id")
        if not fid:
            fail("a <figure> in %s/text.html has no id" % section_dir)
        originals = attrs.get("data-original")
        rows.append(row(
            ("id", fid),
            ("kind", kind),
            ("number", attrs.get("data-figure")),
            ("originals", [o.strip() for o in originals.split(",")] if originals else None),
            ("original_caption", attrs.get("data-original-caption")),
            ("draws", sorted(draws.get(fid, ())) if kind == "demo" else []),
        ))
    return rows


VERBS = ("introduces", "uses", "reinforces")


def coverage_rows(section_id, chapter_coverage):
    """The `coverage` table: one row per span per concept per verb, span ids local."""
    rows = []
    prefix = section_id + "-"
    for raw in chapter_coverage:
        if not raw["span"].startswith(prefix):
            continue
        span = raw["span"][len(prefix):]
        if raw.get("note"):
            say("  dropped note on %s: %s" % (raw["span"], raw["note"]))
        for verb in VERBS:
            for concept in raw.get(verb, []):
                rows.append(row(("span", span), ("concept", concept), ("verb", verb)))
    return rows


def exercise_rows(exercises):
    """The `exercises` table and the `exercise_concepts` table beside it."""
    rows, pairs = [], []
    for e in exercises:
        place_at = e.get("place", "end")
        place = ({"at": "end"} if place_at in ("end", None)
                 else OrderedDict((("at", "inline"), ("after", place_at))))
        rows.append(row(
            ("id", e["id"]), ("source_id", e.get("source_id")),
            ("source_section", e.get("source_section")), ("kind", e["kind"]),
            ("bloom", e["bloom"]), ("tag", e.get("tag")), ("place", place),
            ("cite", e.get("cite")), ("figure", e.get("figure")),
            ("prompt", e["prompt"]), ("answer", e["answer"]),
        ))
        weights = e.get("weights") or {}
        for concept in e.get("concepts", []):
            pairs.append(row(("exercise", e["id"]), ("concept", concept),
                             ("weight", weights.get(concept))))
    return rows, pairs


def migrate_section(section_dir, meta, chapter_coverage, types, macro_types):
    out = OrderedDict()
    for key in SECTION_SCALARS:
        if key in meta:
            out[key] = meta[key]

    ex_path = os.path.join(section_dir, "exercises.json")
    ex_file = read(ex_path) if os.path.exists(ex_path) else {}
    if "lead" in ex_file:
        out["exercises_lead"] = ex_file["lead"]
    if "notes" in ex_file:
        out["exercise_notes"] = ex_file["notes"]

    html = read_text(os.path.join(section_dir, "text.html"))
    out["figures"] = figure_rows(section_dir, html, types, macro_types)
    out["coverage"] = coverage_rows(meta["id"], chapter_coverage)
    out["exercises"], out["exercise_concepts"] = exercise_rows(ex_file.get("exercises", []))
    return out


# -------------------------------------------------------------------- migrate


def is_migrated():
    return isinstance(read("book.json").get("types"), list)


def migrate():
    book = read("book.json")
    chapters = [read(os.path.join(d, "chapter.json")) for d in book["chapters"]]
    types = list(book["types"].keys())
    macro_types = {}
    for name, expansion in book.get("macros", {}).items():
        m = MACRO_RE.match(expansion)
        if m:
            macro_types[name.lstrip("\\")] = m.group("type")

    written, removed = [], []

    say("book.json")
    new_book = migrate_book(book, chapters)
    write("book.json", new_book)
    written.append("book.json")

    for chapter in chapters:
        d = chapter["dir"]
        say("%s/chapter.json" % d)
        formulas = read(os.path.join(d, "formulas.json"))
        write(os.path.join(d, "chapter.json"), migrate_chapter(chapter, formulas))
        written.append("%s/chapter.json" % d)

        cov = read(os.path.join(d, "concepts.json")).get("coverage", [])
        built = {s["id"]: os.path.join(d, s["id"]) for s in chapter["sections"]
                 if os.path.exists(os.path.join(d, s["id"], "section.json"))}
        for raw in cov:
            owner = max((sid for sid in built if raw["span"].startswith(sid + "-")),
                        key=len, default=None)
            if owner is None:
                fail("coverage span %r in %s/concepts.json belongs to no built section"
                     % (raw["span"], d))

        for sid, sdir in sorted(built.items(), key=lambda kv: [int(n) for n in kv[0].split(".")]):
            say("%s/section.json" % sdir)
            meta = read(os.path.join(sdir, "section.json"))
            new_section = migrate_section(sdir, meta, cov, types, macro_types)
            check_draws(sdir, meta, new_section)
            write(os.path.join(sdir, "section.json"), new_section)
            written.append("%s/section.json" % sdir)
            gone = os.path.join(sdir, "exercises.json")
            if os.path.exists(gone):
                os.remove(gone)
                removed.append(gone)

        for name in ("concepts.json", "formulas.json"):
            gone = os.path.join(d, name)
            if os.path.exists(gone):
                os.remove(gone)
                removed.append(gone)

    say("")
    say("wrote %d files, removed %d" % (len(written), len(removed)))
    for p in removed:
        say("  removed", p)
    return written, removed


def check_draws(section_dir, meta, new_section):
    """The union of the section's `draws` must equal the old `binds` list.

    Where it does not, the section falls back to giving every demo figure the
    whole `binds` list, so that the page still colours what it used to.
    """
    binds = sorted(meta.get("binds", []))
    if not binds:
        return
    union = sorted({t for f in new_section["figures"] for t in f["draws"]})
    if union == binds:
        return
    say("  binds mismatch in %s: binds %s, derived %s (missing %s, extra %s)"
        % (section_dir, binds, union,
           sorted(set(binds) - set(union)), sorted(set(union) - set(binds))))
    say("  falling back: every demo figure of %s draws the old binds list" % meta["id"])
    for f in new_section["figures"]:
        if f["kind"] == "demo":
            f["draws"] = list(binds)


# ---------------------------------------------------------------------- check


def check():
    say("")
    say("check")
    book = read("book.json")
    type_ids = {t["id"] for t in book["types"]}
    kind_ids = {k["id"] for k in book["exercise_kinds"]}
    concept_ids = {c["id"] for c in book["concepts"]}
    problems = []

    def need(ok, message):
        if not ok:
            problems.append(message)

    say("  book.json: types %d, symbols %d, exercise_kinds %d, concepts %d, concept_prereqs %d"
        % (len(book["types"]), len(book["symbols"]), len(book["exercise_kinds"]),
           len(book["concepts"]), len(book["concept_prereqs"])))
    for s in book["symbols"]:
        need(s.get("type") in (None,) or s["type"] in type_ids,
             "symbol %s names an unknown type %r" % (s["sym"], s.get("type")))
    for e in book["concept_prereqs"]:
        need(e["concept"] in concept_ids, "concept_prereqs names unknown concept %r" % e["concept"])
        need(e["prereq"] in concept_ids, "concept_prereqs names unknown prereq %r" % e["prereq"])

    chapter_sections = {}
    for d in book["chapters"]:
        chapter = read(os.path.join(d, "chapter.json"))
        chapter_sections[chapter["id"]] = {s["id"] for s in chapter["sections"]}
        say("  %s/chapter.json: sections %d, variables %d, equations %d, glossary %d"
            % (d, len(chapter["sections"]), len(chapter["variables"]),
               len(chapter["equations"]), len(chapter["glossary"])))
        for v in chapter["variables"]:
            need(v.get("type") is None or v["type"] in type_ids,
                 "%s variable %s names an unknown type %r" % (d, v["sym"], v.get("type")))
        for eq in chapter["equations"]:
            need(eq.get("concept") is None or eq["concept"] in concept_ids,
                 "%s equation %s names an unknown concept %r" % (d, eq["id"], eq.get("concept")))

        for s in chapter["sections"]:
            path = os.path.join(d, s["id"], "section.json")
            if not os.path.exists(path):
                continue
            sec = read(path)
            say("    %s: figures %d, coverage %d, exercises %d, exercise_concepts %d"
                % (path, len(sec["figures"]), len(sec["coverage"]),
                   len(sec["exercises"]), len(sec["exercise_concepts"])))
            ex_ids = {e["id"] for e in sec["exercises"]}
            for f in sec["figures"]:
                for t in f["draws"]:
                    need(t in type_ids, "%s figure %s draws unknown type %r" % (path, f["id"], t))
            for c in sec["coverage"]:
                need(c["concept"] in concept_ids,
                     "%s coverage names unknown concept %r" % (path, c["concept"]))
            for e in sec["exercises"]:
                need(e["kind"] in kind_ids,
                     "%s exercise %s names unknown kind %r" % (path, e["id"], e["kind"]))
            for p in sec["exercise_concepts"]:
                need(p["exercise"] in ex_ids,
                     "%s exercise_concepts names unknown exercise %r" % (path, p["exercise"]))
                need(p["concept"] in concept_ids,
                     "%s exercise_concepts names unknown concept %r" % (path, p["concept"]))

    later = []
    for c in book["concepts"]:
        chap = c["section"].split(".")[0]
        if chap not in chapter_sections:
            later.append((c["id"], c["section"]))
        else:
            need(c["section"] in chapter_sections[chap],
                 "concept %s names section %s, which chapter %s does not list"
                 % (c["id"], c["section"], chap))
    if later:
        say("  info: %d concepts sit in chapters the book has not added yet:" % len(later))
        for cid, sec in later:
            say("    %s -> %s" % (cid, sec))

    if problems:
        for p in problems:
            print("  BROKEN: " + p, file=sys.stderr)
        fail("%d broken references" % len(problems))
    say("  every cross reference resolves")


def main():
    only_check = "--check" in sys.argv[1:]
    if only_check:
        check()
        return
    if is_migrated():
        say("book.json is already in the table shape; nothing to migrate")
        check()
        return
    migrate()
    check()


if __name__ == "__main__":
    main()
