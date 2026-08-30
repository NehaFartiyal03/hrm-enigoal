import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler, ApiError } from "../utils/asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) throw new ApiError(401, "Not authorised — please log in");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Session expired — please log in again");
  }

  const user = await User.findById(decoded.id).populate("employee", "employeeId firstName lastName department");
  if (!user || !user.isActive) throw new ApiError(401, "Account is inactive");

  req.user = user;
  next();
});

/** authorize("hr", "manager") */
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission for this action"));
    }
    next();
  };

/**
 * Employees may only VIEW their own record. HR sees everyone,
 * managers see their own reportees (checked in the controller).
 */
export const selfOrPrivileged = (paramKey = "id") =>
  asyncHandler(async (req, res, next) => {
    if (["hr"].includes(req.user.role)) return next();
    const targetId = req.params[paramKey];
    if (req.user.employee && req.user.employee._id.toString() === targetId) return next();
    if (req.user.role === "manager") {
      const Employee = (await import("../models/Employee.js")).default;
      const target = await Employee.findById(targetId).select("reportingTo");
      if (target?.reportingTo?.toString() === req.user.employee?._id.toString()) return next();
    }
    throw new ApiError(403, "You can only access your own records");
  });

/**
 * Editing employee details is restricted to HR and managers
 * (managers only for their own reportees). The self-service "team" roles
 * (digital_team, sales_team, admin_team) can view their own record but
 * can no longer edit it — they must ask HR/their manager to update it.
 */
export const canEditEmployee = (paramKey = "id") =>
  asyncHandler(async (req, res, next) => {
    if (["hr"].includes(req.user.role)) return next();
    if (req.user.role === "manager") {
      const targetId = req.params[paramKey];
      const Employee = (await import("../models/Employee.js")).default;
      const target = await Employee.findById(targetId).select("reportingTo");
      if (target?.reportingTo?.toString() === req.user.employee?._id.toString()) return next();
      throw new ApiError(403, "You can only edit employees who report to you");
    }
    throw new ApiError(403, "Only HR or your manager can edit employee details");
  });
