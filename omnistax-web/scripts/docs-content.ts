/* `npm run docs:content`: walk the zod schema and write the field-by-field
   reference for the three content files. Nothing here knows what a field means
   — that is written once, on the field, as its `.describe()` — so the reference
   cannot drift from what the build parses. A field with no description is an
   error, because the reference is the only place the meaning is written down.

   The document says the same things the schema does, in the same order: one
   part per file, the file's own fields first, then one part per table. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { TABLES } from '../src/lib/content/schema';
import type { ContentLevel, TableDoc } from '../src/lib/content/schema';

/* ---------- reading a zod schema ---------- */

/* What a zod definition carries, by the kind of schema it is. Only the parts the
   reference reads are named; everything else on the definition is left alone. */
type Def = {
  readonly typeName: string;
  readonly innerType?: z.ZodTypeAny;      /* optional, default, nullable */
  readonly schema?: z.ZodTypeAny;         /* effects: the object a transform is written on */
  readonly type?: z.ZodTypeAny;           /* array: what it is an array of */
  readonly valueType?: z.ZodTypeAny;      /* record */
  readonly values?: readonly string[];    /* enum */
  readonly value?: unknown;               /* literal */
  readonly options?: readonly z.ZodTypeAny[];
  readonly discriminator?: string;
};
const defOf = (schema: z.ZodTypeAny): Def => schema._def as unknown as Def;
const K = z.ZodFirstPartyTypeKind;

/* A transform and a default wrap the object they are written on; the reference
   speaks about the object, so they are peeled off before anything is read. */
export const unwrap = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  const d = defOf(schema);
  const inner = d.typeName === K.ZodEffects ? d.schema : d.typeName === K.ZodOptional || d.typeName === K.ZodDefault || d.typeName === K.ZodNullable ? d.innerType : undefined;
  return inner === undefined ? schema : unwrap(inner);
};
const fieldsOf = (schema: z.ZodTypeAny): Readonly<Record<string, z.ZodTypeAny>> => (unwrap(schema) as z.ZodObject<z.ZodRawShape>).shape;
const isUnion = (schema: z.ZodTypeAny): boolean => defOf(unwrap(schema)).typeName === K.ZodDiscriminatedUnion;
const variantsOf = (schema: z.ZodTypeAny): readonly z.ZodTypeAny[] => defOf(unwrap(schema)).options ?? [];

const quote = (v: unknown): string => (typeof v === 'string' ? `"${v}"` : String(v));
/* An object inside a row is written as its field names, with a literal spelt out
   where one pins the shape down: `{ at: "inline", after }`. */
const shapeOf = (schema: z.ZodTypeAny): string => {
  const parts = Object.entries(fieldsOf(schema)).map(([name, field]) => {
    const lit = defOf(unwrap(field));
    return `${name}${lit.typeName === K.ZodLiteral ? `: ${quote(lit.value)}` : ''}${field.isOptional() ? '?' : ''}`;
  });
  return `{ ${parts.join(', ')} }`;
};

/* How a field's type reads: `string`, `string?`, `number`, `"idea" | "result" |
   "skill"`, `string[]`, and an object or a union written out in braces. */
export const typeOf = (schema: z.ZodTypeAny): string => {
  const d = defOf(schema);
  switch (d.typeName) {
    case K.ZodOptional: return `${typeOf(d.innerType as z.ZodTypeAny)}?`;
    case K.ZodNullable: return `${typeOf(d.innerType as z.ZodTypeAny)} | null`;
    case K.ZodDefault: return typeOf(d.innerType as z.ZodTypeAny);
    case K.ZodEffects: return typeOf(d.schema as z.ZodTypeAny);
    case K.ZodArray: return `${typeOf(d.type as z.ZodTypeAny)}[]`;
    case K.ZodString: return 'string';
    case K.ZodNumber: return 'number';
    case K.ZodBoolean: return 'boolean';
    case K.ZodEnum: return (d.values ?? []).map(quote).join(' | ');
    case K.ZodLiteral: return quote(d.value);
    case K.ZodRecord: return `record of ${typeOf(d.valueType as z.ZodTypeAny)}`;
    case K.ZodObject: return shapeOf(schema);
    case K.ZodDiscriminatedUnion: return (d.options ?? []).map(shapeOf).join(' | ');
    case K.ZodUnion: return (d.options ?? []).map((o) => typeOf(o as z.ZodTypeAny)).join(' | ');
    default: return d.typeName.replace(/^Zod/, '').toLowerCase();
  }
};

/* ---------- the document ---------- */

/* One line of a table: what the field is called, how it reads, whether a row
   must carry it, and what it means. */
type FieldDoc = { readonly name: string; readonly type: string; readonly required: boolean; readonly description: string };
export const fieldDocs = (schema: z.ZodTypeAny, skip: ReadonlySet<string> = new Set()): readonly FieldDoc[] =>
  Object.entries(fieldsOf(schema))
    .filter(([name]) => !skip.has(name))
    .map(([name, field]) => ({ name, type: typeOf(field), required: !field.isOptional(), description: field.description ?? '' }));

const cell = (s: string): string => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const table = (fields: readonly FieldDoc[]): string => [
  '| field | type | required | description |',
  '| --- | --- | --- | --- |',
  ...fields.map((f) => `| \`${cell(f.name)}\` | \`${cell(f.type)}\` | ${f.required ? 'yes' : 'no'} | ${cell(f.description)} |`),
].join('\n');

/* A table of rows is one part; a union is one part per variant, since a variant
   carries its own fields and there is no one set of columns. */
const part = (name: string, doc: TableDoc): string => {
  const head = [`### \`${name}\``, '', doc.note];
  if (!isUnion(doc.schema)) return [...head, '', table(fieldDocs(doc.schema))].join('\n');
  const discriminator = defOf(unwrap(doc.schema)).discriminator ?? '';
  return [...head, ...variantsOf(doc.schema).flatMap((v) => {
    const tag = fieldDocs(v).find((f) => f.name === discriminator);
    return ['', `**\`${discriminator} = ${tag?.type ?? '?'}\`** — ${tag?.description ?? ''}`, '', table(fieldDocs(v))];
  })].join('\n');
};

const LEVELS: readonly ContentLevel[] = ['book', 'chapter', 'section'];
const level = (which: ContentLevel): string => {
  const here = Object.entries(TABLES).filter(([, doc]) => doc.level === which);
  const [, file] = here.find(([, doc]) => doc.field === null) ?? here[0];
  const tables = here.filter(([, doc]) => doc.field !== null);
  /* A field that is a table of its own is described where the table is, not twice. */
  const own = new Set(tables.map(([, doc]) => doc.field ?? ''));
  return [
    `## \`${file.file}\``, '', file.note, '',
    `The file's own fields. Every other field of \`${file.file}\` is one of the tables below.`, '',
    table(fieldDocs(file.schema, own)), '',
    ...tables.map(([name, doc]) => `${part(name, doc)}\n`),
  ].join('\n');
};

const HEAD = `# The content format

Generated by \`npm run docs:content\` from the zod schema in
\`omnistax-web/src/lib/content/schema.ts\`. Do not edit it by hand: a field's
description lives on the field, and this file is written from it.

Three files hold a book — \`book.json\`, a \`chapter.json\` per chapter and a
\`section.json\` per section. Each is a record whose scalar fields describe the
level itself and whose array fields are tables of flat rows; a row refers to
another row by id alone. Why the content has that shape, what the build derives
from it and what the validator checks is in
[content-tables.md](content-tables.md).
`;

/* What text.html may hold beside the tables is not a schema; the one part of it with attributes of its own
   to get right is written here, beside the tables, and checked by check:content (content/codeset.ts). */
const TEXT_PARTS = `## \`text.html\`: code sets

A code listing the book offers in several languages is one \`<div class="code-set">\`
holding one \`<pre data-lang>\` per language. The reader sees one at a time, the
book's code language (kept per book), and a button group on the set's head
switches every listing of the book, the figures' code panels included. Pseudocode
the source prints for the same code is the set's first variant,
\`data-lang="pseudocode"\`, never a \`<pre>\` of its own above the set; a reader
who has chosen no language sees it, and Python where a set has none. A lone
\`<pre>\` outside a set stays as it is.

\`\`\`html
<div class="code-set">
  <pre data-lang="python"><code>def two_sum(nums, target): …</code></pre>
  <pre data-lang="java" data-ai="claude-opus-5-5 high"><code>int[] twoSum(int[] nums, int target) { … }</code></pre>
</div>
\`\`\`

| attribute | on | required | description |
| --- | --- | --- | --- |
| \`class="code-set"\` | \`<div>\` | yes | Marks the set. It holds nothing but its \`<pre>\` elements; the build adds the head. |
| \`data-no-python\` | \`<div>\` | where Python is absent | Why the set has no Python, which every set of code has, in a few words. |
| \`data-lang\` | \`<pre>\` | yes | One of \`pseudocode\`, \`python\`, \`java\`, \`cpp\`, \`javascript\`, each at most once in a set; the buttons stand in that order, labelled Pseudocode, Python, Java, C++, JavaScript. |
| \`data-ai\` | \`<pre>\` | on a translation | What translated a variant the source does not print: the model's API id and, after a space, the effort (\`low\`, \`medium\`, \`high\`, \`max\`). The variant wears the AI mark, whose hover names them. A variant the source prints carries none. |

A variant holds its code escaped as HTML inside \`<code>\`, with no math: a dollar
sign is \`&#36;\`. The check fails a set with an unknown or repeated language, no
Python and no \`data-no-python\`, a \`data-ai\` it cannot read, math, or anything
beside its \`<pre>\` elements, and warns on a set every variant of which carries
\`data-ai\`. A debugger figure's code panel takes the same languages through
\`F.code\` (\`docs/prompts/interactive-figures.md\`).

## \`text.html\`: provenance per block

A book joined from several works names each \`sources\` row of \`book.json\` by an
\`id\` and gives it the credit its licence asks for (\`author\`, \`license\`,
\`license_url\`, and \`copyright\` and \`notice\` where the licence asks for them).
Every block of its text then says which work it comes from:

\`\`\`html
<section id="arraystack" data-source="ods" data-locator="ods:arrays#sec:arraystack">
<section id="amortized" data-source="oiwiki" data-locator="oiwiki:basic/amortized-analysis#引入"
         data-ai="claude-opus-5-5 high" data-translated-from="zh">
\`\`\`

| attribute | on | required | description |
| --- | --- | --- | --- |
| \`data-source\` | \`<section>\`; a \`<figure>\`, a code set's \`<div>\` or a \`<pre>\` inside one | on every top-level \`<section>\` of such a book | The id of the \`sources\` row the passage comes from. A figure or a listing inside a block is the block's unless it names a work of its own. A block holds one work's passage. |
| \`data-locator\` | where \`data-source\` is | no | The passage, in the work's own locator scheme, which starts with the work's id: \`ods:arrays#sec:arraystack\`. |
| \`data-ai\` | \`<section>\` | on a block the AI wrote or translated | The model's API id and, after a space, the effort. The block wears the AI mark at the end of its heading (or of its first paragraph where it has none), whose hover names them; nothing else on the page says so. |
| \`data-translated-from\` | \`<section>\` | on a translation | The BCP 47 tag of the language the passage was translated from (\`zh\`). The mark's hover reads "Translated from Chinese by …" and the footer's line for the work "translated from the Chinese and adapted". It needs \`data-ai\`. Where the work's \`sources\` row names a \`language\` other than the book's, every block of it that carries \`data-ai\` is read as translated from that language, and the attribute is needed only to say otherwise. |

The footer of such a page credits only the works its blocks, figures and code sets
name and the origins of its exercises (an origin that is also a \`sources\` id is
credited from that row, else from its \`exercise_sources\` row): title linked to the
work, author, copyright line, licence linked, and "adapted" or "translated from the
… and adapted", each work's notice after its line (folded under "License notice"
where it runs long); then the book's own line, "Adapted by OmniStax as part of … and
shared under …", the AI and the section's \`notes\`. A book whose \`sources\` rows carry
no ids keeps the book-wide credit. The check fails a \`data-source\` that names no row
(or names an NC work), a credited work with no \`license\`, a \`data-locator\` with no
\`data-source\`, a \`data-ai\` it cannot read, and a \`data-translated-from\` that is no
language tag, has no \`data-ai\` or stands on anything but a \`<section>\`; it warns on
a locator outside its work's scheme and on a top-level block that names no work.

## \`exercises-nc.json\`: NC exercise cards

A book shared under CC BY-SA may set exercise cards whose source is under a
NonCommercial licence (CC BY-NC-SA: MIT OpenCourseWare, Project Euler) only as cards
of their own, kept out of every other unit of the book. A section keeps them in
\`<chapter>/<section>/exercises-nc.json\`, beside its \`section.json\`:

\`\`\`json
{ "section": "1.5", "license": "CC BY-NC-SA 4.0", "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "exercises": [ { "id": "nc1", "origin": "mitocw-6-046j-spring2012", … } ],
  "exercise_concepts": [ { "exercise": "nc1", "concept": "amortized-analysis" } ] }
\`\`\`

| field | type | required | description |
| --- | --- | --- | --- |
| \`section\` | \`string\` | no | The section the file stands in; the check holds it to its folder. |
| \`license\` | \`string\` | no | The licence the cards are shared under, an NC licence. Each card prints it as its own licence line, "This card is shared under CC BY-NC-SA 4.0."; absent, a card prints its origin's licence there. |
| \`license_url\` | \`string\` | no | The licence's own page, which the line links. |
| \`exercises\` | rows of \`exercises\` | no | The cards, row for row as \`section.json\`'s. |
| \`exercise_concepts\` | rows of \`exercise_concepts\` | no | Which concepts each card tests. |

The cards are set with the section's own, after them. Each wears the credit under
its prompt that any card with an origin wears (its origin's title, author and
licence, from the \`exercise_sources\` row) and its own licence line under that. The
check fails a file whose \`section\` is another's or whose \`license\` is not NC, and a card whose
origin is missing or not under an NC licence (one whose name holds \`NC\` or
\`NonCommercial\`), a card id that \`section.json\` uses, a kind, cite, place or concept
that names nothing; and NC material anywhere else: an exercise of \`section.json\`
whose origin is NC, and a locator of an NC source (\`<id>:…\`) in the text, the
figures table, \`figures.js\` or another exercise.

**The BY-SA edition.** \`npm run export:by-sa -- <book folder> <out folder>\` (in
\`omnistax-web\`) copies the book, its tracked files where it is a git checkout,
without any \`exercises-nc.json\` and without the NC rows of \`book.json\`'s
\`exercise_sources\` and \`sources\`. The copy is a book like any other: point the
content root at the folder holding it to check or build it,
\`OMNISTAX_CONTENT_DIR=<parent of out folder> npm run build\`.
`;

export const document = (): string => [HEAD, ...LEVELS.map(level), TEXT_PARTS].join('\n');

/* ---------- the command ---------- */

/* Every field of every table, the objects nested inside a row included, so that
   one with nothing written on it can be named. */
const bare = (schema: z.ZodTypeAny, where: string): readonly string[] => {
  const inner = defOf(unwrap(schema));
  if (inner.typeName === K.ZodDiscriminatedUnion) return variantsOf(schema).flatMap((v, i) => bare(v, `${where}[${i}]`));
  if (inner.typeName === K.ZodArray) return bare(inner.type as z.ZodTypeAny, `${where}[]`);
  if (inner.typeName !== K.ZodObject) return [];
  return Object.entries(fieldsOf(schema)).flatMap(([name, field]) =>
    [...(field.description === undefined ? [`${where}.${name}`] : []), ...bare(field, `${where}.${name}`)]);
};
const undescribed = (): readonly string[] => Object.entries(TABLES).flatMap(([name, doc]) => bare(doc.schema, name));

const OUT = path.resolve(process.cwd(), '../docs/content-format.md');
const main = async (): Promise<number> => {
  const bare = undescribed();
  if (bare.length > 0) { console.error(`no description on: ${bare.join(', ')}`); return 1; }
  await fs.writeFile(OUT, document(), 'utf8');
  console.log(`${path.relative(process.cwd(), OUT)}: ${Object.keys(TABLES).length} tables`);
  return 0;
};

process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1; });
