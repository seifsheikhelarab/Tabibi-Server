import { z } from 'zod';

export const createRecordSchema = z.object({
    patientId: z.string().min(1),
    doctorId: z.string().min(1),
    visitDate: z.string().datetime(),
    chiefComplaint: z.string().optional(),
    diagnosis: z.string().optional(),
    notes: z.string().optional(),
    vitalSigns: z.string().optional(),
    attachments: z.array(z.string()).optional()
});

export const updateRecordSchema = createRecordSchema.partial().omit({ patientId: true, doctorId: true });

export const recordQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    patientId: z.string().optional(),
    doctorId: z.string().optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    organizationId: z.string().optional()
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type RecordQueryInput = z.infer<typeof recordQuerySchema>;
