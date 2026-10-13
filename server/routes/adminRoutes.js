import express from "express";
import { adminLogin, approveCommentById, deleteCommentById, getAllBlogsAdmin, getAllComments, getDashboard } from "../controllers/adminController.js";
import { adminOnly } from "../middleware/auth.js";

const adminRouter = express.Router();

adminRouter.post("/login", adminLogin);
adminRouter.get("/comments", adminOnly, getAllComments);
adminRouter.get("/blogs", adminOnly, getAllBlogsAdmin);
adminRouter.post("/delete-comment", adminOnly, deleteCommentById);
adminRouter.post("/approve-comment", adminOnly, approveCommentById);
adminRouter.get("/dashboard", adminOnly, getDashboard);

export default adminRouter;
