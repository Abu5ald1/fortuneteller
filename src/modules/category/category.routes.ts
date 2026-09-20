import { Router } from 'express';

import { archive, create, list, restore, update } from './category.controller';
import { authenticate } from '../auth/auth.middleware';

export const categoryRouter = Router();

categoryRouter.use(authenticate);

categoryRouter.post('/', create);
categoryRouter.get('/', list);
categoryRouter.patch('/:id', update);
categoryRouter.delete('/:id', archive);
categoryRouter.patch('/:id/restore', restore);
