import multer from "multer";
import { ApiError } from "../utils/asyncHandler.js";

const MAX_MB = Number(process.env.MAX_FILE_MB || 2);

const ALLOWED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const upload = multer({
  storage: multer.memoryStorage(), // buffer goes straight into GridFS
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new ApiError(415, "Only PDF, JPG, PNG or WEBP files are allowed"));
    }
    cb(null, true);
  },
});
