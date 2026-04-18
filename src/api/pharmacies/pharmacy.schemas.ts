import { z } from 'zod';

export const createPharmacySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    isActive: z.boolean().default(true)
});

export const updatePharmacySchema = createPharmacySchema.partial();

export const pharmacyQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    organizationId: z.string().optional(),
    isActive: z.coerce.boolean().optional()
});

export type CreatePharmacyInput = z.infer<typeof createPharmacySchema>;
export type UpdatePharmacyInput = z.infer<typeof updatePharmacySchema>;
export type PharmacyQueryInput = z.infer<typeof pharmacyQuerySchema>;
