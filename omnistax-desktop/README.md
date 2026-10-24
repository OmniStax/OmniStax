# OmniStax desktop

A window on omnistax.org: the app and its books come from the site, and the
shell adds the keys a browser keeps, CORS-free requests to AI providers and
GitHub, and its own updates. Design: `omnistax-web/docs/release-plan.md`,
decisions 9 to 15.

- `npm start` opens it; `OMNISTAX_URL=http://127.0.0.1:8090 npm start` points
  it at a local `dist` served for testing.
- `npm run dist` builds this system's installer into `dist/`. Releases are
  built by `.github/workflows/release.yml`, which sets the version.
