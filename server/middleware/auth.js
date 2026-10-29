import jwt from "jsonwebtoken";
import User from "../models/User.js";

const readToken = (req) => {
    const header = req.headers.authorization || '';
    return header.startsWith('Bearer ') ? header.slice(7) : header;
}

// Resolves the caller from the token, or null when there is no usable one.
// Tokens issued before user accounts existed only carry the admin email, so
// those keep working and are still treated as the admin.
const resolveUser = async (req) => {
    const token = readToken(req);
    if(!token) return null;

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
        return null;
    }

    if(payload.id){
        return await User.findById(payload.id);
    }

    if(payload.email && payload.email === process.env.ADMIN_EMAIL){
        return await User.findOne({email: String(payload.email).toLowerCase()});
    }

    return null;
}

// Attaches req.user when a valid token is present, but never blocks the request.
export const optionalAuth = async (req, res, next) => {
    try {
        req.user = await resolveUser(req);
    } catch {
        req.user = null;
    }
    next();
}

export const authRequired = async (req, res, next) => {
    try {
        const user = await resolveUser(req);
        if(!user){
            return res.status(401).json({success: false, message: "Please sign in to continue"})
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({success: false, message: "Invalid token"})
    }
}

// Requires a signed-in user whose role is one of `roles`. Used by the CMS and
// publishing routes, which admins and authors may both reach while a plain
// reader may not. Ownership, where it matters, is still checked per document in
// the controller - this only gates the route.
export const requireRole = (...roles) => async (req, res, next) => {
    try {
        const user = await resolveUser(req);
        if(!user){
            return res.status(401).json({success: false, message: "Please sign in to continue"})
        }
        if(!roles.includes(user.role)){
            return res.status(403).json({success: false, message: "You do not have access to this action"})
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(403).json({success: false, message: "You do not have access to this action"})
    }
}

export const adminOnly = async (req, res, next) => {
    try {
        const user = await resolveUser(req);
        if(!user || user.role !== 'admin'){
            return res.status(403).json({success: false, message: "Admin access required"})
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(403).json({success: false, message: "Admin access required"})
    }
}

// Existing routes imported the default export, which guarded admin actions.
export default adminOnly;
