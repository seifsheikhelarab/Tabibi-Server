import { z } from 'zod';

export const createAppointmentSchema = z.object({
    patientId: z.any(),
    doctorId: z.any(),
    appointmentDate: z.any(),
    startTime: z.any(),
    endTime: z.any(),
    type: z.any().optional(),
    reason: z.any().optional(),
    notes: z.any().optional(),
    fees: z.any().optional()
});

export const updateAppointmentSchema = z.object({
    appointmentDate: z.string().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
    type: z.enum(['CHECKUP', 'FOLLOWUP', 'EMERGENCY', 'CONSULTATION']).optional(),
    reason: z.string().optional(),
    notes: z.string().optional(),
    cancellationReason: z.string().optional(),
    paymentStatus: z.enum(['PENDING', 'VERIFYING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
    paymentId: z.string().optional(),
    paymentAmount: z.number().optional(),
    paymentProof: z.string().optional(),
    paymentMethod: z.string().optional()
});

export const submitPaymentProofSchema = z.object({
    paymentProof: z.string().url(),
    paymentMethod: z.string().default('INSTAPAY'),
    paymentAmount: z.number().optional()
});

export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;

export const appointmentQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    patientId: z.string().optional(),
    doctorId: z.string().optional(),
    status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    organizationId: z.string().optional(),
    userId: z.string().optional()
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AppointmentQueryInput = z.infer<typeof appointmentQuerySchema>;
