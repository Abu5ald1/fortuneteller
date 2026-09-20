import { Request, Response } from 'express';

import {
  archiveCategory,
  createCategory,
  getCategories,
  restoreCategory,
  updateCategory,
} from './category.service';

export async function create(req: Request, res: Response): Promise<void> {
  const result = await createCategory(req.user!.id, req.body);
  res.status(201).json(result);
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await getCategories(req.user!.id, req.query);
  res.status(200).json(result);
}

export async function update(req: Request, res: Response): Promise<void> {
  const result = await updateCategory(req.user!.id, req.params.id as string, req.body);
  res.status(200).json(result);
}

export async function archive(req: Request, res: Response): Promise<void> {
  const result = await archiveCategory(req.user!.id, req.params.id as string);
  res.status(200).json(result);
}

export async function restore(req: Request, res: Response): Promise<void> {
  const result = await restoreCategory(req.user!.id, req.params.id as string);
  res.status(200).json(result);
}
