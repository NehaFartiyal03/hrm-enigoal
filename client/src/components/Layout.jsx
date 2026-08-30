import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, LogOut, IdCard, UserRound } from "lucide-react";
import Sidebar from "./Sidebar";
import { Avatar } from "./ui";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../utils/roles";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const emp = user?.employee;

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-20 h-16 bg-surface/85 backdrop-blur border-b border-line border-b-2 border-b-gold-400/60 flex items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-2 text-muted" aria-label="Open menu">
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          {emp && (
            <button onClick={() => navigate(`/employees/${emp._id}`)} className="btn-ghost btn-sm">
              <UserRound size={15} /> My profile
            </button>
          )}

          {emp && (
            <button onClick={() => navigate(`/id-card/${emp._id}`)} className="btn-ghost btn-sm">
              <IdCard size={15} /> My ID card
            </button>
          )}

          <button
            onClick={() => emp && navigate(`/employees/${emp._id}`)}
            disabled={!emp}
            className="flex items-center gap-2.5 pl-2 border-l border-line disabled:cursor-default"
            title={emp ? "View my profile" : undefined}
          >
            <Avatar id={emp?._id} name={emp ? `${emp.firstName} ${emp.lastName || ""}` : user?.email} size={34} />
            <div className="hidden sm:block leading-tight text-left">
              <p className="text-sm font-medium">{emp ? `${emp.firstName} ${emp.lastName || ""}` : "Account"}</p>
              <p className="text-[11px] text-muted">{roleLabel(user?.role)}</p>
            </div>
          </button>

          <button
            onClick={async () => { await logout(); navigate("/login"); }}
            className="p-2 text-muted hover:text-rose-600 rounded-lg"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="p-4 sm:p-6 max-w-[1400px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
