import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, CalendarCheck, FolderOpen, CalendarDays, Settings, Building2, UserCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { roleLabel, isEmployeeRole } from "../utils/roles";
import logo from "../assets/enigoal-mark.png";

const ALL = ["hr", "manager", "digital_team", "sales_team", "admin_team"];
const TEAM_ROLES = ["digital_team", "sales_team", "admin_team"];

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ALL, end: true },
  { to: "/employees", label: "Employees", icon: Users, roles: ["hr", "manager"] },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ["hr", "manager"] },
  { to: "/documents", label: "Documents", icon: FolderOpen, roles: ALL },
  { to: "/leaves", label: "Leave", icon: CalendarDays, roles: ALL },
  { to: "/departments", label: "Departments", icon: Building2, roles: ["hr", "manager"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["hr", "manager"] },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const myProfileLink = isEmployeeRole(user?.role) && user?.employee?._id
    ? { to: `/employees/${user.employee._id}`, label: "My Profile", icon: UserCircle2, roles: TEAM_ROLES }
    : null;
  const items = myProfileLink
    ? [NAV[0], myProfileLink, ...NAV.slice(1)]
    : NAV;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-ink/40 lg:hidden ${open ? "" : "hidden"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-gradient-to-b from-brand-900 via-brand-800 to-brand-700
                    text-white flex flex-col transition-transform lg:translate-x-0
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="px-5 h-16 flex items-center gap-2.5 border-b border-white/10">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-white p-1 shadow-sm">
            <img src={logo} alt="ENIGOAL" className="w-full h-full object-contain" />
          </div>
          <div className="leading-tight">
            <p className="font-display font-bold tracking-tight">
              ENI<span className="text-gold-400">GOAL</span>
            </p>
            <p className="text-[11px] text-brand-200">HR &amp; Attendance</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.filter((n) => n.roles.includes(user?.role)).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-white text-brand-800 font-semibold shadow-sm"
                    : "text-brand-100 hover:bg-white/10"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 m-3 rounded-xl bg-white/10 border border-gold-400/20">
          <p className="text-[11px] text-brand-200 uppercase tracking-wider">Signed in</p>
          <p className="text-sm font-medium truncate">{user?.email}</p>
          <p className="ident text-gold-300 mt-0.5">
            {user?.employee?.employeeId || roleLabel(user?.role)}
          </p>
        </div>
      </aside>
    </>
  );
}
