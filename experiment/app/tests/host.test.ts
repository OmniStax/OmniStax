import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browserOf, kept, keptChords, hostName, RESERVED } from '../src/lib/commands/host';
import { chord, type Chord } from '../src/lib/commands/chord';
import { DEFAULT_PAIRS } from '../src/lib/commands/defaults';

const c = (s: string): Chord => chord(s)!;
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const EDGE = CHROME + ' Edg/128.0.0.0';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0';
const SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15';

test('the browser family is read from the user agent', () => {
  assert.equal(browserOf(CHROME), 'chromium'); assert.equal(browserOf(EDGE), 'chromium');
  assert.equal(browserOf(FIREFOX), 'firefox'); assert.equal(browserOf(SAFARI), 'safari');
  assert.equal(browserOf('curl/8.0'), 'other');
});
test('a Chromium tab keeps Ctrl+W; an installed app and full screen keep nothing', () => {
  assert.ok(kept({ browser: 'chromium', surface: 'tab' }, c('Ctrl+W')));
  assert.ok(kept({ browser: 'chromium', surface: 'tab' }, c('Ctrl+PageDown')));
  assert.ok(!kept({ browser: 'chromium', surface: 'app' }, c('Ctrl+W')));
  assert.ok(!kept({ browser: 'chromium', surface: 'fullscreen' }, c('Ctrl+W')));
  assert.deepEqual(keptChords({ browser: 'chromium', surface: 'app' }), []);
});
test('Firefox keeps its chords on every surface, and the palette chord among them', () => {
  assert.ok(kept({ browser: 'firefox', surface: 'tab' }, c('Ctrl+Shift+P')));
  assert.ok(kept({ browser: 'firefox', surface: 'fullscreen' }, c('Ctrl+W')));
  assert.ok(!kept({ browser: 'firefox', surface: 'tab' }, c('Ctrl+Shift+T')), 'Firefox lets a page take Ctrl+Shift+T');
});
test('an unbound chord is free, a sequence is judged by its first press, and every list parsed', () => {
  assert.ok(!kept({ browser: 'chromium', surface: 'tab' }, c('Ctrl+\\')));
  assert.ok(kept({ browser: 'chromium', surface: 'tab' }, c('Ctrl+W Ctrl+S')));
  assert.ok(!kept({ browser: 'chromium', surface: 'tab' }, c('Ctrl+K Ctrl+W')));
  assert.equal(RESERVED.chromium.length, 12); assert.equal(RESERVED.firefox.length, 10); assert.equal(RESERVED.safari.length, 9);
});
test('the defaults a Chromium tab keeps are the ones the comments admit to', () => {
  const held = DEFAULT_PAIRS.filter(([ch]) => kept({ browser: 'chromium', surface: 'tab' }, c(ch))).map(([, id]) => id).sort();
  assert.deepEqual(held, ['close-group', 'close-tab', 'next-tab', 'previous-tab', 'reopen-closed-tab']);
});
test('the host is named for the reader', () => {
  assert.equal(hostName({ browser: 'chromium', surface: 'tab' }), 'Chrome, in a browser tab');
  assert.equal(hostName({ browser: 'firefox', surface: 'fullscreen' }), 'Firefox, in full screen');
});
