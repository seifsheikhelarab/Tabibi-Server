import nodemailer from 'nodemailer';
import { env } from '../config/env.config.js';
import logger from './logger.util.js';

const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: typeof env.smtpPort === 'number' ? env.smtpPort : parseInt(env.smtpPort || '587', 10),
    secure: typeof env.smtpSecure === 'string' ? env.smtpSecure === 'true' : Boolean(env.smtpSecure),
    auth: {
        user: env.smtpUser,
        pass: env.smtpPass
    }
});

export const sendEmail = async ({
    to,
    subject,
    html
}: {
    to: string;
    subject: string;
    html: string;
}): Promise<{ messageId: string } | null> => {
    try {
        if (env.nodeEnv === 'production') {
            const info = await transporter.sendMail({
                from: env.smtpFrom,
                to,
                subject,
                html
            });
            logger.info(`Email sent to ${to}: ${info.messageId}`);
            return { messageId: info.messageId };
        }
        return null;
    } catch (error) {
        logger.error(
            `Error sending email to ${to}: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
    }
};
