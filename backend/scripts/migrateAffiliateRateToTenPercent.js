import "dotenv/config";
import mongoose from "mongoose";
import { migrateAffiliateRateToTenPercent } from "../src/modules/admin/affiliateRateMigration.js";

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured for this one-time migration.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const settings = await migrateAffiliateRateToTenPercent();
  console.log(`Global affiliate commission rate set to ${settings.globalAffiliateRate}%.`);
};

try {
  await run();
} catch (error) {
  console.error("Affiliate rate migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
