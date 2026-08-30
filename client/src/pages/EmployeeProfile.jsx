import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, IdCard, Camera, Pencil, FolderOpen, Lock, Trash2, ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import api, { msg } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { PageLoader, Avatar, Badge, STATUS_TONE, Alert, Spinner, EmptyState } from "../components/ui";
import EmployeeForm from "./EmployeeForm";
import DeleteEmployeeModal from "../components/DeleteEmployeeModal";

const Row = ({ k, v, mono }) => (
  <div className="flex justify-between gap-4 py-2 border-b border-line/60 last:border-0">
    <dt className="text-sm text-muted">{k}</dt>
    <dd className={`text-sm text-right ${mono ? "font-mono" : "font-medium"}`}>{v || "—"}</dd>
  </div>
);

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [emp, setEmp] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [month, setMonth] = useState(null);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(false);
  const [depts, setDepts] = useState([]);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    try {
      const now = new Date();
      const [e, c, m, d] = await Promise.all([
        api.get(`/employees/${id}`),
        api.get(`/documents/missing/${id}`).catch(() => ({ data: { data: null } })),
        api.get(`/attendance/employee/${id}?year=${now.getFullYear()}&month=${now.getMonth() + 1}`).catch(() => ({ data: { summary: null } })),
        api.get("/departments").catch(() => ({ data: { data: [] } })),
      ]);
      setEmp(e.data.data);
      setChecklist(c.data.data);
      setMonth(m.data.summary);
      setDepts(d.data.data);
    } catch (err) { setError(msg(err)); }
  };

  useEffect(() => { load(); }, [id]);

  const uploadPhoto = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/employees/${id}/photo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      location.reload();
    } catch (err) { setError(msg(err)); }
  };

  if (error) return <Alert>{error}</Alert>;
  if (!emp) return <PageLoader />;

  const name = `${emp.firstName} ${emp.lastName || ""}`.trim();

  const canBrowseEmployees = can("hr", "manager");

  return (
    <div className="space-y-5">
      <Link
        to={canBrowseEmployees ? "/employees" : "/"}
        className="text-sm text-muted hover:text-brand-700 inline-flex items-center gap-1"
      >
        <ArrowLeft size={14} /> {canBrowseEmployees ? "Back to employees" : "Back to dashboard"}
      </Link>

      {notice && (
        <div className="card p-4 flex flex-wrap items-center gap-4 border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-800">{notice}</p>
          <button onClick={() => setNotice("")} className="btn-ghost btn-sm ml-auto">Dismiss</button>
        </div>
      )}

      <div className="card p-6 flex flex-wrap items-center gap-5">
        <div className="relative">
          <Avatar id={emp._id} name={name} size={80} />
          <label className="absolute -bottom-1 -right-1 grid place-items-center w-8 h-8 rounded-xl bg-brand-600 text-white cursor-pointer hover:bg-brand-700 shadow-lift">
            <Camera size={14} />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadPhoto(e.target.files[0])} />
          </label>
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm text-muted">{emp.designation} · {emp.department?.name || "Unassigned"}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="ident text-base">{emp.employeeId}</span>
            <Badge tone={STATUS_TONE[emp.status]}>{emp.status}</Badge>
          </div>
        </div>

        <div className="ml-auto flex gap-2">
          <Link to={`/documents?employee=${emp._id}`} className="btn-ghost"><FolderOpen size={15} /> Documents</Link>
          <Link to={`/id-card/${emp._id}`} className="btn-ghost"><IdCard size={15} /> ID card</Link>
          {can("hr", "manager") ? (
            <button onClick={() => setEdit(true)} className="btn-primary"><Pencil size={15} /> Edit</button>
          ) : null}
          {can("hr") && (
            <button
              onClick={() => setRemoving(true)}
              className="btn-ghost hover:!bg-rose-50 hover:!border-rose-200 hover:!text-rose-700"
              title="Remove employee"
            >
              <Trash2 size={15} /> Remove
            </button>
          )}
          {!can("hr", "manager") && (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 h-10 text-xs text-muted"
              title="Only HR or your manager can update these details"
            >
              <Lock size={13} /> View only
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Job</h3>
          <dl>
            <Row k="Department" v={emp.department?.name} />
            <Row k="Designation" v={emp.designation} />
            <Row k="Employment type" v={emp.employmentType} />
            <Row k="Date of joining" v={emp.dateOfJoining && new Date(emp.dateOfJoining).toLocaleDateString("en-IN")} mono />
            <Row k="Reports to" v={emp.reportingTo ? `${emp.reportingTo.firstName} ${emp.reportingTo.lastName || ""}` : null} />
            <Row k="Work location" v={emp.workLocation} />
            {can("hr") && (
              <Row
                k="Fixed monthly salary"
                v={emp.fixedMonthlySalary != null && emp.fixedMonthlySalary !== "" ? `₹${Number(emp.fixedMonthlySalary).toLocaleString("en-IN")} / mo` : null}
                mono
              />
            )}
          </dl>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">Contact</h3>
          <dl>
            <Row k="Email" v={emp.email} />
            <Row k="Phone" v={emp.phone} mono />
            <Row k="City" v={emp.address?.city} />
            <Row k="Pincode" v={emp.address?.pincode} mono />
            <Row k="Emergency" v={emp.emergencyContact?.name} />
            <Row k="Emergency phone" v={emp.emergencyContact?.phone} mono />
          </dl>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">Identity &amp; bank</h3>
          <dl>
            <Row k="PAN" v={emp.pan} mono />
            <Row k="Aadhaar" v={emp.aadhaarNumber} mono />
            <Row k="Passport" v={emp.passportNumber} mono />
            <Row k="Bank account" v={emp.bankAccount?.accountNumber} mono />
            <Row k="IFSC" v={emp.bankAccount?.ifsc} mono />
            <Row k="Bank" v={emp.bankAccount?.bankName} />
          </dl>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold mb-3">This month</h3>
            {month ? (
              <div className="grid grid-cols-2 gap-3">
                {[["Present", month.present || 0], ["Absent", month.absent || 0],
                  ["Leave", month.leave || 0], ["Payable", month.payableDays || 0]].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-canvas p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted">{k}</p>
                    <p className="font-mono text-xl font-bold mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted">No attendance recorded yet.</p>}
          </div>

          {checklist && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Document checklist</h3>
              <div className="flex flex-wrap gap-1.5">
                {checklist.required.map((d) => (
                  <Badge key={d} tone={checklist.missing.includes(d) ? "amber" : "green"}>
                    {d.replace(/-/g, " ")}
                  </Badge>
                ))}
              </div>
              {checklist.missing.length > 0 && (
                <p className="text-xs text-muted mt-3">
                  {checklist.missing.length} document{checklist.missing.length > 1 ? "s" : ""} still to collect.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <MonthAttendance id={id} />

      <EmployeeForm
        open={edit}
        employee={emp}
        departments={depts}
        onClose={() => setEdit(false)}
        onSaved={() => { setEdit(false); load(); }}
      />

      <DeleteEmployeeModal
        open={removing}
        employee={emp}
        onClose={() => setRemoving(false)}
        onDone={(mode, message) => {
          setRemoving(false);
          if (mode === "permanent") {
            navigate("/employees", { state: { notice: message || "Employee deleted." } });
          } else {
            setNotice(message || "Employee marked as exited.");
            load();
          }
        }}
      />
    </div>
  );
}

const STATUS_LABEL = {
  present: "Present",
  absent: "Absent",
  "half-day": "Half day",
  leave: "Leave",
  wfh: "WFH",
  holiday: "Holiday",
  weekoff: "Week off",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function MonthAttendance({ id }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api
      .get(`/attendance/employee/${id}?year=${year}&month=${month}`)
      .then(({ data }) => {
        if (!alive) return;
        setSummary(data.summary);
        setRows(data.data || []);
      })
      .catch((err) => alive && setError(msg(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, year, month]);

  const shift = (delta) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <CalendarRange size={17} /> Monthly attendance
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="btn-ghost btn-sm" title="Previous month">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium w-[130px] text-center font-mono">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={() => shift(1)}
            disabled={year === now.getFullYear() && month === now.getMonth() + 1}
            className="btn-ghost btn-sm"
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          {[
            ["Present", summary.present || 0],
            ["Absent", summary.absent || 0],
            ["Half day", summary["half-day"] || 0],
            ["Leave", summary.leave || 0],
            ["WFH", summary.wfh || 0],
            ["Payable", summary.payableDays || 0],
            ["Hours", summary.totalHours || 0],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-canvas p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted">{k}</p>
              <p className="font-mono text-lg font-bold mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : !rows.length ? (
        <EmptyState title="No records" hint="Nothing marked for this employee in this month yet." />
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                <th className="th">Date</th>
                <th className="th">Day</th>
                <th className="th">Status</th>
                <th className="th">In</th>
                <th className="th">Out</th>
                <th className="th text-right">Hours</th>
                <th className="th">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = new Date(r.date);
                return (
                  <tr key={r._id}>
                    <td className="td font-mono">{d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                    <td className="td text-muted">{d.toLocaleDateString("en-IN", { weekday: "short" })}</td>
                    <td className="td">
                      <Badge tone={STATUS_TONE[r.status] || "slate"}>{STATUS_LABEL[r.status] || r.status}</Badge>
                    </td>
                    <td className="td font-mono">{r.checkIn || "—"}</td>
                    <td className="td font-mono">{r.checkOut || "—"}</td>
                    <td className="td text-right font-mono">{r.workHours ?? "—"}</td>
                    <td className="td text-muted">{r.remarks || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
