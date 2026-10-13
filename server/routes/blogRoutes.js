import express from "express";
import { addBlog, addComment, deleteBlogById, generateContent, getAllBlogs, getBlogById, getBlogComments, getTrendingBlogs, subscribe, togglePublish, updateBlog } from "../controllers/blogController.js";
import { toggleLike } from "../controllers/engagementController.js";
import upload from "../middleware/multer.js";
import { adminOnly, authRequired, optionalAuth } from "../middleware/auth.js";

const blogRouter = express.Router();

// Public
blogRouter.get('/all', getAllBlogs);
blogRouter.get('/trending', getTrendingBlogs);
blogRouter.post('/add-comment', addComment);
blogRouter.post('/comments', getBlogComments);
blogRouter.post('/subscribe', subscribe);

// Signed-in readers
blogRouter.post('/like', authRequired, toggleLike);

// Authors and admins
// Ownership is enforced inside the controller, so this only needs a signed-in user.
blogRouter.post('/update', authRequired, upload.single('image'), updateBlog);

// Admin only
blogRouter.post("/add", adminOnly, upload.single('image'), addBlog);
blogRouter.post('/delete', adminOnly, deleteBlogById);
blogRouter.post('/toggle-publish', adminOnly, togglePublish);
blogRouter.post('/generate', adminOnly, generateContent);

// Keep last: this would otherwise swallow the named routes above.
blogRouter.get('/:blogId', optionalAuth, getBlogById);

export default blogRouter;
