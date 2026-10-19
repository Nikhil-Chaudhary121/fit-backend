import 'dotenv/config';
import { pool, q, q1 } from './db';
import { SCHEMA, PLAN } from './schema';

async function main() {
  await pool.query(SCHEMA);

  const existing = await q1<{ n: number }>('SELECT COUNT(*) AS n FROM workout_days');
  if (existing && existing.n > 0) {
    console.log('Schema ready (workout plan already seeded).');
    return;
  }

  for (const day of PLAN) {
    const row = await q1<{ id: number }>(
      'INSERT INTO workout_days (dow, name) VALUES ($1, $2) RETURNING id',
      [day.dow, day.name]
    );
    let pos = 0;
    for (const [name, sets, min, max, unit, notes] of day.ex) {
      await q(
        `INSERT INTO workout_exercises (day_id, name, sets, rep_min, rep_max, unit, notes, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [row!.id, name, sets, min, max, unit ?? 'reps', notes ?? null, pos++]
      );
    }
  }
  console.log('Schema ready, workout plan seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
