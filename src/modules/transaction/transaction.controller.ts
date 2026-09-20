import { Request, Response } from 'express';

import { createTransaction, getTransactionById, getTransactions } from './transaction.service';

export async function create(req: Request, res: Response): Promise<void> {
  const result = await createTransaction(req.user!.id, req.body);
  res.status(201).json(result);
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await getTransactions(req.user!.id);
  res.status(200).json(result);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const result = await getTransactionById(req.user!.id, req.params.id as string);
  res.status(200).json(result);
}
