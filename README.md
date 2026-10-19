# Fit backend (v1)

Node + TypeScript + Express 5 + PostgreSQL. Single user, no auth yet.
Tracks food/macros (manual entry + photos), your weekly workout plan, a daily todo list generated from it,
strength per set, and daily body weight + photo.

## Run it

```bash
npm install
cp .env.example .env        # set DATABASE_URL (local Postgres or Neon)
npm run migrate             # creates tables + seeds your weekly plan
npm run dev                 # http://localhost:3000
```

From the React Native app: Android emulator uses `http://10.0.2.2:3000`, a real phone uses your PC's LAN IP
(`http://192.168.x.x:3000`). Image fields come back as relative paths like `/uploads/123.jpg`,
so show them as `${API}${image_url}`.

Dates are always `YYYY-MM-DD`. If you leave `date` out, the server uses today in `APP_TZ` (default Asia/Kolkata).

## Endpoints

| Area | Endpoint | Notes |
|---|---|---|
| Home | `GET /api/summary?date=` | macros eaten vs limits, remaining, todo progress, today's weight/photo |
| Limits | `GET/PUT /api/settings` | `calorie_max, carbs_max, fat_max` (caps), `protein_target, fiber_target` (goals), `goal_weight_kg` |
| Foods | `GET /api/foods?q=` | your saved food library |
| | `POST /api/foods` | multipart or JSON: `name, serving, calories, protein, carbs, fat, fiber`, file field `image` |
| | `PATCH/DELETE /api/foods/:id` | |
| Food log | `GET /api/food-logs?date=` | logs + day totals |
| | `POST /api/food-logs` | saved food: `{food_id, servings, meal, date}`. Manual: `{name, calories, protein, carbs, fat, fiber, servings, meal, date}` + optional `image`; add `save_as_food=true` to also keep it in the library |
| | `DELETE /api/food-logs/:id` | |
| Plan | `GET /api/plan` | 7 days (1=Mon..7=Sun) with exercises, sets, rep range |
| | `POST /api/plan/days/:dayId/exercises` | `{name, sets, rep_min, rep_max, unit: 'reps'\|'sec', notes}` |
| | `PATCH/DELETE /api/plan/exercises/:id` | delete is soft, history stays |
| Todos | `GET /api/todos?date=` | first call for a date creates that weekday's workout todos with target sets x reps (Sunday gets a rest/walk todo) |
| | `POST /api/todos` | custom todo `{title, date?}` |
| | `PATCH /api/todos/:id` | `{done?, title?}` |
| | `DELETE /api/todos/:id` | |
| Strength | `POST /api/strength` | `{exercise_id, date?, sets: [{weight_kg, reps}]}` and ticks that exercise's todo done. Plank: weight 0, reps = seconds |
| | `GET /api/strength?date=` | sets logged that day |
| | `GET /api/strength/:exerciseId` | history per session: top weight, volume, estimated 1RM |
| | `DELETE /api/strength/sets/:id` | |
| Body | `POST /api/body` | multipart `date?, weight_kg?, photo?` (one row per date, send either or both) |
| | `GET /api/body?limit=90` | newest first |
| | `DELETE /api/body/:date` | |

## React Native image upload

```ts
const form = new FormData();
form.append('name', 'Paneer 100g');
form.append('calories', '265');
form.append('protein', '18');
form.append('image', { uri: photo.uri, name: 'food.jpg', type: 'image/jpeg' } as any);
await fetch(`${API}/api/foods`, { method: 'POST', body: form }); // don't set Content-Type yourself
```

## Before you deploy

There is no login, anyone who can reach the server can read and write everything. Add auth (even one shared
token header) before putting it on the internet. Uploaded photos live in `./uploads` on disk, move them to
object storage if the host has an ephemeral filesystem.
