import express from "express";
import rateLimit from "express-rate-limit";
import { login, logout, getMe, changePassword, createUser, listUsers, updateUser, resetUserPassword }
  from "../controllers/auth.controller.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { success: false, message: "Too many login attempts. Try again in 15 minutes." },
});

router.post("/login", loginLimiter, login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/password", protect, changePassword);

// User management lives on the Settings screen — HR and managers only.
router.route("/users")
  .get(protect, authorize("hr", "manager"), listUsers)
  .post(protect, authorize("hr", "manager"), createUser);
router.patch("/users/:id", protect, authorize("hr", "manager"), updateUser);
router.patch("/users/:id/reset-password", protect, authorize("hr", "manager"), resetUserPassword);

export default router;
