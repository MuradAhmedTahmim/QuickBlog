/**
 * QuickBlog - MongoDB schema
 *
 * MongoDB has no SQL DDL, so this script is the equivalent: it creates every
 * collection the API uses, attaches a JSON Schema validator to each, and
 * creates the indexes the application queries rely on.
 *
 * It is idempotent and non-destructive. Run it against an empty database to
 * create everything, or against a database already carrying data to bring it up
 * to date: existing collections are modified in place, never dropped, and no
 * document is read, written or deleted.
 *
 *   npm install          # once, in the project root
 *   npm run db:schema
 *
 * Validators are installed at validationLevel "moderate", which applies them to
 * inserts and to updates of documents that already satisfy them, and leaves any
 * older document that does not alone. Set SCHEMA_VALIDATION_ACTION=warn to log
 * violations instead of rejecting them.
 */

import { COLLECTIONS, withDatabase } from './connect.js'

const objectId = (description) => ({bsonType: 'objectId', description});
const str = (description, extra = {}) => ({bsonType: 'string', description, ...extra});
const int = (description) => ({bsonType: ['int', 'long', 'double'], description});
const bool = (description) => ({bsonType: 'bool', description});
const date = (description) => ({bsonType: 'date', description});

const VALIDATION_ACTION = process.env.SCHEMA_VALIDATION_ACTION === 'warn' ? 'warn' : 'error';

/**
 * One entry per collection: the validator to attach and the indexes to create.
 * `additionalProperties` is left at its default (true) everywhere, so a field
 * added by a future release cannot be rejected by an older validator.
 */
const SCHEMA = [
    {
        name: COLLECTIONS.users,
        comment: 'Accounts: readers, authors and admins.',
        validator: {
            bsonType: 'object',
            required: ['name', 'email', 'password'],
            properties: {
                name: str('Display name', {minLength: 1, maxLength: 60}),
                email: str('Lower-cased, unique across the collection'),
                password: str('bcrypt hash - never a plain password'),
                role: {
                    bsonType: 'string',
                    enum: ['user', 'author', 'admin'],
                    description: 'user = reader, author = writes own posts, admin = full CMS',
                },
                bio: str('Short profile text', {maxLength: 400}),
                image: str('Avatar URL on ImageKit'),
                createdAt: date('Set by Mongoose timestamps'),
                updatedAt: date('Set by Mongoose timestamps'),
            },
        },
        indexes: [
            // Required index: unique email.
            {key: {email: 1}, options: {name: 'email_unique', unique: true}},
            {key: {role: 1}, options: {name: 'role'}},
        ],
    },

    {
        name: COLLECTIONS.posts,
        comment: 'Articles (the "posts" collection in the requirements).',
        validator: {
            bsonType: 'object',
            required: ['title', 'description', 'category', 'image', 'isPublished'],
            properties: {
                title: str('Headline', {minLength: 1}),
                subTitle: str('One-line standfirst'),
                description: str('Sanitised article HTML'),
                category: str('Technology, Startup, Lifestyle, Finance, ...'),
                image: str('Thumbnail URL on ImageKit'),
                isPublished: bool('false = draft, true = live'),
                author: objectId('References users._id'),
                slug: str('URL-safe form of the title, unique where present'),
                // Named contentLanguage, not language: MongoDB reads a field
                // called `language` as the text index's language override.
                contentLanguage: {
                    bsonType: 'string',
                    enum: ['en', 'bn', 'both'],
                    description: 'Which interface language this article is shown in',
                },
                views: int('Total views, including repeat visits'),
                uniqueViews: int('Distinct readers'),
                likesCount: int('Denormalised count of the likes collection'),
                commentsCount: int('Denormalised count of approved comments'),
                readingTime: int('Minutes, derived from the body'),
                createdAt: date('Set by Mongoose timestamps'),
                updatedAt: date('Set by Mongoose timestamps'),
            },
        },
        indexes: [
            // Required index: unique post slug. Partial, so articles created
            // before the field existed do not all collide on a missing value.
            {
                key: {slug: 1},
                options: {
                    name: 'slug_unique',
                    unique: true,
                    partialFilterExpression: {slug: {$type: 'string'}},
                },
            },
            // Required index: post author and status.
            {key: {author: 1, isPublished: 1}, options: {name: 'author_status'}},

            // Serving the public article list, the category filter and the
            // bilingual filter.
            {key: {isPublished: 1, createdAt: -1}, options: {name: 'status_newest'}},
            {key: {isPublished: 1, category: 1}, options: {name: 'status_category'}},
            {key: {isPublished: 1, contentLanguage: 1, createdAt: -1}, options: {name: 'status_language_newest'}},
            {key: {title: 'text', subTitle: 'text'}, options: {name: 'title_subtitle_text'}},
        ],
    },

    {
        name: COLLECTIONS.comments,
        comment: 'Comments, held for moderation until isApproved is true.',
        validator: {
            bsonType: 'object',
            required: ['blog', 'name', 'content'],
            properties: {
                blog: objectId('References blogs._id - the "postId" of the requirements'),
                user: objectId('References users._id; absent on pre-sign-in comments'),
                name: str('Commenter display name', {minLength: 1, maxLength: 60}),
                content: str('Plain text, markup stripped', {minLength: 1, maxLength: 1000}),
                isApproved: bool('false until an admin approves it'),
                createdAt: date('Set by Mongoose timestamps'),
                updatedAt: date('Set by Mongoose timestamps'),
            },
        },
        indexes: [
            // Required index: comment postId.
            {key: {blog: 1, isApproved: 1, createdAt: -1}, options: {name: 'post_approved_newest'}},
            {key: {createdAt: -1}, options: {name: 'newest'}},
        ],
    },

    {
        name: COLLECTIONS.bookmarks,
        comment: 'Saved-for-later list, one row per reader and article.',
        validator: {
            bsonType: 'object',
            required: ['blog', 'user'],
            properties: {
                blog: objectId('References blogs._id - the "postId" of the requirements'),
                user: objectId('References users._id - the "userId" of the requirements'),
                createdAt: date('Set by Mongoose timestamps'),
                updatedAt: date('Set by Mongoose timestamps'),
            },
        },
        indexes: [
            // Required index: bookmark userId plus postId. Unique, so the
            // one-save-per-reader rule is the database's, not the interface's.
            {key: {user: 1, blog: 1}, options: {name: 'user_post_unique', unique: true}},
            {key: {user: 1, createdAt: -1}, options: {name: 'user_newest'}},
        ],
    },

    {
        name: COLLECTIONS.analyticsEvents,
        comment: 'Analytics events: one row per article and reader, with a repeat-visit counter.',
        validator: {
            bsonType: 'object',
            required: ['blog', 'viewerKey'],
            properties: {
                blog: objectId('References blogs._id'),
                viewerKey: str('"u:<userId>" for an account, "v:<browserId>" for a guest'),
                count: int('Visits by this reader, outside the 6 hour dedupe window'),
                lastViewedAt: date('When this reader was last counted'),
                createdAt: date('First visit - what the dashboard series groups by'),
                updatedAt: date('Set by Mongoose timestamps'),
            },
        },
        indexes: [
            {key: {blog: 1, viewerKey: 1}, options: {name: 'post_viewer_unique', unique: true}},
            {key: {createdAt: -1}, options: {name: 'newest'}},
        ],
    },

    {
        name: COLLECTIONS.likes,
        comment: 'Likes, one row per reader and article.',
        validator: {
            bsonType: 'object',
            required: ['blog', 'user'],
            properties: {
                blog: objectId('References blogs._id'),
                user: objectId('References users._id'),
                createdAt: date('What the dashboard series groups by'),
                updatedAt: date('Set by Mongoose timestamps'),
            },
        },
        indexes: [
            {key: {blog: 1, user: 1}, options: {name: 'post_user_unique', unique: true}},
            {key: {user: 1, createdAt: -1}, options: {name: 'user_newest'}},
        ],
    },

    {
        name: COLLECTIONS.subscribers,
        comment: 'Newsletter addresses.',
        validator: {
            bsonType: 'object',
            required: ['email'],
            properties: {
                email: str('Lower-cased, unique across the collection'),
                createdAt: date('Set by Mongoose timestamps'),
                updatedAt: date('Set by Mongoose timestamps'),
            },
        },
        indexes: [
            {key: {email: 1}, options: {name: 'email_unique', unique: true}},
        ],
    },
];

const NAMESPACE_EXISTS = 48;
const INDEX_OPTIONS_CONFLICT = 85;
const INDEX_KEY_SPECS_CONFLICT = 86;

// Creates the collection, or leaves an existing one in place.
const ensureCollection = async (db, {name, validator}) => {
    const options = {
        validator: {$jsonSchema: validator},
        validationLevel: 'moderate',
        validationAction: VALIDATION_ACTION,
    };

    try {
        await db.createCollection(name, options);
        return 'created';
    } catch (error) {
        if(error.code !== NAMESPACE_EXISTS) throw error;
    }

    // Already there: update the validator in place. collMod touches metadata
    // only - no document is rewritten and nothing is lost.
    await db.command({collMod: name, ...options});
    return 'updated';
}

const ensureIndexes = async (db, name, indexes) => {
    const collection = db.collection(name);
    const summary = [];

    for (const {key, options} of indexes){
        try {
            await collection.createIndex(key, options);
            summary.push(options.name);
        } catch (error) {
            // An index of the same name built with different options already
            // exists. Report it rather than dropping someone else's index.
            if(error.code === INDEX_OPTIONS_CONFLICT || error.code === INDEX_KEY_SPECS_CONFLICT){
                console.warn(
                    `    ! "${options.name}" already exists with different options - left as it is.\n` +
                    `      Drop it manually if you want this script to rebuild it: ` +
                    `db.${name}.dropIndex("${options.name}")`
                );
                continue;
            }
            throw error;
        }
    }

    return summary;
}

const applySchema = async (db) => {
    console.log(`\nApplying schema (validationAction: ${VALIDATION_ACTION})\n`);

    for (const definition of SCHEMA){
        const state = await ensureCollection(db, definition);
        console.log(`  ${definition.name} (${state}) - ${definition.comment}`);

        const created = await ensureIndexes(db, definition.name, definition.indexes);
        console.log(`    indexes: ${created.join(', ') || 'none changed'}`);
    }

    console.log('\nSchema is up to date. No documents were read or modified.');
    console.log('Next: `npm run db:seed` to add sample content, or start the API.\n');
}

await withDatabase(applySchema);
