import { createHash } from 'crypto';

import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';

import { registerSchema } from './auth.validation';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { Prisma } from '../../generated/prisma/client';
import { AppError } from '../../middlewares/errorHandler';

const PASSWORD_SALT_ROUNDS = 12;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

function getTokenExpiry(token: string): Date {
  const { exp } = jwt.decode(token) as { exp: number };
  return new Date(exp * 1000);
}

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw new AppError('Email already in use', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, PASSWORD_SALT_ROUNDS);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          preferredCurrency: data.preferredCurrency,
        },
        select: {
          id: true,
          name: true,
          email: true,
          preferredCurrency: true,
          createdAt: true,
        },
      });

      const refreshToken = signRefreshToken(user.id);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          expiresAt: getTokenExpiry(refreshToken),
        },
      });

      return { user, refreshToken };
    });

    const accessToken = signAccessToken(created.user.id);

    return {
      message: 'Registration successful',
      user: created.user,
      accessToken,
      refreshToken: created.refreshToken,
    };
  } catch (error) {
    // Safety net for a concurrent registration with the same email slipping past the check above.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Email already in use', 409);
    }
    throw error;
  }
}
