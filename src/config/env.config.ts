import 'dotenv/config';

export const env = {
    port: process.env.PORT || '3000',
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    timeZone: process.env.TZ || 'Asia/Kolkata',

    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    appUrl: process.env.APP_URL || 'http://localhost:3000',

    databaseUrl: process.env.DATABASE_URL,

    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpFrom: process.env.SMTP_FROM,

    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,

    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,

    cloudinaryName: process.env.CLOUDINARY_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinarySecretKey: process.env.CLOUDINARY_SECRET_KEY,

    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,

    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

    geminiApiKey: process.env.GEMINI_API_KEY
};

export function checkEnv(): void {
    const missingVars: string[] = [];

    if (!env.port) missingVars.push('PORT');
    if (!env.nodeEnv) missingVars.push('NODE_ENV');
    if (!env.betterAuthSecret) missingVars.push('BETTER_AUTH_SECRET');
    if (!env.databaseUrl) missingVars.push('DATABASE_URL');

    if (missingVars.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingVars.join(', ')}`
        );
    }
}
