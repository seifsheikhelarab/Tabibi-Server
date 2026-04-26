import 'dotenv/config';
import express from 'express';
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

checkEnv();

initCloudinary();
initRazorpay();
initStripe();
initGemini();

const app = express();

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                'script-src': [
                    "'self'",
                    "'unsafe-inline'",
                    'https://cdn.jsdelivr.net'
                ],
                'script-src-elem': [
                    "'self'",
                    "'unsafe-inline'",
                    'https://cdn.jsdelivr.net'
                ]
            }
        }
    })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }), paymentRouter);

app.use(
    cors({
        origin: [
            'http://localhost:5173', 
            'http://localhost:5174', 
            'http://localhost:5175', 
            'http://localhost:5176', 
            'http://localhost:3000', 
            'http://127.0.0.1:5173',
            'https://tabibi-client.vercel.app',
            'https://tabibi-admin.vercel.app'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'atoken']
    })
);

app.use(pinoHttp({ logger }));

app.use('/api/auth/*splat', toNodeHandler(auth));
app.use('/api', apiRouter);

app.use(httpLogger);
app.use(notFoundHandler);
app.use(errorHandler);

export async function startServer(): Promise<void> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        logger.info('[Init] PostgreSQL connected successfully');

        const server = app.listen(env.port, async () => {
            logger.info(`[Init] Server running on http://localhost:${env.port}`);
            logger.info(`[Init] API docs at http://localhost:${env.port}/api-docs`);
        });

        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully...');
            server.close(async () => {
                await prisma.$disconnect();
                logger.info('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT received, shutting down gracefully...');
            server.close(async () => {
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