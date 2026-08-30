import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Employee from "./models/Employee.js";
import Department from "./models/Department.js";
import { generateEmployeeId } from "./utils/generateEmployeeId.js";
import { STANDARD_DEPARTMENTS } from "./utils/departments.js";

dotenv.config();

const run = async () => {
  await connectDB();

  const departments = await Department.insertMany(STANDARD_DEPARTMENTS, { ordered: false })
    .catch(() => Department.find());

  const HR_EMAIL = "hr@enigoal.com";

  const exists = await User.findOne({ email: HR_EMAIL });
  if (exists) {
    console.log("HR account already exists — skipping.");
    return mongoose.connection.close();
  }

  const employee = await Employee.create({
    employeeId: await generateEmployeeId(),
    firstName: "HR",
    lastName: "Manager",
    email: HR_EMAIL,
    phone: "9999999999",
    designation: "HR Manager",
    department: departments[0]?._id,
    dateOfJoining: new Date(),
    status: "active",
    profileCompleted: true,
  });

  await User.create({
    email: HR_EMAIL,
    password: "Enigoal@123",
    role: "hr",
    employee: employee._id,
  });

  console.log("\n  Seed complete");
  console.log(`  Login: ${HR_EMAIL}`);
  console.log("  Password: Enigoal@123   <-- change this immediately\n");
  await mongoose.connection.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
