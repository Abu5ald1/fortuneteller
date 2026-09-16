import { Router } from 'express';

import { archive, create, list, restore, update } from './account.controller';
import { authenticate } from '../auth/auth.middleware';

export const accountRouter = Router();

accountRouter.use(authenticate);

accountRouter.post('/', create);
accountRouter.get('/', list);
accountRouter.patch('/:id', update);
accountRouter.delete('/:id', archive);
accountRouter.post('/:id/restore', restore);
