/* Where the books the tests read sit. The build resolves the content root once,
   from the environment with a default, so a test that reads the real files asks
   the configuration for it rather than counting `..`s from its own folder. A
   test with a fixture in mind asks for the book by its id, since the folder is
   named for the book's title and the configured list may be any books at all. */
import { config } from '../omnistax.config';
import { chooseBooks, findBooks } from '../src/lib/content/load';
import { type BookDir, type BookId, bookId } from '../src/lib/types/ids';

export const ROOT = config.content.root;

/* The folder of one book of the content root, by its id. */
export const bookRoot = async (id: string): Promise<BookDir> => {
  const found = await findBooks(ROOT);
  const folder = found.find((f) => f.id === bookId(id));
  if (!folder) throw new Error(`no book "${id}" under ${ROOT}; found ${found.map((f) => f.id).join(', ') || 'none'}`);
  return folder.dir;
};

/* Every book this build carries, as the tests that read the real files walk them. */
export const bookRoots = async (): Promise<readonly BookDir[]> =>
  chooseBooks(await findBooks(ROOT), config.content.books).map((f) => f.dir);

/* The book the fixtures of the physics tests come from. */
export const PHYSICS: BookId = bookId('college-physics-2e');
