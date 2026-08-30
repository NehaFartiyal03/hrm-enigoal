import User from "../models/User.js";
import Employee from "../models/Employee.js";
import { asyncHandler, ApiError } from "../utils/asyncHandler.js";
import { sendToken } from "../utils/token.js";

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "Email and password are required");

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.isActive) throw new ApiError(403, "Your account has been deactivated");

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  sendToken(user, res);
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "employee",
    populate: { path: "department", select: "name code" },
  });
  res.json({ success: true, data: user });
});

// POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out" });
};

// PUT /api/auth/password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.matchPassword(currentPassword))) {
    throw new ApiError(401, "Current password is incorrect");
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: "Password updated" });
});

// POST /api/auth/users  (hr, manager) — create a login for an existing employee
export const createUser = asyncHandler(async (req, res) => {
  const { email, password, role, employeeId } = req.body;
  const employee = employeeId ? await Employee.findById(employeeId) : null;
  if (employeeId && !employee) throw new ApiError(404, "Employee not found");

  const user = await User.create({
    email,
    password,
    role: role || "digital_team",
    employee: employee?._id,
  });
  res.status(201).json({ success: true, data: { id: user._id, email: user.email, role: user.role } });
});

// GET /api/auth/users (hr, manager)
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().populate("employee", "employeeId firstName lastName").sort("-createdAt");
  res.json({ success: true, count: users.length, data: users });
});

// PATCH /api/auth/users/:id (hr, manager) — change role / activate / deactivate
export const updateUser = asyncHandler(async (req, res) => {
  const { role, isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  const isSelf = user._id.toString() === req.user._id.toString();
  if (isSelf && isActive === false) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }
  // Guards against locking yourself out of Settings by demoting your own login.
  if (isSelf && role !== undefined && role !== user.role) {
    throw new ApiError(400, "You cannot change your own role — ask the other HR/manager account");
  }
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  await user.save();
  res.json({ success: true, data: user });
});

// PATCH /api/auth/users/:id/reset-password (hr, manager)
// Lets an HR/manager set a fresh password for someone who's forgotten theirs.
// Use the "Change your password" form instead if you're resetting your own.
export const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "Use \"Change your password\" above to reset your own password");
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: `Password reset for ${user.email}` });
});
