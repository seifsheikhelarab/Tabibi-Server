import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';

import prisma from '../../config/prisma.config.js';

const mockUpdate = mock(() => Promise.resolve({}));

const mockStripe = {
    paymentIntents: {
        create: mock(() => Promise.resolve({ id: 'pi_test', client_secret: 'secret_test' }))
    },
    webhooks: {
        constructEvent: mock(() => ({
            type: 'payment_intent.succeeded',
            data: { object: { metadata: { appointmentId: 'appt-123' } } }
        }))
    }
};

mock.module('../../config/integrations.config.js', () => ({
    getStripe: () => mockStripe,
    getRazorpay: () => ({ orders: { create: mock(() => Promise.resolve({ id: 'order_test' })) } }),
    getStripeWebhookSecret: () => 'whsec_test'
}));

mock.module('../../utils/response.util.js', () => ({
    BadRequestError: class extends Error { constructor(msg: string) { super(msg); this.name = 'BadRequestError'; } },
    ConfigurationError: class extends Error { constructor(msg: string) { super(msg); this.name = 'ConfigurationError'; } }
}));

import { PaymentService } from './payment.service.js';

describe('PaymentService', () => {
    let originalUpdate: any;

    beforeEach(() => {
        originalUpdate = prisma.appointment.update;
        prisma.appointment.update = mockUpdate as any;
        mockUpdate.mockClear();
    });

    afterEach(() => {
        prisma.appointment.update = originalUpdate;
    });

    describe('createIntent', () => {
        it('should create Stripe payment intent', async () => {
            const ps = new PaymentService();
            const result = await ps.createIntent({ appointmentId: 'appt-1', amount: 100, currency: 'USD', provider: 'STRIPE' }, 'org-1');
            expect(result.provider).toBe('STRIPE');
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('should create Razorpay order', async () => {
            const ps = new PaymentService();
            const result = await ps.createIntent({ appointmentId: 'appt-1', amount: 100, currency: 'USD', provider: 'RAZORPAY' }, 'org-1');
            expect(result.provider).toBe('RAZORPAY');
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('should throw for unknown provider', async () => {
            const ps = new PaymentService();
            await expect(ps.createIntent({ appointmentId: 'appt-1', amount: 100, currency: 'USD', provider: 'UNKNOWN' as any }, 'org-1'))
                .rejects.toThrow('Unsupported payment provider');
        });
    });

    describe('handleStripeWebhook', () => {
        it('should handle payment success', async () => {
            const ps = new PaymentService();
            await ps.handleStripeWebhook(Buffer.from('{}'), 'valid_sig');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { paymentStatus: 'PAID' } }));
        });
    });

    describe('handleRazorpayWebhook', () => {
        it('should handle payment captured', async () => {
            const ps = new PaymentService();
            await ps.handleRazorpayWebhook({ event: 'payment.captured', payload: { payment: { notes: { appointmentId: 'appt-1' } } } });
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { paymentStatus: 'PAID' } }));
        });
    });
});