/* The standing page of the site as an HTML fragment: the front of OmniStax.
   It is built here so that the same markup can be served on its own
   (about.html) and placed in the static pool of the page whose URL it is.
   Everything is a string; no DOM is touched and no dependency is added,
   because this runs at build time. The page is one <article class="page"
   data-page="about"> that the shell adopts as it adopts a section's article.
   Its introduction is written here per locale, a feature that lights its
   place in the shell marked as <span class="feature" data-feature="…">. The
   fragment is built once per language (about.html, about.zh-CN.html); a
   language with no introduction of its own falls back to English. */
import { type ByLocale, type Locale, localePath, pick, tIn } from '../i18n/index';

const INTRO: ByLocale<string> = {
  en: `
    <p class="intro">OmniStax/万象 is the first Integrated Learning Environment (ILE). It mimics the user experience of programming IDEs to reduce cognitive friction: color-coded text, concept gotos, and a powerful list of builtin tools—<span class="feature" data-feature="notes">markdown notetaker</span>, <span class="feature" data-feature="pomodoro">pomodoro</span>, <span class="feature" data-feature="drawer">free-hand drawer</span>, <span class="feature" data-feature="ai">Ask AI plugin</span>, and an <span class="feature" data-feature="exercises">exercise view</span> to practice and track concept progress.</p>
    <p class="intro">The main contribution of OmniStax is our OmniBooks. We transform open-source textbooks using AI, replacing diagrams with beautiful widgets while maintaining the original tone and text. We currently boast five textbooks.</p>
    <p class="intro">OmniStax is forever free and open-source! Make suggestions, spend tokens to help transform or translate a book, all is welcome!</p>`,
  'zh-CN': `
    <p class="intro">万象/OmniStax 把IDE（集成开发环境）的顺手感带到学习里。因此，我称它为第一个 ILE（Integrated Learning Environment，“集成学习环境”）。文字按颜色标好，概念一点就跳，自配一套学习工具：<span class="feature" data-feature="notes">Markdown 笔记</span>、<span class="feature" data-feature="pomodoro">番茄钟</span>、<span class="feature" data-feature="drawer">手绘板</span>、<span class="feature" data-feature="ai">问 AI</span>，<span class="feature" data-feature="exercises">做题库</span>。</p>
    <p class="intro">OmniStax使用AI改编开源教科书，使静态插图换成了漂亮的动态演示，可以直接拖动、调参数，而原书的文字则完全保留。我们目前提供五本万象书，请开源者们一起开发！</p>`,
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const REPO = 'https://github.com/OmniStax/OmniStax';

const GITHUB_MARK = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

/* The front of OmniStax: the title with the repository beside it, the
   introduction in the author's own words, and a way into the books. */
export const aboutHtml = (locale: Locale = 'en'): string => {
  const t = (key: Parameters<typeof tIn>[1], params?: Parameters<typeof tIn>[2]): string => tIn(locale, key, params);
  return `<article class="page" data-page="about" lang="${locale}">
  <header>
    <div class="masthead">
      <img class="logo light" src="/logos/wanxiang-primary-cinnabar.svg" alt="" width="56" height="56">
      <img class="logo dark" src="/logos/wanxiang-dark-mode.svg" alt="" width="56" height="56">
      <h1>OmniStax/万象</h1>
      <a class="repo" href="${esc(REPO)}" target="_blank" rel="noopener noreferrer">
        ${GITHUB_MARK}
        <span class="name">OmniStax/OmniStax</span>
      </a>
    </div>
    ${pick(INTRO, locale).trim()}
  </header>

  <div class="coda">
    <button type="button" class="btn primary try" data-find-textbook>${esc(t('about.try'))}</button>
    <a class="btn try" href="${localePath('/download/', locale)}" target="_blank" rel="noopener" data-download>${esc(t('about.download.title'))}</a>
  </div>
</article>`;
};
