/* The app calls AI providers and GitHub straight from the page, which a browser
   allows only where the server says so. Here the shell says so itself: every
   HTTPS host and the reader's own machine answer the app's CORS checks, so
   Ollama and LM Studio need no setup. A private network address other than
   loopback gets no answer.
   ponytail: only IP literals are checked; a name resolving to a private address
   passes. Resolve names first if the shell ever loads pages other than the app. */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[f[cd])/;
const allowed = (url) => {
  const u = new URL(url);
  return u.protocol === 'https:' ? !PRIVATE.test(u.hostname) : u.protocol === 'http:' && LOOPBACK.has(u.hostname);
};

module.exports = (session, origin) => {
  const asked = new Map();   /* a preflight's id -> the headers it asked for */
  const filter = { urls: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*', 'http://[::1]/*'] };
  session.webRequest.onBeforeSendHeaders(filter, (d, done) => {
    if (d.method === 'OPTIONS') asked.set(d.id, Object.entries(d.requestHeaders).find(([k]) => k.toLowerCase() === 'access-control-request-headers')?.[1] ?? '');
    done({});
  });
  session.webRequest.onHeadersReceived(filter, (d, done) => {
    if (new URL(d.url).origin === origin || !allowed(d.url)) return done({});
    const headers = Object.fromEntries(Object.entries(d.responseHeaders ?? {}).filter(([k]) => !k.toLowerCase().startsWith('access-control-')));
    headers['Access-Control-Allow-Origin'] = [origin];
    headers['Access-Control-Allow-Methods'] = ['GET, POST, PUT, PATCH, DELETE, OPTIONS'];
    headers['Access-Control-Allow-Headers'] = [asked.get(d.id) || '*'];
    headers['Access-Control-Expose-Headers'] = ['*'];
    const preflight = d.method === 'OPTIONS'; asked.delete(d.id);
    done(preflight ? { responseHeaders: headers, statusLine: 'HTTP/1.1 204 No Content' } : { responseHeaders: headers });
  });
};
