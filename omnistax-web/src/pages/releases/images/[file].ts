/* The images release notes show, kept beside the notes in omnistax-web/releases/images/. */
import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import { NOTES_DIR } from '../../../lib/content/releases';

const DIR = path.join(NOTES_DIR, 'images');
export const getStaticPaths: GetStaticPaths = () =>
  (fs.existsSync(DIR) ? fs.readdirSync(DIR) : []).map((file) => ({ params: { file } }));
export const GET: APIRoute = ({ params }) => new Response(fs.readFileSync(path.join(DIR, String(params.file))));
