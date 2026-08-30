/**
 * One-time migration: the "admin" role no longer exists.
 *
 * Any account still stored with role "admin" is moved to "hr", which now
 * carries the full permission set (user management, settings, hard delete).
 * Run this ONCE against an existing database, before starting the new server:
 *
 *   npm run migrate:roles
 *
 * Safe to run more than once — it does nothing if no admin rows are left.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";

dotenv.config();

const run = async () => {
  await connectDB();

  // Bypasses the schema enum on purpose — "admin" is no longer a valid value,
  // so these rows can only be found/updated through the raw collection.
  const users = User.collection;
  const stale = await users.find({ role: "admin" }).toArray();

  if (!stale.length) {
    console.log("\n  Nothing to migrate — no accounts are using the old admin role.\n");
    return mongoose.connection.close();
  }

  const { modifiedCount } = await users.updateMany({ role: "admin" }, { $set: { role: "hr" } });

  console.log(`\n  Migrated ${modifiedCount} account(s) from admin to hr:`);
  stale.forEach((u) => console.log(`   - ${u.email}`));
  console.log("\n  These logins keep working, with HR-level access.\n");

  await mongoose.connection.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
