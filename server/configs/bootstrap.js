import bcrypt from "bcryptjs";
import Blog from "../models/Blog.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import readingTime from "../utils/readingTime.js";

// Keeps a User document in step with the admin credentials in .env, so the
// admin can own blogs and have an author profile like anyone else.
const ensureAdminUser = async () => {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD?.trim();
    if(!email || !password) return null;

    let admin = await User.findOne({email}).select('+password');

    if(!admin){
        admin = await User.create({
            name: 'QuickBlog Editor',
            email,
            password: await bcrypt.hash(password, 10),
            role: 'admin',
            bio: 'Editor and curator at QuickBlog.',
        })
        return admin;
    }

    // The .env password stays the source of truth for the admin account.
    const unchanged = await bcrypt.compare(password, admin.password);
    if(!unchanged || admin.role !== 'admin'){
        admin.password = await bcrypt.hash(password, 10);
        admin.role = 'admin';
        await admin.save();
    }

    return admin;
}

// Additive only: fills in fields that did not exist before this release.
// Nothing is dropped and no existing value is overwritten.
const backfillBlogs = async (admin) => {
    if(admin){
        await Blog.updateMany({author: {$exists: false}}, {$set: {author: admin._id}})
        await Blog.updateMany({author: null}, {$set: {author: admin._id}})
    }

    await Blog.updateMany(
        {$or: [{views: {$exists: false}}, {views: null}]},
        {$set: {views: 0, uniqueViews: 0}}
    )
    await Blog.updateMany({likesCount: {$exists: false}}, {$set: {likesCount: 0}})

    // Reading time and comment counts are derived, so recompute whatever is missing.
    const pending = await Blog.find({
        $or: [{readingTime: {$exists: false}}, {readingTime: {$lte: 0}}, {commentsCount: {$exists: false}}],
    }).select('description')

    for (const blog of pending){
        const commentsCount = await Comment.countDocuments({blog: blog._id, isApproved: true})
        await Blog.updateOne(
            {_id: blog._id},
            {$set: {readingTime: readingTime(blog.description), commentsCount}}
        )
    }

    return pending.length;
}

const bootstrap = async () => {
    try {
        const admin = await ensureAdminUser();
        const updated = await backfillBlogs(admin);
        console.log(`Bootstrap complete (admin ready, ${updated} blog(s) backfilled)`)
    } catch (error) {
        console.log('Bootstrap failed:', error.message)
    }
}

export default bootstrap;
