import { MongoMemoryServer } from 'mongodb-memory-server-core'
import mongoose from 'mongoose'
import { beforeAll, afterAll, afterEach } from 'vitest'

// Test configuration, set before anything imports the app. dotenv never
// overwrites a variable that is already set, so these win over a real .env and
// the suite cannot pick up a developer's live credentials.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-not-used-anywhere-real';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'admin-test-password';
process.env.CLIENT_URL = '';
process.env.IMAGEKIT_PUBLIC_KEY = 'public_test';
process.env.IMAGEKIT_PRIVATE_KEY = 'private_test';
process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';
process.env.GEMINI_API_KEY = 'test-key';

// Every test file gets its own throwaway MongoDB, started in memory. Nothing
// here ever touches a real database, so the suite is safe to run anywhere.
let mongod;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), {dbName: 'quickblog-test'});
}, 120_000)

// A clean slate between tests, so order never matters.
afterEach(async () => {
    const {collections} = mongoose.connection;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
})

afterAll(async () => {
    await mongoose.disconnect();
    await mongod?.stop();
})
