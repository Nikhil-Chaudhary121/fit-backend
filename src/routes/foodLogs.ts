import { Router } from 'express';
import { q, q1 } from '../db';
import { upload, imageUrl } from '../upload';
import { dateOr, num, r2, bool } from '../util';
import { dayTotals } from '../totals';

const r = Router();
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];

// GET /api/food-logs?date=YYYY-MM-DD  (default today)
r.get('/', async (req, res) => {
  const date = dateOr(req.query.date);
  const logs = await q('SELECT * FROM food_logs WHERE date = $1 ORDER BY created_at, id', [date]);
  res.json({ date, logs, totals: await dayTotals(date) });
});

/**
 * Two ways to log:
 *  1) from a saved food:  { food_id, servings, meal, date }
 *  2) manual entry:       { name, calories, protein, carbs, fat, fiber, servings, meal, date, image? }
 *     add save_as_food=true to also store it in your foods library for next time
 * Macros are per serving and get multiplied by `servings`.
 */
r.post('/', upload.single('image'), async (req, res) => {
  const b = req.body ?? {};
  const date = dateOr(b.date);
  const meal = MEALS.includes(b.meal) ? b.meal : 'snack';
  const servings = num(b.servings, 1);

  let foodId: number | null = null;
  let base: { name: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; image_url: string | null };

  if (b.food_id) {
    const f = await q1('SELECT * FROM foods WHERE id = $1', [b.food_id]);
    if (!f) {
      res.status(404).json({ error: 'food not found' });
      return;
    }
    foodId = f.id;
    base = { name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber, image_url: imageUrl(req.file) ?? f.image_url };
  } else {
    if (!b.name) {
      res.status(400).json({ error: 'name or food_id is required' });
      return;
    }
    base = {
      name: b.name,
      calories: num(b.calories), protein: num(b.protein), carbs: num(b.carbs), fat: num(b.fat), fiber: num(b.fiber),
      image_url: imageUrl(req.file),
    };
    if (bool(b.save_as_food)) {
      const f = await q1(
        `INSERT INTO foods (name, serving, calories, protein, carbs, fat, fiber, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [base.name, b.serving_label || '1 serving', base.calories, base.protein, base.carbs, base.fat, base.fiber, base.image_url]
      );
      foodId = f!.id;
    }
  }

  const row = await q1(
    `INSERT INTO food_logs (date, meal, food_id, name, servings, calories, protein, carbs, fat, fiber, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      date, meal, foodId, base.name, servings,
      r2(base.calories * servings), r2(base.protein * servings), r2(base.carbs * servings),
      r2(base.fat * servings), r2(base.fiber * servings), base.image_url,
    ]
  );
  res.status(201).json(row);
});

r.delete('/:id', async (req, res) => {
  await q('DELETE FROM food_logs WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default r;
