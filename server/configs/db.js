import mongoose from "mongoose";


const connectDB = async () =>{
    try {
        mongoose.connection.on('connected', ()=> console.log("Database Connected")
        )
        // A dropped connection must never take the process down with it.
        mongoose.connection.on('error', (error) =>
            console.log('Database error:', error.message)
        )

        // A small pool matters on serverless hosting: every cold start opens its
        // own connection, and a free Atlas cluster has a modest connection cap.
        await mongoose.connect(`${process.env.MONGODB_URI}/quickblog`, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,

            // In production, database/schema.js owns index creation. It names
            // every index explicitly, and Mongoose names them its own way, so
            // letting both build the same index fails with IndexOptionsConflict
            // - which, on a cold start, is an unhandled rejection that takes the
            // whole function down. Building indexes on every cold start is
            // wasted work anyway.
            //
            // Development and tests keep autoIndex on, so a fresh local
            // database still gets its indexes without running the script.
            //
            // This makes `npm run db:schema` REQUIRED before the first
            // production start. See HowToSetup.md.
            autoIndex: process.env.NODE_ENV !== 'production',
        })
    } catch (error) {
        console.log(error.message);
    }
}

export default connectDB;