import { Pool, types } from 'pg';

// Return DATE as 'YYYY-MM-DD' string, NUMERIC as number, BIGINT (COUNT) as number
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function q1<T = any>(text: string, params: any[] = []): Promise<T | undefined> {
  const rows = await q<T>(text, params);
  return rows[0];
}
