"""The tests of `cnxml2md`'s MathML, with and without --full."""
import os
import sys
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import cnxml2md  # noqa: E402


def latex(body, full):
    cnxml2md.FULL = full
    try:
        return cnxml2md.latex(ET.fromstring(f'<m:math xmlns:m="http://www.w3.org/1998/Math/MathML">{body}</m:math>'))
    finally:
        cnxml2md.FULL = False


ARROW = '<m:mover accent="true">{}<m:mo stretchy="false">→</m:mo></m:mover>'
BAR = '<m:mover accent="true">{}<m:mo>–</m:mo></m:mover>'
PQ = "<m:mrow><m:mi>P</m:mi><m:mi>Q</m:mi></m:mrow>"
TABLE = "<m:mrow><m:mtable><m:mtr><m:mtd><m:mi>a</m:mi></m:mtd></m:mtr><m:mtr><m:mtd><m:mi>b</m:mi></m:mtd></m:mtr></m:mtable></m:mrow>"


class Accents(unittest.TestCase):
    def test_full_stretches_over_more_than_one_glyph(self):
        self.assertEqual(latex(ARROW.format(PQ), True), r"\overrightarrow{PQ}")
        self.assertEqual(latex(BAR.format(PQ), True), r"\overline{PQ}")
        self.assertEqual(latex(BAR.format("<m:mn>66</m:mn>"), True), r"\overline{66}")

    def test_one_glyph_keeps_the_accent(self):
        self.assertEqual(latex(ARROW.format("<m:mi>v</m:mi>"), True), r"\vec{v}")
        self.assertEqual(latex(BAR.format("<m:msub><m:mi>x</m:mi><m:mi>i</m:mi></m:msub>"), True), r"\bar{{x}_{i}}")

    def test_without_full_nothing_changes(self):
        self.assertEqual(latex(ARROW.format(PQ), False), r"\vec{PQ}")
        self.assertEqual(latex(BAR.format(PQ), False), r"\bar{PQ}")


class FencedTables(unittest.TestCase):
    def test_bars_parentheses_braces_and_evaluation_bars_stretch(self):
        array = r"\begin{array}{l}a \\ b\end{array}"
        self.assertEqual(latex(f"<m:mrow><m:mo>|</m:mo>{TABLE}<m:mo>|</m:mo></m:mrow>", True), r"\left|" + array + r"\right|")
        self.assertEqual(latex(f"<m:mrow><m:mo>(</m:mo>{TABLE}<m:mo>)</m:mo></m:mrow>", True), r"\left(" + array + r"\right)")
        self.assertEqual(latex(f"<m:mrow><m:mi>f</m:mi><m:mo>=</m:mo><m:mo>{{</m:mo>{TABLE}</m:mrow>", True), r"f=\left\{" + array + r"\right.")
        self.assertEqual(latex(f"<m:mrow><m:mi>f</m:mi><m:mo>|</m:mo>{TABLE}</m:mrow>", True), r"f\left|" + array + r"\right.")
        self.assertEqual(latex(f'<m:mfenced open="[" close="]">{TABLE}</m:mfenced>', True), r"\left[" + array + r"\right]")

    def test_a_delimiter_around_no_table_stays(self):
        self.assertEqual(latex("<m:mrow><m:mo>|</m:mo><m:mi>x</m:mi><m:mo>|</m:mo></m:mrow>", True), "|x|")

    def test_without_full_nothing_changes(self):
        self.assertEqual(latex(f"<m:mrow><m:mo>|</m:mo>{TABLE}<m:mo>|</m:mo></m:mrow>", False), r"|\begin{array}{l}a \\ b\end{array}|")


if __name__ == "__main__":
    unittest.main()
