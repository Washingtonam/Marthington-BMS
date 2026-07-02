import "dotenv/config";
import connectDB from "../src/config/db.js";
import User from "../src/modules/users/user.model.js";

const run = async () => {
  await connectDB();
  const res = await User.updateMany({ $and: [ { affiliateCode: { $exists: true } }, { affiliateCode: null } ] }, { $unset: { affiliateCode: "" } });
  console.log('unset result:', res);
  try {
    await User.collection.dropIndex('affiliateCode_1');
    console.log('Dropped affiliateCode_1 index');
  } catch (err) {
    console.log('Drop index error (may not exist):', err.message);
  }
  await User.collection.createIndex({ affiliateCode: 1 }, { unique: true, partialFilterExpression: { affiliateCode: { $type: 'string' } } });
  console.log('Recreated partial unique index for affiliateCode (string type)');
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
