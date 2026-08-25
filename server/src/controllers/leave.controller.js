import Leave from "../models/Leave.js";
import Attendance from "../models/Attendance.js";
import { isEmployeeRole } from "../models/User.js";
import { asyncHandler, ApiError } from "../utils/asyncHandler.js";
import { normalizeDate } from "../utils/date.js";

const dayCount = (from, to) =>
  Math.round((normalizeDate(to) - normalizeDate(from)) / 86400000) + 1;

// POST /api/leaves
// Anyone signed in can apply for their own leave. Admin/HR/manager may
// additionally file a request on behalf of another employee; the
// self-service "team" roles can only ever apply for themselves — the
// employee field from the request body is ignored for them.
export const applyLeave = asyncHandler(async (req, res) => {
  const { leaveType, fromDate, toDate, reason } = req.body;
  const employee = isEmployeeRole(req.user.role)
    ? req.user.employee?._id
    : (req.body.employee || req.user.employee?._id);
  if (!employee) throw new ApiError(400, "No employee linked to this account");

  const days = dayCount(fromDate, toDate);
  if (days <= 0) throw new ApiError(400, "End date must be on or after the start date");

  const overlap = await Leave.findOne({
    employee,
    status: { $in: ["pending", "approved"] },
    fromDate: { $lte: normalizeDate(toDate) },
    toDate: { $gte: normalizeDate(fromDate) },
  });
  if (overlap) throw new ApiError(409, "You already have a leave request covering these dates");

  const leave = await Leave.create({
    employee,
    leaveType,
    fromDate: normalizeDate(fromDate),
    toDate: normalizeDate(toDate),
    days,
    reason,
  });
  res.status(201).json({ success: true, data: leave });
});

// GET /api/leaves?status=&employee=
export const listLeaves = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.employee) query.employee = req.query.employee;
  if (isEmployeeRole(req.user.role)) query.employee = req.user.employee?._id;

  const data = await Leave.find(query)
    .populate("employee", "employeeId firstName lastName department reportingTo")
    .sort("-createdAt");

  const filtered =
    req.user.role === "manager"
      ? data.filter(
          (l) => l.employee?.reportingTo?.toString() === req.user.employee?._id.toString()
        )
      : data;

  res.json({ success: true, count: filtered.length, data: filtered });
});

/**
 * PATCH /api/leaves/:id/action  (hr, manager)
 * Approving a leave also writes "leave" onto the attendance sheet for those
 * days, so HR never has to mark the same absence twice.
 */
export const actionLeave = asyncHandler(async (req, res) => {
  const { status, actionRemarks } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    throw new ApiError(400, "Status must be approved or rejected");
  }
  const leave = await Leave.findById(req.params.id);
  if (!leave) throw new ApiError(404, "Leave request not found");
  if (leave.status !== "pending") throw new ApiError(400, "This request has already been actioned");

  leave.status = status;
  leave.actionBy = req.user._id;
  leave.actionAt = new Date();
  leave.actionRemarks = actionRemarks;
  await leave.save();

  if (status === "approved") {
    const ops = [];
    for (let d = new Date(leave.fromDate); d <= leave.toDate; d.setDate(d.getDate() + 1)) {
      ops.push({
        updateOne: {
          filter: { employee: leave.employee, date: normalizeDate(d) },
          update: {
            $set: { status: "leave", remarks: `${leave.leaveType} leave`, markedBy: req.user._id },
          },
          upsert: true,
        },
      });
    }
    if (ops.length) await Attendance.bulkWrite(ops, { ordered: false });
  }

  res.json({ success: true, data: leave });
});

// PATCH /api/leaves/:id/cancel
export const cancelLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) throw new ApiError(404, "Leave request not found");
  if (leave.employee.toString() !== req.user.employee?._id.toString() &&
      !["hr", "manager"].includes(req.user.role)) {
    throw new ApiError(403, "You can only cancel your own request");
  }
  if (leave.status === "approved" && isEmployeeRole(req.user.role)) {
    throw new ApiError(400, "Approved leave can only be cancelled by HR");
  }
  leave.status = "cancelled";
  await leave.save();
  res.json({ success: true, data: leave });
});
