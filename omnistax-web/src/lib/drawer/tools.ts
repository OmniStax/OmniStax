/* What the pointer is doing on a drawing, and the letter that says so. The set
   is here rather than in the tab because the toolbar draws it, the tab acts on
   it and the command defaults name the keys, and all three must agree.

   The keys are bare letters, which the shell's own chords never are, so they
   only ever mean this inside a drawing tab and nothing anywhere else. */
export const TOOLS = ['pen', 'highlighter', 'eraser', 'lasso', 'text', 'shape', 'pan'] as const;
export type Tool = (typeof TOOLS)[number];

export const TOOL_KEY: Readonly<Record<Tool, string>> = {
  pen: 'p', highlighter: 'h', eraser: 'e', lasso: 'l', text: 't', shape: 's', pan: 'v',
};

/* The tool one keystroke asks for, and nothing when the key means something
   else: a modifier held is never a tool, since Ctrl+E turns a note over. */
export const toolForKey = (key: string): Tool | null =>
  TOOLS.find((t) => TOOL_KEY[t] === key.toLowerCase()) ?? null;

/* The two tools that lay ink down, which is what tells the tab whether a press
   begins a stroke or something else. */
export const isInk = (t: Tool): t is 'pen' | 'highlighter' => t === 'pen' || t === 'highlighter';

/* The pointer the canvas wears for each tool, so that the cursor says what the
   next press will do before it is made. */
export const CURSOR: Readonly<Record<Tool, string>> = {
  pen: 'crosshair', highlighter: 'crosshair', eraser: 'cell', lasso: 'crosshair',
  text: 'text', shape: 'crosshair', pan: 'grab',
};
