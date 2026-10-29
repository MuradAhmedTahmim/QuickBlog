import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import app from '../app.js'
import bootstrap from '../configs/bootstrap.js'
import Blog from '../models/Blog.js'
import User from '../models/User.js'

const api = () => request(app);

describe('health', () => {
    it('answers on / and /health', async () => {
        expect((await api().get('/')).text).toBe('API is Working')

        const health = await api().get('/health')
        expect(health.status).toBe(200)
        expect(health.body.success).toBe(true)
        expect(health.body.status).toBe('ok')
        // Reported without running a query, so it still answers when the
        // database is the thing that is broken.
        expect(health.body.database).toBe('connected')
    })
})

describe('bootstrap', () => {
    it('creates the admin account from the environment', async () => {
        await bootstrap()

        const admin = await User.findOne({email: process.env.ADMIN_EMAIL})
        expect(admin).toBeTruthy()
        expect(admin.role).toBe('admin')

        const login = await api().post('/api/admin/login').send({
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
        })
        expect(login.body.success).toBe(true)
    })

    it('is safe to run twice', async () => {
        await bootstrap()
        await bootstrap()
        expect(await User.countDocuments({email: process.env.ADMIN_EMAIL})).toBe(1)
    })

    it('backfills older articles without touching what they already have', async () => {
        // Written straight to the collection, so it looks like a document from
        // before slug, contentLanguage and the counters existed.
        await mongoose.connection.collection('blogs').insertOne({
            title: 'An article from an earlier release',
            description: '<p>Body text.</p>',
            category: 'Technology',
            image: 'https://example.com/old.png',
            isPublished: true,
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
        })

        await bootstrap()

        const blog = await Blog.findOne({title: 'An article from an earlier release'})
        expect(blog.slug).toBe('an-article-from-an-earlier-release')
        // 'both', so switching language cannot hide an article that was visible.
        expect(blog.contentLanguage).toBe('both')
        expect(blog.views).toBe(0)
        expect(blog.likesCount).toBe(0)
        expect(blog.readingTime).toBeGreaterThanOrEqual(1)
        // Untouched.
        expect(blog.title).toBe('An article from an earlier release')
        expect(blog.isPublished).toBe(true)
    })

    it('leaves an existing slug and language alone', async () => {
        await mongoose.connection.collection('blogs').insertOne({
            title: 'Already has its own slug',
            description: '<p>Body.</p>',
            category: 'Startup',
            image: 'https://example.com/x.png',
            isPublished: true,
            slug: 'a-slug-chosen-earlier',
            contentLanguage: 'bn',
            views: 42,
            uniqueViews: 30,
            likesCount: 5,
            commentsCount: 2,
            readingTime: 7,
        })

        await bootstrap()

        const blog = await Blog.findOne({title: 'Already has its own slug'})
        expect(blog.slug).toBe('a-slug-chosen-earlier')
        expect(blog.contentLanguage).toBe('bn')
        expect(blog.views).toBe(42)
        expect(blog.likesCount).toBe(5)
        expect(blog.readingTime).toBe(7)
    })

    it('gives two untitled-alike articles distinct slugs', async () => {
        for (let i = 0; i < 2; i++){
            await mongoose.connection.collection('blogs').insertOne({
                title: 'Identical headline',
                description: '<p>Body.</p>',
                category: 'Finance',
                image: 'https://example.com/x.png',
                isPublished: true,
            })
        }

        await bootstrap()

        const slugs = (await Blog.find({title: 'Identical headline'}).select('slug'))
            .map((blog) => blog.slug)
        expect(slugs.filter(Boolean)).toHaveLength(2)
        expect(new Set(slugs).size).toBe(2)
    })
})

describe('index creation ownership', () => {
    // Regression guard. database/schema.js names every index explicitly and
    // Mongoose names them its own way, so if both build the same index the
    // second one fails with IndexOptionsConflict. On a serverless cold start
    // that surfaces as an unhandled rejection and takes the whole function
    // down - which is exactly what happened on the first deploy of this
    // release. In production, schema.js owns indexes and Mongoose must not
    // touch them.
    const connectWith = async (env) => {
        const captured = {};
        vi.resetModules()
        vi.doMock('mongoose', () => ({
            default: {
                connection: {on: () => {}, readyState: 1},
                models: {},
                connect: async (uri, options) => { Object.assign(captured, options) },
            },
        }))

        const previous = {NODE_ENV: process.env.NODE_ENV, VERCEL: process.env.VERCEL};
        if('NODE_ENV' in env) process.env.NODE_ENV = env.NODE_ENV;
        else delete process.env.NODE_ENV;
        if(env.VERCEL) process.env.VERCEL = env.VERCEL;
        else delete process.env.VERCEL;

        try {
            const connectDB = (await import('../configs/db.js')).default;
            await connectDB();
        } finally {
            process.env.NODE_ENV = previous.NODE_ENV;
            if(previous.VERCEL) process.env.VERCEL = previous.VERCEL;
            else delete process.env.VERCEL;
            vi.doUnmock('mongoose')
            vi.resetModules()
        }
        return captured;
    }

    it.each([
        ['production', {NODE_ENV: 'production'}],
        ['an unset NODE_ENV', {}],
        ['an unrecognised NODE_ENV', {NODE_ENV: 'staging'}],
        ['Vercel, whatever NODE_ENV says', {NODE_ENV: 'development', VERCEL: '1'}],
    ])('leaves indexes to database/schema.js in %s', async (_label, env) => {
        // Anything that is not demonstrably a dev or test machine counts as
        // production. That is the safe direction: the cost is having to run
        // the schema script, which the install guide already requires.
        expect((await connectWith(env)).autoIndex).toBe(false)
    })

    it.each(['development', 'test'])('builds indexes automatically in %s', async (nodeEnv) => {
        // So a fresh local database works without running the script first.
        expect((await connectWith({NODE_ENV: nodeEnv})).autoIndex).toBe(true)
    })
})

describe('CORS allow-list', () => {
    // CLIENT_URL is read when app.js is first imported, so this asserts the
    // shipped default: empty means every origin is accepted.
    it('accepts any origin when CLIENT_URL is empty', async () => {
        const response = await api().get('/api/blog/all').set('Origin', 'https://somewhere.example')
        expect(response.status).toBe(200)
        expect(response.headers['access-control-allow-origin']).toBe('*')
    })
})
