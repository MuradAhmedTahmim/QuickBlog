# Deployment notes

Step-by-step installs for a VPS and for Docker are in
[HowToSetup.md](../HowToSetup.md). This file covers the things you decide
*around* an install: which platform, what to set, and what to watch.

---

## Shape of the thing

Three pieces, deployable independently:

| Piece | What it is | Needs |
|---|---|---|
| **Client** | Static files from `vite build`. No server-side rendering | Any static host or CDN |
| **API** | Long-running Node process, or serverless functions | Node 20+, reachable MongoDB |
| **Database** | MongoDB 6 or 7 | Self-hosted or Atlas |

The client talks to the API only over HTTP, so the two can live on entirely
different hosts.

---

## Current deployment: Vercel

Both halves run as separate Vercel projects.

| Project | Root directory | Production URL | Config |
|---|---|---|---|
| `quickblog-web` | `client/` | https://quickblog-web-blush.vercel.app | `client/vercel.json` — SPA rewrite to `/index.html` |
| `quickblog-api` | `server/` | https://quickblog-api-lemon.vercel.app | `server/vercel.json` — `@vercel/node` on `server.js` |

Both projects deploy from the `main` branch of
`github.com/MuradAhmedTahmim/QuickBlog`, so a push to `main` redeploys both.

### Environment variables to set in the dashboard

**`quickblog-api`** — every variable from `server/.env.example`:
`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`, `GEMINI_API_KEY`, `IMAGEKIT_PUBLIC_KEY`,
`IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, and `CLIENT_URL` set to the
client's production URL. Omit `PORT` — Vercel assigns it.

**`quickblog-web`** — `VITE_BASE_URL`, set to the API's production URL.
Vite inlines it at **build** time, so changing it requires a redeploy, not a
restart.

### The Node version comes from package.json, not the dashboard

`server/vercel.json` uses the legacy `builds` key, which makes Vercel ignore
the project's Build and Development Settings — including the **Node Version**
shown in the dashboard. It prints a warning saying so on every build.

The runtime version therefore comes from `engines.node` in
`server/package.json`, or from the `@vercel/node` default when that is absent,
which is how it is left. Adding a loose range such as `">=20"` lets the host
resolve to Node 20, which has no `require(esm)` support and breaks any
CommonJS dependency that pulls in an ESM-only package — see the sanitize-html
warning in [CLAUDE.md](../CLAUDE.md#do-not-upgrade-sanitize-html-past-2170).
If you need to pin it, pin an exact major and redeploy the API by itself first.

### Things to know about serverless here

- **Cold starts open a new database connection.** `configs/db.js` caps the pool
  at 10 and the server-selection timeout at 10 s for exactly this reason. A
  free Atlas tier has a modest connection cap; if you see connection errors
  under load, lower `maxPoolSize` or move to a long-running host.
- **`configs/bootstrap.js` runs on every cold start.** It is additive and
  idempotent, so this is safe, but it does add a few queries to a cold request.
- **Atlas network access** must allow Vercel. Vercel's egress addresses are not
  fixed on the Hobby plan, so `0.0.0.0/0` plus a strong database password is
  usually the practical choice. On a VPS, restrict it to that server's IP.
- **The filesystem is read-only except `/tmp`.** Multer writes uploads to the
  system temp directory, which is fine. Do not add code that writes elsewhere.

### Redeploying this release

Comment fetching moved from `POST /api/blog/comments` to
`GET /api/blog/comments/:blogId`, so **deploy the API and the client together.**
An old client against the new API shows no comments; a new client against the
old API does the same. The window between the two deploys is the only exposure,
and it is brief.

Nothing else in this release is a breaking API change. Commenting and newsletter
signup now require sign-in, which the new client handles with its existing
prompt.

---

## Alternatives

| Platform | Client | API | Notes |
|---|---|---|---|
| **Vercel** | ✅ static | ✅ serverless | Current setup. Easiest; mind the cold starts |
| **VPS** (Hetzner, DigitalOcean, Linode) | Nginx static | PM2 or systemd | Most control, no cold starts, cheapest at scale. See [HowToSetup.md](../HowToSetup.md#a-vps-install) |
| **Docker** anywhere | Nginx container | Node container | `docker-compose.yml` ships ready. Good for a single box or a container platform |
| **Netlify / Cloudflare Pages** | ✅ | ✗ | Client only. Put the API elsewhere |
| **Render / Railway / Fly.io** | ✅ static | ✅ container | Long-running process, so no cold starts. Point it at `server/` |

For the client on any static host, the one thing that must be configured is the
**SPA fallback**: unknown paths serve `/index.html`, or `/blog/<slug>` 404s on a
hard refresh. `client/vercel.json` and `client/nginx.conf` both do this.

---

## Pre-flight checklist

Before a production deploy:

- [ ] `JWT_SECRET` is long and random, and **not** the one from any example or
      from a previous environment. Rotating it signs everyone out.
- [ ] `ADMIN_PASSWORD` is strong. It is reapplied from `.env` on every start,
      so this file is the one place it lives.
- [ ] `CLIENT_URL` lists the client's exact origin — scheme, host and port.
      Empty means "any origin", which is a development convenience, not a
      production setting.
- [ ] `MONGODB_URI` has **no** trailing database name; the app appends
      `/quickblog`.
- [ ] `VITE_BASE_URL` points at the API, and the client has been **rebuilt**
      since it changed.
- [ ] HTTPS on both halves. A browser blocks an HTTPS page calling an HTTP API.
- [ ] `npm run db:schema` has been run against the target database.
      **Required**: with `NODE_ENV=production` the API does not create indexes
      itself, so without this the collections have none.
- [ ] The demo account exists and its credentials in `README.md` are correct.
- [ ] `cd server && npm test` passes.
- [ ] `cd client && npm run build` is clean.
- [ ] `cd server && npm audit` shows no high or critical findings.
- [ ] No `.env` is in the archive or the repository. Only
      `server/.env.example`, with placeholders.

---

## After deploying

Quick confidence check:

```bash
curl https://api.your-domain.com/health
# {"success":true,"status":"ok","uptime":…}

curl "https://api.your-domain.com/api/blog/all?lang=en" | head -c 400
```

Then in a browser:

1. The homepage lists articles.
2. The language toggle changes the interface **and** the article list.
3. An article page opens, and its view count moves on a fresh browser.
4. Registration and sign-in work; liking and saving work.
5. `/admin` accepts the admin credentials.
6. The dashboard shows numbers and the fourteen-day chart.
7. Creating an article with a thumbnail succeeds — this is the ImageKit check.
8. "Generate with AI" returns text — this is the Gemini check.

---

## Operating it

### What to watch

| | Where |
|---|---|
| API liveness | `GET /health` |
| Database connection | the `Database Connected` log line on start |
| Bootstrap | `Bootstrap complete (admin ready, …)` on start |
| Errors | `pm2 logs quickblog-api`, `journalctl -u quickblog-api -f`, `docker compose logs -f api`, or the Vercel function logs |

### Backups

Everything that matters is in MongoDB. Uploaded images live in your ImageKit
account and are backed up by them, but the app never deletes remote files, so
an article's image survives the article.

```bash
# nightly dump, keep 14 days
mongodump --uri="mongodb://127.0.0.1:27017/quickblog" --out=/var/backups/quickblog/$(date +%F)
find /var/backups/quickblog -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
```

Atlas takes its own snapshots on paid tiers. On the free tier, run your own
`mongodump`.

Restore with `mongorestore --uri=… --drop /var/backups/quickblog/<date>/quickblog`.
**`--drop` replaces the collections**, so restore into a scratch database first
if you are not certain.

### Scaling, roughly in order

1. **Indexes first.** `npm run db:schema` is what creates them; a slow article
   list almost always means it has not been run.
2. **Put a CDN in front of the client.** The bundle is hashed and immutable.
3. **Cache `GET /api/blog/all` and `/api/blog/trending`** at the edge for 30–60
   seconds. They are the two hottest endpoints and both tolerate staleness.
4. **Rate-limit** `/api/user/login`, `/api/admin/login`, `/api/user/register`
   and `/api/blog/generate`. There is no built-in limiter.
5. **Run more API processes** — `pm2 start server.js -i max`. The API is
   stateless, so this needs no other change.
6. **Only then** think about the database. The denormalised counters already
   keep the read paths off joins.

### Known gaps

Worth knowing before a public launch; none affects a demo or an evaluation.

- **No rate limiting.** Add it at the proxy.
- **No email.** Newsletter addresses are stored, never sent to. There is no
  password reset flow — an admin password changes through `.env`.
- **No image cleanup.** Deleting an article leaves its thumbnail in ImageKit.
- **No refresh tokens.** A token lasts `JWT_EXPIRES_IN` and cannot be revoked
  before it expires, short of rotating `JWT_SECRET`, which signs out everyone.
- **Search is substring matching in the client** over the already-fetched list.
  The MongoDB text index exists but is not yet wired to an endpoint; that is
  the change to make when the article count gets large.
