/**
 * QuickBlog - sample data
 *
 * Gives a fresh install something to look at: a demo reader, two authors,
 * bilingual articles, approved and pending comments, bookmarks, likes and
 * fourteen days of analytics events so the dashboard chart is not flat.
 *
 *   npm install          # once, in the project root
 *   npm run db:schema    # create collections and indexes first
 *   npm run db:seed
 *
 * SAFE BY DEFAULT. Every document is upserted on a natural key (a user's email,
 * an article's slug), and every one is tagged `seeded: true`. Running it twice
 * changes nothing the second time, and it will never touch a document it did
 * not create. Content you wrote yourself is left exactly as it is.
 *
 *   npm run db:seed:reset   removes only the documents tagged `seeded: true`
 *                           and writes them again. Still never touches yours.
 *
 * Passwords come from DEMO_PASSWORD / AUTHOR_PASSWORD when those are set. The
 * defaults below are deliberately public demo credentials, documented in
 * README.md - they are not, and must never become, a real account's password.
 */

import bcrypt from 'bcryptjs'
import { COLLECTIONS, withDatabase } from './connect.js'

const RESET = process.argv.includes('--reset');

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoReader#2026';
const AUTHOR_PASSWORD = process.env.AUTHOR_PASSWORD || 'DemoAuthor#2026';

const day = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * day);

/* ------------------------------- accounts ------------------------------- */

const USERS = [
    {
        email: 'demo@quickblog.dev',
        name: 'Demo Reader',
        plainPassword: () => DEMO_PASSWORD,
        // Deliberately scoped: this account writes and publishes its own
        // articles and nothing else. It cannot moderate comments, cannot touch
        // another author's work, and has no destructive rights over the site.
        role: 'author',
        bio: 'The demo account. Signed in, you can read, like, save, comment and manage the two articles below.',
        image: 'https://picsum.photos/seed/quickblog-demo/320/320',
        createdAt: daysAgo(30),
    },
    {
        email: 'ayesha@quickblog.dev',
        name: 'Ayesha Rahman',
        plainPassword: () => AUTHOR_PASSWORD,
        role: 'author',
        bio: 'Writes about engineering teams and the tools they lean on.',
        image: 'https://picsum.photos/seed/quickblog-ayesha/320/320',
        createdAt: daysAgo(60),
    },
    {
        email: 'rafi@quickblog.dev',
        name: 'Rafiqul Islam',
        plainPassword: () => AUTHOR_PASSWORD,
        role: 'author',
        bio: 'বাংলায় প্রযুক্তি আর ব্যক্তিগত অর্থনীতি নিয়ে লেখেন।',
        image: 'https://picsum.photos/seed/quickblog-rafi/320/320',
        createdAt: daysAgo(45),
    },
];

/* ------------------------------- articles ------------------------------- */

const paragraphs = (...parts) => parts.map((part) => `<p>${part}</p>`).join('');

const POSTS = [
    {
        slug: 'why-small-teams-ship-faster',
        contentLanguage: 'en',
        authorEmail: 'ayesha@quickblog.dev',
        category: 'Startup',
        title: 'Why small teams ship faster',
        subTitle: 'Coordination is a cost, and it compounds quietly.',
        description:
            '<h2>The cost nobody budgets for</h2>' +
            paragraphs(
                'Every person you add to a project adds a line of communication, and the lines grow faster than the people do. Four people have six; eight people have twenty-eight. None of that shows up on a roadmap, but all of it shows up in the calendar.',
                'The teams that stay quick are not the ones that work longer hours. They are the ones that kept the number of conversations needed to make a decision small enough that a decision actually gets made.',
            ) +
            '<h3>What to do about it</h3>' +
            paragraphs(
                'Give one person the final say on each area and say out loud who that is. Write decisions down where the next person will find them. Prefer the boring tool that everyone already knows over the exciting one that needs a workshop.',
                'None of this is new advice. It is just advice that gets quietly abandoned the moment a team grows past the size where it felt obvious.',
            ),
        image: 'https://picsum.photos/seed/quickblog-post-1/1280/720',
        isPublished: true,
        createdAt: daysAgo(12),
        stats: {uniqueViews: 184, extraViews: 41, likes: 2},
    },
    {
        slug: 'reading-your-own-analytics-honestly',
        contentLanguage: 'en',
        authorEmail: 'demo@quickblog.dev',
        category: 'Technology',
        title: 'Reading your own analytics honestly',
        subTitle: 'The numbers are fine. The stories we tell about them are the problem.',
        description:
            '<h2>A view is not a reader</h2>' +
            paragraphs(
                'QuickBlog counts a unique reader once per article per six hours, which means refreshing a page does not flatter the total. That choice makes the numbers smaller and considerably more useful.',
                'Once the counting is honest, the interesting question changes. Not "how many people saw this" but "how many came back for the next one".',
            ) +
            '<h3>Three numbers worth watching</h3>' +
            '<ul>' +
            '<li><strong>Unique readers per article</strong> - the only view count that means anything.</li>' +
            '<li><strong>Comments per hundred readers</strong> - a better signal of interest than likes.</li>' +
            '<li><strong>Saves</strong> - someone planning to come back is the strongest signal you get.</li>' +
            '</ul>' +
            paragraphs('Everything else is decoration. Useful decoration, sometimes, but decoration.'),
        image: 'https://picsum.photos/seed/quickblog-post-2/1280/720',
        isPublished: true,
        createdAt: daysAgo(6),
        stats: {uniqueViews: 97, extraViews: 18, likes: 3},
    },
    {
        slug: 'ছোট-দলে-কাজ-দ্রুত-এগোয়',
        contentLanguage: 'bn',
        authorEmail: 'rafi@quickblog.dev',
        category: 'Startup',
        title: 'ছোট দলে কাজ দ্রুত এগোয়',
        subTitle: 'সমন্বয়ের খরচ চোখে পড়ে না, কিন্তু জমতে থাকে।',
        description:
            '<h2>যে খরচের হিসাব কেউ রাখে না</h2>' +
            paragraphs(
                'দলে একজন নতুন মানুষ যোগ হলে যোগাযোগের নতুন একটি সূত্র তৈরি হয়। মানুষ বাড়ে ধীরে, সূত্র বাড়ে অনেক দ্রুত। চারজনের দলে ছয়টি, আটজনের দলে আটাশটি। রোডম্যাপে এর কিছুই লেখা থাকে না, অথচ পুরোটাই ক্যালেন্ডারে এসে পড়ে।',
                'যে দলগুলো দ্রুত এগোয়, তারা বেশি সময় কাজ করে না। তারা সিদ্ধান্ত নেওয়ার জন্য দরকারি আলোচনার সংখ্যাটা ছোট রাখতে পেরেছে।',
            ) +
            '<h3>কী করা যায়</h3>' +
            paragraphs(
                'প্রতিটি অংশের জন্য একজনকে চূড়ান্ত সিদ্ধান্তের দায়িত্ব দিন, আর কে সেটা করছে তা স্পষ্ট করে বলুন। সিদ্ধান্ত এমন জায়গায় লিখে রাখুন যেখানে পরের মানুষ সেটি খুঁজে পাবে।',
                'পরিচিত সাধারণ টুলই বেছে নিন, যেটি শিখতে আলাদা কর্মশালা লাগে না।',
            ),
        image: 'https://picsum.photos/seed/quickblog-post-3/1280/720',
        isPublished: true,
        createdAt: daysAgo(9),
        stats: {uniqueViews: 143, extraViews: 27, likes: 2},
    },
    {
        slug: 'মাস-শেষে-টাকা-কোথায়-যায়',
        contentLanguage: 'bn',
        authorEmail: 'rafi@quickblog.dev',
        category: 'Finance',
        title: 'মাস শেষে টাকা কোথায় যায়',
        subTitle: 'বড় খরচ নয়, ছোট অভ্যাসই হিসাব এলোমেলো করে।',
        description:
            '<h2>হিসাবটা লিখে রাখুন</h2>' +
            paragraphs(
                'বেশিরভাগ মানুষ বড় খরচগুলো মনে রাখেন - বাসা ভাড়া, কিস্তি, যাতায়াত। যেটা মনে থাকে না, সেটা হলো দিনে দুবার করে হওয়া ছোট খরচ। মাস শেষে সেগুলোই সবচেয়ে বড় ভাগ হয়ে দাঁড়ায়।',
                'এক মাস শুধু লিখে রাখুন, কিছু বদলানোর দরকার নেই। তালিকাটাই বলে দেবে কোথায় হাত দিতে হবে।',
            ) +
            '<h3>তিনটি সহজ নিয়ম</h3>' +
            '<ul>' +
            '<li>আয়ের একটি অংশ আগে সরিয়ে রাখুন, খরচের পরে নয়।</li>' +
            '<li>প্রতিটি সাবস্ক্রিপশন বছরে একবার যাচাই করুন।</li>' +
            '<li>বড় কেনাকাটায় এক রাত সময় নিন।</li>' +
            '</ul>',
        image: 'https://picsum.photos/seed/quickblog-post-4/1280/720',
        isPublished: true,
        createdAt: daysAgo(3),
        stats: {uniqueViews: 76, extraViews: 11, likes: 1},
    },
    {
        slug: 'quickblog-release-notes-1-0-0',
        contentLanguage: 'both',
        authorEmail: 'demo@quickblog.dev',
        category: 'Technology',
        title: 'QuickBlog 1.0.0 - what is in the first release',
        subTitle: 'Bilingual reading, AI drafting, analytics, bookmarks and a CMS.',
        description:
            '<h2>Shown in both languages</h2>' +
            paragraphs(
                'This article is marked for both languages, so it stays on the homepage whichever one you are reading in. Switch with the toggle in the header and watch the list change: the Bengali-only and English-only articles come and go, this one does not.',
                'Dates and numerals follow the language too - Bengali readers get Bengali numerals throughout the interface.',
            ) +
            '<h3>The rest of it</h3>' +
            '<ul>' +
            '<li>A first AI draft from Google Gemini, which you then rewrite.</li>' +
            '<li>Thumbnails and avatars served and resized by ImageKit.</li>' +
            '<li>An analytics dashboard built on honest, de-duplicated view counts.</li>' +
            '<li>Bookmarks, so an article you have no time for now is waiting later.</li>' +
            '</ul>',
        image: 'https://picsum.photos/seed/quickblog-post-5/1280/720',
        isPublished: true,
        createdAt: daysAgo(1),
        stats: {uniqueViews: 52, extraViews: 9, likes: 3},
    },
    {
        slug: 'draft-what-bilingual-publishing-needs-next',
        contentLanguage: 'en',
        authorEmail: 'demo@quickblog.dev',
        category: 'Lifestyle',
        title: 'What bilingual publishing needs next',
        subTitle: 'A draft, so the editor has something unpublished to open.',
        description: paragraphs(
            'This one is deliberately left unpublished. It gives the demo account a draft to open in the editor, and it is invisible to readers until someone publishes it.',
            'An author sees their own drafts and nobody else sees them at all - the API checks that on every read, not just in the interface.',
        ),
        image: 'https://picsum.photos/seed/quickblog-post-6/1280/720',
        isPublished: false,
        createdAt: daysAgo(2),
        stats: {uniqueViews: 0, extraViews: 0, likes: 0},
    },
];

/* ------------------------------- comments ------------------------------- */

const COMMENTS = [
    {
        postSlug: 'why-small-teams-ship-faster',
        authorEmail: 'demo@quickblog.dev',
        content: 'The four-people-six-lines bit is the part I keep forgetting. Printing it out.',
        isApproved: true,
        createdAt: daysAgo(10),
    },
    {
        postSlug: 'why-small-teams-ship-faster',
        authorEmail: 'rafi@quickblog.dev',
        content: 'Agreed on the boring tool. Every workshop is a week nobody shipped anything.',
        isApproved: true,
        createdAt: daysAgo(8),
    },
    {
        postSlug: 'reading-your-own-analytics-honestly',
        authorEmail: 'ayesha@quickblog.dev',
        content: 'Saves as the strongest signal matches what I see. Nice to have it counted properly.',
        isApproved: true,
        createdAt: daysAgo(4),
    },
    {
        postSlug: 'ছোট-দলে-কাজ-দ্রুত-এগোয়',
        authorEmail: 'demo@quickblog.dev',
        content: 'লেখাটা খুব কাজের। সিদ্ধান্ত লিখে রাখার পরামর্শটা আমরা দলে চালু করেছি।',
        isApproved: true,
        createdAt: daysAgo(7),
    },
    {
        postSlug: 'quickblog-release-notes-1-0-0',
        authorEmail: 'ayesha@quickblog.dev',
        content: 'The language toggle changing the article list is a nice touch - it reads like one site, not two.',
        isApproved: true,
        createdAt: daysAgo(1),
    },
    {
        // Left pending on purpose, so the moderation queue is not empty.
        postSlug: 'মাস-শেষে-টাকা-কোথায়-যায়',
        authorEmail: 'demo@quickblog.dev',
        content: 'তিন নম্বর নিয়মটা সবচেয়ে কঠিন, কিন্তু কাজ করে।',
        isApproved: false,
        createdAt: daysAgo(1),
    },
];

/* -------------------------------- saves --------------------------------- */

const BOOKMARKS = [
    {userEmail: 'demo@quickblog.dev', postSlug: 'why-small-teams-ship-faster'},
    {userEmail: 'demo@quickblog.dev', postSlug: 'ছোট-দলে-কাজ-দ্রুত-এগোয়'},
    {userEmail: 'ayesha@quickblog.dev', postSlug: 'quickblog-release-notes-1-0-0'},
];

const LIKES = [
    {userEmail: 'demo@quickblog.dev', postSlug: 'why-small-teams-ship-faster'},
    {userEmail: 'demo@quickblog.dev', postSlug: 'quickblog-release-notes-1-0-0'},
    {userEmail: 'ayesha@quickblog.dev', postSlug: 'reading-your-own-analytics-honestly'},
    {userEmail: 'ayesha@quickblog.dev', postSlug: 'quickblog-release-notes-1-0-0'},
    {userEmail: 'rafi@quickblog.dev', postSlug: 'why-small-teams-ship-faster'},
    {userEmail: 'rafi@quickblog.dev', postSlug: 'reading-your-own-analytics-honestly'},
    {userEmail: 'rafi@quickblog.dev', postSlug: 'quickblog-release-notes-1-0-0'},
    {userEmail: 'demo@quickblog.dev', postSlug: 'ছোট-দলে-কাজ-দ্রুত-এগোয়'},
    {userEmail: 'rafi@quickblog.dev', postSlug: 'ছোট-দলে-কাজ-দ্রুত-এগোয়'},
    {userEmail: 'demo@quickblog.dev', postSlug: 'মাস-শেষে-টাকা-কোথায়-যায়'},
    {userEmail: 'ayesha@quickblog.dev', postSlug: 'ছোট-দলে-কাজ-দ্রুত-এগোয়'},
];

/* ------------------------------- helpers -------------------------------- */

const WORDS_PER_MINUTE = 215;

// Mirrors Express API/utils/readingTime.js, so a seeded article shows the same
// estimate the API would have calculated for it.
const readingTime = (html) => {
    const words = String(html)
        .replace(/<[^>]+>/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

// Spreads n events across the last 14 days, weighted towards recent days, so
// the dashboard chart has a believable shape rather than a flat line.
const spreadOverFortnight = (count, seed) => {
    const dates = [];
    for (let i = 0; i < count; i++){
        const bucket = Math.floor(Math.abs(Math.sin((i + 1) * seed)) * 14);
        const offset = Math.min(13, bucket);
        dates.push(new Date(daysAgo(offset).getTime() + (i % 24) * 60 * 60 * 1000));
    }
    return dates;
}

const upsert = async (collection, filter, document) => {
    const result = await collection.updateOne(
        filter,
        {$setOnInsert: {...document, seeded: true}},
        {upsert: true}
    );
    return Boolean(result.upsertedCount);
}

/* --------------------------------- run ---------------------------------- */

const seed = async (db) => {
    const users = db.collection(COLLECTIONS.users);
    const posts = db.collection(COLLECTIONS.posts);
    const comments = db.collection(COLLECTIONS.comments);
    const bookmarks = db.collection(COLLECTIONS.bookmarks);
    const likes = db.collection(COLLECTIONS.likes);
    const events = db.collection(COLLECTIONS.analyticsEvents);

    if(RESET){
        console.log('\n--reset: removing previously seeded documents only.\n');
        for (const collection of [events, likes, bookmarks, comments, posts, users]){
            const {deletedCount} = await collection.deleteMany({seeded: true});
            console.log(`  ${collection.collectionName}: removed ${deletedCount}`);
        }
    }

    console.log('\nSeeding sample data\n');

    /* accounts */
    let newUsers = 0;
    for (const user of USERS){
        const {plainPassword, ...rest} = user;
        const created = await upsert(users, {email: user.email}, {
            ...rest,
            password: await bcrypt.hash(plainPassword(), 10),
            updatedAt: new Date(),
        });
        if(created) newUsers++;
    }
    const userIds = Object.fromEntries(
        (await users.find({email: {$in: USERS.map((user) => user.email)}}).toArray())
            .map((user) => [user.email, user._id])
    );
    console.log(`  users: ${newUsers} created, ${USERS.length - newUsers} already present`);

    /* articles */
    let newPosts = 0;
    for (const post of POSTS){
        const {authorEmail, stats, ...rest} = post;
        const created = await upsert(posts, {slug: post.slug}, {
            ...rest,
            author: userIds[authorEmail],
            views: stats.uniqueViews + stats.extraViews,
            uniqueViews: stats.uniqueViews,
            likesCount: 0,
            commentsCount: 0,
            readingTime: readingTime(post.description),
            updatedAt: post.createdAt,
        });
        if(created) newPosts++;
    }
    const postIds = Object.fromEntries(
        (await posts.find({slug: {$in: POSTS.map((post) => post.slug)}}).toArray())
            .map((post) => [post.slug, post._id])
    );
    console.log(`  blogs: ${newPosts} created, ${POSTS.length - newPosts} already present`);

    /* comments */
    let newComments = 0;
    for (const comment of COMMENTS){
        const author = USERS.find((user) => user.email === comment.authorEmail);
        const created = await upsert(
            comments,
            {blog: postIds[comment.postSlug], user: userIds[comment.authorEmail], content: comment.content},
            {
                blog: postIds[comment.postSlug],
                user: userIds[comment.authorEmail],
                name: author.name,
                content: comment.content,
                isApproved: comment.isApproved,
                createdAt: comment.createdAt,
                updatedAt: comment.createdAt,
            }
        );
        if(created) newComments++;
    }
    console.log(`  comments: ${newComments} created, ${COMMENTS.length - newComments} already present`);

    /* saves */
    let newBookmarks = 0;
    for (const bookmark of BOOKMARKS){
        const created = await upsert(
            bookmarks,
            {user: userIds[bookmark.userEmail], blog: postIds[bookmark.postSlug]},
            {
                user: userIds[bookmark.userEmail],
                blog: postIds[bookmark.postSlug],
                createdAt: daysAgo(5),
                updatedAt: daysAgo(5),
            }
        );
        if(created) newBookmarks++;
    }
    console.log(`  bookmarks: ${newBookmarks} created, ${BOOKMARKS.length - newBookmarks} already present`);

    /* likes */
    let newLikes = 0;
    for (const [index, like] of LIKES.entries()){
        const when = new Date(daysAgo(index % 13).getTime() + index * 60 * 60 * 1000);
        const created = await upsert(
            likes,
            {user: userIds[like.userEmail], blog: postIds[like.postSlug]},
            {
                user: userIds[like.userEmail],
                blog: postIds[like.postSlug],
                createdAt: when,
                updatedAt: when,
            }
        );
        if(created) newLikes++;
    }
    console.log(`  likes: ${newLikes} created, ${LIKES.length - newLikes} already present`);

    /* analytics events - one row per article and reader */
    let newEvents = 0;
    for (const post of POSTS){
        if(!post.stats.uniqueViews) continue;

        const dates = spreadOverFortnight(post.stats.uniqueViews, post.slug.length + 1);
        for (const [index, createdAt] of dates.entries()){
            // A stable synthetic viewer key, so re-running recognises its own
            // rows instead of inventing new readers each time.
            const viewerKey = `v:seed-${post.slug.length}-${index}`;
            const created = await upsert(
                events,
                {blog: postIds[post.slug], viewerKey},
                {
                    blog: postIds[post.slug],
                    viewerKey,
                    count: 1,
                    lastViewedAt: createdAt,
                    createdAt,
                    updatedAt: createdAt,
                }
            );
            if(created) newEvents++;
        }
    }
    console.log(`  views (analytics events): ${newEvents} created`);

    /* keep the denormalised counters on each article true to the rows above */
    for (const [slug, id] of Object.entries(postIds)){
        const [likesCount, commentsCount] = await Promise.all([
            likes.countDocuments({blog: id}),
            comments.countDocuments({blog: id, isApproved: true}),
        ]);
        await posts.updateOne({_id: id}, {$set: {likesCount, commentsCount}});
    }
    console.log('  counters: likes and comments recalculated from the rows above');

    console.log('\nDone. Demo sign-in:');
    console.log(`  email:    demo@quickblog.dev`);
    console.log(`  password: ${DEMO_PASSWORD}`);
    console.log('\nThe demo account is an author: it writes and publishes its own');
    console.log('articles only, and cannot moderate comments or touch anyone else\'s work.\n');
}

await withDatabase(seed);
