import { Router } from 'express';
import { q1 } from '../db';
import { numOrNull } from '../util';

const r = Router();

// Daily limits: calorie_max, carbs_max, fat_max are caps; protein_target, fiber_target are goals
r.get('/', async (_req, res) => {
  res.json(await q1('SELECT * FROM settings WHERE id = 1'));
});

r.put('/', async (req, res) => {
  const b = req.body ?? {};
  const row = await q1(
    `UPDATE settings SET
       calorie_max    = COALESCE($1, calorie_max),
       protein_target = COALESCE($2, protein_target),
       carbs_max      = COALESCE($3, carbs_max),
       fat_max        = COALESCE($4, fat_max),
       fiber_target   = COALESCE($5, fiber_target),
       goal_weight_kg = COALESCE($6, goal_weight_kg)
     WHERE id = 1 RETURNING *`,
    [
      numOrNull(b.calorie_max),
      numOrNull(b.protein_target),
      numOrNull(b.carbs_max),
      numOrNull(b.fat_max),
      numOrNull(b.fiber_target),
      numOrNull(b.goal_weight_kg),
    ]
  );
  res.json(row);
});

export default r;
