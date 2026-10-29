import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    blog: {type: mongoose.Schema.Types.ObjectId, ref: 'blog', required: true},
    // Who wrote it. Optional, because comments left before sign-in was required
    // only ever carried the name the visitor typed.
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    name:  { type: String, required: true },
    content: { type: String, required: true },
    isApproved: { type: Boolean, default: false },
},{timestamps: true});

// Required index: comment postId. Reading an article asks for its approved
// comments newest first, which this serves directly.
commentSchema.index({blog: 1, isApproved: 1, createdAt: -1});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;