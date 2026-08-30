import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldCheck, ShieldX } from "lucide-react";
import api from "../api/axios";
import { PageLoader } from "../components/ui";
import logo from "../assets/enigoal-mark.png";

export default function VerifyId() {
  const { employeeId } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    api.get(`/employees/verify/${employeeId}`)
      .then(({ data }) => setState({ loading: false, data: data.data }))
      .catch(() => setState({ loading: false, notFound: true }));
  }, [employeeId]);

  if (state.loading) return <div className="min-h-screen grid place-items-center"><PageLoader /></div>;

  const ok = state.data?.valid;

  return (
    <div className="min-h-screen bg-canvas grid place-items-center p-6">
      <div className="mb-5 flex items-center gap-2">
        <div className="grid place-items-center w-9 h-9 rounded-xl bg-white p-1 border border-line shadow-sm">
          <img src={logo} alt="ENIGOAL" className="w-full h-full object-contain" />
        </div>
        <span className="font-display font-bold text-ink">ENI<span className="text-gold-500">GOAL</span></span>
      </div>
      <div className="card w-full max-w-sm overflow-hidden">
        <div className={`px-6 py-8 text-center text-white ${ok ? "bg-gradient-to-br from-brand-800 to-brand-600" : "bg-gradient-to-br from-slate-700 to-slate-500"}`}>
          {ok ? <ShieldCheck size={40} className="mx-auto text-gold-300" /> : <ShieldX size={40} className="mx-auto" />}
          <p className="font-display font-bold text-lg mt-3">
            {state.notFound ? "No such employee ID" : ok ? "Verified employee" : "Card no longer valid"}
          </p>
          <p className="font-mono text-sm text-white/80 mt-1">{employeeId}</p>
        </div>

        {state.data && (
          <div className="p-6 space-y-3">
            <div className="text-center">
              {state.data.photoUrl && (
                <img src={state.data.photoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto border border-line" />
              )}
              <h2 className="font-display font-bold text-lg mt-3">{state.data.name}</h2>
              <p className="text-sm text-muted">{state.data.designation}</p>
            </div>
            <dl className="pt-3 border-t border-line text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-muted">Department</dt><dd>{state.data.department || "—"}</dd></div>
              <div className="flex justify-between">
                <dt className="text-muted">Joined</dt>
                <dd className="font-mono text-xs">{new Date(state.data.dateOfJoining).toLocaleDateString("en-IN")}</dd>
              </div>
            </dl>
          </div>
        )}

        {state.notFound && (
          <div className="p-6 text-center text-sm text-muted">
            This ID is not in the register. If you were handed this card, report it to the issuing organisation.
          </div>
        )}
      </div>
    </div>
  );
}
