import { useEffect, useState } from "react";
import { AlertTriangle, LogOut, Trash2 } from "lucide-react";
import api, { msg } from "../api/axios";
import { Modal, Alert, Spinner } from "./ui";

/**
 * Confirms and performs employee removal.
 * Two modes, both backed by DELETE /employees/:id:
 *  - "exit"     -> soft delete: marks the employee resigned & disables their login.
 *                  Record, documents and attendance history are kept.
 *  - "permanent" -> hard delete (?hard=true): wipes the employee, their documents,
 *                  attendance and login for good. Gated behind typing the employee ID.
 */
export default function DeleteEmployeeModal({ open, employee, onClose, onDone }) {
  const [mode, setMode] = useState("exit");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setMode("exit");
      setConfirmText("");
      setError("");
    }
  }, [open, employee]);

  if (!employee) return null;

  const name = `${employee.firstName} ${employee.lastName || ""}`.trim();
  const hardReady = confirmText.trim() === employee.employeeId;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.delete(
        `/employees/${employee._id}${mode === "permanent" ? "?hard=true" : ""}`
      );
      onDone(mode, data.message);
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={`Remove ${name}`}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <div className="grid gap-2.5">
          <button
            type="button"
            onClick={() => setMode("exit")}
            className={`text-left rounded-xl border p-3.5 transition-colors ${
              mode === "exit" ? "border-brand-300 bg-brand-50" : "border-line hover:bg-canvas"
            }`}
          >
            <div className="flex items-center gap-2 font-medium text-sm">
              <LogOut size={15} className="text-brand-600" /> Mark as exited
            </div>
            <p className="text-xs text-muted mt-1">
              Sets status to resigned, disables their login, and keeps the record, documents and
              attendance history for reference. Recommended for offboarding.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("permanent")}
            className={`text-left rounded-xl border p-3.5 transition-colors ${
              mode === "permanent" ? "border-rose-300 bg-rose-50" : "border-line hover:bg-canvas"
            }`}
          >
            <div className="flex items-center gap-2 font-medium text-sm text-rose-700">
              <Trash2 size={15} /> Delete permanently
            </div>
            <p className="text-xs text-muted mt-1">
              Erases the employee, their documents, attendance and login. This cannot be undone —
              only use this for records added by mistake.
            </p>
          </button>
        </div>

        {mode === "permanent" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-2.5">
            <div className="flex items-start gap-2 text-xs text-rose-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Type <span className="font-mono font-semibold">{employee.employeeId}</span> to
                confirm you want to permanently delete this employee.
              </span>
            </div>
            <input
              className="field"
              placeholder={employee.employeeId}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || (mode === "permanent" && !hardReady)}
            className={mode === "permanent" ? "btn-danger" : "btn-primary"}
          >
            {busy ? <Spinner /> : mode === "permanent" ? <Trash2 size={15} /> : <LogOut size={15} />}
            {mode === "permanent" ? "Delete permanently" : "Mark as exited"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
