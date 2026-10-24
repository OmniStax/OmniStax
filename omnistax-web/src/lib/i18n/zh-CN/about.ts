/* Simplified Chinese for en/about.ts: one value per key, no more and no fewer
   (the type says so).
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { about as source } from '../en/about';

export const about: Readonly<Record<keyof typeof source, string>> = {
  'about.description': 'OmniStax/万象是一个基于开源教材构建、可自托管的新一代 STEM 学习平台。',
  'about.feature.ai': '问 AI 插件',
  'about.feature.drawer': '手绘板',
  'about.feature.notes': 'Markdown 笔记',
  'about.feature.pomodoro': '番茄钟',
  'about.intro.books': 'OmniStax 的主要贡献是我们的 OmniBooks：经 AI 改造的开源教材。AI 保留原文，但把陈旧的静态示意图换成交互式小组件。AI 还会整理文本，做些自然语言方面的活儿，来提取练习题和进行颜色编码。',
  'about.intro.features': 'OmniStax 功能丰富。它有{notes}、{pomodoro}、{drawer}、{ai}，甚至还有用于你上传的 PDF 的批注工具。一切都是整合在一起的！例如，你可以从 OmniBook 中拖出一个公式或图，放进笔记里。',
  'about.intro.platform': 'OmniStax/万象是一个新一代的开源 STEM 学习平台。它模仿编程 IDE 的用户体验，以减少认知摩擦。因此，我称它为首个集成学习环境（ILE）。',
  'about.notFound.description': '此地址没有页面。',
  'about.notFound.title': '未找到 · OmniStax',
  'about.title': 'OmniStax',
  'about.try': '试读一本 OmniBook',
} as const;
