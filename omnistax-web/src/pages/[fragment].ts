/* The standing pages as fragments, one per language, so the shell can open
   them as tabs wherever it is asked: /about.html, /about.zh-CN.html,
   /whatsnew.html, … (fragmentUrl names them; registry.pageFor fetches them). */
import type { APIRoute, GetStaticPaths } from 'astro';
import { LOCALES, fragmentUrl, type Locale } from '../lib/i18n/index';
import { aboutHtml } from '../lib/content/pages';
import { readNotes, whatsNewHtml } from '../lib/content/releases';

const PAGES: Readonly<Record<string, (locale: Locale) => string>> = {
  about: (locale) => aboutHtml(locale),
  whatsnew: (locale) => whatsNewHtml(readNotes(), locale),
};
export const getStaticPaths: GetStaticPaths = () =>
  Object.keys(PAGES).flatMap((page) => LOCALES.map((locale) => ({ params: { fragment: fragmentUrl(page, locale).slice(1) }, props: { page, locale } })));
export const GET: APIRoute = ({ props }) =>
  new Response(PAGES[props.page as string](props.locale as Locale), { headers: { 'content-type': 'text/html; charset=utf-8' } });
