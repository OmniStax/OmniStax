"""The tests of `apply_names`, on a fixture book copied out of Chemistry 2e:
its book.json and ch01's chapter.json and book-rows.json."""
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
import apply_names as an  # noqa: E402
import ost  # noqa: E402

CHEMISTRY = os.path.join(ost.CONTENT, "Chemistry 2e")


class Fixture(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="names-test-")
        book = os.path.join(self.dir, "Chemistry 2e")
        os.makedirs(os.path.join(book, "ch01"))
        shutil.copy(os.path.join(CHEMISTRY, "book.json"), book)
        for name in ("chapter.json", "book-rows.json"):
            shutil.copy(os.path.join(CHEMISTRY, "ch01", name), os.path.join(book, "ch01"))
        self.book = book
        self.patches = [mock.patch.object(ost, "CONTENT", self.dir), mock.patch.object(ost, "LOCK", os.path.join(self.dir, "lock"))]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        shutil.rmtree(self.dir)

    def concept(self, cid, where="book.json"):
        with open(os.path.join(self.book, where), encoding="utf-8") as f:
            return next(c for c in json.load(f)["concepts"] if c["id"] == cid)

    def apply(self, renames):
        path = os.path.join(self.dir, "chemistry-2e-ch01.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"book": "chemistry-2e", "chapter": 1, "renames": renames}, f)
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            code = an.main([path])
        return buffer.getvalue(), code

    def test_a_rename_sets_the_name_and_a_new_formula_becomes_a_form(self):
        density = self.concept("density")
        text, code = self.apply([{"id": "density", "from": density["name"], "name": "Density of matter",
                                  "statement": "Density is mass per volume.", "formula": "\\kd = \\km/\\kV"}])
        self.assertEqual(code, 0, text)
        after = self.concept("density")
        self.assertEqual((after["name"], after["statement"]), ("Density of matter", "Density is mass per volume."))
        self.assertEqual(after["forms"][0], density["forms"][0], "the main form stays first")
        self.assertEqual(after["forms"][-1]["id"], "eq-density-2")
        self.assertEqual(self.concept("density", "ch01/book-rows.json")["name"], "Density of matter", "the staged rows follow")
        self.assertIn("nothing to change", self.apply([{"id": "density", "from": density["name"], "name": "Density of matter",
                                                        "statement": "Density is mass per volume.", "formula": "\\kd = \\km/\\kV"}])[0])

    def test_a_formula_a_form_already_states_adds_nothing(self):
        density = self.concept("density")
        _, code = self.apply([{"id": "density", "from": density["name"], "name": "Density", "formula": density["forms"][0]["latex"]}])
        self.assertEqual(code, 0)
        self.assertEqual(self.concept("density")["forms"], density["forms"])

    def test_a_collision_or_a_stale_name_writes_nothing(self):
        before = self.concept("density")
        text, code = self.apply([{"id": "density", "from": before["name"], "name": self.concept("volume")["name"]}])
        self.assertEqual(code, 1)
        self.assertIn("would all be named", text)
        text, code = self.apply([{"id": "density", "from": "Something else", "name": "Density of matter"}])
        self.assertEqual(code, 1)
        self.assertEqual(self.concept("density"), before)


if __name__ == "__main__":
    unittest.main()
