import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {type: String, required: true, trim: true, maxlength: 60},
    email: {type: String, required: true, unique: true, lowercase: true, trim: true},
    password: {type: String, required: true, select: false},
    // reader -> 'user'; writes and publishes their own posts -> 'author';
    // full CMS and moderation -> 'admin'. New accounts stay readers.
    role: {type: String, enum: ['user', 'author', 'admin'], default: 'user'},
    bio: {type: String, default: '', maxlength: 400},
    image: {type: String, default: ''},
},{timestamps: true});

// Only ever send these fields to the client - never password or email.
userSchema.methods.toPublicProfile = function(){
    return {
        _id: this._id,
        name: this.name,
        bio: this.bio,
        image: this.image,
        role: this.role,
        createdAt: this.createdAt,
    }
}

// The signed-in user also needs their own email back.
userSchema.methods.toPrivateProfile = function(){
    return {...this.toPublicProfile(), email: this.email}
}

const User = mongoose.model('User', userSchema);

export default User;
