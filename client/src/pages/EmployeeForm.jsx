import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import api, { msg } from "../api/axios";
import { Modal, Alert, Spinner, Field, Avatar } from "../components/ui";
import { ROLES, roleLabel } from "../utils/roles";

const EMPTY = {
  firstName: "", lastName: "", gender: "", dateOfBirth: "", bloodGroup: "",
  maritalStatus: "", nationality: "Indian",
  email: "", phone: "", designation: "", department: "", employmentType: "full-time",
  dateOfJoining: "", status: "probation", workLocation: "",
  pan: "", aadhaarNumber: "", passportNumber: "", uan: "",
  address: { line1: "", city: "", state: "", pincode: "" },
  emergencyContact: { name: "", relation: "", phone: "" },
  bankAccount: { accountName: "", accountNumber: "", ifsc: "", bankName: "", branchName: "" },
  createLogin: false, role: "digital_team", tempPassword: "",
};

const SECTIONS = ["Personal", "Contact", "Job", "Bank & ID", "Access"];

export default function EmployeeForm({ open, employee, departments = [], onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setTab(0);
    setError("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setForm(
      employee
        ? {
            ...EMPTY, ...employee,
            department: employee.department?._id || "",
            dateOfBirth: employee.dateOfBirth?.slice(0, 10) || "",
            dateOfJoining: employee.dateOfJoining?.slice(0, 10) || "",
            address: { ...EMPTY.address, ...employee.address },
            emergencyContact: { ...EMPTY.emergencyContact, ...employee.emergencyContact },
            bankAccount: { ...EMPTY.bankAccount, ...employee.bankAccount },
          }
        : EMPTY
    );
  }, [open, employee]);

  // Revoke the object URL when it's replaced or the form closes, to avoid leaking memory
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setNested = (group, k, v) => setForm((p) => ({ ...p, [group]: { ...p[group], [k]: v } }));

  const pickPhoto = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for the photo.");
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhotoFor = async (employeeId) => {
    if (!photoFile) return;
    const fd = new FormData();
    fd.append("file", photoFile);
    await api.post(`/employees/${employeeId}/photo`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const submit = async () => {
    if (!form.firstName || !form.email || !form.phone || !form.dateOfJoining) {
      setError("First name, email, phone and joining date are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.department) delete payload.department;
      const { data } = employee
        ? await api.put(`/employees/${employee._id}`, payload)
        : await api.post("/employees", payload);

      // Photo is uploaded as a separate step once we have an employee _id to attach it to
      if (photoFile) {
        try {
          await uploadPhotoFor(data.data._id);
        } catch (photoErr) {
          // Employee record is already saved — surface the photo failure but don't lose the save
          setError(`Employee saved, but the photo failed to upload: ${msg(photoErr)}`);
          setBusy(false);
          onSaved(data.data, !employee);
          return;
        }
      }
      onSaved(data.data, !employee);
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} wide title={employee ? "Edit employee" : "Add employee"}>
      <div className="flex gap-1 p-1 bg-canvas rounded-xl mb-5">
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            onClick={() => setTab(i)}
            className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${
              tab === i ? "bg-surface text-brand-700 shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}

        {tab === 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex items-center gap-4 pb-2">
              <div className="relative">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    style={{ width: 72, height: 72 }}
                    className="rounded-xl object-cover border border-line"
                  />
                ) : (
                  <Avatar id={employee?._id} name={form.firstName} size={72} />
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 grid place-items-center w-7 h-7 rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-lift"
                  title="Upload photo"
                >
                  <Camera size={13} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickPhoto(e.target.files[0])}
                />
              </div>
              <div>
                <p className="text-sm font-medium">Employee photo</p>
                <p className="text-xs text-muted mt-0.5">
                  Used on the ID card and throughout the system. JPG or PNG, up to 2 MB.
                </p>
                {photoFile && (
                  <button
                    type="button"
                    onClick={() => { if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoFile(null); setPhotoPreview(null); }}
                    className="text-xs text-rose-600 hover:underline mt-1"
                  >
                    Remove selected photo
                  </button>
                )}
              </div>
            </div>
            <Field label="First name *">
              <input className="field" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </Field>
            <Field label="Last name">
              <input className="field" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
            <Field label="Gender">
              <select className="field" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Date of birth">
              <input type="date" className="field" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </Field>
            <Field label="Blood group">
              <input className="field" placeholder="O+" value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} />
            </Field>
          </div>
        )}

        {tab === 1 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Email *">
              <input type="email" className="field" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone *">
              <input className="field font-mono" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input className="field" placeholder="House / street" value={form.address.line1} onChange={(e) => setNested("address", "line1", e.target.value)} />
            </Field>
            <Field label="City">
              <input className="field" value={form.address.city} onChange={(e) => setNested("address", "city", e.target.value)} />
            </Field>
            <Field label="State">
              <input className="field" value={form.address.state} onChange={(e) => setNested("address", "state", e.target.value)} />
            </Field>
            <Field label="Pincode">
              <input className="field font-mono" value={form.address.pincode} onChange={(e) => setNested("address", "pincode", e.target.value)} />
            </Field>
            <div className="sm:col-span-2 pt-2 border-t border-line">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Emergency contact</p>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Name">
                  <input className="field" value={form.emergencyContact.name} onChange={(e) => setNested("emergencyContact", "name", e.target.value)} />
                </Field>
                <Field label="Relation">
                  <input className="field" value={form.emergencyContact.relation} onChange={(e) => setNested("emergencyContact", "relation", e.target.value)} />
                </Field>
                <Field label="Phone">
                  <input className="field font-mono" value={form.emergencyContact.phone} onChange={(e) => setNested("emergencyContact", "phone", e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {tab === 2 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Department">
              <select className="field" value={form.department} onChange={(e) => set("department", e.target.value)}>
                <option value="">Unassigned</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Designation">
              <input className="field" value={form.designation} onChange={(e) => set("designation", e.target.value)} />
            </Field>
            <Field label="Employment type">
              <select className="field" value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
                {["full-time", "part-time", "intern", "contract"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Date of joining *">
              <input type="date" className="field" value={form.dateOfJoining} onChange={(e) => set("dateOfJoining", e.target.value)} />
            </Field>
            <Field label="Status">
              <select className="field" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {["probation", "active", "notice", "resigned", "terminated"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Work location">
              <input className="field" value={form.workLocation} onChange={(e) => set("workLocation", e.target.value)} />
            </Field>
          </div>
        )}

        {tab === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Identity documents</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="PAN">
                  <input className="field font-mono uppercase" placeholder="ABCDE1234F" value={form.pan} onChange={(e) => set("pan", e.target.value)} />
                </Field>
                <Field label="Aadhaar number">
                  <input className="field font-mono" placeholder="XXXX XXXX XXXX" value={form.aadhaarNumber} onChange={(e) => set("aadhaarNumber", e.target.value)} />
                </Field>
                <Field label="Passport number">
                  <input className="field font-mono uppercase" value={form.passportNumber} onChange={(e) => set("passportNumber", e.target.value)} />
                </Field>
                <Field label="UAN">
                  <input className="field font-mono" value={form.uan} onChange={(e) => set("uan", e.target.value)} />
                </Field>
                <Field label="Nationality">
                  <input className="field" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
                </Field>
                <Field label="Marital status">
                  <select className="field" value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
                    <option value="">Select</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="pt-2 border-t border-line">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 mt-4">Bank details</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Account holder name">
                  <input className="field" value={form.bankAccount.accountName} onChange={(e) => setNested("bankAccount", "accountName", e.target.value)} />
                </Field>
                <Field label="Account number">
                  <input className="field font-mono" value={form.bankAccount.accountNumber} onChange={(e) => setNested("bankAccount", "accountNumber", e.target.value)} />
                </Field>
                <Field label="IFSC code">
                  <input className="field font-mono uppercase" value={form.bankAccount.ifsc} onChange={(e) => setNested("bankAccount", "ifsc", e.target.value)} />
                </Field>
                <Field label="Bank name">
                  <input className="field" value={form.bankAccount.bankName} onChange={(e) => setNested("bankAccount", "bankName", e.target.value)} />
                </Field>
                <Field label="Branch name" className="sm:col-span-2">
                  <input className="field" value={form.bankAccount.branchName} onChange={(e) => setNested("bankAccount", "branchName", e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {tab === 4 && (
          <div className="space-y-4">
            {employee ? (
              <p className="text-sm text-muted">Login accounts are managed under Settings → Users.</p>
            ) : (
              <>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-line cursor-pointer hover:bg-brand-50/50">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-brand-600 w-4 h-4"
                    checked={form.createLogin}
                    onChange={(e) => set("createLogin", e.target.checked)}
                  />
                  <span>
                    <span className="text-sm font-medium block">Create a login for this employee</span>
                    <span className="text-xs text-muted">They'll sign in with the email above.</span>
                  </span>
                </label>

                {form.createLogin && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Role">
                      <select className="field" value={form.role} onChange={(e) => set("role", e.target.value)}>
                        {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                      </select>
                    </Field>
                    <Field label="Temporary password">
                      <input
                        className="field font-mono"
                        placeholder="Leave blank to auto-generate"
                        value={form.tempPassword}
                        onChange={(e) => set("tempPassword", e.target.value)}
                      />
                    </Field>
                    <p className="sm:col-span-2 text-xs text-muted">
                      If left blank the password becomes the employee ID followed by <span className="font-mono">@2026</span>. Ask them to change it on first sign-in.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-line">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary">
          {busy && <Spinner />} {employee ? "Save changes" : "Create employee"}
        </button>
      </div>
    </Modal>
  );
}
