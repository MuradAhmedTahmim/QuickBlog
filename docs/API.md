# API reference

Base URL: the API root. Locally `http://localhost:3000`.

All request and response bodies are JSON, except the two endpoints that accept a
file, which take `multipart/form-data`.

---

## Response shape

Every endpoint answers with an object carrying `success`:

```json
{ "success": true,  "blogs": [ … ] }
{ "success": false, "message": "Blog not found" }
```

**Status codes are used sparingly and deliberately:**

| Status | Meaning |
|---|---|
| `200` | The request was handled. Check `success` — a business-rule failure (validation, not-found, wrong password) is a `200` with `success: false` |
| `401` | No token, or a token that is malformed, expired, wrongly signed, or belongs to a deleted account |
| `403` | Valid token, but the role or the ownership check refused the action |

Clients branch on `data.success`, not on the status code, except for `401` and
`403`.

## Authentication

Send the JWT in the `Authorization` header. Both forms are accepted:

```
Authorization: Bearer <token>
Authorization: <token>
```

Tokens are signed with `JWT_SECRET` and last `JWT_EXPIRES_IN` (default `30d`).
The payload is `{ id, role }`.

### Middleware

| Middleware | Behaviour |
|---|---|
| none | Public |
| `optionalAuth` | Attaches `req.user` when a valid token is present; never blocks |
| `authRequired` | `401` without a valid token |
| `requireRole('admin','author')` | `401` without a token, `403` with the wrong role |
| `adminOnly` | `403` unless the role is `admin` |

**Every `POST` route requires JWT middleware.** The only exceptions are the
three endpoints that issue a token: `/api/user/register`, `/api/user/login`,
`/api/admin/login`.

## Roles

`user` (reader) · `author` (writes and publishes their own work) · `admin`
(full CMS and moderation). See [ROLES.md](ROLES.md) for the full matrix.

---

## Health

### `GET /`

Public. Returns the string `API is Working`.

### `GET /health`

Public. For load balancers and container health checks.

```json
{ "success": true, "status": "ok", "uptime": 1423.91 }
```

---

## Accounts — `/api/user`

### `POST /api/user/register`

Public. Creates a reader account.

| Field | Rules |
|---|---|
| `name` | 2–60 characters, markup stripped |
| `email` | Valid address, lower-cased, unique |
| `password` | 6 characters or more |

```json
{ "success": true, "token": "<jwt>", "user": { "_id": "…", "name": "…", "email": "…", "role": "user", "bio": "", "image": "", "createdAt": "…" } }
```

New accounts are always `user`. There is no endpoint that changes a role.

### `POST /api/user/login`

Public. `{ email, password }`. Returns a token and the private profile.

A wrong password and an unknown account return the **same** message
(`Invalid email or password`), so the endpoint cannot be used to discover which
accounts exist.

### `GET /api/user/me`

`authRequired`. The caller's own profile, including their email.

### `POST /api/user/profile`

`authRequired`. `multipart/form-data`. Edits **the caller's own** profile — the
account comes from the token, so it can never edit another.

| Field | Rules |
|---|---|
| `name` | Optional. 2–60 characters |
| `bio` | Optional. 400 characters or fewer |
| `image` | Optional file. Uploaded to ImageKit, 320×320 WebP |

Any other field in the body, including `role`, is ignored.

### `GET /api/user/author/:authorId`

Public. An author's public profile plus their published articles. Never returns
an email address or a draft.

```json
{ "success": true, "author": { "_id": "…", "name": "…", "bio": "…", "image": "…", "role": "author", "createdAt": "…" }, "blogs": [ … ] }
```

### `GET /api/user/engagement`

`authRequired`. One round trip for "which articles have I liked and saved",
instead of one request per card.

```json
{ "success": true, "likedBlogs": ["<blogId>"], "bookmarkedBlogs": ["<blogId>"] }
```

### `GET /api/user/bookmarks`

`authRequired`. The caller's saved articles, newest first. Scoped to
`req.user`, so one reader can never list another's. Articles since deleted or
unpublished are omitted.

### `POST /api/user/bookmark`

`authRequired`. `{ blogId }`. Toggles a save.

```json
{ "success": true, "bookmarked": true, "message": "Saved for later" }
```

A unique index on `(user, blog)` enforces one save per reader per article in the
database, not in the interface.

---

## Articles — `/api/blog`

### `GET /api/blog/all`

Public. Published articles, newest first, author populated.

| Query | Effect |
|---|---|
| `lang` | `en` or `bn`. Returns articles whose `contentLanguage` is that code **or** `both`. Anything else, or omitted, applies no filter |

Drafts are never included.

### `GET /api/blog/trending`

Public. Engagement weighted against age, so a strong new article can outrank an
old one. The score is `(views + 3×likes + 4×comments + 1) / (ageHours + 2)^0.8`.

| Query | Effect |
|---|---|
| `limit` | Default 5, maximum 20 |
| `lang` | As for `/all` |

Article bodies are omitted from this response.

### `GET /api/blog/comments/:blogId`

Public. Approved comments for an article, newest first. Pending comments are
never returned. An invalid id gives `{ success: true, comments: [] }`.

### `GET /api/blog/:blogId`

`optionalAuth`. One article, by **id or slug**.

- A published article is returned to anyone.
- A **draft** is returned only to its author or to an admin. To anyone else the
  response is `{ success: false, message: "Blog not found" }` — the same answer
  as a genuinely missing article, so a draft's existence is not disclosed.
- Opening a published article records a view. A reader is counted once per
  article per six hours; the response carries the counters including this visit.

Readers are keyed by account when signed in, and otherwise by an
`x-visitor-id` header the browser keeps — 8–64 characters of
`[A-Za-z0-9-]`. Without it an anonymous view is not counted at all.

> This route is registered **last** so it does not swallow `/all`, `/trending`
> and `/comments/:blogId`.

### `POST /api/blog/add`

`requireRole('admin','author')`. `multipart/form-data`.

| Part | Contents |
|---|---|
| `blog` | JSON string: `{ title, subTitle, description, category, isPublished, contentLanguage }` |
| `image` | The thumbnail file. **Required** |

- `title`, `description`, `category` and the image are required.
- `description` is sanitised: a wide formatting allow-list, but nothing that can
  execute or load third-party code. `title`, `subTitle` and `category` are
  reduced to plain text.
- `contentLanguage` is `en`, `bn` or `both`; anything else becomes `both`.
- A unique `slug` is derived from the title, in Latin or Bengali script.
- `readingTime` is calculated from the body.
- The author is the caller — an id in the body is ignored.

### `POST /api/blog/update`

`requireRole('admin','author')`. `multipart/form-data`. Same parts, with `id`
inside the `blog` JSON.

- **Ownership:** an author may edit only their own article; an admin may edit
  any. Otherwise `403`.
- The thumbnail is optional; without a new file the existing one is kept.
- `readingTime` is recalculated.
- A **published** article keeps the slug its readers already have. A draft, or
  an article that never had one, gets a fresh slug from the new title.

### `POST /api/blog/toggle-publish`

`requireRole('admin','author')`. `{ id }`. Flips `isPublished`. Owner or admin
only, otherwise `403`.

### `POST /api/blog/delete`

`requireRole('admin','author')`. `{ id }`. Deletes the article **and its
comments**. Owner or admin only, otherwise `403`.

### `POST /api/blog/generate`

`requireRole('admin','author')`. `{ prompt }` — in practice the article title.

```json
{ "success": true, "content": "…generated text…" }
```

Calls Google Gemini through `configs/gemini.js`, which falls back across models
when one is overloaded. Returns `success: false` when `GEMINI_API_KEY` is
missing or out of quota; nothing else in the app is affected.

### `POST /api/blog/add-comment`

`authRequired`. `{ blog, content }`.

- The commenter's **name is taken from the signed-in account**. A `name` in the
  body is ignored, so nobody can comment under another person's name.
- `content` is 2–1000 characters, stored as plain text with markup stripped.
- The article must exist and be published.
- The comment is created with `isApproved: false` and is invisible until an
  admin approves it.

### `POST /api/blog/like`

`authRequired`. `{ blogId }`. Toggles a like and returns the fresh count.

```json
{ "success": true, "liked": true, "likes": 12 }
```

A unique index on `(blog, user)` makes a double like impossible even under
concurrent requests.

### `POST /api/blog/subscribe`

`authRequired`. `{ email }`. Adds an address to the newsletter list.
Re-subscribing is not an error.

---

## CMS and moderation — `/api/admin`

### `POST /api/admin/login`

Public. `{ email, password }`. Two credentials are accepted:

1. `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the API's `.env`.
2. Any account whose role is `admin` or `author`, with its own password.

A `user` account is refused here even with the right password.

### `GET /api/admin/blogs`

`requireRole('admin','author')`. All articles including drafts, newest first.

- **admin** — every article.
- **author** — only their own.

### `GET /api/admin/dashboard`

`requireRole('admin','author')`. Analytics.

```json
{
  "success": true,
  "dashboardData": {
    "scope": "site",
    "blogs": 24, "published": 20, "drafts": 4,
    "comments": 57, "pendingComments": 3,
    "likes": 142, "subscribers": 88,
    "views": 5120, "uniqueViews": 3980,
    "recentBlogs": [ … ],
    "topViewed": [ … ],
    "topEngaged": [ … ],
    "recentComments": [ … ],
    "series": {
      "days":        ["2026-10-16", "…"],
      "uniqueViews": [12, 18, "…"],
      "likes":       [2, 5, "…"],
      "comments":    [0, 1, "…"]
    }
  }
}
```

- `scope` is `"site"` for an admin and `"author"` for an author.
- For an **author**, every count, ranking and series is restricted to their own
  articles, and `subscribers` is `0` — the newsletter list is site-wide and
  withheld.
- `series` always covers exactly 14 days in UTC, quiet days filled with zero.

### `GET /api/admin/comments`

`adminOnly`. Every comment, approved and pending, newest first, with its
article populated.

### `POST /api/admin/approve-comment`

`adminOnly`. `{ id }`. Approves a comment and recomputes the article's stored
`commentsCount` from its approved comments.

### `POST /api/admin/delete-comment`

`adminOnly`. `{ id }`. Deletes a comment and recomputes `commentsCount`.

---

## Headers the client sends

| Header | Purpose |
|---|---|
| `Authorization` | The JWT, when signed in |
| `x-visitor-id` | A random id the browser keeps, so an anonymous reader is counted once rather than once per refresh. Identifies a browser, never a person, and carries no personal data |

## CORS

`CLIENT_URL` is a comma-separated allow-list of origins. Left empty, every
origin is accepted — convenient locally, and what this API shipped with. Always
set it in production.

## Rate limiting

There is none. Put it in front of the API — Nginx `limit_req`, or a platform
rate limiter — if the deployment is public. `/api/user/login`,
`/api/admin/login`, `/api/user/register` and `/api/blog/generate` are the
endpoints worth limiting first.
