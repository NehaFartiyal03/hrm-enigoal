import express from "express";
import {
  listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee,
  uploadPhoto, getPhoto, verifyEmployeeId, employeeStats,
} from "../controllers/employee.controller.js";
import { protect, authorize, selfOrPrivileged, canEditEmployee } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Public — QR code on the ID card points here, and the verification page it
// opens shows the photo, so the photo stream has to be reachable without a
// session too. Both are keyed by an ID you can only have if you hold the card.
router.get("/verify/:employeeId", verifyEmployeeId);
router.get("/:id/photo", getPhoto);

router.use(protect);

router.get("/stats/overview", authorize("hr", "manager"), employeeStats);

router.route("/")
  .get(listEmployees)
  .post(authorize("hr"), createEmployee);

router.route("/:id")
  .get(selfOrPrivileged(), getEmployee)
  .put(canEditEmployee(), updateEmployee)
  .delete(authorize("hr"), deleteEmployee);

router.post("/:id/photo", selfOrPrivileged(), upload.single("file"), uploadPhoto);

export default router;
