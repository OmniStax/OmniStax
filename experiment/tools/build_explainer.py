#!/usr/bin/env python3
"""Assemble a self-contained explainer page: template.html + app.js + JSON data + vendored libs.
Usage: build_explainer.py <dir>   (expects template.html, app.js, exercises.json, concepts.json, formulas.json)
Writes <dir>/index.html. KaTeX (with woff2 fonts as data URIs) and three.js are inlined from
experiment/vendor so the page works from file://, a network path, or any http server root.
"""
import sys, os, re, json, base64

d = sys.argv[1]
VENDOR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vendor")
html = open(os.path.join(d, "template.html")).read()

for key, fn in [("EXERCISES", "exercises.json"), ("CONCEPTS", "concepts.json"), ("FORMULAS", "formulas.json")]:
    data = json.load(open(os.path.join(d, fn)))
    html = html.replace(f"/*{key}_JSON*/", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))

def vendor(rel):
    return open(os.path.join(VENDOR, rel), encoding="utf-8").read()

def katex_css():
    css = vendor("katex/katex.min.css")
    # keep only the woff2 source of each @font-face, inlined as a data URI
    css = re.sub(r"src:([^;}]*)", lambda m: "src:" + ",".join(
        p for p in m.group(1).split(",") if "woff2" in p), css)
    def inline(m):
        path = os.path.join(VENDOR, "katex", m.group(1))
        b64 = base64.b64encode(open(path, "rb").read()).decode()
        return f"url(data:font/woff2;base64,{b64})"
    return re.sub(r"url\((fonts/[^)]+\.woff2)\)", inline, css)

def js(rel):
    return vendor(rel).replace("</script", "<\\/script")

subs = {
    '<link rel="stylesheet" href="../../vendor/katex/katex.min.css">': "<style>" + katex_css() + "</style>",
    '<script src="../../vendor/katex/katex.min.js"></script>': "<script>" + js("katex/katex.min.js") + "</script>",
    '<script src="../../vendor/katex/contrib/auto-render.min.js"></script>': "<script>" + js("katex/contrib/auto-render.min.js") + "</script>",
    '<script src="../../vendor/three/three.min.js"></script>': "<script>" + js("three/three.min.js") + "</script>",
}
for a, b in subs.items():
    assert a in html, a
    html = html.replace(a, b)

html = html.replace("/*APP_JS*/", open(os.path.join(d, "app.js")).read().replace("</script", "<\\/script"))
out = os.path.join(d, "index.html")
open(out, "w").write(html)
print(out, len(html) // 1024, "KB")
