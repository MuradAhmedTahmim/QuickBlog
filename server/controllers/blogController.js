import fs from 'fs'
import mongoose from 'mongoose';
import imagekit from '../configs/imageKit.js';
import Blog from '../models/Blog.js';
import Comment from '../models/Comment.js';
import Subscriber from '../models/Subscriber.js';
import main from '../configs/gemini.js';
import sanitizeContent, { sanitizeText } from '../utils/sanitizeContent.js';
import { uniqueSlug } from '../utils/slug.js';
import { recordView } from './engagementController.js';

const AUTHOR_FIELDS = 'name image bio';

const LANGUAGES = ['en', 'bn', 'both'];

// Articles marked for one language stay hidden from the other, while 'both'
// always shows. An unknown or missing value means "no filter", so the full
// list is still what an unfiltered request gets.
//
// The field is called contentLanguage rather than language because MongoDB
// reads a field named `language` as the text index's language override and
// rejects any value that is not a text-search language.
const languageFilter = (requested) =>
    requested === 'en' || requested === 'bn'
        ? {contentLanguage: {$in: [requested, 'both']}}
        : {};

const readLanguage = (value) => (LANGUAGES.includes(value) ? value : 'both');

// Slugs must stay unique across the collection; `ignoreId` lets an edit keep
// its own slug instead of colliding with itself.
const slugTaken = (ignoreId) => async (candidate) => {
    const query = {slug: candidate};
    if(ignoreId) query._id = {$ne: ignoreId};
    return Boolean(await Blog.exists(query));
}

export const addBlog = async (req, res)=>{
    try {
        const {title, subTitle, description, category, isPublished, contentLanguage} = JSON.parse(req.body.blog);
        const imageFile = req.file;

        // Check if all fields are present
        if(!title || !description || !category || !imageFile){
            return res.json({success: false, message: "Missing required fields" })
        }

        const image = await uploadThumbnail(imageFile);
        const cleanTitle = sanitizeText(title);

        // Saved through create() so the reading-time hook runs.
        await Blog.create({
            title: cleanTitle,
            subTitle: sanitizeText(subTitle || ''),
            description: sanitizeContent(description),
            category: sanitizeText(category),
            contentLanguage: readLanguage(contentLanguage),
            slug: await uniqueSlug(cleanTitle, slugTaken()),
            image,
            isPublished,
            author: req.user._id,
        })

        res.json({success: true, message: "Blog added successfully"})

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Shared by addBlog and updateBlog so both store the same optimized URL.
const uploadThumbnail = async (imageFile) => {
    const response = await imagekit.upload({
        file: fs.readFileSync(imageFile.path),
        fileName: imageFile.originalname,
        folder: "/blogs"
    })

    return imagekit.url({
        path: response.filePath,
        transformation: [
            {quality: 'auto'},
            {format: 'webp'},
            {width: '1280'}
        ]
    });
}

export const updateBlog = async (req, res)=>{
    try {
        const {id, title, subTitle, description, category, isPublished, contentLanguage} = JSON.parse(req.body.blog);

        if(!mongoose.isValidObjectId(id)){
            return res.json({success: false, message: "Blog not found"})
        }

        const blog = await Blog.findById(id);
        if(!blog){
            return res.json({success: false, message: "Blog not found"})
        }

        // Ownership is checked here, on the server - an author may only edit
        // their own work, while an admin may edit anything.
        const isOwner = blog.author && String(blog.author) === String(req.user._id);
        if(!isOwner && req.user.role !== 'admin'){
            return res.status(403).json({success: false, message: "You can only edit your own blogs"})
        }

        if(!title || !description || !category){
            return res.json({success: false, message: "Missing required fields"})
        }

        blog.title = sanitizeText(title);
        blog.subTitle = sanitizeText(subTitle || '');
        blog.description = sanitizeContent(description);
        blog.category = sanitizeText(category);
        if(isPublished !== undefined) blog.isPublished = isPublished;
        if(contentLanguage !== undefined) blog.contentLanguage = readLanguage(contentLanguage);

        // A published article keeps the slug its readers already have. Only a
        // draft, or a post that never got one, picks up a new slug on retitle.
        if(!blog.slug || !blog.isPublished){
            blog.slug = await uniqueSlug(blog.title, slugTaken(blog._id));
        }

        // The thumbnail is optional on an edit; without a new file the old one stays.
        if(req.file){
            blog.image = await uploadThumbnail(req.file);
        }

        // Saved through the document so the reading-time hook recalculates.
        await blog.save();

        res.json({success: true, message: "Blog updated successfully"})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const getAllBlogs = async (req, res)=>{
    try {
        // ?lang=en|bn narrows the list to what that reader can read. The client
        // sends whichever language the interface is in, and falls back to the
        // unfiltered list when a language has nothing published yet.
        const filter = {isPublished: true, ...languageFilter(req.query.lang)};

        const blogs = await Blog.find(filter)
            .sort({createdAt: -1})
            .populate('author', AUTHOR_FIELDS)
        res.json({success: true, blogs})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const getBlogById = async (req, res) =>{
    try {
        const { blogId } = req.params;

        // Accepts either the id the client already holds or the readable slug,
        // so a shared /blog/<slug> link resolves to the same article.
        const blog = mongoose.isValidObjectId(blogId)
            ? await Blog.findById(blogId).populate('author', AUTHOR_FIELDS)
            : await Blog.findOne({slug: String(blogId).toLowerCase()}).populate('author', AUTHOR_FIELDS)
        if(!blog){
            return res.json({ success: false, message: "Blog not found" });
        }
        // Drafts stay visible to the admin and to the author who wrote them,
        // so an unpublished post can still be opened in the editor.
        const canSeeDraft = req.user && (
            req.user.role === 'admin' ||
            (blog.author && String(blog.author._id || blog.author) === String(req.user._id))
        );
        if(!blog.isPublished && !canSeeDraft){
            return res.json({ success: false, message: "Blog not found" });
        }

        if(blog.isPublished){
            // Awaited so the response carries the count this visit produced.
            // Counting must never break the page, so failures are swallowed.
            const delta = await recordView(blog._id, req).catch(() => null)
            if(delta){
                blog.views += delta.views;
                blog.uniqueViews += delta.uniqueViews;
            }
        }

        res.json({success: true, blog})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Engagement weighted against age, so a strong new post can outrank an old one.
export const getTrendingBlogs = async (req, res) =>{
    try {
        const limit = Math.min(Number(req.query.limit) || 5, 20);

        const blogs = await Blog.aggregate([
            {$match: {isPublished: true, ...languageFilter(req.query.lang)}},
            {$addFields: {
                ageHours: {$divide: [{$subtract: ['$$NOW', '$createdAt']}, 1000 * 60 * 60]},
                engagement: {$add: [
                    {$ifNull: ['$views', 0]},
                    {$multiply: [{$ifNull: ['$likesCount', 0]}, 3]},
                    {$multiply: [{$ifNull: ['$commentsCount', 0]}, 4]},
                ]},
            }},
            {$addFields: {
                score: {$divide: [
                    {$add: ['$engagement', 1]},
                    {$pow: [{$add: ['$ageHours', 2]}, 0.8]},
                ]},
            }},
            {$sort: {score: -1, createdAt: -1}},
            {$limit: limit},
            {$lookup: {
                from: 'users', localField: 'author', foreignField: '_id', as: 'author',
                pipeline: [{$project: {name: 1, image: 1, bio: 1}}],
            }},
            {$unwind: {path: '$author', preserveNullAndEmptyArrays: true}},
            {$project: {description: 0, score: 0, ageHours: 0, engagement: 0}},
        ])

        res.json({success: true, blogs})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// An author owns their own articles; an admin owns everything. Returns the
// article when the caller may change it, and null when they may not.
const ownedBlog = async (id, user) => {
    if(!mongoose.isValidObjectId(id)) return null;

    const blog = await Blog.findById(id);
    if(!blog) return null;

    const isOwner = blog.author && String(blog.author) === String(user._id);
    return isOwner || user.role === 'admin' ? blog : null;
}

export const deleteBlogById = async (req, res) =>{
    try {
        const { id } = req.body;

        const blog = await ownedBlog(id, req.user);
        if(!blog){
            return res.status(403).json({success: false, message: 'You can only delete your own blogs'})
        }

        await Blog.findByIdAndDelete(blog._id);

        // Delete all comments associated with the blog
        await Comment.deleteMany({blog: blog._id});

        res.json({success: true, message: 'Blog deleted successfully'})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}


export const togglePublish = async (req, res) =>{
    try {
        const { id } = req.body;

        const blog = await ownedBlog(id, req.user);
        if(!blog){
            return res.status(403).json({success: false, message: 'You can only publish your own blogs'})
        }

        blog.isPublished = !blog.isPublished;
        await blog.save();
        res.json({success: true, message: 'Blog status updated'})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}


export const addComment = async (req, res) =>{
    try {
        const {blog, content } = req.body;

        // The display name comes from the signed-in account, so a commenter can
        // no longer post under someone else's name.
        const cleanName = sanitizeText(req.user.name || '');
        const cleanContent = sanitizeText(content || '');

        if(!mongoose.isValidObjectId(blog)){
            return res.json({success: false, message: 'Blog not found'})
        }
        if(cleanName.length < 2 || cleanName.length > 60){
            return res.json({success: false, message: 'Please add a name to your profile first'})
        }
        if(cleanContent.length < 2 || cleanContent.length > 1000){
            return res.json({success: false, message: 'Comment must be between 2 and 1000 characters'})
        }
        if(!await Blog.exists({_id: blog, isPublished: true})){
            return res.json({success: false, message: 'Blog not found'})
        }

        await Comment.create({blog, user: req.user._id, name: cleanName, content: cleanContent});
        res.json({success: true, message: 'Comment added for review'})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const getBlogComments = async (req, res) =>{
    try {
        const blogId = req.params.blogId || req.body.blogId;
        if(!mongoose.isValidObjectId(blogId)){
            return res.json({success: true, comments: []})
        }
        const comments = await Comment.find({blog: blogId, isApproved: true}).sort({createdAt: -1});
        res.json({success: true, comments})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const generateContent = async (req, res)=>{
    try {
        const {prompt} = req.body;
        if(!prompt || !String(prompt).trim()){
            return res.json({success: false, message: 'Please enter a title first'})
        }
        const content = await main(prompt + ' Generate a blog content for this topic in simple text format')
        res.json({success: true, content})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const subscribe = async (req, res)=>{
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
            return res.json({success: false, message: 'Please enter a valid email address'})
        }

        // Re-subscribing is not an error from the reader's point of view.
        await Subscriber.updateOne({email}, {$setOnInsert: {email}}, {upsert: true});

        res.json({success: true, message: 'Subscribed! Watch your inbox.'})
    } catch (error) {
        if(error.code === 11000){
            return res.json({success: true, message: 'You are already subscribed.'})
        }
        res.json({success: false, message: error.message})
    }
}
