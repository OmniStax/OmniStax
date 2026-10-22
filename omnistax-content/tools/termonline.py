#!/usr/bin/env python3
"""Look terms up at 术语在线 (termonline.cn), the authority of a zh-CN translation.

The site is a JavaScript app over one JSON endpoint, `allSearch`. Called by a
bare client the endpoint answers empty, so the lookups go through the site's
own search page in a headless Chromium (`termonline_fetch.mjs`, Playwright
from /opt/node-tools), one page load per term, paced, an empty answer retried
twice, and every answer cached in a JSON file beside the glossary, so a term is
fetched once per book.

    python3 -I omnistax-content/tools/termonline.py lookup "spring constant" "momentum"
    python3 -I omnistax-content/tools/termonline.py lookup --cache cache.json --json "spring constant"
    python3 -I omnistax-content/tools/termonline.py verify glossary.zh-CN.json --cache cache.json

`lookup` prints, per term, the 规范名 entries that carry it, with the vocabulary
(物理学名词, 力学名词 …) and year of each, physics vocabularies first.
`verify` reads a translation glossary and, for every row with `"confirm":
"termonline"`, says whether its `target` is the entry termonline lists under
its `source` in a physics vocabulary (`ok`), is listed but under another
vocabulary only (`other`), differs from what termonline lists (`differs`, with
the listed forms), or is not listed at all (`unlisted`). It writes nothing to
the glossary: the orchestrator decides each row.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

API = "https://api.termonline.cn/main-serve/business/tm/tmWord/allSearch"
HEADERS = {"Referer": "https://www.termonline.cn/", "Accept": "application/json, text/plain, */*",
           "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36"}
# Vocabularies whose entry decides a physics term, most specific first.
PHYSICS = ("物理学名词", "力学名词", "光学名词", "声学名词", "电子学名词", "电气工程名词", "核科学技术名词",
           "天文学名词", "计量学名词", "数学名词", "化学名词", "材料科学技术名词", "地球物理学名词",
           "大气科学名词", "生物物理学名词", "医学名词", "自动化名词", "航天科学技术名词")
PACE = 2.0          # seconds between page loads of the browser engine
EMPTY_RETRIES = 5   # an empty answer is retried this many times (the API answers empty at random)
RESET_RETRIES = 4

Entry = dict[str, Any]


def page_url(entry_id: str) -> str:
    return f"https://www.termonline.cn/detail?id={entry_id}"


def _call(term: str, match: int = 2, page: int = 1, size: int = 50) -> list[Entry]:
    q = urllib.parse.urlencode(dict(term=term, match=match, sources="", pubYears="", pageSize=size, pageNo=page, baseId=1))
    req = urllib.request.Request(f"{API}?{q}", headers=HEADERS)
    with urllib.request.urlopen(req, timeout=40) as r:
        data = json.load(r)
    res = data["result"]["searchResult"][0]["result"]
    out = []
    for w in res.get("tmWordList") or []:
        vocab = ""
        for key in ("quote1", "quote2"):
            q1 = w.get(key) or ""
            if "." in q1:
                # "[1]物理学名词审定委员会.物理学名词[M].3版…": the vocabulary is the title after the first dot
                part = q1.split(".", 1)[1]
                vocab = part.split("[", 1)[0].strip()
                if vocab:
                    break
        out.append({"cn": w.get("cn"), "en": w.get("en"), "vocab": vocab, "year": w.get("pubYear") or w.get("year"),
                    "id": w.get("id"), "definition": w.get("definition"), "status": w.get("status"), "type": w.get("wordType")})
    return out


_last = 0.0


def fetch(term: str) -> list[Entry]:
    """All entries for the term, paced, with the empty-answer and reset retries."""
    global _last
    pause = PACE
    empties = 0
    resets = 0
    while True:
        wait = _last + pause - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        _last = time.monotonic()
        try:
            rows = _call(term)
        except (urllib.error.URLError, ConnectionError, OSError, TimeoutError, json.JSONDecodeError, KeyError) as e:
            resets += 1
            if resets > RESET_RETRIES:
                raise RuntimeError(f"termonline: {term!r}: {e}")
            pause = min(30, max(5.0, pause * 2))
            continue
        if rows:
            return rows
        empties += 1
        if empties > EMPTY_RETRIES:
            return []
        pause = PACE + 0.5 * empties


class Cache:
    def __init__(self, path: Optional[str]):
        self.path = path
        self.data: dict[str, list[Entry]] = {}
        if path and os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                self.data = json.load(f)

    def get(self, term: str) -> list[Entry]:
        key = term.strip().lower()
        if key not in self.data:
            self.prefetch([term])
        return self.data.get(key, [])

    def prefetch(self, terms: list[str]) -> None:
        """Fetch every term not yet cached, through the browser engine, in one batch."""
        missing = sorted({t for t in terms if t.strip().lower() not in self.data})
        if not missing:
            return
        if not self.path:
            self.path = os.path.join(os.getcwd(), ".termonline-cache.json")
        self.save()
        with open(self.path + ".terms", "w", encoding="utf-8") as f:
            json.dump(missing, f, ensure_ascii=False)
        engine = os.path.join(os.path.dirname(os.path.abspath(__file__)), "termonline_fetch.mjs")
        # The engine's progress lines go to stderr, so that --json output stays parseable.
        done = subprocess.run(["node", engine, self.path, self.path + ".terms", str(int(PACE * 1000))], text=True, stdout=sys.stderr)
        if done.returncode != 0:
            raise RuntimeError(f"termonline: the browser engine failed ({done.returncode})")
        with open(self.path, encoding="utf-8") as f:
            self.data = json.load(f)

    def save(self) -> None:
        if not self.path:
            return
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=0, sort_keys=True)
        os.replace(tmp, self.path)


def rank(vocab: str) -> int:
    for i, v in enumerate(PHYSICS):
        if vocab.startswith(v):
            return i
    return len(PHYSICS)


def exact(entries: list[Entry], term: str) -> list[Entry]:
    """The entries whose English is the term itself (one of its comma-separated forms), physics first."""
    t = term.strip().lower()
    hits = []
    for e in entries:
        ens = [x.strip().lower() for x in (e.get("en") or "").replace("；", ",").replace(";", ",").split(",")]
        if t in ens:
            hits.append(e)
    hits.sort(key=lambda e: (rank(e.get("vocab") or ""), -(int(e.get("year") or 0) if str(e.get("year") or "").isdigit() else 0)))
    return hits


def cmd_lookup(args: argparse.Namespace) -> int:
    cache = Cache(args.cache)
    cache.prefetch(list(args.terms))
    for term in args.terms:
        entries = cache.get(term)
        hits = exact(entries, term)
        if args.json:
            print(json.dumps({"term": term, "exact": hits, "total": len(entries)}, ensure_ascii=False))
            continue
        if not hits:
            print(f"{term}: unlisted ({len(entries)} entries mention it)" if entries else f"{term}: unlisted")
            for e in entries[:5]:
                print(f"    ~ {e['cn']} · {e['en']} · {e['vocab']}")
            continue
        print(f"{term}:")
        for e in hits[:8]:
            print(f"    {e['cn']} · {e['en']} · {e['vocab']} {e.get('year') or ''} · {page_url(e['id'])}")
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    cache = Cache(args.cache)
    with open(args.glossary, encoding="utf-8") as f:
        glossary = json.load(f)
    rows = [r for r in glossary["terms"] if r.get("confirm") == "termonline" or args.all]
    cache.prefetch([r["source"] for r in rows])
    out = []
    for r in rows:
        entries = cache.get(r["source"])
        hits = exact(entries, r["source"])
        physics = [e for e in hits if rank(e.get("vocab") or "") < len(PHYSICS)]
        listed_physics = [e["cn"] for e in physics]
        listed_all = [e["cn"] for e in hits]
        near = [e for e in entries if e not in hits and rank(e.get("vocab") or "") < 3
                and r["source"].strip().lower() in (e.get("en") or "").lower()]
        near.sort(key=lambda e: (rank(e.get("vocab") or ""), len(e.get("en") or "")))
        if r["target"] in listed_physics:
            verdict = "ok"
        elif r["target"] in listed_all:
            verdict = "other"
        elif r["target"] in [e["cn"] for e in near]:
            verdict = "near-ok"
        elif hits:
            verdict = "differs"
        elif near:
            verdict = "near"
        else:
            verdict = "unlisted"
        best = physics[0] if physics else (hits[0] if hits else (near[0] if near else None))
        out.append({"source": r["source"], "target": r["target"], "verdict": verdict,
                    "listed": [(e["cn"], e["vocab"]) for e in hits[:6]],
                    "near": [(e["cn"], e["en"], e["vocab"]) for e in near[:6]],
                    "best": best and {"cn": best["cn"], "en": best["en"], "vocab": best["vocab"], "url": page_url(best["id"])}})
        if not args.json:
            lst = "; ".join(f"{cn}（{v}）" for cn, v in out[-1]["listed"]) if hits else "—"
            print(f"{verdict:9} {r['source']} → {r['target']}    listed: {lst}")
    if args.json:
        print(json.dumps(out, ensure_ascii=False, indent=1))
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="termonline", description=__doc__.split("\n\n")[0])
    subs = p.add_subparsers(dest="command", required=True)
    lk = subs.add_parser("lookup")
    lk.add_argument("terms", nargs="+")
    lk.add_argument("--cache")
    lk.add_argument("--json", action="store_true")
    vf = subs.add_parser("verify")
    vf.add_argument("glossary")
    vf.add_argument("--cache")
    vf.add_argument("--all", action="store_true", help="every row, not only those marked confirm: termonline")
    vf.add_argument("--json", action="store_true")
    args = p.parse_args(argv)
    try:
        return {"lookup": cmd_lookup, "verify": cmd_verify}[args.command](args)
    except RuntimeError as e:
        print(e, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
