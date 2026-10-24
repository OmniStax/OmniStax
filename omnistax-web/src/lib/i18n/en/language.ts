/* English UI text for the reader's language and a book's editions:
   src/components/Settings.svelte (the Language row), src/lib/commands/builtin.ts
   (Change language, Book: switch language), src/components/views/Explorer.svelte
   (Open in …) and src/components/explorer/FindTextbook.svelte (the language group).

   Keys are dotted ('language.…'), sorted inside the file; every key here needs
   a value in zh-CN/language.ts too, or npm run check fails. A language's own
   name (English, 中文（简体）) is LOCALE_NAMES in index.ts, never a key. */
export const language = {
  'language.command': 'Change language',
  'language.command.detail.system': 'System ({language})',
  'language.openIn': 'Open in {language}',
  /* What the settings filter answers to, in both languages, so a reader lost in the other one finds the row. */
  'language.searchWords': 'Language 语言 English 中文 locale',
  'language.setting.hint': 'Follows your browser: {language}',
  'language.setting.name': 'Language',
  'language.setting.system': 'System',
  'language.switchBook': 'Book: switch language',
} as const;
