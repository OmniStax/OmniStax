/* Simplified Chinese for en/tips.ts: one value per key, no more and no fewer
   (the type says so).
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { tips as source } from '../en/tips';

export const tips: Readonly<Record<keyof typeof source, string>> = {
  'tips.drag': '概念、图和批注可直接拖进 Markdown 笔记或问 AI 对话。',
  'tips.drawing': '在手绘页面中可用数位板和笔写笔记、做练习。',
  'tips.drawing.action': '新建手绘',
  'tips.import': '可以把你自己的文件上传到 OmniStax，PDF 可以直接批注。',
  'tips.import.action': '导入文件',
  'tips.newGroup': '按住 {mod} 点击链接，可在新分组中打开该页面。',
  'tips.theme': '每本教材都有配色编辑器，位于资源管理器中该书所在行的调色板按钮后。词语的颜色编码默认关闭。',
  'tips.toast.close': '关闭小贴士',
  'tips.toast.label': '小贴士',
  'tips.toast.next': '下一条小贴士',
  'tips.toast.previous': '上一条小贴士',
  'tips.toast.stop': '不再显示小贴士',
} as const;
