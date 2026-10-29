# QuickBlog — React client

The reader experience and the CMS, as a React + Vite single-page app. This is
one half of QuickBlog; the other is the Express API alongside it.

**Start with the project root:** [README.md](../README.md) for the product,
[HowToSetup.md](../HowToSetup.md) to install it, and
[CLAUDE.md](../CLAUDE.md) for the architecture and the conventions.

## Commands

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production bundle into dist/
npm run preview   # serve the built bundle
npm run lint      # eslint
```

## Configuration

One variable, and no example file — the API's `.env.example` is the project's
single example config.

| Variable | Default | What it is |
|---|---|---|
| `VITE_BASE_URL` | `http://localhost:3000` | The URL of the Express API |

Locally the default is already correct, so you need no `.env` at all. Set it
when the API lives elsewhere, either in `.env` here or as a build environment
variable on your host. **Vite inlines it at build time**, so changing it means
rebuilding, not restarting. Details in
[HowToSetup.md](../HowToSetup.md#client-configuration).

## Layout

```
src/
  components/             shared UI; admin/ for the dashboard pieces
  pages/                  route components; admin/ for the CMS screens
  context/AppContext.jsx  all app state: session, theme, language, blogs, engagement
  i18n/                   translate() and the en/bn dictionaries
  utils/format.js         number and name formatting
  assets/assets.js        re-exports every image and the category list
  index.css               every colour, as CSS custom properties
nginx.conf                serves the built bundle in the Docker image
```

## Two things to know before editing

- **Interface copy never goes in a component.** Every string is `t('some.key')`
  and must exist in **both** dictionaries in `src/i18n/translations.js`.
  Numbers go through `n(value)`, which renders Bengali numerals when the
  language is Bengali.
- **Colours are CSS custom properties** from `src/index.css`. Use the Tailwind
  aliases — `text-ink`, `bg-surface`, `border-line`, `text-muted`,
  `bg-tealsolid` — never a hex value.

The full set of conventions is in [CLAUDE.md](../CLAUDE.md#conventions).
