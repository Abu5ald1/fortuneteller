import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env';
import { AppError } from '../../middlewares/errorHandler';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401);
  }

  const accessToken = authHeader.slice('Bearer '.length);

  try {
    const payload = jwt.verify(accessToken, env.JWT_ACCESS_SECRET) as { sub: string };
    req.user = { id: payload.sub };
  } catch {
    throw new AppError('Unauthorized', 401);
  }

  next();
}
