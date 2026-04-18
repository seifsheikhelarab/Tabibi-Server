import { z } from 'zod';

export const CreateReviewSchema = z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
    doctorId: z.string(),
    appointmentId: z.string(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export const ReviewQuerySchema = z.object({
    doctorId: z.string().optional(),
    patientId: z.string().optional(),
    organizationId: z.string().optional(),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(10),
});

export type ReviewQueryInput = z.infer<typeof ReviewQuerySchema>;
