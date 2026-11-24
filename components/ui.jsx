export const inp = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600";
export const btn = "rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1";
export const btn2 = "inline-block rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50";
export const btnR = "rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50";

export const Card = ({ children, className = "" }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>{children}</section>
);
const SC = { pending: "bg-amber-100 text-amber-800", approved_leader: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800", cancelled: "bg-slate-200 text-slate-600" };
export const SL = { pending: "Pending", approved_leader: "Approved by Leader", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled" };
export const Status = ({ s }) => <Badge c={SC[s]}>{SL[s]}</Badge>;
export const Badge = ({ children, c = "bg-slate-200 text-slate-700" }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}`}>{children}</span>
);
export const Alert = ({ err, ok }) =>
  err || ok ? <p role="alert" className={`mb-4 rounded-lg px-4 py-2 text-sm ${err ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>{err || ok}</p> : null;
export const Field = ({ label, children, className = "" }) => (
  <label className={`block text-xs font-semibold text-slate-600 ${className}`}>{label}<span className="mt-1 block font-normal">{children}</span></label>
);
export const Title = ({ title, sub, children }) => (
  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div><h1 className="text-2xl font-bold">{title}</h1>{sub && <p className="text-sm text-slate-500">{sub}</p>}</div>{children}
  </div>
);
export const Th = ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</th>;
export const Td = ({ children, className = "" }) => <td className={`border-t border-slate-100 px-3 py-3 align-top text-sm ${className}`}>{children}</td>;
export const Table = ({ head, children }) => (
  <div className="overflow-x-auto"><table className="w-full"><thead><tr>{head.map((h) => <Th key={h}>{h}</Th>)}</tr></thead><tbody>{children}</tbody></table></div>
);
