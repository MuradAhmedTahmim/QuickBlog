import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import mongoose from 'mongoose'
import adminRouter from './routes/adminRoutes.js';
import blogRouter from './routes/blogRoutes.js';
import userRouter from './routes/userRoutes.js';

// The Express app on its own: no database connection and no listener, so the
// test suite can mount it with supertest against its own throwaway database.
// server.js is what connects, bootstraps and listens in a real run.
const app = express();

// CLIENT_URL narrows CORS to the sites that are allowed to call this API. It
// takes a comma separated list. Left unset, every origin is accepted, which is
// the behaviour this API shipped with and what a local `npm run dev` expects.
const allowedOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

const corsOptions = allowedOrigins.length === 0 ? {} : {
    origin: (origin, callback) => {
        // Same-origin and server-to-server calls arrive without an Origin header.
        if(!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))){
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
};

// Middlewares
app.use(cors(corsOptions))
app.use(express.json())

// Routes
app.get('/', (req, res)=> res.send("API is Working"))
// A health check that did not report the database would not be worth much, so
// it names the connection state. It runs no query, so it still answers while
// the database is unreachable - which is exactly when it is needed.
const DB_STATE = ['disconnected', 'connected', 'connecting', 'disconnecting'];

app.get('/health', (req, res)=> res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    database: DB_STATE[mongoose.connection.readyState] ?? 'unknown',
}))
app.use('/api/admin', adminRouter)
app.use('/api/blog', blogRouter)
app.use('/api/user', userRouter)

export default app;
