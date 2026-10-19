import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { UPLOAD_DIR } from './upload';
import settings from './routes/settings';
import foods from './routes/foods';
import foodLogs from './routes/foodLogs';
import plan from './routes/plan';
import todos from './routes/todos';
import strength from './routes/strength';
import body from './routes/body';
import summary from './routes/summary';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/settings', settings);
app.use('/api/foods', foods);
app.use('/api/food-logs', foodLogs);
app.use('/api/plan', plan);
app.use('/api/todos', todos);
app.use('/api/strength', strength);
app.use('/api/body', body);
app.use('/api/summary', summary);

app.use((_req, res) => {
  res.status(404).json({ error: 'not found' });
});

// Express 5 forwards rejected async handlers here
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.name === 'MulterError') {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err?.code === '22P02' || err?.code === '23503' || err?.code === '22007') {
    res.status(400).json({ error: 'invalid input or reference' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'server error' });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => console.log(`API running on http://localhost:${port}`));
