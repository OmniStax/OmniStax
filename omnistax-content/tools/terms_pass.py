#!/usr/bin/env python3
"""`terms_pass`: the mentions of a book's glossary words that no builder has judged yet.

A word of the prose is underlined, and opens its concept's card, only inside a
`<span data-concept="…">` its builder wrote after reading the sentence (root
RULES item 7). This lists every mention of any concept's `terms` that sits
outside such a span, for an agent to judge, and writes the spans it decides on.

    python3 omnistax-content/tools/terms_pass.py candidates <book> [--chapter N] > candidates.jsonl
    python3 omnistax-content/tools/terms_pass.py apply <decisions.jsonl>...
    python3 omnistax-content/tools/terms_pass.py stats <book> [--chapter N]

A mention is found as the app once found it: the term as a whole word, any
whitespace between its words, case-insensitive, the longer term first, in a
`<p>` or `<li>`, and never in math (`$…$`, `$$…$$`), a link, a heading, a
figure, an exercise host or a span already marked. Only the terms of built
concepts are looked for.

A candidates row: {book, section, idx, term, concepts, context, class, hash}.
`idx` numbers the mention among every mention of the section, marked or not,
so it stays put while spans are added; `term` is the text as the prose has it;
`concepts` every concept whose `terms` hold it; `context` its sentence with the
mention in «»; `hash` the section's `text.html` as listed.

`class` is `jargon` where the term can hardly mean anything else: a term of
several words, or one word (or its plural) on neither built-in list below, the
thousand or so most frequent English words and the words of science that keep
an everyday sense (normal, potential, mole, bond), and not a name
/usr/share/dict/words spells with a capital (Henry, Tesla, Curie, where the
person and the unit share the word). It is `judge` otherwise, for a word of
three letters or fewer, and for any term two concepts share. The dictionary
says nothing else: it holds nearly every technical word (velocity, photon).

A decisions row is a candidates row with `concept` set to the concept the
mention names, or null where it names none; only book, section, idx, hash and
concept are read. `apply` wraps each chosen mention in `<span
data-concept="…">`. A section whose file changed since it was listed is
refused, unless every mention chosen in it already wears its span, when it is
left as it is; nothing is written unless every section passes. Run `ost check`
after.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Iterator, Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ost  # noqa: E402

BookId = str
SectionId = str
ConceptId = str
Term = str
Hash = str
CandidateDTO = dict
DecisionDTO = dict

# ------------------------------------------------------------- common English
# ponytail: hand-written lists; swap in a real frequency table if the judge share looks wrong.
FREQUENT = frozenset("""
a able about above accept according account across act action active activity actually add address
admit adult affect after again against age agency agent ago agree ahead air all allow almost alone
along already also although always among amount analysis and animal another answer any anyone
anything appear apply approach area argue arm around arrive art article artist as ask assume at
attack attention attorney audience author authority available avoid away baby back bad bag ball bank
bar base be beat beautiful because become bed before begin behavior behind believe benefit best better
between beyond big bill billion bit black blood blue board body book born both box boy break bring
brother budget build building business but buy by call camera campaign can cancer candidate capital
car card care career carry case catch cause cell center central century certain certainly chair
challenge chance change character charge check child choice choose church citizen city civil claim
class clear clearly close coach cold collection college color come commercial common community company
compare computer concern condition conference consider consumer contain continue control cost could
country couple course court cover create crime cultural culture cup current customer cut dark data
daughter day dead deal death debate decade decide decision deep defense degree describe design despite
detail determine develop development die difference different difficult dinner direction director
discover discuss discussion disease do doctor dog door down draw dream drive drop drug during each early
east easy eat economic economy edge education effect effort eight either election else employee end
energy enjoy enough enter entire environment environmental especially establish even evening event ever
every everybody everyone everything evidence exactly example executive exist expect experience expert
explain eye face fact factor fail fall family far fast father fear federal feel feeling few field fight
figure fill film final finally financial find fine finger finish fire firm first fish five floor fly
focus follow food foot for force foreign forget form former forward four free friend from front full
fund future game garden gas general generation get girl give glass go goal good government great green
ground group grow growth guess gun guy hair half hand hang happen happy hard have he head health hear
heart heat heavy help her here herself high him himself his history hit hold home hope hospital hot
hotel hour house how however huge human hundred husband idea identify if image imagine impact important
improve in include including increase indeed indicate individual industry information inside instead
institution interest interesting international interview into investment involve issue it item its
itself job join just keep key kid kill kind kitchen know knowledge land language large last late later
laugh law lawyer lay lead leader learn least leave left leg legal less let letter level lie life light
like likely line list listen little live local long look lose loss lot love low machine magazine main
maintain major majority make man manage management manager many market marriage material matter may
maybe me mean measure media medical meet meeting member memory mention message method middle might
military million mind minute miss mission model modern moment money month more morning most mother
mouth move movement movie much music must my myself name nation national natural nature near nearly
necessary need network never new news newspaper next nice night no none nor north not note nothing
notice now number occur of off offer office officer official often oh oil ok old on once one only onto
open operation opportunity option or order organization other others our out outside over own owner
page pain painting paper parent part participant particular particularly partner party pass past
patient pattern pay peace people per perform performance perhaps period person personal phone physical
pick picture piece place plan plant play player point police policy political politics poor popular
population position positive possible power practice prepare present president pressure pretty prevent
price private probably problem process produce product production professional professor program
project property protect prove provide public pull purpose push put quality question quickly quite
race radio raise range rate rather reach read ready real reality realize really reason receive recent
recently recognize record red reduce reflect region relate relationship religious remain remember
remove report represent require research resource respond response responsibility rest result return
reveal rich right rise risk road rock role room rule run safe same save say scene school science
scientist score sea season seat second section security see seek seem sell send senior sense series
serious serve service set seven several shake share she shoot short shot should shoulder show side sign
significant similar simple simply since sing single sister sit site situation six size skill skin small
smile so social society soldier some somebody someone something sometimes son song soon sort sound
source south southern space speak special specific speech spend sport spring staff stage stand standard
star start state statement station stay step still stock stop store story strategy street strong
structure student study stuff style subject success successful such suddenly suffer suggest summer
support sure surface system table take talk task tax teach teacher team technology television tell
ten tend term test than thank that the their them themselves then theory there these they thing think
third this those though thought thousand threat three through throughout throw thus time to today
together tonight too top total tough toward town trade traditional training travel treat treatment tree
trial trip trouble true truth try turn two type under understand unit until up upon us use usually
value various very victim view violence visit voice vote wait walk wall want war watch water way we
weapon wear week weight well west western what whatever when where whether which while white who whole
whom whose why wide wife will win wind window wish with within without woman wonder word work worker
world worry would write writer wrong yard yeah year yes yet you young your yourself
""".split()) | frozenset("""
absolute absorb accelerate act advance agent align alternate angle apparent arc atmosphere
attract average axis balance band barrier beam bend bias block bond boundary bound branch bridge
bulk capacity cap carrier cast center chain channel circle circuit clock cloud coat coil
compound concentration conduct constant contact content contract core count couple crest critical
cross crystal cycle decay deposit depth dimension direct discharge disk display distance drag
drift dry earth effective element emission equal equivalent excess expansion 
express extent fiber flat flow fluid focus formula fraction frame friction front fuel
function gain gap gauge grain gravity grid ground half height hole horizon impulse
index induction inertia input intensity interval iron junction lag lens lever lift limit link liquid
load loop magnitude mass matrix mean medium metal mirror mixture mole moment momentum motion net
neutral node noise normal nucleus object orbit origin output pair parallel path peak phase pitch plane
plate pole positive potential pound precipitate prism probability projection pulse pure quantity
radius ratio ray reaction reference relative resistance resonance root rotation salt sample scale
scatter screen sector segment shell shift signal sink slope solid solution span spectrum speed sphere
spin stable static steady strain strength stress string strong substance sum switch tension terminal
thermal threshold trace track transfer transition transmission tube turn uniform vacuum valve
variable vector volume wave weak wedge weight wheel width work yield zero
accommodation accuracy alcohol alloy approximation basic battery bottom breeding buffer catalyst
chaos charm coefficient coherent complexity concentrated conduction contrast deposition dilute
dissolved domain dynamics efficiency ether flavor fundamental fusion grounded grounding hearing
hypothesis ignition indicator intermediate length linear melting motor overlap plasma precision
rainbow reduction resultant rounding saturated screening shielding steel strange surroundings
suspension tagged tail thrust tone trajectory uncertainty
""".split())


def proper_names(path: str = "/usr/share/dict/words") -> frozenset[str]:
    """The words the dictionary spells with a capital, a person or a place a unit or a law may be named after (Henry, Tesla, Curie)."""
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return frozenset(w.strip().lower() for w in f if w[:1].isupper() and "'" not in w)
    except OSError:
        return frozenset()


NAMES = proper_names()


def kind_of(term: Term, concepts: Sequence[ConceptId]) -> str:
    word = term.lower()
    if len(concepts) > 1:
        return "judge"
    if len(word.split()) > 1:
        return "jargon"
    bases = {word, word[:-1] if word.endswith("s") else word, word[:-2] if word.endswith("es") else word}
    return "judge" if len(word) <= 3 or bases & (FREQUENT | NAMES) else "jargon"


# ------------------------------------------------------------------- scanning

TOKEN = re.compile(r"(<[^>]+>|\$\$[\s\S]+?\$\$|\$[^$]+?\$)")
NAME = re.compile(r"^</?([a-zA-Z][\w-]*)")
CONCEPT = re.compile(r'\sdata-concept="([^"]*)"')
CLASS = re.compile(r'\sclass="([^"]*)"')
VOID = frozenset("area base br col embed hr img input link meta param source track wbr".split())
BLOCK = frozenset(("p", "li"))
HEADING = frozenset(f"h{i}" for i in range(1, 7))
FORBID_TAGS = frozenset(("math", "figure", "script", "style"))
FORBID_CLASSES = frozenset(("katex", "exercises", "book-word", "wiki"))


@dataclass(frozen=True)
class Open:
    """An element still open where a text run stands."""
    name: str
    at: int                        # the token that opened it
    concept: Optional[ConceptId]
    forbids: bool


@dataclass(frozen=True)
class Mention:
    token: int
    start: int
    end: int
    text: str
    block: int                     # the token that opened its innermost <p> or <li>
    inside: Optional[ConceptId]    # the concept span it already sits in


def tokens(text: str) -> list[str]:
    return [t for t in TOKEN.split(text) if t]


def opened(tag: str, at: int) -> Optional[Open]:
    m = NAME.match(tag)
    if not m or tag.startswith("</") or tag.endswith("/>") or m.group(1).lower() in VOID:
        return None
    name = m.group(1).lower()
    classes = set((CLASS.search(tag) or [None, ""])[1].split())
    concept = CONCEPT.search(tag)
    return Open(name, at, concept.group(1) if concept else None,
                name in FORBID_TAGS or any(c.startswith("katex") for c in classes) or bool(classes & FORBID_CLASSES))


def closed(stack: list[Open], tag: str) -> list[Open]:
    m = NAME.match(tag)
    name = m.group(1).lower() if m else ""
    for i in range(len(stack) - 1, -1, -1):
        if stack[i].name == name:
            return stack[:i]
    return stack


def glossary(terms: Sequence[Term]) -> Optional[re.Pattern]:
    words = sorted({word_key(t) for t in terms if t.strip()}, key=len, reverse=True)
    alts = [r"\s+".join(re.escape(w) for w in t.split()) for t in words]
    return re.compile(rf"(?<![\w-])(?:{'|'.join(alts)})(?![\w-])", re.IGNORECASE | re.ASCII) if alts else None


def word_key(term: Term) -> str:
    return " ".join(term.split()).lower()


def forms(term: Term) -> list[str]:
    """A term as prose writes it: without the glossary's trailing "(A)" or "(ψ)", and in the plural."""
    bare = word_key(re.sub(r"\s*\([^()]*\)\s*$", "", term)) or word_key(term)
    plural = bare[:-1] + "ies" if re.search(r"[^aeiou]y$", bare) else bare + "es" if re.search(r"(s|x|z|ch|sh)$", bare) else bare + "s"
    return list(dict.fromkeys([word_key(term), bare, plural]))


def mentions(ts: Sequence[str], pattern: Optional[re.Pattern]) -> Iterator[Mention]:
    """Every mention in a block's free text, marked or not, in the order of the file."""
    stack: list[Open] = []
    for i, t in enumerate(ts):
        if t.startswith("<"):
            o = opened(t, i)
            stack = [*stack, o] if o else closed(stack, t) if t.startswith("</") else stack
            continue
        if t.startswith("$") or pattern is None:
            continue
        blocks = [o for o in stack if o.name in BLOCK]
        if not blocks or any(o.forbids or o.name == "a" or o.name in HEADING for o in stack):
            continue
        inside = next((o.concept for o in reversed(stack) if o.concept), None)
        for m in pattern.finditer(t):
            yield Mention(i, m.start(), m.end(), m.group(0), blocks[-1].at, inside)


def sentence(ts: Sequence[str], m: Mention) -> str:
    """The sentence the mention stands in, the mention in «»."""
    depth, parts = 0, []
    for i in range(m.block, len(ts)):
        t = ts[i]
        if i == m.token:
            parts.append(f"{t[:m.start]}«{t[m.start:m.end]}»{t[m.end:]}")
        elif not t.startswith("<"):
            parts.append(t)
        elif i > m.block and NAME.match(t) and NAME.match(t).group(1).lower() == NAME.match(ts[m.block]).group(1).lower():
            depth += -1 if t.startswith("</") else 1
            if depth < 0:
                break
    text = " ".join(html.unescape("".join(parts)).split())
    for s in re.split(r"(?<=[.!?])\s+(?=[^a-z])", text):
        if "«" in s:
            return s if len(s) <= 400 else s[max(0, s.index("«") - 200):s.index("«") + 200]
    return text


def digest(text: str) -> Hash:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]


# ------------------------------------------------------------------ the book

@dataclass(frozen=True)
class Glossary:
    pattern: Optional[re.Pattern]
    named: dict[str, list[ConceptId]]    # a term's key -> the concepts whose terms hold it
    ids: frozenset[ConceptId]


def glossary_of(book: ost.Book) -> Glossary:
    concepts = ost.load(book.book_path).get("concepts", [])
    named: dict[str, list[ConceptId]] = defaultdict(list)
    for c in concepts:
        if c.get("status", "built") != "built":
            continue
        for t in c.get("terms", []):
            for k in forms(t):
                if c["id"] not in named[k]:
                    named[k].append(c["id"])
    return Glossary(glossary(list(named)), dict(named), frozenset(c["id"] for c in concepts))


def sections(book: ost.Book, chapter: Optional[str]) -> list[SectionId]:
    """Every page with a text.html, in reading order: the book's intro, each chapter's intro, sections and summary, the book's summary."""
    def numbered(d: str) -> tuple:
        return tuple(int(x) for x in d.split("."))
    chapters = [ost.chapter_dir_of(book, chapter)] if chapter else ost.chapter_dirs(book)
    found = [] if chapter else [s for s in ("intro",) if os.path.exists(os.path.join(book.dir, s, "text.html"))]
    for ch in chapters:
        n = int(ch[2:])
        here = [d for d in os.listdir(os.path.join(book.dir, ch)) if os.path.exists(os.path.join(book.dir, ch, d, "text.html"))]
        found += [f"{n}.intro"] * ("intro" in here)
        found += sorted((d for d in here if re.fullmatch(r"\d+\.\d+", d)), key=numbered)
        found += [f"{n}.summary"] * ("summary" in here)
    return found + ([] if chapter else [s for s in ("summary",) if os.path.exists(os.path.join(book.dir, s, "text.html"))])


def text_path(book: ost.Book, section: SectionId) -> str:
    return os.path.join(os.path.dirname(ost.section_path(book, section)), "text.html")


def candidates(book: ost.Book, chapter: Optional[str] = None) -> Iterator[tuple[CandidateDTO, Optional[ConceptId]]]:
    """Every mention of the book as a candidates row, with the concept span it already sits in."""
    g = glossary_of(book)
    for section in sections(book, chapter):
        text = ost.read_text(text_path(book, section))
        ts, h = tokens(text), digest(text)
        for idx, m in enumerate(mentions(ts, g.pattern)):
            concepts = g.named.get(word_key(m.text), [])
            yield ({"book": book.id, "section": section, "idx": idx, "term": " ".join(m.text.split()), "concepts": concepts,
                    "context": sentence(ts, m), "class": kind_of(m.text, concepts), "hash": h}, m.inside)


def cmd_candidates(args: argparse.Namespace) -> int:
    for row, inside in candidates(ost.book_of(args.book), args.chapter):
        if inside is None:
            print(json.dumps(row, ensure_ascii=False))
    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    rows = list(candidates(ost.book_of(args.book), args.chapter))
    bare = [r for r, inside in rows if inside is None]
    chapter = lambda r: r["section"].split(".")[0]  # noqa: E731
    classes = Counter(r["class"] for r in bare)
    print(f"{args.book} · {len(rows)} mentions · {len(rows) - len(bare)} in a concept span · {len(bare)} bare: "
          f"{classes['jargon']} jargon, {classes['judge']} judge")
    by_chapter: dict[str, Counter] = defaultdict(Counter)
    for r, inside in rows:
        by_chapter[chapter(r)]["marked" if inside else r["class"]] += 1
    for ch in sorted(by_chapter, key=lambda c: (not c.isdigit(), int(c) if c.isdigit() else 0, c)):
        n = by_chapter[ch]
        print(f"chapter {ch} · jargon {n['jargon']} · judge {n['judge']} · marked {n['marked']}")
    print("top judge terms:")
    for term, n in Counter(r["term"].lower() for r in bare if r["class"] == "judge").most_common(40):
        concepts = next(r["concepts"] for r in bare if r["term"].lower() == term)
        print(f"{n} · {term} · {', '.join(concepts)}")
    return 0


# ------------------------------------------------------------------- applying

def read_decisions(paths: Sequence[str]) -> list[DecisionDTO]:
    rows = []
    for path in paths:
        with open(path, encoding="utf-8") as f:
            for n, line in enumerate(f, 1):
                if not line.strip():
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError as e:
                    raise ost.Refused(f"{path}:{n} does not parse: {e}")
                missing = [k for k in ("book", "section", "idx", "hash", "concept") if k not in row]
                if missing:
                    raise ost.Refused(f"{path}:{n} has no {', '.join(missing)}")
                rows.append(row)
    return rows


def wrapped(ts: Sequence[str], chosen: dict[Mention, ConceptId]) -> str:
    by_token: dict[int, list[tuple[Mention, ConceptId]]] = defaultdict(list)
    for m, c in chosen.items():
        by_token[m.token].append((m, c))
    out = list(ts)
    for i, marks in by_token.items():
        t, at, pieces = ts[i], 0, []
        for m, c in sorted(marks, key=lambda x: x[0].start):
            pieces += [t[at:m.start], f'<span data-concept="{c}">{m.text}</span>']
            at = m.end
        out[i] = "".join(pieces) + t[at:]
    return "".join(out)


def plan_section(book: ost.Book, g: Glossary, section: SectionId, rows: Sequence[DecisionDTO]) -> tuple[Optional[str], int]:
    """The section's new text and how many mentions it wraps; None where every chosen mention already wears its span."""
    where = f"{book.id} {section}"
    hashes = {r["hash"] for r in rows}
    if len(hashes) > 1:
        raise ost.Refused(f"{where}: rows from two listings ({', '.join(sorted(hashes))}); list it again")
    chosen: dict[int, ConceptId] = {}
    for r in rows:
        if r["concept"] is None:
            continue
        if r["concept"] not in g.ids:
            raise ost.Refused(f"{where} #{r['idx']}: {r['concept']!r} is no concept of the book")
        if chosen.get(r["idx"], r["concept"]) != r["concept"]:
            raise ost.Refused(f"{where} #{r['idx']}: two concepts chosen")
        chosen[r["idx"]] = r["concept"]
    text = ost.read_text(text_path(book, section))
    ts = tokens(text)
    found = list(mentions(ts, g.pattern))
    if any(i >= len(found) for i in chosen):
        raise ost.Refused(f"{where}: #{max(chosen)} is no mention of the section")
    if digest(text) != hashes.pop():
        if all(found[i].inside == c for i, c in chosen.items()):
            return None, 0
        raise ost.Refused(f"{where}: text.html changed since its candidates were listed; list them again")
    taken = [i for i in chosen if found[i].inside]
    if taken:
        raise ost.Refused(f"{where}: #{taken[0]} already sits in a concept span")
    return wrapped(ts, {found[i]: c for i, c in chosen.items()}), len(chosen)


def cmd_apply(args: argparse.Namespace) -> int:
    groups: dict[tuple[BookId, SectionId], list[DecisionDTO]] = defaultdict(list)
    for r in read_decisions(args.decisions):
        groups[(r["book"], r["section"])].append(r)
    glossaries: dict[BookId, Glossary] = {}
    writes: list[tuple[str, str, int]] = []
    unchanged = 0
    for (book_id, section), rows in groups.items():
        book = ost.book_of(book_id)
        g = glossaries.setdefault(book_id, glossary_of(book))
        text, n = plan_section(book, g, section, rows)
        if text is None:
            unchanged += 1
        elif n:
            writes.append((text_path(book, section), text, n))
    for path, text, _ in writes:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
    print(f"{sum(n for *_, n in writes)} mentions marked in {len(writes)} sections; {unchanged} sections already applied")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="terms_pass", description=__doc__.split("\n\n")[0])
    subs = p.add_subparsers(dest="command", required=True)
    for name, about in (("candidates", "every bare mention as a JSONL row"), ("stats", "counts by class and chapter, and the top judge terms")):
        s = subs.add_parser(name, help=about)
        s.add_argument("book")
        s.add_argument("--chapter")
    a = subs.add_parser("apply", help="wrap the chosen mentions in their concept spans")
    a.add_argument("decisions", nargs="+")
    return p


COMMANDS = {"candidates": cmd_candidates, "stats": cmd_stats, "apply": cmd_apply}


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parser().parse_args(argv)
    try:
        return COMMANDS[args.command](args)
    except ost.Refused as e:
        print(f"terms_pass: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
