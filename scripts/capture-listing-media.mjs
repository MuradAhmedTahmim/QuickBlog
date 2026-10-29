#!/usr/bin/env node
/**
 * Builds the marketplace listing media in Vibe96-Media/, from the LIVE site.
 *
 *   npm install --no-save playwright
 *   node scripts/capture-listing-media.mjs
 *
 * Six 1920x1080 screenshots and one 1080x1080 promotional image. The promo is
 * rendered from the HTML at the bottom of this file, using the site's own
 * colour tokens and wordmark, over a real screenshot.
 *
 * Playwright is not a project dependency: this is a one-off tool, not part of
 * the app. Install it without saving, as above. It uses Playwright's bundled
 * Chromium if present and otherwise falls back to an installed Chrome or Edge.
 *
 * Options, as environment variables:
 *   SITE      the deployment to shoot   (default: the production URL below)
 *   EMAIL     demo account              (default: demo@quickblog.dev)
 *   PASSWORD  demo password             (default: the one in README.md)
 *
 * Nothing is written to the site. The only action that changes any state is
 * signing in; no password is ever typed into a field that is then photographed.
 */

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE = process.env.SITE || 'https://quickblog-web-blush.vercel.app';
const DEMO = {
    email: process.env.EMAIL || 'demo@quickblog.dev',
    password: process.env.PASSWORD || 'DemoReader#2026',
};

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'Vibe96-Media');
const WORK = path.join(OUT, '.work');

const { chromium } = await import('playwright').catch(() => {
    console.error('Playwright is not installed. Run:  npm install --no-save playwright');
    process.exit(1);
});

mkdirSync(OUT, {recursive: true});
mkdirSync(WORK, {recursive: true});

// Playwright's own Chromium first, then whatever Chrome or Edge is installed.
let browser;
for (const options of [{}, {channel: 'chrome'}, {channel: 'msedge'}]) {
    try {
        browser = await chromium.launch(options);
        console.log('browser:', options.channel ?? 'bundled chromium');
        break;
    } catch { /* try the next one */ }
}
if(!browser){
    console.error('No browser available. Run:  npx playwright install chromium');
    process.exit(1);
}

const newPage = async (width, height, scale = 1) => {
    const context = await browser.newContext({
        viewport: {width, height},
        deviceScaleFactor: scale,
        colorScheme: 'light',
        locale: 'en-GB',
    });
    // Set before the first paint: the app reads both of these from
    // localStorage while it is starting up.
    await context.addInitScript(() => {
        try {
            localStorage.setItem('qb-lang', 'en');
            localStorage.setItem('qb-theme', 'light');
        } catch { /* storage blocked */ }
    });
    return {context, page: await context.newPage()};
}

const loaded = async (page) => {
    await page.evaluate(() => Promise.all(
        [...document.images].filter((image) => !image.complete).map((image) =>
            new Promise((done) => {
                image.addEventListener('load', done, {once: true});
                image.addEventListener('error', done, {once: true});
                setTimeout(done, 8000);
            })
        )
    )).catch(() => {});
    await page.waitForTimeout(800);
}

// Walks the page once so lazily loaded images and the chart have rendered,
// then returns to the top.
const prime = async (page) => {
    await page.evaluate(async () => {
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
        window.scrollTo(0, 0);
        await new Promise((resolve) => setTimeout(resolve, 400));
    });
    await loaded(page);
}

const open = async (page, url, settle = 2500) => {
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(settle);
    await loaded(page);
    await prime(page);
}

const signIn = async (page) => {
    await page.goto(SITE, {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(2000);
    await page.getByRole('button', {name: /sign in/i}).first().click({timeout: 15000});
    await page.waitForTimeout(1200);
    await page.locator('input[type="email"]').first().fill(DEMO.email);
    await page.locator('input[type="password"]').first().fill(DEMO.password);
    await page.locator('form').first().locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3500);

    const ok = await page.evaluate(() => {
        try { return Boolean(localStorage.getItem('token')); } catch { return false; }
    });
    if(!ok) throw new Error(`could not sign in as ${DEMO.email}`);
}

/* ----------------------------- screenshots ----------------------------- */

// 1-3 are public.
{
    const {context, page} = await newPage(1920, 1080);

    await open(page, SITE);
    await page.screenshot({path: path.join(OUT, '01-Homepage-Cover.png')});
    console.log('  01-Homepage-Cover.png');

    // Shot from the homepage's own first article, so this keeps working after
    // the sample content is replaced.
    const slug = await page.evaluate(() =>
        document.querySelector('a[href^="/blog/"]')?.getAttribute('href')?.split('/blog/')[1]
    );
    await open(page, `${SITE}/blog/${slug}`);
    await page.screenshot({path: path.join(OUT, '02-Article-Details.png')});
    console.log('  02-Article-Details.png');

    // The create-account view carries name, email and password, so one frame
    // covers registration and sign-in. Every field is left empty.
    await open(page, SITE, 2000);
    await page.getByRole('button', {name: /sign in/i}).first().click({timeout: 15000});
    await page.waitForTimeout(1400);
    await page.getByRole('button', {name: /create one|sign up|create account/i})
        .first().click({timeout: 5000}).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({path: path.join(OUT, '03-Login-Register.png')});
    console.log('  03-Login-Register.png');

    // The promo image wants a light frame, so take the article grid as well.
    await open(page, SITE);
    await page.evaluate(() => {
        const heading = document.querySelector('#articles-heading');
        if(heading){
            window.scrollTo({
                top: heading.getBoundingClientRect().top + window.scrollY - 110,
                behavior: 'instant',
            });
        }
    });
    await page.waitForTimeout(1200);
    await page.screenshot({path: path.join(WORK, 'promo-shot.png')});

    await context.close();
}

// 4-6 need the demo account. The CMS is shot as a 1536px browser on a 125%
// display - still exactly 1920x1080, but the table fills the frame.
{
    const {context, page} = await newPage(1536, 864, 1.25);
    await signIn(page);
    await open(page, `${SITE}/admin/listBlog`, 3500);
    await page.screenshot({path: path.join(OUT, '04-Admin-CMS.png')});
    console.log('  04-Admin-CMS.png');
    await context.close();
}

{
    const {context, page} = await newPage(1920, 1080);
    await signIn(page);

    await open(page, `${SITE}/admin`, 4000);
    await page.screenshot({path: path.join(OUT, '05-Analytics-Dashboard.png')});
    console.log('  05-Analytics-Dashboard.png');

    await open(page, `${SITE}/saved`, 3000);
    await page.screenshot({path: path.join(OUT, '06-Bookmarks.png')});
    console.log('  06-Bookmarks.png');

    await context.close();
}

/* --------------------------- promotional image --------------------------- */

// The site's own tokens, from client/src/index.css, and the wordmark from
// client/src/components/Icons.jsx. Keep them in step if the branding changes.
const PROMO = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300..800&display=swap" rel="stylesheet">
<style>
  :root{ --on-navy:#F6F5F0; --navy:#142D4E; --teal:#20A89A; }
  *{ margin:0; padding:0; box-sizing:border-box; }
  body{ width:1080px; height:1080px; overflow:hidden; position:relative;
        font-family:'Outfit',system-ui,sans-serif; background:var(--navy); color:var(--on-navy); }
  body::before{ content:''; position:absolute; inset:0;
    background:
      radial-gradient(900px 600px at 88% 6%, rgba(32,168,154,.26), transparent 62%),
      radial-gradient(700px 520px at 4% 96%, rgba(32,168,154,.14), transparent 60%); }
  .sheet{ position:relative; display:flex; flex-direction:column; height:100%; padding:72px 72px 0; }
  header{ display:flex; align-items:center; justify-content:space-between; }
  .wordmark{ display:inline-flex; align-items:baseline; gap:.1em; font-weight:600;
             letter-spacing:-.02em; font-size:52px; }
  .wordmark .blog{ color:var(--teal); }
  .wordmark .dot{ width:.26em; height:.26em; border-radius:999px; background:var(--teal);
                  transform:translateY(-.06em); }
  .badge{ font-size:19px; font-weight:500; padding:11px 22px; border-radius:999px;
          background:rgba(246,245,240,.10); border:1px solid rgba(246,245,240,.22);
          color:rgba(246,245,240,.92); }
  h1{ margin-top:44px; font-size:76px; line-height:1.03; font-weight:700;
      letter-spacing:-.035em; max-width:14ch; }
  h1 .accent{ color:var(--teal); }
  p.sub{ margin-top:24px; font-size:27px; line-height:1.45; font-weight:300;
         color:rgba(246,245,240,.80); max-width:30ch; }
  ul{ margin-top:28px; display:flex; flex-wrap:wrap; gap:12px 14px; list-style:none; max-width:760px; }
  ul li{ font-size:20px; font-weight:500; color:rgba(246,245,240,.95); padding:10px 18px;
         border-radius:999px; background:rgba(32,168,154,.17); border:1px solid rgba(32,168,154,.42); }
  .shot{ margin-top:auto; width:1008px; height:452px; border-radius:18px 18px 0 0; overflow:hidden;
         box-shadow:0 -28px 70px rgba(5,18,32,.6); border:1px solid rgba(246,245,240,.22);
         border-bottom:none; }
  .shot img{ width:100%; height:452px; object-fit:cover; object-position:top center; display:block; }
</style></head>
<body><div class="sheet">
  <header>
    <span class="wordmark">Quick<span class="blog">Blog</span><span class="dot"></span></span>
    <span class="badge">Bengali&nbsp;&amp;&nbsp;English</span>
  </header>
  <h1>Modern <span class="accent">blogging</span> platform.</h1>
  <p class="sub">A bilingual reading experience and a CMS, on one site.</p>
  <ul><li>AI drafting</li><li>Analytics</li><li>Bookmarks</li><li>Comments</li><li>MERN stack</li></ul>
  <div class="shot"><img src="./promo-shot.png" alt="QuickBlog"></div>
</div></body></html>`;

{
    const html = path.join(WORK, 'promo.html');
    writeFileSync(html, PROMO);

    const {context, page} = await newPage(1080, 1080);
    await page.goto(pathToFileURL(html).href, {waitUntil: 'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    await page.screenshot({path: path.join(OUT, '07-QuickBlog-List-Image.png')});
    console.log('  07-QuickBlog-List-Image.png');
    await context.close();
}

await browser.close();
rmSync(WORK, {recursive: true, force: true});

console.log(`\nWritten to ${OUT}`);
