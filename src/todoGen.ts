import { q, q1 } from './db';
import { isoDow } from './util';

const repsLabel = (e: any) => {
  const u = e.unit === 'sec' ? ' sec' : '';
  return e.rep_min === e.rep_max ? `${e.rep_min}${u}` : `${e.rep_min}-${e.rep_max}${u}`;
};

// Creates the day's workout todos from the weekly plan, once per date.
// Later plan edits don't touch days that were already generated.
export async function ensureWorkoutTodos(date: string) {
  const claimed = await q1('INSERT INTO todo_days (date) VALUES ($1) ON CONFLICT DO NOTHING RETURNING date', [date]);
  if (!claimed) return;

  const day = await q1('SELECT * FROM workout_days WHERE dow = $1', [isoDow(date)]);
  if (!day) return;

  const exercises = await q(
    'SELECT * FROM workout_exercises WHERE day_id = $1 AND active ORDER BY position, id',
    [day.id]
  );

  if (exercises.length === 0) {
    await q(`INSERT INTO todos (date, title, kind) VALUES ($1, $2, 'rest')`, [date, 'Rest day: walk + outing']);
    return;
  }

  for (const e of exercises) {
    await q(
      `INSERT INTO todos (date, title, kind, exercise_id, target_sets, target_reps)
       VALUES ($1, $2, 'workout', $3, $4, $5)`,
      [date, e.name, e.id, e.sets, repsLabel(e)]
    );
  }
}
