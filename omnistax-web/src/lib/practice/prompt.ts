/* The two system prompts practice sends, and the requests they open: one
   writes exercises for a concept, the other grades a reader's answer. Pure. */
import type { AnswerDTO } from '../content/schema';
import { solutionText } from '../exercises/check';

export const GENERATE = `You write practice exercises for one concept of an open textbook the reader is studying in OmniStax. Read the section first with your tools, and write only what the book has taught by that point, in its symbols, units and terms.

Enumerate before you multiply. List to yourself the facets of the concept: its definition, its cases, its limits, the confusions students bring to it, and its ties to its prerequisites and to a unit or a sign. Then list the facets the book's own exercises already cover and the facets earlier generated items cover. Write for the uncovered facets first, one item per facet, and add a second item on a facet only when you are asked for more items than there are facets.

Each item is one of three kinds. A numeric item has a key: value, unit and tol, with realistic magnitudes in the book's units. A multiple-choice item has one correct option, and every distractor encodes a real confusion. An open item asks for a short explanation or derivation and carries a model solution. Every item stands on its own and never refers to a figure the reader cannot see.

Each item names its facet in three to eight words and its bloom level: Remember, Understand, Apply, Analyze, Evaluate or Create. A solution shows the reasoning, not only the result. Match the difficulty of the book's own exercises unless the reader's note asks otherwise. Write maths as $…$ with the book's macros.

Answer with exactly one fenced json block and no prose outside it. It holds an array of items shaped like this:
\`\`\`json
[{"prompt": "…", "facet": "…", "bloom": "Apply", "answer": {"type": "number", "value": 2.5, "unit": "A", "tol": 0.02, "solution": "…"}},
 {"prompt": "…", "facet": "…", "bloom": "Understand", "answer": {"type": "choice", "options": ["…", "…", "…"], "correct": 1, "solution": "…"}},
 {"prompt": "…", "facet": "…", "bloom": "Analyze", "answer": {"type": "open", "solution": "…"}}]
\`\`\``;

export type ConceptBrief = { readonly id: string; readonly name: string; readonly kind: string; readonly statement: string };
export type GenerateAsk = {
  readonly book: string; readonly bookTitle: string; readonly section: string;
  readonly concept: ConceptBrief; readonly count: number; readonly note?: string;
  readonly existing: readonly string[]; readonly facets: readonly string[];
};

const bullets = (list: readonly string[], none: string): string => (list.length ? list.map((s) => `- ${s.replace(/\s+/g, ' ').trim()}`).join('\n') : none);

export const generateAsk = (a: GenerateAsk): string => [
  `Book: ${a.bookTitle} (id ${a.book}). Section: ${a.section}.`,
  `Concept: ${a.concept.name} (${a.concept.kind}, id ${a.concept.id}).${a.concept.statement ? ` ${a.concept.statement}` : ''}`,
  ...(a.note ? [`The reader's note: ${a.note}`] : []),
  `The book's own exercises on this concept:\n${bullets(a.existing, '- none')}`,
  `Facets earlier generated items already cover:\n${bullets(a.facets, '- none')}`,
  `Write ${a.count} ${a.count === 1 ? 'item' : 'items'}.`,
].join('\n\n');

export const retryAsk = (errors: readonly string[]): string =>
  `Your answer could not be read:\n${bullets(errors, '')}\nWrite it again as exactly one fenced json array of items.`;

export const GRADE = `You grade one answer to a practice exercise against its reference solution. Be exact about numbers, units and signs; accept an equivalent form or a value within the stated tolerance. Give the verdict right, partial or wrong. Write two to four sentences of feedback addressed to the student that name the step that went wrong, or confirm the reasoning when it is right. When the answer is wrong or partial, never write out the full solution. A drawing of the student's working may come with the answer; read it as their working.

Answer with exactly one fenced json block and no prose outside it:
\`\`\`json
{"verdict": "right", "feedback": "…"}
\`\`\``;

const key = (a: AnswerDTO): string =>
  a.type === 'number' ? `${a.value} ${a.unit}${a.tol ? ` (tolerance ${a.tol * 100}%)` : ''}`.trim()
    : a.type === 'multi' ? a.parts.map((p) => `${p.part}: ${p.value} ${p.unit}`.trim()).join('; ')
      : a.type === 'choice' ? `option ${a.correct + 1}: ${a.options[a.correct] ?? ''}`
        : 'an explanation';

export const gradeAsk = (prompt: string, answer: AnswerDTO, text: string, drawing: boolean): string => [
  `Exercise:\n${prompt}`,
  `Reference answer: ${key(answer)}`,
  `Reference solution:\n${solutionText(answer) ?? 'none given'}`,
  `The student's answer:\n${text.trim() || '(no text)'}${drawing ? '\n\nTheir scratchpad is attached as an image.' : ''}`,
].join('\n\n');
