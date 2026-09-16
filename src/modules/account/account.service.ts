import {
  createAccountSchema,
  getAccountsQuerySchema,
  updateAccountSchema,
} from './account.validation';
import { prisma } from '../../config/prisma';
import { Prisma } from '../../generated/prisma/client';
import { TransactionType } from '../../generated/prisma/enums';
import { AppError } from '../../middlewares/errorHandler';

export async function createAccount(userId: string, input: unknown) {
  const data = createAccountSchema.parse(input);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.archivedAt !== null) {
    throw new AppError('User not found', 404);
  }

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        name: data.name,
        type: data.type,
        currency: user.preferredCurrency,
        currentBalance: data.currentBalance ?? 0,
        userId,
      },
    });

    if (data.currentBalance !== undefined && data.currentBalance > 0) {
      await tx.transaction.create({
        data: {
          type: TransactionType.OPENING_BALANCE,
          amount: data.currentBalance,
          transactionDate: new Date(),
          description: 'Opening balance',
          userId,
          accountId: account.id,
        },
      });
    }

    return account;
  });
}

export async function getAccounts(userId: string, input: unknown) {
  const filters = getAccountsQuerySchema.parse(input);

  const where: Prisma.AccountWhereInput = { userId };

  if (filters.status === 'active') {
    where.archivedAt = null;
  } else if (filters.status === 'archived') {
    where.archivedAt = { not: null };
  }
  // 'all' → no archivedAt filter, both active and archived accounts included.

  if (filters.minBalance !== undefined || filters.maxBalance !== undefined) {
    where.currentBalance = {
      ...(filters.minBalance !== undefined && { gte: filters.minBalance }),
      ...(filters.maxBalance !== undefined && { lte: filters.maxBalance }),
    };
  }

  return prisma.account.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateAccount(userId: string, accountId: string, input: unknown) {
  const data = updateAccountSchema.parse(input);

  // Scoping the WHERE by userId (not just id) is what makes this an
  // ownership check — a user can never touch another user's account by id,
  // and the response gives no signal either way (404 for "not found" and
  // "not yours" alike).
  const updated = await prisma.account.updateMany({
    where: { id: accountId, userId, archivedAt: null },
    data: { name: data.name },
  });

  if (updated.count === 0) {
    throw new AppError('Account not found', 404);
  }

  return prisma.account.findUnique({ where: { id: accountId } });
}

export async function archiveAccount(userId: string, accountId: string) {
  const archived = await prisma.account.updateMany({
    where: { id: accountId, userId, archivedAt: null },
    data: { archivedAt: new Date() },
  });

  if (archived.count === 0) {
    throw new AppError('Account not found', 404);
  }

  return { message: 'Account archived successfully' };
}

export async function restoreAccount(userId: string, accountId: string) {
  const restored = await prisma.account.updateMany({
    where: { id: accountId, userId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });

  if (restored.count === 0) {
    throw new AppError('Account not found', 404);
  }

  return { message: 'Account restored successfully' };
}
