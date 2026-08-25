import mongoose from "mongoose";

export const DOC_TYPES = [
  "aadhaar",
  "pan",
  "photo",
  "resume",
  "offer-letter",
  "appointment-letter",
  "education-certificate",
  "experience-letter",
  "bank-proof",
  "address-proof",
  "other",
];

const documentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    docType: { type: String, enum: DOC_TYPES, required: true },
    title: String,
    fileId: { type: String, required: true }, // GridFS _id
    originalName: String,
    mimeType: String,
    size: Number,
    expiryDate: Date,
    status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    rejectionReason: String,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

documentSchema.index({ employee: 1, docType: 1 });

export default mongoose.model("Document", documentSchema);
