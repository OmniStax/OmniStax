/* Simplified Chinese for en/about.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { about as source } from '../en/about';

export const about: Readonly<Record<keyof typeof source, string>> = {
  'about.description': 'OmniStax/万象 is a next-gen, self-hostable STEM learning platform built from open source textbooks.',
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
};
