import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
    blog: {type: mongoose.Schema.Types.ObjectId, ref: 'blog', required: true},
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
},{timestamps: true});

// One like per user per blog - enforced by the database, not the UI.
likeSchema.index({blog: 1, user: 1}, {unique: true});
likeSchema.index({user: 1, createdAt: -1});

const Like = mongoose.model('Like', likeSchema);

export default Like;
