#!/usr/bin/env python3
"""Make the folder of a translated book, and write its book-level labels.

A translation is a book of its own that keeps every id of its source (root
RULES item 30, docs/prompts/translate.md). This makes its folder once, before
anything is translated, so that the copy is exact and a parity check of the
untranslated copy is clean:

    python3 -I omnistax-content/tools/scaffold_translation.py new \\
      --source "omnistax-content/College Physics 2e" \\
      --target "omnistax-content/College Physics 2e (zh-CN)" \\
      --tag zh-CN --id college-physics-2e-zh-cn --title "大学物理（第2版）" \\
      --translator claude-opus-5-5 --effort medium --date 2026-10-22 \\
      --glossary glossary.zh-CN.json --chapters ch01

What `new` writes into the target, which must not exist yet:

- `book.json`: the source's, with `id` and `title` replaced, `chapters` cut to
  the chapters named (in the source's order), and `language`, `translation_of`
  and `translation` set after `openstax` (translator, effort, date, glossary,
  `authority` and `authority_url` where given, `source_commit` from
  `git rev-parse HEAD` where the source is in a repository). Every table is
  copied whole, the concepts included, since parity compares every id.
- per chapter named: `chapter.json` and `COLOR.md` as they are; a new
  `config.md` with the pass's settings and an empty forced-scenario table; and
  for every section folder the chapter lists, and its `intro/` and `summary/`
  where present, `section.json`, `text.html` and `figures.js`.
- `COLOR.md` as it is, and `RULES.md` with a "Translation" section appended.
- `tools/mergebook.py` and `tools/merge-state.json`, which `ost` needs to
  stage a write to a concept.
- an empty `glossary.<tag>.json`, `translation-notes.md` and `LOG.md`.

It does not copy `media/` (the app serves the source's media for a
translation), `source.md`, `plan.md`, `exploration.md`, `book-rows.json`,
`concept-migration.json`, the source's other tools, or the book's own
`intro/` and `summary/`.

`add` carries more of the source's chapters into a scaffold that exists,
the same way `new` carried the first ones (the chapter's `chapter.json`,
`COLOR.md`, a fresh `config.md` and every page's three files, byte for byte),
and appends them to `book.json`'s `chapters` in the source's order. The
translator and effort it writes into each `config.md` are the pass's own,
which may differ from the book's first:

    python3 -I omnistax-content/tools/scaffold_translation.py add college-physics-2e-zh-cn \
      --translator claude-sonnet-5-5 --effort medium --date 2026-10-22 --chapters ch02 ch03

`labels` writes what no chapter stages and `ost` will not write: the book's
`title`, `types[].label`, `exercise_kinds[].label`, `sheets[].title`, and each
chapter's own `title`, from one JSON file, so that `book.json` is never edited
by hand:

    python3 -I omnistax-content/tools/scaffold_translation.py labels college-physics-2e-zh-cn labels.json

    {"title": "…", "types": {"<id>": "<label>"}, "exercise_kinds": {"<id>": "<label>"},
     "sheets": {"<id>": "<title>"}, "chapters": {"ch01": "<title>"}}

Every id must name a row that is there; nothing is written when one does not.
The write goes through `ost`'s writer (atomic, in the file's own form, under
the merge lock) and its checker.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from typing import Any, Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ost  # noqa: E402

RecordDTO = dict[str, Any]

EFFORTS = ("low", "medium", "high", "max")
SECTION_FILES = ("section.json", "text.html", "figures.js")
TERMONLINE = {"id": "termonline", "name": "全国科学技术名词审定委员会 术语在线", "url": "https://www.termonline.cn/"}
PROMPT = "docs/prompts/translate.md"


class Refused(Exception):
    """An error the caller should see as one line, and nothing written."""


def load(path: str) -> RecordDTO:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_text(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def write_json(path: str, value: Any) -> None:
    write_text(path, json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def source_commit(source: str) -> Optional[str]:
    try:
        done = subprocess.run(["git", "-C", source, "rev-parse", "HEAD"], capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    commit = done.stdout.strip()
    return commit if done.returncode == 0 and commit else None


def translated_book(book: RecordDTO, args: argparse.Namespace, commit: Optional[str]) -> RecordDTO:
    """The source's book.json as the translation starts from it."""
    have = book.get("chapters", [])
    missing = [c for c in args.chapters if c not in have]
    if missing:
        raise Refused(f"the source lists no chapter {', '.join(missing)}; its chapters are {', '.join(have)}")
    translation: RecordDTO = {"translator": args.translator}
    if args.effort:
        translation["effort"] = args.effort
    translation["date"] = args.date
    if args.authority:
        translation["authority"] = args.authority
    if args.authority_url:
        translation["authority_url"] = args.authority_url
    translation["glossary"] = args.glossary
    if commit:
        translation["source_commit"] = commit
    added = {"language": args.tag, "translation_of": book["id"], "translation": translation}
    out: RecordDTO = {}
    after = "openstax" if "openstax" in book else "license_url" if "license_url" in book else "license"
    for key, value in book.items():
        if key in added:
            continue
        out[key] = {"id": args.id, "title": args.title, "chapters": [c for c in have if c in args.chapters]}.get(key, value)
        if key == after:
            out.update(added)
    if "language" not in out:
        out.update(added)
    return out


def page_dirs(chapter_dir: str, chapter: RecordDTO) -> list[str]:
    """The chapter's page folders that exist: its intro, each section it lists, its summary."""
    names = (["intro"] + [s["id"] for s in chapter.get("sections", [])] + ["summary"])
    return [n for n in names if os.path.isdir(os.path.join(chapter_dir, n))]


def config_text(args: argparse.Namespace, chapter: RecordDTO, source_name: str) -> str:
    return f"""# Config: {args.title}, Chapter {chapter.get('id')} (translation)

The translation pass of `{source_name}` chapter {chapter.get('id')} into {args.tag}, under `{PROMPT}`.
Each line is a setting and its value.

| Setting | Value |
|---|---|
| Source | `{source_name}` {chapter.get('dir')}, every page it lists |
| Language | {args.tag} |
| Translator | {args.translator}{', ' + args.effort + ' effort' if args.effort else ''} |
| Terminology | `{args.glossary}`, read before the first sentence; a new term is added as pending |
| Fidelity | the source's tone, sentences and content; nothing added or removed except the forced scenarios below |
| Humanizer review | deferred to the owner |

## Forced scenarios

Every place where a faithful translation was impossible as the source stands
(translate.md item 4), one row each; `translation-notes.md` carries the same
entry.

| File | Span or line | What was done | Why |
|---|---|---|---|
"""


def rules_text(source_rules: str, args: argparse.Namespace, source_book: RecordDTO, source_name: str) -> str:
    return source_rules.rstrip("\n") + f"""

## Translation

This book is the {args.tag} translation of `{source_name}` ({source_book['id']}), with its own id
`{args.id}`. Every rule above applies to it as written; where one speaks of
the book's words, they are now the translation's. The rules of the
translation itself are `{PROMPT}` (root RULES item 30): the terms are fixed in
`{args.glossary}`, every forced scenario is a row of its chapter's `config.md`
and an entry of `translation-notes.md`, and every id stays the source's.
"""


def notes_text(args: argparse.Namespace, source_name: str) -> str:
    return f"""# Translation notes: {args.title}

Every forced scenario of the translation of `{source_name}` into {args.tag}
(`{PROMPT}` item 4), and anything else the owner should see: one entry per
place, with the file, the span or line, what was done and why.

| File | Span or line | What was done | Why |
|---|---|---|---|
"""


def log_text(args: argparse.Namespace, source_name: str, commit: Optional[str]) -> str:
    at = f" at commit {commit}" if commit else ""
    return f"""# Log: {args.title}

### Pass 1 ({args.date}): scaffold

The folder was made by `omnistax-content/tools/scaffold_translation.py` from
`{source_name}`{at}, chapters {', '.join(args.chapters)}. Nothing is translated yet: every
file is the source's, `book.json` carries `language` {args.tag}, `translation_of`
and `translation` ({args.translator}{', ' + args.effort if args.effort else ''}). The humanizer review is deferred to the owner.
"""


def cmd_new(args: argparse.Namespace) -> int:
    source, target = os.path.abspath(args.source), os.path.abspath(args.target)
    if args.effort and args.effort not in EFFORTS:
        raise Refused(f"effort is {args.effort!r}; one of {', '.join(EFFORTS)}")
    if not os.path.exists(os.path.join(source, "book.json")):
        raise Refused(f"{args.source} holds no book.json")
    if os.path.exists(target):
        raise Refused(f"{args.target} exists already; a scaffold is made once")
    book = load(os.path.join(source, "book.json"))
    commit = source_commit(source)
    out = translated_book(book, args, commit)
    source_name = os.path.basename(source.rstrip(os.sep))
    chapters = []
    for ch in out["chapters"]:
        path = os.path.join(source, ch, "chapter.json")
        if not os.path.exists(path):
            raise Refused(f"{ch} has no chapter.json in the source")
        chapters.append((ch, load(path)))

    os.makedirs(target)
    write_json(os.path.join(target, "book.json"), out)
    for name in ("COLOR.md",):
        if os.path.exists(os.path.join(source, name)):
            shutil.copy2(os.path.join(source, name), os.path.join(target, name))
    rules = open(os.path.join(source, "RULES.md"), encoding="utf-8").read() if os.path.exists(os.path.join(source, "RULES.md")) else f"# Rules: {book.get('title')}\n"
    write_text(os.path.join(target, "RULES.md"), rules_text(rules, args, book, source_name))
    for name in ("mergebook.py", "merge-state.json"):
        if os.path.exists(os.path.join(source, "tools", name)):
            os.makedirs(os.path.join(target, "tools"), exist_ok=True)
            shutil.copy2(os.path.join(source, "tools", name), os.path.join(target, "tools", name))
    for row in out.get("sheets", []):
        src = os.path.join(source, row["file"])
        if os.path.exists(src):
            os.makedirs(os.path.dirname(os.path.join(target, row["file"])), exist_ok=True)
            shutil.copy2(src, os.path.join(target, row["file"]))

    copied = 0
    for ch, chapter in chapters:
        sdir, tdir = os.path.join(source, ch), os.path.join(target, ch)
        os.makedirs(tdir)
        shutil.copy2(os.path.join(sdir, "chapter.json"), os.path.join(tdir, "chapter.json"))
        if os.path.exists(os.path.join(sdir, "COLOR.md")):
            shutil.copy2(os.path.join(sdir, "COLOR.md"), os.path.join(tdir, "COLOR.md"))
        write_text(os.path.join(tdir, "config.md"), config_text(args, chapter, source_name))
        for page in page_dirs(sdir, chapter):
            os.makedirs(os.path.join(tdir, page))
            for name in SECTION_FILES:
                if os.path.exists(os.path.join(sdir, page, name)):
                    shutil.copy2(os.path.join(sdir, page, name), os.path.join(tdir, page, name))
                    copied += 1

    write_json(os.path.join(target, args.glossary), {"language": args.tag, "authorities": [TERMONLINE], "terms": []})
    write_text(os.path.join(target, "translation-notes.md"), notes_text(args, source_name))
    write_text(os.path.join(target, "LOG.md"), log_text(args, source_name, commit))
    print(f"scaffold: {args.id} in {os.path.relpath(target)}: chapters {', '.join(out['chapters'])}, {copied} page files copied")
    return 0


def cmd_add(args: argparse.Namespace) -> int:
    """Carry more of the source's chapters into a scaffold that exists."""
    if args.effort and args.effort not in EFFORTS:
        raise Refused(f"effort is {args.effort!r}; one of {', '.join(EFFORTS)}")
    book = ost.book_of(args.book)
    target = book.dir
    out = ost.load(book.book_path)
    if "translation_of" not in out or "language" not in out:
        raise Refused(f"{args.book} is not a translation (no translation_of)")
    source_book = ost.book_of(out["translation_of"])
    source = source_book.dir
    source_name = os.path.basename(source.rstrip(os.sep))
    have = load(os.path.join(source, "book.json")).get("chapters", [])
    missing = [c for c in args.chapters if c not in have]
    if missing:
        raise Refused(f"the source lists no chapter {', '.join(missing)}; its chapters are {', '.join(have)}")
    already = [c for c in args.chapters if c in out.get("chapters", [])]
    if already:
        raise Refused(f"{args.book} carries {', '.join(already)} already")
    for ch in args.chapters:
        if os.path.exists(os.path.join(target, ch)):
            raise Refused(f"{os.path.join(os.path.relpath(target), ch)} exists already")
    args.title, args.tag = out["title"], out["language"]
    args.glossary = out.get("translation", {}).get("glossary", f"glossary.{args.tag}.json")
    chapters = []
    for ch in args.chapters:
        path = os.path.join(source, ch, "chapter.json")
        if not os.path.exists(path):
            raise Refused(f"{ch} has no chapter.json in the source")
        chapters.append((ch, load(path)))

    copied = 0
    for ch, chapter in chapters:
        sdir, tdir = os.path.join(source, ch), os.path.join(target, ch)
        os.makedirs(tdir)
        shutil.copy2(os.path.join(sdir, "chapter.json"), os.path.join(tdir, "chapter.json"))
        if os.path.exists(os.path.join(sdir, "COLOR.md")):
            shutil.copy2(os.path.join(sdir, "COLOR.md"), os.path.join(tdir, "COLOR.md"))
        write_text(os.path.join(tdir, "config.md"), config_text(args, chapter, source_name))
        for page in page_dirs(sdir, chapter):
            os.makedirs(os.path.join(tdir, page))
            for name in SECTION_FILES:
                if os.path.exists(os.path.join(sdir, page, name)):
                    shutil.copy2(os.path.join(sdir, page, name), os.path.join(tdir, page, name))
                    copied += 1
    wanted = set(out.get("chapters", [])) | set(args.chapters)

    def write() -> None:
        ost.write_record(book.book_path, {**ost.load(book.book_path), "chapters": [c for c in have if c in wanted]})
    ost.under_lock(write)
    print(f"scaffold: {args.book} gains chapters {', '.join(args.chapters)}, {copied} page files copied")
    return 0


def apply_labels(book: RecordDTO, labels: RecordDTO) -> RecordDTO:
    """The pure step of `labels`: the book with each named label replaced, or a refusal naming what is not there."""
    unknown = set(labels) - {"title", "types", "exercise_kinds", "sheets", "chapters"}
    if unknown:
        raise Refused(f"labels takes title, types, exercise_kinds, sheets and chapters, not {', '.join(sorted(unknown))}")
    out = dict(book)
    if "title" in labels:
        if not isinstance(labels["title"], str) or not labels["title"]:
            raise Refused("title must be a string")
        out["title"] = labels["title"]
    for table, field in (("types", "label"), ("exercise_kinds", "label"), ("sheets", "title")):
        wanted = labels.get(table, {})
        rows = book.get(table, [])
        missing = sorted(set(wanted) - {r["id"] for r in rows})
        if missing:
            raise Refused(f"{table} has no row {', '.join(missing)}")
        if any(not isinstance(v, str) or not v for v in wanted.values()):
            raise Refused(f"every {table} {field} must be a non-empty string")
        if wanted:
            out[table] = [{**r, field: wanted[r["id"]]} if r["id"] in wanted else r for r in rows]
    return out


def cmd_labels(args: argparse.Namespace) -> int:
    book = ost.book_of(args.book)
    labels = load(args.file)
    chapters = labels.get("chapters", {})
    for ch in chapters:
        if not os.path.exists(os.path.join(book.dir, ch, "chapter.json")):
            raise Refused(f"{args.book} has no chapter {ch}")

    def write() -> None:
        ost.write_record(book.book_path, apply_labels(ost.load(book.book_path), labels))
    ost.under_lock(write)
    for ch, title in chapters.items():
        path = os.path.join(book.dir, ch, "chapter.json")
        ost.write_record(path, {**ost.load(path), "title": title})
    n = sum(len(labels.get(t, {})) for t in ("types", "exercise_kinds", "sheets")) + ("title" in labels) + len(chapters)
    print(f"labels: {n} labels written to {args.book}")
    return ost.report_write(book.id, "book.json")


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="scaffold_translation", description=__doc__.split("\n\n")[0])
    subs = p.add_subparsers(dest="command", required=True)
    new = subs.add_parser("new", help="make the folder of a translated book")
    new.add_argument("--source", required=True, help="the source book's folder")
    new.add_argument("--target", required=True, help='the new folder, "<Source folder> (<tag>)"')
    new.add_argument("--tag", required=True, help="the BCP 47 tag of the language, such as zh-CN")
    new.add_argument("--id", required=True, help="the translation's id, <source id>-<tag lowercased>")
    new.add_argument("--title", required=True, help="the title in the target language")
    new.add_argument("--translator", required=True, help="the model's API id, or a person")
    new.add_argument("--effort", help="low, medium, high or max")
    new.add_argument("--date", required=True, help="the ISO date of the translation")
    new.add_argument("--glossary", required=True, help="the glossary's file name, glossary.<tag>.json")
    new.add_argument("--chapters", required=True, nargs="+", help="the chapter directories to carry, such as ch01")
    new.add_argument("--authority", help="the published translation whose terms are followed, where one exists")
    new.add_argument("--authority-url", dest="authority_url", help="that translation's own page")
    add = subs.add_parser("add", help="carry more of the source's chapters into a scaffold that exists")
    add.add_argument("book", help="the translated book's id")
    add.add_argument("--translator", required=True, help="the model's API id, or a person, of this pass")
    add.add_argument("--effort", help="low, medium, high or max")
    add.add_argument("--date", required=True, help="the ISO date of the pass")
    add.add_argument("--chapters", required=True, nargs="+", help="the chapter directories to add, such as ch02")
    labels = subs.add_parser("labels", help="write the book's title, type, exercise kind and sheet labels and chapter titles")
    labels.add_argument("book", help="the translated book's id")
    labels.add_argument("file", help="the labels, as JSON")
    return p


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parser().parse_args(argv)
    try:
        return {"new": cmd_new, "add": cmd_add, "labels": cmd_labels}[args.command](args)
    except (Refused, ost.Refused) as e:
        print(f"scaffold_translation: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
