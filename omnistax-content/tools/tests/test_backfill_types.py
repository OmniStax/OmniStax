"""The tests of `backfill_types`, on a book of a few rows written to a temp directory."""
import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import backfill_types as bt  # noqa: E402
import ost  # noqa: E402

BOOK = {
    "id": "b", "chapters": ["ch01"],
    "symbols": [
        {"sym": "F", "latex": "F", "type": "force", "macro": "\\kF"},
        {"sym": "x", "latex": "x", "type": "position", "macro": "\\kx"},
        {"sym": "k", "latex": "k", "type": "stiffness"},
        {"sym": "θ", "latex": "\\theta"},
    ],
    "concepts": [
        {"id": "force", "kind": "definition", "section": "1.1", "name": "force", "symbol": "F", "terms": []},
        {"id": "position", "kind": "definition", "section": "1.1", "name": "position", "terms": []},
        {"id": "hookes-law", "kind": "result", "section": "1.1", "name": "Hooke's law", "symbol": "F", "terms": [],
         "forms": [{"id": "eq-hooke", "latex": "F = -kx"}]},
        {"id": "angle", "kind": "definition", "section": "1.1", "name": "angle", "terms": []},
        {"id": "newtons-law", "kind": "axiom", "section": "1.1", "name": "N", "terms": []},
    ],
}
CHAPTER = {"id": "1", "dir": "ch01", "variables": [
    {"sym": "x", "concept": "position", "type": "position", "meaning": "m", "section": "1.1"},
    {"sym": "x", "concept": "position", "type": "position", "meaning": "m", "section": "1.2"},
    {"sym": "θ", "concept": "angle", "meaning": "m", "section": "1.1"},
    {"sym": "k", "type": "stiffness", "meaning": "m", "section": "1.1"},
]}


class TestBackfill(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="backfill-test-")
        os.makedirs(os.path.join(self.dir, "ch01"))
        for path, record in (("book.json", BOOK), ("ch01/chapter.json", CHAPTER)):
            with open(os.path.join(self.dir, path), "w", encoding="utf-8") as f:
                json.dump(record, f, indent=1, ensure_ascii=False)
        self.book = ost.Book("b", self.dir)

    def tearDown(self):
        shutil.rmtree(self.dir)

    def test_types_concepts_and_strips_what_they_now_say(self):
        report = bt.Report()
        writes = bt.backfill(self.book, report)
        book = writes[self.book.book_path]
        types = {c["id"]: c.get("type") for c in book["concepts"]}
        self.assertEqual(types, {"force": "force", "position": "position", "hookes-law": "force", "angle": None, "newtons-law": None})
        self.assertEqual(report.typed, {"symbol": ["force"], "variables": ["position"], "result": ["hookes-law"]})
        self.assertNotIn("type", next(s for s in book["symbols"] if s["sym"] == "F"))
        self.assertEqual(next(s for s in book["symbols"] if s["sym"] == "k")["type"], "stiffness")
        rows = writes[os.path.join(self.dir, "ch01", "chapter.json")]["variables"]
        self.assertEqual([v.get("type") for v in rows], [None, None, None, "stiffness"])
        self.assertEqual(list(next(c for c in book["concepts"] if c["id"] == "force")), ["id", "kind", "section", "name", "symbol", "terms", "type"])

    def test_a_concept_whose_type_would_colour_ink_stays_untyped(self):
        chapter = {**CHAPTER, "variables": CHAPTER["variables"] + [{"sym": "y", "concept": "position", "meaning": "m", "section": "1.3"}]}
        with open(os.path.join(self.dir, "ch01", "chapter.json"), "w", encoding="utf-8") as f:
            json.dump(chapter, f)
        report = bt.Report()
        book = bt.backfill(self.book, report)[self.book.book_path]
        self.assertIsNone(next(c for c in book["concepts"] if c["id"] == "position").get("type"))
        self.assertEqual(report.ink, ["position (position): variables row 1.3/y is in ink"])

    def test_a_second_run_finds_nothing(self):
        for path, record in bt.backfill(self.book, bt.Report()).items():
            ost.write_record(path, record)
        self.assertEqual(bt.backfill(self.book, bt.Report()), {})


if __name__ == "__main__":
    unittest.main()
