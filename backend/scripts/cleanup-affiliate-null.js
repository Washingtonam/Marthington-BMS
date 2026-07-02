import "dotenv/config";
import connectDB from "../src/config/db.js";
import User from "../src/modules/users/user.model.js";

const run = async () => {
  await connectDB();

  console.log('Removing users with affiliateCode === null (unset field)');
  const res = await User.updateMany({ affiliateCode: null }, { $unset: { affiliateCode: "" } });
  console.log('updateMany result:', res);

  console.log('Recreating sparse unique index on affiliateCode');
  try {
    await User.collection.createIndex({ affiliateCode: 1 }, { unique: true, sparse: true });
    console.log('Index created/recreated');
  } catch (err) {
    console.error('Index creation error:', err.message);
  }

  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
