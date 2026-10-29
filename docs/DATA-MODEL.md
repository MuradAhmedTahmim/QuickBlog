# Data model

MongoDB, through Mongoose. Seven collections. The schemas live in
`Express API/models/`; the collection validators and indexes are created by
`database/schema.js`, which must be kept in step with the models.

> **Naming.** The Vibe96 requirements call articles *posts* and the view store
> *analytics events*. In the code and in the database they are `blogs` and
> `views`, because that is what Mongoose pluralised the existing models to.
> `database/connect.js` holds the mapping in one place.

| Requirement name | Collection | Mongoose model |
|---|---|---|
| users | `users` | `User` |
| posts | `blogs` | `blog` |
| comments | `comments` | `Comment` |
| bookmarks | `bookmarks` | `Bookmark` |
| analytics events | `views` | `View` |
| — | `likes` | `Like` |
| — | `subscribers` | `Subscriber` |

---

## Entity relationships

```
                        ┌───────────────────────┐
                        │        users          │
                        │  _id                  │
                        │  name                 │
                        │  email      ◄── unique│
                        │  password  (bcrypt)   │
                        │  role  user|author|   │
                        │        admin          │
                        │  bio, image           │
                        └───────────┬───────────┘
                                    │ 1
            ┌───────────────┬───────┴────────┬────────────────┐
            │ writes        │ saves          │ likes          │ comments
            │ N             │ N              │ N              │ N
┌───────────▼───────────┐   │                │                │
│        blogs          │   │                │                │
│  _id                  │   │                │                │
│  title, subTitle      │   │                │                │
│  description  (HTML)  │   │                │                │
│  category             │   │                │                │
│  image   (ImageKit)   │   │                │                │
│  slug         ◄─unique│   │                │                │
│  contentLanguage      │   │                │                │
│      en | bn | both   │   │                │                │
│  isPublished          │   │                │                │
│  author  ──► users    │   │                │                │
│  readingTime          │   │                │                │
│  views, uniqueViews   │   │                │                │
│  likesCount           │   │                │                │
│  commentsCount        │   │                │                │
└───┬───────────────────┘   │                │                │
    │ 1                     │                │                │
    │       ┌───────────────▼──────┐  ┌──────▼─────────┐  ┌───▼──────────────────┐
    ├──────►│      bookmarks       │  │     likes      │  │      comments        │
    │   N   │  user ──► users      │  │ user ──► users │  │  blog ──► blogs      │
    │       │  blog ──► blogs      │  │ blog ──► blogs │  │  user ──► users  (opt)│
    │       │  (user, blog) unique │  │ (blog,user) uq │  │  name, content       │
    │       └──────────────────────┘  └────────────────┘  │  isApproved          │
    │                                                     └──────────────────────┘
    │ 1
    │       ┌──────────────────────────────┐      ┌─────────────────────┐
    └──────►│   views  (analytics events)  │      │    subscribers      │
        N   │  blog ──► blogs              │      │  email  ◄── unique  │
            │  viewerKey  u:<id> | v:<id>  │      └─────────────────────┘
            │  count, lastViewedAt         │       (standalone)
            │  (blog, viewerKey) unique    │
            └──────────────────────────────┘
```

Every document also carries `createdAt` and `updatedAt`, from Mongoose
`timestamps: true`. Seeded documents additionally carry `seeded: true`, which is
how `database/seed.js --reset` finds its own rows and nothing else.

---

## Collections

### `users`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, 1–60, markup stripped |
| `email` | String | Required, **unique**, lower-cased, trimmed |
| `password` | String | Required. bcrypt hash, `select: false` — never loaded unless asked for |
| `role` | String | `user` \| `author` \| `admin`. Default `user` |
| `bio` | String | ≤ 400 characters |
| `image` | String | Avatar URL on ImageKit |

Two serialisation methods keep responses honest:
`toPublicProfile()` omits the email and the password;
`toPrivateProfile()` adds the email back for the account's owner.

**Indexes:** `email` (unique) · `role`

### `blogs` — articles ("posts")

| Field | Type | Notes |
|---|---|---|
| `title` | String | Required, plain text |
| `subTitle` | String | Plain text |
| `description` | String | Required. Sanitised HTML — the article body |
| `category` | String | Required. `Technology`, `Startup`, `Lifestyle`, `Finance` |
| `image` | String | Required. Thumbnail URL on ImageKit |
| `isPublished` | Boolean | Required. `false` = draft |
| `author` | ObjectId → `users` | Set from the token on create |
| `slug` | String | **Unique where present**, lower-cased. Derived from the title |
| `contentLanguage` | String | `en` \| `bn` \| `both`. Default `both` |
| `views` | Number | Total, including repeat visits |
| `uniqueViews` | Number | Distinct readers |
| `likesCount` | Number | Denormalised from `likes` |
| `commentsCount` | Number | Denormalised from approved `comments` |
| `readingTime` | Number | Minutes. Recalculated by a pre-save hook whenever `description` changes |

**Indexes:**

| Index | Purpose |
|---|---|
| `slug` (unique, partial on `$type: string`) | **Required:** unique post slug. Partial, so articles predating the field do not collide on a missing value |
| `author`, `isPublished` | **Required:** post author and status. The author's CMS list and scoped dashboard |
| `isPublished`, `createdAt: -1` | The public article list |
| `isPublished`, `category` | The category filter |
| `isPublished`, `contentLanguage`, `createdAt: -1` | The bilingual filter |
| `title`, `subTitle` (text) | Search |

> **Why `contentLanguage` and not `language`.** MongoDB reads a field literally
> named `language` as the text index's *language override*, and this collection
> carries a text index. A document with `language: 'both'` is rejected with
> `language override unsupported: both`. The field must keep this name.

### `comments`

| Field | Type | Notes |
|---|---|---|
| `blog` | ObjectId → `blogs` | Required. The "postId" of the requirements |
| `user` | ObjectId → `users` | The author. Optional — comments predating required sign-in have none |
| `name` | String | Required, 1–60. Taken from the account, not the request body |
| `content` | String | Required, 2–1000. Plain text, markup stripped |
| `isApproved` | Boolean | Default `false`. Invisible to readers until an admin approves it |

**Indexes:** `blog`, `isApproved`, `createdAt: -1` (**required:** comment
postId) · `createdAt: -1`

### `bookmarks`

| Field | Type | Notes |
|---|---|---|
| `blog` | ObjectId → `blogs` | Required |
| `user` | ObjectId → `users` | Required |

**Indexes:** `user`, `blog` (unique) — **required:** bookmark userId plus
postId. One save per reader per article, enforced by the database · `user`,
`createdAt: -1`

### `views` — analytics events

One document per article and reader, not one per page load.

| Field | Type | Notes |
|---|---|---|
| `blog` | ObjectId → `blogs` | Required |
| `viewerKey` | String | Required. `u:<userId>` signed in, `v:<browserId>` anonymous |
| `count` | Number | Visits outside the six-hour dedupe window |
| `lastViewedAt` | Date | When this reader was last counted |
| `createdAt` | Date | First visit — what the dashboard's daily series groups by |

**Indexes:** `blog`, `viewerKey` (unique) · `createdAt: -1`

**How counting works.** `recordView` upserts on `(blog, viewerKey)` first, so
two simultaneous requests resolve to one document rather than racing into a
duplicate-key error. A new document increments both `views` and `uniqueViews`.
An existing one increments `views` only, and only if `lastViewedAt` is older
than six hours — the condition is in the query, so only one of several racing
requests can win it. An anonymous reader with no usable `x-visitor-id` is not
counted at all.

### `likes`

| Field | Type | Notes |
|---|---|---|
| `blog` | ObjectId → `blogs` | Required |
| `user` | ObjectId → `users` | Required |

**Indexes:** `blog`, `user` (unique) · `user`, `createdAt: -1`

The unique index, not the interface, is what prevents a double like. Toggling
deletes first and uses the result to decide direction; a concurrent duplicate
insert raises `11000`, which is treated as "already liked".

### `subscribers`

| Field | Type | Notes |
|---|---|---|
| `email` | String | Required, **unique**, lower-cased, trimmed |

**Indexes:** `email` (unique)

---

## Denormalised counters

`blogs.likesCount`, `blogs.commentsCount`, `blogs.views` and
`blogs.uniqueViews` duplicate information that lives in `likes`, `comments` and
`views`. They exist so the article list and the trending aggregation never have
to join across collections.

They are kept true by **recomputation**, not blind increments:

| Counter | Recomputed by |
|---|---|
| `likesCount` | `toggleLike` — `countDocuments` after every toggle |
| `commentsCount` | `syncCommentCount` — after every approval or deletion |
| `views`, `uniqueViews` | `recordView` — `$inc`, guarded by the unique index and the dedupe window |

`database/seed.js` recalculates `likesCount` and `commentsCount` from the rows
it created, so seeded data is internally consistent.

---

## Validators

`database/schema.js` attaches a `$jsonSchema` validator to every collection,
mirroring the Mongoose schema above.

- **`validationLevel: "moderate"`** — applied to inserts and to updates of
  documents that already satisfy the schema. A document written by an older
  version of the app is never rejected retroactively.
- **`additionalProperties` is left open**, so a field added by a future release
  cannot be rejected by an older validator.
- **`validationAction`** defaults to `error`. Set
  `SCHEMA_VALIDATION_ACTION=warn` to log violations instead of rejecting them.

The script is idempotent and non-destructive: it creates what is missing,
updates validators in place with `collMod`, and never drops a collection, an
index or a document. An existing index whose options differ is reported and
left alone rather than rebuilt.

---

## Migrations

There is no migration framework. Two mechanisms cover schema evolution:

1. **`database/schema.js`** — re-run after any model change. It adds new
   collections, indexes and validator rules.
2. **`Express API/configs/bootstrap.js`** — runs on **every** API start and is
   **additive only**. It creates the admin account from `.env`, then fills in
   fields that older documents lack:
   - `author` on articles that predate author attribution
   - `views`, `uniqueViews`, `likesCount`
   - `readingTime` and `commentsCount`, recomputed where missing
   - `contentLanguage: 'both'` where absent — so switching language can never
     hide an article that used to be visible
   - `slug`, generated from the title where absent

   It never overwrites an existing value. Keep it that way.
