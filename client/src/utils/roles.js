// Keep in sync with server/src/models/User.js
// "hr" is the top-level role; "manager" shares the privileged screens.
export const ROLES = ["hr", "manager", "digital_team", "sales_team", "admin_team"];

// Roles allowed on Settings (user management).
export const PRIVILEGED_ROLES = ["hr", "manager"];

export const isPrivileged = (role) => PRIVILEGED_ROLES.includes(role);

// "Team" roles are ENIGOAL's employee-level roles — self-service access only.
export const EMPLOYEE_ROLES = ["digital_team", "sales_team", "admin_team"];

export const isEmployeeRole = (role) => EMPLOYEE_ROLES.includes(role);

export const ROLE_LABELS = {
  hr: "HR",
  manager: "Manager",
  digital_team: "Digital Team",
  sales_team: "Sales Team",
  admin_team: "Admin Team",
};

export const ROLE_TONE = {
  hr: "blue",
  manager: "gold",
  digital_team: "slate",
  sales_team: "slate",
  admin_team: "slate",
};

export const roleLabel = (role) => ROLE_LABELS[role] || role;
