/* Simplified Chinese for en/language.ts: one value per key, no more and no
   fewer (the type says so). Terms follow GLOSSARY.md (语言, 跟随系统, 版本, 教材). */
import type { language as source } from '../en/language';

export const language: Readonly<Record<keyof typeof source, string>> = {
  'language.command': '切换语言',
  'language.command.detail.system': '跟随系统（{language}）',
  'language.openIn': '以{language}打开',
  'language.searchWords': '语言 Language English 中文 locale 界面语言',
  'language.setting.hint': '跟随浏览器：{language}',
  'language.setting.name': '语言',
  'language.setting.system': '跟随系统',
  'language.switchBook': '教材：切换语言',
};
