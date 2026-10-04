"""The referents migration: a row's one `figure` becomes the `figures` that draw it, and nothing else in the file moves."""
import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import migrate_referent_figures as m  # noqa: E402

ORDER = ["sim-road", "sim-subway", "sim-graphs"]
DRAWN = {"sim-road": ["car"], "sim-subway": ["train"], "sim-graphs": ["train", "car"]}

SECTION = """{
 "id": "2.4",
 "figures": [
  {"id": "sim-road", "kind": "sim"},
  {"id": "sim-subway", "kind": "sim"},
  {"id": "sim-graphs", "kind": "sim"}
 ],
 "referents": [
  {
   "id": "train",
   "label": "the subway train",
   "figure": "sim-subway"
  },
  {
   "id": "car",
   "label": "the car",
   "figure": "sim-road"
  }
 ],
 "exercises": [
  {"id": "p1", "prompt": "A train   set by hand",
   "answer": {"type": "open"}}
 ]
}
"""


class MigrateRow(unittest.TestCase):
    def test_the_old_figure_comes_first_then_the_others_in_section_order(self):
        row = {"id": "train", "label": "t", "figure": "sim-subway"}
        self.assertEqual(m.migrate_row(row, ORDER, DRAWN), {"id": "train", "label": "t", "figures": ["sim-subway", "sim-graphs"]})

    def test_a_migrated_row_migrates_to_itself(self):
        row = m.migrate_row({"id": "car", "label": "c", "figure": "sim-road"}, ORDER, DRAWN)
        self.assertEqual(m.migrate_row(row, ORDER, DRAWN), row)

    def test_a_figure_the_scan_misses_is_kept_and_reported(self):
        _, changes = m.migrate_rows("2.4", [{"id": "ra", "label": "r", "figure": "sim-ecg"}], ORDER + ["sim-ecg"], DRAWN)
        self.assertEqual(changes, [m.Change("2.4", "ra", True, (), ("sim-ecg",))])


class Rewrite(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="migrate-test-")
        os.makedirs(os.path.join(self.dir, "ch02", "2.4"))
        self.path = os.path.join(self.dir, "ch02", "2.4", "section.json")
        with open(self.path, "w", encoding="utf-8") as f:
            f.write(SECTION)

    def tearDown(self):
        shutil.rmtree(self.dir)

    def text(self):
        with open(self.path, encoding="utf-8") as f:
            return f.read()

    def test_only_the_referents_change_and_a_second_run_changes_nothing(self):
        changes = m.migrate_book(self.dir, {"2.4": DRAWN}, dry_run=False)
        after = self.text()
        self.assertEqual(json.loads(after)["referents"], [
            {"id": "train", "label": "the subway train", "figures": ["sim-subway", "sim-graphs"]},
            {"id": "car", "label": "the car", "figures": ["sim-road", "sim-graphs"]},
        ])
        self.assertEqual(after[after.index('"exercises"'):], SECTION[SECTION.index('"exercises"'):], "the hand-broken exercise row is untouched")
        self.assertEqual(after[:after.index('"referents"')], SECTION[:SECTION.index('"referents"')])
        self.assertEqual([(c.referent, c.added) for c in changes], [("train", ("sim-graphs",)), ("car", ("sim-graphs",))])
        m.migrate_book(self.dir, {"2.4": DRAWN}, dry_run=False)
        self.assertEqual(self.text(), after)

    def test_a_dry_run_writes_nothing(self):
        m.migrate_book(self.dir, {"2.4": DRAWN}, dry_run=True)
        self.assertEqual(self.text(), SECTION)


if __name__ == "__main__":
    unittest.main()
