import mongoose from "mongoose";
import { DEPARTMENT_NAMES } from "../utils/departments.js";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, enum: DEPARTMENT_NAMES },
    code: { type: String, uppercase: true, trim: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
