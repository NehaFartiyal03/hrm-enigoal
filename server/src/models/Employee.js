import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, index: true },

    // Personal
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    dateOfBirth: Date,
    bloodGroup: String,
    maritalStatus: { type: String, enum: ["single", "married", "other"] },

    // Contact
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    emergencyContact: { name: String, relation: String, phone: String },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "India" },
    },

    // Job
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    designation: { type: String, trim: true },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "intern", "contract"],
      default: "full-time",
    },
    dateOfJoining: { type: Date, required: true },
    dateOfLeaving: Date,
    reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    workLocation: String,

    // Identity
    aadhaarNumber: { type: String, trim: true },
    passportNumber: { type: String, uppercase: true, trim: true },
    nationality: { type: String, default: "Indian" },
    pan: { type: String, uppercase: true, trim: true },
    uan: String,

    // Payroll / bank
    ctc: Number,
    bankAccount: {
      accountName: String,
      accountNumber: String,
      ifsc: String,
      bankName: String,
      branchName: String,
    },

    photoFileId: String,
    status: {
      type: String,
      enum: ["active", "probation", "notice", "resigned", "terminated"],
      default: "probation",
    },
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

employeeSchema.virtual("fullName").get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(" ");
});

employeeSchema.index({ firstName: "text", lastName: "text", employeeId: "text", email: "text" });

export default mongoose.model("Employee", employeeSchema);
