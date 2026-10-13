import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Blog from '../models/Blog.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import Like from '../models/Like.js';
import View from '../models/View.js';
import Subscriber from '../models/Subscriber.js';

export const adminLogin = async (req, res)=>{
    try {
        const {email, password} = req.body;

        const envEmail = process.env.ADMIN_EMAIL?.trim();
        const envPassword = process.env.ADMIN_PASSWORD?.trim();

        // The .env pair stays the admin credential, exactly as before.
        if(String(email).trim() !== envEmail || String(password) !== envPassword){
            // An admin account created through the normal signup flow can sign in too.
            const user = await User.findOne({email: String(email).trim().toLowerCase(), role: 'admin'}).select('+password');
            if(!user || !(await bcrypt.compare(String(password), user.password))){
                return res.json({success: false, message: "Invalid Credentials"})
            }
            return res.json({
                success: true,
                token: jwt.sign({id: user._id, role: 'admin'}, process.env.JWT_SECRET, {expiresIn: '30d'}),
                user: user.toPrivateProfile(),
            })
        }

        const admin = await User.findOne({email: envEmail.toLowerCase()});
        if(!admin){
            return res.json({success: false, message: "Admin account is not ready yet, please restart the server"})
        }

        const token = jwt.sign({id: admin._id, role: 'admin'}, process.env.JWT_SECRET, {expiresIn: '30d'})
        res.json({success: true, token, user: admin.toPrivateProfile()})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const getAllBlogsAdmin = async (req, res) =>{
    try {
        const blogs = await Blog.find({}).sort({createdAt: -1}).populate('author', 'name image');
        res.json({success: true, blogs})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const getAllComments = async (req, res) =>{
    try {
        const comments = await Comment.find({}).populate("blog").sort({createdAt: -1})
        res.json({success: true, comments})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Recomputes the stored count from the approved comments, so the number on a
// blog always matches what readers can actually see.
const syncCommentCount = async (blogId) => {
    if(!blogId) return;
    const commentsCount = await Comment.countDocuments({blog: blogId, isApproved: true});
    await Blog.updateOne({_id: blogId}, {$set: {commentsCount}});
}

const DAYS = 14;

// Counts documents per day for the last two weeks, filling in the quiet days.
// Everything here stays in UTC, because that is what $dateToString groups by -
// mixing in a local midnight would push today's activity out of the window.
const dailySeries = async (Model, dateField, since) => {
    const rows = await Model.aggregate([
        {$match: {[dateField]: {$gte: since}}},
        {$group: {
            _id: {$dateToString: {format: '%Y-%m-%d', date: `$${dateField}`}},
            count: {$sum: 1},
        }},
    ])

    const byDay = Object.fromEntries(rows.map((row) => [row._id, row.count]));

    return Array.from({length: DAYS}, (_, index) => {
        const day = new Date(since);
        day.setUTCDate(day.getUTCDate() + index);
        const key = day.toISOString().slice(0, 10);
        return {date: key, count: byDay[key] || 0};
    })
}

export const getDashboard = async (req, res) =>{
    try {
        const since = new Date();
        since.setUTCHours(0, 0, 0, 0);
        since.setUTCDate(since.getUTCDate() - (DAYS - 1));

        const [
            blogs, drafts, published, comments, pendingComments,
            likes, subscribers, recentBlogs, totals,
            topViewed, topEngaged, recentComments, viewSeries, likeSeries, commentSeries,
        ] = await Promise.all([
            Blog.countDocuments(),
            Blog.countDocuments({isPublished: false}),
            Blog.countDocuments({isPublished: true}),
            Comment.countDocuments(),
            Comment.countDocuments({isApproved: false}),
            Like.countDocuments(),
            Subscriber.countDocuments(),
            Blog.find({}).sort({createdAt: -1}).limit(5),

            // Total and unique views live on the blogs, so one pass sums both.
            Blog.aggregate([
                {$group: {
                    _id: null,
                    views: {$sum: {$ifNull: ['$views', 0]}},
                    uniqueViews: {$sum: {$ifNull: ['$uniqueViews', 0]}},
                }},
            ]),

            Blog.find({isPublished: true}).sort({views: -1, createdAt: -1}).limit(5)
                .select('title views uniqueViews likesCount commentsCount createdAt'),

            Blog.aggregate([
                {$match: {isPublished: true}},
                {$addFields: {engagement: {$add: [
                    {$multiply: [{$ifNull: ['$likesCount', 0]}, 3]},
                    {$multiply: [{$ifNull: ['$commentsCount', 0]}, 4]},
                ]}}},
                {$match: {engagement: {$gt: 0}}},
                {$sort: {engagement: -1, createdAt: -1}},
                {$limit: 5},
                {$project: {title: 1, views: 1, likesCount: 1, commentsCount: 1, engagement: 1}},
            ]),

            Comment.find({}).sort({createdAt: -1}).limit(6).populate('blog', 'title'),

            dailySeries(View, 'createdAt', since),
            dailySeries(Like, 'createdAt', since),
            dailySeries(Comment, 'createdAt', since),
        ])

        const dashboardData = {
            // Kept for the existing cards.
            blogs, comments, drafts, recentBlogs,

            published,
            pendingComments,
            likes,
            subscribers,
            views: totals[0]?.views || 0,
            uniqueViews: totals[0]?.uniqueViews || 0,

            topViewed,
            topEngaged,
            recentComments,
            series: {
                days: viewSeries.map((point) => point.date),
                uniqueViews: viewSeries.map((point) => point.count),
                likes: likeSeries.map((point) => point.count),
                comments: commentSeries.map((point) => point.count),
            },
        }
        res.json({success: true, dashboardData})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const deleteCommentById = async (req, res) =>{
    try {
        const {id} = req.body;
        const comment = await Comment.findByIdAndDelete(id);
        await syncCommentCount(comment?.blog);
        res.json({success: true, message:"Comment deleted successfully" })
    } catch (error) {
       res.json({success: false, message: error.message})
    }
}

export const approveCommentById = async (req, res) =>{
    try {
        const {id} = req.body;
        const comment = await Comment.findByIdAndUpdate(id, {isApproved: true});
        await syncCommentCount(comment?.blog);
        res.json({success: true, message:"Comment approved successfully" })
    } catch (error) {
       res.json({success: false, message: error.message})
    }
}
