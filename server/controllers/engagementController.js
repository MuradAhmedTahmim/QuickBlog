import mongoose from "mongoose";
import Blog from "../models/Blog.js";
import Like from "../models/Like.js";
import Bookmark from "../models/Bookmark.js";
import View from "../models/View.js";

// A refresh inside this window is the same visit, not a new one.
const VIEW_DEDUPE_HOURS = 6;

const publishedBlog = async (id) => {
    if(!mongoose.isValidObjectId(id)) return null;
    return await Blog.findOne({_id: id, isPublished: true}).select('_id');
}

/* ----------------------------- likes ----------------------------- */

export const toggleLike = async (req, res) => {
    try {
        const {blogId} = req.body;
        const blog = await publishedBlog(blogId);
        if(!blog){
            return res.json({success: false, message: "Blog not found"})
        }

        // The unique index is what actually prevents a double like; deleting
        // first tells us which way the toggle should go.
        const removed = await Like.findOneAndDelete({blog: blog._id, user: req.user._id});

        if(!removed){
            try {
                await Like.create({blog: blog._id, user: req.user._id})
            } catch (error) {
                // A concurrent duplicate request lands here - treat it as already liked.
                if(error.code !== 11000) throw error;
            }
        }

        const likes = await Like.countDocuments({blog: blog._id});
        await Blog.updateOne({_id: blog._id}, {$set: {likesCount: likes}});

        res.json({success: true, liked: !removed, likes})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

/* --------------------------- bookmarks --------------------------- */

export const toggleBookmark = async (req, res) => {
    try {
        const {blogId} = req.body;
        const blog = await publishedBlog(blogId);
        if(!blog){
            return res.json({success: false, message: "Blog not found"})
        }

        const removed = await Bookmark.findOneAndDelete({blog: blog._id, user: req.user._id});

        if(!removed){
            try {
                await Bookmark.create({blog: blog._id, user: req.user._id})
            } catch (error) {
                if(error.code !== 11000) throw error;
            }
        }

        res.json({
            success: true,
            bookmarked: !removed,
            message: removed ? "Removed from saved" : "Saved for later",
        })
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const getBookmarks = async (req, res) => {
    try {
        // Scoped to req.user, so one reader can never list another's saved posts.
        const bookmarks = await Bookmark.find({user: req.user._id})
            .sort({createdAt: -1})
            .populate({
                path: 'blog',
                populate: {path: 'author', select: 'name image'},
            });

        // Skip anything that has since been deleted or unpublished.
        const blogs = bookmarks
            .map((bookmark) => bookmark.blog)
            .filter((blog) => blog && blog.isPublished);

        res.json({success: true, blogs})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

/* ----------------------------- views ----------------------------- */

// Signed-in readers are keyed by account; anonymous ones by the id their browser
// keeps, so the same person refreshing does not inflate the numbers.
export const viewerKeyFor = (req) => {
    if(req.user) return `u:${req.user._id}`;
    const visitorId = String(req.headers['x-visitor-id'] || '').slice(0, 64);
    return /^[a-zA-Z0-9-]{8,64}$/.test(visitorId) ? `v:${visitorId}` : null;
}

const NO_CHANGE = {views: 0, uniqueViews: 0};

// Returns how much the counters moved, so the caller can report fresh numbers
// without reading the blog back.
export const recordView = async (blogId, req) => {
    const viewerKey = viewerKeyFor(req);
    if(!viewerKey) return NO_CHANGE;

    const cutoff = new Date(Date.now() - VIEW_DEDUPE_HOURS * 60 * 60 * 1000);

    // Upserting first makes two simultaneous requests resolve to one document
    // instead of racing each other into a duplicate key error.
    const result = await View.updateOne(
        {blog: blogId, viewerKey},
        {$setOnInsert: {blog: blogId, viewerKey, count: 1, lastViewedAt: new Date()}},
        {upsert: true}
    )

    if(result.upsertedCount){
        await Blog.updateOne({_id: blogId}, {$inc: {views: 1, uniqueViews: 1}})
        return {views: 1, uniqueViews: 1};
    }

    // Only one of the racing requests gets the document past the cutoff,
    // so a refresh can never be counted twice.
    const revisited = await View.findOneAndUpdate(
        {blog: blogId, viewerKey, lastViewedAt: {$lt: cutoff}},
        {$inc: {count: 1}, $set: {lastViewedAt: new Date()}}
    )

    if(revisited){
        await Blog.updateOne({_id: blogId}, {$inc: {views: 1}})
        return {views: 1, uniqueViews: 0};
    }

    return NO_CHANGE;
}

/* --------------- the viewer's own state for a blog list --------------- */

// One round trip for "did I like / save this", instead of one request per card.
export const getMyEngagement = async (req, res) => {
    try {
        const [likes, bookmarks] = await Promise.all([
            Like.find({user: req.user._id}).select('blog'),
            Bookmark.find({user: req.user._id}).select('blog'),
        ]);

        res.json({
            success: true,
            likedBlogs: likes.map((like) => String(like.blog)),
            bookmarkedBlogs: bookmarks.map((bookmark) => String(bookmark.blog)),
        })
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}
