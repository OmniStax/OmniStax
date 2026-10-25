/* The front page in Chinese, for a reader whose language is Chinese. */
import type { APIRoute } from 'astro';
import { aboutHtml } from '../lib/content/pages';

export const GET: APIRoute = () =>
  new Response(aboutHtml('zh-CN'), { headers: { 'content-type': 'text/html; charset=utf-8' } });
