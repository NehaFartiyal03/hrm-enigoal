import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Plus, IdCard, Eye, Trash2 } from "lucide-react";
import api, { msg } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { PageLoader, Avatar, Badge, STATUS_TONE, EmptyState, Alert } from "../components/ui";
import EmployeeForm from "./EmployeeForm";
import DeleteEmployeeModal from "../components/DeleteEmployeeModal";

export default function Employees() {
  const { can } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [depts, setDepts] = useState([]);
  const [filters, setFilters] = useState({ search: "", department: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [issued, setIssued] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
      const [emp, dep] = await Promise.all([
        api.get(`/employees?${params}&limit=100`),
        api.get("/departments").catch(() => ({ data: { data: [] } })),
      ]);
      setList(emp.data.data);
      setDepts(dep.data.data);
    } catch (err) {
      setError(msg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, filters.search ? 350 : 0);
    return () => clearTimeout(t);
  }, [filters]);

  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted mt-1">
            Employee IDs are issued by the system when you save a new record — they can't be edited afterwards.
          </p>
        </div>
        {can("hr") && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary">
            <Plus size={16} /> Add employee
          </button>
        )}
      </div>

      {notice && (
        <div className="card p-4 flex flex-wrap items-center gap-4 border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-800">{notice}</p>
          <button onClick={() => setNotice("")} className="btn-ghost btn-sm ml-auto">Dismiss</button>
        </div>
      )}

      {issued && (
        <div className="card p-4 flex flex-wrap items-center gap-4 border-emerald-200 bg-emerald-50">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-700">Employee ID issued</p>
            <p className="font-mono text-2xl font-bold text-emerald-800 mt-0.5">{issued.employeeId}</p>
          </div>
          <div className="flex gap-2 ml-auto">
            <Link to={`/id-card/${issued._id}`} className="btn-ghost btn-sm"><IdCard size={14} /> View ID card</Link>
            <button onClick={() => setIssued(null)} className="btn-ghost btn-sm">Dismiss</button>
          </div>
        </div>
      )}

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="field pl-9"
            placeholder="Search by name, ID or email"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <select className="field w-auto min-w-[160px]" value={filters.department}
          onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
          <option value="">All departments</option>
          {depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select className="field w-auto min-w-[140px]" value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {["active", "probation", "notice", "resigned", "terminated"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? <PageLoader /> : !list.length ? (
        <div className="card">
          <EmptyState
            title="No employees match this view"
            hint="Clear the filters, or add your first employee to get started."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr>
                  <th className="th">Employee</th>
                  <th className="th">Employee ID</th>
                  <th className="th">Department</th>
                  <th className="th">Designation</th>
                  <th className="th">Joined</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e._id} className="hover:bg-brand-50/40">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar id={e._id} name={`${e.firstName} ${e.lastName || ""}`} size={36} />
                        <div>
                          <p className="font-medium">{e.firstName} {e.lastName}</p>
                          <p className="text-xs text-muted">{e.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td"><span className="ident">{e.employeeId}</span></td>
                    <td className="td">{e.department?.name || <span className="text-muted">—</span>}</td>
                    <td className="td">{e.designation || <span className="text-muted">—</span>}</td>
                    <td className="td font-mono text-xs">
                      {e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="td"><Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge></td>
                    <td className="td text-right whitespace-nowrap">
                      <Link to={`/employees/${e._id}`} className="btn-ghost btn-sm mr-1"><Eye size={13} /> Open</Link>
                      <Link to={`/id-card/${e._id}`} className="btn-ghost btn-sm"><IdCard size={13} /></Link>
                      {can("hr") && (
                        <button
                          onClick={() => setRemoving(e)}
                          className="btn-ghost btn-sm ml-1 hover:!bg-rose-50 hover:!border-rose-200 hover:!text-rose-700"
                          title="Remove employee"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EmployeeForm
        open={formOpen}
        employee={editing}
        departments={depts}
        onClose={() => setFormOpen(false)}
        onSaved={(emp, isNew) => {
          setFormOpen(false);
          if (isNew) setIssued(emp);
          load();
        }}
      />

      <DeleteEmployeeModal
        open={!!removing}
        employee={removing}
        onClose={() => setRemoving(null)}
        onDone={(mode, message) => {
          setRemoving(null);
          setNotice(message || (mode === "permanent" ? "Employee deleted." : "Employee marked as exited."));
          load();
        }}
      />
    </div>
  );
}
