import prisma from '../../config/prisma.config.js';
import { getStripe, getRazorpay, getStripeWebhookSecret } from '../../config/integrations.config.js';
import type { CreatePaymentIntentInput } from './payment.schemas.js';
import { BadRequestError, ConfigurationError } from '../../utils/response.util.js';
import logger from '../../utils/logger.util.js';

export class PaymentService {
    async createIntent(data: CreatePaymentIntentInput, organizationId: string) {
        const { appointmentId, amount, currency, provider } = data;

        logger.info({
            message: 'Creating payment intent',
            organizationId,
            appointmentId,
            amount,
            currency,
            provider
        });

        if (provider === 'STRIPE') {
            return this.createStripePaymentIntent(appointmentId, amount, currency);
        } else if (provider === 'RAZORPAY') {
            return this.createRazorpayOrder(appointmentId, amount, currency);
        }
        
        throw new BadRequestError(`Unsupported payment provider: ${provider}`);
    }

    private async createStripePaymentIntent(
        appointmentId: string,
        amount: number,
        currency: string
    ) {
        const stripe = getStripe();
        if (!stripe) {
            throw new ConfigurationError('Stripe not configured');
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency.toLowerCase(),
            metadata: { appointmentId }
        });

        await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                paymentStatus: 'PENDING',
                paymentId: paymentIntent.id,
                paymentAmount: amount
            }
        });

        logger.info({
            message: 'Stripe payment intent created',
            appointmentId,
            paymentId: paymentIntent.id,
            amount
        });

        return {
            paymentId: paymentIntent.id,
            amount,
            currency,
            provider: 'STRIPE',
            clientSecret: paymentIntent.client_secret
        };
    }

    private async createRazorpayOrder(
        appointmentId: string,
        amount: number,
        currency: string
    ) {
        const razorpay = getRazorpay();
        if (!razorpay) {
            throw new ConfigurationError('Razorpay not configured');
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: currency.toUpperCase(),
            receipt: appointmentId,
            notes: { appointmentId }
        });

        await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                paymentStatus: 'PENDING',
                paymentId: order.id,
                paymentAmount: amount
            }
        });

        logger.info({
            message: 'Razorpay order created',
            appointmentId,
            orderId: order.id,
            amount
        });

        return {
            paymentId: order.id,
            amount,
            currency,
            provider: 'RAZORPAY',
            orderId: order.id
        };
    }

    async handleStripeWebhook(
        payload: Buffer,
        signature: string
    ) {
        const stripe = getStripe();
        if (!stripe) {
            throw new ConfigurationError('Stripe not configured');
        }

        const endpointSecret = getStripeWebhookSecret();
        if (!endpointSecret) {
            throw new ConfigurationError('Stripe webhook secret not configured');
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(
                payload,
                signature,
                endpointSecret
            );
        } catch {
            throw new BadRequestError('Webhook signature verification failed');
        }

        const appointmentId = (event.data.object as { metadata?: { appointmentId?: string } }).metadata?.appointmentId;
        
        logger.info({
            message: 'Stripe webhook received',
            eventType: event.type,
            appointmentId
        });
        
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentSuccess(appointmentId);
                break;
            case 'payment_intent.payment_failed':
                await this.handlePaymentFailure(appointmentId);
                break;
        }

        return { received: true };
    }

    private async handlePaymentSuccess(appointmentId?: string) {
        if (appointmentId) {
            await prisma.appointment.update({
                where: { id: appointmentId },
                data: { paymentStatus: 'PAID' }
            });
            logger.info({
                message: 'Payment successful',
                appointmentId,
                status: 'PAID'
            });
        }
    }

    private async handlePaymentFailure(appointmentId?: string) {
        if (appointmentId) {
            await prisma.appointment.update({
                where: { id: appointmentId },
                data: { paymentStatus: 'FAILED' }
            });
            logger.warn({
                message: 'Payment failed',
                appointmentId,
                status: 'FAILED'
            });
        }
    }

    async handleRazorpayWebhook(payload: any) {
        const { event } = payload;
        
        logger.info({
            message: 'Razorpay webhook received',
            event
        });
        
        if (event === 'payment.captured') {
            const appointmentId = payload.payload.payment?.notes?.appointmentId;
            if (appointmentId) {
                await prisma.appointment.update({
                    where: { id: appointmentId },
                    data: { paymentStatus: 'PAID' }
                });
                logger.info({
                    message: 'Razorpay payment captured',
                    appointmentId,
                    status: 'PAID'
                });
            }
        }

        return { success: true };
    }

    async verifyPayment(data: { appointmentId: string; paymentId: string }, organizationId: string) {
        const { appointmentId, paymentId } = data;

        const appointment = await prisma.appointment.findFirst({
            where: { id: appointmentId, organizationId }
        });

        if (!appointment) {
            throw new BadRequestError('Appointment not found');
        }

        if (appointment.paymentStatus === 'PAID') {
            return { verified: true, status: 'PAID' };
        }

        return { verified: false, status: appointment.paymentStatus };
    }
}

export const paymentService = new PaymentService();