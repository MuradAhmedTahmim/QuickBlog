# CLAUDE.md — guide for AI coding tools

Orientation for an agent working in this repository: what the pieces are, where
each thing lives, the conventions to follow, the role matrix to respect, and how
to run the checks.

> **Folder names.** In the git repository the two Node projects are `client/`
> and `server/`, because the live Vercel deployment points at those paths. The
> Vibe96 submission ZIP renames them to `React Client/` and `Express API/`,
> which `npm run package:submission` does. Paths below use the repository names.

---

## What this is

QuickBlog is a bilingual (English / Bengali) blogging platform:

- a **React + Vite** single-page app — reader experience and CMS
- an **Express + MongoDB** REST API — auth, content, engagement, analytics
- **no mobile app**, and no native project anywhere in this repository

There is no server-side rendering, no GraphQL and no monorepo tooling. The two
Node projects are independent, each with its own `package.json` and lockfile.

## Layout

```
client/                     React + Vite single-page app
  src/
    components/             shared UI; admin/ for dashboard pieces
    pages/                  route components; admin/ for the CMS screens
    context/AppContext.jsx  all app state: session, theme, language, blogs, engagement
    i18n/                   translate() + the en/bn dictionaries
    utils/format.js         number and name formatting helpers
    assets/assets.js        re-exports every image and the category list
  nginx.conf                serves the built bundle in the Docker image

server/                     Express REST API (ESM, "type": "module")
  app.js                    builds and exports the app: no DB, no listener
  server.js                 connects, bootstraps, listens. The real entry point
  routes/                   route tables only; no logic
  controllers/              request handling and all authorisation decisions
  models/                   Mongoose schemas and indexes
  middleware/auth.js        optionalAuth, authRequired, requireRole, adminOnly
  middleware/multer.js      multipart handling for uploads
  configs/                  db, gemini, imageKit, tokens, bootstrap
  utils/                    readingTime, sanitizeContent, slug
  tests/                    Vitest + supertest against in-memory MongoDB

database/                   standalone scripts, run from the repository root
  connect.js                shared connection + collection-name map
  schema.js                 creates collections, validators, indexes
  seed.js                   sample users, bilingual posts, comments, analytics

docs/                       API reference, data model, roles, deployment
scripts/package-submission.mjs   builds the submission ZIP
```

## The two integrations

### Google Gemini — AI drafting

- **Service module:** `server/configs/gemini.js`. The *only* place that talks to
  Gemini. It exports one function, `main(prompt)`, returning the generated text.
- It tries a list of models in order, falling back on the next when one returns
  a 503. Add or reorder models in the `models` array there.
- **Called from:** `generateContent` in `server/controllers/blogController.js`.
- **Route:** `POST /api/blog/generate`, admin or author only.
- **Client:** the "Generate with AI" button in `client/src/pages/admin/AddBlog.jsx`,
  which pipes the result through `marked` into the Quill editor.
- **Key:** `GEMINI_API_KEY`. Absent, only this feature fails; the rest of the
  app is unaffected.

### ImageKit — image hosting

- **Service module:** `server/configs/imageKit.js`. Exports the configured
  client. Nothing else constructs one.
- **Thumbnails:** `uploadThumbnail` in `server/controllers/blogController.js`
  uploads to `/blogs`, then builds a transformed URL (auto quality, WebP,
  1280px wide). Both `addBlog` and `updateBlog` go through it, so stored URLs
  are always consistent.
- **Avatars:** `updateProfile` in `server/controllers/userController.js`
  uploads to `/avatars` at 320×320, `crop: at_max`.
- Uploads arrive as multipart via `middleware/multer.js` (disk storage, default
  temp directory), and the controller reads the temp file with `fs.readFileSync`.
- **Keys:** `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`,
  `IMAGEKIT_URL_ENDPOINT`. Absent, creating an article fails at the thumbnail.
- In tests ImageKit is stubbed with `vi.mock('../configs/imageKit.js', …)` —
  see `server/tests/blogs.test.js`. Never let a test reach the real service.

## Role matrix

Three roles, in `server/models/User.js`: `user`, `author`, `admin`. New
accounts are always `user`. Promote with a direct database update — there is no
endpoint that changes a role, by design.

| Capability | `user` | `author` | `admin` |
|---|:--:|:--:|:--:|
| Read published articles, search, trending | ✅ | ✅ | ✅ |
| Like, bookmark, comment | ✅ | ✅ | ✅ |
| Read and edit **own** bookmarks and profile | ✅ | ✅ | ✅ |
| Read another reader's bookmarks | ❌ | ❌ | ❌ |
| Subscribe to the newsletter | ✅ | ✅ | ✅ |
| Enter the CMS (`/admin`) | ❌ | ✅ | ✅ |
| Create an article | ❌ | ✅ | ✅ |
| Edit / delete / publish **own** article | ❌ | ✅ | ✅ |
| Edit / delete / publish **anyone's** article | ❌ | ❌ | ✅ |
| See **own** drafts | ❌ | ✅ | ✅ |
| See anyone's drafts | ❌ | ❌ | ✅ |
| AI drafting | ❌ | ✅ | ✅ |
| Dashboard scope | — | own articles | whole site |
| Approve / delete comments | ❌ | ❌ | ✅ |
| See the newsletter list | ❌ | ❌ | ✅ |

The authoritative version, per endpoint, is [docs/ROLES.md](docs/ROLES.md).

### How it is enforced

Two layers, and **both** matter:

1. **Route middleware** (`server/middleware/auth.js`) gates by role:
   - `optionalAuth` — attaches `req.user` when a token is present, never blocks
   - `authRequired` — 401 without a valid token
   - `requireRole('admin', 'author')` — 401 without a token, 403 with the wrong role
   - `adminOnly` — admins only
2. **Per-document ownership** in the controller. Middleware cannot know *which*
   article a request is for, so `ownedBlog(id, user)` in `blogController.js`
   returns the article only when the caller owns it or is an admin.
   `scopeToCaller(user)` in `adminController.js` does the same for lists and
   aggregations.

**Every** `POST` route requires JWT middleware. The only exceptions are the
three endpoints that *issue* a token — `POST /api/user/register`,
`POST /api/user/login`, `POST /api/admin/login` — which cannot require one.
Comment reading is a `GET` precisely so that rule holds without making articles
unreadable to signed-out visitors.

**When adding a route:** anything that writes gets `authRequired` at minimum.
If it touches a specific document, check ownership in the controller as well.
The test `tests/auth.test.js > write routes require a token` enumerates the
write routes — add yours to that list.

## Conventions

### Both projects

- **ESM everywhere.** `import`/`export`, no `require`. Both `package.json`
  files set `"type": "module"`.
- **British spelling** in prose and comments; code identifiers stay American
  where an API uses them (`color`, `canceled` in third-party calls).
- **Comments explain why, not what.** The existing comments are the house
  style: short, placed above the thing, and they justify a decision rather than
  narrate the line. Match that density — do not add a comment per line.
- No TypeScript. Do not introduce it.

### API

- **Controllers own authorisation.** Routes are a table of paths and
  middleware, nothing else.
- **Responses are `{success: boolean, …}`.** A business-rule failure returns
  `200` with `success: false` and a `message`. Reserve a non-200 status for
  authentication (`401`) and authorisation (`403`). This is inconsistent with
  REST and deliberate — the client branches on `data.success`. Keep it.
- **Sanitise on the way in, never on the way out.** `sanitizeContent()` for
  article HTML, `sanitizeText()` for anything shown as plain text. Stored data
  is already safe, so no component needs to escape it.
- **Mongoose `save()` over `updateOne()`** when a document hook must run — the
  reading-time hook on `Blog` only fires through `save()`/`create()`.
- **Denormalised counters** (`likesCount`, `commentsCount`, `views`) are
  recomputed from their source collection rather than incremented blindly. See
  `syncCommentCount` in `adminController.js`.
- **Never trust a role or an id from the request body.** Read it from
  `req.user`, which came from the verified token.
- Four-space indentation in `server/`.

### Client

- **All state lives in `AppContext`.** Components call `useAppContext()`. There
  is no Redux, no Zustand, no second context.
- **Never hard-code interface copy.** Every string goes through `t('some.key')`
  and must be added to **both** dictionaries in `src/i18n/translations.js`. A
  missing Bengali key falls back to English, then to the key itself.
- **Numbers go through `n(value)`**, which renders Bengali numerals when the
  language is Bengali. Raw numbers in the interface are a bug.
- **Colours are CSS custom properties** declared once in `src/index.css`
  (`:root` for light, `.dark` for dark). Never write a hex value in a component;
  use the Tailwind aliases (`text-ink`, `bg-surface`, `border-line`,
  `text-muted`, `bg-tealsolid`, …).
- **Route components are lazy** in `App.jsx`, so the Quill editor and the admin
  area stay out of the first download. Keep new heavy routes lazy.
- Two-space indentation in `client/`.

### Bilingual content

Two separate things, easy to confuse:

1. **Interface language** — `language` in `AppContext`, values `'en'` / `'bn'`,
   persisted in `localStorage` under `qb-lang`. Default is `'bn'`
   (`DEFAULT_LANGUAGE` in `src/i18n/index.js`).
2. **Article language** — the `contentLanguage` field on a blog document,
   values `'en'` / `'bn'` / `'both'`.

Switching the interface language re-fetches `/api/blog/all?lang=<code>`, which
returns articles whose `contentLanguage` is that code **or** `'both'`. If that
comes back empty the client retries unfiltered rather than showing an empty
site.

> **The field is `contentLanguage`, not `language`, and must stay that way.**
> MongoDB reads a field literally named `language` as a text index's language
> override, and the `blogs` collection carries a text index on
> `title`/`subTitle`. A document with `language: 'both'` is rejected outright
> with `language override unsupported: both`. Renaming it back would break
> article creation in production.

## Running it

```bash
# API
cd server && npm install && npm run server      # :3000, nodemon

# Client
cd client && npm install && npm run dev         # :5173

# Database (from the repository root)
npm install && npm run db:schema && npm run db:seed
```

Configuration is `server/.env`, copied from `server/.env.example` — the only
example config in the project. The client's one variable, `VITE_BASE_URL`,
defaults to `http://localhost:3000` and needs no file locally.

Full instructions, VPS and Docker: [HowToSetup.md](HowToSetup.md).

## Tests

```bash
cd server
npm test              # vitest run
npm run test:watch    # vitest
npx vitest run tests/blogs.test.js -t "slug"   # one file, one name
```

69 tests in three files. Vitest mounts the real Express app with supertest
against a **throwaway in-memory MongoDB** (`mongodb-memory-server-core`), started in
`tests/setup.js`, which also sets test-only environment variables *before*
anything imports the app — so the suite can never pick up a developer's live
`.env`. Collections are emptied between tests.

| File | Covers |
|---|---|
| `tests/auth.test.js` | Registration validation and duplicate emails; password hashing and non-disclosure; identical wording for wrong-password and unknown-account; malformed, wrongly-signed, orphaned and expired tokens; every write route refusing an anonymous caller; reader / author / admin role boundaries; dashboard scoping; profile isolation and privilege-escalation attempts |
| `tests/blogs.test.js` | Full article create–read–update–delete; slug derivation and collision; HTML sanitising; draft visibility per role; view de-duplication; reading-time recalculation; thumbnail retention; cross-author edit, publish and delete refusals; comment moderation and count syncing; like toggling; bookmark isolation |
| `tests/startup.test.js` | The health endpoints; admin creation from `.env` and its idempotence; the backfill giving an older article a slug, `contentLanguage: 'both'` and zeroed counters **without** overwriting any value it already had; distinct slugs for identically titled articles; the empty-`CLIENT_URL` CORS default |

**Writing a test:** use the helpers in `tests/helpers.js` — `makeUser({role})`
returns `{user, token}`, `blogPayload(overrides)` builds the JSON field, and
`PNG` is a 1×1 image for `.attach('image', PNG, 'thumb.png')`. Stub any
external service; never make a real network call.

## Other checks

```bash
cd client && npm run lint     # eslint
cd client && npm run build    # vite build — must stay clean
cd server && npm audit        # no high or critical findings expected
```

Two moderate `npm audit` findings remain in the API, both in the
`imagekit` → `uuid` chain. The only offered fix is a downgrade to
`imagekit@1.5.0`, a different major version with a different API, so they are
accepted rather than applied. Neither is reachable: the advisory needs a `buf`
argument passed to `uuid`, which `imagekit` does not do.

## Things that will bite you

- **`server/app.js` vs `server/server.js`.** `app.js` has no database
  connection and no `listen`, so tests can import it. `server.js` connects,
  bootstraps and listens. Register middleware and routes in `app.js`; put
  startup work in `server.js`.
- **`configs/bootstrap.js` runs on every start** and is **additive only**. It
  creates the admin from `.env`, then backfills fields that older documents
  lack. Never make it overwrite an existing value.
- **`VITE_BASE_URL` is inlined at build time.** Changing it means rebuilding
  the client, not restarting it.
- **`blogRouter.get('/:blogId')` must stay last** in `routes/blogRoutes.js`, or
  it swallows `/all`, `/trending` and `/comments/:blogId`.
- **The axios `Authorization` header is set at module load** in `AppContext`,
  not in an effect — a page opened straight on an article would otherwise fire
  its request before the header existed and the view would go uncounted.
- **`database/*.js` run from the repository root**, resolving dependencies from
  the root `package.json`. They read `MONGODB_URI` from `server/.env`, or from
  the environment when it is already set.
- **Never commit a `.env`.** `.gitignore` covers them in all three locations.
  Only `server/.env.example` is tracked, and every value in it is a placeholder.

## Documentation to keep in step

| File | Update it when |
|---|---|
| `README.md` | Features, demo credentials, stack, the no-mobile-app statement |
| `HowToSetup.md` | Install steps, environment variables, branding |
| `docs/API.md` | Any route added, removed or changed |
| `docs/ROLES.md` | Any change to who may do what |
| `docs/DATA-MODEL.md` | Any schema, field or index change |
| `database/schema.js` | Any model change — validators and indexes must match |
| `CHANGELOG.md` | Every release |
