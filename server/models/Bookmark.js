import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema({
    blog: {type: mongoose.Schema.Types.ObjectId, ref: 'blog', required: true},
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
},{timestamps: true});

// One bookmark per user per blog - enforced by the database, not the UI.
bookmarkSchema.index({blog: 1, user: 1}, {unique: true});
bookmarkSchema.index({user: 1, createdAt: -1});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

export default Bookmark;
