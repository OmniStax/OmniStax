import type { APIRoute } from 'astro';
import { tree, json } from '../../lib/content/paths';
export const getStaticPaths = async () => [{ params: { book: (await tree()).dto.id } }];
export const GET: APIRoute = async () => json((await tree()).manifest);
