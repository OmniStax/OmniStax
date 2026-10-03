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

    def write(self, path, record):
        with open(os.path.join(self.dir, path), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=1, ensure_ascii=False)

    def test_an_ink_row_takes_its_concepts_colour_unless_it_says_null(self):
        self.write("ch01/chapter.json", {**CHAPTER, "variables": CHAPTER["variables"] + [
            {"sym": "y", "concept": "position", "meaning": "m", "section": "1.3"},
            {"sym": "n", "concept": "position", "type": None, "meaning": "a count", "section": "1.3"}]})
        report = bt.Report()
        writes = bt.backfill(self.book, report)
        self.assertEqual(next(c for c in writes[self.book.book_path]["concepts"] if c["id"] == "position")["type"], "position")
        self.assertEqual(report.coloured, ["1.3:y (position)"])
        rows = writes[os.path.join(self.dir, "ch01", "chapter.json")]["variables"]
        self.assertIsNone(rows[-1]["type"])
        self.assertEqual(report.kept["variables: ink against the inherited type"], ["1.3/n (position)"])

    def test_a_result_with_no_symbol_takes_the_type_of_its_own_left_hand_side(self):
        self.write("book.json", {**BOOK,
            "symbols": BOOK["symbols"] + [{"sym": "w", "latex": "w", "type": "force"}, {"sym": "PE_g", "latex": "\\text{PE}_\\text{g}", "type": "energy"},
                                          {"sym": "λ", "latex": "\\lambda", "type": "position"}, {"sym": "λ_dec", "latex": "\\lambda", "type": "rate"}],
            "concepts": BOOK["concepts"] + [
                {"id": "weight", "kind": "result", "section": "1.1", "name": "w", "terms": [], "forms": [{"id": "eq-w", "latex": "w = mg"}]},
                {"id": "pe", "kind": "result", "section": "1.1", "name": "pe", "terms": [], "forms": [{"id": "eq-pe", "latex": "\\text{PE}_{\\text{g}} = mgh"}]},
                {"id": "decay", "kind": "result", "section": "1.1", "name": "d", "terms": [], "forms": [{"id": "eq-d", "latex": "\\lambda = 0.693/t"}]},
                {"id": "second-law", "kind": "result", "section": "1.1", "name": "n2", "terms": [], "forms": [{"id": "eq-n2", "latex": "w = ma"}]}]})
        self.write("ch01/chapter.json", {**CHAPTER, "variables": CHAPTER["variables"] + [
            {"sym": "w", "concept": "weight", "meaning": "m", "section": "1.1"},
            {"sym": "PE_g", "concept": "pe", "meaning": "m", "section": "1.1"},
            {"sym": "λ_dec", "concept": "decay", "meaning": "m", "section": "1.1"}]})
        report = bt.Report()
        concepts = bt.backfill(self.book, report)[self.book.book_path]["concepts"]
        types = {c["id"]: c.get("type") for c in concepts}
        self.assertEqual((types["weight"], types["pe"], types["decay"]), ("force", "energy", "rate"))
        self.assertIsNone(types["second-law"], "a law whose left-hand side is another concept's quantity names none")
        self.assertEqual(report.typed["form"], ["weight", "pe", "decay"])

    def test_a_null_where_nothing_is_inherited_is_removed_and_a_staged_null_is_kept(self):
        self.write("book.json", {**BOOK, "symbols": BOOK["symbols"] + [{"sym": "n", "latex": "n", "type": None}]})
        self.write("ch01/chapter.json", {**CHAPTER, "variables": CHAPTER["variables"] + [
            {"sym": "n", "concept": "newtons-law", "type": None, "meaning": "m", "section": "1.1"},
            {"sym": "y", "concept": "position", "type": None, "meaning": "m", "section": "1.1"}]})
        self.write("ch01/book-rows.json", {"symbols": [{"sym": "θ", "latex": "\\theta", "type": None}]})
        book = bt.backfill(self.book, bt.Report())
        self.assertNotIn("type", next(s for s in book[self.book.book_path]["symbols"] if s["sym"] == "n"))
        rows = book[os.path.join(self.dir, "ch01", "chapter.json")]["variables"]
        self.assertNotIn("type", rows[-2])
        self.assertIsNone(rows[-1]["type"])
        self.assertEqual(book[os.path.join(self.dir, "ch01", "book-rows.json")]["symbols"], [{"sym": "θ", "latex": "\\theta"}],
                         "the staged row follows the book, whose θ inherits nothing")

    def test_a_second_run_finds_nothing(self):
        for path, record in bt.backfill(self.book, bt.Report()).items():
            ost.write_record(path, record)
        self.assertEqual(bt.backfill(self.book, bt.Report()), {})


if __name__ == "__main__":
    unittest.main()
