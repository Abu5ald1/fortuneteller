import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { accountRouter } from './modules/account/account.routes';
import { authRouter } from './modules/auth/auth.routes';
import { categoryRouter } from './modules/category/category.routes';
import { transactionRouter } from './modules/transaction/transaction.routes';
import { healthRouter } from './routes/health.route';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      // Full req/res objects (headers, etc.) are noise for everyday dev
      // tracing — the one-line custom message already carries what matters.
      serializers: {
        req: () => undefined,
        res: () => undefined,
      },
      // errorHandler/notFoundHandler already log every 4xx/5xx themselves,
      // with full error detail (message + stack) — silence pino-http there
      // so failed requests don't get a second, less-detailed duplicate line.
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 400) return 'silent';
        return 'info';
      },
      customSuccessMessage: (req, res, responseTime) =>
        `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`,
      // Drop the extra merged object — the message already carries everything
      // useful, so successful requests get one clean line with no trailing JSON.
      customSuccessObject: () => ({}),
    }),
  );

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/accounts', accountRouter);
  app.use('/categories', categoryRouter);
  app.use('/transactions', transactionRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
