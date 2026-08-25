import Department from "../models/Department.js";
import Employee from "../models/Employee.js";
import { asyncHandler, ApiError } from "../utils/asyncHandler.js";
import { STANDARD_DEPARTMENTS, DEPARTMENT_NAMES } from "../utils/departments.js";

export const listDepartments = asyncHandler(async (req, res) => {
  const data = await Department.find({ isActive: true })
    .populate("head", "firstName lastName employeeId")
    .sort("name");
  res.json({ success: true, count: data.length, data });
});

// GET /api/departments/available — standard departments not yet created
export const availableDepartments = asyncHandler(async (req, res) => {
  const existing = await Department.find().select("name");
  const taken = new Set(existing.map((d) => d.name));
  res.json({ success: true, data: STANDARD_DEPARTMENTS.filter((d) => !taken.has(d.name)) });
});

export const createDepartment = asyncHandler(async (req, res) => {
  if (!DEPARTMENT_NAMES.includes(req.body.name)) {
    throw new ApiError(400, `Department must be one of: ${DEPARTMENT_NAMES.join(", ")}`);
  }
  const standard = STANDARD_DEPARTMENTS.find((d) => d.name === req.body.name);
  const data = await Department.create({ name: req.body.name, code: standard?.code || req.body.code });
  res.status(201).json({ success: true, data });
});

export const updateDepartment = asyncHandler(async (req, res) => {
  if (req.body.name && !DEPARTMENT_NAMES.includes(req.body.name)) {
    throw new ApiError(400, `Department must be one of: ${DEPARTMENT_NAMES.join(", ")}`);
  }
  const data = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!data) throw new ApiError(404, "Department not found");
  res.json({ success: true, data });
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const inUse = await Employee.countDocuments({ department: req.params.id });
  if (inUse) throw new ApiError(400, `${inUse} employee(s) are still in this department`);
  await Department.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Department deleted" });
});
