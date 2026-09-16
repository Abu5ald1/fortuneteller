import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { accountRouter } from './modules/account/account.routes';
import { authRouter } from './modules/auth/auth.routes';
import { healthRouter } from './routes/health.route';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/accounts', accountRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
