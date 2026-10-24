#!/usr/bin/env node
/* `npm run books`, and after every `npm install`: clone each book that
   ../omnistax-content/books.json lists and the content root lacks, shallow, so
   a build never fetches book history. A folder already there is the reader's
   own checkout and is left alone; pull it yourself. A clone that fails fails
   the install, so a deploy never goes out short of a book. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.env.OMNISTAX_CONTENT_DIR?.trim() || '../omnistax-content');
const books = JSON.parse(fs.readFileSync(path.join(root, 'books.json'), 'utf8'));

for (const [folder, { repo, branch }] of Object.entries(books)) {
  const dir = path.join(root, folder);
  if (fs.existsSync(dir)) continue;
  console.log(`books: cloning ${folder} from ${repo}`);
  execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', branch, repo, dir], { stdio: 'inherit' });
}
