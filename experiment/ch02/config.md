# Config: College Physics 2e, Chapter 2

Proposed by the agent after exploration (2026-09-06). Status: confirmed 2026-09-06. Each line is a setting and its value.

| Setting | Value |
|---|---|
| Unit of work | one section = one page; sections never folded (rule 11) |
| Order | 2.1, 2.2, 2.3, 2.4, re-link 2.5, 2.6, 2.7, 2.8; chapter intro as a short landing page |
| Loop | per section: plan message → build → stop for feedback |
| Site | static per-section pages from `tools/build_site.py`; other sections load into tabs on demand |
| Prose | verbatim; objectives, summary, glossary pulled into views |
| Sub-concept headers | agent decides per section, reported in the plan |
| Figures | a demo per idea or result the section introduces; every sketch figure replaced by a demo; photographs dropped; 3D only when spatial (rule 14) |
| Demo sliders | whatever is interesting and variable in the idea, not necessarily one equation's variables |
| Figures that serve exercises | copied over faithfully, no sliders (rule 14) |
| Extra simulations | agent proposes only those that open a view the required figures do not; user picks from the plan (rule 15) |
| Feedback stops | agent waits until the user has answered every point before building (rule 16) |
| Colour coding | t, x, v, a hues from RULES.md; g under the acceleration hue |
| Inline exercises | Check Your Understanding and other Remember/Understand items, after the passage they test |
| Exercises tab | end-of-section problems, conceptual questions, AP test prep |
| AP test prep | included |
| PhET interactive links | dropped |
| Answers to book problems | book answer key only; never generated; unkeyed problems are left out unless the user supplies an answer |
| Suggested approaches for open questions | generated, marked AI |
| Generated questions | none; agent asks only when a concept has no book exercise testing it |
| Concept nodes | testable units only; kinds idea/result/skill; canonical ids; one map file that grows across the chapter |
