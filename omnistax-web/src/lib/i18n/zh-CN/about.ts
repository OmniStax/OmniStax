/* Simplified Chinese for en/about.ts: one value per key, no more and no fewer
   (the type says so).
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { about as source } from '../en/about';

export const about: Readonly<Record<keyof typeof source, string>> = {
  'about.description': 'OmniStax/万象是一个基于开源教材构建、可自托管的新一代 STEM 学习平台。',
  'about.download.browser': '在浏览器中打开 OmniStax',
  'about.download.description': '适用于 Windows、macOS 和 Linux 的 OmniStax。',
  'about.download.for': '下载 {os} 版',
  'about.download.older': '历史版本',
  'about.download.title': '下载 OmniStax',
  'about.notFound.description': '此地址没有页面。',
  'about.notFound.title': '未找到 · OmniStax',
  'about.title': 'OmniStax',
  'about.try': '试读一本 OmniBook',
  'about.whatsNew.empty': '暂无内容。',
  'about.whatsNew.title': 'OmniStax 新功能',
} as const;
