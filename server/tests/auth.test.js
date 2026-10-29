import { describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import User from '../models/User.js'
import { PASSWORD, makeUser } from './helpers.js'

const api = () => request(app);

describe('registration', () => {
    it('creates an account and returns a usable token', async () => {
        const response = await api().post('/api/user/register').send({
            name: 'Nadia Karim',
            email: 'Nadia@Example.COM',
            password: 'a-good-password',
        })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.user.name).toBe('Nadia Karim')

        // New accounts are readers, never authors or admins.
        expect(response.body.user.role).toBe('user')

        const payload = jwt.verify(response.body.token, process.env.JWT_SECRET)
        expect(payload.id).toBe(String(response.body.user._id))
    })

    it('never returns the password, and stores only a hash', async () => {
        await api().post('/api/user/register').send({
            name: 'Nadia Karim',
            email: 'nadia@example.com',
            password: 'a-good-password',
        })

        const stored = await User.findOne({email: 'nadia@example.com'}).select('+password')
        expect(stored.password).not.toBe('a-good-password')
        expect(stored.password.startsWith('$2')).toBe(true)

        const response = await api().post('/api/user/login').send({
            email: 'nadia@example.com',
            password: 'a-good-password',
        })
        expect(JSON.stringify(response.body)).not.toContain('a-good-password')
    })

    it('lower-cases the email so the same address cannot register twice', async () => {
        await api().post('/api/user/register').send({
            name: 'Nadia Karim', email: 'nadia@example.com', password: 'a-good-password',
        })

        const second = await api().post('/api/user/register').send({
            name: 'Someone Else', email: 'NADIA@EXAMPLE.COM', password: 'another-password',
        })

        expect(second.body.success).toBe(false)
        expect(second.body.message).toMatch(/already exists/i)
        expect(await User.countDocuments()).toBe(1)
    })

    it.each([
        ['a one-letter name', {name: 'A', email: 'a@b.co', password: 'a-good-password'}],
        ['a malformed email', {name: 'Nadia Karim', email: 'not-an-email', password: 'a-good-password'}],
        ['a short password', {name: 'Nadia Karim', email: 'a@b.co', password: 'short'}],
    ])('rejects %s', async (_label, body) => {
        const response = await api().post('/api/user/register').send(body)
        expect(response.body.success).toBe(false)
        expect(await User.countDocuments()).toBe(0)
    })
})

describe('login', () => {
    it('accepts the right password', async () => {
        await makeUser({email: 'reader@test.local'})

        const response = await api().post('/api/user/login')
            .send({email: 'reader@test.local', password: PASSWORD})

        expect(response.body.success).toBe(true)
        expect(response.body.token).toBeTruthy()
    })

    it('gives the same answer for a wrong password and an unknown account', async () => {
        await makeUser({email: 'reader@test.local'})

        const wrongPassword = await api().post('/api/user/login')
            .send({email: 'reader@test.local', password: 'not-it'})
        const noSuchUser = await api().post('/api/user/login')
            .send({email: 'nobody@test.local', password: PASSWORD})

        expect(wrongPassword.body.success).toBe(false)
        expect(noSuchUser.body.success).toBe(false)
        // Identical wording, so the response cannot be used to enumerate accounts.
        expect(wrongPassword.body.message).toBe(noSuchUser.body.message)
    })
})

describe('token enforcement', () => {
    it('rejects a request with no token', async () => {
        const response = await api().get('/api/user/me')
        expect(response.status).toBe(401)
        expect(response.body.success).toBe(false)
    })

    it.each([
        ['a malformed token', 'Bearer not.a.real.token'],
        ['a token signed with the wrong secret', `Bearer ${jwt.sign({id: '507f1f77bcf86cd799439011'}, 'wrong-secret')}`],
        ['a token for a deleted account', `Bearer ${jwt.sign({id: '507f1f77bcf86cd799439011'}, process.env.JWT_SECRET)}`],
    ])('rejects %s', async (_label, header) => {
        const response = await api().get('/api/user/me').set('Authorization', header)
        expect(response.status).toBe(401)
    })

    it('rejects an expired token', async () => {
        const {user} = await makeUser()
        const expired = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '-1s'})

        const response = await api().get('/api/user/me').set('Authorization', `Bearer ${expired}`)
        expect(response.status).toBe(401)
    })

    it('accepts a valid token and returns that account', async () => {
        const {user, token} = await makeUser({email: 'reader@test.local'})

        const response = await api().get('/api/user/me').set('Authorization', `Bearer ${token}`)

        expect(response.body.success).toBe(true)
        expect(response.body.user._id).toBe(String(user._id))
        expect(response.body.user.password).toBeUndefined()
    })
})

describe('write routes require a token', () => {
    // Requirement 6: every POST route is behind JWT middleware. The three
    // endpoints that issue a token are the only exceptions, and they are
    // asserted separately above.
    it.each([
        ['/api/blog/like', {blogId: '507f1f77bcf86cd799439011'}],
        ['/api/blog/add-comment', {blog: '507f1f77bcf86cd799439011', content: 'Nice piece'}],
        ['/api/blog/subscribe', {email: 'someone@example.com'}],
        ['/api/blog/add', {}],
        ['/api/blog/update', {}],
        ['/api/blog/delete', {id: '507f1f77bcf86cd799439011'}],
        ['/api/blog/toggle-publish', {id: '507f1f77bcf86cd799439011'}],
        ['/api/blog/generate', {prompt: 'Anything'}],
        ['/api/user/profile', {name: 'New Name'}],
        ['/api/user/bookmark', {blogId: '507f1f77bcf86cd799439011'}],
        ['/api/admin/approve-comment', {id: '507f1f77bcf86cd799439011'}],
        ['/api/admin/delete-comment', {id: '507f1f77bcf86cd799439011'}],
    ])('refuses an anonymous POST to %s', async (path, body) => {
        const response = await api().post(path).send(body)
        expect([401, 403]).toContain(response.status)
        expect(response.body.success).toBe(false)
    })

    it.each([
        '/api/admin/blogs',
        '/api/admin/dashboard',
        '/api/admin/comments',
        '/api/user/engagement',
        '/api/user/bookmarks',
    ])('refuses an anonymous GET to %s', async (path) => {
        const response = await api().get(path)
        expect([401, 403]).toContain(response.status)
    })
})

describe('role checks', () => {
    it('keeps a plain reader out of the CMS', async () => {
        const {token} = await makeUser({role: 'user'})

        for (const path of ['/api/blog/add', '/api/blog/generate']){
            const response = await api().post(path)
                .set('Authorization', `Bearer ${token}`)
                .send({prompt: 'x'})
            expect(response.status).toBe(403)
        }

        const list = await api().get('/api/admin/blogs').set('Authorization', `Bearer ${token}`)
        expect(list.status).toBe(403)
    })

    it('lets an author into the CMS but not into moderation', async () => {
        const {token} = await makeUser({role: 'author', email: 'author@test.local'})

        const allowed = await api().get('/api/admin/blogs').set('Authorization', `Bearer ${token}`)
        expect(allowed.body.success).toBe(true)

        const refused = await api().get('/api/admin/comments').set('Authorization', `Bearer ${token}`)
        expect(refused.status).toBe(403)
    })

    it('scopes an author dashboard to their own articles', async () => {
        const {token} = await makeUser({role: 'author', email: 'author@test.local'})

        const response = await api().get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`)

        expect(response.body.success).toBe(true)
        expect(response.body.dashboardData.scope).toBe('author')
        // Site-wide figures are withheld from an author.
        expect(response.body.dashboardData.subscribers).toBe(0)
    })

    it('gives an admin the whole site', async () => {
        const {token} = await makeUser({role: 'admin', email: 'boss@test.local'})

        const response = await api().get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`)

        expect(response.body.success).toBe(true)
        expect(response.body.dashboardData.scope).toBe('site')
    })
})

describe('profile', () => {
    it('only ever edits the caller own profile', async () => {
        const {user, token} = await makeUser({email: 'mine@test.local', name: 'Original Name'})
        const {user: other} = await makeUser({email: 'other@test.local', name: 'Other Person'})

        const response = await api().post('/api/user/profile')
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'Updated Name')

        expect(response.body.success).toBe(true)
        expect(response.body.user._id).toBe(String(user._id))

        // The other account is untouched, whatever the request said.
        expect((await User.findById(other._id)).name).toBe('Other Person')
        expect((await User.findById(user._id)).name).toBe('Updated Name')
    })

    it('cannot promote itself to admin through the profile endpoint', async () => {
        const {user, token} = await makeUser({role: 'user'})

        await api().post('/api/user/profile')
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'Still A Reader')
            .field('role', 'admin')

        expect((await User.findById(user._id)).role).toBe('user')
    })
})
