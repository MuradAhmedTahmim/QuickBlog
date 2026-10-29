import 'dotenv/config'
import app from './app.js'
import connectDB from './configs/db.js';
import bootstrap from './configs/bootstrap.js';

await connectDB()

// Bootstrap is idempotent housekeeping: it creates the admin from .env and
// fills in fields older documents lack.
//
// On a long-running server it finishes before the first request, which is what
// an operator watching the log expects. On Vercel every cold start would
// otherwise pay for its round trips inside the function's timeout, so there it
// runs in the background and the first request is not held up by it.
if(process.env.VERCEL){
    bootstrap().catch((error) => console.log('Bootstrap failed:', error.message))
}else{
    await bootstrap()
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('Server is running on port ' + PORT)
})

export default app;
