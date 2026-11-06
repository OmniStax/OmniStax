/* What a file of a sync repo holds, in a few words, for the rows and the
   changes tab: the record's name says what the store calls it, and this says
   what it is to the reader. A file of a chat, a drawing or an imported file
   is already named by its own name, so it gets none. */
import { tIn, type Locale, type MessageKey } from '../i18n';
import { MANIFEST, recordKeyOf, type RepoPath } from './layout';

const RECORD: Readonly<Record<string, MessageKey>> = {
  'omnistax-theme': 'files.sync.record.theme', 'omnistax-lang': 'files.sync.record.lang', 'omnistax-anim': 'files.sync.record.anim',
  'omnistax-exmode': 'files.sync.record.exmode', 'omnistax-voice': 'files.sync.record.voice', 'omnistax-map-progress': 'files.sync.record.mapProgress',
  'omnistax-tips': 'files.sync.record.tips', 'omnistax-zoom': 'files.sync.record.zoom', 'omnistax-figure-font': 'files.sync.record.figureFont',
  'omnistax-body-font': 'files.sync.record.bodyFont', 'omnistax-card-open': 'files.sync.record.cardOpen', 'omnistax-swap-drag': 'files.sync.record.swapDrag',
  'omnistax-fill-all': 'files.sync.record.fillAll', 'omnistax-finger-draws': 'files.sync.record.fingerDraws', 'omnistax-lock-grace': 'files.sync.record.lockGrace',
  'omnistax-pomodoro-len': 'files.sync.record.pomodoroLen', 'omnistax-pomodoro-lock': 'files.sync.record.pomodoroLock',
  'omnistax-shortcuts': 'files.sync.record.shortcuts', 'omnistax-practice': 'files.sync.record.practice', 'omnistax-practice-sessions': 'files.sync.record.practiceSessions',
  'omnistax-practice-links': 'files.sync.record.practiceLinks', 'omnistax-practice-pages': 'files.sync.record.practicePages', 'omnistax-library': 'files.sync.record.library',
  'omnistax-explorer': 'files.sync.record.explorer', 'omnistax-notedocs': 'files.sync.record.notedocs', 'omnistax-layout': 'files.sync.record.layout',
  'omnistax-scopes': 'files.sync.record.scopes', 'omnistax-folded': 'files.sync.record.folded', 'omnistax-hidden-figs': 'files.sync.record.hiddenFigs',
  'omnistax-seen-releases': 'files.sync.record.seenReleases', 'omnistax-auto-update': 'files.sync.record.autoUpdate', 'omnistax-file-index': 'files.sync.record.fileIndex',
  'omnistax-filemarks': 'files.sync.record.filemarks', 'omnistax-ai': 'files.sync.record.ai', 'omnistax-chat-index': 'files.sync.record.chatIndex',
  'omnistax-chat-pages': 'files.sync.record.chatPages', 'omnistax-chats-by-book': 'files.sync.record.chatsByBook', 'omnistax-chat-seen': 'files.sync.record.chatSeen',
  'omnistax-chat-tree': 'files.sync.record.chatTree', 'omnistax-drawing-index': 'files.sync.record.drawingIndex', 'omnistax-scratch-index': 'files.sync.record.scratchIndex',
  'omnistax-drawing-palette': 'files.sync.record.drawingPalette', 'omnistax-pomodoros': 'files.sync.record.pomodoros', 'omnistax-pomodoro-categories': 'files.sync.record.pomodoroCategories',
  'omnistax-tip-history': 'files.sync.record.tipHistory', 'omnistax-last-page': 'files.sync.record.lastPage', 'omnistax-seen-notes': 'files.sync.record.seenNotes',
};
const PER_BOOK: readonly (readonly [RegExp, MessageKey])[] = [
  [/^omnistax-notes-(.+)$/, 'files.sync.record.notes'],
  [/^omnistax-highlights-(.+)$/, 'files.sync.record.highlights'],
  [/^omnistax-colours-(.+)$/, 'files.sync.record.colours'],
];

/* The description of a record by its key, or null for a key it has none for. */
export const describeRecord = (key: string, locale: Locale, bookName: (id: string) => string = (id) => id): string | null => {
  const own = RECORD[key];
  if (own) return tIn(locale, own);
  for (const [re, msg] of PER_BOOK) { const m = re.exec(key); if (m) return tIn(locale, msg, { book: bookName(m[1]) }); }
  return null;
};

export const describe = (path: RepoPath, locale: Locale, bookName?: (id: string) => string): string | null => {
  if (path === MANIFEST) return tIn(locale, 'files.sync.record.manifest');
  const key = recordKeyOf(path);
  return key ? describeRecord(key, locale, bookName) : null;
};
