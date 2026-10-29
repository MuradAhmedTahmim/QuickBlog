import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { signToken } from '../configs/tokens.js'

export const PASSWORD = 'correct-horse-battery';

// Creates an account directly, bypassing the register endpoint, so a test can
// start from "a signed-in author exists" without asserting on registration.
export const makeUser = async ({
    name = 'Test Person',
    email = 'person@test.local',
    role = 'user',
    password = PASSWORD,
} = {}) => {
    const user = await User.create({
        name,
        email,
        role,
        password: await bcrypt.hash(password, 10),
    })
    return {user, token: signToken({id: user._id, role: user.role})};
}

// A 1x1 PNG, so multer has a real file to write and the upload path is
// exercised rather than skipped.
export const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64'
);

export const blogPayload = (overrides = {}) => JSON.stringify({
    title: 'A test article',
    subTitle: 'With a subtitle',
    description: '<p>Body text that is comfortably long enough to be a real article body.</p>',
    category: 'Technology',
    isPublished: true,
    ...overrides,
});
