import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

// ImageKit is the one external service a write touches, so it is stubbed here.
// Everything else in the CRUD path is the real code.
vi.mock('../configs/imageKit.js', () => ({
    default: {
        upload: vi.fn(async ({fileName}) => ({filePath: `/blogs/${fileName}`})),
        url: vi.fn(({path}) => `https://ik.imagekit.io/test${path}?tr=f-webp`),
    },
}))

const app = (await import('../app.js')).default;
const Blog = (await import('../models/Blog.js')).default;
const Comment = (await import('../models/Comment.js')).default;
const { PNG, blogPayload, makeUser } = await import('./helpers.js');

const api = () => request(app);

let author, authorToken, admin, adminToken, reader, readerToken;

beforeEach(async () => {
    ({user: author, token: authorToken} = await makeUser({
        role: 'author', email: 'author@test.local', name: 'Ayesha Rahman',
    }))
    ;({user: admin, token: adminToken} = await makeUser({
        role: 'admin', email: 'boss@test.local', name: 'The Editor',
    }))
    ;({user: reader, token: readerToken} = await makeUser({
        role: 'user', email: 'reader@test.local', name: 'Curious Reader',
    }))
})

// Creates an article through the API, so each test starts from a real document.
const createBlog = async (token, overrides = {}) => {
    const response = await api().post('/api/blog/add')
        .set('Authorization', `Bearer ${token}`)
        .field('blog', blogPayload(overrides))
        .attach('image', PNG, 'thumb.png')

    if(!response.body.success) throw new Error(`createBlog failed: ${response.status} ${JSON.stringify(response.body)}`)
    return response;
}

describe('create', () => {
    it('stores an article for the signed-in author', async () => {
        await createBlog(authorToken, {title: 'Why small teams ship faster'})

        const blog = await Blog.findOne({title: 'Why small teams ship faster'})
        expect(blog).toBeTruthy()
        expect(String(blog.author)).toBe(String(author._id))
        expect(blog.image).toContain('ik.imagekit.io')
    })

    it('derives a slug, reading time and language default', async () => {
        await createBlog(authorToken, {title: 'Why Small Teams Ship Faster!'})

        const blog = await Blog.findOne({})
        expect(blog.slug).toBe('why-small-teams-ship-faster')
        expect(blog.readingTime).toBeGreaterThanOrEqual(1)
        expect(blog.contentLanguage).toBe('both')
    })

    it('gives a second article with the same title a distinct slug', async () => {
        await createBlog(authorToken, {title: 'Repeated title'})
        await createBlog(authorToken, {title: 'Repeated title'})

        const slugs = (await Blog.find({}).select('slug')).map((blog) => blog.slug)
        expect(new Set(slugs).size).toBe(2)
        expect(slugs).toContain('repeated-title')
    })

    it('strips script tags out of the body before storing it', async () => {
        await createBlog(authorToken, {
            description: '<p>Safe text</p><script>steal()</script><img src=x onerror="hack()">',
        })

        const blog = await Blog.findOne({})
        expect(blog.description).toContain('Safe text')
        expect(blog.description).not.toContain('<script')
        expect(blog.description).not.toContain('onerror')
    })

    it('refuses a request with no thumbnail', async () => {
        const response = await api().post('/api/blog/add')
            .set('Authorization', `Bearer ${authorToken}`)
            .field('blog', blogPayload())

        expect(response.body.success).toBe(false)
        expect(await Blog.countDocuments()).toBe(0)
    })

    it('refuses a plain reader', async () => {
        const response = await api().post('/api/blog/add')
            .set('Authorization', `Bearer ${readerToken}`)
            .field('blog', blogPayload())
            .attach('image', PNG, 'thumb.png')

        expect(response.status).toBe(403)
        expect(await Blog.countDocuments()).toBe(0)
    })
})

describe('read', () => {
    it('lists published articles and hides drafts', async () => {
        await createBlog(authorToken, {title: 'Published piece', isPublished: true})
        await createBlog(authorToken, {title: 'Draft piece', isPublished: false})

        const response = await api().get('/api/blog/all')

        expect(response.body.success).toBe(true)
        const titles = response.body.blogs.map((blog) => blog.title)
        expect(titles).toContain('Published piece')
        expect(titles).not.toContain('Draft piece')
    })

    it('filters the list by language, always keeping "both"', async () => {
        await createBlog(authorToken, {title: 'English piece', contentLanguage: 'en'})
        await createBlog(authorToken, {title: 'Bengali piece', contentLanguage: 'bn'})
        await createBlog(authorToken, {title: 'Either piece', contentLanguage: 'both'})

        const english = await api().get('/api/blog/all?lang=en')
        const bengali = await api().get('/api/blog/all?lang=bn')

        expect(english.body.blogs.map((blog) => blog.title).sort())
            .toEqual(['Either piece', 'English piece'])
        expect(bengali.body.blogs.map((blog) => blog.title).sort())
            .toEqual(['Bengali piece', 'Either piece'])
    })

    it('fetches one article by id and by slug', async () => {
        await createBlog(authorToken, {title: 'Findable article'})
        const blog = await Blog.findOne({})

        const byId = await api().get(`/api/blog/${blog._id}`)
        const bySlug = await api().get(`/api/blog/${blog.slug}`)

        expect(byId.body.blog.title).toBe('Findable article')
        expect(bySlug.body.blog._id).toBe(String(blog._id))
    })

    it('hides a draft from a reader but shows it to its author', async () => {
        await createBlog(authorToken, {title: 'Unfinished', isPublished: false})
        const blog = await Blog.findOne({})

        const anonymous = await api().get(`/api/blog/${blog._id}`)
        const otherReader = await api().get(`/api/blog/${blog._id}`)
            .set('Authorization', `Bearer ${readerToken}`)
        const itsAuthor = await api().get(`/api/blog/${blog._id}`)
            .set('Authorization', `Bearer ${authorToken}`)
        const theAdmin = await api().get(`/api/blog/${blog._id}`)
            .set('Authorization', `Bearer ${adminToken}`)

        expect(anonymous.body.success).toBe(false)
        expect(otherReader.body.success).toBe(false)
        expect(itsAuthor.body.success).toBe(true)
        expect(theAdmin.body.success).toBe(true)
    })

    it('counts a unique reader once, not once per refresh', async () => {
        await createBlog(authorToken, {title: 'Counted article'})
        const blog = await Blog.findOne({})

        for (let i = 0; i < 3; i++){
            await api().get(`/api/blog/${blog._id}`).set('x-visitor-id', 'abcdef123456')
        }

        const after = await Blog.findById(blog._id)
        expect(after.uniqueViews).toBe(1)
        expect(after.views).toBe(1)
    })
})

describe('update', () => {
    it('lets an author change their own article', async () => {
        await createBlog(authorToken, {title: 'Original title'})
        const blog = await Blog.findOne({})

        const response = await api().post('/api/blog/update')
            .set('Authorization', `Bearer ${authorToken}`)
            .field('blog', blogPayload({id: blog._id, title: 'Revised title'}))

        expect(response.body.success).toBe(true)
        expect((await Blog.findById(blog._id)).title).toBe('Revised title')
    })

    it('recalculates reading time when the body changes', async () => {
        await createBlog(authorToken)
        const blog = await Blog.findOne({})

        await api().post('/api/blog/update')
            .set('Authorization', `Bearer ${authorToken}`)
            .field('blog', blogPayload({
                id: blog._id,
                description: `<p>${'word '.repeat(2000)}</p>`,
            }))

        expect((await Blog.findById(blog._id)).readingTime).toBeGreaterThan(blog.readingTime)
    })

    it('keeps the existing thumbnail when no new file is sent', async () => {
        await createBlog(authorToken)
        const blog = await Blog.findOne({})

        await api().post('/api/blog/update')
            .set('Authorization', `Bearer ${authorToken}`)
            .field('blog', blogPayload({id: blog._id, title: 'Same image'}))

        expect((await Blog.findById(blog._id)).image).toBe(blog.image)
    })

    it('refuses to let one author edit another author article', async () => {
        await createBlog(authorToken, {title: 'Mine, not yours'})
        const blog = await Blog.findOne({})
        const {token: intruderToken} = await makeUser({role: 'author', email: 'intruder@test.local'})

        const response = await api().post('/api/blog/update')
            .set('Authorization', `Bearer ${intruderToken}`)
            .field('blog', blogPayload({id: blog._id, title: 'Hijacked'}))

        expect(response.status).toBe(403)
        expect((await Blog.findById(blog._id)).title).toBe('Mine, not yours')
    })

    it('lets an admin edit anyone article', async () => {
        await createBlog(authorToken, {title: 'Needs an edit'})
        const blog = await Blog.findOne({})

        const response = await api().post('/api/blog/update')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('blog', blogPayload({id: blog._id, title: 'Edited by the desk'}))

        expect(response.body.success).toBe(true)
        expect((await Blog.findById(blog._id)).title).toBe('Edited by the desk')
    })

    it('toggles publication for the owner only', async () => {
        await createBlog(authorToken, {isPublished: true})
        const blog = await Blog.findOne({})
        const {token: intruderToken} = await makeUser({role: 'author', email: 'intruder@test.local'})

        const refused = await api().post('/api/blog/toggle-publish')
            .set('Authorization', `Bearer ${intruderToken}`).send({id: blog._id})
        expect(refused.status).toBe(403)
        expect((await Blog.findById(blog._id)).isPublished).toBe(true)

        const allowed = await api().post('/api/blog/toggle-publish')
            .set('Authorization', `Bearer ${authorToken}`).send({id: blog._id})
        expect(allowed.body.success).toBe(true)
        expect((await Blog.findById(blog._id)).isPublished).toBe(false)
    })
})

describe('delete', () => {
    it('removes the article and its comments', async () => {
        await createBlog(authorToken)
        const blog = await Blog.findOne({})
        await Comment.create({blog: blog._id, name: 'Someone', content: 'A comment', isApproved: true})

        const response = await api().post('/api/blog/delete')
            .set('Authorization', `Bearer ${authorToken}`).send({id: blog._id})

        expect(response.body.success).toBe(true)
        expect(await Blog.countDocuments()).toBe(0)
        expect(await Comment.countDocuments({blog: blog._id})).toBe(0)
    })

    it('refuses to delete another author article', async () => {
        await createBlog(authorToken)
        const blog = await Blog.findOne({})
        const {token: intruderToken} = await makeUser({role: 'author', email: 'intruder@test.local'})

        const response = await api().post('/api/blog/delete')
            .set('Authorization', `Bearer ${intruderToken}`).send({id: blog._id})

        expect(response.status).toBe(403)
        expect(await Blog.countDocuments()).toBe(1)
    })
})

describe('comments', () => {
    it('takes a comment from a signed-in reader and holds it for review', async () => {
        await createBlog(authorToken)
        const blog = await Blog.findOne({})

        const response = await api().post('/api/blog/add-comment')
            .set('Authorization', `Bearer ${readerToken}`)
            .send({blog: blog._id, content: 'This was a useful read.'})

        expect(response.body.success).toBe(true)

        const comment = await Comment.findOne({})
        expect(comment.isApproved).toBe(false)
        // The name comes from the account, not from the request body.
        expect(comment.name).toBe('Curious Reader')
        expect(String(comment.user)).toBe(String(reader._id))
    })

    it('ignores a name supplied in the request body', async () => {
        await createBlog(authorToken)
        const blog = await Blog.findOne({})

        await api().post('/api/blog/add-comment')
            .set('Authorization', `Bearer ${readerToken}`)
            .send({blog: blog._id, content: 'Impersonation attempt', name: 'The Editor'})

        expect((await Comment.findOne({})).name).toBe('Curious Reader')
    })

    it('shows approved comments publicly and withholds pending ones', async () => {
        await createBlog(authorToken)
        const blog = await Blog.findOne({})
        await Comment.create({blog: blog._id, name: 'A', content: 'Approved', isApproved: true})
        await Comment.create({blog: blog._id, name: 'B', content: 'Pending', isApproved: false})

        const response = await api().get(`/api/blog/comments/${blog._id}`)

        expect(response.body.comments).toHaveLength(1)
        expect(response.body.comments[0].content).toBe('Approved')
    })

    it('keeps the stored comment count in step with approvals', async () => {
        await createBlog(authorToken)
        const blog = await Blog.findOne({})
        const comment = await Comment.create({blog: blog._id, name: 'A', content: 'Pending', isApproved: false})

        await api().post('/api/admin/approve-comment')
            .set('Authorization', `Bearer ${adminToken}`).send({id: comment._id})

        expect((await Blog.findById(blog._id)).commentsCount).toBe(1)

        await api().post('/api/admin/delete-comment')
            .set('Authorization', `Bearer ${adminToken}`).send({id: comment._id})

        expect((await Blog.findById(blog._id)).commentsCount).toBe(0)
    })
})

describe('likes and bookmarks', () => {
    it('toggles a like once per reader', async () => {
        await createBlog(authorToken)
        const blog = await Blog.findOne({})

        const liked = await api().post('/api/blog/like')
            .set('Authorization', `Bearer ${readerToken}`).send({blogId: blog._id})
        expect(liked.body).toMatchObject({success: true, liked: true, likes: 1})

        const unliked = await api().post('/api/blog/like')
            .set('Authorization', `Bearer ${readerToken}`).send({blogId: blog._id})
        expect(unliked.body).toMatchObject({success: true, liked: false, likes: 0})
    })

    it('keeps one reader bookmarks out of another reader list', async () => {
        await createBlog(authorToken, {title: 'Saved by the reader'})
        const blog = await Blog.findOne({})

        await api().post('/api/user/bookmark')
            .set('Authorization', `Bearer ${readerToken}`).send({blogId: blog._id})

        const mine = await api().get('/api/user/bookmarks')
            .set('Authorization', `Bearer ${readerToken}`)
        const theirs = await api().get('/api/user/bookmarks')
            .set('Authorization', `Bearer ${authorToken}`)

        expect(mine.body.blogs).toHaveLength(1)
        expect(mine.body.blogs[0].title).toBe('Saved by the reader')
        expect(theirs.body.blogs).toHaveLength(0)
    })
})
