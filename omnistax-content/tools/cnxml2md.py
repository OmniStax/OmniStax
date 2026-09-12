#!/usr/bin/env python3
"""Convert an OpenStax CNXML module to markdown with LaTeX math.

Usage: cnxml2md.py path/to/index.cnxml > out.md

Shared by every book that comes from OpenStax as CNXML (College Physics 2e,
Chemistry 2e). Lossy but faithful to prose order. Tags are preserved as
markers where OmniStax needs them later, and the markers are the same for
every book; a book's own RULES.md says which of them its source uses.

Markers, in the order a module prints them:

  # Title                        the module title.
  ## Learning Objectives         the module's md:abstract, where it has one
                                 (Chemistry keeps its objectives there; Physics
                                 keeps them in a content section, which comes
                                 through as an ordinary header).
  ## Heading                     a <section>; a section that carries a class
                                 ends its header with {section:<class>}, so the
                                 summary, key-equations and exercises sections
                                 of Chemistry can be found: e.g.
                                 "## Key Concepts and Summary {section:summary}".
  $$ … $$  {eq:id}               a display equation; an <equation> that mixes
                                 prose and several maths is one line of text
                                 with the same marker.
  {term:…}                       a term the book defines (bolds) here.
  {index:…}                      a <term class="no-emphasis">: an index entry
                                 the book does not bold and rarely glosses.
  [ref:target]                   a cross reference to an id in this module;
                                 [ref:target](module:mNNNNN) when it points
                                 into another module; [text](module:mNNNNN)
                                 for a plain link to another module.
  > FIGURE {fig:id} src=… [class=splash|scaled-down]
  > alt: …  > width: …  > caption: …
                                 a numbered figure; `class` is the book's own
                                 (splash is a chapter opener; scaled-down is a
                                 print hint) and the line is absent otherwise.
  > subfigure src=… caption: …   one part of a figure with subfigures.
  > IMAGE {img:id} src=… [width=…] [class=…]
  > alt: …                       a <media> outside any figure: an unnumbered
                                 image the prose, an example, an exercise or a
                                 table cell shows. In a table cell it is inline:
                                 ![alt](src).
  > TABLE {tab:id} cols=N [class=…] [irregular]
  > title: …                     the title row the book prints over the table
                                 (a single entry spanning every column at the
                                 top of thead), where there is one.
  > summary: …                   the book's alt text for the table.
  | a | b |                      then the rows. A regular table is a markdown
  | --- | --- |                  table: the header row is the last row of thead
                                 (an empty header row means the book prints
                                 none), then the separator, then the body. An
                                 irregular table (a spanning or multi-row cell
                                 in the body, or a cell holding paragraphs, a
                                 list or a figure) says `irregular`, has no
                                 separator line, and prefixes a spanning cell
                                 with {span=N} and a cell that reaches down
                                 with {rows=N}; paragraphs inside a cell are
                                 joined with <br>.
  :::note [class] Title … :::    a <note>, with the book's class ("chemistry
                                 everyday-life", "interactive"); an untitled
                                 class whose title is "Answer:" is [answer],
                                 which is how Chemistry keys the Check Your
                                 Learning question that precedes it inside an
                                 example.
  :::example {ex:id} Title … ::: a worked example. Chemistry titles the parts
                                 of an example with paragraph titles, which
                                 come through in bold: **Solution**,
                                 **Check Your Learning**.
  :::exercise {id} type=… Title  an exercise, PROBLEM: and SOLUTION: inside.
  … :::                          Chemistry's exercises carry no type; the
                                 {section:exercises} header above them says
                                 what they are.
  - {def} **term**: meaning      a glossary entry.
  ^[…]                           a footnote, inline where the book anchors it.
  <sub>…</sub> <sup>…</sup>      subscripts and superscripts in prose (the
                                 formulas of Chemistry: H<sub>2</sub>O), kept as
                                 the HTML the page will carry.
  <u>…</u>                       underlined text; *…* and **…** for italics
                                 and bold.
  a hard line break              a <newline> in a paragraph, list item or cell
                                 stays a line break (a cell writes it <br>).

MathML becomes KaTeX LaTeX. The app does not load mhchem, so a chemical
equation is plain LaTeX: ⟶ is \\longrightarrow, ⇌ is \\rightleftharpoons,
state labels and formulas are \\text{…}, charges are superscripts, a cancelled
unit (menclose horizontalstrike) is \\cancel{…}, a cell diagram's bars are | and
\\|, and an aligned block (mtable) is an array whose columns follow the
book's columnalign. Text inside \\text{} has %, $, #, _, & and braces escaped.
Anything the converter cannot place is reported on stderr with the module
path, so a run over a book ends with a list of what to look at.
"""
import sys, re
import xml.etree.ElementTree as ET

NS = {"c": "http://cnx.rice.edu/cnxml", "m": "http://www.w3.org/1998/Math/MathML",
      "md": "http://cnx.rice.edu/mdml"}
M = "{http://www.w3.org/1998/Math/MathML}"
C = "{http://cnx.rice.edu/cnxml}"
MD = "{http://cnx.rice.edu/mdml}"

SOURCE = ""          # the path being converted, for warnings
WARNED = set()

def warn(msg):
    if (SOURCE, msg) not in WARNED:
        WARNED.add((SOURCE, msg))
        print(f"{SOURCE}: {msg}", file=sys.stderr)

def tag(e):
    return e.tag.split("}")[-1]

# ---------- MathML -> LaTeX ----------
MI = {"Δ": r"\Delta ", "π": r"\pi ", "θ": r"\theta ", "ω": r"\omega ", "α": r"\alpha ",
      "ℳ": r"\mathcal{M}", "∞": r"\infty ", "ħ": r"\hbar ", "ℏ": r"\hbar ", "%": r"\%"}
MO = {"−": "-", "–": "-", "×": r"\times ", "·": r"\cdot ", "±": r"\pm ", "≈": r"\approx ",
      "→": r"\to ", "′": "'", "∞": r"\infty ", "∣": "|",
      # the chemistry vocabulary
      "⟶": r"\longrightarrow ", "⟵": r"\longleftarrow ", "⇌": r"\rightleftharpoons ",
      "⇋": r"\leftrightharpoons ", "⇄": r"\rightleftarrows ", "│": r"\,|\,", "║": r"\,\|\,",
      "∑": r"\sum ", "≡": r"\equiv ", "≪": r"\ll ", "≫": r"\gg ", "<<": r"\ll ", "∝": r"\propto ",
      "≥": r"\ge ", "≤": r"\le ", "…": r"\ldots ", ". . .": r"\ldots ", "△": r"\triangle ",
      "•": r"\bullet ", "~": r"\sim ", "{": r"\{", "}": r"\}", "%": r"\%", "#": r"\#", "_": r"\_",
      "^": r"\wedge ", "∘": r"\circ ", "—": "-", "ν": r"\nu ", "°": r"{}^{\circ}",
      "°C": r"{}^{\circ}\text{C}", "_____": r"\_\_\_\_\_", "____": r"\_\_\_\_"}

GREEK = {"α": r"\alpha", "β": r"\beta", "γ": r"\gamma", "δ": r"\delta", "ε": r"\varepsilon", "θ": r"\theta",
         "λ": r"\lambda", "μ": r"\mu", "ν": r"\nu", "π": r"\pi", "ρ": r"\rho", "σ": r"\sigma", "τ": r"\tau",
         "φ": r"\phi", "χ": r"\chi", "ψ": r"\psi", "ω": r"\omega", "Σ": r"\Sigma", "Π": r"\Pi", "ℳ": r"\mathcal{M}"}

def mtext_escape(s):
    return re.sub(r"([%$#_&{}])", r"\\\1", s)

def mtext(s):
    """\\text{…} for a run of text; a Greek letter KaTeX cannot set in text mode
    (Δ it can) is written as its math symbol between the text runs."""
    s = s.replace("\u200b", "")
    parts = re.split("([" + "".join(GREEK) + "])", s)
    out = ""
    for i, part in enumerate(parts):
        if i % 2:
            out += GREEK[part] + " "
        elif part:
            out += r"\text{" + mtext_escape(part) + "}"
    return out

def mspace(e):
    w = e.get("width", "")
    m = re.fullmatch(r"([0-9.]+)\s*em", w)
    if m and float(m.group(1)) > 1.0:
        return r"\hspace{" + m.group(1) + "em}"
    return r"\;"

def align_of(e, default):
    a = e.get("columnalign")
    return a[0] if a in ("left", "right", "center") else default

def mml(e):
    t = tag(e)
    kids = list(e)
    txt = (e.text or "")
    if t in ("math", "mrow", "mstyle", "semantics"):
        return "".join(mml(k) for k in kids)
    if t == "mi":
        s = txt.strip()
        return MI.get(s, s)
    if t == "mn":
        s = txt.strip()
        return {"Δ": r"\Delta "}.get(s, s)
    if t == "mo":
        s = txt.strip()
        if s in MO:
            return MO[s]
        # a charge or a signed group written as one operator: "2−", "−(", "−[("
        s2 = s.replace("−", "-").replace("–", "-")
        if s2 != s and re.fullmatch(r"[-0-9(\[]+", s2):
            return s2
        return s
    if t == "mtext":
        s = txt.replace("\n", " ")
        return mtext(s) if s.strip() else " "
    if t == "mspace":
        return mspace(e)
    if t == "mfrac":
        return r"\frac{" + mml(kids[0]) + "}{" + mml(kids[1]) + "}"
    if t == "msub":
        return "{" + mml(kids[0]) + "}_{" + mml(kids[1]) + "}"
    if t == "msup":
        return "{" + mml(kids[0]) + "}^{" + mml(kids[1]) + "}"
    if t == "msubsup":
        return "{" + mml(kids[0]) + "}_{" + mml(kids[1]) + "}^{" + mml(kids[2]) + "}"
    if t == "mover":
        acc = ((kids[1].text or "").strip() if tag(kids[1]) == "mo" else mml(kids[1]).strip())
        base = mml(kids[0])
        if acc in ("-", "¯", "‾", "―"):
            return r"\bar{" + base + "}"
        if acc in ("→", "⃗"):
            return r"\vec{" + base + "}"
        return r"\overset{" + mml(kids[1]) + "}{" + base + "}"
    if t == "munder":
        acc = ((kids[1].text or "").strip() if tag(kids[1]) == "mo" else mml(kids[1]).strip())
        if acc in ("¯", "_", "‾", "―", "̲"):
            return r"\underline{" + mml(kids[0]) + "}"
        return r"\underset{" + mml(kids[1]) + "}{" + mml(kids[0]) + "}"
    if t == "munderover":
        base = mml(kids[0]).strip()
        lo, hi = mml(kids[1]), mml(kids[2])
        if base in (r"\sum", r"\prod", r"\int"):
            return base + "_{" + lo + "}^{" + hi + "} "
        return r"\overset{" + hi + r"}{\underset{" + lo + "}{" + base + "}}"
    if t == "msqrt":
        return r"\sqrt{" + "".join(mml(k) for k in kids) + "}"
    if t == "mroot":
        return r"\sqrt[" + mml(kids[1]) + "]{" + mml(kids[0]) + "}"
    if t == "mfenced":
        return e.get("open", "(") + ",".join(mml(k) for k in kids) + e.get("close", ")")
    if t == "menclose":
        body = "".join(mml(k) for k in kids)
        if e.get("notation", "") in ("horizontalstrike", "updiagonalstrike", "downdiagonalstrike"):
            return r"\cancel{" + body + "}"
        warn(f"menclose notation {e.get('notation')!r} kept as plain")
        return body
    if t == "mtable":
        rows = [r for r in kids if tag(r) == "mtr"]
        ncol = max((len(list(r)) for r in rows), default=1)
        default = align_of(e, "l")
        # the column alignment the book gives the cells of the first full row
        cols = ""
        full = next((r for r in rows if len(list(r)) == ncol), None)
        for i in range(ncol):
            cell = list(full)[i] if full is not None else None
            cols += align_of(cell, default) if cell is not None else default
        body = r" \\ ".join(" & ".join(mml(c) for c in r) for r in rows)
        return r"\begin{array}{" + cols + "}" + body + r"\end{array}"
    if t in ("mtr", "mtd"):
        return "".join(mml(k) for k in kids)
    if t == "mphantom":
        return ""
    if t == "mlabeledtr":
        return "".join(mml(k) for k in kids[1:])
    warn(f"MathML <{t}> flattened")
    return "".join(mml(k) for k in kids)

def latex(e):
    s = mml(e)
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("{ ", "{").replace(" }", "}")
    return s

# ---------- CNXML -> markdown ----------
def image_line(media):
    """A <media> outside any figure, as a marked block."""
    img = media.find(C + "image")
    src = img.get("src", "") if img is not None else ""
    width = img.get("width") if img is not None else None
    cls = media.get("class") or (img.get("class") if img is not None else None)
    parts = [f"> IMAGE {{img:{media.get('id','')}}} src={src}"]
    if width:
        parts.append(f"width={width}")
    if cls:
        parts.append(f"class={cls}")
    return "\n" + " ".join(parts) + f"\n> alt: {media.get('alt','')}\n"

def image_inline(media):
    img = media.find(C + "image")
    src = img.get("src", "") if img is not None else ""
    return f"![{media.get('alt','')}]({src})"

def inline(e, cell=False):
    """Render element's mixed content inline. In a table cell (cell=True)
    block children are joined with <br> and images are inline."""
    out = [e.text or ""]
    for k in e:
        t = tag(k)
        if k.tag == M + "math":
            # two maths that touch would read as $$…$$, a display equation, to the app's math sweep
            if "".join(out).endswith("$"):
                out.append(" ")
            out.append("$" + latex(k) + "$")
        elif t == "emphasis":
            eff = k.get("effect", "italics")
            if eff == "underline":
                out.append("<u>" + inline(k, cell).strip() + "</u>")
            else:
                mark = "**" if eff == "bold" else "*"
                out.append(mark + inline(k, cell).strip() + mark)
        elif t == "term":
            marker = "index" if k.get("class") == "no-emphasis" else "term"
            out.append("{" + marker + ":" + inline(k, cell).strip() + "}")
        elif t == "link":
            text = inline(k, cell).strip()
            if k.get("document") and k.get("target-id"):
                out.append("[ref:" + k.get("target-id") + "](module:" + k.get("document") + ")" + text)
            elif k.get("document"):
                out.append("[" + (text or k.get("document")) + "](module:" + k.get("document") + ")")
            elif k.get("target-id"):
                out.append("[ref:" + k.get("target-id") + "]" + text)
            elif k.get("url"):
                out.append("[" + text + "](" + k.get("url") + ")")
            else:
                out.append(text)
        elif t == "sub":
            out.append("<sub>" + inline(k, cell).strip() + "</sub>")
        elif t == "sup":
            out.append("<sup>" + inline(k, cell).strip() + "</sup>")
        elif t == "newline":
            out.append("<br>" if cell else "\x04")
        elif t == "space":
            out.append(" " * int(k.get("count", "1") or 1))
        elif t == "quote":
            out.append('"' + inline(k, cell).strip() + '"')
        elif t == "foreign":
            out.append(inline(k, cell))
        elif t == "footnote":
            out.append("^[" + inline(k, cell).strip() + "]")
        elif t == "media":
            out.append(image_inline(k) if cell else "\n\x02" + image_line(k) + "\x03\n")
        elif t == "list":
            out.append(("<br>" + inline(k, True)) if cell else "\n\x02\n" + block(k, 0) + "\n\x03\n")
        elif t == "para" and cell:
            body = inline(k, True).strip()
            out.append(("<br>" if "".join(out).strip() else "") + body)
        elif t in ("figure", "note", "equation", "table"):
            # block elements nested inside a para: emit them as blocks, not as inline text.
            # The sentinels keep para() from folding the block's lines into the paragraph.
            out.append("\n\x02" + block(k, 0) + "\x03\n")
        elif t == "title":
            pass
        elif t == "label":
            pass
        else:
            out.append(inline(k, cell))
        out.append(k.tail or "")
    return "".join(out)

INLINE = {"emphasis", "term", "link", "sub", "sup", "newline", "space", "quote", "foreign", "footnote"}

def container(e, depth):
    """The blocks of a container, where a run of bare text and inline children
    (an Answer note with a formula and no paragraph) is one paragraph."""
    lines, run = [], None
    def flush():
        nonlocal run
        if run is not None and (run.text.strip() or len(run)):
            lines.append(block(run, depth))
        run = None
    def take(text):
        nonlocal run
        if text and text.strip():
            if run is None:
                run = ET.Element(C + "para")
                run.text = ""
            if len(run):
                run[-1].tail = (run[-1].tail or "") + text
            else:
                run.text += text
    take(e.text)
    for k in e:
        if tag(k) == "title":
            take(k.tail)
        elif k.tag == M + "math" or tag(k) in INLINE:
            if run is None:
                run = ET.Element(C + "para")
                run.text = ""
            run.append(k)
        else:
            flush()
            lines.append(block(k, depth))
            take(k.tail)
    flush()
    return lines

def para_text(txt):
    """Fold the source's soft line breaks into spaces, outside nested blocks, and keep hard breaks."""
    txt = "".join(seg if i % 2 else re.sub(r"[ \t]*\n[ \t]*", " ", seg)
                  for i, seg in enumerate(re.split(r"\x02|\x03", txt)))
    return re.sub(r"[ \t]*\x04[ \t]*", "\n", txt)

def cell_text(entry):
    s = inline(entry, cell=True).strip()
    s = re.sub(r"\s*\n\s*", " ", s)
    # a bare pipe outside math would end the cell
    return "".join(seg if i % 2 else seg.replace("|", "\\|") for i, seg in enumerate(re.split(r"(\$[^$]*\$)", s))).replace("\\|", "\\|")

def table(e):
    tg = e.find(C + "tgroup")
    colnames = [c.get("colname") for c in tg.findall(C + "colspec")] if tg is not None else []
    thead = tg.find(C + "thead") if tg is not None else None
    tbody = tg.find(C + "tbody") if tg is not None else None
    head_rows = thead.findall(C + "row") if thead is not None else []
    body_rows = tbody.findall(C + "row") if tbody is not None else []
    # the book's cols attribute is wrong now and then (Chemistry's prefix table says 3 and has 4), so the colspecs and the widest row decide
    ncols = max([int(tg.get("cols", "1") or 1) if tg is not None else 1, len(colnames)]
                + [len(r.findall(C + "entry")) for r in head_rows + body_rows])
    title = e.find(C + "title")
    title_text = inline(title).strip() if title is not None else ""

    def span(entry):
        a, b = entry.get("namest"), entry.get("nameend")
        if a and b and a in colnames and b in colnames:
            return colnames.index(b) - colnames.index(a) + 1
        return 1

    # a title row: the first thead row, one entry spanning every column
    if head_rows and ncols > 1:
        first = head_rows[0].findall(C + "entry")
        if len(first) == 1 and span(first[0]) == ncols:
            title_text = title_text or cell_text(first[0])
            head_rows = head_rows[1:]
    if len(head_rows) > 1:
        # more than one header row: the extra ones go to the body, and the table is irregular
        body_rows = head_rows[1:] + body_rows
        head_rows = head_rows[:1]
        extra_head = True
    else:
        extra_head = False

    irregular = extra_head
    for r in body_rows:
        for en in r.findall(C + "entry"):
            if span(en) > 1 or en.get("morerows"):
                irregular = True
            if any(tag(k) in ("para", "list", "figure", "note", "equation", "table") for k in en):
                irregular = True

    def cells(row):
        out = []
        for en in row.findall(C + "entry"):
            pre = ""
            if span(en) > 1:
                pre += f"{{span={span(en)}}} "
            if en.get("morerows"):
                pre += f"{{rows={int(en.get('morerows')) + 1}}} "
            out.append(pre + cell_text(en))
        return "| " + " | ".join(out) + " |"

    head = [f"> TABLE {{tab:{e.get('id','')}}} cols={ncols}"]
    if e.get("class"):
        head[0] += f" class={e.get('class')}"
    if irregular:
        head[0] += " irregular"
    if title_text:
        head.append(f"> title: {title_text}")
    if e.get("summary"):
        head.append(f"> summary: {e.get('summary')}")
    lines = ["\n" + "\n".join(head), ""]
    if irregular:
        for r in head_rows + body_rows:
            lines.append(cells(r))
    else:
        lines.append(cells(head_rows[0]) if head_rows else "| " + " | ".join("" for _ in range(ncols)) + " |")
        lines.append("| " + " | ".join("---" for _ in range(ncols)) + " |")
        for r in body_rows:
            lines.append(cells(r))
    lines.append("")
    return "\n".join(lines)

def block(e, depth):
    t = tag(e)
    lines = []
    if t == "para":
        title = e.find(C + "title")
        if title is not None:
            lines.append("**" + inline(title).strip() + "**")
        txt = para_text(inline(e).strip())
        if txt:
            lines.append(txt)
    elif t == "title":
        return ""
    elif t == "section":
        title = e.find(C + "title")
        h = "#" * min(depth + 2, 6)
        cls = f" {{section:{e.get('class')}}}" if e.get("class") else ""
        lines.append(f"\n{h} {inline(title).strip() if title is not None else ''}{cls}")
        lines.extend(container(e, depth + 1))
    elif t == "equation":
        eid = e.get("id", "")
        maths = e.findall(M + "math")
        # Some solutions put prose and several maths inside one <equation>; that is a line of text, not a display equation.
        mixed = (e.text or "").strip() or len(maths) != 1 or any(k.tag != M + "math" or (k.tail or "").strip() for k in e)
        if mixed:
            lines.append(f"\n{para_text(inline(e).strip())}  {{eq:{eid}}}\n")
        else:
            lines.append(f"\n$$ {latex(maths[0])} $$  {{eq:{eid}}}\n")
    elif t == "figure":
        title = e.find(C + "title")
        media = e.find(C + "media")
        alt = media.get("alt", "") if media is not None else ""
        img = media.find(C + "image") if media is not None else None
        src = img.get("src", "") if img is not None else ""
        # The width the book prints the image at, in pixels of its own column; most figures carry one, and a figure without it is left to its natural size.
        width = img.get("width") if img is not None else None
        width_line = f"\n> width: {width}" if width else ""
        cls = f" class={e.get('class')}" if e.get("class") else ""
        title_line = f"\n> title: {inline(title).strip()}" if title is not None else ""
        cap = e.find(C + "caption")
        lines.append(f"\n> FIGURE {{fig:{e.get('id','')}}} src={src}{cls}{title_line}\n> alt: {alt}{width_line}\n> caption: {inline(cap).strip() if cap is not None else ''}\n")
        for sf in e.findall(C + "subfigure"):
            lines.append(block(sf, depth))
    elif t == "subfigure":
        media = e.find(C + "media")
        img = media.find(C + "image") if media is not None else None
        src = img.get("src", "") if img is not None else ""
        width = img.get("width") if img is not None else None
        width_part = f" width={width}" if width else ""
        cap = e.find(C + "caption")
        lines.append(f"> subfigure src={src}{width_part} caption: {inline(cap).strip() if cap is not None else ''}")
    elif t == "media":
        lines.append(image_line(e))
    elif t == "note":
        title = e.find(C + "title")
        ttl = inline(title).strip() if title is not None else ""
        cls = e.get("class", e.get("type", ""))
        if not cls and ttl.rstrip(":").strip().lower() == "answer":
            cls = "answer"
        lines.append(f"\n:::note [{cls}] {ttl}")
        lines.extend(container(e, depth))
        lines.append(":::")
    elif t == "example":
        title = e.find(C + "title")
        ttl = inline(title).strip() if title is not None else ""
        if not ttl:
            # Chemistry titles an example in its first paragraph; the title moves up to the example line
            first = next((k for k in e if tag(k) != "title"), None)
            ptitle = first.find(C + "title") if first is not None and tag(first) == "para" else None
            if ptitle is not None:
                ttl = inline(ptitle).strip()
                # the paragraph's text is the title's tail; keep it when the title goes
                first.text = (first.text or "") + (ptitle.tail or "")
                first.remove(ptitle)
        lines.append(f"\n:::example {{ex:{e.get('id','')}}} {ttl}")
        lines.extend(container(e, depth))
        lines.append(":::")
    elif t == "exercise":
        title = e.find(C + "title")
        lines.append(f"\n:::exercise {{{e.get('id','')}}} type={e.get('type','')} {inline(title).strip() if title is not None else ''}")
        lines.extend(container(e, depth))
        lines.append(":::")
    elif t == "problem":
        lines.append("PROBLEM:")
        lines.extend(container(e, depth))
    elif t == "solution":
        lines.append("SOLUTION:")
        lines.extend(container(e, depth))
    elif t == "commentary":
        lines.append("COMMENTARY:")
        lines.extend(container(e, depth))
    elif t == "list":
        items = e.findall(C + "item")
        enumerated = e.get("list-type") == "enumerated"
        style = e.get("number-style", "arabic")
        prefix, suffix = e.get("mark-prefix", ""), e.get("mark-suffix", ".")
        for i, it in enumerate(items):
            if enumerated:
                n = chr(ord("a") + i) if style in ("lower-alpha", "upper-alpha") else str(i + 1)
                if style == "upper-alpha":
                    n = n.upper()
                bullet = f"{prefix}{n}{suffix}"
            else:
                bullet = "-"
            body = inline(it).strip().replace("\x04", "\n")
            lines.append(f"{bullet} {body}")
    elif t == "definition":
        term = e.find(C + "term")
        meaning = e.find(C + "meaning")
        lines.append(f"- {{def}} **{inline(term).strip()}**: {inline(meaning).strip()}")
    elif t == "glossary":
        lines.append("\n## Glossary")
        for k in e:
            lines.append(block(k, depth))
    elif t == "table":
        lines.append(table(e))
    elif t == "metadata":
        return ""
    elif t == "content":
        for k in e:
            lines.append(block(k, depth))
    elif t in ("label",):
        return ""
    else:
        if t not in ("item", "caption", "meaning", "term", "abstract"):
            warn(f"<{t}> has no rule; its children were emitted in order")
        for k in e:
            lines.append(block(k, depth))
    return "\n".join(l for l in lines if l is not None)

def abstract(root):
    """The module's learning objectives, where the metadata carries them."""
    ab = root.find(C + "metadata/" + MD + "abstract")
    if ab is None or (not list(ab) and not (ab.text or "").strip()):
        return None
    lines = ["\n## Learning Objectives {section:learning-objectives}"]
    if (ab.text or "").strip():
        lines.append(para_text(ab.text.strip()))
    for k in ab:
        lines.append(block(k, 0))
    return "\n".join(lines) + "\n"

def main(path):
    global SOURCE
    SOURCE = path
    root = ET.parse(path).getroot()
    title = root.find(C + "title")
    out = ["# " + (inline(title).strip() if title is not None else ""), ""]
    ab = abstract(root)
    if ab:
        out.append(ab)
    for k in root:
        if tag(k) in ("content", "glossary"):
            out.append(block(k, 0))
    s = "\n".join(out)
    s = s.replace("\x02", "").replace("\x03", "").replace("\x04", "\n")
    s = re.sub(r"\n{3,}", "\n\n", s)
    print(s)

if __name__ == "__main__":
    main(sys.argv[1])
