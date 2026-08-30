import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// System roles: "hr" is the top-level role (user management, system settings,
// hard delete). "manager" shares the operational screens and settings access,
// scoped to their own reportees where that applies.
// The three "team" roles are ENIGOAL's employee-level roles — same permission
// set as a regular employee, just labelled by which team they belong to.
export const ROLES = ["hr", "manager", "digital_team", "sales_team", "admin_team"];

// Roles that only have self-service access (own profile/documents/attendance/leave).
export const EMPLOYEE_ROLES = ["digital_team", "sales_team", "admin_team"];

export const isEmployeeRole = (role) => EMPLOYEE_ROLES.includes(role);

export const ROLE_LABELS = {
  hr: "HR",
  manager: "Manager",
  digital_team: "Digital Team",
  sales_team: "Sales Team",
  admin_team: "Admin Team",
};

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: { type: String, enum: ROLES, default: "digital_team" },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model("User", userSchema);
