import cron from "node-cron";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import { todayIST, isWeekend } from "../utils/date.js";

/**
 * 11:55 PM IST — anyone HR forgot to mark is recorded as absent,
 * so the monthly report never has silent gaps.
 * Sundays are marked as weekoff instead.
 */
export const startCronJobs = () => {
  cron.schedule(
    "55 23 * * *",
    async () => {
      try {
        const date = todayIST();
        const fallback = isWeekend(date) ? "weekoff" : "absent";

        const employees = await Employee.find({
          status: { $in: ["active", "probation", "notice"] },
        }).select("_id");

        const ops = employees.map((e) => ({
          updateOne: {
            filter: { employee: e._id, date },
            update: { $setOnInsert: { status: fallback, remarks: "Auto-marked by system" } },
            upsert: true,
          },
        }));

        if (ops.length) {
          const r = await Attendance.bulkWrite(ops, { ordered: false });
          console.log(`[cron] Day closed. ${r.upsertedCount} auto-marked as ${fallback}.`);
        }
      } catch (err) {
        console.error("[cron] closeDay failed:", err.message);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log("Cron jobs scheduled (Asia/Kolkata)");
};
