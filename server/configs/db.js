import mongoose from "mongoose";


const connectDB = async () =>{
    try {
        mongoose.connection.on('connected', ()=> console.log("Database Connected")
        )
        // A small pool matters on serverless hosting: every cold start opens its
        // own connection, and a free Atlas cluster has a modest connection cap.
        await mongoose.connect(`${process.env.MONGODB_URI}/quickblog`, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
        })
    } catch (error) {
        console.log(error.message);
    }
}

export default connectDB;