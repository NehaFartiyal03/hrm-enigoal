import { useEffect, useState } from "react";
import { Plus, Check, X } from "lucide-react";
import api, { msg } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { PageLoader, Badge, STATUS_TONE, EmptyState, Alert, Spinner, Modal, Field } from "../components/ui";

export default function Leaves() {
  const { user, can } = useAuth();
  const approver = can("hr", "manager");
  const canApply = true; // everyone with a linked employee record can apply for their own leave
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/leaves");
      setList(data.data);
    } catch (err) { setError(msg(err)); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const action = async (id, status) => {
    const remarks = status === "rejected" ? prompt("Reason for rejection") : undefined;
    if (status === "rejected" && !remarks) return;
    try {
      await api.patch(`/leaves/${id}/action`, { status, actionRemarks: remarks });
      load();
    } catch (err) { setError(msg(err)); }
  };

  const cancel = async (id) => {
    if (!confirm("Cancel this leave request?")) return;
    try {
      await api.patch(`/leaves/${id}/cancel`);
      load();
    } catch (err) { setError(msg(err)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leave</h1>
          <p className="text-sm text-muted mt-1">
            {approver
              ? "Approving a request writes those days onto the attendance sheet automatically."
              : "Apply for leave and track its status here. Only HR or your manager can approve or reject it."}
          </p>
        </div>
        {canApply && (
          <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> Apply for leave</button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? <PageLoader /> : !list.length ? (
        <div className="card"><EmptyState title="No leave requests" hint="Requests you or your team submit will appear here." /></div>
      ) : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="th">Employee</th>
                <th className="th">Type</th>
                <th className="th">Dates</th>
                <th className="th">Days</th>
                <th className="th">Reason</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => {
                const isMine = l.employee?._id === user?.employee?._id;
                return (
                  <tr key={l._id} className="hover:bg-brand-50/40">
                    <td className="td">
                      <p className="text-sm font-medium">{l.employee?.firstName} {l.employee?.lastName}</p>
                      <p className="ident">{l.employee?.employeeId}</p>
                    </td>
                    <td className="td capitalize">{l.leaveType}</td>
                    <td className="td font-mono text-xs">
                      {new Date(l.fromDate).toLocaleDateString("en-IN")} – {new Date(l.toDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="td font-mono">{l.days}</td>
                    <td className="td max-w-[220px] truncate" title={l.reason}>{l.reason}</td>
                    <td className="td"><Badge tone={STATUS_TONE[l.status]}>{l.status}</Badge></td>
                    <td className="td text-right whitespace-nowrap">
                      {approver && l.status === "pending" && (
                        <>
                          <button onClick={() => action(l._id, "approved")} className="btn-ghost btn-sm mr-1 text-emerald-700"><Check size={13} /> Approve</button>
                          <button onClick={() => action(l._id, "rejected")} className="btn-ghost btn-sm mr-1 text-rose-600"><X size={13} /></button>
                        </>
                      )}
                      {isMine && l.status === "pending" && (
                        <button onClick={() => cancel(l._id)} className="btn-ghost btn-sm text-muted">Cancel</button>
                      )}
                      {!approver && !(isMine && l.status === "pending") && (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ApplyModal open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
    </div>
  );
}

function ApplyModal({ open, onClose, onDone }) {
  const { user, can } = useAuth();
  const privileged = can("hr", "manager");
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employee: "", leaveType: "casual", fromDate: "", toDate: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({ employee: user?.employee?._id || "", leaveType: "casual", fromDate: "", toDate: "", reason: "" });
    if (privileged) {
      api.get("/employees?limit=200").then(({ data }) => setEmployees(data.data)).catch(() => setEmployees([]));
    }
  }, [open, privileged]);

  const submit = async () => {
    if (!form.employee) return setError(privileged ? "Select which employee this leave is for." : "No employee record is linked to your account — contact HR.");
    if (!form.fromDate || !form.toDate || !form.reason) return setError("Fill in the dates and a reason.");
    setBusy(true); setError("");
    try { await api.post("/leaves", form); onDone(); }
    catch (err) { setError(msg(err)); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply for leave">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {privileged && (
          <Field label="Employee">
            <select className="field" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
              <option value="">Select employee</option>
              {employees.map((e) => <option key={e._id} value={e._id}>{e.employeeId} — {e.firstName} {e.lastName}</option>)}
            </select>
          </Field>
        )}
        <Field label="Leave type">
          <select className="field" value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
            {["casual", "sick", "earned", "unpaid", "maternity", "paternity"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From"><input type="date" className="field" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></Field>
          <Field label="To"><input type="date" className="field" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></Field>
        </div>
        <Field label="Reason">
          <textarea rows={3} className="field h-auto py-2" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-line">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary">{busy && <Spinner />} Submit request</button>
      </div>
    </Modal>
  );
}
