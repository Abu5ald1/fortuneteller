import { z } from 'zod';

export const statusFilterSchema = z.enum(['active', 'archived', 'all']).default('active');

export type StatusFilter = z.infer<typeof statusFilterSchema>;
