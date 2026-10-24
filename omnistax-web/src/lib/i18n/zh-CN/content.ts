/* Simplified Chinese for en/content.ts: one value per key, no more and no fewer
   (the type says so).
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { content as source } from '../en/content';

export const content: Readonly<Record<keyof typeof source, string>> = {
  'content.ai.byline': '由 {makers} 生成',
  'content.ai.effort': '{model} · {effort} 强度',
  'content.ai.mark': 'AI 生成',
  'content.ai.part': '{maker}：{part}',
  'content.ai.sentence.both': '文本的改造与模拟的构建均由 {text} 完成。',
  'content.ai.sentence.split': '文本由 {text} 改造，模拟由 {figures} 构建。',
  'content.ai.sentence.text': '文本由 {text} 改造。',
  'content.ai.with': ' 与 ',
  'content.chapter.eyebrow': '第{id}章 · {title}',
  'content.corrections': '勘误',
  'content.credit.access': '可在 {url} 免费获取。',
  'content.credit.by': '，{authors} 著',
  'content.credit.citation': '{works}{by}，{publisher}，{holder} {license}，由 OmniStax 改编并以相同许可证共享。{access}{ai}',
  'content.credit.footer': '文本来自 {works}{by}（{publisher}{holder}），{license}，由 OmniStax 改编并以相同许可证共享。',
  'content.figure': '图',
  'content.figure.numbered': '图 {numbers}',
  'content.ld.resourceType': '交互式教材中的一节',
  'content.list.and': '{rest} 和 {last}',
  'content.list.comma': '、',
  'content.next': '下一页',
  'content.notes': '注释',
  'content.pageLabel': '{id} {title}',
  'content.pageNav.label': '本页的前一页和后一页',
  'content.pageTitle': '{page} · {book}',
  'content.practice.button': '练习本节',
  'content.practice.none': '本节没有练习题',
  'content.practice.open': '为本节开启练习轮',
  'content.previous': '上一页',
  'content.sheet.description': '{sheet}，{book}的参考表。',
  'content.summary.heading': '本节小结',
  'content.textTitle': '{id} 正文',
} as const;
