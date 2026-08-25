import Counter from "../models/Counter.js";

/**
 * Atomic, race-safe employee ID: ENG-26-0001
 * NEVER derive this from countDocuments() — two simultaneous signups collide.
 */
export const generateEmployeeId = async (joiningDate = new Date()) => {
  const org = (process.env.ORG_CODE || "EMP").toUpperCase();
  const yy = String(new Date(joiningDate).getFullYear()).slice(-2);

  const counter = await Counter.findOneAndUpdate(
    { _id: `employee-${yy}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `${org}-${yy}-${String(counter.value).padStart(4, "0")}`;
};
