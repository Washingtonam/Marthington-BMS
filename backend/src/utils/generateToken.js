import jwt from "jsonwebtoken";

const generateToken = (
  user,
  industryType = "retail",
  isPro = false
) => {
  const businessId =
    user.business && user.business._id
      ? user.business._id
      : user.business;

  return jwt.sign(
    {
      id: user._id,
      businessId,
      role: user.role,
      industryType,
      isPro
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export default generateToken;