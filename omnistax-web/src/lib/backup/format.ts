/* The number of the data format: what the records, chats, drawings and files
   a backup or a sync repo carries look like. It goes up by one with every
   change to what any of them holds, even a field added, and only then; a
   release that changes nothing stored keeps it.

   A build reads data of its own number and of every number below it (what an
   older build wrote, which migrate.ts brings up to date), and writes its own.
   Data of a higher number it does not touch at all: it would drop the fields
   it does not know and send the rest back without them. So a sync repo or a
   backup file of a higher number asks the reader to update first.

   3: every record under one name (migrate.ts), and the release of the build
      that wrote the data recorded beside it.
   2: a sync repo keeps a file per record.
   1: the first. */
export const DATA_VERSION = 3 as const;

/* The release this build is, from the newest release note at build time; a
   run outside a build (the tests) is "dev". */
declare const __OMNISTAX_RELEASE__: string | undefined;
export const APP_RELEASE: string = typeof __OMNISTAX_RELEASE__ === 'string' ? __OMNISTAX_RELEASE__ : 'dev';
