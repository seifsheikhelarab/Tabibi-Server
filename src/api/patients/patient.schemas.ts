import { z } from 'zod';

export const createPatientSchema = z.object({
    firstName: z.any().optional(),
    lastName: z.any().optional(),
    email: z.any().optional(),
    phone: z.any().optional(),
    dateOfBirth: z.any().optional(),
    gender: z.any().optional(),
    address: z.any().optional(),
    city: z.any().optional(),
    state: z.any().optional(),
    pincode: z.any().optional(),
    bloodGroup: z.any().optional(),
    allergies: z.any().optional(),
    medicalHistory: z.any().optional(),
    userId: z.any().optional(),
    image: z.any().optional()
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    search: z.string().optional(),
    doctorId: z.string().optional()
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientQueryInput = z.infer<typeof patientQuerySchema>;
