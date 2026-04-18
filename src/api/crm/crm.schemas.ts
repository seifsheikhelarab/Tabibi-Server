import { z } from 'zod';

export const createCrmTaskSchema = z.object({
    assignedToUserId: z.string().optional(),
    title: z.string().min(1),
    patientName: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']).default('OPEN'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    dueDate: z.string().datetime().optional()
});

export const updateCrmTaskSchema = createCrmTaskSchema.partial();

export const crmTaskQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    assignedToUserId: z.string().optional(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    organizationId: z.string().optional()
});

export type CreateCrmTaskInput = z.infer<typeof createCrmTaskSchema>;
export type UpdateCrmTaskInput = z.infer<typeof updateCrmTaskSchema>;
export type CrmTaskQueryInput = z.infer<typeof crmTaskQuerySchema>;
