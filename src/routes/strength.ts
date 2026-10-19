import { Router } from 'express';
import { q, q1 } from '../db';
import { dateOr, num } from '../util';

const r = Router();

// All sets logged on a date, with exercise names. GET /api/strength?date=YYYY-MM-DD
r.get('/', async (req, res) => {
  const date = dateOr(req.query.date);
  const sets = await q(
    `SELECT s.*, e.name AS exercise_name
     FROM strength_logs s JOIN workout_exercises e ON e.id = s.exercise_id
     WHERE s.date = $1 ORDER BY s.exercise_id, s.set_number`,
    [date]
  );
  res.json({ date, sets });
});

// History for one exercise, newest first, one row per session.
// est_1rm uses the Epley formula: weight * (1 + reps / 30)
r.get('/:exerciseId', async (req, res) => {
  const exercise = await q1('SELECT * FROM workout_exercises WHERE id = $1', [req.params.exerciseId]);
  if (!exercise) {
    res.status(404).json({ error: 'exercise not found' });
    return;
  }
  const sessions = await q(
    `SELECT date,
            json_agg(json_build_object('id', id, 'set', set_number, 'weight_kg', weight_kg, 'reps', reps) ORDER BY set_number) AS sets,
            MAX(weight_kg) AS top_weight,
            SUM(weight_kg * reps) AS volume,
            ROUND(MAX(weight_kg * (1 + reps / 30.0)), 1) AS est_1rm
     FROM strength_logs WHERE exercise_id = $1
     GROUP BY date ORDER BY date DESC LIMIT 90`,
    [req.params.exerciseId]
  );
  res.json({ exercise, sessions });
});

/**
 * Log sets: { exercise_id, date?, sets: [{ weight_kg, reps }, ...] }
 * (for plank etc. use weight_kg 0 and reps = seconds)
 * Also ticks that exercise's todo for the date as done.
 */
r.post('/', async (req, res) => {
  const b = req.body ?? {};
  const date = dateOr(b.date);
  const sets: any[] = Array.isArray(b.sets) ? b.sets : [];
  if (!b.exercise_id || sets.length === 0) {
    res.status(400).json({ error: 'exercise_id and a non-empty sets array are required' });
    return;
  }

  const existing = await q1<{ n: number }>(
    'SELECT COUNT(*) AS n FROM strength_logs WHERE date = $1 AND exercise_id = $2',
    [date, b.exercise_id]
  );
  let n = existing?.n ?? 0;

  const saved = [];
  for (const s of sets) {
    n++;
    saved.push(
      await q1(
        `INSERT INTO strength_logs (date, exercise_id, set_number, weight_kg, reps)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [date, b.exercise_id, n, num(s.weight_kg), Math.round(num(s.reps))]
      )
    );
  }

  await q('UPDATE todos SET done = true WHERE date = $1 AND exercise_id = $2', [date, b.exercise_id]);
  res.status(201).json(saved);
});

r.delete('/sets/:id', async (req, res) => {
  await q('DELETE FROM strength_logs WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default r;
