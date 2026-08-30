import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import { asyncHandler, ApiError } from "../utils/asyncHandler.js";
import { normalizeDate, todayIST, monthRange, diffHours, isWeekend } from "../utils/date.js";

/**
 * GET /api/attendance/sheet?date=2026-08-08
 * Returns EVERY active employee with their record for that day (or null).
 * This is the mark-sheet HR opens each morning.
 */
export const getSheet = asyncHandler(async (req, res) => {
  const date = req.query.date ? normalizeDate(req.query.date) : todayIST();

  const employeeQuery = { status: { $in: ["active", "probation", "notice"] } };
  if (req.user.role === "manager") employeeQuery.reportingTo = req.user.employee?._id;

  const employees = await Employee.find(employeeQuery)
    .select("employeeId firstName lastName designation department photoFileId")
    .populate("department", "name")
    .sort("employeeId");

  const records = await Attendance.find({
    date,
    employee: { $in: employees.map((e) => e._id) },
  });
  const map = new Map(records.map((r) => [r.employee.toString(), r]));

  const sheet = employees.map((e) => ({
    employee: {
      _id: e._id,
      employeeId: e.employeeId,
      name: e.fullName,
      designation: e.designation,
      department: e.department?.name,
      photoFileId: e.photoFileId,
    },
    attendance: map.get(e._id.toString()) || null,
  }));

  res.json({
    success: true,
    date,
    isWeekend: isWeekend(date),
    marked: records.length,
    total: employees.length,
    data: sheet,
  });
});

/**
 * POST /api/attendance/bulk   (hr, manager)
 * body: { date, records: [{ employee, status, checkIn, checkOut, remarks }] }
 * Upserts against the { employee, date } unique index — safe to re-submit.
 */
export const bulkMark = asyncHandler(async (req, res) => {
  const { date, records } = req.body;
  if (!Array.isArray(records) || !records.length) {
    throw new ApiError(400, "No attendance records supplied");
  }
  const day = normalizeDate(date || new Date());
  if (day > todayIST()) throw new ApiError(400, "You cannot mark attendance for a future date");

  const ops = records.map((r) => ({
    updateOne: {
      filter: { employee: r.employee, date: day },
      update: {
        $set: {
          status: r.status,
          checkIn: r.checkIn || undefined,
          checkOut: r.checkOut || undefined,
          workHours: diffHours(r.checkIn, r.checkOut),
          remarks: r.remarks || undefined,
          markedBy: req.user._id,
        },
      },
      upsert: true,
    },
  }));

  const result = await Attendance.bulkWrite(ops, { ordered: false });
  res.json({
    success: true,
    message: `Attendance saved for ${records.length} employee(s)`,
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
  });
});

/** POST /api/attendance/mark-all — one-click "everyone present" then edit exceptions */
export const markAllPresent = asyncHandler(async (req, res) => {
  const day = normalizeDate(req.body.date || new Date());
  if (day > todayIST()) throw new ApiError(400, "You cannot mark attendance for a future date");

  const employees = await Employee.find({
    status: { $in: ["active", "probation", "notice"] },
  }).select("_id");

  const ops = employees.map((e) => ({
    updateOne: {
      filter: { employee: e._id, date: day },
      update: {
        $setOnInsert: {
          status: req.body.status || "present",
          checkIn: req.body.checkIn || "09:30",
          checkOut: req.body.checkOut || "18:30",
          workHours: diffHours(req.body.checkIn || "09:30", req.body.checkOut || "18:30"),
          markedBy: req.user._id,
        },
      },
      upsert: true,
    },
  }));

  const result = await Attendance.bulkWrite(ops, { ordered: false });
  res.json({
    success: true,
    message: `${result.upsertedCount} employee(s) marked. Existing records were left untouched.`,
  });
});

/** GET /api/attendance/employee/:id?year=2026&month=8 — monthly calendar + summary */
export const employeeMonth = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const { from, to } = monthRange(year, month);

  const records = await Attendance.find({
    employee: req.params.id,
    date: { $gte: from, $lte: to },
  }).sort("date");

  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  summary.payableDays =
    (summary.present || 0) + (summary.wfh || 0) + (summary["half-day"] || 0) * 0.5;
  summary.totalHours = +records.reduce((s, r) => s + (r.workHours || 0), 0).toFixed(2);

  res.json({ success: true, year, month, summary, data: records });
});

/** GET /api/attendance/summary?date= — dashboard counters for one day */
export const daySummary = asyncHandler(async (req, res) => {
  const date = req.query.date ? normalizeDate(req.query.date) : todayIST();
  const [counts, headcount] = await Promise.all([
    Attendance.aggregate([
      { $match: { date } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Employee.countDocuments({ status: { $in: ["active", "probation", "notice"] } }),
  ]);
  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  const marked = counts.reduce((s, c) => s + c.count, 0);
  res.json({
    success: true,
    date,
    data: { ...byStatus, headcount, marked, unmarked: headcount - marked },
  });
});

/** PUT /api/attendance/:id — correct a single record */
export const updateRecord = asyncHandler(async (req, res) => {
  const { status, checkIn, checkOut, remarks } = req.body;
  const record = await Attendance.findByIdAndUpdate(
    req.params.id,
    { status, checkIn, checkOut, remarks, workHours: diffHours(checkIn, checkOut), markedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!record) throw new ApiError(404, "Attendance record not found");
  res.json({ success: true, data: record });
});

/** GET /api/attendance/report?from=&to= — monthly export feed for payroll */
export const report = asyncHandler(async (req, res) => {
  const from = normalizeDate(req.query.from || new Date());
  const to = normalizeDate(req.query.to || new Date());

  const data = await Attendance.aggregate([
    { $match: { date: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: "$employee",
        present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
        leave: { $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] } },
        halfDay: { $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 1, 0] } },
        wfh: { $sum: { $cond: [{ $eq: ["$status", "wfh"] }, 1, 0] } },
        hours: { $sum: "$workHours" },
      },
    },
    { $lookup: { from: "employees", localField: "_id", foreignField: "_id", as: "emp" } },
    { $unwind: "$emp" },
    {
      $project: {
        employeeId: "$emp.employeeId",
        name: { $concat: ["$emp.firstName", " ", { $ifNull: ["$emp.lastName", ""] }] },
        present: 1, absent: 1, leave: 1, halfDay: 1, wfh: 1, hours: 1,
        payableDays: { $add: ["$present", "$wfh", { $multiply: ["$halfDay", 0.5] }] },
      },
    },
    { $sort: { employeeId: 1 } },
  ]);

  res.json({ success: true, from, to, data });
});
