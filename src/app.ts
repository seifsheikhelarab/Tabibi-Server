import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { checkEnv, env } from './config/env.config.js';
import prisma from './config/prisma.config.js';
import {
    notFoundHandler,
    errorHandler
} from './middlewares/error.middleware.js';
import logger, { httpLogger } from './utils/logger.util.js';
import apiRouter from './api/index.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './config/auth.config.js';
import { initCloudinary, initRazorpay, initStripe, initGemini } from './config/integrations.config.js';
import paymentRouter from './api/payments/payment.router.js';
import { initSocket } from './config/socket.js';

checkEnv();

initCloudinary();
initRazorpay();
initStripe();
initGemini();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }), paymentRouter);

const corsOptions = {
    origin: [
        'http://localhost:5173', 
        'http://localhost:5174', 
        'http://localhost:3000', 
        'https://tabibi-client.vercel.app',
        'https://tabibi-admin.vercel.app',
        'https://tabibi-server.vercel.app'
    ],
    credentials: true,
};
app.use(cors(corsOptions));

app.use('/api/auth/*splat', toNodeHandler(auth));
app.use('/api', apiRouter);

app.use(pinoHttp({ logger }));

app.use(httpLogger);
app.use(notFoundHandler);
app.use(errorHandler);

export async function startServer(): Promise<void> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        logger.info('[Init] PostgreSQL connected successfully');

        // Create HTTP server and initialize Socket.IO
        const httpServer = createServer(app);
        initSocket(httpServer);

        httpServer.listen(env.port, async () => {
            logger.info(`[Init] Server running on http://localhost:${env.port}`);
            logger.info(`[Init] API docs at http://localhost:${env.port}/api-docs`);
        });

        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully...');
            httpServer.close(async () => {
                await prisma.$disconnect();
                logger.info('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT received, shutting down gracefully...');
            httpServer.close(async () => {
                await prisma.$disconnect();
                logger.info('Server closed');
                process.exit(0);
            });
        });
    } catch (err) {
        logger.error(`Failed to start server: ${err}`);
        process.exit(1);
    }
}

export default app;