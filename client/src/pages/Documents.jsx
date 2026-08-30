import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Upload, Download, Trash2, Check, X, HardDrive, Search, User } from "lucide-react";
import api, { msg } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { PageLoader, Badge, STATUS_TONE, EmptyState, Alert, Spinner, Modal, Field } from "../components/ui";

const DOC_TYPES = ["aadhaar", "pan", "photo", "resume", "offer-letter", "appointment-letter",
  "education-certificate", "experience-letter", "bank-proof", "address-proof", "other"];

export default function Documents() {
  const { user, can } = useAuth();
  const privileged = can("hr", "manager"); // can see/filter the employee picker and manage docs
  const canUpload = privileged; // HR or manager — never a plain employee
  const canVerify = can("hr"); // only HR approves or rejects

  const [searchParams, setSearchParams] = useSearchParams();

  const [docs, setDocs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [storage, setStorage] = useState(null);
  const [filterEmp, setFilterEmp] = useState(searchParams.get("employee") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const canSeeStorage = can("hr"); // storage stats endpoint is HR-only server-side

  const load = async () => {
    setLoading(true);
    try {
      const [d, e, s] = await Promise.all([
        api.get(`/documents${filterEmp ? `?employee=${filterEmp}` : ""}`),
        privileged ? api.get("/employees?limit=200") : Promise.resolve({ data: { data: [] } }),
        canSeeStorage ? api.get("/documents/storage") : Promise.resolve({ data: { data: null } }),
      ]);
      setDocs(d.data.data);
      setEmployees(e.data.data);
      setStorage(s.data.data);
    } catch (err) {
      setError(msg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterEmp]);

  const verify = async (id, status) => {
    const reason = status === "rejected" ? prompt("Why is this document being rejected?") : undefined;
    if (status === "rejected" && !reason) return;
    try {
      await api.patch(`/documents/${id}/verify`, { status, rejectionReason: reason });
      load();
    } catch (err) { setError(msg(err)); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this document? This also removes the file from storage.")) return;
    try { await api.delete(`/documents/${id}`); load(); } catch (err) { setError(msg(err)); }
  };

  const download = async (doc) => {
    const res = await api.get(`/documents/${doc._id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.originalName || "document";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted mt-1">
            {canUpload
              ? "Files are stored in the database. Images are compressed on upload to keep the free tier usable."
              : "Your documents on file. HR or your manager uploads these on your behalf."}
          </p>
        </div>
        {canUpload && (
          <button onClick={() => setUploadOpen(true)} className="btn-primary"><Upload size={16} /> Upload document</button>
        )}
      </div>

      {storage && (
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-2">
            <HardDrive size={16} className="text-brand-600" />
            <p className="text-sm font-medium">Storage</p>
            <p className="ml-auto font-mono text-sm">
              {storage.usedMB} MB <span className="text-muted">/ 512 MB · {storage.files} files</span>
            </p>
          </div>
          <div className="h-2 rounded-full bg-canvas overflow-hidden">
            <div
              className={`h-full rounded-full ${storage.percentUsed > 80 ? "bg-rose-500" : storage.percentUsed > 60 ? "bg-amber-500" : "bg-brand-600"}`}
              style={{ width: `${Math.min(storage.percentUsed, 100)}%` }}
            />
          </div>
          {storage.percentUsed > 70 && (
            <p className="text-xs text-amber-700 mt-2">
              Storage is filling up. Move older files to Cloudinary or S3 by swapping <span className="font-mono">config/storage.js</span>.
            </p>
          )}
        </div>
      )}

      {privileged && (
        <EmployeeSearch
          employees={employees}
          value={filterEmp}
          onChange={(id) => {
            setFilterEmp(id);
            setSearchParams(id ? { employee: id } : {});
          }}
        />
      )}

      {error && <Alert>{error}</Alert>}

      {loading ? <PageLoader /> : !docs.length ? (
        <div className="card">
          <EmptyState
            title="Nothing uploaded yet"
            hint={canUpload
              ? "Upload Aadhaar, PAN, certificates or signed letters — HR reviews and marks them verified."
              : "Nothing here yet. HR or your manager will upload your documents."}
            action={canUpload && <button onClick={() => setUploadOpen(true)} className="btn-primary btn-sm"><Upload size={14} /> Upload document</button>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className="th">Document</th>
                  {privileged && <th className="th">Employee</th>}
                  <th className="th">Size</th>
                  <th className="th">Uploaded</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d._id} className="hover:bg-brand-50/40">
                    <td className="td">
                      <p className="font-medium capitalize">{d.docType.replace(/-/g, " ")}</p>
                      <p className="text-xs text-muted truncate max-w-[220px]">{d.originalName}</p>
                      {d.rejectionReason && <p className="text-xs text-rose-600 mt-0.5">{d.rejectionReason}</p>}
                    </td>
                    {privileged && (
                      <td className="td">
                        <p className="text-sm">{d.employee?.firstName} {d.employee?.lastName}</p>
                        <p className="ident">{d.employee?.employeeId}</p>
                      </td>
                    )}
                    <td className="td font-mono text-xs">{(d.size / 1024).toFixed(0)} KB</td>
                    <td className="td font-mono text-xs">{new Date(d.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="td"><Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge></td>
                    <td className="td text-right whitespace-nowrap">
                      <button onClick={() => download(d)} className="btn-ghost btn-sm mr-1"><Download size={13} /></button>
                      {canVerify && d.status !== "verified" && (
                        <button onClick={() => verify(d._id, "verified")} className="btn-ghost btn-sm mr-1 text-emerald-700"><Check size={13} /></button>
                      )}
                      {canVerify && d.status !== "rejected" && (
                        <button onClick={() => verify(d._id, "rejected")} className="btn-ghost btn-sm mr-1 text-amber-700"><X size={13} /></button>
                      )}
                      {canUpload && (
                        <button onClick={() => remove(d._id)} className="btn-ghost btn-sm text-rose-600"><Trash2 size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        employees={employees}
        defaultEmployee={filterEmp || user?.employee?._id}
        privileged={canUpload}
        onClose={() => setUploadOpen(false)}
        onDone={() => { setUploadOpen(false); load(); }}
      />
    </div>
  );
}

// Search-by-name box for filtering documents by employee.
// Type a name / employee ID, pick a match from the dropdown — no more scrolling a huge <select>.
function EmployeeSearch({ employees, value, onChange }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Keep the input text in sync with the selected employee (e.g. when filter comes from the URL).
  useEffect(() => {
    if (!value) { setTerm(""); return; }
    const emp = employees.find((e) => e._id === value);
    if (emp) setTerm(`${emp.firstName} ${emp.lastName}`);
  }, [value, employees]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const q = term.trim().toLowerCase();
  const matches = q
    ? employees.filter((e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.employeeId?.toLowerCase().includes(q)
      ).slice(0, 8)
    : employees.slice(0, 8);

  const pick = (emp) => {
    onChange(emp._id);
    setTerm(`${emp.firstName} ${emp.lastName}`);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setTerm("");
    setOpen(false);
  };

  return (
    <div className="relative max-w-xs" ref={boxRef}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        className="field pl-9 pr-8"
        placeholder="Search employee by name or ID"
        value={term}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
          if (value) onChange(""); // typing again clears the previously selected filter
        }}
      />
      {term && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          title="Clear"
        >
          <X size={14} />
        </button>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full card p-1 max-h-64 overflow-y-auto shadow-lg">
          {value === "" && !q && (
            <button
              type="button"
              onClick={clear}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-brand-50 text-muted"
            >
              All employees
            </button>
          )}
          {matches.length ? matches.map((e) => (
            <button
              key={e._id}
              type="button"
              onClick={() => pick(e)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-brand-50 flex items-center gap-2"
            >
              <User size={14} className="text-muted shrink-0" />
              <span className="truncate">{e.firstName} {e.lastName}</span>
              <span className="ident ml-auto shrink-0">{e.employeeId}</span>
            </button>
          )) : (
            <p className="px-3 py-2 text-sm text-muted">No employee matches "{term}"</p>
          )}
        </div>
      )}
    </div>
  );
}

function UploadModal({ open, employees, defaultEmployee, privileged, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ employee: defaultEmployee || "", docType: "aadhaar", expiryDate: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) { setFile(null); setError(""); setForm((f) => ({ ...f, employee: defaultEmployee || f.employee })); }
  }, [open, defaultEmployee]);

  const submit = async () => {
    if (!file) return setError("Choose a file to upload.");
    if (!form.employee) return setError("Select which employee this belongs to.");
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onDone();
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload document">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        {privileged && (
          <Field label="Employee">
            <select className="field" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.employeeId} — {e.firstName} {e.lastName}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Document type">
          <select className="field" value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/-/g, " ")}</option>)}
          </select>
        </Field>

        <Field label="Expiry date (optional)">
          <input type="date" className="field" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
        </Field>

        <label className="block border-2 border-dashed border-line rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 transition-colors">
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files[0])} />
          <Upload size={22} className="mx-auto text-brand-600 mb-2" />
          {file ? (
            <p className="text-sm font-medium">{file.name} <span className="font-mono text-muted">({(file.size / 1024).toFixed(0)} KB)</span></p>
          ) : (
            <>
              <p className="text-sm font-medium">Choose a file</p>
              <p className="text-xs text-muted mt-0.5">PDF, JPG, PNG or WEBP · up to 2 MB</p>
            </>
          )}
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-line">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary">{busy && <Spinner />} Upload</button>
      </div>
    </Modal>
  );
}
