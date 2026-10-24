/* The standing page of the site as an HTML fragment: the front of OmniStax.
   It is built here so that the same markup can be served on its own
   (about.html) and placed in the static pool of the page whose URL it is.
   Everything is a string; no DOM is touched and no dependency is added,
   because this runs at build time. The page is one <article class="page"
   data-page="about"> that the shell adopts as it adopts a section's article.
   Its words are the `about` area of the catalog. The page is static and one
   for the whole site, so it is English for now (every caller passes no
   locale); a front page per language is a page that passes its own. */
import { type Locale, tIn } from '../i18n/index';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const REPO = 'https://github.com/BlastWind/OmniStax';

const GITHUB_MARK = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

/* The front of OmniStax: the title with the repository beside it, the
   introduction in the author's own words, and a way into the books. Each
   feature named in the introduction lights its place in the shell on hover. */
export const aboutHtml = (locale: Locale = 'en'): string => {
  const t = (key: Parameters<typeof tIn>[1], params?: Parameters<typeof tIn>[2]): string => tIn(locale, key, params);
  const feature = (name: 'notes' | 'pomodoro' | 'drawer' | 'ai'): string =>
    `<span class="feature" data-feature="${name}">${esc(t(`about.feature.${name}`))}</span>`;
  return `<article class="page" data-page="about">
  <header>
    <div class="masthead">
      <h1>OmniStax/万象</h1>
      <a class="repo" href="${esc(REPO)}" target="_blank" rel="noopener noreferrer">
        ${GITHUB_MARK}
        <span class="name">BlastWind/OmniStax</span>
      </a>
    </div>
    <p class="intro">OmniStax/万象 is the first Integrated Learning Environment (ILE) as it mimics the user experience of programming IDEs to reduce cognitive friction: color-coded text, concept gotos, and a powerful list of builtin tools—<span class="feature" data-feature="notes">markdown notetaker</span>, <span class="feature" data-feature="pomodoro">pomodoro</span>, <span class="feature" data-feature="drawer">free-hand drawer</span>, <span class="feature" data-feature="ai">Ask AI plugin</span>, and a <span class="feature" data-feature="exercises">exercise view</span> to practice and track concept progress.</p>
    <p class="intro">The main contribution of OmniStax is our OmniBooks. We transform open-source textbooks using AI, replacing diagrams with beautiful widgets while maintaing the original tone and text. We currently boast five textbooks.</p>
    <p class="intro">OmniStax is forever free and open-source! Make suggestions, spend tokens to help transform or translate a book, all is welcome!
    </header>

  <div class="coda">
    <button type="button" class="btn primary try" data-find-textbook>${esc(t('about.try'))}</button>
  </div>
</article>`;
};
