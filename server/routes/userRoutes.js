import express from "express";
import { getAuthorProfile, getMe, login, register, updateProfile } from "../controllers/userController.js";
import { getBookmarks, getMyEngagement, toggleBookmark } from "../controllers/engagementController.js";
import upload from "../middleware/multer.js";
import { authRequired } from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post('/register', register);
userRouter.post('/login', login);
userRouter.get('/author/:authorId', getAuthorProfile);

userRouter.get('/me', authRequired, getMe);
userRouter.post('/profile', authRequired, upload.single('image'), updateProfile);
userRouter.get('/engagement', authRequired, getMyEngagement);
userRouter.get('/bookmarks', authRequired, getBookmarks);
userRouter.post('/bookmark', authRequired, toggleBookmark);

export default userRouter;
