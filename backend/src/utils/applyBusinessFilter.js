const applyBusinessFilter = (req, query = {}) => {
  // SUPER ADMIN → no restriction
  if (req.user.role === "super_admin") {
    return query;
  }

  return {
    ...query,
    business: req.user.businessId
  };
};

export default applyBusinessFilter;