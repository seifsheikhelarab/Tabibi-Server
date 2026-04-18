import { z } from 'zod';

export const paymentProviderSchema = z.enum(['STRIPE', 'RAZORPAY']);

export const createPaymentIntentSchema = z.object({
  appointmentId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  provider: paymentProviderSchema,
});

export const webhookSchema = z.object({
  provider: paymentProviderSchema,
  payload: z.any(),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
