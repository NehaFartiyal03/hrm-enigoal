/**
 * All attendance dates are normalised to 00:00 IST and stored as UTC.
 * This keeps the { employee, date } unique index honest across timezones.
 */
const IST_OFFSET_MIN = 330;

export const normalizeDate = (input) => {
  const d = new Date(input);
  if (isNaN(d)) throw new Error("Invalid date");
  const ist = new Date(d.getTime() + IST_OFFSET_MIN * 60000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MIN * 60000);
};

export const todayIST = () => normalizeDate(new Date());

export const isWeekend = (date) => {
  const ist = new Date(new Date(date).getTime() + IST_OFFSET_MIN * 60000);
  return ist.getUTCDay() === 0; // Sunday off; add 6 for Saturday if needed
};

export const monthRange = (year, month) => {
  const from = normalizeDate(new Date(Date.UTC(year, month - 1, 1)));
  const to = normalizeDate(new Date(Date.UTC(year, month, 0)));
  return { from, to };
};

export const diffHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return undefined;
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  const mins = oh * 60 + om - (ih * 60 + im);
  return mins > 0 ? +(mins / 60).toFixed(2) : undefined;
};
