const RANGE_DAYS = {
  "30d": 30,
  "90d": 90,
  "12m": 365
};

export const resolveRevenueRange = (value) => RANGE_DAYS[value] ? value : null;

export const buildRevenueWindow = (range, now = new Date()) => {
  const duration = RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
  const end = new Date(now);
  const start = new Date(end.getTime() - duration);
  const previousStart = new Date(start.getTime() - duration);
  return { start, end, previousStart };
};

export const calculatePercentChange = (current, previous) => {
  if (!previous) return current ? null : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};
