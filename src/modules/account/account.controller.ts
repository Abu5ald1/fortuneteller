import { Request, Response } from 'express';

import {
  archiveAccount,
  createAccount,
  getAccounts,
  restoreAccount,
  updateAccount,
} from './account.service';

export async function create(req: Request, res: Response): Promise<void> {
  const result = await createAccount(req.user!.id, req.body);
  res.status(201).json(result);
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await getAccounts(req.user!.id, req.query);
  res.status(200).json(result);
}

export async function update(req: Request, res: Response): Promise<void> {
  const result = await updateAccount(req.user!.id, req.params.id as string, req.body);
  res.status(200).json(result);
}

export async function archive(req: Request, res: Response): Promise<void> {
  const result = await archiveAccount(req.user!.id, req.params.id as string);
  res.status(200).json(result);
}

export async function restore(req: Request, res: Response): Promise<void> {
  const result = await restoreAccount(req.user!.id, req.params.id as string);
  res.status(200).json(result);
}
