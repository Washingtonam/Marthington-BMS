import "dotenv/config";
import connectDB from "../src/config/db.js";
import User from "../src/modules/users/user.model.js";

const id = process.argv[2];
if (!id) {
  console.error('Usage: node print-user-by-id.js <id>');
  process.exit(1);
}

const run = async () => {
  await connectDB();
  const doc = await User.findById(id).lean();
  console.log(JSON.stringify(doc, null, 2));
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
