import jwt from 'jsonwebtoken'

// One place decides how long a login lasts, so the admin login and the reader
// login can never drift apart. JWT_EXPIRES_IN takes any zeit/ms string ('30d',
// '12h', '45m'); the default is the 30 days this API has always used.
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN?.trim() || '30d';

export const signToken = (payload) =>
    jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: JWT_EXPIRES_IN})

export default signToken;
