import { z } from 'zod';

export const createReferralSchema = z.object({
    patientId: z.string().min(1),
    recordId: z.string().optional(),
    type: z.enum(['PHARMACY', 'LAB', 'RADIOLOGY']),
    pharmacyId: z.string().optional(),
    labId: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['PENDING', 'SENT', 'COMPLETED', 'EXPIRED']).default('PENDING')
});

export const updateReferralSchema = createReferralSchema.partial().omit({ patientId: true, type: true });

export const referralQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    patientId: z.string().optional(),
    doctorId: z.string().optional(),
    type: z.enum(['PHARMACY', 'LAB', 'RADIOLOGY']).optional(),
    status: z.enum(['PENDING', 'SENT', 'COMPLETED', 'EXPIRED']).optional(),
    organizationId: z.string().optional()
});

export type CreateReferralInput = z.infer<typeof createReferralSchema>;
export type UpdateReferralInput = z.infer<typeof updateReferralSchema>;
export type ReferralQueryInput = z.infer<typeof referralQuerySchema>;
