import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCheck, Save, FileDown, Search } from "lucide-react";
import api, { msg } from "../api/axios";
import { PageLoader, Avatar, Alert, Spinner, EmptyState } from "../components/ui";

const OPTIONS = [
  { key: "present", short: "P", cls: "bg-emerald-600" },
  { key: "absent", short: "A", cls: "bg-rose-600" },
  { key: "half-day", short: "H", cls: "bg-amber-500" },
  { key: "leave", short: "L", cls: "bg-brand-600" },
  { key: "wfh", short: "W", cls: "bg-indigo-600" },
];

const iso = (d) => new Date(d).toISOString().slice(0, 10);

export default function Attendance() {
  const [date, setDate] = useState(iso(new Date()));
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({});
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/attendance/sheet?date=${date}`);
      setRows(data.data);
      setMeta({ marked: data.marked, total: data.total, isWeekend: data.isWeekend });
      const d = {};
      data.data.forEach((r) => {
        if (r.attendance) {
          d[r.employee._id] = {
            status: r.attendance.status,
            checkIn: r.attendance.checkIn || "",
            checkOut: r.attendance.checkOut || "",
          };
        }
      });
      setDraft(d);
    } catch (err) {
      setError(msg(err));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const setStatus = (id, status) =>
    setDraft((p) => ({
      ...p,
      [id]: {
        checkIn: status === "present" || status === "wfh" ? p[id]?.checkIn || "09:30" : "",
        checkOut: status === "present" || status === "wfh" ? p[id]?.checkOut || "18:30" : "",
        ...p[id],
        status,
      },
    }));

  const setTime = (id, key, value) =>
    setDraft((p) => ({ ...p, [id]: { ...p[id], [key]: value } }));

  const fillAll = (status) => {
    const next = { ...draft };
    rows.forEach((r) => {
      if (!next[r.employee._id]?.status) {
        next[r.employee._id] = {
          status,
          checkIn: status === "present" ? "09:30" : "",
          checkOut: status === "present" ? "18:30" : "",
        };
      }
    });
    setDraft(next);
    setNote("Unmarked rows filled. Adjust the exceptions, then save.");
  };

  const save = async () => {
    const records = Object.entries(draft)
      .filter(([, v]) => v.status)
      .map(([employee, v]) => ({ employee, ...v }));
    if (!records.length) return setError("Mark at least one employee before saving.");

    setSaving(true);
    setError("");
    setNote("");
    try {
      const { data } = await api.post("/attendance/bulk", { date, records });
      setNote(data.message);
      load();
    } catch (err) {
      setError(msg(err));
    } finally {
      setSaving(false);
    }
  };

  const pending = rows.length - Object.values(draft).filter((d) => d.status).length;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      ({ employee }) =>
        employee.name?.toLowerCase().includes(q) ||
        employee.employeeId?.toLowerCase().includes(q) ||
        employee.designation?.toLowerCase().includes(q) ||
        employee.department?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance sheet</h1>
          <p className="text-sm text-muted mt-1">
            Mark the whole team for one day. Saving again updates the same records — it never duplicates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field pl-9 w-[200px]"
            />
          </div>
          <div className="relative">
            <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="date"
              max={iso(new Date())}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field pl-9 w-[170px]"
            />
          </div>
          <button onClick={() => fillAll("present")} className="btn-ghost">
            <CheckCheck size={16} /> Fill unmarked as present
          </button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Spinner /> : <Save size={16} />} Save sheet
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="card px-3 py-1.5">
          Marked <b className="font-mono">{meta.marked ?? 0}</b> of <b className="font-mono">{meta.total ?? 0}</b>
        </span>
        {pending > 0 && (
          <span className="card px-3 py-1.5 text-amber-700 border-amber-200 bg-amber-50">
            <b className="font-mono">{pending}</b> unmarked in this view
          </span>
        )}
        {meta.isWeekend && (
          <span className="card px-3 py-1.5 text-muted">Sunday — the system marks unfilled rows as week off at 11:55 PM</span>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      {note && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-sm text-emerald-700">
          {note}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : !rows.length ? (
        <div className="card">
          <EmptyState title="No active employees" hint="Add employees first — they'll appear here automatically." />
        </div>
      ) : !filteredRows.length ? (
        <div className="card">
          <EmptyState title="No match" hint={`No employee found for "${search}".`} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className="th">Employee</th>
                  <th className="th w-[320px]">Status</th>
                  <th className="th w-[210px]">In / Out</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ employee, attendance }) => {
                  const d = draft[employee._id] || {};
                  const timed = d.status === "present" || d.status === "wfh";
                  return (
                    <tr key={employee._id} className={d.status ? "" : "bg-amber-50/40"}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar id={employee._id} name={employee.name} size={36} />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{employee.name}</p>
                            <p className="ident">{employee.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <div className="inline-flex rounded-xl border border-line overflow-hidden">
                          {OPTIONS.map((o) => {
                            const active = d.status === o.key;
                            return (
                              <button
                                key={o.key}
                                onClick={() => setStatus(employee._id, o.key)}
                                title={o.key}
                                className={`w-10 h-9 text-xs font-bold font-mono border-r border-line last:border-r-0 transition-colors ${
                                  active ? `${o.cls} text-white` : "bg-surface text-muted hover:bg-brand-50"
                                }`}
                              >
                                {o.short}
                              </button>
                            );
                          })}
                        </div>
                        {attendance && (
                          <span className="ml-3 text-[11px] text-muted">saved</span>
                        )}
                      </td>
                      <td className="td">
                        {timed ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={d.checkIn || ""}
                              onChange={(e) => setTime(employee._id, "checkIn", e.target.value)}
                              className="field h-9 w-[92px] px-2 font-mono text-xs"
                            />
                            <span className="text-muted">–</span>
                            <input
                              type="time"
                              value={d.checkOut || ""}
                              onChange={(e) => setTime(employee._id, "checkOut", e.target.value)}
                              className="field h-9 w-[92px] px-2 font-mono text-xs"
                            />
                          </div>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-canvas/60">
            <p className="text-xs text-muted">P present · A absent · H half day · L leave · W work from home</p>
            <button onClick={save} disabled={saving} className="btn-primary btn-sm">
              {saving ? <Spinner /> : <Save size={14} />} Save sheet
            </button>
          </div>
        </div>
      )}

      <MonthlyReport />
    </div>
  );
}

function MonthlyReport() {
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(iso(now));
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { data } = await api.get(`/attendance/report?from=${from}&to=${to}`);
      setRows(data.data);
    } finally {
      setBusy(false);
    }
  };

  const csv = () => {
    const head = "Employee ID,Name,Present,Absent,Half day,Leave,WFH,Payable days,Hours";
    const body = rows
      .map((r) => [r.employeeId, r.name, r.present, r.absent, r.halfDay, r.leave, r.wfh, r.payableDays, r.hours || 0].join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`${head}\n${body}`], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold">Period report</h3>
          <p className="text-sm text-muted mt-0.5">Payable days for payroll, over any date range.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field w-[150px]" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field w-[150px]" />
          <button onClick={run} disabled={busy} className="btn-ghost">{busy ? <Spinner /> : null} Run</button>
          {rows?.length > 0 && (
            <button onClick={csv} className="btn-primary"><FileDown size={16} /> Export CSV</button>
          )}
        </div>
      </div>

      {rows && (rows.length ? (
        <div className="overflow-x-auto mt-4 -mx-5">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="th">Employee</th>
                {["Present", "Absent", "Half", "Leave", "WFH", "Payable", "Hours"].map((h) => (
                  <th key={h} className="th text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employeeId}>
                  <td className="td">
                    <p className="font-medium">{r.name}</p>
                    <p className="ident">{r.employeeId}</p>
                  </td>
                  {[r.present, r.absent, r.halfDay, r.leave, r.wfh, r.payableDays, (r.hours || 0).toFixed(1)].map((v, i) => (
                    <td key={i} className="td text-right font-mono">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted mt-4">No attendance recorded in this range.</p>
      ))}
    </div>
  );
}
