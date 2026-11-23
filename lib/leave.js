import { q1 } from "./db";
export const workingDays = async (s, e) =>
  (await q1(
    `SELECT COUNT(*)::int AS n FROM generate_series($1::date, $2::date, '1 day') d
     WHERE EXTRACT(DOW FROM d) NOT IN (0,6) AND d::date NOT IN (SELECT date FROM holidays)`, [s, e])).n;

export const canView = (u, r) =>
  ["admin", "hrd"].includes(u.role) || r.user_id === u.id ||
  (u.role === "leader" && r.edv === u.division_id);

export const getRequest = (id) =>
  q1(`SELECT r.*, t.name AS type_name, t.deducts_annual_quota AS ded, e.full_name AS emp_name,
        e.role AS erole, e.division_id AS edv, s.full_name AS sub_name
      FROM leave_requests r JOIN leave_types t ON t.id = r.leave_type_id
      JOIN users e ON e.id = r.user_id LEFT JOIN users s ON s.id = r.substitute_id
      WHERE r.id = $1`, [id]);
