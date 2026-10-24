/* Simplified Chinese for en/pomodoro.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { pomodoro as source } from '../en/pomodoro';

export const pomodoro: Readonly<Record<keyof typeof source, string>> = {
  'pomodoro.cancel': '取消',
  'pomodoro.category.add': '添加',
  'pomodoro.category.color': '颜色 {color}',
  'pomodoro.category.empty': '还没有类别。',
  'pomodoro.category.label': '类别',
  'pomodoro.category.new': '新建类别…',
  'pomodoro.category.placeholder': '类别名称',
  'pomodoro.editor.add': '添加专注时段',
  'pomodoro.editor.day': '日期',
  'pomodoro.editor.edit': '编辑专注时段',
  'pomodoro.editor.from': '开始',
  'pomodoro.editor.placeholder': '你做了什么？',
  'pomodoro.editor.save': '保存',
  'pomodoro.editor.summary': '摘要',
  'pomodoro.editor.to': '结束',
  'pomodoro.lock.failing': '专注时段将在 {secs} {n, plural, other {秒}}后失败',
  'pomodoro.row.actions': '此专注时段的操作',
  'pomodoro.row.ask': '删除？',
  'pomodoro.row.delete': '删除',
  'pomodoro.row.edit': '编辑',
  'pomodoro.row.no': '否',
  'pomodoro.row.yes': '是',
};
