"""The tests of `ost`, run with

    python3 -m unittest discover omnistax-content/tools/tests

A fixture book is copied out of Chemistry 2e — its book.json, ch01/chapter.json
and the whole of ch01/1.4 — into a temp directory, so that the tests read and
write real rows and no test ever touches the books themselves. The app's checker
is the one thing that is mocked: it is node, it is slow, and what a test wants to
know is that a write calls it and prints only what it says about the file.
"""
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
import ost  # noqa: E402

CONTENT = ost.CONTENT
CHEMISTRY = os.path.join(CONTENT, "Chemistry 2e")
NO_FINDINGS = (0, ["Chemistry 2e (chemistry-2e)", "", "1 chapters, 1 sections, 12 checks, no errors"])


def run(*argv):
    """The command as the shell runs it: what it printed and what it returned."""
    buffer = io.StringIO()
    with redirect_stdout(buffer):
        code = ost.main([str(a) for a in argv])
    return buffer.getvalue(), code


class Fixture(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="ost-test-")
        book = os.path.join(self.dir, "Chemistry 2e")
        os.makedirs(os.path.join(book, "ch01"))
        shutil.copy(os.path.join(CHEMISTRY, "book.json"), book)
        shutil.copy(os.path.join(CHEMISTRY, "ch01", "chapter.json"), os.path.join(book, "ch01"))
        shutil.copytree(os.path.join(CHEMISTRY, "ch01", "1.4"), os.path.join(book, "ch01", "1.4"))
        self.book = book
        self.section = os.path.join(book, "ch01", "1.4", "section.json")
        self.patches = [mock.patch.object(ost, "CONTENT", self.dir),
                        mock.patch.object(ost, "run_checker", mock.Mock(return_value=NO_FINDINGS))]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        shutil.rmtree(self.dir)

    def read(self, path):
        with open(path, encoding="utf-8") as f:
            return f.read()

    def rows(self, table, path=None):
        return json.loads(self.read(path or self.section))[table]


class TestReading(Fixture):
    def test_books_names_the_fixture(self):
        text, code = run("books")
        self.assertEqual(code, 0)
        self.assertIn("chemistry-2e · Chemistry 2e", text)

    def test_rows_filters_a_book_table_by_section(self):
        text, code = run("rows", "chemistry-2e", "concepts", "--where", "section=1.4")
        self.assertEqual(code, 0)
        self.assertEqual(len(text.strip().splitlines()), 22)
        self.assertTrue(all(" · 1.4 · " in ln for ln in text.strip().splitlines()))

    def test_rows_reads_only_the_section_it_is_given(self):
        text, _ = run("rows", "chemistry-2e", "coverage", "--section", "1.4", "--where", "verb=introduces")
        self.assertIn("density · density · introduces", text)
        self.assertNotIn("uses", text)

    def test_rows_matches_a_substring_and_projects_fields(self):
        text, _ = run("rows", "chemistry-2e", "concepts", "--chapter", "1",
                      "--where", "terms~densit", "--fields", "id,symbol")
        self.assertEqual(text.strip(), "density · d")

    def test_forms_are_a_table_of_their_own(self):
        text, code = run("rows", "chemistry-2e", "forms", "--section", "1.4", "--fields", "id,concept,section")
        self.assertEqual(code, 0)
        self.assertEqual(text.strip(), "eq-density · density · 1.4")

    def test_rows_json_is_the_rows_as_they_sit_on_disk(self):
        text, _ = run("rows", "chemistry-2e", "figures", "--section", "1.4", "--json")
        self.assertEqual(json.loads(text), self.rows("figures"))

    def test_rows_refuses_a_section_table_with_no_section(self):
        self.assertEqual(run("rows", "chemistry-2e", "coverage")[1], 1)

    def test_find_says_where_each_hit_lives(self):
        text, code = run("find", "chemistry-2e", "displacement")
        self.assertEqual(code, 0)
        self.assertIn("book.json concepts[1.4] · measure-volume-by-displacement", text)
        self.assertIn("1.4/section.json figures · sim-displacement", text)

    def test_meanings_lists_every_row_of_a_symbol(self):
        text, code = run("meanings", "chemistry-2e", "V")
        self.assertEqual(code, 0)
        self.assertEqual(text.strip(), "1.4 · volume · the volume of a sample, the amount of space it occupies")
        self.assertIn("no variables row", run("meanings", "chemistry-2e", "nothing")[0])

    def test_show_book_chapter_and_section(self):
        book, _ = run("show", "chemistry-2e")
        self.assertIn("Chemistry 2e (chemistry-2e)", book)
        self.assertIn("ch01 · chapter 1 · Essential Ideas", book)
        chapter, _ = run("show", "chemistry-2e", "1")
        self.assertIn("1.4 · built · Measurements", chapter)
        self.assertIn("1.1 · unbuilt", chapter)
        section, _ = run("show", "chemistry-2e", "1", "1.4")
        self.assertIn("figure sim-density · sim · draws mass, volume", section)
        self.assertIn("concept density · 1 introduces, 3 uses", section)
        self.assertIn("exercises: 2 check-your-learning", section)

    def test_ids_are_the_ids_of_the_text(self):
        text, code = run("ids", "chemistry-2e", "1.4")
        self.assertEqual(code, 0)
        self.assertIn("three-parts", text.splitlines())
        self.assertIn("density", text.splitlines())


class TestFormatting(Fixture):
    def test_a_round_trip_of_every_file_is_byte_identical(self):
        for path in (os.path.join(self.book, "book.json"),
                     os.path.join(self.book, "ch01", "chapter.json"), self.section):
            raw = self.read(path)
            self.assertEqual(ost.dumps_like(json.loads(raw), raw), raw, path)

    def test_a_write_keeps_the_form_of_the_file(self):
        before = self.read(self.section)
        run("add", "chemistry-2e", "coverage", "--section", "1.4",
            '{"span": "density", "concept": "volume", "verb": "reinforces"}')
        after = self.read(self.section)
        # the new row is set inline, as the table's other rows are, and nothing else moved
        self.assertIn('  { "span": "density", "concept": "volume", "verb": "reinforces" }\n', after)
        self.assertEqual(after.count("\n"), before.count("\n") + 1)
        # and taking it away again leaves the file byte for byte as it was
        run("del", "chemistry-2e", "coverage", "density/volume/reinforces", "--section", "1.4")
        self.assertEqual(self.read(self.section), before)


class TestWriting(Fixture):
    def test_add_lands_and_runs_the_checker(self):
        text, code = run("add", "chemistry-2e", "coverage", "--section", "1.4",
                         '{"span": "density", "concept": "volume", "verb": "reinforces"}')
        self.assertEqual(code, 0)
        self.assertIn("1.4/section.json coverage now has 40 rows", text)
        self.assertIn("ok", text)
        ost.run_checker.assert_called_once_with("chemistry-2e")
        self.assertIn({"span": "density", "concept": "volume", "verb": "reinforces"}, self.rows("coverage"))

    def test_add_refuses_a_duplicate_id(self):
        before = self.read(self.section)
        text, code = run("add", "chemistry-2e", "figures", "--section", "1.4",
                         '{"id": "sim-density", "kind": "sim"}')
        self.assertEqual(code, 1)
        self.assertEqual(self.read(self.section), before)

    def test_add_refuses_an_unknown_field_and_a_missing_one(self):
        self.assertEqual(run("add", "chemistry-2e", "figures", "--section", "1.4",
                             '{"id": "f", "kind": "sim", "colour": "red"}')[1], 1)
        self.assertEqual(run("add", "chemistry-2e", "figures", "--section", "1.4", '{"id": "f"}')[1], 1)
        self.assertEqual(run("add", "chemistry-2e", "figures", "--section", "1.4",
                             '{"id": "f", "kind": "drawing"}')[1], 1)
        self.assertEqual(self.rows("figures"), json.loads(self.read(self.section))["figures"])

    def test_set_merges_fields_into_the_row(self):
        text, code = run("set", "chemistry-2e", "figures", "sim-density", "--section", "1.4",
                         '{"number": "1.26", "draws": ["mass", "volume", "time"]}')
        self.assertEqual(code, 0)
        row = next(f for f in self.rows("figures") if f["id"] == "sim-density")
        self.assertEqual(row["number"], "1.26")
        self.assertEqual(row["draws"], ["mass", "volume", "time"])
        self.assertEqual(row["kind"], "sim")

    def test_set_replace_puts_a_whole_row_in_its_place(self):
        run("set", "chemistry-2e", "figures", "sim-density", "--section", "1.4", "--replace",
            '{"id": "sim-density", "kind": "figure"}')
        row = next(f for f in self.rows("figures") if f["id"] == "sim-density")
        self.assertEqual(row, {"id": "sim-density", "kind": "figure"})

    def test_del_removes_one_row_named_by_its_key(self):
        run("del", "chemistry-2e", "coverage", "three-parts/scientific-notation/introduces", "--section", "1.4")
        self.assertEqual(len(self.rows("coverage")), 38)
        self.assertEqual(run("del", "chemistry-2e", "coverage", "nowhere", "--section", "1.4")[1], 1)

    def test_a_book_table_is_never_written_by_hand(self):
        before = self.read(os.path.join(self.book, "book.json"))
        with mock.patch.object(ost, "merge_chapter") as merge:
            text, code = run("add", "chemistry-2e", "concepts", "--chapter", "1",
                             '{"id": "unit-conversion", "kind": "skill", "section": "1.4", "name": "Converting units"}')
        self.assertEqual(code, 0)
        merge.assert_called_once()
        self.assertIn("ch01/book-rows.json concepts now has", text)
        self.assertEqual(self.read(os.path.join(self.book, "book.json")), before)
        staged = json.loads(self.read(os.path.join(self.book, "ch01", "book-rows.json")))
        self.assertIn("unit-conversion", [c["id"] for c in staged["concepts"]])
        self.assertEqual(len([c for c in staged["concepts"] if c["section"] == "1.4"]), 23)

    def test_a_form_is_staged_on_its_concept_and_can_be_made_main(self):
        with mock.patch.object(ost, "merge_chapter") as merge:
            text, code = run("add", "chemistry-2e", "forms",
                             '{"concept": "density", "id": "eq-mass-from-density", "latex": "m = dV", "section": "1.4", "main": true}')
        self.assertEqual(code, 0)
        merge.assert_called_once()
        self.assertIn("ch01/book-rows.json density now has 2 forms", text)
        staged = json.loads(self.read(os.path.join(self.book, "ch01", "book-rows.json")))
        density = next(c for c in staged["concepts"] if c["id"] == "density")
        self.assertEqual([f["id"] for f in density["forms"]], ["eq-mass-from-density", "eq-density"])
        self.assertEqual(density["forms"][0], {"id": "eq-mass-from-density", "latex": "m = dV"})
        self.assertEqual(run("add", "chemistry-2e", "forms", '{"concept": "density", "id": "eq-density", "latex": "x"}')[1], 1)
        self.assertEqual(run("set", "chemistry-2e", "forms", "eq-density", '{"concept": "volume"}')[1], 1)

    def test_referents_are_a_section_table_like_figures(self):
        text, code = run("add", "chemistry-2e", "referents", "--section", "1.4",
                         '{"id": "block-1", "label": "the first block", "figure": "sim-density", "type": "mass"}')
        self.assertEqual(code, 0)
        self.assertEqual(self.rows("referents"), [{"id": "block-1", "label": "the first block", "figure": "sim-density", "type": "mass"}])
        run("set", "chemistry-2e", "referents", "block-1", "--section", "1.4", '{"label": "block 1"}')
        self.assertIn("block-1 · block 1 · sim-density · mass", run("rows", "chemistry-2e", "referents", "--section", "1.4")[0])
        self.assertIn("referent block-1 · block 1 · in sim-density · mass", run("show", "chemistry-2e", "1.4")[0])
        self.assertEqual(run("add", "chemistry-2e", "referents", "--section", "1.4", '{"id": "b", "label": "b"}')[1], 1)
        run("del", "chemistry-2e", "referents", "block-1", "--section", "1.4")
        self.assertEqual(self.rows("referents"), [])

    def test_a_concept_takes_a_type(self):
        with mock.patch.object(ost, "merge_chapter"):
            self.assertEqual(run("set", "chemistry-2e", "concepts", "density", "--chapter", "1", '{"type": "density"}')[1], 0)
        staged = json.loads(self.read(os.path.join(self.book, "ch01", "book-rows.json")))
        self.assertEqual(next(c for c in staged["concepts"] if c["id"] == "density")["type"], "density")

    def test_a_null_type_sets_a_row_in_ink_and_unset_takes_the_override_away(self):
        chapter = os.path.join(self.book, "ch01", "chapter.json")
        row = next(v for v in self.rows("variables", chapter) if v["section"] == "1.4")
        key = f"1.4/{row['sym']}"
        self.assertEqual(run("set", "chemistry-2e", "variables", key, "--chapter", "1", '{"type": null}')[1], 0)
        self.assertIsNone(next(v for v in self.rows("variables", chapter) if v["section"] == "1.4" and v["sym"] == row["sym"])["type"])
        self.assertIn(f"1.4 · - · {row['meaning']}", run("meanings", "chemistry-2e", row["sym"])[0])
        self.assertEqual(run("set", "chemistry-2e", "variables", key, "--chapter", "1", "--unset", "type", "{}")[1], 0)
        self.assertNotIn("type", next(v for v in self.rows("variables", chapter) if v["section"] == "1.4" and v["sym"] == row["sym"]))

    def test_null_on_a_field_that_cannot_be_null_drops_it_on_set_and_is_refused_on_add(self):
        run("set", "chemistry-2e", "figures", "sim-density", "--section", "1.4", '{"number": "1.26"}')
        run("set", "chemistry-2e", "figures", "sim-density", "--section", "1.4", '{"number": null}')
        self.assertNotIn("number", next(f for f in self.rows("figures") if f["id"] == "sim-density"))
        self.assertEqual(run("add", "chemistry-2e", "figures", "--section", "1.4", '{"id": "f", "kind": "sim", "number": null}')[1], 1)

    def test_a_book_table_no_chapter_stages_is_refused(self):
        self.assertEqual(run("add", "chemistry-2e", "sheets", "--chapter", "1",
                             '{"id": "s", "title": "S", "kind": "table", "file": "sheets/s.json"}')[1], 1)

    def test_a_write_reports_only_what_the_checker_says_about_the_file(self):
        ost.run_checker.return_value = (1, [
            "Chemistry 2e (chemistry-2e)", "", "2 errors",
            "  1.4/section.json coverage[density]  concept \"volume\" names no row",
            "  1.6/section.json coverage[rounding]  concept \"sig-figs\" names no row",
            "", "1 chapters, 1 sections, 12 checks, 2 errors"])
        text, code = run("add", "chemistry-2e", "coverage", "--section", "1.4",
                         '{"span": "density", "concept": "volume", "verb": "reinforces"}')
        self.assertEqual(code, 1)
        self.assertIn("1.4/section.json coverage[density]", text)
        self.assertNotIn("1.6/section.json", text)


if __name__ == "__main__":
    unittest.main()
