import express from "express";
import { applyLeave, listLeaves, actionLeave, cancelLeave } from "../controllers/leave.controller.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

router.route("/").get(listLeaves).post(applyLeave);
router.patch("/:id/action", authorize("hr", "manager"), actionLeave);
router.patch("/:id/cancel", cancelLeave);

export default router;
