import { ShieldCheck, Users, Laptop2, TrendingUp } from "lucide-react";

// Keep in sync with server/src/utils/departments.js — these are the only
// departments the system allows. Mirrors the four team roles a login can
// have: hr, digital_team, sales_team, admin_team (see utils/roles.js).
export const STANDARD_DEPARTMENTS = [
  { name: "Admin Team", code: "ADM", icon: ShieldCheck, tone: "rose" },
  { name: "HR", code: "HR", icon: Users, tone: "blue" },
  { name: "Digital Team", code: "DIG", icon: Laptop2, tone: "green" },
  { name: "Sales Team", code: "SLS", icon: TrendingUp, tone: "gold" },
];

export const departmentMeta = (name) =>
  STANDARD_DEPARTMENTS.find((d) => d.name === name) || { icon: Users, tone: "slate" };
