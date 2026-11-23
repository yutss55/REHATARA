import pg from "pg";
pg.types.setTypeParser(1082, (v) => v);          // DATE tetap string YYYY-MM-DD
pg.types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC jadi number
const g = globalThis;
export const pool = g._pgPool || (g._pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL }));
export const q = (text, params = []) => pool.query(text, params).then((r) => r.rows);
export const q1 = async (text, params = []) => (await q(text, params))[0];
export async function tx(fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await fn((t, p = []) => c.query(t, p).then((x) => x.rows));
    await c.query("COMMIT");
    return r;
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}
