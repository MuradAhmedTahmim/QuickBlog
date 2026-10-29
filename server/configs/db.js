import mongoose from "mongoose";

// database/schema.js owns index creation. It names every index explicitly and
// Mongoose names them its own way, so if both build the same index MongoDB
// answers IndexOptionsConflict - and because nothing awaits Mongoose's
// background build, that lands as an unhandled rejection and kills a
// serverless function outright.
//
// So index building is OFF unless we are demonstrably on a development or test
// machine. An unset or unexpected NODE_ENV counts as production, which is the
// safe direction: the worst case is that `npm run db:schema` has to be run,
// which the install guide already requires.
const AUTO_INDEX = ['development', 'test'].includes(process.env.NODE_ENV) && !process.env.VERCEL;

// Mongoose builds indexes in the background the first time a model is used and
// nothing awaits that promise. Calling init() here claims it, so a failure is
// logged instead of becoming an unhandled rejection. With AUTO_INDEX off this
// resolves immediately and costs nothing; it is the safety net for the case
// where it is on and an index already exists under another name.
const claimIndexBuilds = async () => {
    await Promise.all(Object.values(mongoose.models).map((model) =>
        model.init().catch((error) =>
            console.log(`Index build skipped for ${model.modelName}: ${error.message}`)
        )
    ))
}

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

            // See AUTO_INDEX above. `npm run db:schema` is what creates
            // indexes anywhere this is false. See HowToSetup.md.
            autoIndex: AUTO_INDEX,
        })

        await claimIndexBuilds()
    } catch (error) {
        console.log(error.message);
    }
}

export default connectDB;