import fs from 'fs'
import mongoose from 'mongoose';
import imagekit from '../configs/imageKit.js';
import Blog from '../models/Blog.js';
import Comment from '../models/Comment.js';
import Subscriber from '../models/Subscriber.js';
import main from '../configs/gemini.js';
import sanitizeContent, { sanitizeText } from '../utils/sanitizeContent.js';
import { recordView } from './engagementController.js';

const AUTHOR_FIELDS = 'name image bio';

export const addBlog = async (req, res)=>{
    try {
        const {title, subTitle, description, category, isPublished} = JSON.parse(req.body.blog);
        const imageFile = req.file;

        // Check if all fields are present
        if(!title || !description || !category || !imageFile){
            return res.json({success: false, message: "Missing required fields" })
        }

        const image = await uploadThumbnail(imageFile);

        // Saved through create() so the reading-time hook runs.
        await Blog.create({
            title: sanitizeText(title),
            subTitle: sanitizeText(subTitle || ''),
            description: sanitizeContent(description),
            category: sanitizeText(category),
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
        const {id, title, subTitle, description, category, isPublished} = JSON.parse(req.body.blog);

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
        const blogs = await Blog.find({isPublished: true})
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
        if(!mongoose.isValidObjectId(blogId)){
            return res.json({ success: false, message: "Blog not found" });
        }

        const blog = await Blog.findById(blogId).populate('author', AUTHOR_FIELDS)
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
            {$match: {isPublished: true}},
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

export const deleteBlogById = async (req, res) =>{
    try {
        const { id } = req.body;
        await Blog.findByIdAndDelete(id);

        // Delete all comments associated with the blog
        await Comment.deleteMany({blog: id});

        res.json({success: true, message: 'Blog deleted successfully'})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}


export const togglePublish = async (req, res) =>{
    try {
        const { id } = req.body;
        const blog = await Blog.findById(id);
        if(!blog){
            return res.json({success: false, message: 'Blog not found'})
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
        const {blog, name, content } = req.body;

        const cleanName = sanitizeText(name || '');
        const cleanContent = sanitizeText(content || '');

        if(!mongoose.isValidObjectId(blog)){
            return res.json({success: false, message: 'Blog not found'})
        }
        if(cleanName.length < 2 || cleanName.length > 60){
            return res.json({success: false, message: 'Please enter a name between 2 and 60 characters'})
        }
        if(cleanContent.length < 2 || cleanContent.length > 1000){
            return res.json({success: false, message: 'Comment must be between 2 and 1000 characters'})
        }
        if(!await Blog.exists({_id: blog, isPublished: true})){
            return res.json({success: false, message: 'Blog not found'})
        }

        await Comment.create({blog, name: cleanName, content: cleanContent});
        res.json({success: true, message: 'Comment added for review'})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const getBlogComments = async (req, res) =>{
    try {
        const {blogId } = req.body;
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
