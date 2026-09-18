"""Production-build browser checks for reader backup locking and recovery.

Run against a served ``dist`` directory, e.g.:
    python3 tests/backup-browser-check.py http://127.0.0.1:4337
"""

import json
import pathlib
import sys
import tempfile
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4337").rstrip("/")
PATH = "/college-physics-2e/ch01/1.1/"


def open_settings(page):
    page.locator("#gear").click()
    page.locator("#settings").wait_for(state="visible")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE + PATH)
    page.wait_for_selector(".shell")

    # Seed records for another book and a pasted-note image. The exporter must
    # scan persisted data rather than only the active Svelte stores.
    page.evaluate("""
      localStorage.setItem('omnistax-theme', 'dark');
      localStorage.setItem('omnistax-notes-other-book', JSON.stringify([{id:'h1',section:'x.1',doc:'text',anchor:{quote:'quoted',prefix:'',suffix:''},color:'blue',text:'note',created:1,updated:2}]));
      localStorage.setItem('omnistax-colours-other-book', JSON.stringify({format:'omnistax-colours',version:1,book:'other-book',order:['length'],overrides:{book:{length:{light:'#112233',dark:'#AABBCC'}},chapters:{},sections:{}}}));
      localStorage.setItem('omnistax-notedocs-v1', JSON.stringify([{id:'n1',name:'My note',body:'![x](asset:a1)',created:1,updated:2}]));
    """)
    page.evaluate("""async () => {
      const db = await new Promise((ok, no) => { const r=indexedDB.open('omnistax-assets',1); r.onupgradeneeded=()=>r.result.createObjectStore('assets',{keyPath:'id'}); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error); });
      await new Promise((ok,no)=>{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({id:'a1',type:'image/png',dataUrl:'data:image/png;base64,AA==',created:1});tx.oncomplete=ok;tx.onerror=()=>no(tx.error)}); db.close();
    }""")

    open_settings(page)
    with page.expect_download() as download_info:
        page.get_by_role("button", name="Export", exact=True).click()
    download = download_info.value
    with tempfile.TemporaryDirectory() as tmp:
        backup_path = pathlib.Path(tmp) / "reader.json"
        download.save_as(backup_path)
        exported = json.loads(backup_path.read_text())
        keys = {record["key"] for record in exported["records"]}
        assert "omnistax-notes-other-book" in keys
        assert "omnistax-colours-other-book" in keys
        assert exported["assets"][0]["id"] == "a1"

        # Import into a genuinely empty profile, without bringing along book
        # caches or installation metadata. Reader backups never install books.
        fresh_context = browser.new_context()
        fresh = fresh_context.new_page()
        fresh_dialogs = []
        fresh.on("dialog", lambda dialog: (fresh_dialogs.append(dialog.message), dialog.accept()))
        fresh.goto(BASE + PATH)
        fresh.wait_for_selector(".shell")
        open_settings(fresh)
        fresh.locator('input[type="file"]').set_input_files(backup_path)
        with fresh.expect_navigation(wait_until="domcontentloaded"):
            fresh.get_by_role("button", name="Replace profile and reload").click()
        fresh.wait_for_selector(".shell")
        assert not fresh_dialogs, fresh_dialogs
        restored_notes = fresh.evaluate("localStorage.getItem('omnistax-notes-other-book')")
        expected_notes = next(r["value"] for r in exported["records"] if r["key"] == "omnistax-notes-other-book")
        assert restored_notes is not None, (restored_notes, expected_notes)
        assert json.loads(restored_notes) == json.loads(expected_notes)
        assert fresh.evaluate("localStorage.getItem('omnistax-theme')") == "dark"
        assert fresh.evaluate("""async () => {
          const db=await new Promise((ok,no)=>{const r=indexedDB.open('omnistax-offline');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
          if (!db.objectStoreNames.contains('installations')) { db.close(); return 0; }
          return new Promise((ok,no)=>{const tx=db.transaction('installations');const r=tx.objectStore('installations').count();r.onsuccess=()=>{db.close();ok(r.result)};r.onerror=()=>no(r.error)});
        }""") == 0
        fresh_context.close()

        # Fail a localStorage write partway through replacement. The journal
        # must recover the prior profile, including the image and removed keys.
        failed_profile = dict(exported)
        failed_profile["records"] = [
            {"key": "omnistax-theme", "category": "appearance", "value": "light"},
            {"key": "omnistax-underlines", "category": "appearance", "value": "0"},
        ]
        failed_path = pathlib.Path(tmp) / "quota.json"
        failed_path.write_text(json.dumps(failed_profile))
        page.locator('input[type="file"]').set_input_files(failed_path)
        page.get_by_role("button", name="Replace profile and reload").wait_for()
        page.evaluate("""() => {
          const original = Storage.prototype.setItem;
          let injected = false;
          Storage.prototype.setItem = function(key, value) {
            if (!injected && key === 'omnistax-underlines' && value === '0') {
              injected = true; throw new DOMException('Injected quota failure', 'QuotaExceededError');
            }
            return original.call(this, key, value);
          };
        }""")
        failure_dialog = []
        page.once("dialog", lambda dialog: (failure_dialog.append(dialog.message), dialog.accept()))
        with page.expect_navigation(wait_until="domcontentloaded"):
            page.get_by_role("button", name="Replace profile and reload").click()
        page.wait_for_selector(".shell")
        assert failure_dialog and "quota" in failure_dialog[0].lower()
        assert page.evaluate("localStorage.getItem('omnistax-theme')") == "dark"
        assert page.evaluate("localStorage.getItem('omnistax-notes-other-book')") is not None
        assert page.evaluate("localStorage.getItem('omnistax-restore-pending')") is None
        open_settings(page)

        # A second initialized tab holds the shared lifetime lock. Import must
        # refuse, force a controlled reload, and leave the profile untouched.
        page.keyboard.press("Escape")
        peer = context.new_page()
        peer.goto(BASE + PATH)
        peer.wait_for_selector(".shell")
        open_settings(page)
        page.locator('input[type="file"]').set_input_files(backup_path)
        page.get_by_role("button", name="Replace profile and reload").wait_for()
        dialog_text = []
        page.once("dialog", lambda dialog: (dialog_text.append(dialog.message), dialog.accept()))
        with page.expect_navigation(wait_until="domcontentloaded"):
            page.get_by_role("button", name="Replace profile and reload").click()
        page.wait_for_selector(".shell")
        assert dialog_text and "other tabs" in dialog_text[0]
        assert page.evaluate("localStorage.getItem('omnistax-theme')") == "dark"

        # With the peer closed, replacement succeeds and note images return.
        peer.close()
        open_settings(page)
        page.locator('input[type="file"]').set_input_files(backup_path)
        with page.expect_navigation(wait_until="domcontentloaded"):
            page.get_by_role("button", name="Replace profile and reload").click()
        page.wait_for_selector(".shell")
        assert page.evaluate("localStorage.getItem('omnistax-notes-other-book')") is not None
        assert page.evaluate("""async () => { const db=await new Promise((ok,no)=>{const r=indexedDB.open('omnistax-assets');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});return await new Promise((ok,no)=>{const tx=db.transaction('assets');const r=tx.objectStore('assets').get('a1');r.onsuccess=()=>ok(r.result?.dataUrl);r.onerror=()=>no(r.error)}) }""") == "data:image/png;base64,AA=="

    # Simulate a crash after a prepared journal changed localStorage. Startup
    # must roll back before eager stores import and then clear the marker.
    page.evaluate("""async () => {
      const before=[{key:'omnistax-theme',value:'light',category:'appearance'}];
      const after=[{key:'omnistax-theme',value:'dark',category:'appearance'}];
      const db=await new Promise((ok,no)=>{const r=indexedDB.open('omnistax-reader-restore',1);r.onupgradeneeded=()=>r.result.createObjectStore('journal',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
      await new Promise((ok,no)=>{const tx=db.transaction('journal','readwrite');tx.objectStore('journal').put({id:'active',state:'prepared',before,after,beforeAssets:[],afterAssets:[]});tx.oncomplete=ok;tx.onerror=()=>no(tx.error)});db.close();
      localStorage.setItem('omnistax-theme','dark');localStorage.setItem('omnistax-restore-pending','1');
    }""")
    page.reload()
    page.wait_for_selector(".shell")
    assert page.evaluate("localStorage.getItem('omnistax-theme')") == "light"
    assert page.evaluate("localStorage.getItem('omnistax-restore-pending')") is None
    assert not errors, errors
    print("reader backup browser check passed")
    browser.close()
