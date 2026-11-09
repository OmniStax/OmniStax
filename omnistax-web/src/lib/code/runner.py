"""The reader's Python, run: against an exercise's tests, once per input size
to count the steps it takes, or once to record what it did line by line. It
runs in Pyodide inside the app's Python worker (src/lib/py/worker.ts), and
under plain CPython for the build check (scripts/check-code.ts runs it as
`python3 -I runner.py costs.json` from a fresh temp directory) and for
tests/code_check.py.

A request is one JSON string and so is its reply, so the worker passes a
string and nothing else across:

  {"mode": "run", "code", "entry"?, "tests": [{"args"} | {"stdin", "stdout"}], "limits"?}
  {"mode": "count", "code", "entry"?, "input": {"args"} | {"stdin"}, "limits"?}
  {"mode": "trace", "code", "entry"?, "input", "maxFrames"?}
  {"mode": "ping"}

Nothing here compares a result with what a test expects: that is
src/lib/code/check.ts, the one comparison both runners share. A result is
JSON, so a tuple is read as a list, a set as a sorted list and None as null.

The limits are cooperative. sys.monitoring calls back on every line of the
reader's code and on every jump back (one-line loops), counts the steps and
looks at the clock every thousand. When the time or the line budget is spent
it raises Limit, a BaseException, and raises it again at every later event,
so a bare `except` can catch it once but never keep running. (sys.settrace
cannot do this: an exception from a trace function switches tracing off.) The
host's hard deadline catches what this cannot: a hang inside C, memory, the
stack."""
import ast
import bisect
import builtins
import collections
import heapq
import io
import json
import math
import random
import sys
import time

FILENAME = '<answer>'
DEFAULTS = {'run': {'seconds': 2.0, 'lines': 5_000_000}, 'count': {'seconds': 5.0, 'lines': 2_000_000}, 'trace': {'seconds': 2.0, 'lines': 1_000_000}}
STDOUT_CAP = 2048
RECURSION = 1000
# The modules that reach the page: fetch, storage, the DOM. Hidden while the reader's code runs.
BLOCKED = ('js', 'pyodide', 'pyodide_js', '_pyodide', 'micropip')
TRACE_CAPS = {'items': 64, 'depth': 3, 'frames': 5000}
M = sys.monitoring


class Limit(BaseException):
    """A limit tripped: 'time' or 'lines'."""


# ---------- values as JSON ----------

def order(v):
    """A total order over plain values, so a set of mixed values sorts the same every time."""
    if v is None:
        return (0,)
    if isinstance(v, (bool, int, float)):
        return (1, v)
    if isinstance(v, str):
        return (2, v)
    if isinstance(v, list):
        return (3, tuple(order(x) for x in v))
    return (4, json.dumps(v, sort_keys=True))


def plain(v, caps=None, depth=0):
    """A Python value as JSON. With caps (trace mode), lists stop at caps['items'] and nesting at caps['depth']."""
    if v is None or isinstance(v, (bool, int, str)):
        return v
    if isinstance(v, float):
        return v if math.isfinite(v) else repr(v)
    if caps and depth >= caps['depth']:
        return '…'
    if isinstance(v, (list, tuple, collections.deque)):
        items = list(v)
        out = [plain(x, caps, depth + 1) for x in (items[:caps['items']] if caps else items)]
        return out + ['…'] if caps and len(items) > caps['items'] else out
    if isinstance(v, (set, frozenset)):
        out = sorted((plain(x, caps, depth + 1) for x in v), key=order)
        return out[:caps['items']] + ['…'] if caps and len(out) > caps['items'] else out
    if isinstance(v, dict):
        pairs = list(v.items())
        shown = pairs[:caps['items']] if caps else pairs
        return {k if isinstance(k, str) else json.dumps(plain(k)): plain(x, caps, depth + 1) for k, x in shown}
    return repr(v)


# ---------- the meter ----------

def free_tool():
    for tool in (3, 4, 1, 2):
        if M.get_tool(tool) is None:
            return tool
    raise RuntimeError('no free sys.monitoring tool id')


class Meter:
    """Counts the steps the reader's code takes and stops it at a limit. A step is
    a line begun, or a jump back within one line (a loop written on one line)."""

    def __init__(self, seconds, lines, on_line=None):
        self.deadline = time.monotonic() + seconds
        self.lines = lines
        self.steps = 0
        self.events = 0
        self.tripped = None
        self.on_line = on_line
        self.charged = set()
        self.lines_of = {}

    def trip(self, why):
        self.tripped = why
        raise Limit(why)

    def tick(self, k=1):
        if self.tripped:
            raise Limit(self.tripped)
        self.steps += k
        self.events += 1
        if self.steps > self.lines:
            self.trip('lines')
        if self.events % 1000 == 0 and time.monotonic() > self.deadline:
            self.trip('time')

    def charge(self, name, k):
        """A builtin's cost, beyond the line it is called from (count mode)."""
        if k > 0:
            self.charged.add(name)
            self.tick(k)

    def line_at(self, code, offset):
        table = self.lines_of.get(code)
        if table is None:
            table = self.lines_of[code] = list(code.co_lines())
        for start, end, line in table:
            if start <= offset < end:
                return line
        return None

    def on_line_event(self, code, line):
        if code.co_filename != FILENAME:
            return M.DISABLE
        self.tick()
        if self.on_line:
            self.on_line(sys._getframe(1), line)

    def on_jump(self, code, src, dest):
        if code.co_filename != FILENAME:
            return M.DISABLE
        if self.tripped:
            raise Limit(self.tripped)
        if dest <= src and self.line_at(code, src) == self.line_at(code, dest):
            self.tick()

    def on_return(self, code, offset, value):
        if code.co_filename != FILENAME:
            return M.DISABLE
        if self.on_line:
            self.on_line(sys._getframe(1), None)


class Running:
    """The reader's code running: the meter switched on, stdin and stdout swapped
    for the test's own, the blocked modules hidden, random seeded, a recursion
    limit the wasm stack survives. Everything is put back on the way out."""

    def __init__(self, meter, stdin='', stdout_cap=STDOUT_CAP):
        self.meter = meter
        self.stdin = io.StringIO(stdin)
        self.out = io.StringIO()
        self.cap = stdout_cap
        self.cut = False

    def write(self, s):
        room = self.cap - self.out.tell()
        if len(s) > room:
            self.cut = True
            s = s[:max(room, 0)]
        self.out.write(s)
        return len(s)

    def flush(self):
        pass

    def stdout(self):
        return self.out.getvalue()

    def __enter__(self):
        self.saved = (sys.stdin, sys.stdout, sys.getrecursionlimit())
        self.hidden = {name: mod for name, mod in sys.modules.items() if name.split('.')[0] in BLOCKED}
        for name in self.hidden:
            del sys.modules[name]
        sys.meta_path.insert(0, Blocker)
        sys.stdin, sys.stdout = self.stdin, self
        sys.setrecursionlimit(RECURSION)
        random.seed(0)
        self.tool = free_tool()
        M.use_tool_id(self.tool, 'omnistax')
        M.register_callback(self.tool, M.events.LINE, self.meter.on_line_event)
        M.register_callback(self.tool, M.events.JUMP, self.meter.on_jump)
        events = M.events.LINE | M.events.JUMP
        if self.meter.on_line:
            M.register_callback(self.tool, M.events.PY_RETURN, self.meter.on_return)
            events |= M.events.PY_RETURN
        M.set_events(self.tool, events)
        return self

    def __exit__(self, *exc):
        M.set_events(self.tool, 0)
        M.free_tool_id(self.tool)
        M.restart_events()
        sys.stdin, sys.stdout, limit = self.saved
        sys.setrecursionlimit(limit)
        sys.meta_path.remove(Blocker)
        sys.modules.update(self.hidden)
        return False


class Blocker:
    """Refuses to import the modules that reach the page while the reader's code runs."""

    @staticmethod
    def find_spec(name, path=None, target=None):
        if name.split('.')[0] in BLOCKED:
            raise ImportError(f'{name} is not available here')
        return None


def reader_builtins(stdin_of):
    """The builtins the reader's code sees: the real ones, with input() reading the test's stdin and import refusing the blocked modules."""
    own = dict(vars(builtins))
    real_import = builtins.__import__

    def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        if level == 0 and name.split('.')[0] in BLOCKED:
            raise ImportError(f'{name} is not available here')
        return real_import(name, globals, locals, fromlist, level)

    def read_input(prompt=''):
        if prompt:
            sys.stdout.write(str(prompt))
        line = stdin_of().readline()
        if not line:
            raise EOFError('EOF when reading a line')
        return line[:-1] if line.endswith('\n') else line

    own['__import__'] = guarded_import
    own['input'] = read_input
    return own


def error_of(e, tb=None):
    """An exception as the reply carries it: its type, the names of every class it is, its message and the reader's line it came from."""
    line = None
    tb = tb or e.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == FILENAME:
            line = tb.tb_lineno
        tb = tb.tb_next
    if isinstance(e, SyntaxError) and e.filename == FILENAME:
        line = e.lineno
    return {'type': type(e).__name__, 'types': [c.__name__ for c in type(e).__mro__], 'message': str(e.msg if isinstance(e, SyntaxError) else e), 'line': line}


# ---------- builtin costs (count mode) ----------

COSTS = {'on': [], 'operators': {}, 'methods': {}, 'functions': {}}
FUNCTIONS = {}   # id of the real function -> (name, cost)


def configure(text):
    """Read the Python half of costs.json."""
    COSTS.update(json.loads(text)['python'])
    FUNCTIONS.clear()
    homes = {'bisect': bisect, 'heapq': heapq}
    for name, cost in COSTS['functions'].items():
        home, _, attr = name.rpartition('.')
        fn = getattr(homes[home], attr, None) if home else getattr(builtins, attr, None)
        if fn is not None:
            FUNCTIONS[id(fn)] = (name, cost)


SEQUENCES = {'list': list, 'tuple': tuple, 'str': str, 'bytes': bytes, 'bytearray': bytearray, 'deque': collections.deque}


def costed(x):
    return isinstance(x, tuple(SEQUENCES[n] for n in COSTS['on']))


def size(x):
    try:
        return len(x)
    except Exception:
        return 0


def log2(n):
    return max(1, math.ceil(math.log2(n + 1)))


def amount(cost, n, i=0, k=0):
    if cost == 'n':
        return n
    if cost == 'n-i':
        return max(n - i, 1)
    if cost == 'k':
        return k
    if cost == 'n log n':
        return n * log2(n) if n > 1 else n
    if cost == 'log n':
        return log2(n)
    return 0


def index_of(i, n):
    return i + n if isinstance(i, int) and i < 0 else i if isinstance(i, int) else 0


class Charges:
    """The helpers the rewritten code calls. Each does exactly what the operator or call it replaced does, and charges the meter first."""

    def __init__(self, meter):
        self.meter = meter

    def contains(self, x, box):
        if costed(box):
            self.meter.charge('in', amount(COSTS['operators']['in'], size(box)))
        return x in box

    def call(self, f, *args, **kw):
        name = getattr(f, '__name__', '')
        owner = getattr(f, '__self__', None)
        if owner is not None and costed(owner) and name in COSTS['methods']:
            n = size(owner)
            cost = COSTS['methods'][name]
            i = index_of(args[0], n) if name == 'insert' and args else index_of(args[0], n) if name == 'pop' and args else n - 1
            k = size(args[0]) if name in ('extend', 'join') and args else 0
            self.meter.charge('.' + name, amount(cost, n, i, k))
        elif id(f) in FUNCTIONS:
            fname, cost = FUNCTIONS[id(f)]
            first = args[0] if args else None
            self.meter.charge(fname + '()', amount(cost, size(first)))
        return f(*args, **kw)

    def subslice(self, x, lo, hi, step):
        out = x[lo:hi:step]
        if costed(x):
            self.meter.charge('slice', amount(COSTS['operators']['slice'], size(x), k=size(out)))
        return out

    def delete(self, x, key):
        if costed(x) and isinstance(key, int):
            n = size(x)
            self.meter.charge('del', amount(COSTS['operators']['del'], n, index_of(key, n)))
        elif costed(x) and isinstance(key, slice):
            self.meter.charge('del', size(x))
        del x[key]

    def add(self, a, b):
        out = a + b
        if isinstance(out, (list, tuple)):
            self.meter.charge('+', amount(COSTS['operators']['concat'], 0, k=len(out)))
        return out

    def mul(self, a, b):
        out = a * b
        if isinstance(out, (list, tuple)):
            self.meter.charge('*', amount(COSTS['operators']['concat'], 0, k=len(out)))
        return out


H = '__omnistax_cost__'  # a dunder name: inside a class body Python mangles __x, never __x__


def helper(name, node, args):
    return ast.copy_location(ast.Call(func=ast.Attribute(value=ast.Name(id=H, ctx=ast.Load()), attr=name, ctx=ast.Load()), args=args, keywords=[]), node)


class Rewrite(ast.NodeTransformer):
    """Count mode's rewrite: every costed operator and call goes through Charges.
    Every new node takes the location of the one it replaces, so line numbers stay
    those of the reader's code."""

    def visit_Compare(self, node):
        self.generic_visit(node)
        if len(node.ops) == 1 and isinstance(node.ops[0], (ast.In, ast.NotIn)):
            test = helper('contains', node, [node.left, node.comparators[0]])
            return test if isinstance(node.ops[0], ast.In) else ast.copy_location(ast.UnaryOp(op=ast.Not(), operand=test), node)
        return node

    def visit_Call(self, node):
        self.generic_visit(node)
        f = node.func
        name = f.attr if isinstance(f, ast.Attribute) else f.id if isinstance(f, ast.Name) else None
        short = {n.rpartition('.')[2] for n in COSTS['functions']}
        if name in COSTS['methods'] or name in short:
            call = helper('call', node, [f, *node.args])
            call.keywords = node.keywords
            return call
        return node

    def visit_Subscript(self, node):
        self.generic_visit(node)
        if isinstance(node.ctx, ast.Load) and isinstance(node.slice, ast.Slice):
            s = node.slice
            none = lambda v: v if v is not None else ast.copy_location(ast.Constant(value=None), node)
            return helper('subslice', node, [node.value, none(s.lower), none(s.upper), none(s.step)])
        return node

    def visit_BinOp(self, node):
        self.generic_visit(node)
        if isinstance(node.op, ast.Add):
            return helper('add', node, [node.left, node.right])
        if isinstance(node.op, ast.Mult):
            return helper('mul', node, [node.left, node.right])
        return node

    def visit_Delete(self, node):
        self.generic_visit(node)
        if not any(isinstance(t, ast.Subscript) for t in node.targets):
            return node
        out = []
        for t in node.targets:
            if isinstance(t, ast.Subscript):
                key = t.slice
                if isinstance(key, ast.Slice):
                    key = ast.copy_location(ast.Call(func=ast.Name(id='slice', ctx=ast.Load()), args=[k if k is not None else ast.Constant(value=None) for k in (key.lower, key.upper, key.step)], keywords=[]), t)
                value = t.value
                if isinstance(value, ast.AST) and hasattr(value, 'ctx'):
                    value.ctx = ast.Load()
                out.append(ast.copy_location(ast.Expr(value=helper('delete', t, [value, key])), node))
            else:
                out.append(ast.copy_location(ast.Delete(targets=[t]), node))
        return out


def compiled(code, costs):
    tree = ast.parse(code, FILENAME)
    if costs:
        tree = ast.fix_missing_locations(Rewrite().visit(tree))
    return compile(tree, FILENAME, 'exec')


# ---------- one run of the reader's code ----------

def once(program, entry, test, meter, stdout_cap=STDOUT_CAP, charges=None):
    """The program run on one input in fresh globals, under the meter: its value, or the error it raised."""
    running = Running(meter, test.get('stdin', ''), stdout_cap)
    scope = {'__name__': '__main__', '__builtins__': reader_builtins(lambda: running.stdin)}
    if charges is not None:
        scope[H] = charges
    out = {}
    try:
        with running:
            exec(program, scope)
            if entry is not None:
                f = scope.get(entry)
                if not callable(f):
                    raise NameError(f'name {entry!r} is not defined')
                out['value'] = plain(f(*json.loads(json.dumps(test.get('args', [])))))
    except Limit as e:
        out['limit'] = str(e)
    except SystemExit as e:
        if entry is not None or e.code not in (None, 0):
            out['error'] = error_of(e)
    except BaseException as e:  # noqa: B902 - the reader's KeyboardInterrupt is theirs too
        out['error'] = error_of(e)
    out.update({'stdout': running.stdout(), 'stdoutCut': running.cut, 'steps': meter.steps})
    if 'limit' in out:
        out.pop('value', None)
    return out


def limits_of(q, mode):
    given = q.get('limits') or {}
    return {**DEFAULTS[mode], **{k: v for k, v in given.items() if v is not None}}


def run_tests(q):
    program = compiled(q['code'], False)
    lim = limits_of(q, 'run')
    results, stopped = [], False
    for test in q['tests']:
        if stopped:
            results.append({'skipped': True})
            continue
        cap = max(STDOUT_CAP, 2 * len(test.get('stdout', '')) + 256)
        r = once(program, q.get('entry'), test, Meter(lim['seconds'], lim['lines']), cap)
        results.append(r)
        # A test that ran out of time stops the rest: they would only run out too.
        stopped = r.get('limit') == 'time'
    return {'ok': True, 'results': results}


def count(q):
    program = compiled(q['code'], True)
    lim = limits_of(q, 'count')
    meter = Meter(lim['seconds'], lim['lines'])
    r = once(program, q.get('entry'), q['input'], meter, charges=Charges(meter))
    return {'ok': True, 'steps': r['steps'], 'cut': r.get('limit'), 'charged': sorted(meter.charged), **({'error': r['error']} if 'error' in r else {})}


def trace(q):
    """Line by line: a frame is "line L finished; these are the variables now", with the depth of calls it ran at."""
    program = compiled(q['code'], False)
    caps = {**TRACE_CAPS, 'frames': q.get('maxFrames') or TRACE_CAPS['frames']}
    frames, last, truncated = [], {}, [False]

    def depth_of(frame):
        d, f = 0, frame.f_back
        while f is not None:
            d += f.f_code.co_filename == FILENAME
            f = f.f_back
        return d

    def on_line(frame, line):
        held = last.pop(id(frame), None)
        if held is not None:
            if len(frames) >= caps['frames']:
                truncated[0] = True
            else:
                names = {k: v for k, v in frame.f_locals.items() if not k.startswith('__') and not callable(v) and type(v).__name__ != 'module'}
                fn = frame.f_code.co_name
                frames.append({'line': held, 'vars': {k: plain(v, caps) for k, v in names.items()}, 'depth': depth_of(frame), **({} if fn == '<module>' else {'fn': fn})})
        if line is not None:
            last[id(frame)] = line

    lim = limits_of(q, 'trace')
    r = once(program, q.get('entry'), q['input'], Meter(lim['seconds'], lim['lines'], on_line))
    return {'ok': True, 'frames': frames, 'truncated': truncated[0], 'stdout': r['stdout'],
            **({'value': r['value']} if 'value' in r else {}), **({'error': r['error']} if 'error' in r else {}), **({'limit': r['limit']} if 'limit' in r else {})}


MODES = {'run': run_tests, 'count': count, 'trace': trace, 'ping': lambda q: {'ok': True}}


def run(request):
    q = json.loads(request)
    try:
        out = MODES[q.get('mode', 'run')](q)
    except Exception as e:  # a syntax error, or the runner's own: either way nothing ran
        out = {'ok': False, 'error': error_of(e)}
    return json.dumps(out)


if __name__ == '__main__':
    with open(sys.argv[1], encoding='utf-8') as f:
        configure(f.read())
    sys.stdout.write(run(sys.stdin.read()))
