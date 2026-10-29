# Role matrix

Three roles, declared in `Express API/models/User.js`:

| Role | Who they are |
|---|---|
| `user` | A reader. Every account starts here |
| `author` | Writes, edits and publishes **their own** articles |
| `admin` | Full CMS and moderation across the whole site |

There is **no endpoint that changes a role.** Promotion is a deliberate
database operation — see
[HowToSetup.md](../HowToSetup.md#promoting-someone-to-author). The profile
endpoint ignores a `role` field in its body, and a test asserts that.

---

## By capability

| Capability | anonymous | `user` | `author` | `admin` |
|---|:--:|:--:|:--:|:--:|
| Read published articles, search, trending | ✅ | ✅ | ✅ | ✅ |
| Read an article's approved comments | ✅ | ✅ | ✅ | ✅ |
| Read an author's public profile | ✅ | ✅ | ✅ | ✅ |
| Be counted as a reader (view counting) | ✅ | ✅ | ✅ | ✅ |
| Like an article | ❌ | ✅ | ✅ | ✅ |
| Save an article | ❌ | ✅ | ✅ | ✅ |
| Post a comment | ❌ | ✅ | ✅ | ✅ |
| Subscribe to the newsletter | ❌ | ✅ | ✅ | ✅ |
| Read **own** bookmarks | ❌ | ✅ | ✅ | ✅ |
| Read **another reader's** bookmarks | ❌ | ❌ | ❌ | ❌ |
| Read / edit **own** profile | ❌ | ✅ | ✅ | ✅ |
| Edit **another** account's profile | ❌ | ❌ | ❌ | ❌ |
| Change any account's role | ❌ | ❌ | ❌ | ❌ |
| Sign in at `/admin` | ❌ | ❌ | ✅ | ✅ |
| Create an article | ❌ | ❌ | ✅ | ✅ |
| AI drafting | ❌ | ❌ | ✅ | ✅ |
| Edit **own** article | ❌ | ❌ | ✅ | ✅ |
| Edit **anyone's** article | ❌ | ❌ | ❌ | ✅ |
| Publish / unpublish **own** article | ❌ | ❌ | ✅ | ✅ |
| Publish / unpublish **anyone's** article | ❌ | ❌ | ❌ | ✅ |
| Delete **own** article | ❌ | ❌ | ✅ | ✅ |
| Delete **anyone's** article | ❌ | ❌ | ❌ | ✅ |
| Read **own** drafts | ❌ | ❌ | ✅ | ✅ |
| Read **anyone's** drafts | ❌ | ❌ | ❌ | ✅ |
| List articles in the CMS | ❌ | ❌ | own only | all |
| Analytics dashboard | ❌ | ❌ | own articles | whole site |
| See the newsletter subscriber count | ❌ | ❌ | ❌ | ✅ |
| Approve a comment | ❌ | ❌ | ❌ | ✅ |
| Delete a comment | ❌ | ❌ | ❌ | ✅ |

---

## By endpoint

**Legend.** *public* = no token. *auth* = any signed-in account. *cms* = `admin`
or `author`. *admin* = `admin` only. *owner* = an additional per-document check
in the controller: the caller must own the document, or be an admin.

### `/api/user`

| Method | Path | Guard | Notes |
|---|---|---|---|
| `POST` | `/register` | public | Issues a token, so it cannot require one. Always creates a `user` |
| `POST` | `/login` | public | Issues a token |
| `GET` | `/me` | auth | The caller's own account |
| `POST` | `/profile` | auth + owner | The account comes from the token, so only ever the caller's own |
| `GET` | `/author/:authorId` | public | Public fields and published articles only |
| `GET` | `/engagement` | auth | Scoped to `req.user` |
| `GET` | `/bookmarks` | auth | Scoped to `req.user` |
| `POST` | `/bookmark` | auth | Scoped to `req.user` |

### `/api/blog`

| Method | Path | Guard | Notes |
|---|---|---|---|
| `GET` | `/all` | public | Published only |
| `GET` | `/trending` | public | Published only |
| `GET` | `/comments/:blogId` | public | Approved comments only |
| `GET` | `/:blogId` | optionalAuth | Drafts shown to their author and to admins; everyone else gets "not found" |
| `POST` | `/add` | cms | Author is taken from the token |
| `POST` | `/update` | cms + owner | `403` on someone else's article |
| `POST` | `/toggle-publish` | cms + owner | `403` on someone else's article |
| `POST` | `/delete` | cms + owner | `403` on someone else's article. Also deletes its comments |
| `POST` | `/generate` | cms | Google Gemini |
| `POST` | `/add-comment` | auth | Name taken from the account; a body `name` is ignored |
| `POST` | `/like` | auth | Scoped to `req.user` |
| `POST` | `/subscribe` | auth | |

### `/api/admin`

| Method | Path | Guard | Notes |
|---|---|---|---|
| `POST` | `/login` | public | Issues a token. Accepts `admin` or `author`; refuses `user` |
| `GET` | `/blogs` | cms | An author sees only their own |
| `GET` | `/dashboard` | cms | An author's figures cover only their own articles |
| `GET` | `/comments` | admin | Moderation |
| `POST` | `/approve-comment` | admin | Moderation |
| `POST` | `/delete-comment` | admin | Moderation |

### Health

| Method | Path | Guard |
|---|---|---|
| `GET` | `/` | public |
| `GET` | `/health` | public |

---

## How it is enforced

Two layers, both necessary.

### 1. Route middleware — `Express API/middleware/auth.js`

```js
optionalAuth                      // attaches req.user if a token is present; never blocks
authRequired                      // 401 without a valid token
requireRole('admin', 'author')    // 401 without a token, 403 with the wrong role
adminOnly                         // 403 unless the role is admin
```

A token is rejected when it is absent, malformed, expired, signed with the wrong
secret, or refers to an account that no longer exists.

### 2. Per-document ownership — in the controller

Middleware knows the caller's role but not *which* article the request is for,
so ownership is checked where the document is loaded:

- `ownedBlog(id, user)` in `blogController.js` — returns the article only when
  the caller owns it or is an admin. Used by update, toggle-publish and delete.
- `scopeToCaller(user)` in `adminController.js` — `{}` for an admin,
  `{author: user._id}` for an author. Applied to every count, list, ranking and
  time series on the dashboard.
- `getBlogById` resolves draft visibility from `req.user` the same way.
- Bookmark, like and engagement queries are always filtered by `req.user._id`.

### Writes always require a token

Every `POST` route sits behind JWT middleware. The three exceptions are the
endpoints that *issue* a token — `/api/user/register`, `/api/user/login`,
`/api/admin/login` — which cannot require one.

Reading an article's comments is deliberately a `GET`
(`/api/blog/comments/:blogId`), so that rule holds without making articles
unreadable to signed-out visitors.

### What is tested

`Express API/tests/auth.test.js` asserts the boundaries directly:

- every write route refuses an anonymous caller (`401`/`403`)
- a `user` is refused by the CMS routes and by `/api/admin/blogs`
- an `author` reaches the CMS but is refused by `/api/admin/comments`
- an author's dashboard reports `scope: "author"` and withholds `subscribers`
- an admin's dashboard reports `scope: "site"`
- editing a profile changes only the caller's own account
- `role` in a profile body does not promote the caller

`Express API/tests/blogs.test.js` asserts ownership: one author cannot edit,
publish or delete another author's article, an admin can, and a draft is hidden
from anonymous visitors and from other readers while remaining visible to its
author.

---

## The demo account

`database/seed.js` creates `demo@quickblog.dev` as an **`author`**, deliberately
scoped. It can read, like, save and comment anywhere, and it fully manages its
own two articles and one draft — enough to demonstrate the CMS, the editor, AI
drafting and a scoped analytics dashboard.

It is **not** an admin: it cannot approve or delete comments, cannot see or
change another author's work, cannot read the newsletter list, and has no
destructive rights over the site. The admin credentials live only in the API's
`.env` and are published nowhere.
