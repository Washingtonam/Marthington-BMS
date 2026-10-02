import "dotenv/config";
import connectDB from "../src/config/db.js";
import User from "../src/modules/users/user.model.js";

const emailArg = process.argv[2];

const run = async () => {
  await connectDB();

  if (emailArg) {
    const re = new RegExp(`^${emailArg.replace(/[-\\/\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i");
    const users = await User.find({ email: re }).lean();
    console.log(JSON.stringify({ found: users.length, users }, null, 2));
    process.exit(0);
  }

  const dupes = await User.aggregate([
    { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 }, docs: { $push: "$$ROOT" } } },
    { $match: { count: { $gt: 1 } } },
    { $project: { emailLower: "$_id", count: 1, docs: 1 } }
  ]);

  console.log(JSON.stringify(dupes, null, 2));
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
