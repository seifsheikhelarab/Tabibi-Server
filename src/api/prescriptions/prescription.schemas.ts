import { z } from 'zod';

export const createPrescriptionSchema = z.object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    recordId: z.string().optional(),
    medicines: z.string().min(1),
    notes: z.string().optional(),
    followUpDate: z.string().datetime().optional(),
    status: z.enum(['DRAFT', 'FINALIZED']).default('DRAFT')
});

export const updatePrescriptionSchema = createPrescriptionSchema.partial().omit({ patientId: true, doctorId: true });

export const prescriptionQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    patientId: z.string().optional(),
    doctorId: z.string().optional(),
    status: z.enum(['DRAFT', 'FINALIZED']).optional(),
    organizationId: z.string().optional()
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type PrescriptionQueryInput = z.infer<typeof prescriptionQuerySchema>;
