import { Router } from 'express';
import { q, q1 } from '../db';
import { upload, imageUrl } from '../upload';
import { dateOr, numOrNull, num } from '../util';

const r = Router();

// GET /api/body?limit=90  newest first (weight + daily photo)
r.get('/', async (req, res) => {
  const limit = Math.min(Math.max(Math.round(num(req.query.limit, 90)), 1), 730);
  res.json(await q('SELECT * FROM body_logs ORDER BY date DESC LIMIT $1', [limit]));
});

// One entry per date (upsert). multipart: date?, weight_kg?, photo?
// Sending only the photo keeps the existing weight and vice versa.
r.post('/', upload.single('photo'), async (req, res) => {
  const b = req.body ?? {};
  const date = dateOr(b.date);
  const weight = numOrNull(b.weight_kg);
  const photo = imageUrl(req.file);
  if (weight === null && !photo) {
    res.status(400).json({ error: 'send weight_kg and/or a photo' });
    return;
  }
  const row = await q1(
    `INSERT INTO body_logs (date, weight_kg, photo_url) VALUES ($1,$2,$3)
     ON CONFLICT (date) DO UPDATE SET
       weight_kg = COALESCE(EXCLUDED.weight_kg, body_logs.weight_kg),
       photo_url = COALESCE(EXCLUDED.photo_url, body_logs.photo_url)
     RETURNING *`,
    [date, weight, photo]
  );
  res.status(201).json(row);
});

r.delete('/:date', async (req, res) => {
  await q('DELETE FROM body_logs WHERE date = $1', [req.params.date]);
  res.status(204).end();
});

export default r;
