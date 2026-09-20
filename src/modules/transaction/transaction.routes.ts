import { Router } from 'express';

import { create, getOne, list } from './transaction.controller';
import { authenticate } from '../auth/auth.middleware';

export const transactionRouter = Router();

transactionRouter.use(authenticate);

// No PATCH/DELETE — transactions are an immutable audit ledger. To correct a
// mistake, record an offsetting transaction rather than editing history.
transactionRouter.post('/', create);
transactionRouter.get('/', list);
transactionRouter.get('/:id', getOne);
