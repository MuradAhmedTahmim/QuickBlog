import express from "express";
import { adminLogin, approveCommentById, deleteCommentById, getAllBlogsAdmin, getAllComments, getDashboard } from "../controllers/adminController.js";
import { adminOnly, requireRole } from "../middleware/auth.js";

const adminRouter = express.Router();

// The CMS is open to authors as well as admins; each controller narrows what an
// author sees to their own articles.
const cmsRole = requireRole('admin', 'author');

// Issues the token, so it cannot require one.
adminRouter.post("/login", adminLogin);

adminRouter.get("/blogs", cmsRole, getAllBlogsAdmin);
adminRouter.get("/dashboard", cmsRole, getDashboard);

// Moderation stays with admins.
adminRouter.get("/comments", adminOnly, getAllComments);
adminRouter.post("/delete-comment", adminOnly, deleteCommentById);
adminRouter.post("/approve-comment", adminOnly, approveCommentById);

export default adminRouter;
