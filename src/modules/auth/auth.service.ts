import { createHash } from 'crypto';

import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';

import { loginSchema, refreshTokenSchema, registerSchema } from './auth.validation';
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

export async function loginUser(input: unknown) {
  const data = loginSchema.parse(input);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  // Same generic message on both a missing user and a wrong password, so a
  // response can't be used to tell whether a given email is registered.
  if (!user || user.archivedAt || !(await bcrypt.compare(data.password, user.passwordHash))) {
    throw new AppError('Invalid email or password', 401);
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getTokenExpiry(refreshToken),
    },
  });

  return {
    message: 'Login successful',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      preferredCurrency: user.preferredCurrency,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshTokens(input: unknown) {
  const data = refreshTokenSchema.parse(input);

  const invalidRefreshToken = () => new AppError('Invalid refresh token', 401);

  let payload: { sub: string };
  try {
    payload = jwt.verify(data.refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
  } catch {
    throw invalidRefreshToken();
  }

  // Atomic compare-and-swap: the WHERE clause re-checks revokedAt/expiresAt as
  // part of the same UPDATE statement, so of two concurrent requests racing on
  // the same token, only one can ever flip revokedAt from null and get count 1
  // — the loser sees count 0 and is rejected, instead of both slipping past a
  // separate read check and each minting a new token pair from one old one.
  const claimed = await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashToken(data.refreshToken),
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { revokedAt: new Date() },
  });

  if (claimed.count === 0) {
    throw invalidRefreshToken();
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.archivedAt !== null) {
    throw invalidRefreshToken();
  }

  const newAccessToken = signAccessToken(user.id);
  const newRefreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: getTokenExpiry(newRefreshToken),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logoutUser(input: unknown) {
  const data = refreshTokenSchema.parse(input);

  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(data.refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { message: 'Logged out successfully' };
}
