import { describe, expect, it } from 'vitest'
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

describe('CORS allow-list', () => {
    // CLIENT_URL is read when app.js is first imported, so this asserts the
    // shipped default: empty means every origin is accepted.
    it('accepts any origin when CLIENT_URL is empty', async () => {
        const response = await api().get('/api/blog/all').set('Origin', 'https://somewhere.example')
        expect(response.status).toBe(200)
        expect(response.headers['access-control-allow-origin']).toBe('*')
    })
})
