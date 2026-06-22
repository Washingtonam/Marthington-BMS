import jwt from "jsonwebtoken";

const generateToken = (user, industryType = "retail") => {
  const businessId =
    user.business && user.business._id
      ? user.business._id
      : user.business;

  return jwt.sign(
    {
      id: user._id,
      businessId,
      role: user.role,
      industryType
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export default generateToken;