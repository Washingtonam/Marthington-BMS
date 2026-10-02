export const DEFAULT_REPORT_DELIVERY_TIME = "18:00";

export const normalizeReportDeliveryTime = (value, fallback = DEFAULT_REPORT_DELIVERY_TIME) => {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const match = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return fallback;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};
