import { z } from 'zod';

export const createDoctorSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    specialization: z.string().min(1, 'Specialization is required'),
    qualification: z.string().optional(),
    experience: z.number().int().min(0).optional(),
    bio: z.string().optional(),
    fees: z.number().positive().optional(),
    image: z.string().url().optional(),
    isAvailable: z.boolean().default(true),
    organizationId: z.string().optional()
});

export const updateDoctorSchema = createDoctorSchema.partial();

export const doctorQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    search: z.string().optional(),
    specialization: z.string().optional(),
    isAvailable: z.coerce.boolean().optional(),
    city: z.string().optional(),
    minRating: z.coerce.number().optional(),
    maxFees: z.coerce.number().optional(),
    organizationId: z.string().optional(),
    allowPublic: z.coerce.boolean().optional()
});

export const availabilitySchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm format'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm format'),
    isActive: z.boolean().default(true)
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type DoctorQueryInput = z.infer<typeof doctorQuerySchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
