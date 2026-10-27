import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answer, ask, newChat, rename, resend, type Chat } from '../src/lib/chat/model';
import { chip, type Chip } from '../src/lib/chat/context';
import {
  compareIds, entryOfChat, filed, joinPlaces, mergeIndex, parseIndex, placeOfChip, placesOfChat, placesOfChips, recent, saidOf, unfiled, NO_BOOK,
  type ChatEntry, type Place,
} from '../src/lib/chat/entries';
import { look, parseSeen, unread, visibleChats } from '../src/lib/chat/seen';
import { categoryOf, validReaderRecord } from '../src/lib/backup/schema';
import type { ChatId } from '../src/lib/types/ids';

const row = (id: string, said: number, places?: readonly Place[]): ChatEntry => ({ id: id as ChatId, name: id, created: 1, updated: said, said, ...(places ? { places } : {}) });
const sec = (key: string): Chip => chip('section', key, key, '');
const concept = (book: string, s: string, id: string): Chip => chip('concept', `concept:${book}/${s}:${id}`, id, '');

test('a chip stands at the place of the book its key names, and only a thing of a book does', () => {
  assert.deepEqual(placeOfChip(sec('college-physics-2e/16.4')), { book: 'college-physics-2e', chapter: '16', section: '16.4' });
  assert.deepEqual(placeOfChip(chip('figure', 'fig:calculus/2.1:f-limit', 'Figure', '')), { book: 'calculus', chapter: '2', section: '2.1' });
  assert.deepEqual(placeOfChip(chip('figure', 'fig:calculus/7.intro:fig-wind', 'Figure', '')), { book: 'calculus', chapter: '7', section: '7.intro' });
  assert.deepEqual(placeOfChip(concept('college-physics-2e', '16.1', 'hooke')), { book: 'college-physics-2e', chapter: '16', section: '16.1' });
  assert.deepEqual(placeOfChip(chip('exercise', 'ex:college-physics-2e/16.1:ai:abc', 'Ex', '')), { book: 'college-physics-2e', chapter: '16', section: '16.1' });
  assert.deepEqual(placeOfChip(chip('definition', 'def:calculus/1.1:function', 'function', '')), { book: 'calculus', chapter: '1', section: '1.1' });
  assert.deepEqual(placeOfChip(chip('definition', 'sym:calculus/1.1:f', 'f', '')), { book: 'calculus', chapter: '1', section: '1.1' });
  assert.deepEqual(placeOfChip(chip('equation', 'eq:calculus/3.2:eq-power', 'eq', '')), { book: 'calculus', chapter: '3', section: '3.2' });
  assert.deepEqual(placeOfChip(chip('chapter', 'chapter:calculus/2', 'Limits', '')), { book: 'calculus', chapter: '2' });
  assert.deepEqual(placeOfChip(chip('book', 'book:calculus', 'Calculus', '')), { book: 'calculus' });
  /* a page of the book's own, before any chapter, stands at the book */
  assert.deepEqual(placeOfChip(sec('calculus/intro')), { book: 'calculus' });
  /* a highlight is found where the reader's notes say it is */
  const at = (id: string) => (id === 'h1' ? { book: 'calculus', section: '4.3' } : null);
  assert.deepEqual(placeOfChip(chip('selection', 'selection:h1', 'quote', ''), at), { book: 'calculus', chapter: '4', section: '4.3' });
  assert.equal(placeOfChip(chip('selection', 'selection:gone', 'quote', ''), at), null);
  /* the reader's own things, and a section written without its book, stand nowhere */
  for (const c of [chip('note', 'note:a1b2c3d4', 'Note', ''), chip('drawing', 'drawing:x', 'D', ''), chip('file', 'file:abc', 'F', ''), chip('image', 'asset:1', 'i', ''), chip('message', 'chat:a1b2c3d4:m1', 'msg', ''), sec('16.4')]) assert.equal(placeOfChip(c), null, c.kind);
});

test('the places of one book join at the least place holding them all', () => {
  const s = (x: string): Place => ({ book: 'calculus', chapter: x.split('.')[0], section: x });
  assert.deepEqual(joinPlaces(s('2.3'), s('2.3')), s('2.3'));
  assert.deepEqual(joinPlaces(s('2.3'), s('2.7')), { book: 'calculus', chapter: '2' });
  assert.deepEqual(joinPlaces(s('1.8'), s('5.3')), { book: 'calculus' });
  assert.deepEqual(joinPlaces({ book: 'calculus', chapter: '2' }, s('2.7')), { book: 'calculus', chapter: '2' });
  assert.deepEqual(joinPlaces({ book: 'calculus' }, s('2.7')), { book: 'calculus' });
  /* two concepts of one section, two of one chapter, two of two chapters */
  assert.deepEqual(placesOfChips([concept('calculus', '2.3', 'a'), concept('calculus', '2.3', 'b')]), [s('2.3')]);
  assert.deepEqual(placesOfChips([concept('calculus', '2.3', 'a'), concept('calculus', '2.7', 'b')]), [{ book: 'calculus', chapter: '2' }]);
  assert.deepEqual(placesOfChips([concept('calculus', '1.8', 'a'), concept('calculus', '5.3', 'b')]), [{ book: 'calculus' }]);
  /* a whole chapter and one of its sections, the chapter */
  assert.deepEqual(placesOfChips([chip('chapter', 'chapter:calculus/2', 'c', ''), sec('calculus/2.4')]), [{ book: 'calculus', chapter: '2' }]);
});

test('a chat is filed by what the reader sent on every branch, once per book, never by an answer', () => {
  let chat: Chat = newChat('aaaaaaaa' as ChatId, 1);
  const first = ask(chat, 'one', [sec('calculus/2.3'), chip('note', 'note:x', 'n', '')]);
  const a = answer(first.chat, first.id, 'm');
  /* an answer's chips are not the reader's */
  chat = { ...a.chat, messages: { ...a.chat.messages, [a.id]: { ...a.chat.messages[a.id], chips: [sec('chemistry-2e/9.1')] } } };
  assert.deepEqual(placesOfChat(chat), [{ book: 'calculus', chapter: '2', section: '2.3' }]);
  /* a resend is a branch beside the first; both count */
  const other = resend(chat, first.id, 'one again', [sec('calculus/2.7'), sec('college-physics-2e/16.4')]);
  assert.deepEqual(placesOfChat(other.chat), [{ book: 'calculus', chapter: '2' }, { book: 'college-physics-2e', chapter: '16', section: '16.4' }]);
  assert.deepEqual(placesOfChat(newChat('bbbbbbbb' as ChatId)), []);
});

test('a chat said its last when its last message was sent, and a rename says nothing', () => {
  const asked = ask(newChat('aaaaaaaa' as ChatId, 100), 'q');
  const said = saidOf(asked.chat);
  assert.ok(said >= 100);
  const later = { ...rename(asked.chat, 'Pendulums'), updated: said + 5000 };
  assert.equal(saidOf(later), said);
  assert.equal(saidOf(newChat('bbbbbbbb' as ChatId, 7)), 7);
  const e = entryOfChat(later);
  assert.equal(e.said, said);
  assert.deepEqual(e.places, []);
});

test('the default list is every chat, the one that last said something first', () => {
  const rows = [row('aaaaaaaa', 1), row('bbbbbbbb', 9), { ...row('cccccccc', 5), said: undefined, updated: 7 }, row('dddddddd', 3)];
  assert.deepEqual(recent(rows).map((e) => e.id), ['bbbbbbbb', 'cccccccc', 'dddddddd', 'aaaaaaaa']);
});

test('filed: book, chapter and section, a chat of two books in both, no book last', () => {
  const calc = (s?: string, ch?: string): Place => ({ book: 'calculus', ...(ch ?? s ? { chapter: ch ?? s!.split('.')[0] } : {}), ...(s ? { section: s } : {}) });
  const rows = [
    row('aaaaaaaa', 1, [calc('2.3')]),
    row('bbbbbbbb', 9, [calc('2.3'), { book: 'college-physics-2e', chapter: '16', section: '16.4' }]),
    row('cccccccc', 5, [calc(undefined, '2')]),
    row('dddddddd', 7, [calc()]),
    row('eeeeeeee', 3, []),
    row('ffffffff', 4),
    row('gggggggg', 6, [calc('10.1')]),
  ];
  const shelves = filed(rows);
  assert.deepEqual(shelves.map((s) => s.book), ['calculus', 'college-physics-2e', NO_BOOK]);
  const [c, p, none] = shelves;
  assert.deepEqual(c.entries.map((e) => e.id), ['dddddddd']);
  /* chapters by number, 2 before 10 */
  assert.deepEqual(c.chapters.map((x) => x.chapter), ['2', '10']);
  assert.deepEqual(c.chapters[0].entries.map((e) => e.id), ['cccccccc']);
  assert.deepEqual(c.chapters[0].sections.map((x) => [x.section, x.entries.map((e) => e.id)]), [['2.3', ['bbbbbbbb', 'aaaaaaaa']]]);
  assert.deepEqual(p.chapters.map((x) => [x.chapter, x.sections.map((s) => [s.section, s.entries.map((e) => e.id)])]), [['16', [['16.4', ['bbbbbbbb']]]]]);
  /* a chat of no book and a row not filed yet, newest first */
  assert.deepEqual(none.entries.map((e) => e.id), ['ffffffff', 'eeeeeeee']);
  assert.deepEqual(filed([]), []);
});

test('filed: chapters and sections in the order the book gives, else by number', () => {
  const at = (s: string): Place => ({ book: 'calculus', chapter: s.split('.')[0], section: s });
  const rows = [row('aaaaaaaa', 1, [at('2.summary')]), row('bbbbbbbb', 2, [at('2.10')]), row('cccccccc', 3, [at('2.2')]), row('dddddddd', 4, [at('2.intro')])];
  assert.deepEqual(filed(rows)[0].chapters[0].sections.map((s) => s.section), ['2.intro', '2.2', '2.10', '2.summary']);
  const order = () => ['2', '2.10', '2.2', '2.intro', '2.summary'];
  assert.deepEqual(filed(rows, order)[0].chapters[0].sections.map((s) => s.section), ['2.10', '2.2', '2.intro', '2.summary']);
  assert.ok(compareIds('9', '10') < 0 && compareIds('3.intro', '3.1') < 0 && compareIds('3.9', '3.summary') < 0);
});

test('the index reads all three shapes, and writes the first without what it added', () => {
  const read = parseIndex([
    { id: 'aaaaaaaa', name: 'A', created: 1, updated: 2, said: 2, answered: 3, places: [{ book: 'calculus', chapter: '2', section: '2.3' }, { book: 'Bad Id' }, { book: 'chemistry-2e' }] },
    { id: 'bbbbbbbb', name: 'B', created: 1, updated: 3, book: 'calculus' },
    { id: 'bad' },
  ]);
  assert.deepEqual(read[0].places, [{ book: 'calculus', chapter: '2', section: '2.3' }, { book: 'chemistry-2e' }]);
  assert.equal(read[0].answered, 3);
  /* the second index's book is not read: the row is filed again from its messages */
  assert.equal(read[1].places, undefined);
  assert.equal('book' in read[1], false);
  assert.deepEqual(unfiled(read).map((e) => Object.keys(e).sort()), [['created', 'id', 'name', 'updated'], ['created', 'id', 'name', 'updated']]);
});

test('the indexes merge: every chat of either, one an older build touched since filed again', () => {
  const now = [{ ...row('aaaaaaaa', 5, [{ book: 'calculus' }]), answered: 6 }, row('bbbbbbbb', 5, [])];
  const old = [{ ...row('aaaaaaaa', 9), name: 'renamed', said: undefined }, row('bbbbbbbb', 1), row('cccccccc', 2)];
  const merged = mergeIndex(now, unfiled(old));
  assert.deepEqual(merged.map((e) => [e.id, e.name, e.places, e.answered]), [['aaaaaaaa', 'renamed', undefined, 6], ['bbbbbbbb', 'bbbbbbbb', [], undefined], ['cccccccc', 'cccccccc', undefined, undefined]]);
});

test('unread: an answer finished after the chat was last seen, and one watched never is', () => {
  const e = { ...row('aaaaaaaa', 1), answered: 50 };
  assert.equal(unread(e, {}), true);
  assert.equal(unread(e, { aaaaaaaa: 40 }), true);
  assert.equal(unread(e, { aaaaaaaa: 50 }), false);
  assert.equal(unread(row('bbbbbbbb', 1), {}), false);
  /* in view when it finished: looked at, and so read */
  const seen = look({}, ['aaaaaaaa' as ChatId], [e, { ...row('bbbbbbbb', 1), answered: 60 }], 55);
  assert.deepEqual(seen, { aaaaaaaa: 55 });
  assert.equal(unread(e, seen), false);
  /* nothing new, nothing written */
  assert.equal(look(seen, ['aaaaaaaa' as ChatId], [e], 99), seen);
  assert.deepEqual(parseSeen({ aaaaaaaa: 5, bad: 3, cccccccc: 'x' }), { aaaaaaaa: 5 });
});

test('the chats in view: a chat that is a group\'s active tab, or the one its Conversations page shows', () => {
  const groups = [{ active: 'chat:aaaaaaaa' }, { active: 'view:chats@abc123' }, { active: null }, { active: 'view:chats@def456' }];
  const pages: Record<string, ChatId> = { 'view:chats@abc123': 'bbbbbbbb' as ChatId };
  assert.deepEqual(visibleChats(groups, (k) => pages[k] ?? null), ['aaaaaaaa', 'bbbbbbbb']);
  /* a tab behind another is not in view */
  assert.deepEqual(visibleChats([{ active: 'page:about' }], () => 'bbbbbbbb' as ChatId), []);
});

test('the new keys travel with the chats in a backup', () => {
  for (const key of ['omnistax-chats-v3', 'omnistax-chats-by-book-v1', 'omnistax-chat-seen-v1']) assert.equal(categoryOf(key), 'chats', key);
  assert.equal(validReaderRecord({ key: 'omnistax-chats-v3', value: JSON.stringify([{ id: 'aaaaaaaa', name: '', created: 1, updated: 2, said: 2, answered: 3, places: [{ book: 'calculus', chapter: '2' }] }]), category: 'chats' }), true);
  assert.equal(validReaderRecord({ key: 'omnistax-chat-seen-v1', value: '{"aaaaaaaa":12}', category: 'chats' }), true);
  assert.equal(validReaderRecord({ key: 'omnistax-chats-by-book-v1', value: 'true', category: 'chats' }), true);
});
