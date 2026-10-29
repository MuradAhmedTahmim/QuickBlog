# QuickBlog

A bilingual blogging platform. Readers get a fast, quiet reading experience in
Bengali or English; writers get a CMS with AI-assisted drafting, image hosting
and honest analytics.

**There is no mobile app.** QuickBlog is a responsive web application only — a
React single-page app that works from a 320px phone screen up to a desktop
display. No iOS or Android project exists in this archive or anywhere else, and
nothing here is a wrapper around a native app.

- **Live demo:** https://quickblog-web-blush.vercel.app
- **Admin / CMS:** https://quickblog-web-blush.vercel.app/admin
- **API:** https://quickblog-api-lemon.vercel.app
- **Version:** 1.0.0 — see [CHANGELOG.md](CHANGELOG.md)
- **Licence:** see [LICENSE-NOTE.md](LICENSE-NOTE.md)

---

## Demo credentials

Sign in on the live URL with the demo account. It is created by
`database/seed.js` along with the sample articles, comments, saves and analytics
history described below.

| | |
|---|---|
| **Email** | `demo@quickblog.dev` |
| **Password** | `DemoReader#2026` |

**What the demo account can do.** It is an **author**, deliberately scoped:

- read, like, save and comment on any article
- write, edit, publish and delete **its own** articles
- see an analytics dashboard covering **its own** articles only

**What it cannot do.** It is not an administrator. It cannot approve or delete
comments, cannot see or change another author's articles, cannot read the
newsletter list, and has no destructive rights over the site. Those belong to
the admin account, whose credentials live only in the server's `.env` and are
not published anywhere.

If you are setting this up yourself, the demo password comes from
`DEMO_PASSWORD` when that is set — see [HowToSetup.md](HowToSetup.md).

---

## Who it is for

- **Readers** who want one site rather than two, in the language they actually
  read, with dates and numerals to match.
- **Writers and small publications** who need a CMS that gets out of the way:
  a first draft from AI, a thumbnail that is optimised for them, and numbers
  that are not inflated by their own refreshes.
- **Editors** moderating comments and watching what is actually being read.

## Features

### Reading

- **Bilingual, end to end.** One toggle switches the interface, the date
  formatting and the Bengali numerals — and the article list itself. An article
  can be marked English, Bengali, or shown in both.
- **Articles** with categories, search, a featured lead post and related posts.
- **Trending** ranked from real views, likes and comments, weighted against age
  so a strong new post can outrank an old one.
- **Reading time** calculated from the body and recalculated on every edit.
- **Accounts** so readers can like articles, save them for later and comment.
- **Author profiles** with a picture, bio and that author's published work.
- **Light and dark themes**, following the system until the reader chooses.

### Writing and publishing

- **Rich text editor** (Quill) with a sanitising pass before anything is stored.
- **AI drafting** — a first draft from Google Gemini, which you then rewrite.
- **ImageKit upload pipeline** — thumbnails and avatars are uploaded, converted
  to WebP and resized on the way in.
- **Drafts** visible to their author and to admins, and to nobody else.
- **Readable slugs** generated from the title, in either script.

### Measuring and moderating

- **Analytics dashboard** — views, unique readers, likes, comments, top
  articles and a fourteen-day engagement chart.
- **De-duplicated view counting** — one unique reader per article per six hours,
  so refreshing a page does not inflate anything.
- **Comment moderation** — comments are held until an admin approves them.
- **Newsletter** signups stored against real accounts.

## Screenshots

Screenshots are not committed to this archive, to keep it small. The live demo
above is the fastest way to see the product; these are the five screens worth
looking at:

| Screen | Path on the live URL | What it shows |
|---|---|---|
| Home | `/` | Featured post, category filter, search, trending, language toggle |
| Article | `/blog/<slug>` | Reading view, reading time, like, save, comments |
| Saved | `/saved` | A reader's bookmarked articles |
| Dashboard | `/admin` | Analytics cards and the fourteen-day engagement chart |
| Editor | `/admin/addBlog` | Rich text editor, AI drafting, thumbnail, language |

To capture your own, run the app (see [HowToSetup.md](HowToSetup.md)), seed the
sample data, and save images into a `docs/screenshots/` folder.

## Stack

| | |
|---|---|
| **Client** | React 19, Vite 6, Tailwind CSS 4, React Router 7, Quill |
| **API** | Node.js (LTS), Express 5, Mongoose 8, JWT, bcrypt |
| **Database** | MongoDB |
| **Services** | Google Gemini (AI drafting), ImageKit (image hosting) |
| **Tests** | Vitest + supertest, against an in-memory MongoDB |
| **Deployment** | Vercel (current live demo), or a VPS, or Docker Compose |

## Repository layout

```
QuickBlog/
  README.md              this file
  HowToSetup.md          install guide: VPS and Docker
  CLAUDE.md              architecture guide for AI coding tools
  CHANGELOG.md           version history
  LICENSE-NOTE.md        licence and third-party service terms
  docker-compose.yml     API + client + MongoDB
  client/                React + Vite web app        -> "React Client/" in the submission ZIP
  server/                Express REST API            -> "Express API/" in the submission ZIP
  database/              schema.js, seed.js
  docs/                  API reference, data model, roles, deployment notes
  scripts/               submission packaging
```

> The submission ZIP uses the folder names `React Client/` and `Express API/`
> required by the Vibe96 structure. The repository keeps `client/` and `server/`
> because the live Vercel deployment points at those paths. `npm run
> package:submission` builds the ZIP with the required names and rewrites
> `docker-compose.yml` to match.

## Quick start

Full instructions, including VPS and Docker, are in
[HowToSetup.md](HowToSetup.md). The short version:

```bash
# 1. API
cd server
cp .env.example .env          # then replace every CHANGE_ME
npm install
npm run server                # http://localhost:3000

# 2. Database: collections, indexes and sample content
cd ..
npm install
npm run db:schema
npm run db:seed

# 3. Client, in a second terminal
cd client
npm install
npm run dev                   # http://localhost:5173
```

`server/.env.example` is the only example config in the project. The client
needs one variable of its own, `VITE_BASE_URL`; it defaults to
`http://localhost:3000` and is documented in
[HowToSetup.md](HowToSetup.md#client-configuration).

## Tests

```bash
cd server
npm test
```

72 tests. Vitest mounts the Express app with supertest against a throwaway
in-memory MongoDB, covering registration and login, token and role enforcement
on every write route, the full article create–read–update–delete cycle
including ownership, and that the start-up backfill never overwrites an
existing value. See [CLAUDE.md](CLAUDE.md#tests) for the breakdown.

## Security notes

- Every POST route requires a valid JWT. CMS and publishing routes additionally
  require the `admin` or `author` role. The full matrix is in
  [docs/ROLES.md](docs/ROLES.md).
- Authors can only read and change their own articles, drafts, bookmarks and
  profile — enforced per document in the API, not in the interface.
- Article HTML is sanitised before storage; comments are stored as plain text.
- Passwords are bcrypt hashed and never returned by any endpoint.
- No real credential is committed anywhere in this archive. Every value in
  `server/.env.example` is a placeholder.
