"""The tests of `apply_links`, on a fixture book copied out of Chemistry 2e:
its book.json and ch01's chapter.json and book-rows.json, whose rows are m, V,
d, t, T (1.4), T_C, T_F, T_K (1.6), v_iron (1.4), V (1.5), T and m (1.6), all
linked."""
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import apply_links as al  # noqa: E402
import ost  # noqa: E402

CHEMISTRY = os.path.join(ost.CONTENT, "Chemistry 2e")


class Fixture(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="links-test-")
        book = os.path.join(self.dir, "Chemistry 2e")
        os.makedirs(os.path.join(book, "ch01"))
        shutil.copy(os.path.join(CHEMISTRY, "book.json"), book)
        for name in ("chapter.json", "book-rows.json"):
            shutil.copy(os.path.join(CHEMISTRY, "ch01", name), os.path.join(book, "ch01"))
        self.book = book
        self.decisions = os.path.join(self.dir, "links")
        os.makedirs(self.decisions)
        self.patches = [mock.patch.object(ost, "CONTENT", self.dir), mock.patch.object(ost, "LOCK", os.path.join(self.dir, "lock"))]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        shutil.rmtree(self.dir)

    def read(self, where):
        with open(os.path.join(self.book, where), encoding="utf-8") as f:
            return f.read()

    def variables(self):
        return json.loads(self.read("ch01/chapter.json"))["variables"]

    def concept(self, cid, where="book.json"):
        return next(c for c in json.loads(self.read(where))["concepts"] if c["id"] == cid)

    def run_tool(self, *argv):
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            code = al.main([str(a) for a in argv])
        return buffer.getvalue(), code

    def links(self, rows, *flags):
        path = os.path.join(self.decisions, "chemistry-2e-ch01.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"book": "chemistry-2e", "chapter": 1, "rows": rows}, f)
        return self.run_tool("links", path, *flags)

    def symbols(self, choices, *flags):
        path = os.path.join(self.decisions, "symbols-chemistry-2e.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(choices, f)
        return self.run_tool("symbols", path, *flags)


class TestLinks(Fixture):
    def test_a_row_is_unlinked_and_relinked_in_place(self):
        text, code = self.links([{"i": 3, "sym": "t", "from": "time", "to": None, "meaning": "time"}])
        self.assertEqual(code, 0, text)
        self.assertNotIn("concept", self.variables()[3])
        self.assertEqual(self.variables()[2]["concept"], "density", "the other rows stay")
        text, code = self.links([{"i": 3, "sym": "t", "from": None, "to": "time"}])
        self.assertEqual(code, 0, text)
        self.assertEqual(list(self.variables()[3])[:2], ["sym", "concept"], "a new link goes after the sym")
        with open(os.path.join(CHEMISTRY, "ch01", "chapter.json"), encoding="utf-8") as f:
            self.assertEqual(self.read("ch01/chapter.json"), f.read(), "the file reads as it did")

    def test_a_second_apply_finds_nothing_to_change(self):
        rows = [{"i": 1, "sym": "V", "from": "volume", "to": "density"}]
        self.links(rows)
        text, code = self.links(rows)
        self.assertEqual(code, 0, text)
        self.assertIn("nothing to change", text)

    def test_a_mismatch_writes_nothing(self):
        before = self.read("ch01/chapter.json")
        for rows, said in [([{"i": 3, "sym": "T", "from": "time", "to": None}], "is 't', not 'T'"),
                           ([{"i": 3, "sym": "t", "from": "mass", "to": None}], "neither 'mass' nor None"),
                           ([{"i": 3, "sym": "t", "from": "time", "to": "no-such"}], "'no-such' names no concept"),
                           ([{"i": 99, "sym": "t", "from": "time", "to": None}], "the chapter has 12 rows")]:
            text, code = self.links([{"i": 0, "sym": "m", "from": "mass", "to": None}] + rows)
            self.assertEqual(code, 1, text)
            self.assertIn(said, text)
        self.assertEqual(self.read("ch01/chapter.json"), before)

    def test_dry_run_writes_nothing(self):
        before = self.read("ch01/chapter.json")
        text, code = self.links([{"i": 3, "sym": "t", "from": "time", "to": None}], "--dry-run")
        self.assertEqual(code, 0, text)
        self.assertIn("would write ch01/chapter.json", text)
        self.assertEqual(self.read("ch01/chapter.json"), before)


class TestSymbols(Fixture):
    def test_a_choice_sets_the_symbol_and_the_staged_rows_follow(self):
        self.links([{"i": i, "sym": sym, "from": "volume", "to": "density"} for i, sym in [(1, "V"), (8, "v_iron"), (9, "V")]])
        text, code = self.symbols({"density": "V"})
        self.assertEqual(code, 0, text)
        self.assertEqual(self.concept("density")["symbol"], "V")
        self.assertEqual(self.concept("density", "ch01/book-rows.json")["symbol"], "V")
        self.assertNotIn("symbol", self.concept("volume"), "volume has no linked row left")

    def test_one_linked_sym_is_the_symbol_and_several_keep_a_linked_one(self):
        self.links([{"i": 3, "sym": "t", "from": "time", "to": None}, {"i": 1, "sym": "V", "from": "volume", "to": "density"}])
        text, code = self.symbols({})
        self.assertEqual(code, 0, text)
        self.assertNotIn("symbol", self.concept("time"))
        self.assertEqual(self.concept("mass")["symbol"], "m")
        self.assertEqual(self.concept("temperature")["symbol"], "T")
        self.assertIn("several linked syms, no choice, kept 'T': temperature (T, T_C, T_F, T_K)", text)
        self.assertIn("several linked syms, no choice, kept 'd': density (V, d)", text)

    def test_several_and_none_linked_is_reported_without_a_symbol(self):
        self.links([{"i": i, "sym": "T", "from": "temperature", "to": None} for i in (4, 10)])
        text, code = self.symbols({})
        self.assertEqual(code, 0, text)
        self.assertNotIn("symbol", self.concept("temperature"))
        self.assertIn("several linked syms, no choice, no symbol: temperature (T_C, T_F, T_K)", text)

    def test_a_new_symbol_goes_after_the_name(self):
        self.links([{"i": i, "sym": "T", "from": "temperature", "to": None} for i in (4, 10)])
        self.symbols({"temperature": "T_K"})
        c = self.concept("temperature")
        self.assertEqual(list(c).index("symbol"), list(c).index("name") + 1)

    def test_a_choice_that_is_not_linked_writes_nothing(self):
        before = self.read("book.json")
        text, code = self.symbols({"density": "m", "no-such": "x"})
        self.assertEqual(code, 1, text)
        self.assertIn("density: 'm' is not a sym linked to it (d)", text)
        self.assertIn("no-such: names no concept", text)
        self.assertEqual(self.read("book.json"), before)

    def test_a_second_apply_finds_nothing_to_change(self):
        self.symbols({"temperature": "T"})
        text, code = self.symbols({"temperature": "T"})
        self.assertEqual(code, 0, text)
        self.assertIn("nothing to change", text)


if __name__ == "__main__":
    unittest.main()
