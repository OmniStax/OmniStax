import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAP, COALESCE_MS, type Edit, type Stack, amend, breakCoalescing, canRedo, canUndo, coalesce, emptyStack, push, redo, redoLabel, topOf, undo, undoLabel,
} from '../src/lib/history/model';

/* An edit that writes what it did into a log, so a walk of the timeline can be
   read back as the story of what happened. */
const edit = (label: string, log: string[], undone = label, redone = label): Edit =>
  ({ label, undo: () => log.push(`- ${undone}`), redo: () => log.push(`+ ${redone}`) });
/* Walk one step and run whatever the step handed back, as the store does. */
const step = (s: Stack, way: 'undo' | 'redo'): Stack => {
  const out = way === 'undo' ? undo(s) : redo(s);
  out.edit?.[way]();
  return out.stack;
};

test('an empty timeline has nothing to take back and nothing to say', () => {
  const s = emptyStack();
  assert.equal(canUndo(s), false); assert.equal(canRedo(s), false);
  assert.equal(undoLabel(s), ''); assert.equal(redoLabel(s), '');
  assert.equal(undo(s).edit, null); assert.equal(redo(s).edit, null);
  assert.equal(undo(s).stack, s, 'and nothing moves');
});

test('pushing, undoing and redoing walk one timeline in order', () => {
  const log: string[] = [];
  let s = push(push(emptyStack(), edit('highlight in yellow', log)), edit('annotation', log));
  assert.equal(undoLabel(s), 'annotation');
  s = step(s, 'undo'); s = step(s, 'undo');
  assert.deepEqual(log, ['- annotation', '- highlight in yellow']);
  assert.equal(canUndo(s), false); assert.equal(redoLabel(s), 'highlight in yellow');
  s = step(s, 'redo'); s = step(s, 'redo');
  assert.deepEqual(log.slice(2), ['+ highlight in yellow', '+ annotation']);
  assert.equal(canRedo(s), false); assert.equal(undoLabel(s), 'annotation');
});

test('a new edit after an undo takes the road not taken away', () => {
  const log: string[] = [];
  let s = push(emptyStack(), edit('new note', log));
  s = step(s, 'undo');
  assert.equal(canRedo(s), true);
  s = push(s, edit('new folder', log));
  assert.equal(canRedo(s), false, 'what was undone is no longer reachable');
  assert.equal(undoLabel(s), 'new folder');
});

test('a burst under one key is one step: the first undo, the last redo', () => {
  const log: string[] = [];
  const at = 1_000;
  let s = coalesce(emptyStack(), 'annotation:a', edit('annotation', log, 'to nothing', 'to N'), at);
  s = coalesce(s, 'annotation:a', edit('annotation', log, 'to N', 'to No'), at + 100);
  s = coalesce(s, 'annotation:a', edit('annotation', log, 'to No', 'to Note'), at + 200);
  assert.equal(s.done.length, 1, 'three keystrokes, one step');
  s = step(s, 'undo');
  assert.deepEqual(log, ['- to nothing'], 'the undo is the one the burst began with');
  s = step(s, 'redo');
  assert.deepEqual(log.slice(1), ['+ to Note'], 'and the redo is where it ended');
});

test('a burst ends with another key, with a second of quiet, or when it is broken', () => {
  const log: string[] = [];
  const at = 1_000;
  const one = coalesce(emptyStack(), 'annotation:a', edit('annotation', log), at);
  assert.equal(coalesce(one, 'annotation:b', edit('annotation', log), at + 10).done.length, 2, 'another highlight is another step');
  assert.equal(coalesce(one, 'annotation:a', edit('annotation', log), at + COALESCE_MS + 1).done.length, 2, 'a second of quiet ends it');
  assert.equal(coalesce(one, 'annotation:a', edit('annotation', log), at + COALESCE_MS).done.length, 1, 'and a keystroke inside the second carries on');
  assert.equal(coalesce(breakCoalescing(one), 'annotation:a', edit('annotation', log), at + 10).done.length, 2, 'breaking it ends it at once');
  assert.equal(coalesce(push(one, edit('remove highlight', log)), 'annotation:a', edit('annotation', log), at + 10).done.length, 3, 'so does any other edit');
  const walked = coalesce(step(one, 'undo'), 'annotation:a', edit('annotation', log), at + 10);
  assert.equal(walked.done.length, 1, 'a burst does not reach back across an undo');
});

test('the stack is capped, and it is the oldest steps that go', () => {
  const log: string[] = [];
  let s = emptyStack();
  for (let n = 0; n < CAP + 5; n++) s = push(s, edit(`edit ${n}`, log));
  assert.equal(s.done.length, CAP);
  assert.equal(undoLabel(s), `edit ${CAP + 4}`);
  assert.equal(s.done[0].label, 'edit 5', 'the five oldest are forgotten');
  const small = [0, 1, 2, 3].reduce((x, n) => push(x, edit(`edit ${n}`, log), 2), emptyStack());
  assert.deepEqual(small.done.map((e) => e.label), ['edit 2', 'edit 3']);
  const burst = coalesce(coalesce(small, 'k', edit('a', log), 0, 2), 'k', edit('b', log), 10, 2);
  assert.equal(burst.done.length, 2, 'a burst joins the top step and does not push the cap');
});

test('amending finishes the step below it: a row named a moment after it was made', () => {
  const log: string[] = [];
  let s = push(emptyStack(), edit('new note', log, 'the row and its document', 'a note called Untitled'));
  const made = topOf(s);
  s = amend(s, edit('new note', log, 'ignored', 'a note called Waves'));
  assert.equal(s.done.length, 1, 'making and naming are one step');
  assert.equal(undoLabel(s), 'new note');
  assert.notEqual(topOf(s), made, 'the step is a new value, so a caller can tell it has moved on');
  s = step(s, 'undo');
  assert.deepEqual(log, ['- the row and its document']);
  s = step(s, 'redo');
  assert.deepEqual(log.slice(1), ['+ a note called Waves']);
  assert.equal(amend(emptyStack(), edit('rename note', log)).done.length, 1, 'with nothing below it, an amendment is a step of its own');
});
