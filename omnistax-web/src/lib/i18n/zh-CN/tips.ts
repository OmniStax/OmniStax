/* Simplified Chinese for en/tips.ts: one value per key, no more and no fewer
   (the type says so).
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { tips as source } from '../en/tips';

export const tips: Readonly<Record<keyof typeof source, string>> = {
  'tips.drag': '把概念、公式、定义、图或模拟直接拖进笔记。',
  'tips.drawing': '在手绘视图中用数位板和笔手写笔记、做练习。',
  'tips.drawing.action': '新建手绘',
  'tips.import': '导入你自己的 PDF，为其添加批注，并把其中的高亮链接到你的笔记中。',
  'tips.import.action': '导入文件',
  'tips.newGroup': '按住 Ctrl 单击或用中键单击一节、笔记、手绘或链接，即可在当前编组旁的新编组中打开它。',
  'tips.theme': '每本教材都有一个主题，位于资源管理器中该书所在行的调色板按钮后：每个量的颜色、调色板，以及它进行颜色编码的内容。',
  'tips.toast.close': '关闭小贴士',
  'tips.toast.label': '小贴士',
  'tips.toast.next': '下一条小贴士',
  'tips.toast.previous': '上一条小贴士',
  'tips.toast.stop': '不再显示小贴士',
} as const;
