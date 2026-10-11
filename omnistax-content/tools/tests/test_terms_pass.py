"""The tests of `terms_pass`, on a one-section fixture book."""
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
import terms_pass as tp  # noqa: E402

TEXT = """<p>Wait a second: the <span data-concept="second">second</span> is a unit, and a restoring
force pulls back.</p>
<h2>The second</h2>
<p>A <a href="#x">second</a> link, $t = 1\\,\\text{second}$, and power.</p>
<figure><p>second</p></figure>
<div>second outside a paragraph</div>
<ul><li>One second more.</li></ul>
"""
CONCEPTS = [
    {"id": "second", "name": "second", "terms": ["second"]},
    {"id": "restoring-force", "name": "restoring force", "terms": ["restoring force"]},
    {"id": "power", "name": "power", "terms": ["power"]},
    {"id": "power-of-a-lens", "name": "power of a lens", "terms": ["power"]},
]


class TermsPass(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(prefix="terms-test-")
        book = os.path.join(self.dir, "Test")
        os.makedirs(os.path.join(book, "ch01", "1.1"))
        with open(os.path.join(book, "book.json"), "w", encoding="utf-8") as f:
            json.dump({"id": "test-book", "concepts": CONCEPTS}, f)
        with open(os.path.join(book, "ch01", "1.1", "section.json"), "w", encoding="utf-8") as f:
            f.write("{}")
        self.text = os.path.join(book, "ch01", "1.1", "text.html")
        with open(self.text, "w", encoding="utf-8") as f:
            f.write(TEXT)
        self.patch = mock.patch.object(ost, "CONTENT", self.dir)
        self.patch.start()

    def tearDown(self):
        self.patch.stop()
        shutil.rmtree(self.dir)

    def run_tool(self, *argv):
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            code = tp.main(list(argv))
        return buffer.getvalue(), code

    def candidates(self):
        out, code = self.run_tool("candidates", "test-book")
        self.assertEqual(code, 0)
        return [json.loads(line) for line in out.splitlines()]

    def apply(self, rows):
        path = os.path.join(self.dir, "decisions.jsonl")
        with open(path, "w", encoding="utf-8") as f:
            f.writelines(json.dumps(r) + "\n" for r in rows)
        return self.run_tool("apply", path)

    def test_bare_mentions_in_prose_only(self):
        rows = self.candidates()
        self.assertEqual([(r["idx"], r["term"], r["class"]) for r in rows],
                         [(0, "second", "judge"), (2, "restoring force", "jargon"), (3, "power", "judge"), (4, "second", "judge")])
        self.assertEqual(rows[2]["concepts"], ["power", "power-of-a-lens"])
        self.assertEqual(rows[0]["context"], "Wait a «second»: the second is a unit, and a restoring force pulls back.")

    def test_apply_wraps_once_and_refuses_a_changed_file(self):
        rows = self.candidates()
        decided = [{**rows[1], "concept": "restoring-force"}, {**rows[0], "concept": None}, {**rows[3], "concept": "second"}]
        out, code = self.apply(decided)
        self.assertEqual(code, 0, out)
        with open(self.text, encoding="utf-8") as f:
            text = f.read()
        self.assertIn('a <span data-concept="restoring-force">restoring\nforce</span> pulls', text)
        self.assertIn('One <span data-concept="second">second</span> more', text)
        self.assertIn("Wait a second:", text)
        self.assertEqual([r["idx"] for r in self.candidates()], [0, 3])
        out, code = self.apply(decided)
        self.assertEqual((code, out.strip()), (0, "0 mentions marked in 0 sections; 1 sections already applied"))
        out, code = self.apply([{**rows[2], "concept": "power"}])
        self.assertEqual(code, 1)
        with open(self.text, encoding="utf-8") as f:
            self.assertEqual(f.read(), text)


if __name__ == "__main__":
    unittest.main()
