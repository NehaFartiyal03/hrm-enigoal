/**
 * Emergency password reset — run directly on the server when nobody has
 * Settings access to reset a password through the app (e.g. you're the
 * only HR/manager account and you've forgotten your own password).
 *
 * Usage:
 *   npm run reset:password -- someone@enigoal.com NewPassword123
 *
 * The password is hashed the same way as a normal save (bcrypt, via the
 * User model's pre-save hook), so the account logs in normally afterwards.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";

dotenv.config();

const [, , email, newPassword] = process.argv;

const run = async () => {
  if (!email || !newPassword) {
    console.error("\n  Usage: npm run reset:password -- <email> <newPassword>\n");
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error("\n  Password must be at least 8 characters.\n");
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.error(`\n  No account found for ${email}\n`);
    return mongoose.connection.close();
  }

  user.password = newPassword;
  await user.save();

  console.log(`\n  Password reset for ${user.email} (role: ${user.role}).`);
  console.log("  They can log in with the new password now.\n");

  await mongoose.connection.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
