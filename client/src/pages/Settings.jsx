import { useEffect, useState } from "react";
import { Plus, KeyRound, ShieldCheck } from "lucide-react";
import api, { msg } from "../api/axios";
import { PageLoader, Badge, Alert, Spinner, Modal, Field } from "../components/ui";
import { ROLES, ROLE_TONE, roleLabel, isPrivileged } from "../utils/roles";
import { useAuth } from "../context/AuthContext";

/* Settings is limited to HR and managers (see App.jsx + auth.routes.js).
   The old "admin" role no longer exists — HR is the top-level role. */
export default function Settings() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, e] = await Promise.all([api.get("/auth/users"), api.get("/employees?limit=200")]);
      setUsers(u.data.data);
      setEmployees(e.data.data);
    } catch (err) { setError(msg(err)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const patch = async (id, body) => {
    setError("");
    try { await api.patch(`/auth/users/${id}`, body); load(); } catch (err) { setError(msg(err)); }
  };

  const privilegedCount = users.filter((u) => isPrivileged(u.role) && u.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="font-display text-2xl font-bold mt-1">Accounts and access</h1>
          <p className="text-sm text-muted mt-1.5">
            Who can sign in, and what each of them is allowed to do. Only HR and managers see this screen.
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> Add user</button>
      </div>

      {error && <Alert>{error}</Alert>}
      {note && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-sm text-emerald-700">
          {note}
        </div>
      )}

      <div className="card p-4 flex items-start gap-3 bg-brand-50/50 border-brand-100">
        <ShieldCheck size={18} className="text-brand-600 mt-0.5 shrink-0" />
        <p className="text-sm text-ink/80">
          <span className="font-medium">HR</span> manages employees, attendance, documents and these accounts.{" "}
          <span className="font-medium">Managers</span> work with their own reportees and share this screen.
          Every other role is self-service only.
          {privilegedCount <= 1 && (
            <span className="block mt-1 text-gold-700">
              Only one HR/manager account is active — add a second so nobody gets locked out.
            </span>
          )}
        </p>
      </div>

      <ChangePassword onDone={setNote} />

      {loading ? <PageLoader /> : (
        <div className="card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr>
                <th className="th">Email</th>
                <th className="th">Linked employee</th>
                <th className="th">Role</th>
                <th className="th">Status</th>
                <th className="th">Last sign-in</th>
                <th className="th text-right">Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u._id === user?._id;
                return (
                  <tr key={u._id} className={isSelf ? "bg-brand-50/40" : ""}>
                    <td className="td font-medium">
                      {u.email}
                      {isSelf && <span className="ml-2 text-[11px] text-brand-600">you</span>}
                    </td>
                    <td className="td">
                      {u.employee
                        ? <span className="ident">{u.employee.employeeId}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="td">
                      {isSelf ? (
                        <Badge tone={ROLE_TONE[u.role]}>{roleLabel(u.role)}</Badge>
                      ) : (
                        <select
                          className="field h-8 w-36 text-xs"
                          value={u.role}
                          onChange={(e) => patch(u._id, { role: e.target.value })}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="td">
                      <Badge tone={u.isActive ? "green" : "slate"}>{u.isActive ? "Active" : "Disabled"}</Badge>
                    </td>
                    <td className="td font-mono text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("en-IN") : "never"}
                    </td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-2">
                        {!isSelf && (
                          <button onClick={() => setResetTarget(u)} className="btn-ghost btn-sm">
                            Reset password
                          </button>
                        )}
                        <button
                          onClick={() => patch(u._id, { isActive: !u.isActive })}
                          disabled={isSelf}
                          className="btn-ghost btn-sm"
                          title={isSelf ? "You cannot disable your own account" : undefined}
                        >
                          {u.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddUser open={open} employees={employees} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />
      <ResetPassword
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onDone={(email) => { setResetTarget(null); setNote(`Password reset for ${email}.`); }}
      />
    </div>
  );
}

function ResetPassword({ user, onClose, onDone }) {
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setNewPassword(""); setError(""); }, [user]);

  const submit = async () => {
    if (newPassword.length < 8) return setError("Enter a password of at least 8 characters.");
    setBusy(true); setError("");
    try {
      await api.patch(`/auth/users/${user._id}/reset-password`, { newPassword });
      onDone(user.email);
    } catch (err) { setError(msg(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!user} onClose={onClose} title="Reset password">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Set a new password for <span className="font-medium text-ink">{user?.email}</span>. Share it with
          them directly — they can change it themselves afterwards from Settings.
        </p>
        {error && <Alert>{error}</Alert>}
        <Field label="New password (min 8 characters)">
          <input
            className="field font-mono"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoFocus
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-line">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary">{busy && <Spinner />} Reset password</button>
      </div>
    </Modal>
  );
}

function ChangePassword({ onDone }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true); setError("");
    try {
      await api.put("/auth/password", form);
      setForm({ currentPassword: "", newPassword: "" });
      onDone("Password updated.");
    } catch (err) { setError(msg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={16} className="text-brand-600" />
        <h3 className="font-display font-semibold">Change your password</h3>
      </div>
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <Field label="Current password">
          <input type="password" className="field" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        </Field>
        <Field label="New password (min 8 characters)">
          <input type="password" className="field" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        </Field>
        <button onClick={submit} disabled={busy} className="btn-primary">{busy && <Spinner />} Update password</button>
      </div>
    </div>
  );
}

function AddUser({ open, employees, onClose, onDone }) {
  const [form, setForm] = useState({ email: "", password: "", role: "digital_team", employeeId: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.email || form.password.length < 8) return setError("Enter an email and a password of at least 8 characters.");
    setBusy(true); setError("");
    try { await api.post("/auth/users", form); onDone(); }
    catch (err) { setError(msg(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add user">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Email"><input type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><input className="field font-mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role">
          <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
        </Field>
        <Field label="Link to employee record">
          <select className="field" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            <option value="">Not linked</option>
            {employees.map((e) => <option key={e._id} value={e._id}>{e.employeeId} — {e.firstName} {e.lastName}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-line">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary">{busy && <Spinner />} Add user</button>
      </div>
    </Modal>
  );
}
