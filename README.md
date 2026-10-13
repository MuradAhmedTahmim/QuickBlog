# QuickBlog

A MERN blogging platform: a public reading experience plus an admin area for
writing, moderating and measuring.

## Features

- **Articles** with categories, search, a featured lead post and related posts
- **Trending** ranking from real views, likes and comments, weighted against age
- **Reading time** calculated from the article body and kept in step with edits
- **Accounts** so readers can like articles and save them for later
- **Author profiles** with a picture, bio and that author's published work
- **Comments** with admin approval before they appear
- **Admin dashboard** with views, likes, comments, top articles and a 14 day chart
- **AI drafting** of article content through the Gemini API
- **Light and dark themes**, following the system until the reader chooses

## Stack

React 19 + Vite + Tailwind CSS 4 on the front end; Express 5, MongoDB and
Mongoose on the back end. Images are stored on ImageKit.

## Running it locally

You will need Node.js, a MongoDB database, an ImageKit account and a Gemini
API key.

```bash
# 1. Back end
cd server
cp .env.example .env     # then fill in the values
npm install
npm run server           # http://localhost:3000

# 2. Front end, in a second terminal
cd client
cp .env.example .env     # VITE_BASE_URL should point at the API
npm install
npm run dev              # http://localhost:5173
```

The admin area is at `/admin`, using the `ADMIN_EMAIL` and `ADMIN_PASSWORD`
from `server/.env`. On first start the server creates that admin account and
fills in any fields older blog documents are missing.

### Environment variables

| Variable | Where | What it is |
|---|---|---|
| `MONGODB_URI` | server | Connection string, no database name - `/quickblog` is appended |
| `JWT_SECRET` | server | Any long random string, signs login tokens |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | server | The admin sign-in |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` | server | Image uploads |
| `GEMINI_API_KEY` | server | "Generate with AI" |
| `VITE_BASE_URL` | client | The API's URL |

`.env` is git-ignored. Never commit it.

## Project layout

```
server/
  configs/      database, ImageKit, Gemini, first-run bootstrap
  controllers/  admin, blog, user, engagement
  middleware/   auth (optional / required / admin), multer
  models/       Blog, Comment, User, Like, Bookmark, View, Subscriber
  utils/        reading time, HTML sanitising
client/src/
  components/   shared UI, admin/ for the dashboard pieces
  pages/        public pages, admin/ for the management screens
  context/      app state: session, theme, blogs, engagement
```

## Notes

- Everything that matters is enforced on the server: admin routes, blog
  ownership on edit, and the one-per-user constraints on likes and bookmarks.
- Article HTML is sanitised before it is stored; comments are stored as text.
- Views are counted per reader with a six hour window, so refreshing a page
  does not inflate the numbers.
