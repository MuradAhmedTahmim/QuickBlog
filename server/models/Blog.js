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
blogSchema.index({author: 1, isPublished: 1});
blogSchema.index({title: 'text', subTitle: 'text'});

const Blog = mongoose.model('blog', blogSchema);

export default Blog;
