import { createTransactionSchema } from './transaction.validation';
import { prisma } from '../../config/prisma';
import { TransactionType } from '../../generated/prisma/enums';
import { AppError } from '../../middlewares/errorHandler';
import { findOrThrow } from '../../shared/assert';

// Every balance change is the side effect of creating a transaction — never a
// direct field edit — so the transaction row is always the proof of why the
// balance is what it is.
export async function createTransaction(userId: string, input: unknown) {
  const data = createTransactionSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    if (data.type === TransactionType.TRANSFER) {
      const fromAccount = await findOrThrow(
        () => tx.account.findFirst({ where: { id: data.fromAccountId, userId, archivedAt: null } }),
        'Source account not found',
      );
      const toAccount = await findOrThrow(
        () => tx.account.findFirst({ where: { id: data.toAccountId, userId, archivedAt: null } }),
        'Destination account not found',
      );

      const transaction = await tx.transaction.create({
        data: {
          type: TransactionType.TRANSFER,
          amount: data.amount,
          description: data.description,
          transactionDate: data.transactionDate ?? new Date(),
          userId,
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
        },
      });

      await tx.account.update({
        where: { id: fromAccount.id },
        data: { currentBalance: { decrement: data.amount } },
      });
      await tx.account.update({
        where: { id: toAccount.id },
        data: { currentBalance: { increment: data.amount } },
      });

      return transaction;
    }

    // INCOME or EXPENSE
    const account = await findOrThrow(
      () => tx.account.findFirst({ where: { id: data.accountId, userId, archivedAt: null } }),
      'Account not found',
    );
    const category = await findOrThrow(
      () => tx.category.findFirst({ where: { id: data.categoryId, userId, archivedAt: null } }),
      'Category not found',
    );

    if (category.type !== data.type) {
      throw new AppError(
        `Category type (${category.type}) does not match transaction type (${data.type})`,
        400,
      );
    }

    const transaction = await tx.transaction.create({
      data: {
        type: data.type,
        amount: data.amount,
        description: data.description,
        transactionDate: data.transactionDate ?? new Date(),
        userId,
        accountId: account.id,
        categoryId: category.id,
      },
    });

    await tx.account.update({
      where: { id: account.id },
      data: {
        currentBalance:
          data.type === TransactionType.INCOME
            ? { increment: data.amount }
            : { decrement: data.amount },
      },
    });

    return transaction;
  });
}

export async function getTransactions(userId: string) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { transactionDate: 'desc' },
  });
}

export async function getTransactionById(userId: string, transactionId: string) {
  return findOrThrow(
    () => prisma.transaction.findFirst({ where: { id: transactionId, userId } }),
    'Transaction not found',
  );
}
