import 'dotenv/config'
import app from './app.js'
import connectDB from './configs/db.js';
import bootstrap from './configs/bootstrap.js';

await connectDB()
await bootstrap()

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log('Server is running on port ' + PORT)
})

export default app;
