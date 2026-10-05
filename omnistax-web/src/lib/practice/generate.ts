/* Writing exercises for one concept: a request built by hand, a tool loop
   like a chat's over three of its tools, and the answer read as one json
   array. The provider and the library come in as ports, so a test runs the
   whole of it on a canned stream. */
import type { Access, ChatRequest, ModelPick, Provider, Turn } from '../chat/providers/index';
import { modelName, trimBase } from '../chat/providers/index';
import { TOOL_SPECS, runTool, type Library } from '../chat/tools';
import type { Step, ToolStep } from '../chat/model';
import { GENERATE, generateAsk, retryAsk, type GenerateAsk } from './prompt';
import { parseGenerated, type GeneratedItem } from './generated';

export const GENERATION_TOOLS = TOOL_SPECS.filter((t) => ['read_section', 'lookup', 'search'].includes(t.name));
export const GENERATION_ROUNDS = 6;
export const MAX_PER_REQUEST = 6;

export type Ports = { readonly provider: Provider; readonly library: Library };

export const requestFor = (system: string, turns: readonly Turn[], pick: ModelPick, access: Access, tools = GENERATION_TOOLS): ChatRequest => ({
  provider: pick.provider, model: modelName(pick), key: access.key, baseUrl: trimBase(access.baseUrl), system, turns, tools,
});

/* One answer, tool calls run and sent back until the model writes prose
   only, up to `rounds`. What comes back is the prose of the last round. */
export const converse = async (ports: Ports, request: ChatRequest, signal: AbortSignal, rounds = GENERATION_ROUNDS): Promise<{ text: string; turns: readonly Turn[] }> => {
  let turns = request.turns;
  for (let round = 0; round < rounds; round++) {
    let text = '';
    const calls: ToolStep[] = [];
    for await (const event of ports.provider.stream({ ...request, turns }, signal)) {
      if (event.kind === 'text') text += event.text;
      else calls.push({ kind: 'tool', id: event.id, name: event.name, input: event.input });
    }
    const answered = await Promise.all(calls.map(async (c) => ({ ...c, ...await runTool(ports.library, c.name, c.input) })));
    const steps: Step[] = [...(text ? [{ kind: 'text' as const, text }] : []), ...answered];
    turns = [...turns, { role: 'assistant', steps }];
    if (!calls.length) return { text, turns };
  }
  return { text: '', turns };   /* still calling tools when the rounds ran out */
};

/* Up to `ask.count` items for one concept. An answer that yields no item is
   sent back once with what was wrong with it; what still fails throws. */
export const generate = async (ports: Ports, ask: GenerateAsk, pick: ModelPick, access: Access, signal: AbortSignal): Promise<readonly GeneratedItem[]> => {
  const count = Math.min(MAX_PER_REQUEST, ask.count);
  const first = requestFor(GENERATE, [{ role: 'user', text: generateAsk({ ...ask, count }), images: [] }], pick, access);
  const once = await converse(ports, first, signal);
  let parsed = parseGenerated(once.text);
  if (!parsed.items.length) {
    const again = await converse(ports, { ...first, turns: [...once.turns, { role: 'user', text: retryAsk(parsed.errors), images: [] }] }, signal, 1);
    parsed = parseGenerated(again.text);
  }
  if (!parsed.items.length) throw new Error(parsed.errors[0] ?? 'The model wrote no exercise.');
  return parsed.items.slice(0, count);
};
