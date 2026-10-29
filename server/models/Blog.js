import mongoose from "mongoose";
import readingTime from "../utils/readingTime.js";

const blogSchema = new mongoose.Schema({
    title: {type: String, required: true},
    subTitle: {type: String},
    description: {type: String, required: true},
    category: {type: String, required: true},
    image: {type: String, required: true},
    isPublished: {type: Boolean, required: true},
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},

    // Readable identifier derived from the title. Articles are still fetched by
    // _id, so this is additive: nothing breaks on a post that has none yet.
    slug: {type: String, trim: true, lowercase: true},

    // Which interface language this article is written for. 'both' means show
    // it whichever language the reader has chosen, and is what every article
    // written before bilingual filtering existed is treated as.
    contentLanguage: {type: String, enum: ['en', 'bn', 'both'], default: 'both'},

    // Engagement counters kept alongside the Like/View collections so listing and
    // trending queries never have to join across them.
    views: {type: Number, default: 0},
    uniqueViews: {type: Number, default: 0},
    likesCount: {type: Number, default: 0},
    commentsCount: {type: Number, default: 0},

    readingTime: {type: Number, default: 1},
},{timestamps: true});

// Derived from the body, so it stays correct whenever the content changes.
blogSchema.pre('save', function(next){
    if(this.isModified('description')){
        this.readingTime = readingTime(this.description)
    }
    next()
})

blogSchema.index({isPublished: 1, createdAt: -1});
blogSchema.index({isPublished: 1, category: 1});
blogSchema.index({isPublished: 1, contentLanguage: 1, createdAt: -1});
// Required index: post author and status.
blogSchema.index({author: 1, isPublished: 1});
blogSchema.index({title: 'text', subTitle: 'text'});
// Required index: unique post slug. Partial, so posts predating the field do
// not all collide on a missing value.
blogSchema.index(
    {slug: 1},
    {unique: true, partialFilterExpression: {slug: {$type: 'string'}}}
);

const Blog = mongoose.model('blog', blogSchema);

export default Blog;
