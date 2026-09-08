#!/usr/bin/env python3
"""Convert an OpenStax CNXML module to markdown with LaTeX math.

Usage: cnxml2md.py path/to/index.cnxml > out.md
Lossy but faithful to prose order. Tags preserved as markers where OmniStax
needs them later: definitions, examples, exercises, figures, equations.
"""
import sys, re
import xml.etree.ElementTree as ET

NS = {"c": "http://cnx.rice.edu/cnxml", "m": "http://www.w3.org/1998/Math/MathML",
      "md": "http://cnx.rice.edu/mdml"}
M = "{http://www.w3.org/1998/Math/MathML}"
C = "{http://cnx.rice.edu/cnxml}"

def tag(e):
    return e.tag.split("}")[-1]

# ---------- MathML -> LaTeX ----------
def mml(e):
    t = tag(e)
    kids = list(e)
    txt = (e.text or "")
    if t in ("math", "mrow", "mstyle", "semantics"):
        return "".join(mml(k) for k in kids)
    if t == "mi":
        s = txt.strip()
        return {"Δ": r"\Delta ", "π": r"\pi ", "θ": r"\theta ", "ω": r"\omega ", "α": r"\alpha "}.get(s, s)
    if t == "mn":
        s = txt.strip()
        return {"Δ": r"\Delta "}.get(s, s)
    if t == "mo":
        s = txt.strip()
        return {"−": "-", "–": "-", "×": r"\times ", "·": r"\cdot ", "±": r"\pm ", "≈": r"\approx ",
                "→": r"\to ", "′": "'", "∞": r"\infty ", "∣": "|"}.get(s, s)
    if t == "mtext":
        s = txt.replace("\n", " ")
        return r"\text{" + s + "}" if s.strip() else " "
    if t == "mspace":
        return r"\;"
    if t == "mfrac":
        return r"\frac{" + mml(kids[0]) + "}{" + mml(kids[1]) + "}"
    if t == "msub":
        return "{" + mml(kids[0]) + "}_{" + mml(kids[1]) + "}"
    if t == "msup":
        return "{" + mml(kids[0]) + "}^{" + mml(kids[1]) + "}"
    if t == "msubsup":
        return "{" + mml(kids[0]) + "}_{" + mml(kids[1]) + "}^{" + mml(kids[2]) + "}"
    if t == "mover":
        acc = (kids[1].text or "").strip()
        base = mml(kids[0])
        if acc in ("-", "¯", "‾", "―"):
            return r"\bar{" + base + "}"
        if acc in ("→", "⃗"):
            return r"\vec{" + base + "}"
        return r"\overset{" + mml(kids[1]) + "}{" + base + "}"
    if t == "munder":
        return r"\underset{" + mml(kids[1]) + "}{" + mml(kids[0]) + "}"
    if t == "msqrt":
        return r"\sqrt{" + "".join(mml(k) for k in kids) + "}"
    if t == "mroot":
        return r"\sqrt[" + mml(kids[1]) + "]{" + mml(kids[0]) + "}"
    if t == "mfenced":
        return "(" + ",".join(mml(k) for k in kids) + ")"
    if t == "mtable":
        rows = [" & ".join(mml(c) for c in r) for r in kids]
        return r"\begin{array}{l}" + r" \\ ".join(rows) + r"\end{array}"
    if t in ("mtr", "mtd"):
        return "".join(mml(k) for k in kids)
    if t == "mphantom":
        return ""
    return "".join(mml(k) for k in kids)

def latex(e):
    s = mml(e)
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("{ ", "{").replace(" }", "}")
    return s

# ---------- CNXML -> markdown ----------
def inline(e):
    """Render element's mixed content inline."""
    out = [e.text or ""]
    for k in e:
        t = tag(k)
        if k.tag == M + "math":
            out.append("$" + latex(k) + "$")
        elif t == "emphasis":
            eff = k.get("effect", "italics")
            mark = "**" if eff == "bold" else "*"
            out.append(mark + inline(k).strip() + mark)
        elif t == "term":
            out.append("{term:" + inline(k).strip() + "}")
        elif t == "link":
            if k.get("document"):
                out.append("[" + (inline(k).strip() or k.get("document")) + "](module:" + k.get("document") + ")")
            elif k.get("target-id"):
                out.append("[ref:" + k.get("target-id") + "]" + (inline(k).strip()))
            elif k.get("url"):
                out.append("[" + inline(k).strip() + "](" + k.get("url") + ")")
            else:
                out.append(inline(k))
        elif t == "sub":
            out.append("_" + inline(k).strip())
        elif t == "sup":
            out.append("^" + inline(k).strip())
        elif t == "newline":
            out.append("\n")
        elif t == "quote":
            out.append('"' + inline(k).strip() + '"')
        elif t == "foreign":
            out.append(inline(k))
        elif t == "list":
            out.append("\n" + block(k, 0) + "\n")
        elif t in ("figure", "note", "equation"):
            # block elements nested inside a para: emit them as blocks, not as inline text.
            # The sentinels keep para() from folding the block's lines into the paragraph.
            out.append("\n\x02" + block(k, 0) + "\x03\n")
        elif t == "title":
            pass
        else:
            out.append(inline(k))
        out.append(k.tail or "")
    return "".join(out)

def block(e, depth):
    t = tag(e)
    lines = []
    if t == "para":
        title = e.find(C + "title")
        if title is not None:
            lines.append("**" + inline(title).strip() + "**")
        txt = inline(e).strip()
        txt = "".join(seg if i % 2 else re.sub(r"[ \t]*\n[ \t]*", " ", seg)
                      for i, seg in enumerate(re.split(r"\x02|\x03", txt)))
        if txt:
            lines.append(txt)
    elif t == "title":
        return ""
    elif t == "section":
        title = e.find(C + "title")
        h = "#" * min(depth + 2, 6)
        lines.append(f"\n{h} {inline(title).strip() if title is not None else ''}")
        for k in e:
            if tag(k) != "title":
                lines.append(block(k, depth + 1))
    elif t == "equation":
        m = e.find(M + "math")
        eid = e.get("id", "")
        lines.append(f"\n$$ {latex(m) if m is not None else ''} $$  {{eq:{eid}}}\n")
    elif t == "figure":
        title = e.find(C + "title")
        media = e.find(C + "media")
        alt = media.get("alt", "") if media is not None else ""
        img = media.find(C + "image") if media is not None else None
        src = img.get("src", "") if img is not None else ""
        cap = e.find(C + "caption")
        lines.append(f"\n> FIGURE {{fig:{e.get('id','')}}} src={src}\n> alt: {alt}\n> caption: {inline(cap).strip() if cap is not None else ''}\n")
        for sf in e.findall(C + "subfigure"):
            lines.append(block(sf, depth))
    elif t == "subfigure":
        media = e.find(C + "media")
        img = media.find(C + "image") if media is not None else None
        src = img.get("src", "") if img is not None else ""
        cap = e.find(C + "caption")
        lines.append(f"> subfigure src={src} caption: {inline(cap).strip() if cap is not None else ''}")
    elif t == "note":
        title = e.find(C + "title")
        lines.append(f"\n:::note [{e.get('class', e.get('type',''))}] {inline(title).strip() if title is not None else ''}")
        for k in e:
            if tag(k) != "title":
                lines.append(block(k, depth))
        lines.append(":::")
    elif t == "example":
        title = e.find(C + "title")
        lines.append(f"\n:::example {{ex:{e.get('id','')}}} {inline(title).strip() if title is not None else ''}")
        for k in e:
            if tag(k) != "title":
                lines.append(block(k, depth))
        lines.append(":::")
    elif t == "exercise":
        title = e.find(C + "title")
        lines.append(f"\n:::exercise {{{e.get('id','')}}} type={e.get('type','')} {inline(title).strip() if title is not None else ''}")
        for k in e:
            if tag(k) != "title":
                lines.append(block(k, depth))
        lines.append(":::")
    elif t == "problem":
        lines.append("PROBLEM:")
        for k in e:
            lines.append(block(k, depth))
    elif t == "solution":
        lines.append("SOLUTION:")
        for k in e:
            lines.append(block(k, depth))
    elif t == "list":
        items = e.findall(C + "item")
        for i, it in enumerate(items):
            bullet = f"{i+1}." if e.get("list-type") == "enumerated" else "-"
            body = inline(it).strip()
            sub = "".join(block(k, depth) for k in it if tag(k) in ("list",))
            lines.append(f"{bullet} {body}" + (("\n" + sub) if sub else ""))
    elif t == "definition":
        term = e.find(C + "term")
        meaning = e.find(C + "meaning")
        lines.append(f"- {{def}} **{inline(term).strip()}**: {inline(meaning).strip()}")
    elif t == "glossary":
        lines.append("\n## Glossary")
        for k in e:
            lines.append(block(k, depth))
    elif t == "table":
        lines.append(f"\n[TABLE {e.get('id','')} {e.get('summary','')}]")
        for row in e.iter(C + "row"):
            lines.append("| " + " | ".join(inline(c).strip() for c in row.findall(C + "entry")) + " |")
    elif t == "metadata":
        return ""
    elif t == "content":
        for k in e:
            lines.append(block(k, depth))
    else:
        for k in e:
            lines.append(block(k, depth))
    return "\n".join(l for l in lines if l is not None)

def main(path):
    root = ET.parse(path).getroot()
    title = root.find(C + "title")
    out = ["# " + (inline(title).strip() if title is not None else ""), ""]
    for k in root:
        if tag(k) in ("content", "glossary"):
            out.append(block(k, 0))
    s = "\n".join(out)
    s = s.replace("\x02", "").replace("\x03", "")
    s = re.sub(r"\n{3,}", "\n\n", s)
    print(s)

if __name__ == "__main__":
    main(sys.argv[1])
