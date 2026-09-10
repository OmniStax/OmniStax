/* Where the book the tests read sits. The build resolves the content root once,
   from the environment with a default, so a test that reads the real files asks
   the configuration for it rather than counting `..`s from its own folder. */
import { config } from '../omnistax.config';

export const ROOT: string = config.content.root;
