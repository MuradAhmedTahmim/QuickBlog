import mongoose from "mongoose";

// One document per (blog, reader). `count` only grows once the dedupe window has
// passed, so refreshing an article does not inflate the totals.
const viewSchema = new mongoose.Schema({
    blog: {type: mongoose.Schema.Types.ObjectId, ref: 'blog', required: true},
    viewerKey: {type: String, required: true},
    count: {type: Number, default: 1},
    lastViewedAt: {type: Date, default: Date.now},
},{timestamps: true});

viewSchema.index({blog: 1, viewerKey: 1}, {unique: true});
viewSchema.index({createdAt: -1});

const View = mongoose.model('View', viewSchema);

export default View;
