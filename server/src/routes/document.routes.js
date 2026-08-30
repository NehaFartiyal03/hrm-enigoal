import express from "express";
import {
  uploadDocument, listDocuments, downloadDocument, verifyDocument,
  deleteDocument, storageStats, missingDocuments,
} from "../controllers/document.controller.js";
import { protect, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();
router.use(protect);

router.get("/storage", authorize("hr"), storageStats);
router.get("/missing/:employeeId", missingDocuments);

router.route("/")
  .get(listDocuments)
  .post(authorize("hr", "manager"), upload.single("file"), uploadDocument);

router.get("/:id/download", downloadDocument);
router.patch("/:id/verify", authorize("hr"), verifyDocument);
router.delete("/:id", authorize("hr", "manager"), deleteDocument);

export default router;
