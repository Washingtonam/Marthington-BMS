import SystemSettings from "./systemSettings.model.js";

export const migrateAffiliateRateToTenPercent = () => SystemSettings.findOneAndUpdate(
  {},
  { $set: { globalAffiliateRate: 10 } },
  { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
);
