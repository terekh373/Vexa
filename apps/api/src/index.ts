import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { courseRouter } from './modules/courses/course.routes.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/courses', courseRouter);
app.use('/api/courses', courseRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Vexa API listening on http://localhost:${port}`);
});
