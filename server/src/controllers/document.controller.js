import Document from "../models/Document.js";
import Employee from "../models/Employee.js";
import { asyncHandler, ApiError } from "../utils/asyncHandler.js";
import { saveFile, getFileStream, deleteFile, storageUsed } from "../config/storage.js";
import { compressIfImage } from "../utils/compress.js";

// Viewing/downloading: the employee themself, or HR, can always see it
const canAccess = (user, employeeId) =>
  ["hr"].includes(user.role) ||
  user.employee?._id.toString() === employeeId.toString();

// Uploading/managing: only HR, or a manager for their own reportees.
// Employees never upload or delete their own documents — HR/manager does it for them.
const canManage = async (user, employee) => {
  if (["hr"].includes(user.role)) return true;
  if (user.role === "manager") {
    return employee.reportingTo?.toString() === user.employee?._id.toString();
  }
  return false;
};

// POST /api/documents  (multipart: file, employee, docType, title, expiryDate)
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded");
  const { employee: employeeId, docType, title, expiryDate } = req.body;

  const employee = await Employee.findById(employeeId);
  if (!employee) throw new ApiError(404, "Employee not found");
  if (!(await canManage(req.user, employee))) {
    throw new ApiError(403, "Only HR or this employee's manager can upload documents");
  }

  const file = await compressIfImage(req.file);
  const { fileId, size } = await saveFile(file.buffer, {
    filename: `${employee.employeeId}-${docType}-${Date.now()}`,
    mimetype: file.mimetype,
    metadata: { employee: employee._id.toString(), docType },
  });

  const doc = await Document.create({
    employee: employee._id,
    docType,
    title: title || docType,
    fileId,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size,
    expiryDate: expiryDate || undefined,
    uploadedBy: req.user._id,
  });

  res.status(201).json({ success: true, data: doc });
});

// GET /api/documents?employee=&docType=&status=
export const listDocuments = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.docType) query.docType = req.query.docType;
  if (req.query.status) query.status = req.query.status;

  if (["hr"].includes(req.user.role)) {
    if (req.query.employee) query.employee = req.query.employee;
  } else if (req.user.role === "manager") {
    // Managers see documents for their own reportees (plus their own, if requested)
    const reportees = await Employee.find({ reportingTo: req.user.employee?._id }).select("_id");
    const scopeIds = reportees.map((e) => e._id.toString());
    if (req.user.employee?._id) scopeIds.push(req.user.employee._id.toString());
    query.employee = req.query.employee && scopeIds.includes(req.query.employee)
      ? req.query.employee
      : { $in: scopeIds };
  } else {
    // Employees only ever see their own
    query.employee = req.user.employee?._id;
  }

  const data = await Document.find(query)
    .populate("employee", "employeeId firstName lastName")
    .populate("verifiedBy", "email")
    .sort("-createdAt");

  res.json({ success: true, count: data.length, data });
});

// GET /api/documents/:id/download — streams out of GridFS
export const downloadDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Document not found");
  if (!canAccess(req.user, doc.employee)) throw new ApiError(403, "Access denied");

  const result = await getFileStream(doc.fileId);
  if (!result) throw new ApiError(404, "File missing from storage");

  const disposition = req.query.inline === "true" ? "inline" : "attachment";
  res.set("Content-Type", doc.mimeType || result.file.contentType);
  res.set("Content-Disposition", `${disposition}; filename="${doc.originalName || "document"}"`);
  result.stream.pipe(res);
});

// PATCH /api/documents/:id/verify  (hr)
export const verifyDocument = asyncHandler(async (req, res) => {
  const { status, rejectionReason } = req.body;
  if (!["verified", "rejected", "pending"].includes(status)) {
    throw new ApiError(400, "Status must be verified, rejected or pending");
  }
  if (status === "rejected" && !rejectionReason) {
    throw new ApiError(400, "Please give a reason for rejection");
  }

  const doc = await Document.findByIdAndUpdate(
    req.params.id,
    {
      status,
      rejectionReason: status === "rejected" ? rejectionReason : undefined,
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
    },
    { new: true }
  );
  if (!doc) throw new ApiError(404, "Document not found");
  res.json({ success: true, data: doc });
});

// DELETE /api/documents/:id
export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw new ApiError(404, "Document not found");
  const employee = await Employee.findById(doc.employee).select("reportingTo");
  if (!employee || !(await canManage(req.user, employee))) {
    throw new ApiError(403, "Only HR or this employee's manager can remove documents");
  }
  if (doc.status === "verified" && !["hr"].includes(req.user.role)) {
    throw new ApiError(403, "Verified documents can only be removed by HR");
  }

  await deleteFile(doc.fileId);
  await doc.deleteOne();
  res.json({ success: true, message: "Document deleted" });
});

/**
 * GET /api/documents/storage — how much of the 512 MB free tier is gone.
 * Worth showing on the HR dashboard so you get warned before you hit the wall.
 */
export const storageStats = asyncHandler(async (req, res) => {
  const { bytes, count } = await storageUsed();
  const limitBytes = 512 * 1024 * 1024;
  res.json({
    success: true,
    data: {
      files: count,
      usedMB: +(bytes / 1024 / 1024).toFixed(2),
      limitMB: 512,
      percentUsed: +((bytes / limitBytes) * 100).toFixed(1),
    },
  });
});

// GET /api/documents/missing/:employeeId — checklist of what is still not on file
export const missingDocuments = asyncHandler(async (req, res) => {
  const REQUIRED = ["aadhaar", "pan", "photo", "resume", "bank-proof", "education-certificate"];
  const docs = await Document.find({
    employee: req.params.employeeId,
    status: { $ne: "rejected" },
  }).select("docType");
  const have = new Set(docs.map((d) => d.docType));
  res.json({
    success: true,
    data: {
      required: REQUIRED,
      submitted: [...have].filter((d) => REQUIRED.includes(d)),
      missing: REQUIRED.filter((d) => !have.has(d)),
    },
  });
});
