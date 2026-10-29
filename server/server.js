import 'dotenv/config'
import app from './app.js'
import connectDB from './configs/db.js';
import bootstrap from './configs/bootstrap.js';

// Bootstrap is idempotent housekeeping: it creates the admin from .env and
// fills in fields older documents lack.
if(process.env.VERCEL){
    // A serverless cold start has a hard time limit, and holding it open for
    // an Atlas handshake plus bootstrap's round trips is what turns a slow
    // start into a failed invocation. So nothing here is awaited: the module
    // finishes loading at once, routes that need no data answer immediately,
    // and Mongoose buffers the queries that do until the connection is up.
    connectDB()
        .then(bootstrap)
        .catch((error) => console.log('Start-up failed:', error.message))
}else{
    // A long-running server has no such limit, so it finishes the housekeeping
    // before accepting traffic - which is what an operator reading the log
    // expects to see.
    await connectDB()
    await bootstrap()
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('Server is running on port ' + PORT)
})

export default app;
