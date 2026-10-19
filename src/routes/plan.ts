import { Router } from 'express';
import { q, q1 } from '../db';
import { num, numOrNull } from '../util';

const r = Router();

// Whole weekly plan: 7 days (dow 1 = Mon ... 7 = Sun) each with its exercises
r.get('/', async (_req, res) => {
  const days = await q('SELECT * FROM workout_days ORDER BY dow');
  const exercises = await q('SELECT * FROM workout_exercises WHERE active ORDER BY day_id, position, id');
  res.json(days.map((d) => ({ ...d, exercises: exercises.filter((e) => e.day_id === d.id) })));
});

r.post('/days/:dayId/exercises', async (req, res) => {
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const pos = await q1<{ p: number }>(
    'SELECT COALESCE(MAX(position), -1) + 1 AS p FROM workout_exercises WHERE day_id = $1',
    [req.params.dayId]
  );
  const row = await q1(
    `INSERT INTO workout_exercises (day_id, name, sets, rep_min, rep_max, unit, notes, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.params.dayId, b.name, num(b.sets, 3), num(b.rep_min, 8), num(b.rep_max, 12), b.unit === 'sec' ? 'sec' : 'reps', b.notes ?? null, pos!.p]
  );
  res.status(201).json(row);
});

r.patch('/exercises/:id', async (req, res) => {
  const b = req.body ?? {};
  const row = await q1(
    `UPDATE workout_exercises SET
       name = COALESCE($1, name), sets = COALESCE($2, sets),
       rep_min = COALESCE($3, rep_min), rep_max = COALESCE($4, rep_max),
       unit = COALESCE($5, unit), notes = COALESCE($6, notes), position = COALESCE($7, position)
     WHERE id = $8 RETURNING *`,
    [b.name ?? null, numOrNull(b.sets), numOrNull(b.rep_min), numOrNull(b.rep_max), b.unit ?? null, b.notes ?? null, numOrNull(b.position), req.params.id]
  );
  if (!row) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(row);
});

// Soft delete so old strength logs keep working
r.delete('/exercises/:id', async (req, res) => {
  await q('UPDATE workout_exercises SET active = false WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default r;
