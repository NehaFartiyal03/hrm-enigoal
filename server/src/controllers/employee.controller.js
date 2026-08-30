import mongoose from "mongoose";
import Employee from "../models/Employee.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Document from "../models/Document.js";
import { asyncHandler, ApiError } from "../utils/asyncHandler.js";
import {
  saveFile,
  deleteFile,
  getFileStream,
} from "../config/storage.js";
import { generateEmployeeId } from "../utils/generateEmployeeId.js";
import { compressAvatar } from "../utils/compress.js";

// GET /api/employees?search=&department=&status=&page=&limit=
export const listEmployees = asyncHandler(async (req, res) => {
  const {
    search,
    department,
    status,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};

  if (department) {
    query.department = department;
  }

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { firstName: new RegExp(search, "i") },
      { lastName: new RegExp(search, "i") },
      { employeeId: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
    ];
  }

  // Managers only see their own team
  if (req.user.role === "manager") {
    query.reportingTo = req.user.employee?._id;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    Employee.find(query)
      .populate("department", "name code")
      .populate(
        "reportingTo",
        "firstName lastName employeeId"
      )
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit)),

    Employee.countDocuments(query),
  ]);

  res.json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data,
  });
});

// GET /api/employees/:id
export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate("department", "name code")
    .populate(
      "reportingTo",
      "firstName lastName employeeId designation"
    );

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  res.json({
    success: true,
    data: employee,
  });
});

/**
 * POST /api/employees
 *
 * The employee ID is generated HERE, on the server,
 * the moment the details form is saved.
 * The client never sends or guesses it.
 */
export const createEmployee = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  // Never trust a client-supplied employee ID
  delete payload.employeeId;

  // Generate employee ID on server
  payload.employeeId = await generateEmployeeId(
    payload.dateOfJoining
  );

  // Check whether profile is complete
  payload.profileCompleted = Boolean(
    payload.firstName &&
      payload.phone &&
      payload.dateOfJoining &&
      payload.designation
  );

  const employee = await Employee.create(payload);

  // Optionally create login account
  if (req.body.createLogin) {
    await User.create({
      email: employee.email,
      password:
        req.body.tempPassword ||
        `${employee.employeeId}@2026`,
      role: req.body.role || "digital_team",
      employee: employee._id,
    });
  }

  res.status(201).json({
    success: true,
    data: employee,
  });
});

// PUT /api/employees/:id
//
// Restricted at route level to HR and
// managers-of-reportees.
//
// Self-service team roles cannot reach this handler.
export const updateEmployee = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  // Employee IDs are immutable
  delete payload.employeeId;

  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    payload,
    {
      new: true,
      runValidators: true,
    }
  ).populate("department", "name code");

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  res.json({
    success: true,
    data: employee,
  });
});

// DELETE /api/employees/:id
//
// HR only — soft delete by default
export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // HARD DELETE
  if (req.query.hard === "true") {
    const docs = await Document.find({
      employee: employee._id,
    });

    await Promise.all(
      docs.map((d) => deleteFile(d.fileId))
    );

    // Delete employee photo if available
    if (employee.photoFileId) {
      await deleteFile(employee.photoFileId);
    }

    await Document.deleteMany({
      employee: employee._id,
    });

    await Attendance.deleteMany({
      employee: employee._id,
    });

    await User.deleteMany({
      employee: employee._id,
    });

    await employee.deleteOne();

    return res.json({
      success: true,
      message:
        "Employee and all related records deleted",
    });
  }

  // SOFT DELETE
  employee.status = "resigned";

  employee.dateOfLeaving =
    employee.dateOfLeaving || new Date();

  await employee.save();

  await User.updateMany(
    { employee: employee._id },
    { isActive: false }
  );

  res.json({
    success: true,
    message:
      "Employee marked as exited and login disabled",
  });
});

// POST /api/employees/:id/photo
export const uploadPhoto = asyncHandler(async (req, res) => {
  // Check uploaded file
  if (!req.file) {
    throw new ApiError(400, "No image uploaded");
  }

  // Find employee
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Compress image
  const buffer = await compressAvatar(req.file.buffer);

  // Save image
  const { fileId } = await saveFile(buffer, {
    filename: `${employee.employeeId}-photo.jpg`,
    mimetype: "image/jpeg",

    metadata: {
      employee: employee._id.toString(),
      kind: "photo",
    },
  });

  // Delete old photo if exists
  if (employee.photoFileId) {
    await deleteFile(employee.photoFileId);
  }

  // Save new photo ID
  employee.photoFileId = fileId;

  await employee.save();

  res.json({
    success: true,
    data: {
      photoFileId: fileId,
    },
  });
});

// GET /api/employees/:id/photo
//
// Stream employee photo.
// No authentication needed for ID card rendering.
export const getPhoto = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(
    req.params.id
  ).select("photoFileId");

  // Employee doesn't exist
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  // Employee exists but has no photo
  //
  // IMPORTANT:
  // Do not throw "No photo on file".
  // This prevents repeated 404 errors in the server console.
  if (!employee.photoFileId) {
    return res.status(204).end();
  }

  // Get photo from storage
  const result = await getFileStream(
    employee.photoFileId
  );

  // Photo record doesn't exist in storage
  if (!result) {
    return res.status(204).end();
  }

  // Set content type
  res.set(
    "Content-Type",
    result.file.contentType || "image/jpeg"
  );

  // Cache photo
  res.set(
    "Cache-Control",
    "private, max-age=86400"
  );

  // Stream image to browser
  result.stream.pipe(res);
});

/**
 * GET /api/employees/verify/:employeeId
 *
 * PUBLIC
 *
 * Target of QR code printed on ID card.
 * Returns minimum information needed
 * to verify the employee ID.
 */
export const verifyEmployeeId = asyncHandler(
  async (req, res) => {
    const employee = await Employee.findOne({
      employeeId:
        req.params.employeeId.toUpperCase(),
    })
      .select(
        "employeeId firstName lastName designation status dateOfJoining photoFileId"
      )
      .populate("department", "name");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "No such employee ID",
      });
    }

    res.json({
      success: true,

      data: {
        employeeId: employee.employeeId,

        name: employee.fullName,

        designation: employee.designation,

        department:
          employee.department?.name,

        dateOfJoining:
          employee.dateOfJoining,

        photoUrl: employee.photoFileId
          ? `/api/employees/${employee._id}/photo`
          : null,

        valid: [
          "active",
          "probation",
          "notice",
        ].includes(employee.status),
      },
    });
  }
);

// GET /api/employees/stats/overview
export const employeeStats = asyncHandler(
  async (req, res) => {
    const [
      byStatus,
      byDept,
      total,
      newThisMonth,
    ] = await Promise.all([
      // Employees by status
      Employee.aggregate([
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      // Employees by department
      Employee.aggregate([
        {
          $group: {
            _id: "$department",
            count: {
              $sum: 1,
            },
          },
        },

        {
          $lookup: {
            from: "departments",
            localField: "_id",
            foreignField: "_id",
            as: "dept",
          },
        },

        {
          $project: {
            name: {
              $ifNull: [
                {
                  $first: "$dept.name",
                },
                "Unassigned",
              ],
            },

            count: 1,
          },
        },
      ]),

      // Total employees
      Employee.countDocuments(),

      // New employees this month
      Employee.countDocuments({
        dateOfJoining: {
          $gte: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ),
        },
      }),
    ]);

    res.json({
      success: true,

      data: {
        total,
        newThisMonth,
        byStatus,
        byDept,
      },
    });
  }
);