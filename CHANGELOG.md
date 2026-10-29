# Changelog

All notable changes to QuickBlog are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-10-29

First complete release. QuickBlog is a bilingual blogging platform: a React
single-page reading experience and CMS over an Express and MongoDB REST API,
with JWT authentication, AI-assisted drafting, image hosting and analytics.

**There is no mobile app.** QuickBlog is a responsive web application only.

### Added

#### Reading

- Bilingual interface, English and Bengali, switched with one toggle. Dates and
  numerals follow the language, including Bengali numerals throughout.
- Bilingual **content** switching: an article is marked English, Bengali or
  shown in both, and the article list follows the reader's language. An empty
  result falls back to the unfiltered list rather than an empty site.
- Article pages with categories, search across title, subtitle and category, a
  featured lead post and related posts.
- Trending ranking from real views, likes and comments, weighted against age.
- Reading time calculated from the article body and recalculated on every edit.
- Readable article slugs derived from the title, in Latin or Bengali script.
  Articles resolve by slug as well as by id.
- Reader accounts: like articles, save them for later, and comment.
- Author profile pages with a picture, bio and that author's published work.
- Light and dark themes, following the system until the reader chooses.
- Newsletter signup.

#### Writing and publishing

- Rich text editor (Quill) with a server-side sanitising pass before storage.
- **AI drafting** through Google Gemini, isolated in one service module with
  automatic fallback across models when one is overloaded.
- **ImageKit upload pipeline**: thumbnails and avatars uploaded, converted to
  WebP and resized on the way in.
- Drafts, visible to their author and to admins and to nobody else.
- Article create, edit, publish/unpublish and delete.

#### Measuring and moderating

- **Analytics dashboard**: views, unique readers, likes, comments, drafts,
  subscribers, most-viewed and most-engaged articles, recent activity, and a
  fourteen-day engagement chart with a table alternative.
- View counting de-duplicated per reader with a six-hour window, so refreshing
  a page cannot inflate the numbers.
- Comment moderation: comments are held until an admin approves them.

#### Roles and security

- Three roles: `user` (reader), `author` (writes and publishes their own work),
  `admin` (full CMS and moderation).
- Every `POST` route behind JWT middleware. The three endpoints that issue a
  token are the only exceptions.
- CMS and publishing routes require the `admin` or `author` role.
- Per-document ownership checks: an author may only read and change their own
  articles, drafts, bookmarks and profile. An author's dashboard covers only
  their own articles.
- Configurable CORS allow-list via `CLIENT_URL`; configurable token lifetime
  via `JWT_EXPIRES_IN`.
- Passwords bcrypt hashed, never returned by any endpoint. Login gives the same
  answer for a wrong password and an unknown account, so accounts cannot be
  enumerated.
- Article HTML sanitised before storage; comments stored as plain text.

#### Database

- `database/schema.js` — idempotent, non-destructive script that creates every
  collection from an empty database, attaches a JSON Schema validator to each,
  and creates all indexes: unique user email, unique post slug, post author and
  status, comment post, unique bookmark user and post, analytics events.
- `database/seed.js` — sample content for a non-empty first run: three
  accounts including the demo one, six articles across both languages plus a
  draft, approved and pending comments, bookmarks, likes, and fourteen days of
  analytics events. Idempotent, and will never touch a document it did not
  create.

#### Infrastructure, tests and documentation

- `docker-compose.yml` running the API, the client and MongoDB together, with
  a multi-stage client image served by Nginx and health checks on both
  services.
- Automated test suite: 69 Vitest tests with supertest, against an in-memory
  MongoDB, covering authentication, token and role enforcement, the full
  article CRUD cycle including ownership, and the additive-only start-up
  backfill.
- `README.md`, `HowToSetup.md` (VPS and Docker), `CLAUDE.md`,
  `LICENSE-NOTE.md`, and `docs/` with an API reference, role matrix, data model
  and deployment notes.
- `scripts/package-submission.mjs` builds the submission archive.
- `GET /health` endpoint for load balancer and container health checks.

### Changed

- **Commenting now requires a signed-in account.** The display name is taken
  from the account rather than typed, so nobody can comment under another
  person's name. Anonymous visitors get the existing sign-in prompt, and their
  draft comment survives it.
- **Newsletter signup now requires a signed-in account**, for the same reason:
  every write route goes through JWT middleware.
- **Comments are fetched with `GET /api/blog/comments/:blogId`** instead of
  `POST /api/blog/comments`. Reading an article still needs no token; the
  change is what lets every `POST` route insist on one.
- Admin area now admits authors as well as admins, scoped to their own work.
- The admin login accepts an `author` account, not only an `admin` one.
- `server/app.js` extracted from `server/server.js`, so the app can be mounted
  by the test suite without a database or a listener.
- Token lifetime centralised in `server/configs/tokens.js`, configurable rather
  than hard-coded at 30 days.
- The API's `.env.example` is now the single example config in the project and
  documents every variable. The client's example file was removed;
  `VITE_BASE_URL` now defaults to `http://localhost:3000` and is documented in
  `HowToSetup.md`.

### Security

- `sanitize-html` updated to 2.18.1, resolving incomplete URI scheme
  validation that allowed `javascript:` URIs through `action`, `formaction`,
  `data`, `poster` and `background` attributes. QuickBlog's allow-list never
  permitted those attributes, so the app was not exposed. Still pinned exactly,
  as the previous release intended.
- `npm audit` on the API reports no high or critical findings.

### Notes for operators

- `configs/bootstrap.js` runs on every start and is additive only: it creates
  the admin account from `.env` and fills in fields older documents lack. It
  never overwrites an existing value.
- Upgrading from an earlier deployment: deploy the API and the client
  **together**, since comment fetching moved from `POST` to `GET`.
- The `contentLanguage` field is deliberately not called `language`: MongoDB
  treats a field of that name as a text index's language override and would
  reject `'both'`.

[1.0.0]: https://github.com/
