#!/usr/bin/env python3
"""Build the static site: experiment/site/.

Reads book.json, each chapter's chapter.json / concepts.json / formulas.json, and each built
section's section.json, text.html, figures.js, exercises.json. Emits per section a full page
(index.html) and a fragment (doc.html), plus figures.js; per chapter the data files; the book
manifest; and the shared assets. Math is pre-rendered with KaTeX via tools/prerender_math.js.
"""
import sys, os, re, json, shutil, subprocess, html as H

EXP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(EXP, 'site')
SHELL = os.path.join(EXP, 'shell')
VENDOR = os.path.join(EXP, 'vendor')
J = lambda *p: os.path.join(*p)
read = lambda p: open(p, encoding='utf-8').read()
def write(p, s): os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8').write(s)
def jload(p): return json.load(open(p, encoding='utf-8'))
def jstr(o): return json.dumps(o, ensure_ascii=False).replace('</', '<\\/')

book = jload(J(EXP, 'book.json'))
macros = jload(J(SHELL, 'macros.json'))

def prerender(html):
    r = subprocess.run(['node', J(EXP, 'tools', 'prerender_math.js')], input=html, capture_output=True, text=True, check=True)
    return r.stdout

def qualify(html, sec):
    html = re.sub(r'\bid="([^"]+)"', lambda m: f'id="{sec}-{m.group(1)}"', html)
    html = re.sub(r'href="#([^"]+)"', lambda m: f'href="#{sec}-{m.group(1)}"', html)
    return html

def fragment(ch, sec, meta, text, exercises):
    sid = sec['id']
    t = f'<article data-doc="{sid}/text" data-sec="{sid}" data-title="{sid} Text" data-math="rendered">\n'
    t += f'<div class="eyebrow">Chapter {ch["id"]} · {H.escape(ch["title"])} · {sid}</div>\n<h1>{H.escape(meta["title"])}</h1>\n'
    t += f'<p class="lead">{meta["lead"]}</p>\n' + prerender(qualify(text, sid))
    t += f'\n<div class="footer">Text: {book["publisher"]}, <em>{book["title"]}</em>, section {sid}, {book["license"]}. Demos, concept map and suggestions marked AI: OmniStax. {meta.get("notes","")}</div>\n</article>\n'
    t += f'<article data-doc="{sid}/exercises" data-sec="{sid}" data-title="{sid} Exercises">\n<section id="{sid}-exercises">\n<h2>Problems &amp; Exercises</h2>\n'
    t += '<div class="exercises" data-place="end"></div>\n</section>\n</article>\n'
    data = {'section': meta, 'exercises': exercises['exercises']}
    t += f'<script type="application/json" data-section="{sid}">{jstr(data)}</script>\n'
    return t

manifest = {'id': book['id'], 'title': book['title'], 'publisher': book['publisher'], 'license': book['license'], 'openstax': book['openstax'], 'chapters': []}
pages = []
for chdir in book['chapters']:
    ch = jload(J(EXP, chdir, 'chapter.json'))
    concepts = jload(J(EXP, chdir, 'concepts.json')); formulas = jload(J(EXP, chdir, 'formulas.json'))
    mch = {'id': ch['id'], 'dir': chdir, 'title': ch['title'], 'concepts': f'{book["id"]}/{chdir}/concepts.json', 'formulas': f'{book["id"]}/{chdir}/formulas.json', 'sections': []}
    for sec in ch['sections']:
        sdir = J(EXP, chdir, sec['id']); built = os.path.exists(J(sdir, 'text.html'))
        ms = {'id': sec['id'], 'title': sec['title'], 'module': sec['module'], 'openstax': book['openstax'] + sec['slug'], 'built': built}
        if built:
            base = f'{book["id"]}/{chdir}/{sec["id"]}/'
            ms.update({'url': base, 'fragment': base + 'doc.html', 'figures': base + 'figures.js', 'short': jload(J(sdir, 'section.json')).get('short', sec['title'])})
            pages.append((ch, sec, sdir, base, concepts, formulas))
        mch['sections'].append(ms)
    manifest['chapters'].append(mch)
    write(J(SITE, book['id'], chdir, 'concepts.json'), jstr(concepts))
    write(J(SITE, book['id'], chdir, 'formulas.json'), jstr(formulas))
write(J(SITE, book['id'], 'book.json'), jstr(manifest))

tpl = read(J(SHELL, 'page.html'))
allsecs = [s for c in manifest['chapters'] for s in c['sections'] if s['built']]
for ch, sec, sdir, base, concepts, formulas in pages:
    meta = jload(J(sdir, 'section.json')); text = read(J(sdir, 'text.html')); ex = jload(J(sdir, 'exercises.json'))
    frag = fragment(ch, sec, meta, text, ex)
    write(J(SITE, base, 'doc.html'), frag)
    shutil.copy(J(sdir, 'figures.js'), J(SITE, base, 'figures.js'))
    root = '../' * (base.count('/'))
    i = [s['id'] for s in allsecs].index(sec['id'])
    prevnext = ''
    if i > 0: prevnext += f'<link rel="prev" href="{root}{allsecs[i-1]["url"]}">\n'
    if i < len(allsecs) - 1: prevnext += f'<link rel="next" href="{root}{allsecs[i+1]["url"]}">\n'
    desc = 'By the end of this section, you will be able to: ' + ' '.join(meta['objectives'])
    ld = {'@context': 'https://schema.org', '@type': 'LearningResource', 'name': meta['title'], 'description': desc, 'isPartOf': {'@type': 'Book', 'name': book['title'], 'publisher': book['publisher']},
          'license': 'https://creativecommons.org/licenses/by-nc-sa/4.0/', 'educationalLevel': 'Undergraduate', 'learningResourceType': 'Interactive textbook section', 'teaches': [c['name'] for c in concepts['concepts'] if c.get('section') == sec['id'] and not c.get('placeholder')]}
    page = tpl
    for k, v in {'BOOK': book['id'], 'CHAPTER_DIR': ch['dir'], 'SECTION': sec['id'], 'TITLE': f'{sec["id"]} {meta["title"]} · {book["title"]}', 'DESCRIPTION': H.escape(desc, quote=True),
                 'CANONICAL': book['base_url'] + base, 'PREVNEXT': prevnext.strip(), 'ROOT': root, 'LDJSON': jstr(ld), 'SECTION_TITLE': H.escape(meta['title']), 'BOOK_TITLE': book['title'], 'CHAPTER': ch['id'],
                 'FRAGMENT': frag, 'BOOK_JSON': jstr(manifest), 'CONCEPTS_JSON': jstr(concepts), 'FORMULAS_JSON': jstr(formulas)}.items():
        page = page.replace('{{' + k + '}}', v)
    assert '{{' not in page, re.findall(r'\{\{\w+\}\}', page)
    write(J(SITE, base, 'index.html'), page)
    print(base, len(page) // 1024, 'KB')

# shared assets
A = J(SITE, 'assets'); os.makedirs(J(A, 'katex', 'contrib'), exist_ok=True)
shutil.copy(J(SHELL, 'shell.css'), J(A, 'shell.css')); shutil.copy(J(SHELL, 'shell.js'), J(A, 'shell.js'))
write(J(A, 'figlib.js'), read(J(SHELL, 'figlib.js')).replace('/*MACROS_JSON*/{}', json.dumps(macros)))
for f in ['katex.min.css', 'katex.min.js']: shutil.copy(J(VENDOR, 'katex', f), J(A, 'katex', f))
shutil.copy(J(VENDOR, 'katex', 'contrib', 'auto-render.min.js'), J(A, 'katex', 'contrib', 'auto-render.min.js'))
if os.path.exists(J(A, 'katex', 'fonts')): shutil.rmtree(J(A, 'katex', 'fonts'))
shutil.copytree(J(VENDOR, 'katex', 'fonts'), J(A, 'katex', 'fonts'))
shutil.copy(J(VENDOR, 'three', 'three.min.js'), J(A, 'three.min.js'))
write(J(SITE, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=' + pages[0][3] + '"><a href="' + pages[0][3] + '">OmniStax</a>')
print('site ->', SITE)
