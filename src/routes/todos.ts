import { Router } from 'express';
import { q, q1 } from '../db';
import { dateOr, bool } from '../util';
import { ensureWorkoutTodos } from '../todoGen';

const r = Router();

// GET /api/todos?date=YYYY-MM-DD
// First call for a date auto-creates that weekday's workout todos (with target sets x reps).
r.get('/', async (req, res) => {
  const date = dateOr(req.query.date);
  await ensureWorkoutTodos(date);
  const todos = await q('SELECT * FROM todos WHERE date = $1 ORDER BY id', [date]);
  res.json({ date, todos, done: todos.filter((t) => t.done).length, total: todos.length });
});

// custom todo: { title, date? }
r.post('/', async (req, res) => {
  const b = req.body ?? {};
  if (!b.title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const date = dateOr(b.date);
  await ensureWorkoutTodos(date); // so the workout list is generated before custom ones are added
  const row = await q1(`INSERT INTO todos (date, title, kind) VALUES ($1, $2, 'custom') RETURNING *`, [date, b.title]);
  res.status(201).json(row);
});

r.patch('/:id', async (req, res) => {
  const b = req.body ?? {};
  const row = await q1(
    'UPDATE todos SET done = COALESCE($1, done), title = COALESCE($2, title) WHERE id = $3 RETURNING *',
    [bool(b.done), b.title ?? null, req.params.id]
  );
  if (!row) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(row);
});

r.delete('/:id', async (req, res) => {
  await q('DELETE FROM todos WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default r;
