"""Every slider track of every section, measured at two widths.

Run against a served ``dist`` directory, naming that directory for the list of sections:
    python3 tests/slider-width-check.py http://127.0.0.1:8094 --dist ../dist [--sample 20] [--before]

``--before`` switches the wrap off, which measures the layout as it was without it.
A track under MIN (figlib MIN_TRACK_PX) is reported.
"""

import argparse
import pathlib
import re
from playwright.sync_api import sync_playwright

MIN = 120
WIDTHS = (1500, 900)
UNWRAP = (".controls label.ctl-wrap{grid-template-columns:minmax(1.6em,auto) 1fr minmax(5.6em,auto)!important}"
          ".controls label.ctl-wrap .ctl-track{grid-row:auto!important;grid-column:auto!important}")
SECTION = re.compile(r"^\d+\.\d+$")

ap = argparse.ArgumentParser()
ap.add_argument("base")
ap.add_argument("--dist", required=True)
ap.add_argument("--sample", type=int, default=0, help="every n-th section only")
ap.add_argument("--before", action="store_true")
args = ap.parse_args()
BASE = args.base.rstrip("/")

dist = pathlib.Path(args.dist)
paths = sorted(
    "/" + str(p.parent.relative_to(dist)) + "/"
    for p in dist.glob("*/ch*/*/index.html")
    if SECTION.match(p.parent.name)
)
if args.sample:
    paths = paths[:: args.sample]

MEASURE = """() => [...document.querySelectorAll('.controls input[type=range]')]
  .filter((i) => i.offsetParent !== null && i.closest('figure'))
  .map((i) => ({ fig: i.closest('figure').id, cls: i.className, w: Math.round(i.getBoundingClientRect().width) }))"""

short, total = [], 0
with sync_playwright() as pw:
    browser = pw.chromium.launch(args=["--use-gl=swiftshader"])
    for width in WIDTHS:
        page = browser.new_page(viewport={"width": width, "height": 1000})
        for path in paths:
            page.goto(BASE + path)
            page.wait_for_selector(".shell")
            try:
                page.wait_for_selector("figure.sim .controls input[type=range]", timeout=4000)
            except Exception:
                continue
            if args.before:
                page.add_style_tag(content=UNWRAP)
            page.wait_for_timeout(300)
            rows = page.evaluate(MEASURE)
            total += len(rows)
            short += [(width, path, r["fig"], r["cls"], r["w"]) for r in rows if r["w"] < MIN]
        page.close()
    browser.close()

for row in short:
    print("%5d  %-40s %-40s %-12s %4d px" % row)
print(f"{len(paths)} sections, {total} tracks measured over {len(WIDTHS)} widths, {len(short)} under {MIN} px")
