import {
  createCategorySchema,
  getCategoriesQuerySchema,
  updateCategorySchema,
} from './category.validation';
import { prisma } from '../../config/prisma';
import { Prisma } from '../../generated/prisma/client';
import { AppError } from '../../middlewares/errorHandler';
import { findOrThrow } from '../../shared/assert';

export async function createCategory(userId: string, input: unknown) {
  const data = createCategorySchema.parse(input);

  const existing = await prisma.category.findUnique({
    where: { userId_name: { userId, name: data.name } },
  });
  if (existing) {
    throw new AppError('Category name already in use', 409);
  }

  try {
    return await prisma.category.create({
      data: { name: data.name, type: data.type, userId },
    });
  } catch (error) {
    // Safety net for a concurrent create with the same name slipping past the check above.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Category name already in use', 409);
    }
    throw error;
  }
}

export async function getCategories(userId: string, input: unknown) {
  const filters = getCategoriesQuerySchema.parse(input);

  const where: Prisma.CategoryWhereInput = { userId };

  if (filters.status === 'active') {
    where.archivedAt = null;
  } else if (filters.status === 'archived') {
    where.archivedAt = { not: null };
  }
  // 'all' → no archivedAt filter, both active and archived categories included.

  return prisma.category.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateCategory(userId: string, categoryId: string, input: unknown) {
  const data = updateCategorySchema.parse(input);

  try {
    // Scoping the WHERE by userId (not just id) is the ownership check — a
    // user can never touch another user's category by id, and the response
    // gives no signal either way (404 for "not found" and "not yours" alike).
    // Once ownership is confirmed below, there's nothing left to hide, so a
    // failed update can say exactly why.
    const updated = await prisma.category.updateMany({
      where: { id: categoryId, userId, archivedAt: null },
      data: { name: data.name },
    });

    if (updated.count === 0) {
      await findOrThrow(
        () => prisma.category.findFirst({ where: { id: categoryId, userId } }),
        'Category not found',
      );
      throw new AppError('Cannot update an archived category', 409);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Category name already in use', 409);
    }
    throw error;
  }

  return prisma.category.findUnique({ where: { id: categoryId } });
}

export async function archiveCategory(userId: string, categoryId: string) {
  const archived = await prisma.category.updateMany({
    where: { id: categoryId, userId, archivedAt: null },
    data: { archivedAt: new Date() },
  });

  if (archived.count === 0) {
    await findOrThrow(
      () => prisma.category.findFirst({ where: { id: categoryId, userId } }),
      'Category not found',
    );
    throw new AppError('Category is already archived', 409);
  }

  return { message: 'Category archived successfully' };
}

export async function restoreCategory(userId: string, categoryId: string) {
  const restored = await prisma.category.updateMany({
    where: { id: categoryId, userId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });

  if (restored.count === 0) {
    await findOrThrow(
      () => prisma.category.findFirst({ where: { id: categoryId, userId } }),
      'Category not found',
    );
    throw new AppError('Category is not archived', 409);
  }

  return { message: 'Category restored successfully' };
}
