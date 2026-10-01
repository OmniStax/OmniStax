"""The tests of `migrate_concepts`, on the fixture book of test_ost: Chemistry 2e's
book.json, ch01's chapter.json and book-rows.json, and the whole of ch01/1.4,
copied into a temp directory, with a decision file written for ch01."""
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
import migrate_concepts as mc  # noqa: E402
import ost  # noqa: E402

CHEMISTRY = os.path.join(ost.CONTENT, "Chemistry 2e")


def run(*argv):
    buffer = io.StringIO()
    with redirect_stdout(buffer):
        code = mc.main([str(a) for a in argv])
    return buffer.getvalue(), code


class Fixture(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="migrate-test-")
        book = os.path.join(self.dir, "Chemistry 2e")
        os.makedirs(os.path.join(book, "ch01"))
        shutil.copy(os.path.join(CHEMISTRY, "book.json"), book)
        for name in ("chapter.json", "book-rows.json"):
            shutil.copy(os.path.join(CHEMISTRY, "ch01", name), os.path.join(book, "ch01"))
        shutil.copytree(os.path.join(CHEMISTRY, "ch01", "1.4"), os.path.join(book, "ch01", "1.4"))
        self.book = book
        self.patches = [mock.patch.object(ost, "CONTENT", self.dir),
                        mock.patch.object(ost, "LOCK", os.path.join(self.dir, "lock"))]
        for p in self.patches:
            p.start()
        self.write_decision(self.decision())

    def tearDown(self):
        for p in self.patches:
            p.stop()
        shutil.rmtree(self.dir)

    def path(self, *parts):
        return os.path.join(self.book, *parts)

    def read(self, *parts):
        with open(self.path(*parts), encoding="utf-8") as f:
            return f.read()

    def record(self, *parts):
        return json.loads(self.read(*parts))

    def decision(self):
        """A decision for ch01 that passes: every concept kept as it is but density, one new concept."""
        concepts = [c for c in self.record("book.json")["concepts"] if c["section"].startswith("1.")]
        chapter = self.record("ch01", "chapter.json")
        return {
            "chapter": "ch01",
            "kinds": {c["id"]: ("definition" if c["id"] == "density" else c["kind"]) for c in concepts},
            "statements": {"density": "Density is the mass of a substance per unit of its volume."},
            "new": [{"id": "kilogram", "kind": "definition", "section": "1.4", "name": "The kilogram, $\\text{kg}$",
                     "statement": "The kilogram is the SI base unit of mass.", "introduces": "mass",
                     "prereqs": ["si-base-units", "@volume and its units"]}],
            "glossary": {f"{g['section']}/{g['term']}": ("kilogram" if g["term"] == "kilogram (kg)" else "matter")
                         for g in chapter["glossary"]},
            "variables": {f"{v['section']}/{v['sym']}": "@Density" for v in chapter["variables"]},
            "equations": {e["id"]: e.get("concept", "density") for e in chapter["equations"]},
            "edges": [["density", "@The kilogram"]],
        }

    def write_decision(self, decision):
        with open(self.path("ch01", mc.FILE), "w", encoding="utf-8") as f:
            json.dump(decision, f, ensure_ascii=False, indent=1)

    def files(self):
        return {p: self.read(*p) for p in (("book.json",), ("ch01", "chapter.json"), ("ch01", "book-rows.json"),
                                            ("ch01", "1.4", "section.json"))}


class TestCheck(Fixture):
    def test_a_good_file_is_ok(self):
        text, code = run("check", "chemistry-2e", "1")
        self.assertEqual(code, 0, text)
        self.assertTrue(text.startswith("ch01/concept-migration.json: ok · "), text)

    def test_every_problem_is_named(self):
        d = self.decision()
        missing = next(iter(d["kinds"]))
        del d["kinds"][missing]
        d["kinds"]["density"] = "law"
        d["kinds"]["no-such-concept"] = "idea"
        d["glossary"]["1.4/no-such-term"] = "density"
        del d["equations"]["eq-density"]
        d["variables"]["1.4/d"] = "@Nothing by this name"
        d["edges"] = [["volume", "kilogram"], ["volume"]]
        d["new"] += [
            {"id": "volume", "kind": "definition", "section": "1.4", "name": "Volume again", "statement": "s",
             "introduces": "mass", "prereqs": []},
            {"id": "litre", "kind": "definition", "section": "1.4", "name": "The litre", "statement": "s",
             "introduces": "no-such-span", "prereqs": ["@The kilogram", "millilitre"]},
            {"id": "millilitre", "kind": "definition", "section": "1.9", "name": "The kilogram", "statement": "s",
             "introduces": None, "prereqs": ["litre"]},
        ]
        self.write_decision(d)
        text, code = run("check", "chemistry-2e", "ch01")
        self.assertEqual(code, 1)
        for said in (f"kinds misses {missing}",
                     "kinds[density] is 'law'",
                     "kinds[no-such-concept] names no existing concept of ch01",
                     "glossary[1.4/no-such-term] names no glossary row of ch01",
                     "equations misses eq-density",
                     'variables[1.4/d]: "@Nothing by this name" names no concept',
                     "new[volume] collides with the existing concept volume of section 1.4",
                     "new[litre] introduces 'no-such-span', which is no id of 1.4's text",
                     'new[litre] prereq "@The kilogram" is ambiguous: kilogram, millilitre',
                     "new[millilitre] section '1.9' is no section of ch01",
                     "edge volume → kilogram closes a cycle: kilogram already rests on volume",
                     "edges[1] is not a [concept, prereq] pair",
                     "closes a cycle"):
            self.assertIn(said, text)

    def test_a_file_that_does_not_parse_is_one_problem(self):
        with open(self.path("ch01", mc.FILE), "w", encoding="utf-8") as f:
            f.write("{ not json")
        text, code = run("check", "chemistry-2e")
        self.assertEqual(code, 1)
        self.assertIn("does not parse", text)


class TestApply(Fixture):
    def test_apply_writes_every_decision(self):
        text, code = run("apply", "chemistry-2e")
        self.assertEqual(code, 0, text)
        concepts = self.record("book.json")["concepts"]
        ids = [c["id"] for c in concepts]
        density = next(c for c in concepts if c["id"] == "density")
        self.assertEqual((density["kind"], density["statement"]),
                         ("definition", "Density is the mass of a substance per unit of its volume."))
        self.assertNotIn("why", density)
        # the new concept stands after the last concept of its section
        last_of_section = max(i for i, c in enumerate(concepts) if c["section"] == "1.4" and c["id"] != "kilogram")
        self.assertEqual(ids.index("kilogram"), last_of_section + 1)
        edges = {(e["concept"], e["prereq"]) for e in self.record("book.json")["concept_prereqs"]}
        self.assertTrue({("kilogram", "si-base-units"), ("kilogram", "volume"), ("density", "kilogram")} <= edges)
        staged = self.record("ch01", "book-rows.json")
        self.assertIn("kilogram", [c["id"] for c in staged["concepts"]])
        self.assertIn({"concept": "kilogram", "prereq": "volume"}, staged["concept_prereqs"])
        self.assertIn({"concept": "density", "prereq": "kilogram"}, staged["concept_prereqs"])
        coverage = self.record("ch01", "1.4", "section.json")["coverage"]
        self.assertEqual([r for r in coverage if r["concept"] == "kilogram"],
                         [{"span": "mass", "concept": "kilogram", "verb": "introduces"}])
        chapter = self.record("ch01", "chapter.json")
        kg = next(g for g in chapter["glossary"] if g["term"] == "kilogram (kg)")
        self.assertEqual(list(kg)[:3], ["section", "term", "concept"])
        self.assertEqual(kg["concept"], "kilogram")
        self.assertTrue(all(v["concept"] == "density" for v in chapter["variables"]))
        self.assertEqual(next(e for e in chapter["equations"] if e["id"] == "eq-speed")["concept"], "density")

    def test_apply_twice_changes_nothing_the_second_time(self):
        run("apply", "chemistry-2e")
        after = self.files()
        text, code = run("apply", "chemistry-2e")
        self.assertEqual(code, 0, text)
        self.assertIn("nothing to change", text)
        self.assertEqual(self.files(), after)
        text, code = run("check", "chemistry-2e")
        self.assertEqual(code, 0, text)

    def test_a_problem_anywhere_writes_nothing(self):
        before = self.files()
        d = self.decision()
        d["kinds"]["density"] = "law"
        self.write_decision(d)
        text, code = run("apply", "chemistry-2e")
        self.assertEqual(code, 1)
        self.assertIn("nothing written", text)
        self.assertEqual(self.files(), before)

    def test_a_dry_run_writes_nothing(self):
        before = self.files()
        text, code = run("apply", "chemistry-2e", "--dry-run")
        self.assertEqual(code, 0, text)
        self.assertIn("would write book.json", text)
        self.assertEqual(self.files(), before)


if __name__ == "__main__":
    unittest.main()
