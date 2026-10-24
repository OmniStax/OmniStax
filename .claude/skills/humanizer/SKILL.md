---
name: humanizer
description: Review or rewrite OmniStax platform text (settings hints, tooltips, empty states, button labels, tips) and inner-book text (subheaders, figure captions, lead-ins, AI-written explanations) so it reads like a person wrote it for a product, not like a model describing one. Use whenever writing or changing any string a reader sees, and when asked to review headers or UI copy.
---

# Humanizer

OmniStax text should sound like a careful person who built the thing and
assumes the reader is smart. The model's reflexes go the other way: it
describes, qualifies and narrates. This skill is the checklist that removes
those reflexes. Apply it to every string a reader sees, in the app and in
the books.

## The rule

Say only what the UI does not already say. If the control, the label or the
layout makes it obvious, write nothing.

## Platform text (settings, tooltips, hints, empty states, buttons, tips)

Cut it when:

- It restates the control. "Type a hex code or drag to pick" under a colour
  picker. "Change the size of the text" under a row called Text size.
- It explains a mechanism the reader does not need. "They take colors from a
  set of 36, kept clear of the other colors near them."
- It opens with a descriptor or a definition. "Referents are things both a
  figure and the text point to, so…" A label is not a glossary entry.
- It hedges or narrates: "simply", "just", "note that", "this lets you",
  "allows you to", "in order to", "as needed", "feel free".
- It is a second sentence. One sentence is almost always enough; a hint with
  two sentences usually has one too many.

Keep it when the reader would otherwise guess wrong: a side effect (a reload,
a reset, something that cannot be undone), a precondition, a non-obvious
consequence. Then say it in the fewest plain words.

Form:

- Sentence case. No trailing period on labels and tooltips; a period on a
  full-sentence hint is fine.
- Verbs the reader does, not the system: "Remove override", not "Mastery will
  be recalculated from history".
- Name things the way the rest of the app names them. Check the existing
  label before inventing a synonym.
- No "AI-generated" voice: no "seamlessly", "effortlessly", "intuitive",
  "powerful", "comprehensive", "robust", "enhance", "leverage", "ensure".

## Subheaders and inner-book text

Headers in a transformed book keep the book's own words where the book has
them (RULES item 3). Where the agent writes a header:

- Name the thing, not the activity around it. "Shear modulus", not
  "Understanding the shear modulus". "The Nernst equation", not "Exploring
  potentials at nonstandard conditions".
- Avoid the "Topic: subtitle" form unless the book itself uses it. One idea
  per header.
- No gerund openers that only announce the section is about to do something
  ("Exploring", "Understanding", "Delving", "Unpacking", "Navigating").
- No summary labels ("Key takeaways", "Putting it all together", "In summary",
  "Wrapping up") unless the book prints such a section.
- A header is not a sentence and is not a question unless the book asks one.

For captions, lead-ins and AI-written explanations: the page talks about the
subject, never about itself (RULES item 17). No "this figure shows", "in this
section", "as we can see", "let's".

## How to run a review

1. Collect every string in scope into a table: location, current text.
2. For each, decide cut / keep / rewrite by the rules above, and write the
   rewrite in the third column. Prefer cut over rewrite.
3. Hand the table to the owner for a decision before changing text in the
   app; the owner's rewrites win over the skill's.
