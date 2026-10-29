import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url));

// The API's .env is the project's single source of configuration, so these
// scripts read it from there instead of asking for a second copy. An
// environment variable that is already set always wins.
const API_ENV_CANDIDATES = [
    resolve(here, '../server/.env'),
    resolve(here, '../Express API/.env'),
];

export const loadEnv = () => {
    if(process.env.MONGODB_URI) return null;

    for (const path of API_ENV_CANDIDATES){
        if(existsSync(path)){
            dotenv.config({path});
            if(process.env.MONGODB_URI) return path;
        }
    }
    return null;
}

// Read after loadEnv() rather than at module load, so a value in the API's
// .env is actually picked up. The API appends `/quickblog` to MONGODB_URI
// itself, so that is the name these scripts must match.
export const dbName = () => process.env.MONGODB_DB || 'quickblog';

// Collection names as Mongoose creates them, with the names the submission
// requirements use in brackets:
//   users      - accounts (users)
//   blogs      - articles (posts)
//   comments   - comments on an article (comments)
//   bookmarks  - saved articles (bookmarks)
//   views      - one row per article+reader, the analytics event store
//                (analytics events)
//   likes      - one row per article+reader
//   subscribers- newsletter addresses
export const COLLECTIONS = {
    users: 'users',
    posts: 'blogs',
    comments: 'comments',
    bookmarks: 'bookmarks',
    analyticsEvents: 'views',
    likes: 'likes',
    subscribers: 'subscribers',
};

// Opens a connection and hands it to `work`, closing it either way.
export const withDatabase = async (work) => {
    const envPath = loadEnv();
    const uri = process.env.MONGODB_URI;

    if(!uri || uri.includes('CHANGE_ME')){
        console.error(
            'MONGODB_URI is not set.\n' +
            'Either fill it in in the API .env (see Express API/.env.example)\n' +
            'or pass it inline:  MONGODB_URI="mongodb://127.0.0.1:27017" npm run db:schema'
        );
        process.exit(1);
    }

    if(envPath) console.log(`Configuration read from ${envPath}`);

    // The API connects to `${MONGODB_URI}/quickblog`, so the URI carries no
    // database name and the name is applied here instead.
    const client = new MongoClient(uri, {serverSelectionTimeoutMS: 10000});

    try {
        await client.connect();
        const name = dbName();
        const db = client.db(name);
        console.log(`Connected to database "${name}"`);
        return await work(db, client);
    } finally {
        await client.close();
    }
}

export default withDatabase;
