# Design: code exercises and block-stepping figures

Status: approved 2026-11-08 (all four review decisions: yes). Implementation starts with slices 0–2. Written for
the CS book (`OmniStax/cs-interview-prep-ultra`, its `METHOD.md` §1, §2.3 and
decisions 16, 17, 19). The user approved app changes for exactly these two
features. Everything else goes into a shared library, with as little change
to the content format as possible.

## What the design builds on

- **CAS worker.** `src/lib/cas/worker.ts` loads a pinned Pyodide, which the
  service worker caches. `cas/client.ts` owns one worker: 20 s timeout (×6 on
  the first request), and terminate-and-restart on timeout. `cas.py` is also
  tested under CPython (`tests/cas_check.py`). The Python runner follows the
  same pattern and shares the same Pyodide.
- **Answers and evidence.** `AnswerSchema` is a strict discriminated union in
  `src/lib/content/schema.ts`; `generated_by` is `source | ai`. Evidence
  flows `ExerciseCard.svelte` → `record(ok, self)` → `practice.record`.
  Inline cards never record.
- **Every place that branches on `answer.type`** needs a `code` branch or an
  exclusion:
  - `exercises/check.ts`
  - `content/fragment.ts`
  - `content/check.ts`
  - `practice/prompt.ts`, `practice/brief.ts`
  - `practice/generated.ts` (AI-generated exercises)
  - `backup/schema.ts`
  - `omnistax-content/tools/ost.py`
- **figlib.**
  - `F.strip` already exists (a road strip), so the new data-structure
    primitives live under `F.ds`.
  - A discrete-step transport already exists twice (`circuitFig`,
    `derivation.ts`), and big helpers live in their own files with `FIG`
    passed in.
  - `figrefs.ts` finds referents by scanning `F.ref('…')` calls, so new
    primitives take colours through `F.ref`.
- **The tests 2.3's exercises bring:**
  - TheAlgorithms doctests, keon unittests, icc asserts
  - Exercism canonical data, some of whose cases expect an error
  - Kattis/ICPC stdin/stdout samples (one accepted output has a trailing
    space)
  - keon's `three_sum`, which returns a set

  So tests need three forms (call, expect an error, stdin→stdout) and an
  order-insensitive comparison.

## 1. The `code` answer type

### 1.1 Schema: one new variant

```ts
const GROWTHS = ['1', 'log n', 'n', 'n log n', 'n^2', 'n^3', '2^n'] as const;
const CodeLangSchema = z.object({
  entry: z.string().optional(),        // function the tests call; absent = program reads stdin, writes stdout
  starter: z.string().default(''),     // what the editor opens with
  reference: z.string(),               // run at build against every test and the growth check
  generated_by: GEN,                   // who wrote this reference
}).strict();
const CodeTestSchema = z.object({
  args: z.array(z.unknown()).optional(), expect: z.unknown().optional(), raises: z.string().optional(),
  stdin: z.string().optional(), stdout: z.string().optional(),
  visible: z.boolean().default(false),
  generated_by: GEN,                   // AI-written tests marked per test
}).strict();                           // refine: exactly one form (args+expect|raises, or stdin+stdout)
z.object({
  type: z.literal('code'),
  python: CodeLangSchema.optional(), javascript: CodeLangSchema.optional(),
  tests: z.array(CodeTestSchema).min(2),
  compare: z.enum(['exact', 'unordered', 'tokens']).optional(),
  tol: /* existing relative tolerance for floats */,
  bound: z.enum(GROWTHS).optional(),
  grow: z.string().optional(),         // JS (n, rand) => args | stdin; required with bound
  hint, solution, generated_by: GEN,
}).strict();                           // refine: ≥1 language; one test form; entry iff function form; bound iff grow
```

- **One language-neutral test list serves both languages.** Only `entry`,
  `starter` and `reference` differ per language.
- **Values are normalised before comparing:** tuples become lists, sets
  become sorted lists, `None` becomes `null`.
  - `unordered` compares the top level as a multiset.
  - `tokens` compares stdin-form output token by token.
  - `raises` names the exception type only, because error messages differ
    across sources.
- **`generated_by` is reused at three levels:** the whole answer, each
  reference, each test. No new field.
- **`grow` is written in JavaScript for both languages.** It runs in the JS
  sandbox with a seeded `rand`; its inputs go as JSON to either runner.
- **Hidden tests are hidden, not secret.** In a local-first app they ship to
  the client.
- **Supporting changes:**
  - `ost.py`: `ANSWER_FIELDS['code']` and nested validation.
  - `practice/generated.ts`: refuses `code`, since no AI-written exercises
    are allowed.
  - `content/check.ts`: covers the code answer's strings.
  - `practice/prompt.ts` and `practice/brief.ts`: a key for code.
  - `docs/content-format.md`: regenerated.

### 1.2 Runner interface (`src/lib/code/types.ts`)

```ts
type Lang = 'python' | 'javascript';
interface Runner {
  load(): Promise<void>;
  run(code, spec, tests, limits?): Promise<RunReport>;     // per-test ok/got/error/stdout/steps/timedOut
  count(code, spec, grow, limits?): Promise<CountReport>;  // points, growth class, cut
  trace(code, spec, input, {maxFrames?}): Promise<TraceReport>;
}
```

- **Pure parts** live in `src/lib/code/check.ts` and run under node:
  comparison, growth fit, the verdict text, and mapping an outcome to
  evidence.
- **Python.**
  - `cas/worker.ts` becomes `src/lib/py/worker.ts`: one Pyodide serving
    `{kind: 'cas' | 'code'}`, loaded once with `PYTHONHASHSEED=0`.
  - `sympy` loads only on the first CAS request, and `runner.py` only on the
    first code request.
  - `src/lib/py/host.ts` owns the worker: a serial queue, timeouts and
    restart. `cas/client.ts` keeps its API.
  - `runner.py` gives each test fresh globals, feeds stdin and `input()`,
    caps captured stdout at about 2 KB, calls `random.seed(0)`, and runs
    `sys.settrace` only on frames from the reader's code.
- **JavaScript.**
  - A dedicated module worker, `src/lib/code/js.worker.ts`.
  - `src/lib/code/instrument.ts` (acorn and acorn-walk) inserts calls by
    source position and never regenerates code, so line numbers stay exact:
    - `__c(L)` before each statement and in each loop test;
    - `__t(L, getters)` in trace mode;
    - `__r(e)` on returns;
    - a rethrow of the stop signal in every `catch`.
  - Network and storage globals are removed, and `Math.random` is seeded.
- **One trace format for both:** a frame means "line L finished; these are
  the variables now".

### 1.3 Sandboxing and time limits

- **Python.**
  - **Soft limit, cooperative.** The trace function checks the wall clock
    (2 s per test) and a line budget (5·10⁶) every 1,000 events. When either
    trips, it raises a `BaseException` subclass on every later event, so a
    bare `except` can't swallow it. Runaway pure-Python loops therefore stop
    without killing the shared worker, which keeps the CAS alive.
  - **Hard backstop.** The host terminates the worker after the soft limits
    plus 3 s (×6 cold). That catches C-level hangs, out-of-memory and stack
    overflow.
  - **Blocked imports.** While reader code runs, `js`, `pyodide` and
    `pyodide.http` can't be imported, which closes the route to
    `fetch`/IndexedDB.
  - **Recursion.** A recursion limit the wasm stack survives.
- **JavaScript.** `__c` checks the clock every 4,096 ticks and throws the stop
  signal. A hard `terminate()` at the same deadline costs nothing.
- **Build checks** run downloaded Python references with `python3 -I` from a
  fresh temp directory (decision 17).

### 1.4 The line-count complexity check

- **Sizes.** Start at n = 64 and double while the step count stays under half
  the 2·10⁶ budget, for at most 12 doublings. Fit the last four points.
- **Fit.** Pick the class with the least spread in log(count / f(n)).
  - If the reader's class is no worse than `bound`, it passes.
  - Otherwise the verdict reads "Correct. Your solution makes ~n² steps;
    this problem wants n."
- **Builtin costs, count mode only.** The cost table is one file,
  `src/lib/code/costs.json`, shared by both runners.
  - **Python:** an AST rewrite that keeps line numbers charges `in` on
    lists, tuples, strings and deques. It also charges `.index`, `.count`,
    `.remove`, `.insert`, `.pop(i)` away from the end, `del L[i]`, slices,
    list `+`/`*`, `extend`, `copy`, `sorted`/`.sort` (n log n), the
    iterating builtins, and `bisect`/`heapq` (log n). Dict and set lookups
    and `deque.popleft` stay free.
  - **JavaScript:** `indexOf`, `includes`, `splice`, `shift`, `unshift`,
    `slice`, `concat`, `sort`, `reverse`, `fill`, `join`, the iteration
    methods, spread and `Array.from`.
  - String `+=` isn't charged.
  - The verdict names what is charged.
- **Build check.** The reference's class must equal `bound`. If it's lower,
  the check warns that the bound is loose.
- **Determinism.** Classes are compared, never raw counts, because counts
  shift between Python versions. Pyodide is pinned, the hash seed is fixed
  in the browser, random generators are seeded, and inputs are mostly
  integers.

### 1.5 From a pass to evidence (root rule 20)

- **Run** executes the visible tests and never records anything.
- **Submit** executes all tests, then the growth check if there's a `bound`.
  - **Everything passes within bound:** `record(true)`, +1 to each concept
    in `exercise_concepts`, and the card locks.
  - **A test fails:** nothing is recorded. The first failing test is shown
    with its input, the expected value, the reader's value and their stdout.
  - **Correct but too slow:** shown as such and not recorded, so the reader
    can keep improving.
- **"Give up and show the solution"** before a pass records `record(false)`
  (−1) and completes the card.
- **Practice rounds** use the same path. Inline Try Its record nothing. AI
  grading never applies to code cards.

### 1.6 Editor UI

- `CodeAnswer.svelte` holds the editor and a language toggle (shown when both
  languages exist).
  - **Buttons:** Run, Submit, Give up.
  - **Results:** visible tests one by one, hidden ones as "k of n hidden
    passed", then the growth verdict.
  - **Loading state:** "Loading Python…".
- `CodeEditor.svelte` is CodeMirror, built from `notes/MarkdownEditor.svelte`.
  - The language packs and acorn load dynamically, so pages without code
    cards pay nothing.
  - Line numbers, the mono font, and the app's own tokens; no syntax
    colouring by default.
- **Drafts** persist per book, section, exercise and language.
- **Warm-up:** focusing the editor warms Pyodide.

## 2. Trace engine and block-stepping figures

### 2.1 Declaring the panel and blocks (plan line and figures.js only)

```js
const code = F.code(d, {
  lang: 'python',
  src: `def two_pointer(nums, target):\n    i = 0\n    j = len(nums) - 1\n    while i < j:\n …`, // verbatim
  blocks: [
    { id: 'init',    lines: [2, 3],  label: 'start at both ends',                  touches: ['i', 'j'] },
    { id: 'loop',    lines: [4, 11], label: 'close in' },
    { id: 'compare', lines: [5, 6],  label: 'compare a[i] + a[j] with the target', touches: ['nums', 'i', 'j'] },
    { id: 'move',    lines: [7, 11], label: 'advance i or retreat j',              touches: ['i', 'j'] },
  ],
  refs: { i: F.ref('l'), j: F.ref('r') },
});
```

- **Nesting comes from line containment.** A partial overlap is a console
  error.
- **The panel is DOM text** in the mono font, which needs a code role added
  to root rule 26.9.
- **No syntax colouring.** Only the code variables named as referents wear
  their colours.
- **The code's credit** comes from per-block attribution.

### 2.2 Trace format (`src/lib/fig/trace.ts`, pure)

```ts
type Frame = { line: number; vars: Record<string, Value>; ev?: [string, ...Value[]]; depth: number; fn?: string };
```

- **A figure's trace** comes from its own JS copy of the shown code, numbered
  with the shown lines: `F.trace((at) => { …; at(5, {i, j, s}, ['compare', i, j]); … })`.
  It's deterministic, and works offline before Pyodide loads.
- **`runner.trace`** returns the same frames for the reader's code.
- **Caps:** 64 items per list, 3 levels deep, 5,000 frames.

### 2.3 Step, step into, step out

These are pure functions.

1. **Instances.** An instance of block B is a maximal run of frames whose
   line is in B's range, or which is deeper than the run's start (so calls
   stay inside). Each loop iteration is a new instance.
2. **Stops.** `stops(L)` collects the instance ends of every block at depth
   ≤ L, plus the initial state and the last frame.
3. **The cursor** is (stop p, level ℓ):
   - *step*: the next stop at ℓ;
   - *back*: the previous stop, exact;
   - *step into*: ℓ+1, at the first child's end;
   - *step out*: the end of the enclosing instance at ℓ−1.
4. **Default level:** the coarsest level with at least 3 stops where every
   step changes something a block `touches`.
5. **What a step shows.** The current block is the deepest one ending at p.
   Its band and label are shown, and the label is the figure's note. The
   touched set is the union of the current block's `touches` and its
   ancestors'.

### 2.4 One transport

- **`F.debug(d, {code, trace, inputs?, draw})`** in figlib, beside
  `circuitFig`, uses `cycle(() => stops(ℓ).length)`.
  - **The bar:** the usual play, timeline and speed controls, step dots on
    the scrubber, and step, step into and step out buttons.
  - **What `draw` gets:** `{frame, prev, k, block, level, touched, executed}`.
    `k` eases pointer motion.
- **Inputs** (hit, miss, duplicates, adversarial) are an `F.choice` that
  swaps the trace.
- **Behaviour:** reduced motion jumps from stop to stop. The watch panel is
  the readout.
- **Later:** predict pauses (figure controls only), *run to*, code over 25
  lines folding to its block outline, and a narrow-pane layout.
- **Doc changes:** manim-style's transport item and `interactive-figures.md`
  gain the debugger.

### 2.5 New primitives (`src/lib/fig/dsa.ts`, as `F.ds`)

- **First slice:**
  - `ds.strip`: array cells, 0- or 1-based (1-based draws a sentinel a₀).
  - `ds.pointer`: fractional positions for motion; pointers sharing a cell
    stack.
  - `ds.region`: invariant shading, or the window.
  - `ds.counts`: the count row under a variable window.
- **Later, as chapters need them:**
  - `nodes`/`links`, `tree` (stable tidy layout), `graph` (fixed
    coordinates), `grid` (DP table), `stack`/`queue`/`heap`, `buckets`, `bits`.
  - The system design `component`/`edge`/`meter`/`ring` wait for chapter 24.

## 3. Order of work

**Slice 0, a refactor with no visible change.** Move the worker to
`src/lib/py/worker.ts` and `src/lib/py/host.ts`, and make `cas/client.ts` a
caller of the host. The CAS tests must still pass.

**Slice 1, what 2.3's figures need.**
- `fig/trace.ts`, `fig/codepanel.ts` (`F.code`), `F.debug` and `F.trace`.
- `fig/dsa.ts` with `strip`, `pointer`, `region` and `counts`.
- CSS, and i18n keys in en and zh-CN.

That's enough for 2.3's four figures:

| Figure | What it uses |
|---|---|
| two pointers | compare/move blocks; 3SUM's outer loop exercises step into |
| variable window | extend/shrink blocks, the count row, a cost counter |
| merge | three strips |
| moving average | no code: `cycle`, `strip` and `region` |

**Slice 2, 2.3's code exercises in Python.**
- The schema variant, with its supporting changes.
- `runner.py` (run, count, trace), `python.ts`, `check.ts`, `costs.json`.
- The UI components and the card branch.
- A static check: at least one visible and one hidden test, consistent forms,
  the entry name present, a known `bound`, and `grow` exactly when there's a
  `bound`.
- `npm run check:code`: runs every reference against its tests and the growth
  check.

The count belongs here, because 2.3's lesson is O(n) against brute-force
O(n²).

**Slice 3:** the JS adapter and a per-book language preference.

**Slice 4, later.**
- "Watch your code run": the reader's own trace drives the figure.
- A parity check between each figure's JS-copy trace and the Python trace of
  the shown code.
- Call-stack frame cards, long-code folding, *run to*, and the remaining
  primitives.

**Tests**, in the repo's `node --test` style plus CPython and Playwright:

| Test file | What it checks |
|---|---|
| `tests/trace.test.ts` | containment, instances, stops, step/into/out/back, default level, scrubbing |
| `tests/code-check.test.ts` | comparison and normalisation, growth fit, verdict text, evidence mapping |
| `tests/code-js.test.ts` | exact counts, builtin charges, timeouts, the `let` dead zone, the catch rethrow, line numbers |
| `tests/code_check.py` (CPython) | line counts, the `in` charge, the uncatchable limit, stdin and `input()`, the import block |
| schema, `figlib.test.ts`, `check.test.ts`, `ost` tests | the new answer variant, `ds` layout, the static check, `validate_answer` |
| Playwright browser check | run/submit/evidence, timeout and recovery, the calculator after a code timeout, a debug figure in both themes |

**Risks.**
- **Pyodide load time.** About 2 s cold from the cache; the first download
  is about 10 MB. Mitigations: warm-up on editor focus, figures that never
  wait for Pyodide, and JS once slice 3 lands.
- **A hard kill takes the CAS with it.** The soft limit makes hard kills
  rare. CAS requests queue behind code runs.
- **Count determinism.** Classes are compared, not raw counts; everything is
  pinned and seeded.
- **Builtin coverage is partial.** The verdict names what is charged.
- **`grow` must build worst-case inputs.** It's AI-written and marked, and the
  build check confirms the reference reaches `bound`.
- **A figure's JS copy can drift from the shown code.** The slice 4 parity
  check guards this.
- **Bundle size.** The language packs and acorn load only when a code card
  mounts.

## Decisions (approved 2026-11-08)

1. "Correct but too slow" counts as not passed. Recommended: yes.
2. Giving up before a pass records −1; failed submits record nothing.
   Recommended: yes.
3. `grow` is written in JavaScript for both languages. Recommended: yes.
4. Approve this design, starting with slice 0, then slices 1 and 2 for the
   2.3 template.
