import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    leaveType: {
      type: String,
      enum: ["casual", "sick", "earned", "unpaid", "maternity", "paternity"],
      required: true,
    },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    days: Number,
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actionAt: Date,
    actionRemarks: String,
  },
  { timestamps: true }
);

leaveSchema.index({ employee: 1, fromDate: -1 });

export default mongoose.model("Leave", leaveSchema);
