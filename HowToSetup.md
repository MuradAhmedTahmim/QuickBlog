# QuickBlog — install guide

Two supported install paths:

- **[A. VPS](#a-vps-install)** — Node LTS, MongoDB, PM2 or systemd, Nginx.
  What you want for a real deployment you control.
- **[B. Docker](#b-docker-install)** — one `docker compose up`. Fastest way to
  a working instance, and the easiest to evaluate.

Both end at the same place, then continue with
[the database](#database-schema-and-seed), [the first admin](#first-admin-login)
and [branding](#branding-and-language-strings).

> Folder names: this guide uses `Express API/` and `React Client/`, the names in
> the submission archive. If you are working in the git repository instead they
> are `server/` and `client/`. Nothing else differs.

---

## Before you start

You will need:

| | Why | Required? |
|---|---|---|
| **Node.js 20 or 22 (LTS)** | Runs the API and builds the client | Yes |
| **MongoDB 6 or 7** | The database. Local, Docker or Atlas | Yes |
| **An ImageKit account** | Thumbnail and avatar uploads | Yes, for uploads |
| **A Google Gemini API key** | The "Generate with AI" button | Optional |

Without ImageKit, creating an article fails at the thumbnail step. Without a
Gemini key everything works except AI drafting, which returns an error.

### Configuration

The project has exactly **one** example config:
**`Express API/.env.example`**. Copy it and fill it in:

```bash
cd "Express API"
cp .env.example .env
```

Every variable is documented in the file itself. Replace every `CHANGE_ME`:

| Variable | What it is |
|---|---|
| `PORT` | Port the API listens on. `3000` is what the client and Compose expect |
| `CLIENT_URL` | Comma-separated list of sites allowed to call the API (CORS). Empty = any origin. **Always set this in production** |
| `MONGODB_URI` | Connection string **without** a database name — the app appends `/quickblog` |
| `JWT_SECRET` | Long random string that signs login tokens |
| `JWT_EXPIRES_IN` | How long a login lasts: `30d`, `12h`, `45m`. Defaults to `30d` |
| `ADMIN_EMAIL` | First admin's sign-in email |
| `ADMIN_PASSWORD` | First admin's password |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/apikey) |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit → Developer options → API keys |
| `IMAGEKIT_PRIVATE_KEY` | Same page. Treat as a password |
| `IMAGEKIT_URL_ENDPOINT` | e.g. `https://ik.imagekit.io/your_imagekit_id` |

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env`. It is git-ignored in both folders.

### Client configuration

The React client needs **one** variable, and ships no example file of its own —
the API's `.env.example` is the project's single example config.

| Variable | Default | What it is |
|---|---|---|
| `VITE_BASE_URL` | `http://localhost:3000` | The URL of the Express API |

For local development you can leave it unset; the default is already correct.
Set it when the API is anywhere else:

```bash
# React Client/.env  — create this file only if you need a non-default value
VITE_BASE_URL = https://api.your-domain.com
```

Vite inlines this at **build** time, not run time, so changing it means
rebuilding the client. On a hosted platform (Vercel, Netlify) set it as a build
environment variable instead of creating a file.

---

## A. VPS install

Assumes Ubuntu 22.04 or 24.04 and a non-root user with sudo. Substitute your
own domain for `your-domain.com` throughout.

### 1. Node LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v    # expect v22.x
```

### 2. MongoDB

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
  | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl enable --now mongod
sudo systemctl status mongod --no-pager
```

MongoDB listens on `127.0.0.1:27017` only by default. Keep it that way — the
API talks to it over localhost. Use `MONGODB_URI = mongodb://127.0.0.1:27017`.

To require authentication (recommended), create a user and use
`mongodb://quickblog:PASSWORD@127.0.0.1:27017/?authSource=admin`:

```bash
mongosh --eval 'db.getSiblingDB("admin").createUser({user:"quickblog",pwd:"REPLACE_ME",roles:[{role:"readWrite",db:"quickblog"}]})'
# then set security.authorization: enabled in /etc/mongod.conf and restart
```

Hosted MongoDB Atlas works just as well; use the `mongodb+srv://…` string
**without** a trailing database name.

### 3. Get the code and install

```bash
sudo mkdir -p /var/www/quickblog && sudo chown "$USER" /var/www/quickblog
# copy the archive up, or git clone, then:
cd /var/www/quickblog

cd "Express API"   && npm ci --omit=dev && cd ..
cd "React Client"  && npm ci            && cd ..
npm ci                                  # root: database scripts
```

`npm ci` installs the exact versions in `package-lock.json`. The client needs
its dev dependencies because Vite is one of them.

### 4. Configure

```bash
cd "Express API"
cp .env.example .env
nano .env          # fill in every CHANGE_ME
```

Set `CLIENT_URL = https://your-domain.com` so the API refuses calls from
anywhere else.

### 5. Create the database and sample content

See [Database: schema and seed](#database-schema-and-seed) below, then come
back here.

### 6. Build the client

```bash
cd /var/www/quickblog/React\ Client
# only if the API is not on http://localhost:3000:
printf 'VITE_BASE_URL = https://your-domain.com/api-origin\n' > .env
npm run build      # writes dist/
```

If the API is served under the same domain at `/api` (the Nginx config below),
set `VITE_BASE_URL = https://your-domain.com`.

### 7. Run the API with PM2

```bash
sudo npm install -g pm2
cd /var/www/quickblog/Express\ API
pm2 start server.js --name quickblog-api
pm2 save
pm2 startup          # prints a command; run it to start on boot
pm2 logs quickblog-api
```

**Or with systemd**, if you would rather not add PM2.
Create `/etc/systemd/system/quickblog-api.service`:

```ini
[Unit]
Description=QuickBlog API
After=network.target mongod.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/quickblog/Express API
EnvironmentFile=/var/www/quickblog/Express API/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/tmp

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now quickblog-api
sudo journalctl -u quickblog-api -f
```

`systemd` reads `EnvironmentFile` as plain `KEY=value`. The example config is
written with spaces around `=` for readability, which `dotenv` accepts but
`systemd` does not — strip them in `.env` if you use systemd, or keep PM2,
which loads `.env` through `dotenv` like the app does.

### 8. Nginx reverse proxy

Serve the built client as static files and proxy the API under `/api`.
Create `/etc/nginx/sites-available/quickblog`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/quickblog/React Client/dist;
    index index.html;

    client_max_body_size 12M;   # article thumbnails

    # The API. Everything the client calls starts /api/.
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;   # AI drafting can take a while
    }

    # Hashed build assets never change; cache them hard.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Single-page app: unknown paths are routes, not missing files.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/quickblog /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 9. HTTPS

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Then set `CLIENT_URL = https://your-domain.com` in `.env`, rebuild the client
if `VITE_BASE_URL` changed, and restart: `pm2 restart quickblog-api`.

### 10. Updating later

```bash
cd /var/www/quickblog
cd "Express API"  && npm ci --omit=dev && cd ..
cd "React Client" && npm ci && npm run build && cd ..
npm run db:schema          # safe to re-run; adds anything new
pm2 restart quickblog-api
```

---

## B. Docker install

Needs Docker Engine 24+ with the Compose plugin. `docker-compose.yml` runs
three containers: MongoDB, the API, and Nginx serving the built client.

### 1. Configure

```bash
cd "Express API"
cp .env.example .env
cd ..
```

Edit `Express API/.env` for Compose:

```ini
PORT = 3000
# "mongo" is the Compose service name, reachable on the internal network.
MONGODB_URI = mongodb://mongo:27017
CLIENT_URL = http://localhost:8080
JWT_SECRET = <a long random string>
JWT_EXPIRES_IN = 30d
ADMIN_EMAIL = you@example.com
ADMIN_PASSWORD = <a strong password>
GEMINI_API_KEY = <your key>
IMAGEKIT_PUBLIC_KEY = <your key>
IMAGEKIT_PRIVATE_KEY = <your key>
IMAGEKIT_URL_ENDPOINT = https://ik.imagekit.io/your_imagekit_id
```

### 2. Start

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api
```

| | |
|---|---|
| Client | http://localhost:8080 |
| API | http://localhost:3000 |
| API health check | http://localhost:3000/health |
| MongoDB | `localhost:27017` (published for `mongosh`; drop the `ports` entry to close it) |

The client image is built with `VITE_BASE_URL` baked in, defaulting to
`http://localhost:3000`. To point it elsewhere:

```bash
VITE_BASE_URL=https://api.your-domain.com docker compose up -d --build client
```

Article data lives in the named volume `quickblog-mongo-data` and survives
`docker compose down`. `docker compose down -v` deletes it — that is the only
command here that destroys data.

### 3. Create the database and sample content

The API container creates the admin account and backfills on start. For the
collections, validators, indexes and sample content, run the database scripts
**from the host** against the published MongoDB port:

```bash
npm install
MONGODB_URI="mongodb://127.0.0.1:27017" npm run db:schema
MONGODB_URI="mongodb://127.0.0.1:27017" npm run db:seed
```

Or from inside the API container, which already has the right `MONGODB_URI`
and the dependencies the scripts need:

```bash
docker compose exec api node database/schema.js
docker compose exec api node database/seed.js
```

---

## Database: schema and seed

Two scripts in `database/`. Both are **idempotent and non-destructive** — run
them as often as you like against an empty or an existing database.

```bash
# from the project root, once:
npm install
```

### Creating the schema from an empty database

```bash
npm run db:schema
```

> **Run this before the first production start.** With `NODE_ENV=production`
> the API deliberately does not create indexes itself (`autoIndex: false`), so
> this script is what creates them. Mongoose names indexes its own way and this
> script names them explicitly; letting both build the same index fails with
> `IndexOptionsConflict`. In development and in tests the API still builds them
> automatically, so a fresh local database needs nothing extra.

Against an empty database this creates everything from nothing: the
collections, a JSON Schema validator on each, and all the indexes. Against a
database that already has data it updates validators and adds missing indexes
in place — it does not read, write or delete a single document, and never drops
a collection or an index.

| Collection | Holds | Key indexes |
|---|---|---|
| `users` | Accounts: readers, authors, admins | **unique `email`** |
| `blogs` | Articles ("posts") | **unique `slug`**, `author` + `isPublished` |
| `comments` | Comments, pending until approved | `blog` + `isApproved` + newest |
| `bookmarks` | Saved articles | **unique `user` + `blog`** |
| `views` | Analytics events, one per article and reader | unique `blog` + `viewerKey` |
| `likes` | Likes, one per reader and article | unique `blog` + `user` |
| `subscribers` | Newsletter addresses | unique `email` |

It reads `MONGODB_URI` from `Express API/.env`, or from the environment if you
set it there:

```bash
MONGODB_URI="mongodb://127.0.0.1:27017" npm run db:schema
```

Validators install at `validationLevel: moderate`, so a document written by an
older version of the app is never rejected retroactively. To log violations
instead of rejecting writes:

```bash
SCHEMA_VALIDATION_ACTION=warn npm run db:schema
```

### Sample content

```bash
npm run db:seed
```

Adds three accounts (including the demo one), six articles — two English, two
Bengali, one shown in both and one draft — comments both approved and pending,
bookmarks, likes, and fourteen days of analytics events so the dashboard chart
has a shape.

Every document is upserted on a natural key and tagged `seeded: true`. Running
it twice changes nothing. It will never modify or delete a document it did not
create, so it is safe against a database that already has your own content.

```bash
npm run db:seed:reset   # removes ONLY documents tagged seeded:true, then rewrites them
```

Demo passwords default to `DemoReader#2026` and `DemoAuthor#2026`. Override
them, and keep README.md in step with whatever you choose:

```bash
DEMO_PASSWORD='YourDemoPassword' npm run db:seed
```

---

## First admin login

There is no sign-up form for administrators. The first admin comes from the
API's `.env`:

```ini
ADMIN_EMAIL = you@example.com
ADMIN_PASSWORD = a-strong-password
```

On **every** start the API creates that account if it is missing and resets its
password to match the file, so `.env` stays the single source of truth. Then:

1. Start the API and watch for `Bootstrap complete (admin ready, …)`.
2. Open `/admin` on the client.
3. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

To change the admin password, change `.env` and restart the API.

### Promoting someone to author

Authors are readers who may write. Make an existing account an author with:

```bash
mongosh "mongodb://127.0.0.1:27017/quickblog" --eval \
  'db.users.updateOne({email:"writer@example.com"},{$set:{role:"author"}})'
```

An author may write, publish, edit and delete **their own** articles, and sees a
dashboard covering only those. They cannot moderate comments or touch anyone
else's work. The full matrix is in [docs/ROLES.md](docs/ROLES.md).

---

## Branding and language strings

### Site name

The name appears in four places:

| Where | File |
|---|---|
| Browser tab title, meta description | `React Client/index.html` |
| Interface copy (footer, nav, hero) | `React Client/src/i18n/translations.js` |
| Logo image | `React Client/src/assets/logo.svg`, `logo_light.svg` |
| API package name | `Express API/package.json` |

The interface never hard-codes the name in a component — it reads it from the
translation dictionaries, so changing it there changes both languages:

```bash
grep -rn "QuickBlog" "React Client/src/i18n/translations.js"
```

### Logo

Replace these two files, keeping the names and the aspect ratio:

- `React Client/src/assets/logo.svg` — dark logo, used on light backgrounds
- `React Client/src/assets/logo_light.svg` — light logo, used in dark mode
- `React Client/public/favicon.svg` — browser tab icon

Both logos are imported through `React Client/src/assets/assets.js`, so no
component needs changing.

### Colours

Every colour is a CSS custom property declared once in
`React Client/src/index.css`, under `:root` for light and `.dark` for dark.
Change `--qb-teal-solid` and the accent colour follows everywhere.

### Interface strings: English and Bengali

All interface copy lives in one file:
**`React Client/src/i18n/translations.js`**. It exports two dictionaries,
`en` and `bn`, with identical key structure.

```js
export const en = {
  nav: { home: 'Home', saved: 'Saved', /* … */ },
}

export const bn = {
  nav: { home: 'হোম', saved: 'সংরক্ষিত', /* … */ },
}
```

- Components read strings through `t('nav.home')` from the app context.
- Placeholders are `{name}`: `t('article.commentingAs', { name: user.name })`.
- A missing Bengali key falls back to English, then to the key itself, so a
  partial translation degrades visibly rather than silently.
- Numbers shown in the interface go through `n(value)`, which renders Bengali
  numerals when the language is Bengali.

Bengali is the default language. To change that, edit `DEFAULT_LANGUAGE` in
`React Client/src/i18n/index.js`.

#### Adding a third language

1. Add a `LANGUAGES` entry in `React Client/src/i18n/index.js`.
2. Export a dictionary with the same keys from `translations.js`.
3. Add the locale's `moment` import alongside `moment/dist/locale/bn`.
4. Add the code to the `language` enum in `Express API/models/Blog.js`,
   `database/schema.js`, and the `LANGUAGES` list in
   `Express API/controllers/blogController.js`.

> The Vibe96 template refers to "EN/AR strings". QuickBlog's two languages are
> **English and Bengali (EN/BN)**; the mechanism is the same.

### Article language

Each article is marked **English only**, **Bengali only**, or **both** in the
editor's Language field. The reader's toggle filters the article list to what
they can read; `both` always shows. If a language has nothing published, the
client falls back to the unfiltered list rather than showing an empty site.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Database Connected` never prints | `MONGODB_URI` wrong, or Mongo not running. It must have **no** trailing database name |
| Client loads, every request fails | `VITE_BASE_URL` points at the wrong API, or `CLIENT_URL` on the API does not list the client's origin |
| CORS error in the browser console | Add the client's exact origin (scheme + host + port) to `CLIENT_URL`, comma-separated |
| `Admin access required` after signing in | The account's `role` is not `admin`. Check `ADMIN_EMAIL` matches and restart the API |
| Thumbnail upload fails | ImageKit keys missing or wrong; `IMAGEKIT_URL_ENDPOINT` must include your ImageKit id |
| "Generate with AI" errors | `GEMINI_API_KEY` missing, or the key has no quota |
| Comments do not appear | They are held for moderation. Approve them at `/admin/comments` |
| Changed `VITE_BASE_URL`, no effect | Vite inlines it at build time. Rebuild the client |
| `npm run db:schema` says `MONGODB_URI is not set` | Fill it into `Express API/.env`, or pass it inline on the command |
