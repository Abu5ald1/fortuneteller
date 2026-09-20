import { z } from 'zod';

import { CategoryType } from '../../generated/prisma/enums';
import { statusFilterSchema } from '../../shared/query';

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  // Fixed at creation — this decides which transaction types the category
  // can be used with (INCOME categories on INCOME transactions, EXPENSE on
  // EXPENSE; transfers and opening balances never use a category at all).
  // Enforced in the transaction module, not here.
  type: z.enum(CategoryType),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// Only the name can be changed after creation — changing type after the fact
// would silently reclassify every transaction already filed under it.
export const updateCategorySchema = createCategorySchema.pick({ name: true });

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const getCategoriesQuerySchema = z.object({
  status: statusFilterSchema,
});

export type GetCategoriesQuery = z.infer<typeof getCategoriesQuerySchema>;
