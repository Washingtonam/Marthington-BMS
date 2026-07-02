import "dotenv/config";
import connectDB from "../src/config/db.js";
import User from "../src/modules/users/user.model.js";

const run = async () => {
  await connectDB();
  const docs = await User.find({ $and: [ { affiliateCode: { $exists: true } }, { affiliateCode: null } ] }).lean();
  console.log('found explicit nulls:', docs.length);
  console.log(docs.map(d => d._id));
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
