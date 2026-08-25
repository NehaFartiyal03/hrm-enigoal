// ENIGOAL's fixed department structure. Keep this in sync with
// client/src/utils/departments.js — these are the ONLY departments the
// system allows; nobody can create an arbitrary department from the UI.
// Mirrors the four team roles a login can have: hr, digital_team,
// sales_team, admin_team (see server/src/models/User.js).
export const STANDARD_DEPARTMENTS = [
  { name: "Admin Team", code: "ADM" },
  { name: "HR", code: "HR" },
  { name: "Digital Team", code: "DIG" },
  { name: "Sales Team", code: "SLS" },
];

export const DEPARTMENT_NAMES = STANDARD_DEPARTMENTS.map((d) => d.name);
