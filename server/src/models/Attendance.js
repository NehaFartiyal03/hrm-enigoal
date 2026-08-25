import mongoose from "mongoose";

export const ATTENDANCE_STATUS = [
  "present",
  "absent",
  "half-day",
  "leave",
  "wfh",
  "holiday",
  "weekoff",
];

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    // Normalised to 00:00 IST — this is what makes the unique index reliable
    date: { type: Date, required: true },
    status: { type: String, enum: ATTENDANCE_STATUS, required: true },
    checkIn: String,   // "09:30"
    checkOut: String,  // "18:45"
    workHours: Number,
    remarks: String,
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One record per employee per day. Bulk marking uses upsert against this.
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

export default mongoose.model("Attendance", attendanceSchema);
