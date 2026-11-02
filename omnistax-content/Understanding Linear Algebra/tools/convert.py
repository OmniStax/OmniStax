#!/usr/bin/env python3
"""Convert the PreTeXt of Understanding Linear Algebra into source.md files, by section or chapter.

    python3 tools/convert.py 1.2         one section: ch01/1.2/source.md
    python3 tools/convert.py 1           every section of Chapter 1, and its introduction page where it prints one
    python3 tools/convert.py --intro     the book's own preface: intro/source.md
    python3 tools/convert.py --all       every page of the book
    python3 tools/convert.py --index     write toc.md and modules.json
    python3 tools/convert.py 1 --out DIR the same layout under DIR instead of this folder

Run from anywhere. The source is source/ula (David Austin's repository, read-only),
in the order src/chap1.xml … src/chap7.xml include it. Every run reads the whole
book, since a cross-reference needs everything before and after it. The book is
read the way its own web edition is built (publication/publication.ptx keeps only
the "production" component): an element whose `component` is anything else
(rs-preview, proteus, proteus-playground, print) is Runestone or print-only
matter and is dropped. The converter is the source of record; a source.md is
never edited by hand.

Numbers follow PreTeXt's defaults as the book's PDF prints them (site/ula.pdf):
sections N.M; subsections N.M.k; figures, tables, definitions, examples,
theorems, propositions, observations and the other numbered blocks share one
counter per section, N.M.k, counted through the section's exercises too;
activities and preview activities share a counter of their own, N.M.k; an
end-of-section exercise is N.M.k by its place in the Exercises subsection. An
assemblage and a Sage cell print no number.

An id is the book's xml:id where it has one (sec-expect, fig-three-possibilities,
thm-rref-is-unique); an item without one is named from its kind and number
(example-1-2-4, fig-2-1-3, activity-1-2-2). An exercise is always
exercise-N-M-kkk, the printed number padded to three digits so that no id is part
of another, with label= where the book gives it an xml:id.

Markers, in the order a section prints them:

  # N.M Title {sec-id}           the section.
  ## N.M.k Title [{sub-id}]      a subsection, numbered as the book numbers it; ### a
                                 titled run of paragraphs. The id only where the book
                                 gives one.
  $$ … $$                        a display, joined to one line; several rows are set in
                                 \\begin{aligned} … \\end{aligned} as the web edition sets them.
  :::activity {act:id} Activity N.M.k [(title)]
  …  PROBLEM: …                  an activity (or Preview Activity N.M.k, the book's
  ANSWER: …  SOLUTION: …  :::    exploration): its introduction, the statement, then the
                                 book's answer and solution where it prints them. A task
                                 is a part, a) b) …, under each of the three headings.
  :::example {ex:id} Example N.M.k [(title)] … [SOLUTION: …] :::
  :::definition {def:id} Definition N.M.k [(title)] … :::
  :::theorem {thm:id} Theorem N.M.k [(title)] … :::      also :::proposition, :::corollary,
                                 :::lemma, :::principle, :::convention, with the kind as
                                 the book prints it; a proof follows as :::proof … :::
  :::observation {obs:id} Observation N.M.k … :::
  :::remark {rem:id} Remark N.M.k [(title)] … :::        also :::note, :::insight, :::warning
  :::assemblage {asm:id} Title … :::                     a framed summary box, unnumbered.
  :::sage [lang]                 a Sage cell: its input as a fenced code block, then
  ```sage … ```  [OUTPUT: …] ::: the output the book prints, where it prints one.
  :::exercise {exercise-N-M-kkk} number=N.M.k answered=yes|no src=FILE:LINE [label=…]
  PROBLEM: …  [HINT: …]          an end-of-section exercise; answered=yes where the book
  [ANSWER: …]  [SOLUTION: …] ::: prints an answer or a solution for it.
  > FIGURE {fig:id} number=N.M.k src=../../media/chNN/NAME.svg
  > alt: …                       a numbered figure: the book's short description, its
  > width: …                     width where it gives one, its caption; a figure of several
  > caption: …                   pictures lists each as a subfigure. A figure the book draws
  > subfigure src=… alt: …       with PreFigure is served from the book's own rendering
  > interactive: FILES           (assets/images/NAME.svg) or rendered by `prefig` where the
                                 book ships none; a figure that is one of the author's
                                 JavaScript interactives carries its preview image as src and
                                 names its scripts.
  > IMAGE {img:NAME} src=…       a picture with no caption (in an answer, beside a paragraph).
  > alt: …
  > INTERACTIVE {int:id} src=../../media/chNN/NAME.png scripts=FILES
  > alt: …                       an interactive outside a figure.
  > TABLE {tab:id} number=N.M.k cols=C
  > caption: …                   a table; a bare tabular has no marker.
  | a | b |                      rows as a markdown table; an empty header row where
  | --- | --- |                  the book marks none.
  a) …  1. …  (i) …  - …         ol by its marker, ul; nested lists indent four spaces.
  - **Title**: …                 a dl entry.
  ^[…]                           a footnote, where the book anchors it.
  {index-entry:X}                an <idx> entry, which prints nothing; a <term> is *X*{index:X}.
  *…*  **…**  `…`  “…”           em, alert, c, q.
  [Figure 1.1.2](ref:id)         a reference, with the words the book prints (Figure, Table,
  [Section 1.3](ref:1.3#id)      Activity, Preview Activity, Definition, Example, Theorem,
                                 Proposition, Observation, Section, Chapter, Exercise,
                                 Subsection, or an unnumbered item's title); the target is
                                 ref:id on the same page and ref:PAGE#id on another (PAGE a
                                 section number, a chapter number, or intro).
  [text](url)                    a url.
  > blockquote                   a block quotation.

Maths stays LaTeX. The book's own macros (bookinfo.xml) are expanded so that KaTeX
reads every formula: \\twovec{a}{b} and its kin become the arrays they stand for,
\\xvec is \\mathbf{x}, \\real is \\mathbb{R}, \\laspan{…} is \\text{Span}\\{…\\}.
PreTeXt's \\amp is &, \\lt and \\gt are < and >. Anything the converter cannot place
is reported on stderr with its file and line.
"""
import json
import os
import re
import shutil
import subprocess
import sys

from lxml import etree

BOOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BOOK, "source", "ula")
XML = os.path.join(SRC, "src")
ASSETS = os.path.join(SRC, "assets")
MEDIA = "../../media"
XI = "{http://www.w3.org/2001/XInclude}include"
XMLNS = "{http://www.w3.org/XML/1998/namespace}"
FILEATTR = "ula-file"

BLOCK_NUMBERED = {"figure", "table", "listing", "definition", "example", "theorem", "proposition",
                  "lemma", "corollary", "observation", "remark", "note", "insight", "warning",
                  "convention", "principle", "claim", "fact", "conjecture", "axiom", "algorithm",
                  "assumption", "heuristic", "hypothesis", "identity", "question"}
PROJECT_NUMBERED = {"activity", "exploration", "project", "investigation"}
KIND_WORD = {"figure": "Figure", "table": "Table", "listing": "Listing", "definition": "Definition",
             "example": "Example", "theorem": "Theorem", "proposition": "Proposition", "lemma": "Lemma",
             "corollary": "Corollary", "observation": "Observation", "remark": "Remark", "note": "Note",
             "insight": "Insight", "warning": "Warning", "convention": "Convention",
             "principle": "Principle", "activity": "Activity", "exploration": "Preview Activity",
             "project": "Project", "investigation": "Investigation", "exercise": "Exercise",
             "section": "Section", "subsection": "Subsection", "chapter": "Chapter", "task": "Task",
             "question": "Question", "checkpoint": "Checkpoint", "item": "Item", "appendix": "Appendix"}
BLOCK_TAG = {"definition": "def", "example": "ex", "theorem": "thm", "proposition": "prop", "lemma": "lem",
             "corollary": "cor", "observation": "obs", "remark": "rem", "note": "note", "insight": "ins",
             "warning": "warn", "convention": "conv", "principle": "prin", "activity": "act",
             "exploration": "act", "project": "act", "investigation": "act", "assemblage": "asm",
             "figure": "fig", "table": "tab", "listing": "lst", "question": "q", "checkpoint": "cp"}
ID_PREFIX = {"definition": "definition", "example": "example", "theorem": "theorem", "proposition": "proposition",
             "lemma": "lemma", "corollary": "corollary", "observation": "observation", "remark": "remark",
             "note": "note", "insight": "insight", "warning": "warning", "convention": "convention",
             "principle": "principle", "activity": "activity", "exploration": "preview", "project": "project",
             "investigation": "investigation", "assemblage": "assemblage", "figure": "fig", "table": "tab",
             "listing": "listing", "question": "question", "checkpoint": "checkpoint"}
EMPTY = {"ndash": "–", "mdash": "—", "ellipsis": "…", "nbsp": "\u00a0", "times": "×", "percent": "%",
         "dollar": "\\$", "ampersand": "&", "lsq": "‘", "rsq": "’", "lq": "“", "rq": "”", "apos": "’",
         "copyright": "©", "degree": "°", "pretext": "PreTeXt", "latex": "LaTeX", "tex": "TeX",
         "today": "", "hash": "#", "minus": "−", "plusminus": "±", "solidus": "/", "backslash": "\\",
         "obelus": "÷", "langle": "⟨", "rangle": "⟩", "midpoint": "·", "swungdash": "⁓", "permille": "‰",
         "pilcrow": "¶", "section-mark": "§", "trademark": "™", "registered": "®", "icon": "",
         "webwork": "WeBWorK", "sage": "Sage", "python": "Python", "br": "\\\\", "lbrace": "{", "rbrace": "}"}

PROBLEMS = []


def warn(el, what):
    PROBLEMS.append(f"{file_of(el)}:{el.sourceline}: {what}")


def file_of(el):
    e = el
    while e is not None:
        f = e.get(FILEATTR)
        if f:
            return f
        e = e.getparent()
    return "?"


# ------------------------------------------------------------------ reading


def parse(path):
    tree = etree.parse(path, etree.XMLParser(remove_comments=True))
    root = tree.getroot()
    root.set(FILEATTR, os.path.relpath(path, SRC))
    include(root, os.path.dirname(path))
    return root


def include(el, base):
    """Resolve xi:include in place, except inside a <prefigure>, whose include names the diagram."""
    for child in list(el):
        if child.tag == XI:
            if el.tag.endswith("prefigure"):
                continue
            href = child.get("href")
            path = os.path.normpath(os.path.join(base, href))
            if not os.path.exists(path):
                PROBLEMS.append(f"{os.path.relpath(path, SRC)}: missing include")
                el.remove(child)
                continue
            sub = parse(path)
            sub.tail = child.tail
            el.replace(child, sub)
        else:
            include(child, base)


def local(el):
    if not isinstance(el.tag, str):
        return ""
    return etree.QName(el).localname


def kept(el):
    c = el.get("component")
    return c is None or c == "production"


# ------------------------------------------------------------------ macros


class Macros:
    """The book's \\newcommand macros, expanded in every formula."""

    def __init__(self, text):
        self.defs = {}
        for m in re.finditer(r"\\(?:re)?newcommand\{\\([A-Za-z]+)\}(?:\[(\d)\])?\{", text):
            name, n = m.group(1), int(m.group(2) or 0)
            body, _ = braced(text, m.end() - 1)
            self.defs[name] = (n, body)

    def expand(self, s):
        for _ in range(12):
            out = self.pass_(s)
            if out == s:
                return s
            s = out
        return s

    def pass_(self, s):
        i, out = 0, []
        while True:
            m = re.search(r"\\([A-Za-z]+)", s[i:])
            if not m:
                out.append(s[i:])
                break
            name = m.group(1)
            start, end = i + m.start(), i + m.end()
            if name not in self.defs:
                out.append(s[i:end])
                i = end
                continue
            n, body = self.defs[name]
            args, j = [], end
            ok = True
            for _ in range(n):
                while j < len(s) and s[j] in " \t\n":
                    j += 1
                if j < len(s) and s[j] == "{":
                    arg, j = braced(s, j)
                    args.append(arg)
                elif j < len(s):
                    args.append(s[j])
                    j += 1
                else:
                    ok = False
                    break
            if not ok:
                out.append(s[i:end])
                i = end
                continue
            text = body
            for k, a in enumerate(args, 1):
                text = text.replace(f"#{k}", a)
            out.append(s[i:start])
            # a zero-argument macro followed by a letter needs a space
            if n == 0 and j < len(s) and s[j].isalpha() and text[-1:].isalpha():
                text += " "
            out.append(text)
            i = j
        return "".join(out)


def braced(s, i):
    """The content of the brace group starting at s[i] == '{', and the index after it."""
    depth, j = 0, i
    while j < len(s):
        if s[j] == "\\":
            j += 2
            continue
        if s[j] == "{":
            depth += 1
        elif s[j] == "}":
            depth -= 1
            if depth == 0:
                return s[i + 1:j], j + 1
        j += 1
    return s[i + 1:], len(s)


MACROS = None


def math(s):
    s = s.replace("\\amp", "&").replace("\\lt", "<").replace("\\gt", ">")
    s = MACROS.expand(s)
    s = re.sub(r"[ \t]*\n[ \t]*", " ", s.strip())
    s = re.sub(r"  +", " ", s)
    return s


# ------------------------------------------------------------------ the book

class Book:
    def __init__(self):
        global MACROS
        info = parse(os.path.join(XML, "bookinfo.xml"))
        MACROS = Macros(info.findtext("macros") or "")
        self.front = parse(os.path.join(XML, "frontmatter.xml"))
        self.chapters = []           # [(number, chapter element)]
        for n in range(1, 8):
            path = os.path.join(XML, f"chap{n}.xml")
            if os.path.exists(path):
                self.chapters.append((n, parse(path)))
        self.ids = {}                # xml:id -> (page, kind, number, title)
        back = parse(os.path.join(XML, "backmatter.xml"))
        for i, app in enumerate([a for a in back if local(a) == "appendix"]):
            xid = app.get(XMLNS + "id")
            if xid:
                self.ids[xid] = ("back", "appendix", chr(65 + i), text_of(app.find("title")))
        self.pages = []              # [(page, chapter number, section element or None, title)]
        self.sections = {}           # "1.2" -> element
        self.number()

    # ---- numbering: one pass that gives every numbered thing its number and page
    def number(self):
        for n, ch in self.chapters:
            self.ids[ch.get(XMLNS + "id") or f"chap{n}"] = (str(n), "chapter", str(n), text_of(ch.find("title")))
            intro = ch.find("introduction")
            if intro is not None:
                self.pages.append((f"{n}.intro", n, intro, f"Chapter {n} introduction"))
                self.number_blocks(intro, f"{n}.intro", {"blk": 0, "proj": 0, "sub": 0, "ex": 0})
            for m, sec in enumerate([s for s in ch if local(s) == "section"], 1):
                page = f"{n}.{m}"
                sid = sec.get(XMLNS + "id") or f"sec-{n}-{m}"
                sec.set("page", page)
                self.sections[page] = sec
                self.pages.append((page, n, sec, text_of(sec.find("title"))))
                self.ids[sid] = (page, "section", page, text_of(sec.find("title")))
                self.number_blocks(sec, page, {"blk": 0, "proj": 0, "sub": 0, "ex": 0})

    def number_blocks(self, el, page, c, nonum=False):
        for child in el:
            tag = local(child)
            if not tag or not kept(child):
                continue
            if tag == "subsection":
                c["sub"] += 1
                child.set("number", f"{page}.{c['sub']}")
                self.register(child, page, "subsection", child.get("number"))
            elif tag == "exercises":
                c["sub"] += 1
                child.set("number", f"{page}.{c['sub']}")
                self.register(child, page, "subsection", child.get("number"))
                c["ex"] = 0
            elif tag == "exercise":
                if local(child.getparent()) in ("exercises", "exercisegroup"):
                    c["ex"] += 1
                    child.set("number", f"{page}.{c['ex']}")
                    self.register(child, page, "exercise", child.get("number"), f"exercise-{page.replace('.', '-')}-{c['ex']:03d}")
                else:
                    c["blk"] += 1
                    child.set("number", f"{page}.{c['blk']}")
                    child.set("inline", "yes")
                    self.register(child, page, "checkpoint", child.get("number"), f"checkpoint-{page.replace('.', '-')}-{c['blk']}")
            elif tag in BLOCK_NUMBERED:
                if nonum:
                    child.set("number", "")
                    self.register(child, page, tag, "")
                else:
                    c["blk"] += 1
                    child.set("number", f"{page}.{c['blk']}")
                    self.register(child, page, tag, child.get("number"))
            elif tag in PROJECT_NUMBERED:
                c["proj"] += 1
                child.set("number", f"{page}.{c['proj']}")
                self.register(child, page, tag, child.get("number"))
                for i, task in enumerate([t for t in child if local(t) == "task" and kept(t)]):
                    task.set("number", f"{child.get('number')}.{chr(97 + i)}")
                    self.register(task, page, "task", task.get("number"))
            elif tag == "assemblage":
                self.register(child, page, "assemblage", "")
            elif tag == "li" and child.get(XMLNS + "id"):
                parent = child.getparent()
                items = [i for i in parent if local(i) == "li" and kept(i)]
                label = item_label(parent.get("marker") or "a.", items.index(child)).rstrip(").") if local(parent) == "ol" else ""
                self.register(child, page, "item", label)
            self.number_blocks(child, page, c, nonum or tag in ("answer", "hint", "solution"))

    def register(self, el, page, kind, number, idd=None):
        xid = el.get(XMLNS + "id")
        if idd is None:
            idd = xid or f"{ID_PREFIX.get(kind, kind)}-{number.replace('.', '-')}"
        el.set("ula-id", idd)
        title = text_of(el.find("title")) if el.find("title") is not None else ""
        if xid:
            self.ids[xid] = (page, kind, number, title)
        self.ids[idd] = (page, kind, number, title)


# ------------------------------------------------------------------ inline text

def text_of(el):
    """Plain text of an element (titles, captions, alt text), maths kept as $…$."""
    if el is None:
        return ""
    return norm(inline(el, plain=True))


def norm(s):
    s = re.sub(r"[ \t]*\n[ \t]*", " ", s)
    s = re.sub(r"  +", " ", s)
    return s.strip()


def inline(el, plain=False):
    """Mixed content as markdown; block children inside a <p> are handled by para()."""
    out = [el.text or ""]
    for child in el:
        out.append(inline_el(child, plain))
        out.append(child.tail or "")
    return "".join(out)


def inline_el(child, plain=False):
    tag = local(child)
    if not tag:
        return ""
    if not kept(child):
        return ""
    if tag == "m":
        return "$" + math(child.text or "") + "$"
    if tag in EMPTY:
        return EMPTY[tag]
    if tag == "em":
        return "*" + inline(child, plain).strip() + "*"
    if tag == "term":
        t = inline(child, plain).strip()
        return f"*{t}*" if plain else f"*{t}*{{index:{t}}}"
    if tag == "alert":
        return "**" + inline(child, plain).strip() + "**"
    if tag in ("c", "kbd"):
        return "`" + (child.text or "") + "`"
    if tag == "q":
        return "“" + inline(child, plain).strip() + "”"
    if tag == "sq":
        return "‘" + inline(child, plain).strip() + "’"
    if tag == "idx":
        if plain:
            return ""
        key = norm(inline(child, True)).replace("\n", " ")
        return "" if not key else f"{{index-entry:{key}}}"
    if tag == "fn":
        return "^[" + norm(inline(child, plain)) + "]"
    if tag == "xref":
        return xref(child)
    if tag == "url":
        href = child.get("href", "")
        visual = child.get("visual") or norm(inline(child, plain)) or href
        return f"[{visual}]({href})"
    if tag in ("email",):
        return child.text or ""
    if tag in ("foreign", "abbr", "init", "acro", "taxon", "pubtitle", "articletitle", "title"):
        return inline(child, plain)
    if tag == "quantity":
        return (child.findtext("mag") or "") + " " + " ".join(u.get("base", "") for u in child.findall("unit"))
    if tag in ("sup",):
        return "^" + inline(child, plain) + "^"
    if tag in ("sub",):
        return "~" + inline(child, plain) + "~"
    if tag in ("h",):
        return inline(child, plain)
    if tag in ("p", "md", "me", "mdn", "men", "ol", "ul", "dl", "sidebyside", "image", "figure", "tabular", "table", "cd", "pre", "sage"):
        # a block inside a paragraph: para() takes it out; here only when asked for plain text
        return " " + norm(" ".join(lines_of(child))) + " " if plain else ""
    warn(child, f"unknown inline <{tag}>")
    return inline(child, plain)


BOOKREF = None


def xref(el):
    ref = (el.get("ref") or "").strip()
    page_here = el.get("ula-page") or current_page(el)
    if ref not in BOOKREF.ids:
        warn(el, f"xref to unknown id {ref!r}")
        return norm(inline(el)) or ref
    page, kind, number, title = BOOKREF.ids[ref]
    words = norm(inline(el))
    textattr = el.get("text", "")
    if not words:
        if kind == "item":
            words = f"Item {number}" if number else title
        elif kind in ("assemblage",) or not number:
            words = title
        elif textattr in ("title",):
            words = title
        else:
            words = f"{KIND_WORD.get(kind, kind.capitalize())} {number}"
    if kind == "appendix":
        target = f"ref:back#{ref}"
    elif kind == "chapter":
        target = f"ref:{number}#{ref}" if page_here != number else f"ref:{ref}"
    elif page == page_here:
        target = f"ref:{ref}"
    else:
        target = f"ref:{page}#{ref}"
    if kind == "section" and page == page_here:
        target = f"ref:{ref}"
    return f"[{words}]({target})"


def current_page(el):
    e = el
    while e is not None:
        if e.get("page"):
            return e.get("page")
        e = e.getparent()
    return ""


# ------------------------------------------------------------------ blocks

def lines_of(el, depth=0):
    """The markdown lines of a block element and everything in it."""
    out = []
    tag = local(el)
    fn = BLOCKS.get(tag)
    if fn:
        out.extend(fn(el, depth))
    else:
        warn(el, f"unknown block <{tag}>")
        out.extend(children(el, depth))
    return out


def children(el, depth=0, skip=()):
    out = []
    if el.text and el.text.strip():
        out.append(norm(el.text))
    for child in el:
        tag = local(child)
        if not tag or tag in skip or not kept(child):
            continue
        out.extend(lines_of(child, depth))
        if child.tail and child.tail.strip():
            out.append(norm(child.tail))
    return out


def para(el, depth=0):
    """A <p>: inline runs, with its display maths and lists taken out as blocks."""
    out, run = [], [el.text or ""]

    def flush():
        s = norm("".join(run))
        if s:
            out.append(s)
        run.clear()
    for child in el:
        tag = local(child)
        if not tag or not kept(child):
            run.append(child.tail or "")
            continue
        if tag == "title":
            run.append(child.tail or "")
            continue
        if tag in ("p", "md", "mdn", "me", "men", "ol", "ul", "dl", "sidebyside", "image", "figure", "tabular", "table", "cd", "pre", "sage", "interactive", "blockquote", "question", "definition", "example", "theorem", "proposition", "observation", "remark", "note", "assemblage", "activity", "exercise"):
            flush()
            out.append("")
            out.extend(lines_of(child, depth))
            out.append("")
            run.append(child.tail or "")
        else:
            run.append(inline_el(child))
            run.append(child.tail or "")
    flush()
    return out


def display(el, depth=0):
    rows = [r for r in el if local(r) == "mrow"]
    if rows:
        body = " \\\\ ".join(math(inline(r, True)) for r in rows)
        if len(rows) > 1 or el.get("number") == "yes":
            body = "\\begin{aligned} " + body + " \\end{aligned}"
    else:
        body = math(el.text or "")
    return [f"$$ {body} $$"]


def marker_of(el, depth):
    m = (el.get("marker") or "").strip()
    if not m:
        m = ["1.", "a.", "i."][min(depth, 2)]
    return m


def item_label(m, i):
    if m.startswith("a"):
        return chr(97 + i) + ")"
    if m.startswith("A"):
        return chr(65 + i) + ")"
    if m.startswith("i"):
        return f"({roman(i + 1)})"
    if m.startswith("I"):
        return f"({roman(i + 1).upper()})"
    return f"{i + 1}."


def roman(n):
    out = ""
    for v, r in ((10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i")):
        while n >= v:
            out += r
            n -= v
    return out


def listing(el, depth=0):
    tag = local(el)
    m = marker_of(el, depth) if tag == "ol" else ("-" if tag == "ul" else "dl")
    out, i = [], 0
    for li in el:
        if local(li) != "li" or not kept(li):
            continue
        if tag == "dl":
            label = "- **" + text_of(li.find("title")) + "**:"
        elif tag == "ul":
            label = "-"
        else:
            label = item_label(m, i)
        i += 1
        body = li_lines(li, depth + 1)
        if not body:
            out.append(label)
            continue
        out.append(f"{label} {body[0]}")
        out.extend("    " + b if b else "" for b in body[1:])
    return out


def li_lines(li, depth):
    return [l for l in para(li, depth)]


def block_with_title(el, depth=0):
    """A numbered block (definition, example, theorem …) or an assemblage."""
    tag = local(el)
    kind = BLOCK_TAG.get(tag, tag)
    idd = el.get("ula-id") or el.get(XMLNS + "id") or ""
    title = text_of(el.find("title"))
    number = el.get("number", "")
    head = f":::{tag} {{{kind}:{idd}}}"
    if number:
        head += f" {KIND_WORD.get(tag, tag.capitalize())} {number}"
    if title:
        head += f" ({title})" if number else f" {title}"
    out = [head]
    out.extend(labelled_parts(el, depth, skip=("title",)))
    out.append(":::")
    proof = None
    return out


def labelled_parts(el, depth, skip=()):
    """statement/introduction/conclusion run in, hint/answer/solution under their headings."""
    out = []
    parts = {"hint": [], "answer": [], "solution": []}
    tasks = [t for t in el if local(t) == "task" and kept(t)]
    if el.text and el.text.strip():
        out.append(norm(el.text))
    for child in el:
        tag = local(child)
        if not tag or tag in skip or not kept(child):
            continue
        if tag in parts:
            parts[tag].extend(lines_of(child, depth))
        elif tag == "task":
            continue
        elif tag in ("statement", "introduction", "conclusion"):
            if tag == "statement" and tasks:
                out.append("PROBLEM:")
            out.extend(children(child, depth))
        elif tag == "proof":
            out.append(":::proof")
            out.extend(children(child, depth))
            out.append(":::")
        else:
            out.extend(lines_of(child, depth))
    if tasks:
        if "PROBLEM:" not in out:
            out.append("PROBLEM:")
        tp = {"hint": [], "answer": [], "solution": []}
        for i, task in enumerate(tasks):
            label = chr(97 + i) + ")"
            body = []
            subtasks = [t for t in task if local(t) == "task" and kept(t)]
            for child in task:
                tag = local(child)
                if not tag or not kept(child):
                    continue
                if tag in tp:
                    lines = lines_of(child, depth + 1)
                    if lines:
                        tp[tag].append(f"{label} {lines[0]}")
                        tp[tag].extend("    " + l if l else "" for l in lines[1:])
                elif tag == "task":
                    continue
                elif tag in ("statement", "introduction", "conclusion", "title"):
                    if tag == "title":
                        body.append("**" + text_of(child) + "**")
                    else:
                        body.extend(children(child, depth + 1))
                else:
                    body.extend(lines_of(child, depth + 1))
            if subtasks:
                for j, sub in enumerate(subtasks):
                    sl = f"({roman(j + 1)})"
                    sb, sp = [], {"hint": [], "answer": [], "solution": []}
                    for child in sub:
                        tag = local(child)
                        if not tag or not kept(child):
                            continue
                        if tag in sp:
                            lines = lines_of(child, depth + 2)
                            if lines:
                                sp[tag].append(f"{sl} {lines[0]}")
                                sp[tag].extend("    " + l if l else "" for l in lines[1:])
                        elif tag in ("statement", "introduction", "conclusion"):
                            sb.extend(children(child, depth + 2))
                        else:
                            sb.extend(lines_of(child, depth + 2))
                    if sb:
                        body.append(f"{sl} {sb[0]}")
                        body.extend("    " + l if l else "" for l in sb[1:])
                    for k in sp:
                        if sp[k]:
                            if not tp[k] or not tp[k][-1].startswith(label):
                                tp[k].append(f"{label}")
                            tp[k].extend("    " + l if l else "" for l in sp[k])
            if body:
                out.append(f"{label} {body[0]}")
                out.extend("    " + l if l else "" for l in body[1:])
            else:
                out.append(label)
        for k in ("hint", "answer", "solution"):
            parts[k].extend(tp[k])
    for k in ("hint", "answer", "solution"):
        if parts[k]:
            out.append(k.upper() + ":")
            out.extend(parts[k])
    return out


def exercise(el, depth=0):
    number = el.get("number", "")
    idd = el.get("ula-id", "")
    answered = "yes" if any(local(c) in ("answer", "solution") and kept(c) for c in el) else "no"
    head = f":::exercise {{{idd}}} number={number} answered={answered} src={file_of(el)}:{el.sourceline}"
    if el.get("inline") == "yes":
        head += " inline=yes"
    xid = el.get(XMLNS + "id")
    if xid:
        head += f" label={xid}"
    title = text_of(el.find("title"))
    if title:
        head += f" title={json.dumps(title)}"
    out = [head, "PROBLEM:"]
    body = labelled_parts(el, depth, skip=("title",))
    if body and body[0] == "PROBLEM:":
        body = body[1:]
    out.extend(body)
    out.append(":::")
    return out


def exercises(el, depth=0):
    out = [f"## {el.get('number', '')} Exercises".strip()]
    out.append("")
    for child in el:
        tag = local(child)
        if tag == "title" or not tag or not kept(child):
            continue
        if tag == "exercisegroup":
            out.extend(children(child, depth, skip=("title",)))
        else:
            out.extend(lines_of(child, depth))
        out.append("")
    return out


def subsection(el, depth=0):
    xid = el.get(XMLNS + "id")
    head = f"## {el.get('number', '')} {text_of(el.find('title'))}".strip()
    if xid:
        head += f" {{{xid}}}"
    out = [head, ""]
    out.extend(blocks_spaced(el, depth, skip=("title",)))
    return out


def paragraphs(el, depth=0):
    out = [f"### {text_of(el.find('title'))}", ""]
    out.extend(blocks_spaced(el, depth, skip=("title",)))
    return out


def blocks_spaced(el, depth=0, skip=()):
    """Block children with a blank line between them."""
    out = []
    for child in el:
        tag = local(child)
        if not tag or tag in skip or not kept(child):
            continue
        lines = lines_of(child, depth)
        if lines:
            out.extend(lines)
            out.append("")
    return out


# ---- figures and images

MEDIA_PLAN = {}      # (chapter dir, media name) -> source path, filled as sections convert
PREFIG = os.environ.get("PREFIG") or shutil.which("prefig")


def image_src(img, chdir, page):
    """Resolve an <image> to its media path, planning the copy or the render."""
    source = img.get("source")
    if source:
        name = os.path.basename(source)
        path = os.path.join(ASSETS, source)
        if not os.path.splitext(name)[1]:
            for ext in (".svg", ".png", ".jpg", ".jpeg"):
                if os.path.exists(path + ext):
                    path, name = path + ext, name + ext
                    break
        if not os.path.exists(path):
            warn(img, f"image {source} not in assets")
        return plan(chdir, name, path, page)
    pf = img.find("{https://prefigure.org}prefigure")
    if pf is None:
        pf = img.find("prefigure")
    if pf is not None:
        inc = pf.find(XI)
        if inc is None:
            warn(img, "prefigure without an include")
            return "MISSING"
        href = inc.get("href")
        base = os.path.dirname(os.path.join(SRC, file_of(img)))
        xml = os.path.normpath(os.path.join(base, href))
        if not os.path.exists(xml):
            xml = os.path.normpath(os.path.join(XML, href))
        name = os.path.splitext(os.path.basename(href))[0]
        svg = os.path.join(ASSETS, "images", name + ".svg")
        if os.path.exists(svg):
            return plan(chdir, name + ".svg", svg, page)
        return plan(chdir, name + ".svg", ("prefig", xml), page)
    inter = img.find("interactive")
    warn(img, "image with no source")
    return "MISSING"


def plan(chdir, name, path, page):
    key = (chdir, name)
    if key in MEDIA_PLAN and MEDIA_PLAN[key] != path:
        # another picture of the same name in this chapter: name it by its page
        name = f"{page.replace('.', '-')}-{name}"
        key = (chdir, name)
    MEDIA_PLAN[key] = path
    return f"{MEDIA}/{chdir}/{name}"


def alt_of(img):
    sd = text_of(img.find("shortdescription"))
    if sd:
        return sd
    d = img.find("description")
    if d is not None:
        return norm(" ".join(lines_of(c) and " ".join(lines_of(c)) for c in d if local(c)))
    return ""


def figure(el, depth=0):
    page = current_page(el)
    chdir = chapter_dir(page)
    idd = el.get("ula-id", "")
    number = el.get("number", "")
    caption = text_of(el.find("caption"))
    images = [i for i in el.iter() if local(i) == "image" and kept(i)]
    inter = [i for i in el.iter() if local(i) == "interactive" and kept(i)]
    out = []
    if not images and inter:
        it = inter[0]
        prev = it.get("preview")
        src = plan(chdir, os.path.basename(prev), os.path.join(ASSETS, prev), page) if prev else "MISSING"
        out.append(f"> FIGURE {{fig:{idd}}} number={number} src={src}")
        out.append(f"> alt: {alt_of(it)}")
        out.append(f"> interactive: {' '.join((it.get('source') or '').split())}")
        out.append(f"> caption: {caption}")
        return out
    if not images:
        tab = el.find(".//tabular")
        if tab is not None:
            return table(el, depth)
        warn(el, "figure without an image")
        return [f"> FIGURE {{fig:{idd}}} number={number} src=MISSING", f"> caption: {caption}"]
    first = images[0]
    out.append(f"> FIGURE {{fig:{idd}}} number={number} src={image_src(first, chdir, page)}")
    out.append(f"> alt: {alt_of(first)}")
    w = first.get("width")
    if w and len(images) == 1:
        out.append(f"> width: {w}")
    out.append(f"> caption: {caption}")
    if len(images) > 1:
        for img in images:
            out.append(f"> subfigure src={image_src(img, chdir, page)} alt: {alt_of(img)}")
    return out


def image(el, depth=0):
    page = current_page(el)
    chdir = chapter_dir(page)
    src = image_src(el, chdir, page)
    name = os.path.splitext(os.path.basename(src))[0]
    out = [f"> IMAGE {{img:{name}}} src={src}"]
    alt = alt_of(el)
    if alt:
        out.append(f"> alt: {alt}")
    w = el.get("width")
    if w:
        out.append(f"> width: {w}")
    return out


def interactive(el, depth=0):
    page = current_page(el)
    chdir = chapter_dir(page)
    prev = el.get("preview")
    src = plan(chdir, os.path.basename(prev), os.path.join(ASSETS, prev), page) if prev else "MISSING"
    idd = el.get(XMLNS + "id") or "interactive"
    out = [f"> INTERACTIVE {{int:{idd}}} src={src} scripts={' '.join((el.get('source') or '').split())}"]
    alt = alt_of(el)
    if alt:
        out.append(f"> alt: {alt}")
    return out


def table(el, depth=0):
    idd = el.get("ula-id", "")
    number = el.get("number", "")
    caption = text_of(el.find("caption")) or text_of(el.find("title"))
    tab = el.find(".//tabular")
    out = []
    if tab is None:
        warn(el, "table without a tabular")
        return out
    rows = [r for r in tab if local(r) == "row"]
    cols = max((len([c for c in r if local(c) == "cell"]) for r in rows), default=0)
    out.append(f"> TABLE {{tab:{idd}}} number={number} cols={cols}")
    if caption:
        out.append(f"> caption: {caption}")
    out.extend(tabular(tab, depth))
    return out


def tabular(el, depth=0):
    rows = [r for r in el if local(r) == "row"]
    out = []
    cells = []
    for r in rows:
        cells.append([norm(" ".join(para(c))).replace("|", "\\vert ") for c in r if local(c) == "cell"])
    if not cells:
        return out
    header = cells[0] if rows[0].get("header") in ("yes", "vertical") else None
    width = max(len(c) for c in cells)
    if header:
        body = cells[1:]
    else:
        header = [""] * width
        body = cells
    out.append("| " + " | ".join(header + [""] * (width - len(header))) + " |")
    out.append("|" + " --- |" * width)
    for row in body:
        out.append("| " + " | ".join(row + [""] * (width - len(row))) + " |")
    return out


def sidebyside(el, depth=0):
    out = []
    for child in el:
        tag = local(child)
        if not tag or not kept(child) or tag == "title":
            continue
        out.extend(lines_of(child, depth))
        out.append("")
    return out


def sage(el, depth=0):
    lang = el.get("language") or "sage"
    inp = el.findtext("input") or ""
    outp = el.findtext("output")
    out = [f":::sage {lang}" if lang != "sage" else ":::sage", "```" + lang]
    out.extend(line.rstrip() for line in inp.strip("\n").split("\n"))
    out.append("```")
    if outp is not None:
        out.append("OUTPUT:")
        out.append("```")
        out.extend(line.rstrip() for line in outp.strip("\n").split("\n"))
        out.append("```")
    out.append(":::")
    return out


def code_display(el, depth=0):
    lines = [norm(inline(c)) for c in el if local(c) == "cline"]
    if not lines:
        lines = (el.text or "").strip("\n").split("\n")
    return ["```"] + lines + ["```"]


def blockquote(el, depth=0):
    return ["> " + l for l in children(el, depth, skip=("attribution",))] + (
        ["> — " + text_of(el.find("attribution"))] if el.find("attribution") is not None else [])


def passthrough(el, depth=0):
    return children(el, depth, skip=("title",))


BLOCKS = {
    "p": para, "md": display, "mdn": display, "me": display, "men": display,
    "ol": listing, "ul": listing, "dl": listing,
    "definition": block_with_title, "example": block_with_title, "theorem": block_with_title,
    "proposition": block_with_title, "lemma": block_with_title, "corollary": block_with_title,
    "observation": block_with_title, "remark": block_with_title, "note": block_with_title,
    "insight": block_with_title, "warning": block_with_title, "convention": block_with_title,
    "principle": block_with_title, "question": block_with_title, "activity": block_with_title, "exploration": block_with_title,
    "project": block_with_title, "investigation": block_with_title, "assemblage": block_with_title,
    "exercise": exercise, "exercises": exercises, "subsection": subsection, "paragraphs": paragraphs,
    "figure": figure, "image": image, "interactive": interactive, "table": table, "tabular": tabular,
    "sidebyside": sidebyside, "sbsgroup": sidebyside, "sage": sage, "cd": code_display, "pre": code_display,
    "blockquote": blockquote, "introduction": passthrough, "conclusion": passthrough,
    "statement": passthrough, "proof": lambda el, d=0: [":::proof"] + children(el, d) + [":::"],
    "hint": passthrough, "answer": passthrough, "solution": passthrough,
    "aside": lambda el, d=0: [":::aside " + text_of(el.find("title"))] + children(el, d, skip=("title",)) + [":::"],
    "title": lambda el, d=0: [], "caption": lambda el, d=0: [], "idx": lambda el, d=0: [],
    "notation": lambda el, d=0: [], "index": lambda el, d=0: [], "response": lambda el, d=0: [],
    "query": lambda el, d=0: [], "instructions": lambda el, d=0: [],
}


def chapter_dir(page):
    if page == "intro":
        return "intro"
    n = page.split(".")[0]
    return f"ch{int(n):02d}"


# ------------------------------------------------------------------ pages

def section_md(book, page):
    sec = book.sections[page]
    title = text_of(sec.find("title"))
    xid = sec.get(XMLNS + "id") or ""
    out = [f"# {page} {title} {{{xid}}}".rstrip(), ""]
    out.extend(blocks_spaced(sec, 0, skip=("title",)))
    return finish(out)


def chapter_intro_md(book, n, intro):
    ch = [c for k, c in book.chapters if k == n][0]
    title = text_of(ch.find("title"))
    xid = ch.get(XMLNS + "id") or f"chap{n}"
    out = [f"# Chapter {n} {title} {{{xid}}}", ""]
    out.extend(blocks_spaced(intro, 0, skip=("title",)))
    return finish(out)


def book_intro_md(book):
    front = book.front
    out = []
    prefaces = [p for p in front if local(p) == "preface"]
    for p in prefaces:
        if not kept(p):
            continue
        title = text_of(p.find("title"))
        if "print" in title.lower():
            continue
        out.append(f"# {title} {{{p.get(XMLNS + 'id') or 'preface'}}}")
        out.append("")
        out.extend(blocks_spaced(p, 0, skip=("title",)))
    ack = front.find("acknowledgement")
    if ack is not None:
        out.append("## Acknowledgements")
        out.append("")
        out.extend(blocks_spaced(ack, 0, skip=("title",)))
    return finish(out)


def finish(lines):
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"
    return text


# ------------------------------------------------------------------ media

def copy_media(outdir):
    for (chdir, name), src in sorted(MEDIA_PLAN.items()):
        dest = os.path.join(outdir, "media", chdir, name)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if isinstance(src, tuple):
            render_prefig(src[1], dest)
        elif os.path.exists(src):
            if not os.path.exists(dest) or os.path.getmtime(src) > os.path.getmtime(dest):
                shutil.copyfile(src, dest)
        else:
            PROBLEMS.append(f"media: {src} missing for {chdir}/{name}")


def render_prefig(xml, dest):
    if os.path.exists(dest) and os.path.getmtime(dest) > os.path.getmtime(xml):
        return
    if not PREFIG:
        PROBLEMS.append(f"media: no prefig on PATH to render {os.path.relpath(xml, SRC)} -> {dest}")
        return
    tmpdir = os.path.join(os.path.dirname(dest), ".prefig")
    os.makedirs(tmpdir, exist_ok=True)
    name = os.path.splitext(os.path.basename(xml))[0]
    src = os.path.join(tmpdir, name + ".xml")
    shutil.copyfile(xml, src)
    r = subprocess.run([PREFIG, "build", "-f", "svg", src], cwd=tmpdir, capture_output=True, text=True)
    made = os.path.join(tmpdir, "output", name + ".svg")
    if r.returncode != 0 or not os.path.exists(made):
        PROBLEMS.append(f"media: prefig failed on {os.path.relpath(xml, SRC)}: {(r.stderr or r.stdout).strip()[-300:]}")
        return
    shutil.copyfile(made, dest)
    shutil.rmtree(tmpdir, ignore_errors=True)


# ------------------------------------------------------------------ index

def index(book, outdir):
    chapters = []
    toc = ["# Understanding Linear Algebra: table of contents", "",
           "David Austin, *Understanding Linear Algebra*, 2026 Update (source/ula, the PreTeXt of github.com/davidaustinm/ula). "
           "Each section line gives its number, title, xml:id and folder, then its counts: preview activities, activities, examples, "
           "definitions, theorems and propositions, figures, tables, Sage cells, and end exercises (answered, that is printed with an "
           "answer or a solution). Chapters 2 to 7 open on an introduction of their own, built as `chNN/intro/`; the book's preface "
           "is `intro/`. Its back matter is a Sage reference (Appendix A) and the index, neither built as a page.", ""]
    for n, ch in book.chapters:
        title = text_of(ch.find("title"))
        secs = [s for s in ch if local(s) == "section"]
        chapter = {"number": str(n), "title": title, "id": ch.get(XMLNS + "id"), "file": f"src/chap{n}.xml",
                   "dir": f"ch{n:02d}", "intro": ch.find("introduction") is not None, "sections": []}
        toc.append(f"- Chapter {n} {title} (`{chapter['id']}`, chap{n}.xml){', introduction' if chapter['intro'] else ''}")
        for sec in secs:
            page = sec.get("page")
            c = counts(sec)
            row = {"id": page, "title": text_of(sec.find("title")), "label": sec.get(XMLNS + "id"),
                   "file": file_of(sec), "folder": f"ch{n:02d}/{page}", "counts": c}
            chapter["sections"].append(row)
            toc.append(f"  - {page} {row['title']} (`{row['label']}`, {row['folder']}): {c['previews']} preview, {c['activities']} activities, "
                       f"{c['examples']} examples, {c['definitions']} definitions, {c['theorems']} theorems, {c['figures']} figures, "
                       f"{c['tables']} tables, {c['sage']} Sage cells, {c['exercises']} exercises ({c['answered']} answered)")
        chapters.append(chapter)
    data = {"book": "Understanding Linear Algebra", "id": "understanding-linear-algebra", "source": "source/ula",
            "edition": "2026 Update",
            "numbering": "sections N.M; subsections N.M.k; figures, tables, definitions, examples, theorems, propositions and observations "
                         "share one counter N.M.k per section; activities and preview activities another; exercises N.M.k within Exercises",
            "chapters": chapters}
    with open(os.path.join(outdir, "modules.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
        f.write("\n")
    with open(os.path.join(outdir, "toc.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(toc) + "\n")


def counts(sec):
    def n(tag):
        return sum(1 for e in sec.iter() if local(e) == tag and kept(e) and all(kept(a) for a in e.iterancestors()))
    exs = [e for e in sec.iter() if local(e) == "exercise" and kept(e) and local(e.getparent()) in ("exercises", "exercisegroup")]
    return {"previews": n("exploration"), "activities": n("activity"), "examples": n("example"), "definitions": n("definition"),
            "theorems": n("theorem") + n("proposition") + n("lemma") + n("corollary"), "observations": n("observation"),
            "figures": n("figure"), "tables": n("table"), "sage": n("sage"), "interactives": n("interactive"),
            "exercises": len(exs), "answered": sum(1 for e in exs if any(local(c) in ("answer", "solution") for c in e)),
            "footnotes": n("fn"), "index": n("idx") + n("term")}


# ------------------------------------------------------------------ main

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def main(argv):
    global BOOKREF
    outdir = BOOK
    if "--out" in argv:
        i = argv.index("--out")
        outdir = argv[i + 1]
        del argv[i:i + 2]
    book = Book()
    BOOKREF = book
    want = argv
    if "--index" in want:
        index(book, outdir)
        want = [w for w in want if w != "--index"]
    pages = []
    for w in want:
        if w == "--all":
            pages = [p for p, *_ in book.pages] + ["intro"]
        elif w == "--intro":
            pages.append("intro")
        elif re.fullmatch(r"\d+", w):
            pages.extend(p for p, n, *_ in book.pages if n == int(w))
        elif re.fullmatch(r"\d+\.\d+", w) or re.fullmatch(r"\d+\.intro", w):
            pages.append(w)
        else:
            print(f"convert: what is {w}?", file=sys.stderr)
            return 2
    for page in pages:
        if page == "intro":
            write(os.path.join(outdir, "intro", "source.md"), book_intro_md(book))
        elif page.endswith(".intro"):
            n = int(page.split(".")[0])
            intro = [e for p, k, e, t in book.pages if p == page][0]
            write(os.path.join(outdir, f"ch{n:02d}", "intro", "source.md"), chapter_intro_md(book, n, intro))
        else:
            if page not in book.sections:
                print(f"convert: no section {page}", file=sys.stderr)
                return 2
            write(os.path.join(outdir, chapter_dir(page), page, "source.md"), section_md(book, page))
    copy_media(outdir)
    for p in sorted(set(PROBLEMS)):
        print(p, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
