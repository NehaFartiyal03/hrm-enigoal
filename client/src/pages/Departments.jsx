import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Users2 } from "lucide-react";
import api, { msg } from "../api/axios";
import { PageLoader, EmptyState, Alert, Spinner, Modal, Field } from "../components/ui";
import { departmentMeta } from "../utils/departments";

const ICON_TONE = {
  rose: "bg-rose-50 text-rose-600",
  blue: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  gold: "bg-gold-50 text-gold-700",
  slate: "bg-slate-100 text-slate-600",
};

const RING_TONE = {
  rose: "from-rose-500/10 to-rose-500/0",
  blue: "from-brand-500/10 to-brand-500/0",
  green: "from-emerald-500/10 to-emerald-500/0",
  gold: "from-gold-500/10 to-gold-500/0",
  slate: "from-slate-500/10 to-slate-500/0",
};

export default function Departments() {
  const [list, setList] = useState([]);
  const [counts, setCounts] = useState({});
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const [editTarget, setEditTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/departments");
      setList(data.data);

      const { data: avail } = await api.get("/departments/available").catch(() => ({ data: { data: [] } }));
      setAvailable(avail.data);

      // Headcount per department, fetched in parallel — cheap since there are only ever four.
      const pairs = await Promise.all(
        data.data.map((d) =>
          api.get(`/employees?department=${d._id}&limit=1`)
            .then((r) => [d._id, r.data.total || 0])
            .catch(() => [d._id, 0])
        )
      );
      setCounts(Object.fromEntries(pairs));
    } catch (err) {
      setError(msg(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!selected) return setError("Choose which department to set up.");
    setBusy(true);
    setError("");
    try {
      await api.post("/departments", { name: selected });
      setOpen(false);
      setSelected("");
      load();
    } catch (err) { setError(msg(err)); } finally { setBusy(false); }
  };

  const remove = async (d) => {
    if ((counts[d._id] || 0) > 0) {
      setError(`Move employees out of "${d.name}" before deleting it.`);
      return;
    }
    if (!confirm(`Remove "${d.name}"? You can add it back any time.`)) return;
    try { await api.delete(`/departments/${d._id}`); load(); } catch (err) { setError(msg(err)); }
  };

  const openAdd = () => { setSelected(available[0]?.name || ""); setError(""); setOpen(true); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-sm text-muted mt-1">
            ENIGOAL's four standard teams. Every employee belongs to exactly one.
          </p>
        </div>
        {available.length > 0 && (
          <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Set up department</button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? <PageLoader /> : !list.length ? (
        <div className="card">
          <EmptyState
            title="No departments set up yet"
            hint="Set up ENIGOAL's four standard teams — Admin Team, HR, Digital Team and Sales Team — so employees can be assigned to one."
            action={<button onClick={openAdd} className="btn-primary btn-sm"><Plus size={14} /> Set up department</button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((d) => {
            const meta = departmentMeta(d.name);
            const Icon = meta.icon;
            const count = counts[d._id] ?? 0;
            return (
              <div
                key={d._id}
                className={`relative overflow-hidden card p-5 hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br ${RING_TONE[meta.tone]}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`grid place-items-center w-11 h-11 rounded-2xl ${ICON_TONE[meta.tone]}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditTarget(d)}
                      className="text-muted hover:text-brand-700 p-1.5 rounded-lg hover:bg-brand-50 transition-colors"
                      title="Edit department"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => remove(d)}
                      className="text-muted hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Remove department"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <p className="font-display font-semibold text-lg mt-4">{d.name}</p>
                {d.code && <p className="ident mt-0.5">{d.code}</p>}

                <div className="mt-4 pt-4 border-t border-line/60 flex items-center gap-2">
                  <Users2 size={14} className="text-muted" />
                  <span className="font-mono text-sm font-semibold">{count}</span>
                  <span className="text-xs text-muted">{count === 1 ? "employee" : "employees"}</span>
                </div>
              </div>
            );
          })}

          {available.length > 0 && (
            <button
              onClick={openAdd}
              className="card p-5 border-dashed flex flex-col items-center justify-center gap-2 text-muted hover:text-brand-700 hover:border-brand-300 hover:bg-brand-50/40 transition-colors min-h-[168px]"
            >
              <div className="grid place-items-center w-11 h-11 rounded-2xl bg-canvas">
                <Plus size={20} />
              </div>
              <span className="text-sm font-medium">Set up {available.length === 1 ? available[0].name : "a department"}</span>
            </button>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Set up a department">
        <div className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Department">
            <select className="field" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Select a department</option>
              {available.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </Field>
          <p className="text-xs text-muted">
            Departments are limited to ENIGOAL's four standard teams — Admin Team, HR, Digital Team and Sales Team —
            so the list here always matches the roles employees can be assigned in the system.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-line">
          <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
          <button onClick={create} disabled={busy || !selected} className="btn-primary">
            {busy && <Spinner />} Set up department
          </button>
        </div>
      </Modal>

      <EditDepartment department={editTarget} onClose={() => setEditTarget(null)} onDone={() => { setEditTarget(null); load(); }} />
    </div>
  );
}

function EditDepartment({ department, onClose, onDone }) {
  const [code, setCode] = useState("");
  const [headId, setHeadId] = useState("");
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!department) return;
    setCode(department.code || "");
    setHeadId(department.head?._id || "");
    setError("");
    api.get(`/employees?department=${department._id}&limit=200`)
      .then((r) => setMembers(r.data.data))
      .catch(() => setMembers([]));
  }, [department]);

  const submit = async () => {
    setBusy(true); setError("");
    try {
      await api.put(`/departments/${department._id}`, { code, head: headId || null });
      onDone();
    } catch (err) { setError(msg(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!department} onClose={onClose} title={`Edit ${department?.name || "department"}`}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Department code">
          <input
            className="field font-mono uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        </Field>
        <Field label="Department head">
          <select className="field" value={headId} onChange={(e) => setHeadId(e.target.value)}>
            <option value="">No head assigned</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>{m.firstName} {m.lastName} — {m.employeeId}</option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-muted">
          The department name itself can't be changed — it stays one of ENIGOAL's four standard teams. Only the
          short code and who heads the team can be updated here.
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-line">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary">{busy && <Spinner />} Save changes</button>
      </div>
    </Modal>
  );
}
