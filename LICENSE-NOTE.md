# Licence note

## The QuickBlog code

Copyright © 2026 Murad Ahmed Tahmim. All rights reserved.

This archive is supplied for evaluation and for the buyer of this listing. On
purchase, the buyer receives a **non-exclusive, perpetual, worldwide licence**
to use, modify and deploy the source code in this archive, including in
commercial projects, and to create derivative works from it.

The buyer **may not** resell, relicense or redistribute the source code itself,
as-is or substantially unmodified, as a competing product, template or starter
kit. Deploying it as a running service, or building a different product on top
of it, is exactly what the licence is for.

The software is provided **"as is", without warranty of any kind**, express or
implied, including but not limited to the warranties of merchantability,
fitness for a particular purpose and non-infringement. In no event shall the
author be liable for any claim, damages or other liability arising from, out of
or in connection with the software or its use.

> Replace this section with your chosen licence if you are distributing
> QuickBlog on different terms. If you would rather use a standard open-source
> licence, MIT or Apache-2.0 both fit this codebase; add the full licence text
> as a `LICENSE` file and say so here.

---

## Third-party services

QuickBlog calls two external services. **No credential for either is included
in this archive** — every value in `Express API/.env.example` is a placeholder.
You must create your own accounts, and your use of each service is governed by
that provider's terms, not by this licence.

### Google Gemini — AI drafting

| | |
|---|---|
| **Used for** | Generating a first draft of an article from its title |
| **Where** | `Express API/configs/gemini.js` |
| **Package** | `@google/genai` ([Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)) |
| **Credential** | `GEMINI_API_KEY`, from [Google AI Studio](https://aistudio.google.com/apikey) |
| **Terms** | [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) |
| **Privacy** | [Google Privacy Policy](https://policies.google.com/privacy) |

Points worth knowing before you publish AI-drafted articles:

- Article titles you submit are sent to Google and processed on their servers.
  Do not use the feature on confidential material.
- Free-tier usage may be reviewed by Google and used to improve their models.
  Paid tiers carry different data-handling commitments — check the terms for
  the tier you are on.
- You are responsible for what you publish. Generated text should be reviewed,
  corrected and fact-checked before it goes live, and you may need to disclose
  AI assistance depending on your jurisdiction and audience.
- Rate limits and pricing are Google's and change independently of QuickBlog.
- The feature is optional. Without `GEMINI_API_KEY` everything else works.

### ImageKit — image hosting and transformation

| | |
|---|---|
| **Used for** | Storing, converting and resizing article thumbnails and avatars |
| **Where** | `Express API/configs/imageKit.js` |
| **Package** | `imagekit` ([MIT](https://opensource.org/licenses/MIT)) |
| **Credentials** | `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` |
| **Terms** | [ImageKit Terms of Service](https://imagekit.io/terms-and-conditions/) |
| **Privacy** | [ImageKit Privacy Policy](https://imagekit.io/privacy-policy/) |

Points worth knowing:

- Uploaded images are stored on ImageKit's infrastructure and served from their
  CDN. They are publicly reachable by URL — do not upload anything private.
- `IMAGEKIT_PRIVATE_KEY` signs uploads. Treat it as a password: it belongs in
  `.env` and nowhere else, never in client code or a committed file.
- Storage, bandwidth and transformation quotas are ImageKit's and depend on your
  plan.
- Images uploaded through QuickBlog remain in your ImageKit account after an
  article is deleted. The app does not delete remote files. Tidy them from the
  ImageKit dashboard if you need to.

### MongoDB

The database itself is not called as a service by this code, but if you use
**MongoDB Atlas** rather than a self-hosted server, Atlas's
[terms](https://www.mongodb.com/legal/terms-of-use) and
[privacy policy](https://www.mongodb.com/legal/privacy-policy) apply to the data
you store there. Self-hosted MongoDB Community Server is licensed under the
[SSPL](https://www.mongodb.com/licensing/server-side-public-license), which does
not affect an application that merely connects to it.

---

## Open-source dependencies

Every npm dependency keeps its own licence. The direct ones are permissive —
MIT, ISC, Apache-2.0 or BSD — and none imposes a copyleft obligation on
QuickBlog or on a product built from it.

Principal dependencies:

| Package | Licence | Used for |
|---|---|---|
| react, react-dom | MIT | Client |
| vite, @vitejs/plugin-react | MIT | Client build |
| tailwindcss | MIT | Styling |
| react-router-dom | MIT | Routing |
| quill | BSD-3-Clause | Rich text editor |
| marked | MIT | Markdown → HTML for AI drafts |
| moment | MIT | Dates, with Bengali locale |
| motion | MIT | Category pill animation |
| axios | MIT | HTTP client |
| react-hot-toast | MIT | Notifications |
| express | MIT | API framework |
| mongoose | MIT | MongoDB models |
| mongodb | Apache-2.0 | Driver, used by the database scripts |
| jsonwebtoken | MIT | Token signing and verification |
| bcryptjs | MIT | Password hashing |
| sanitize-html | MIT | HTML sanitising |
| multer | MIT | Multipart uploads |
| cors | MIT | CORS |
| dotenv | BSD-2-Clause | Configuration |
| vitest, supertest, mongodb-memory-server-core | MIT | Tests |

To regenerate this list against the installed tree:

```bash
cd "Express API"  && npx license-checker --summary
cd "React Client" && npx license-checker --summary
```

## Bundled assets

The sample images in `React Client/src/assets/` (`blog_pic_*.png`,
`gradientBackground.png`) and the SVG icons ship with this archive and are
covered by the code licence above. The sample articles created by
`database/seed.js` reference [picsum.photos](https://picsum.photos) placeholder
URLs, which are fetched at display time and are not part of this archive —
replace them with your own images before using the seed content in production.
