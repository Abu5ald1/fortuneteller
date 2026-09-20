import { z } from 'zod';

import { TransactionType } from '../../generated/prisma/enums';

const sharedFields = {
  amount: z.number().positive('Amount must be greater than zero'),
  description: z.string().trim().max(255, 'Description must be at most 255 characters').optional(),
  transactionDate: z.coerce.date().optional(),
};

// OPENING_BALANCE is intentionally absent — it only ever happens as a side
// effect of account creation, never as a standalone transaction here.
export const createTransactionSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal(TransactionType.INCOME),
      accountId: z.uuid('Invalid account id'),
      categoryId: z.uuid('Invalid category id'),
      ...sharedFields,
    }),
    z.object({
      type: z.literal(TransactionType.EXPENSE),
      accountId: z.uuid('Invalid account id'),
      categoryId: z.uuid('Invalid category id'),
      ...sharedFields,
    }),
    z.object({
      type: z.literal(TransactionType.TRANSFER),
      fromAccountId: z.uuid('Invalid source account id'),
      toAccountId: z.uuid('Invalid destination account id'),
      ...sharedFields,
    }),
  ])
  .refine((data) => data.type !== 'TRANSFER' || data.fromAccountId !== data.toAccountId, {
    message: 'fromAccountId and toAccountId must be different',
    path: ['toAccountId'],
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
