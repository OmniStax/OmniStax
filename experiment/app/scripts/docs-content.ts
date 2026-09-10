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
    case K.ZodNullable: return `${typeOf(d.innerType as z.ZodTypeAny)}?`;
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
\`experiment/app/src/lib/content/schema.ts\`. Do not edit it by hand: a field's
description lives on the field, and this file is written from it.

Three files hold a book — \`book.json\`, a \`chapter.json\` per chapter and a
\`section.json\` per section. Each is a record whose scalar fields describe the
level itself and whose array fields are tables of flat rows; a row refers to
another row by id alone. Why the content has that shape, what the build derives
from it and what the validator checks is in
[claude/content-tables.md](claude/content-tables.md).
`;

export const document = (): string => [HEAD, ...LEVELS.map(level)].join('\n');

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

const OUT = path.resolve(process.cwd(), '../../docs/content-format.md');
const main = async (): Promise<number> => {
  const bare = undescribed();
  if (bare.length > 0) { console.error(`no description on: ${bare.join(', ')}`); return 1; }
  await fs.writeFile(OUT, document(), 'utf8');
  console.log(`${path.relative(process.cwd(), OUT)}: ${Object.keys(TABLES).length} tables`);
  return 0;
};

process.exitCode = await main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); return 1; });
