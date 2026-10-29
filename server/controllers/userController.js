import fs from "fs";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Blog from "../models/Blog.js";
import imagekit from "../configs/imageKit.js";
import { sanitizeText } from "../utils/sanitizeContent.js";
import { signToken } from "../configs/tokens.js";

// Lifetime comes from JWT_EXPIRES_IN, so it is configurable per deployment.
const issueToken = (user) => signToken({id: user._id, role: user.role})

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req, res) => {
    try {
        const name = sanitizeText(req.body.name || '');
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        if(name.length < 2 || name.length > 60){
            return res.json({success: false, message: "Name must be between 2 and 60 characters"})
        }
        if(!EMAIL_PATTERN.test(email)){
            return res.json({success: false, message: "Please enter a valid email address"})
        }
        if(password.length < 6){
            return res.json({success: false, message: "Password must be at least 6 characters"})
        }

        if(await User.findOne({email})){
            return res.json({success: false, message: "An account with this email already exists"})
        }

        const user = await User.create({name, email, password: await bcrypt.hash(password, 10)})

        res.json({success: true, token: issueToken(user), user: user.toPrivateProfile()})
    } catch (error) {
        // A racing duplicate still trips the unique index.
        if(error.code === 11000){
            return res.json({success: false, message: "An account with this email already exists"})
        }
        res.json({success: false, message: error.message})
    }
}

export const login = async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        const user = await User.findOne({email}).select('+password');
        // Same message either way, so the response does not reveal which accounts exist.
        if(!user || !(await bcrypt.compare(password, user.password))){
            return res.json({success: false, message: "Invalid email or password"})
        }

        res.json({success: true, token: issueToken(user), user: user.toPrivateProfile()})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const getMe = async (req, res) => {
    res.json({success: true, user: req.user.toPrivateProfile()})
}

export const updateProfile = async (req, res) => {
    try {
        const {name, bio} = req.body;

        if(name !== undefined){
            const clean = sanitizeText(name);
            if(clean.length < 2 || clean.length > 60){
                return res.json({success: false, message: "Name must be between 2 and 60 characters"})
            }
            req.user.name = clean;
        }

        if(bio !== undefined){
            const clean = sanitizeText(bio);
            if(clean.length > 400){
                return res.json({success: false, message: "Bio must be 400 characters or fewer"})
            }
            req.user.bio = clean;
        }

        // An avatar arrives as multipart; plain JSON updates skip this entirely.
        if(req.file){
            const upload = await imagekit.upload({
                file: fs.readFileSync(req.file.path),
                fileName: req.file.originalname,
                folder: "/avatars",
            })
            req.user.image = imagekit.url({
                path: upload.filePath,
                transformation: [{quality: 'auto'}, {format: 'webp'}, {width: '320'}, {height: '320'}, {crop: 'at_max'}],
            })
        }

        // req.user comes from the token, so a caller can only ever edit their own profile.
        await req.user.save();

        res.json({success: true, message: "Profile updated", user: req.user.toPrivateProfile()})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// Public author page: profile plus that author's published articles.
export const getAuthorProfile = async (req, res) => {
    try {
        const author = await User.findById(req.params.authorId);
        if(!author){
            return res.json({success: false, message: "Author not found"})
        }

        const blogs = await Blog.find({author: author._id, isPublished: true})
            .sort({createdAt: -1})
            .populate('author', 'name image');

        res.json({success: true, author: author.toPublicProfile(), blogs})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}
