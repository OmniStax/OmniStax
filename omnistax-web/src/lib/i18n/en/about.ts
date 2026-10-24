/* English UI text for src/lib/content/pages.ts, src/pages/index.astro, src/pages/404.astro.

   Keys are dotted, area.component.thing ('about.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/about.ts too, or npm run check fails. */
export const about = {
  'about.description': 'OmniStax/万象 is a next-gen, self-hostable STEM learning platform built from open source textbooks.',
  'about.download.browser': 'Open OmniStax in the browser',
  'about.download.description': 'OmniStax for Windows, macOS and Linux.',
  'about.download.for': 'Download for {os}',
  'about.download.older': 'Older versions',
  'about.download.title': 'Download OmniStax',
  'about.feature.ai': 'Ask AI plugin',
  'about.feature.drawer': 'free-hand drawer',
  'about.feature.notes': 'markdown notetaker',
  'about.feature.pomodoro': 'pomodoro',
  'about.intro.books': 'The main contribution of OmniStax is our OmniBooks: Open-source textbooks transformed by AI. AI maintains the original writing but replaces old and static diagrams with interactive widgets. AI also organizes the text, doing natural language stuff to extract exercises and color code.',
  'about.intro.features': 'OmniStax is feature-rich. It has a {notes}, {pomodoro}, {drawer}, {ai}, and even an annotator for your uploaded PDFs. Everything is integrated! For example, you can drag a formula or figure from an OmniBook and drop it into a note.',
  'about.intro.platform': 'OmniStax/万象 is a next-gen, open-sourced STEM learning platform. It mimics the user experience of programming IDEs to reduce cognitive friction. As such, I\'m calling it the first Integrated Learning Environment (ILE).',
  'about.notFound.description': 'There is no page at this address.',
  'about.notFound.title': 'Not found · OmniStax',
  'about.title': 'OmniStax',
  'about.try': 'Try an OmniBook',
  'about.whatsNew.empty': 'Nothing yet.',
  'about.whatsNew.title': 'What’s new in OmniStax',
} as const;
