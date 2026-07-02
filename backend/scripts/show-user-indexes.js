import "dotenv/config";
import connectDB from "../src/config/db.js";
import User from "../src/modules/users/user.model.js";

const run = async () => {
  await connectDB();
  const idx = await User.collection.indexes();
  console.log(JSON.stringify(idx, null, 2));
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
