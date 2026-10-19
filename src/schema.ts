export const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  calorie_max    NUMERIC(8,2) NOT NULL DEFAULT 2000,
  protein_target NUMERIC(8,2) NOT NULL DEFAULT 150,
  carbs_max      NUMERIC(8,2) NOT NULL DEFAULT 200,
  fat_max        NUMERIC(8,2) NOT NULL DEFAULT 60,
  fiber_target   NUMERIC(8,2) NOT NULL DEFAULT 30,
  goal_weight_kg NUMERIC(5,2)
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS foods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  serving TEXT NOT NULL DEFAULT '1 serving',
  calories NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein  NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs    NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat      NUMERIC(8,2) NOT NULL DEFAULT 0,
  fiber    NUMERIC(8,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A log row stores a snapshot of the macros (already multiplied by servings)
CREATE TABLE IF NOT EXISTS food_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  meal TEXT NOT NULL DEFAULT 'snack',
  food_id INT REFERENCES foods(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  servings NUMERIC(6,2) NOT NULL DEFAULT 1,
  calories NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein  NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs    NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat      NUMERIC(8,2) NOT NULL DEFAULT 0,
  fiber    NUMERIC(8,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS food_logs_date_idx ON food_logs(date);

CREATE TABLE IF NOT EXISTS workout_days (
  id SERIAL PRIMARY KEY,
  dow INT NOT NULL UNIQUE CHECK (dow BETWEEN 1 AND 7), -- 1 = Mon ... 7 = Sun
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id SERIAL PRIMARY KEY,
  day_id INT NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INT NOT NULL DEFAULT 3,
  rep_min INT NOT NULL DEFAULT 8,
  rep_max INT NOT NULL DEFAULT 12,
  unit TEXT NOT NULL DEFAULT 'reps', -- 'reps' or 'sec'
  notes TEXT,
  position INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true -- delete = soft delete so strength history stays
);

-- one row per date once that day's workout todos were generated
CREATE TABLE IF NOT EXISTS todo_days (date DATE PRIMARY KEY);

CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'custom', -- 'workout' | 'rest' | 'custom'
  exercise_id INT REFERENCES workout_exercises(id) ON DELETE SET NULL,
  target_sets INT,
  target_reps TEXT,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS todos_date_idx ON todos(date);

CREATE TABLE IF NOT EXISTS strength_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  exercise_id INT NOT NULL REFERENCES workout_exercises(id),
  set_number INT NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0,
  reps INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS strength_ex_idx ON strength_logs(exercise_id, date);

CREATE TABLE IF NOT EXISTS body_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  weight_kg NUMERIC(5,2),
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

type Ex = [name: string, sets: number, min: number, max: number, unit?: 'reps' | 'sec', notes?: string];

export const PLAN: { dow: number; name: string; ex: Ex[] }[] = [
  {
    dow: 1,
    name: 'Push A (upper chest)',
    ex: [
      ['Incline DB press', 3, 8, 10],
      ['Chest press machine', 3, 8, 12],
      ['Low-to-high cable fly', 3, 12, 15],
      ['Shoulder press machine', 3, 8, 10],
      ['Cable lateral raise', 4, 12, 20],
      ['Overhead rope triceps extension', 3, 10, 15],
    ],
  },
  {
    dow: 2,
    name: 'Pull A (width)',
    ex: [
      ['Wide-grip lat pulldown', 4, 8, 12],
      ['Straight-arm cable pulldown', 3, 12, 15],
      ['Chest-supported machine row', 3, 8, 12],
      ['Rear delt fly or face pull', 3, 15, 20],
      ['Incline DB curl', 3, 10, 12],
      ['Hammer curl', 2, 10, 12],
    ],
  },
  {
    dow: 3,
    name: 'Legs A + core',
    ex: [
      ['Leg press', 4, 10, 12],
      ['Leg curl', 3, 10, 12, 'reps', 'if available'],
      ['Leg extension', 3, 10, 12, 'reps', 'if available'],
      ['Calf raise', 4, 12, 15],
      ['Cable crunch', 3, 12, 15],
      ['Plank', 3, 30, 45, 'sec'],
    ],
  },
  {
    dow: 4,
    name: 'Push B (shoulders)',
    ex: [
      ['Cable lateral raise', 5, 12, 20, 'reps', 'do this first'],
      ['Incline DB press', 3, 10, 12],
      ['DB or machine shoulder press', 3, 8, 12],
      ['Cable fly', 3, 12, 15],
      ['Triceps pushdown', 3, 10, 12],
    ],
  },
  {
    dow: 5,
    name: 'Pull B (thickness)',
    ex: [
      ['Neutral or close-grip pulldown', 3, 10, 12],
      ['Single-arm cable row', 3, 10, 12, 'reps', 'per side'],
      ['Close-grip machine row', 3, 8, 12],
      ['Rear delt fly', 3, 15, 20],
      ['Preacher curl', 3, 10, 12, 'reps', 'one arm at a time'],
      ['Shrugs', 2, 12, 12, 'reps', 'optional'],
    ],
  },
  {
    dow: 6,
    name: 'Legs B + core',
    ex: [
      ['Leg press (feet high)', 3, 10, 12],
      ['DB Romanian deadlift', 3, 10, 10, 'reps', 'light, form first'],
      ['Calf raise', 4, 12, 15],
      ['Leg raises', 3, 10, 15],
      ['Plank', 3, 30, 45, 'sec'],
    ],
  },
  { dow: 7, name: 'Rest (walk + outing)', ex: [] },
];
