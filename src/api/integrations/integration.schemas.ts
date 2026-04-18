import { z } from 'zod';

export const integrationTypeSchema = z.enum(['PHARMACY', 'LAB', 'RADIOLOGY']);

export const createIntegrationSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  type: integrationTypeSchema,
});

export const updateIntegrationSchema = createIntegrationSchema.partial().omit({ organizationId: true, type: true });

export const integrationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  search: z.string().optional(),
  type: integrationTypeSchema,
  organizationId: z.string().optional(),
});

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;
export type IntegrationQueryInput = z.infer<typeof integrationQuerySchema>;
