import bcrypt from "bcryptjs";

const run = async () => {
  const hash = await bcrypt.hash("W@sh2468", 10);
  console.log(hash);
};

run();