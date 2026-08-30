import express from "express";
import {
  listDepartments, availableDepartments, createDepartment, updateDepartment, deleteDepartment,
} from "../controllers/department.controller.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();
router.use(protect);

router.get("/available", authorize("hr", "manager"), availableDepartments);
router.route("/").get(listDepartments).post(authorize("hr", "manager"), createDepartment);
router.route("/:id")
  .put(authorize("hr", "manager"), updateDepartment)
  .delete(authorize("hr", "manager"), deleteDepartment);

export default router;
