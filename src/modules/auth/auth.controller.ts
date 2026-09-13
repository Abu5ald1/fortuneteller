import { Request, Response } from 'express';

import { loginUser, logoutUser, refreshTokens, registerUser } from './auth.service';

export async function register(req: Request, res: Response): Promise<void> {
  const result = await registerUser(req.body);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await loginUser(req.body);
  res.status(200).json(result);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const result = await refreshTokens(req.body);
  res.status(200).json(result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const result = await logoutUser(req.body);
  res.status(200).json(result);
}
