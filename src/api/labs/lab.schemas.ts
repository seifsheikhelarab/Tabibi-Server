import { z } from 'zod';

export const createLabSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    isActive: z.boolean().default(true)
});

export const updateLabSchema = createLabSchema.partial();

export const labQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    organizationId: z.string().optional(),
    isActive: z.coerce.boolean().optional()
});

export type CreateLabInput = z.infer<typeof createLabSchema>;
export type UpdateLabInput = z.infer<typeof updateLabSchema>;
export type LabQueryInput = z.infer<typeof labQuerySchema>;
