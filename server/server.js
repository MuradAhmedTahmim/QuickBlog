import 'dotenv/config'
import app from './app.js'
import connectDB from './configs/db.js';
import bootstrap from './configs/bootstrap.js';

// Both of these are awaited, on every host, and must stay that way.
//
// Starting the connection without awaiting it does not work on serverless: the
// sandbox is frozen as soon as a response is sent, so a handshake left in
// flight never finishes, and the next request sits in Mongoose's buffer until
// it times out. The connection has to be established while the module is still
// loading, which is the one moment the event loop is guaranteed to run.
//
// Bootstrap is idempotent housekeeping - it creates the admin from .env and
// fills in fields older documents lack - and is awaited for the same reason.
// It costs a few round trips per cold start, which is the price of having it
// finish at all.
await connectDB()
await bootstrap()

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('Server is running on port ' + PORT)
})

export default app;
