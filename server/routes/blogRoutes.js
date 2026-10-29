import express from "express";
import { addBlog, addComment, deleteBlogById, generateContent, getAllBlogs, getBlogById, getBlogComments, getTrendingBlogs, subscribe, togglePublish, updateBlog } from "../controllers/blogController.js";
import { toggleLike } from "../controllers/engagementController.js";
import upload from "../middleware/multer.js";
import { authRequired, optionalAuth, requireRole } from "../middleware/auth.js";

const blogRouter = express.Router();

// Writing is the CMS: an author may publish their own work, an admin anything.
const cmsRole = requireRole('admin', 'author');

// Public reads. Fetching comments is a GET so that reading an article needs no
// token while every state-changing route below can insist on one.
blogRouter.get('/all', getAllBlogs);
blogRouter.get('/trending', getTrendingBlogs);
blogRouter.get('/comments/:blogId', getBlogComments);

// Signed-in readers. Every write below this line carries JWT middleware.
blogRouter.post('/like', authRequired, toggleLike);
blogRouter.post('/add-comment', authRequired, addComment);
blogRouter.post('/subscribe', authRequired, subscribe);

// Authors and admins. Ownership is enforced inside each controller, so an
// author can only ever touch their own article.
blogRouter.post("/add", cmsRole, upload.single('image'), addBlog);
blogRouter.post('/update', cmsRole, upload.single('image'), updateBlog);
blogRouter.post('/delete', cmsRole, deleteBlogById);
blogRouter.post('/toggle-publish', cmsRole, togglePublish);
blogRouter.post('/generate', cmsRole, generateContent);

// Keep last: this would otherwise swallow the named routes above.
blogRouter.get('/:blogId', optionalAuth, getBlogById);

export default blogRouter;
