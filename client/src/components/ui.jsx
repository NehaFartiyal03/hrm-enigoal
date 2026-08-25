import { useState } from "react";
import { AlertCircle, Inbox, Loader2, X } from "lucide-react";

export const Spinner = ({ className = "" }) => (
  <Loader2 className={`animate-spin ${className}`} size={18} />
);

export const PageLoader = () => (
  <div className="flex items-center justify-center py-24 text-muted">
    <Spinner className="mr-2" /> Loading
  </div>
);

export const Alert = ({ children }) =>
  !children ? null : (
    <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );

export const EmptyState = ({ title, hint, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="grid place-items-center w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mb-3">
      <Inbox size={22} />
    </div>
    <p className="font-display font-semibold text-ink">{title}</p>
    {hint && <p className="text-sm text-muted mt-1 max-w-sm">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const TONES = {
  blue: "bg-brand-50 text-brand-700 border-brand-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  gold: "bg-gold-50 text-gold-800 border-gold-200",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

export const Badge = ({ tone = "slate", children }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>
    {children}
  </span>
);

export const STATUS_TONE = {
  present: "green", active: "green", verified: "green", approved: "green",
  absent: "rose", rejected: "rose", terminated: "rose",
  "half-day": "amber", pending: "amber", probation: "amber", notice: "amber",
  leave: "blue", wfh: "blue", weekoff: "slate", holiday: "slate",
  resigned: "slate", cancelled: "slate",
};

export const Modal = ({ open, onClose, title, children, wide }) =>
  !open ? null : (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm p-4 sm:p-8">
      <div className={`card w-full ${wide ? "max-w-3xl" : "max-w-lg"} my-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-display font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink p-1 rounded-lg" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );

export const Avatar = ({ id, name = "", size = 40, src, refreshKey }) => {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const [broken, setBroken] = useState(false);
  const imgSrc = src || (id ? `/api/employees/${id}/photo${refreshKey ? `?v=${refreshKey}` : ""}` : null);

  if (!imgSrc || broken) {
    return (
      <div
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        className="grid place-items-center rounded-xl bg-brand-100 text-brand-700 font-semibold shrink-0"
      >
        {initials || "?"}
      </div>
    );
  }
  return (
    <img
      src={imgSrc}
      alt={name}
      style={{ width: size, height: size }}
      className="rounded-xl object-cover object-top border border-line bg-canvas shrink-0"
      onError={() => setBroken(true)}
    />
  );
};

export const Field = ({ label, children, className = "" }) => (
  <div className={className}>
    <label className="label">{label}</label>
    {children}
  </div>
);
