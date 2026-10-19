import { Router } from 'express';
import { q, q1 } from '../db';
import { upload, imageUrl } from '../upload';
import { num, numOrNull } from '../util';

const r = Router();

// Saved foods (your own food library). Macros are per `serving`.
r.get('/', async (req, res) => {
  const search = typeof req.query.q === 'string' ? req.query.q : '';
  res.json(await q('SELECT * FROM foods WHERE name ILIKE $1 ORDER BY name LIMIT 100', [`%${search}%`]));
});

// multipart or JSON. Image field name: "image"
r.post('/', upload.single('image'), async (req, res) => {
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const row = await q1(
    `INSERT INTO foods (name, serving, calories, protein, carbs, fat, fiber, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [b.name, b.serving || '1 serving', num(b.calories), num(b.protein), num(b.carbs), num(b.fat), num(b.fiber), imageUrl(req.file)]
  );
  res.status(201).json(row);
});

r.patch('/:id', upload.single('image'), async (req, res) => {
  const b = req.body ?? {};
  const row = await q1(
    `UPDATE foods SET
       name = COALESCE($1, name), serving = COALESCE($2, serving),
       calories = COALESCE($3, calories), protein = COALESCE($4, protein),
       carbs = COALESCE($5, carbs), fat = COALESCE($6, fat), fiber = COALESCE($7, fiber),
       image_url = COALESCE($8, image_url)
     WHERE id = $9 RETURNING *`,
    [
      b.name ?? null, b.serving ?? null,
      numOrNull(b.calories), numOrNull(b.protein), numOrNull(b.carbs), numOrNull(b.fat), numOrNull(b.fiber),
      imageUrl(req.file), req.params.id,
    ]
  );
  if (!row) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  res.json(row);
});

r.delete('/:id', async (req, res) => {
  await q('DELETE FROM foods WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

export default r;
