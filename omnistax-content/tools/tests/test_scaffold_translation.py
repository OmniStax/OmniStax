"""The tests of `scaffold_translation`, on a fixture book copied out of College
Physics 2e: its book.json, RULES.md, COLOR.md, its tools, and the whole of
ch01 with a stand-in media/ folder, so that the scaffold reads a real book and
no test ever touches the books themselves. The app's checker is mocked."""
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import ost  # noqa: E402
import scaffold_translation as st  # noqa: E402

PHYSICS = os.path.join(ost.CONTENT, "College Physics 2e")
NO_FINDINGS = (0, ["no errors"])


def run(*argv):
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = st.main([str(a) for a in argv])
    return out.getvalue() + err.getvalue(), code


class Fixture(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="scaffold-test-")
        self.source = os.path.join(self.dir, "College Physics 2e")
        os.makedirs(os.path.join(self.source, "tools"))
        for name in ("book.json", "RULES.md", "COLOR.md"):
            shutil.copy(os.path.join(PHYSICS, name), self.source)
        for name in ("mergebook.py", "merge-state.json", "cnxml2md.py"):
            shutil.copy(os.path.join(PHYSICS, "tools", name), os.path.join(self.source, "tools"))
        shutil.copytree(os.path.join(PHYSICS, "ch01"), os.path.join(self.source, "ch01"))
        os.makedirs(os.path.join(self.source, "media", "ch01"))
        open(os.path.join(self.source, "media", "ch01", "a.jpg"), "wb").close()
        self.target = os.path.join(self.dir, "College Physics 2e (zh-CN)")
        self.patches = [mock.patch.object(ost, "CONTENT", self.dir), mock.patch.object(ost, "LOCK", os.path.join(self.dir, "lock")),
                        mock.patch.object(ost, "run_checker", mock.Mock(return_value=NO_FINDINGS))]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        shutil.rmtree(self.dir)

    def scaffold(self, *extra, chapters=("ch01",)):
        return run("new", "--source", self.source, "--target", self.target, "--tag", "zh-CN",
                   "--id", "college-physics-2e-zh-cn", "--title", "大学物理（第2版）", "--translator", "claude-opus-5-5",
                   "--effort", "medium", "--date", "2026-10-22", "--glossary", "glossary.zh-CN.json",
                   "--chapters", *chapters, *extra)

    def read(self, *parts):
        with open(os.path.join(self.target, *parts), encoding="utf-8") as f:
            return json.load(f) if parts[-1].endswith(".json") else f.read()

    def test_the_book_keeps_every_table_and_gains_its_provenance(self):
        text, code = self.scaffold("--authority", "None official", "--authority-url", "https://example.org/")
        self.assertEqual(code, 0, text)
        with open(os.path.join(self.source, "book.json"), encoding="utf-8") as f:
            source = json.load(f)
        book = self.read("book.json")
        self.assertEqual((book["id"], book["title"], book["chapters"]), ("college-physics-2e-zh-cn", "大学物理（第2版）", ["ch01"]))
        self.assertEqual((book["language"], book["translation_of"]), ("zh-CN", "college-physics-2e"))
        t = book["translation"]
        self.assertEqual((t["translator"], t["effort"], t["date"], t["glossary"], t["authority"], t["authority_url"]),
                         ("claude-opus-5-5", "medium", "2026-10-22", "glossary.zh-CN.json", "None official", "https://example.org/"))
        keys = list(book)
        self.assertEqual(keys.index("language"), keys.index("openstax") + 1, "the new fields stand after openstax")
        for table in ("types", "symbols", "exercise_kinds", "concepts", "concept_prereqs", "highlights", "colours"):
            self.assertEqual(book.get(table), source.get(table), table)

    def test_the_pages_are_copied_and_the_working_files_are_not(self):
        self.assertEqual(self.scaffold()[1], 0)
        for page in ("intro", "1.1", "1.2", "1.3", "1.4"):
            for name in ("section.json", "text.html"):
                with open(os.path.join(self.source, "ch01", page, name), encoding="utf-8") as f:
                    self.assertEqual(self.read("ch01", page, name), f.read() if name.endswith(".html") else json.loads(f.read()))
            for name in ("source.md", "plan.md"):
                self.assertFalse(os.path.exists(os.path.join(self.target, "ch01", page, name)), name)
        self.assertTrue(os.path.exists(os.path.join(self.target, "ch01", "1.1", "figures.js")))
        self.assertFalse(os.path.exists(os.path.join(self.target, "ch01", "intro", "figures.js")), "nothing is invented")
        for name in ("exploration.md", "book-rows.json", "concept-migration.json"):
            self.assertFalse(os.path.exists(os.path.join(self.target, "ch01", name)), name)
        self.assertFalse(os.path.exists(os.path.join(self.target, "media")))
        self.assertFalse(os.path.exists(os.path.join(self.target, "tools", "cnxml2md.py")))
        self.assertTrue(os.path.exists(os.path.join(self.target, "tools", "mergebook.py")))
        self.assertIn("## Forced scenarios", self.read("ch01", "config.md"))
        self.assertNotIn("Proposed by the agent after exploration", self.read("ch01", "config.md"), "the source's config is not copied")

    def test_the_new_files_are_written_empty(self):
        self.assertEqual(self.scaffold()[1], 0)
        self.assertEqual(self.read("glossary.zh-CN.json"), {"language": "zh-CN", "authorities": [st.TERMONLINE], "terms": []})
        self.assertTrue(self.read("RULES.md").rstrip().endswith("every id stays the source's."))
        self.assertIn("\n## Translation\n", self.read("RULES.md"))
        self.assertIn("### Pass 1 (2026-10-22): scaffold", self.read("LOG.md"))
        self.assertIn("| File | Span or line |", self.read("translation-notes.md"))

    def test_a_second_scaffold_or_an_unknown_chapter_writes_nothing(self):
        text, code = self.scaffold(chapters=("ch01", "ch99"))
        self.assertEqual(code, 1)
        self.assertIn("no chapter ch99", text)
        self.assertFalse(os.path.exists(self.target))
        self.assertEqual(self.scaffold()[1], 0)
        text, code = self.scaffold()
        self.assertEqual(code, 1)
        self.assertIn("exists already", text)

    def test_labels_replace_only_the_rows_they_name(self):
        self.assertEqual(self.scaffold()[1], 0)
        before = self.read("book.json")
        path = os.path.join(self.dir, "labels.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"title": "大学物理", "types": {"time": "时间"}, "exercise_kinds": {"problem": "习题"},
                       "chapters": {"ch01": "引言：科学与物理学的本质"}}, f, ensure_ascii=False)
        text, code = run("labels", "college-physics-2e-zh-cn", path)
        self.assertEqual(code, 0, text)
        after = self.read("book.json")
        self.assertEqual(after["title"], "大学物理")
        self.assertEqual(next(t for t in after["types"] if t["id"] == "time")["label"], "时间")
        self.assertEqual([t for t in after["types"] if t["id"] != "time"], [t for t in before["types"] if t["id"] != "time"])
        self.assertEqual(next(k for k in after["exercise_kinds"] if k["id"] == "problem")["label"], "习题")
        self.assertEqual(after["concepts"], before["concepts"])
        self.assertEqual(self.read("ch01", "chapter.json")["title"], "引言：科学与物理学的本质")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"types": {"no-such-type": "x"}}, f)
        text, code = run("labels", "college-physics-2e-zh-cn", path)
        self.assertEqual(code, 1)
        self.assertIn("no row no-such-type", text)
        self.assertEqual(self.read("book.json"), after)


if __name__ == "__main__":
    unittest.main()
