const APP_TZ = process.env.APP_TZ || 'Asia/Kolkata';

// 'YYYY-MM-DD' for today in APP_TZ
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: APP_TZ });

export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export const dateOr = (s: unknown): string => (isDate(s) ? s : today());

// number or default (multipart bodies send everything as strings)
export const num = (v: unknown, def = 0): number => {
  if (v === undefined || v === null || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export const numOrNull = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const bool = (v: unknown): boolean | null => {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return null;
};

export const r2 = (n: number) => Math.round(n * 100) / 100;

// ISO day of week for a 'YYYY-MM-DD' string: 1 = Mon ... 7 = Sun
export const isoDow = (date: string) => {
  const d = new Date(date + 'T00:00:00Z').getUTCDay();
  return d === 0 ? 7 : d;
};
