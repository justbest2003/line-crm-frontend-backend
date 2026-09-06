import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import webhookRouter from './routes/webhook.route';
import authRouter from './routes/auth.route';
import customersRouter from './routes/customers.route';
import tagsRouter from './routes/tags.route';
import notificationsRouter from './routes/notifications.route';
import broadcastsRouter from './routes/broadcasts.route';
import dashboardRouter from './routes/dashboard.route';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/webhook', webhookRouter);

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
);

app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/broadcasts', broadcastsRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Webhook: POST http://localhost:${PORT}/webhook/line`);
  console.log(`   API:     http://localhost:${PORT}/api/*`);
  console.log(`   Health:  GET  http://localhost:${PORT}/health`);
});

export default app;
