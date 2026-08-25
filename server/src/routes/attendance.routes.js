import express from "express";
import {
  getSheet, bulkMark, markAllPresent, employeeMonth, daySummary, updateRecord, report,
} from "../controllers/attendance.controller.js";
import { protect, authorize, selfOrPrivileged } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

router.get("/sheet", authorize("hr", "manager"), getSheet);
router.get("/summary", authorize("hr", "manager"), daySummary);
router.get("/report", authorize("hr"), report);
router.get("/employee/:id", selfOrPrivileged(), employeeMonth);

router.post("/bulk", authorize("hr", "manager"), bulkMark);
router.post("/mark-all", authorize("hr"), markAllPresent);
router.put("/:id", authorize("hr"), updateRecord);

export default router;
