import { q1 } from './db';

export type Totals = { calories: number; protein: number; carbs: number; fat: number; fiber: number };

export async function dayTotals(date: string): Promise<Totals> {
  const row = await q1<Totals>(
    `SELECT COALESCE(SUM(calories),0) AS calories, COALESCE(SUM(protein),0) AS protein,
            COALESCE(SUM(carbs),0) AS carbs, COALESCE(SUM(fat),0) AS fat, COALESCE(SUM(fiber),0) AS fiber
     FROM food_logs WHERE date = $1`,
    [date]
  );
  return row!;
}
