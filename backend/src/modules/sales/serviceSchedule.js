const durationSeconds = {
  seconds: 1,
  minutes: 60,
  hours: 60 * 60,
  days: 24 * 60 * 60
};

export const parseServiceStart = (value, fallback = new Date()) => {
  if (value === undefined || value === null || value === "") return new Date(fallback);
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid service start date");
  return start;
};

export const calculateServiceEnd = (start, duration, unit, quantity = 1) => {
  const secondsPerUnit = durationSeconds[unit] || 60;
  const totalMilliseconds = Number(duration || 0) * secondsPerUnit * Math.max(1, Number(quantity) || 1) * 1000;
  return totalMilliseconds > 0 ? new Date(start.getTime() + totalMilliseconds) : null;
};
