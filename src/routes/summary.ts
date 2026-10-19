import { Router } from 'express';
import { q, q1 } from '../db';
import { dateOr, r2 } from '../util';
import { dayTotals } from '../totals';
import { ensureWorkoutTodos } from '../todoGen';

const r = Router();

// One call for the app's home screen: macros eaten vs limits, todo progress, today's weight/photo
r.get('/', async (req, res) => {
  const date = dateOr(req.query.date);
  await ensureWorkoutTodos(date);

  const [totals, settings, todos, body] = await Promise.all([
    dayTotals(date),
    q1('SELECT * FROM settings WHERE id = 1'),
    q('SELECT done FROM todos WHERE date = $1', [date]),
    q1('SELECT * FROM body_logs WHERE date = $1', [date]),
  ]);

  // limit - eaten. For caps (calories, carbs, fat) negative = over the cap.
  // For goals (protein, fiber) positive = still to eat.
  const remaining = {
    calories: r2(settings.calorie_max - totals.calories),
    protein: r2(settings.protein_target - totals.protein),
    carbs: r2(settings.carbs_max - totals.carbs),
    fat: r2(settings.fat_max - totals.fat),
    fiber: r2(settings.fiber_target - totals.fiber),
  };

  res.json({
    date,
    totals,
    limits: settings,
    remaining,
    todos: { done: todos.filter((t) => t.done).length, total: todos.length },
    body: body ?? null,
  });
});

export default r;
