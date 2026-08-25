import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, UserPlus, CalendarCheck, HardDrive, ArrowRight, FolderOpen,
  CalendarDays, IdCard, Clock3, CheckCircle2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { PageLoader, Badge, STATUS_TONE } from "../components/ui";

// Fixed (non-templated) tone classes — Tailwind's JIT only picks up literal
// class names, so each tone is spelled out rather than built with `${tone}`.
const STAT_TONES = {
  brand: "bg-brand-50 text-brand-600",
  gold: "bg-gold-100 text-gold-700",
  green: "bg-emerald-50 text-emerald-600",
  violet: "bg-violet-50 text-violet-600",
};

const STATUS_COLORS = {
  present: "#10B981",
  absent: "#E11D48",
  "half-day": "#F5B301",
  leave: "#2563EB",
  wfh: "#60A5FA",
};

const Stat = ({ icon: Icon, label, value, sub, tone = "brand", progress }) => (
  <div className="card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
    <div className="flex items-start justify-between gap-3">
      <p className="eyebrow">{label}</p>
      <span className={`grid place-items-center w-9 h-9 rounded-xl shrink-0 ${STAT_TONES[tone]}`}>
        <Icon size={17} />
      </span>
    </div>
    <p className="font-mono text-[2rem] leading-none font-bold mt-3 text-ink">{value}</p>
    {progress !== undefined && (
      <div className="h-1.5 rounded-full bg-canvas overflow-hidden mt-3">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    )}
    {sub && <p className="text-xs text-muted mt-2">{sub}</p>}
  </div>
);

/* Completion ring — the one number HR opens this page for. */
const Ring = ({ value, total, label, caption }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-[116px] h-[116px] shrink-0">
        <svg viewBox="0 0 116 116" className="w-full h-full -rotate-90">
          <circle cx="58" cy="58" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="9" />
          <circle
            cx="58" cy="58" r={r} fill="none" stroke="#F5B301" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
            style={{ transition: "stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="font-mono text-2xl font-bold leading-none">{pct}%</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-brand-200 mt-1">{label}</span>
        </div>
      </div>
      <div className="text-sm text-brand-100 leading-relaxed max-w-[9rem]">{caption}</div>
    </div>
  );
};

const QuickLink = ({ to, icon: Icon, label }) => (
  <Link
    to={to}
    className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium
               hover:border-brand-300 hover:bg-brand-50/60 transition-colors"
  >
    <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50 text-brand-600">
      <Icon size={15} />
    </span>
    {label}
    <ArrowRight size={14} className="ml-auto text-muted transition-transform group-hover:translate-x-0.5" />
  </Link>
);

export default function Dashboard() {
  const { user, can } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const privileged = can("hr", "manager");

  useEffect(() => {
    (async () => {
      try {
        if (privileged) {
          const [stats, today, storage, pending] = await Promise.all([
            api.get("/employees/stats/overview").catch(() => ({ data: { data: {} } })),
            api.get("/attendance/summary"),
            api.get("/documents/storage").catch(() => ({ data: { data: null } })),
            api.get("/leaves?status=pending").catch(() => ({ data: { data: [] } })),
          ]);
          setData({
            ...stats.data.data,
            today: today.data.data,
            storage: storage.data.data,
            pending: pending.data.data || [],
          });
        } else {
          const now = new Date();
          const { data: mine } = await api.get(
            `/attendance/employee/${user.employee._id}?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
          );
          setData({ mine: mine.summary });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <PageLoader />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = user?.employee?.firstName || "there";
  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const marked = data.today?.marked ?? 0;
  const headcount = data.today?.headcount ?? 0;
  const unmarked = data.today?.unmarked ?? 0;

  const mine = data.mine || {};
  const myTotal = ["present", "absent", "half-day", "leave", "wfh"]
    .reduce((sum, k) => sum + (mine[k] || 0), 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-900 text-white p-6 sm:p-8 rise">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="pointer-events-none absolute -right-20 -top-24 w-72 h-72 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-20 w-64 h-64 rounded-full bg-gold-400/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-8">
          <div>
            <p className="eyebrow text-gold-300">{greeting}</p>
            <h1 className="font-display text-3xl sm:text-[2.5rem] leading-none font-extrabold mt-2">{name}</h1>
            <p className="text-sm text-brand-100 mt-2.5">{dateLabel}</p>

            {privileged && (
              <div className="flex flex-wrap gap-2 mt-5">
                {unmarked > 0 ? (
                  <Link to="/attendance" className="btn-gold">
                    Mark {unmarked} pending <ArrowRight size={14} />
                  </Link>
                ) : (
                  <span className="btn bg-white/10 text-white border border-white/15 cursor-default">
                    <CheckCircle2 size={15} className="text-emerald-300" /> Today&rsquo;s sheet is complete
                  </span>
                )}
                {data.pending?.length > 0 && (
                  <Link to="/leaves" className="btn bg-white/10 text-white border border-white/15 hover:bg-white/15">
                    <Clock3 size={15} /> {data.pending.length} leave request{data.pending.length > 1 ? "s" : ""}
                  </Link>
                )}
              </div>
            )}
          </div>

          {privileged ? (
            <Ring
              value={marked}
              total={headcount}
              label="marked"
              caption={`${marked} of ${headcount} employees marked on today's sheet.`}
            />
          ) : (
            <Ring
              value={(mine.present || 0) + (mine.wfh || 0)}
              total={myTotal || 1}
              label="attended"
              caption={`${mine.present ?? 0} days present so far this month.`}
            />
          )}
        </div>
      </section>

      {privileged ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={Users} label="Headcount" value={data.total ?? "—"} sub="Across all departments" tone="brand" />
            <Stat icon={UserPlus} label="Joined this month" value={data.newThisMonth ?? "—"} sub="New employee records" tone="violet" />
            <Stat
              icon={CalendarCheck}
              label="Marked today"
              value={`${marked}/${headcount}`}
              progress={headcount ? (marked / headcount) * 100 : 0}
              sub={unmarked ? `${unmarked} still pending` : "Sheet complete"}
              tone="green"
            />
            <Stat
              icon={HardDrive}
              label="Storage used"
              value={data.storage ? `${data.storage.percentUsed}%` : "—"}
              progress={data.storage ? Number(data.storage.percentUsed) : undefined}
              sub={data.storage ? `${data.storage.usedMB} MB of 512 MB · ${data.storage.files} files` : "Visible to HR"}
              tone="gold"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="eyebrow">Headcount by department</p>
                  <h3 className="font-display font-semibold mt-1">Where the team sits</h3>
                </div>
                <Badge tone="blue">{data.total ?? 0} total</Badge>
              </div>
              <ResponsiveContainer width="100%" height={252}>
                <BarChart data={data.byDept || []} margin={{ left: -20 }}>
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#93C5FD" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4EAF2" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#EFF6FF" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #E4EAF2", fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="url(#barFill)" radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <p className="eyebrow">Today</p>
              <h3 className="font-display font-semibold mt-1 mb-4">At a glance</h3>

              {/* Single stacked bar — the sheet in one line */}
              <div className="flex h-2 rounded-full overflow-hidden bg-canvas mb-5">
                {["present", "wfh", "half-day", "leave", "absent"].map((s) => {
                  const val = data.today?.[s] ?? 0;
                  if (!val || !headcount) return null;
                  return (
                    <span
                      key={s}
                      style={{ width: `${(val / headcount) * 100}%`, backgroundColor: STATUS_COLORS[s] }}
                      title={`${s}: ${val}`}
                    />
                  );
                })}
              </div>

              <div className="space-y-2.5">
                {["present", "absent", "half-day", "leave", "wfh"].map((s) => (
                  <div key={s} className="flex items-center justify-between">
                    <Badge tone={STATUS_TONE[s]}>{s}</Badge>
                    <span className="font-mono text-sm font-semibold">{data.today?.[s] ?? 0}</span>
                  </div>
                ))}
                <div className="pt-3 mt-3 border-t border-line flex items-center justify-between">
                  <span className="text-sm text-muted">Not marked</span>
                  <span className="font-mono text-sm font-semibold text-amber-600">{unmarked}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="eyebrow">Waiting on you</p>
                  <h3 className="font-display font-semibold mt-1">Leave requests</h3>
                </div>
                <Link to="/leaves" className="btn-ghost btn-sm">Open leave</Link>
              </div>

              {data.pending?.length ? (
                <ul className="divide-y divide-line">
                  {data.pending.slice(0, 4).map((l) => (
                    <li key={l._id} className="flex items-center gap-3 py-2.5">
                      <span className="ident w-[86px] shrink-0">{l.employee?.employeeId || "—"}</span>
                      <span className="text-sm font-medium truncate flex-1">
                        {l.employee?.firstName} {l.employee?.lastName}
                      </span>
                      <span className="hidden sm:inline text-xs text-muted capitalize">{l.leaveType}</span>
                      <span className="font-mono text-xs text-muted">
                        {new Date(l.fromDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {l.days > 1 ? ` +${l.days - 1}d` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted py-6 text-center">
                  Nothing pending. Approved leave lands on the attendance sheet automatically.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <QuickLink to="/attendance" icon={CalendarCheck} label="Open attendance sheet" />
              <QuickLink to="/employees" icon={Users} label="View employees" />
              <QuickLink to="/documents" icon={FolderOpen} label="Review documents" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={CalendarCheck} label="Present this month" value={mine.present ?? 0} tone="green" />
            <Stat icon={CalendarDays} label="Leave taken" value={mine.leave ?? 0} tone="brand" />
            <Stat icon={CalendarCheck} label="Payable days" value={mine.payableDays ?? 0} tone="gold" />
            <Stat icon={Clock3} label="Hours logged" value={mine.totalHours ?? 0} tone="violet" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <p className="eyebrow">This month</p>
              <h3 className="font-display font-semibold mt-1 mb-4">Your attendance</h3>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={200} className="max-w-[200px]">
                  <PieChart>
                    <Pie
                      data={["present", "absent", "half-day", "leave", "wfh"].map((k) => ({ name: k, value: mine[k] || 0 }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {["present", "absent", "half-day", "leave", "wfh"].map((k) => (
                        <Cell key={k} fill={STATUS_COLORS[k]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4EAF2", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 w-full space-y-2">
                  {["present", "absent", "half-day", "leave", "wfh"].map((s) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] }} />
                        <span className="capitalize text-muted">{s}</span>
                      </span>
                      <span className="font-mono font-semibold">{mine[s] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <QuickLink to={`/employees/${user?.employee?._id}`} icon={Users} label="My profile" />
              <QuickLink to="/leaves" icon={CalendarDays} label="Apply for leave" />
              <QuickLink to="/documents" icon={FolderOpen} label="My documents" />
              <QuickLink to={`/id-card/${user?.employee?._id}`} icon={IdCard} label="My ID card" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
