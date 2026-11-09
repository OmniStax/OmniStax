"""The code runner (src/lib/code/runner.py) under plain CPython, as the build
check runs it: line counts, the builtin charges, the limit no bare except can
swallow, stdin and input(), the import block, values as JSON and the trace.

  python3 tests/code_check.py"""
import json
import pathlib
import sys
import time
import types
import unittest

HERE = pathlib.Path(__file__).resolve().parents[1] / 'src/lib/code'
sys.path.insert(0, str(HERE))
import runner  # noqa: E402

runner.configure((HERE / 'costs.json').read_text(encoding='utf-8'))


def ask(**q):
    return json.loads(runner.run(json.dumps(q)))


def steps(code, entry, args, mode='count'):
    r = ask(mode=mode, code=code, entry=entry, input={'args': args}) if mode == 'count' else ask(mode='run', code=code, entry=entry, tests=[{'args': args}])
    return r['steps'] if mode == 'count' else r['results'][0]['steps']


class Values(unittest.TestCase):
    def test_a_call_returns_its_value_as_json(self):
        r = ask(mode='run', code='def f(a, b):\n    return (a + b, {3, 1, 2}, None)\n', entry='f', tests=[{'args': [1, 2]}, {'args': [[1], [2]]}])
        self.assertTrue(r['ok'])
        self.assertEqual([x['value'] for x in r['results']], [[3, [1, 2, 3], None], [[1, 2], [1, 2, 3], None]])

    def test_a_set_of_tuples_is_a_sorted_list_of_lists_and_dict_keys_are_strings(self):
        r = ask(mode='run', code='def f():\n    return {(1, 2), (-1, 0)}, {1: "a"}, float("inf")\n', entry='f', tests=[{'args': []}])
        self.assertEqual(r['results'][0]['value'], [[[-1, 0], [1, 2]], {'1': 'a'}, 'inf'])

    def test_each_test_has_fresh_globals_and_its_own_copy_of_the_arguments(self):
        code = 'seen = []\ndef f(xs):\n    seen.append(1)\n    xs.append(0)\n    return len(seen), xs\n'
        r = ask(mode='run', code=code, entry='f', tests=[{'args': [[1]]}, {'args': [[1]]}])
        self.assertEqual([x['value'] for x in r['results']], [[1, [1, 0]], [1, [1, 0]]])

    def test_an_error_names_its_type_its_classes_and_the_line(self):
        r = ask(mode='run', code='def f(x):\n    if x < 0:\n        raise ValueError("negative")\n    return x\n', entry='f', tests=[{'args': [-1]}])
        e = r['results'][0]['error']
        self.assertEqual((e['type'], e['message'], e['line']), ('ValueError', 'negative', 3))
        self.assertIn('Exception', e['types'])

    def test_a_syntax_error_is_the_whole_reply_and_a_missing_entry_is_a_name_error(self):
        r = ask(mode='run', code='def f(:\n', entry='f', tests=[{'args': []}])
        self.assertEqual((r['ok'], r['error']['type'], r['error']['line']), (False, 'SyntaxError', 1))
        r = ask(mode='run', code='def g(): pass\n', entry='f', tests=[{'args': []}])
        self.assertEqual(r['results'][0]['error']['type'], 'NameError')

    def test_random_is_seeded_for_every_test(self):
        r = ask(mode='run', code='import random\ndef f():\n    return random.random()\n', entry='f', tests=[{'args': []}, {'args': []}])
        self.assertEqual(r['results'][0]['value'], r['results'][1]['value'])


class Stdin(unittest.TestCase):
    def test_a_program_reads_stdin_and_input_and_its_stdout_is_captured(self):
        code = 'import sys\nn = int(input())\nrest = sys.stdin.read().split()\nprint(n + sum(map(int, rest)), end=" \\n")\n'
        r = ask(mode='run', code=code, tests=[{'stdin': '2\n3 4\n', 'stdout': '9\n'}])
        self.assertEqual(r['results'][0]['stdout'], '9 \n')
        self.assertNotIn('error', r['results'][0])

    def test_input_past_the_end_is_an_eof_error_and_exit_zero_is_no_error(self):
        r = ask(mode='run', code='input()\ninput()\n', tests=[{'stdin': 'one\n', 'stdout': ''}])
        self.assertEqual(r['results'][0]['error']['type'], 'EOFError')
        r = ask(mode='run', code='print(1)\nraise SystemExit\n', tests=[{'stdin': '', 'stdout': '1\n'}])
        self.assertNotIn('error', r['results'][0])

    def test_stdout_is_capped(self):
        r = ask(mode='run', code='def f():\n    print("x" * 10000)\n', entry='f', tests=[{'args': []}])
        self.assertTrue(r['results'][0]['stdoutCut'])
        self.assertEqual(len(r['results'][0]['stdout']), runner.STDOUT_CAP)


class Counts(unittest.TestCase):
    LOOP = 'def f(n):\n    s = 0\n    for i in range(n):\n        s += i\n    return s\n'

    def test_lines_are_counted_and_grow_with_n(self):
        a, b = steps(self.LOOP, 'f', [10]), steps(self.LOOP, 'f', [20])
        self.assertEqual(b - a, 20)  # two lines per iteration
        self.assertEqual(steps(self.LOOP, 'f', [10], 'run'), a, 'run and count agree where nothing is charged')

    def test_a_loop_on_one_line_is_counted_per_iteration(self):
        one = 'def f(n):\n    i = 0\n    while i < n: i += 1\n    return i\n'
        self.assertGreaterEqual(steps(one, "f", [1000]) - steps(one, "f", [0]), 999)

    def test_in_on_a_list_is_charged_and_on_a_set_is_free(self):
        listed = 'def f(xs):\n    return 999999 in xs\n'
        hashed = 'def f(xs):\n    return 999999 in set_of\nset_of = set()\n'
        r = ask(mode='count', code=listed, entry='f', input={'args': [list(range(1000))]})
        self.assertGreaterEqual(r['steps'], 1000)
        self.assertEqual(r['charged'], ['in'])
        self.assertLess(ask(mode='count', code=hashed, entry='f', input={'args': [list(range(1000))]})['steps'], 10)

    def test_the_named_builtins_are_charged(self):
        code = 'import bisect, heapq\ndef f(xs):\n    ys = sorted(xs)\n    ys.pop(0)\n    ys.insert(0, 1)\n    zs = ys[1:]\n    del zs[0]\n    i = bisect.bisect_left(ys, 5)\n    h = []\n    heapq.heappush(h, 1)\n    return ys.index(ys[-1]) + i + len(ys + zs)\n'
        r = ask(mode='count', code=code, entry='f', input={'args': [list(range(1000, 0, -1))]})
        self.assertNotIn('error', r)
        self.assertEqual(set(r['charged']), {'sorted()', '.pop', '.insert', 'slice', 'del', 'bisect.bisect_left()', 'heapq.heappush()', '.index', '+'})
        self.assertGreater(r['steps'], 1000 * 10)

    def test_popleft_dict_lookups_and_pop_at_the_end_stay_cheap(self):
        code = 'from collections import deque\ndef f(xs):\n    d = deque(xs)\n    m = {x: 1 for x in xs[:3]}\n    d.popleft()\n    xs.pop()\n    return m.get(1)\n'
        r = ask(mode='count', code=code, entry='f', input={'args': [list(range(5000))]})
        self.assertLess(r['steps'], 100)

    def test_a_method_of_a_class_is_counted_and_charged(self):
        # inside a class body Python mangles a name that starts with two underscores, so the rewrite's helper must not
        code = ('class Solution(object):\n    def f(self, xs):\n        ys = xs[1:]\n        return min(ys) + len(ys)\n\n'
                'def g(xs):\n    return Solution().f(xs)\n')
        r = ask(mode='count', code=code, entry='g', input={'args': [list(range(1000))]})
        self.assertNotIn('error', r)
        self.assertIn('slice', r['charged'])
        self.assertGreater(r['steps'], 1000)

    def test_the_rewrite_keeps_the_reader_line_numbers(self):
        code = 'def f(xs):\n    a = xs[1:]\n\n    return xs.index(99)\n'
        r = ask(mode='count', code=code, entry='f', input={'args': [[1, 2]]})
        self.assertEqual((r['error']['type'], r['error']['line']), ('ValueError', 4))


class Limits(unittest.TestCase):
    def test_a_bare_except_cannot_keep_a_runaway_loop_going(self):
        code = 'def f():\n    while True:\n        try:\n            while True: pass\n        except:\n            pass\n'
        t = time.monotonic()
        r = ask(mode='run', code=code, entry='f', tests=[{'args': []}], limits={'seconds': 0.5})
        self.assertLess(time.monotonic() - t, 5)
        self.assertEqual(r['results'][0]['limit'], 'time')

    def test_the_line_budget_trips_and_a_timed_out_test_skips_the_rest(self):
        code = 'def f(n):\n    for i in range(n):\n        pass\n'
        r = ask(mode='run', code=code, entry='f', tests=[{'args': [10 ** 9]}], limits={'lines': 1000})
        self.assertEqual(r['results'][0]['limit'], 'lines')
        r = ask(mode='run', code='def f():\n    while True: pass\n', entry='f', tests=[{'args': []}, {'args': []}], limits={'seconds': 0.2})
        self.assertEqual(r['results'][1], {'skipped': True})

    def test_count_mode_reports_the_cut(self):
        r = ask(mode='count', code='def f(n):\n    while True: pass\n', entry='f', input={'args': [1]}, limits={'lines': 5000})
        self.assertEqual(r['cut'], 'lines')

    def test_deep_recursion_is_a_recursion_error(self):
        r = ask(mode='run', code='def f(n):\n    return f(n + 1)\n', entry='f', tests=[{'args': [0]}])
        self.assertEqual(r['results'][0]['error']['type'], 'RecursionError')

    def test_the_runner_is_whole_after_a_limit(self):
        ask(mode='run', code='def f():\n    while True: pass\n', entry='f', tests=[{'args': []}], limits={'seconds': 0.1})
        self.assertIsNone(sys.monitoring.get_tool(3))
        self.assertEqual(ask(mode='run', code='def f():\n    return 1\n', entry='f', tests=[{'args': []}])['results'][0]['value'], 1)


class Imports(unittest.TestCase):
    def setUp(self):
        sys.modules['js'] = types.ModuleType('js')

    def tearDown(self):
        sys.modules.pop('js', None)

    def test_the_page_modules_cannot_be_imported_and_come_back_after(self):
        for code in ('import js\n', 'import pyodide.http\n', 'import importlib\nimportlib.import_module("js")\n', 'import sys\nsys.modules["js"]\n'):
            r = ask(mode='run', code=code, tests=[{'stdin': '', 'stdout': ''}])
            self.assertIn(r['results'][0]['error']['type'], ('ImportError', 'ModuleNotFoundError', 'KeyError'), code)
        self.assertIn('js', sys.modules)
        self.assertNotIn('error', ask(mode='run', code='import math, collections\n', tests=[{'stdin': '', 'stdout': ''}])['results'][0])


class Trace(unittest.TestCase):
    def test_a_frame_is_a_finished_line_and_the_variables_after_it(self):
        code = 'def f(xs):\n    i = 0\n    j = len(xs) - 1\n    return i + j\n'
        r = ask(mode='trace', code=code, entry='f', input={'args': [[1, 2, 3]]})
        self.assertEqual([(x['line'], x['vars']) for x in r['frames'] if x.get('fn') == 'f'],
                         [(2, {'xs': [1, 2, 3], 'i': 0}), (3, {'xs': [1, 2, 3], 'i': 0, 'j': 2}), (4, {'xs': [1, 2, 3], 'i': 0, 'j': 2})])
        self.assertEqual(r['value'], 2)

    def test_calls_are_deeper_and_long_lists_are_capped(self):
        code = 'def g(x):\n    return x * 2\ndef f(xs):\n    y = g(len(xs))\n    return y\n'
        r = ask(mode='trace', code=code, entry='f', input={'args': [list(range(100))]})
        g = [x for x in r['frames'] if x.get('fn') == 'g']
        f = [x for x in r['frames'] if x.get('fn') == 'f']
        self.assertGreater(g[0]['depth'], f[0]['depth'])
        self.assertEqual(len(f[0]['vars']['xs']), runner.TRACE_CAPS['items'] + 1)

    def test_frames_stop_at_the_cap(self):
        code = 'def f(n):\n    for i in range(n):\n        pass\n'
        r = ask(mode='trace', code=code, entry='f', input={'args': [100]}, maxFrames=10)
        self.assertEqual((len(r['frames']), r['truncated']), (10, True))


if __name__ == '__main__':
    unittest.main()
