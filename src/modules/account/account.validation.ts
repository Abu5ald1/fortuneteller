import { z } from 'zod';

import { AccountType } from '../../generated/prisma/enums';

export const createAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  type: z.enum(AccountType),
  // currency isn't client input — it's set from the owning user's preferredCurrency.
  // Starting balance — the only point at which currentBalance can be set directly.
  // After creation it only moves through transactions, so it isn't part of updateAccountSchema.
  // Left undefined (vs. defaulted) on purpose: the service only records an
  // OPENING_BALANCE transaction when this was actually provided and positive.
  currentBalance: z.number().min(0, 'Current balance cannot be negative').optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

// Only the name can be changed after creation — type, currency, and balance are fixed
// at creation (balance thereafter only moves through transactions).
export const updateAccountSchema = createAccountSchema.pick({ name: true });

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const getAccountsQuerySchema = z
  .object({
    status: z.enum(['active', 'archived', 'all']).default('active'),
    minBalance: z.coerce.number().optional(),
    maxBalance: z.coerce.number().optional(),
  })
  .refine(
    (data) =>
      data.minBalance === undefined ||
      data.maxBalance === undefined ||
      data.minBalance <= data.maxBalance,
    { message: 'minBalance must be less than or equal to maxBalance', path: ['minBalance'] },
  );

export type GetAccountsQuery = z.infer<typeof getAccountsQuerySchema>;
