# Todo: Milestone 1, "Static-time eyecandy"

Target from the README: a dozen courses, great visuals and interactives, solid
`pdf -> OmniStax course` pipeline, basic mastery point system. No runtime AI. The
selling point is UX and interactive simulations.

## Working principle

**Experiment before writing software.** We do not know yet what a transformed
textbook should look like, so we will not build a reproducible pipeline first.
Instead:

1. Take one real LibreTexts textbook and transform it by hand, with inline
   prompts, one pass at a time (exercises, formulas and variable names, color
   coding, concept DAG, widgets).
2. Look at the result. Keep what works, change what doesn't, write down why.
3. Prompts that survive a few iterations get moved from the chat into
   `docs/prompts/*.md`. That folder *becomes* the pipeline over time.
4. Only after we have transformed a textbook or two and have real feedback do we
   synthesize the reproducible pipeline (Phase 3).

Ingesting a textbook is meant to be interactive and careful anyway: a few hours
of human setup per book to decide domain-specific rules (how widgets look, what
sits in the global object list). The pipeline automates the repetitive middle,
not the setup.

The markdown reader and its edtech tools (Phase 2) can be explored in parallel
with Phase 1, because we need somewhere to *see* the transformed textbook.

Definition of done is at the bottom.

---

## Phase 0: Bare minimum before experimenting

- [x] Pick the first textbook: OpenStax College Physics 2e (CC BY 4.0), at `omnistax-content/College Physics 2e/source/college-physics-2e_-_WEB.pdf` (gitignored).
- [ ] Find or write `andrew-programming-standard` and check it into `docs/` (docs/andrew/random.md calls it law, it isn't in the repo yet).
- [x] Experiment outputs live in `omnistax-content/College Physics 2e/`: `toc.md`, `LOG.md`, and `ch<NN>/` per chapter (`text.txt`, rendered `pages/`, then one folder per pass).
- [ ] Move `Advice on Upskilling.pdf` into `docs/` or ignore it.

## Phase 1: Transform one textbook by hand (inline prompts)

Each pass is: prompt inline, look at output, iterate, then record the prompt
and the verdict in the experiment log. Do not automate anything in this phase.

- [~] **Setup session (the "few hours of foundations")** for this book (first draft in `omnistax-content/College Physics 2e/RULES.md`):
  - [ ] Read the table of contents and decide the domain-specific rules: what goes in the global object list (periodic table, unit tables, constant sheets...), what widgets should look like for this domain, what the color-coding standard is for this book's variables.
  - [ ] Write these rules down as `omnistax-content/<course>/RULES.md`. This is the first artifact of the future pipeline's per-course config.
- [x] **Pass: text to markdown** on section 2.5 (`omnistax-content/College Physics 2e/tools/cnxml2md.py`; from CNXML, not PDF). Verify tone is untouched. Note what markup we actually needed (definition spans, variable spans, equation blocks, citation anchors).
- [x] **Pass: formulas and variables** on 2.5 (the variables and equations tables of `omnistax-content/College Physics 2e/ch02/chapter.json`). Extract every important equation, name its variables, assign colors per the color-coding standard. Check that the same variable keeps the same color across the chapter.
- [x] **Pass: exercises** on 2.5 (the exercises table of `omnistax-content/College Physics 2e/ch02/2.5/section.json`). Extract exercises, tag each with a *set* of concepts and a Bloom level (Remember/Understand/Apply/Analyze). Add citation anchors for Remember/Understand only.
- [~] **Pass: equation questions** (3 generated for 2.5, quality unjudged). For each important equation, generate variable-relationship questions that do not show the equation. Judge whether they're any good.
- [x] **Prompt promoted:** `docs/prompts/interactive-figures.md` (figure planning + drawing contract, from the 2.5 restyle). Design decisions from the run: the root `RULES.md`.
- [~] **Pass: concept DAG** for 2.5 done twice (the `concepts` table of `book.json`; pass 2 = nodes justified by exercises, `kind` idea/result/skill, `coverage` span map, TOC split from map); chapter and book pending. Extract from exercises and definitions, not headers. Each concept gets a "why": either it serves another concept, or it connects to something real (an engineering marvel, a curable disease). Check for cycles and orphans by eye.
- [x] **Pass: widgets** on 2.5: 7 hand-coded demos, one in 3D (`omnistax-content/College Physics 2e/ch02/2.5/figures.js`). Identify which figures and paragraphs deserve an interactive. Draft a widget spec for two or three of them by hand. Note what the spec needs to express.
- [ ] After each pass: append to the book's `LOG.md` what the prompt was, what broke, what we'd change. Promote stable prompts to `docs/prompts/<pass>.md`.
- [ ] Repeat the passes on a second chapter to see what generalizes.
- [ ] (Optional) Start a second textbook in a different domain to see which rules are per-book vs universal.

## Phase 2: Markdown view and edtech tools (parallel with Phase 1)

Exploration, not product yet. The goal is to *see* the hand-transformed chapter
and try the UX ideas on real content.

- [ ] Pick a lightweight stack for the reader and record the decision in `docs/decisions.md` (SSG framework, math renderer, 2D and 3D libs). Keep it easy to throw away.
- [x] Render the hand-transformed section: markdown, equations, color-coded variables (`omnistax-content/College Physics 2e/ch02/2.5/text.html`).
- [ ] Try the **floating definitions panel**: definitions referenced on screen stay visible.
- [ ] Try the **global object panel**: the course's permanent objects (periodic table etc.), plus letting the user drag animations/diagrams from the current page into it, and pull in ones from previous pages through a search.
- [~] Try **variable linking** (color coding with toggle done; click-to-highlight not yet): click a variable in an equation and it highlights in prose and in widget parameters.
- [~] Try the **floating exercise UI** (inline cards with Bloom tags, cite links and numeric/choice checking done; text hiding not yet): sits beside the relevant text, hides the text for recall questions, links to the cited passage for Remember/Understand.
- [~] Try answer checking without an AI grader: multiple choice and numeric with tolerance done; symbolic equivalence not yet.
- [x] Build widgets by hand (7 in 2.5). Archetypes look viable; see the book's `LOG.md`. Learn what a declarative widget spec has to contain and whether an "archetype" approach (plotter, vector field, molecule viewer...) will cover most figures.
- [ ] Write down what the content format needs from the frontend side. Merge with the Phase 1 findings into `docs/content-format.md`.

## Phase 3: Synthesize the pipeline (only after Phase 1 and 2 feedback)

- [ ] Freeze v1 of `docs/content-format.md` (course manifest, per-course RULES, markdown extensions, DAG file, exercise file, widget spec, `generated-by` on every record).
- [ ] Turn `docs/prompts/*.md` into pipeline steps in `omnistax-content/`: ingest PDF, per-course setup (interactive, human in the loop), then the automated passes in the order that worked.
- [ ] Validation: schema checks, DAG cycle/orphan checks, exercises reference existing concepts, citations resolve, widget specs compile, near-verbatim tone check on prose.
- [ ] Idempotent per-chapter runs, cached model outputs, cost logging, a diff mode for prompt changes against the hand-made golden chapter.
- [ ] Review tool: source PDF page beside generated output.
- [ ] Re-run on the first textbook and measure hand-fix rate per pass. Fix the prompts, not the output.

## Phase 4: Frontend, for real

Promote the Phase 2 exploration into the product. This is the selling point;
budget the most time here.

- [ ] Design system: type scale, palette including the variable/definition color scheme, light/dark, spacing.
- [ ] Reader layout with definitions panel and global object panel as first-class features.
- [ ] Widget runtime: declarative spec, 2D and 3D, sliders bound to inline formulas, a library of reusable archetypes.
- [ ] Exercise UI as designed in Phase 2, all grader-free answer types.
- [ ] Course catalog, chapter navigation, search.
- [ ] Static build, lazy-load 3D, page load budget, accessibility pass, mobile reading layout.

## Phase 5: Basic mastery point system

- [ ] Postgres schema: users, courses, attempts, per-concept mastery (score, last_practiced, propagated_downwards).
- [ ] Auth via a hosted provider.
- [ ] XP only from exercises; points per Bloom level.
- [ ] Propagation on correct answer: walk downward through the course DAG only, cache with `propagated_downwards`. No global DAG.
- [ ] Decay parameter and a simple review queue.
- [ ] Learner DAG view with a "next thing" suggestion.

## Phase 6: Scale to a dozen courses

- [ ] Choose the remaining courses across math, physics, chemistry, biology, CS. Confirm CC BY-NC-SA attribution and that donations are compatible with NC.
- [ ] Per-course setup session (the few hours of foundations) for each.
- [ ] Run the pipeline, QA checklist per course (renders, DAG sane, exercises checkable, citations resolve, attribution present).
- [ ] Widget coverage target per course.

## Phase 7: Ship

- [ ] Hosting (static host plus small DB), domain, privacy-respecting analytics.
- [ ] Landing page that leads with the interactives.
- [ ] Donation page. (Attribution is the generated per-section footer, done 2026-09-07; see `omnistax-content/College Physics 2e/RULES.md`, "Licence and attribution".)
- [ ] "How to add a course" doc for contributors.

---

## Definition of done

- 12 courses live, each with a concept DAG, inline exercises, and interactives.
- A new LibreTexts PDF becomes a draft course in about a day: a few hours of interactive setup, then the pipeline.
- A learner can sign in, read, answer exercises, and see mastery change.
- The reading experience is visibly nicer than the source PDF and than a plain docs site.

## Open questions

- Which textbook first? (Blocks Phase 0.)
- Where is `andrew-programming-standard`?
- How deep should symbolic answer checking go? Affects which exercises are usable without a grader.
- Widgets: archetype instantiation only, or arbitrary generated code? Recommendation: archetypes only for this milestone. Phase 1 widget pass should test this.

- [x] Shell layout tried on 2.5: rails, sidebars, tabbed groups, split. Design note: `omnistax-web/docs/shell-layout.md`. Comments deferred.
- [x] Static pages + dynamic composition pass (done with 2.1): split bundle, scope figures to a root, chapter-level data, book manifest, replaceState to canonical URLs. Design: `omnistax-web/docs/static-composition.md`.
- [x] Section 2.1 built by the agent loop (exploration → config → plan → build). Next: 2.2.
