const M = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
export const fmtDate = (s) => { if (!s) return "-"; const [y, m, d] = s.split("-"); return `${+d} ${M[+m - 1]} ${y}`; };
export const fmtPeriod = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} sampai ${fmtDate(b)}`);
export const fmtNum = (n) => String(n).replace(".", ",");
export const ROLE = { admin: "Admin", employee: "Karyawan", leader: "Ketua Divisi", hrd: "HRD" };
export const fmtDateTime = (d) => {
  const x = new Date(d), p = (n) => String(n).padStart(2, "0");
  return `${x.getDate()} ${M[x.getMonth()]} ${x.getFullYear()}, ${p(x.getHours())}.${p(x.getMinutes())}`;
};
