export const calculateExpiry = (cycle, startDate = new Date()) => {
  const date = new Date(startDate);

  if (cycle === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    // default monthly
    date.setMonth(date.getMonth() + 1);
  }

  return date;
};