import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import QRCode from "react-qr-code";
import { Printer, ArrowLeft, Download, Image as ImageIcon, ShieldCheck } from "lucide-react";
import api from "../api/axios";
import { PageLoader, Alert, Spinner } from "../components/ui";
import logo from "../assets/enigoal-mark.png";

/* Card geometry — CR80 portrait (54 x 85.6 mm) kept exact so the PDF prints
   at true card size. Screen size is that ratio scaled up to 340px wide. */
const CARD_W = 340;
const CARD_H = Math.round((340 * 85.6) / 54); // 539

/* A portrait photo, sized for print. The stored image is 900x1100, so at
   4x export this stays sharp on card stock. */
function Photo({ id, name }) {
  const [broken, setBroken] = useState(false);
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  if (!id || broken) {
    return (
      <div className="w-[124px] h-[152px] rounded-xl bg-brand-100 grid place-items-center
                      text-brand-700 font-display font-bold text-4xl">
        {initials || "?"}
      </div>
    );
  }
  return (
    <img
      src={`/api/employees/${id}/photo`}
      alt={name}
      width={124}
      height={152}
      onError={() => setBroken(true)}
      className="w-[124px] h-[152px] rounded-xl object-cover object-top bg-canvas"
    />
  );
}

const Detail = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[9px] uppercase tracking-[0.12em] text-muted">{label}</p>
    <p className="text-[12px] font-medium text-ink truncate">{value || "—"}</p>
  </div>
);

export default function IDCard() {
  const { id } = useParams();
  const [emp, setEmp] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const frontRef = useRef();
  const backRef = useRef();

  useEffect(() => {
    api.get(`/employees/${id}`)
      .then(({ data }) => setEmp(data.data))
      .catch((e) => setError(e.response?.data?.message || "Could not load this employee"));
  }, [id]);

  const shoot = async (node) => {
    const { default: html2canvas } = await import("html2canvas");
    return html2canvas(node, { scale: 4, backgroundColor: "#FFFFFF", useCORS: true, logging: false });
  };

  /* Two-page PDF at exactly 54 x 85.6 mm — front, then back. */
  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      const [{ jsPDF }, front, back] = await Promise.all([
        import("jspdf"),
        shoot(frontRef.current),
        shoot(backRef.current),
      ]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [54, 85.6] });
      pdf.addImage(front.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 54, 85.6);
      pdf.addPage([54, 85.6], "portrait");
      pdf.addImage(back.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 54, 85.6);
      pdf.save(`${emp.employeeId}-id-card.pdf`);
    } catch {
      window.print();
    } finally {
      setBusy("");
    }
  };

  const downloadPng = async () => {
    setBusy("png");
    try {
      const canvas = await shoot(frontRef.current);
      const link = document.createElement("a");
      link.download = `${emp.employeeId}-id-card.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      window.print();
    } finally {
      setBusy("");
    }
  };

  if (error) return <Alert>{error}</Alert>;
  if (!emp) return <PageLoader />;

  const verifyUrl = `${window.location.origin}/verify/${emp.employeeId}`;
  const name = `${emp.firstName} ${emp.lastName || ""}`.trim();
  const joined = emp.dateOfJoining
    ? new Date(emp.dateOfJoining).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/employees" className="text-sm text-muted hover:text-brand-700 inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to employees
          </Link>
          <p className="eyebrow mt-2">Identity card</p>
          <h1 className="font-display text-2xl font-bold mt-1">{name}</h1>
          <p className="text-sm text-muted mt-1">
            Prints at true card size — 54 × 85.6 mm, front and back.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadPng} disabled={!!busy} className="btn-ghost">
            {busy === "png" ? <Spinner /> : <ImageIcon size={16} />} PNG
          </button>
          <button onClick={downloadPdf} disabled={!!busy} className="btn-gold">
            {busy === "pdf" ? <Spinner /> : <Download size={16} />} Download PDF
          </button>
          <button onClick={() => window.print()} className="btn-primary">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-8">
        {/* ---------------- FRONT ---------------- */}
        <div className="id-card-slot">
          <p className="eyebrow no-print mb-2">Front</p>
          <div
            ref={frontRef}
            style={{ width: CARD_W, height: CARD_H }}
            className="id-card print-area relative flex flex-col overflow-hidden rounded-2xl bg-surface
                       border border-line shadow-card"
          >
            {/* Header */}
            <div className="relative h-[94px] bg-brand-900 px-5 pt-4">
              <div className="absolute right-[-40px] top-[-40px] w-[130px] h-[130px] rounded-full bg-white/5" />
              <div className="absolute right-[10px] bottom-[-30px] w-[90px] h-[90px] rounded-full bg-gold-400/10" />
              <div className="relative flex items-start justify-between">
                <div className="text-white">
                  <p className="font-display font-extrabold text-xl leading-none">
                    ENI<span className="text-gold-400">GOAL</span>
                  </p>
                  <p className="text-[9px] tracking-[0.22em] text-brand-200 mt-1.5 uppercase">
                    Employee identity card
                  </p>
                </div>
                <div className="grid place-items-center w-10 h-10 rounded-lg bg-white p-1">
                  <img src={logo} alt="" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gold-400" />
            </div>

            {/* Photo + identity */}
            <div className="relative z-10 flex-1 flex flex-col px-5 -mt-[26px] pb-1">
              <div className="self-center rounded-2xl bg-white p-1 shadow-[0_10px_24px_-12px_rgba(11,26,51,.45)]">
                <Photo id={emp._id} name={name} />
              </div>

              <h2
                className={`font-display font-extrabold leading-tight text-center mt-3 text-ink break-words ${
                  name.length > 24 ? "text-[15.5px]" : "text-[19px]"
                }`}
              >
                {name}
              </h2>
              <p className="text-[12px] text-muted text-center mt-0.5 leading-snug">{emp.designation || "—"}</p>
              <span className="self-center mt-2 inline-flex items-center rounded-full bg-brand-50 border border-brand-100
                               px-2.5 py-0.5 text-[10px] font-medium text-brand-700">
                {emp.department?.name || "Unassigned"}
              </span>

              {/* Pinned to the foot of the identity block, so a long name eats
                  the slack above instead of pushing this off the card. */}
              <div className="mt-auto pt-3">
                <div className="rounded-xl bg-brand-900 px-4 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-brand-200">Employee ID</p>
                    <p className="font-mono text-[19px] font-bold text-white leading-tight tracking-tight">
                      {emp.employeeId}
                    </p>
                  </div>
                  <ShieldCheck size={20} className="text-gold-400 shrink-0" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  <Detail label="Joined" value={joined} />
                  <Detail label="Blood group" value={emp.bloodGroup} />
                  <Detail label="Phone" value={emp.phone} />
                  <Detail label="Status" value={emp.status} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-3 border-t border-line bg-canvas/60">
              <div className="bg-white p-1 rounded-md border border-line shrink-0">
                <QRCode value={verifyUrl} size={48} bgColor="#FFFFFF" fgColor="#172F63" />
              </div>
              <p className="text-[9.5px] text-muted leading-snug">
                Scan to check this card against the live register — a card held by someone who has
                left shows as invalid.
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- BACK ---------------- */}
        <div className="id-card-slot">
          <p className="eyebrow no-print mb-2">Back</p>
          <div
            ref={backRef}
            style={{ width: CARD_W, height: CARD_H }}
            className="id-card print-area relative flex flex-col overflow-hidden rounded-2xl bg-surface
                       border border-line shadow-card"
          >
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-line">
              <img src={logo} alt="" className="w-6 h-6 object-contain" />
              <p className="font-display font-bold text-sm text-ink">
                ENI<span className="text-gold-500">GOAL</span>
              </p>
              <span className="ml-auto font-mono text-[11px] text-brand-800">{emp.employeeId}</span>
            </div>

            <div className="px-5 py-4 flex-1 flex flex-col gap-3.5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted">Emergency contact</p>
                <p className="text-[13px] font-medium text-ink mt-0.5">
                  {emp.emergencyContact?.name || "Not on file"}
                </p>
                <p className="font-mono text-[12px] text-brand-800">{emp.emergencyContact?.phone || "—"}</p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted">Work email</p>
                <p className="text-[12px] font-medium text-ink break-all mt-0.5">{emp.email}</p>
              </div>

              <div className="rounded-xl border border-line p-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted">Conditions of use</p>
                <ul className="mt-1.5 space-y-1 text-[10.5px] text-ink/75 leading-snug">
                  <li>• Carry this card on site and show it on request.</li>
                  <li>• It is not transferable and stays ENIGOAL property.</li>
                  <li>• Report loss to HR the same day.</li>
                  <li>• Return it on your last working day.</li>
                </ul>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted">Verify at</p>
                <p className="font-mono text-[10px] text-brand-800 break-all mt-0.5">{verifyUrl}</p>
              </div>

              <div className="mt-auto pt-6">
                <div className="h-px bg-gold-400 w-32" />
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted mt-1.5">
                  Authorised signatory
                </p>
              </div>
            </div>

            <div className="px-5 py-3 bg-brand-900 text-white text-[9.5px] tracking-wide text-center">
              If found, please return to ENIGOAL HR.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
