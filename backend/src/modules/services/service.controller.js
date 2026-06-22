import Service from "./service.model.js";
import applyBusinessFilter from "../../utils/applyBusinessFilter.js";

// ========================================
// 🔥 CREATE SERVICE
// ========================================
const createService = async (req, res) => {
  try {

    const {
      name,
      category,
      price,
      costPrice,
      duration,
      description,
      code
    } = req.body;

    // 🔥 VALIDATION
    if (!name) {
      return res.status(400).json({
        message: "Service name is required"
      });
    }

    // 🔥 DUPLICATE CHECK
    const existing =
      await Service.findOne({
        business: req.user.businessId,
        name: name.trim()
      });

    if (existing) {
      return res.status(400).json({
        message: "Service already exists"
      });
    }

    const service =
      await Service.create({

        name: name.trim(),

        category:
          category || "General",

        price:
          Number(price) || 0,

        costPrice:
          Number(costPrice) || 0,

        duration:
          Number(duration) || 0,

        description:
          description || "",

        code:
          code || "",

        business:
          req.user.businessId
      });

    res.json(service);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

// ========================================
// 🔥 GET SERVICES
// ========================================
const getServices = async (req, res) => {
  try {
    const {
      search,
      category,
      activeOnly
    } = req.query;

    const currentType = req.user?.industryType || "retail";

    if (currentType === "school" || currentType === "hospital") {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const query = applyBusinessFilter(req);

    // 🔥 SEARCH
    if (search) {
      query.name = {
        $regex: search,
        $options: "i"
      };
    }

    // 🔥 CATEGORY FILTER
    if (category) {
      query.category = category;
    }

    // 🔥 ACTIVE FILTER
    if (activeOnly === "true") {
      query.isActive = true;
    }

    const services = await Service.find(query)
      .sort({
        createdAt: -1
      })
      .lean();

    const safeServices = services.map((s) => ({
      ...s,
      price: Number(s.price) || 0,
      sellingPrice: Number(s.price) || 0,
      costPrice: Number(s.costPrice) || 0
    }));

    return res.status(200).json({
      success: true,
      data: safeServices
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      data: []
    });
  }
};

// ========================================
// 🔥 GET SINGLE SERVICE
// ========================================
const getServiceById = async (
  req,
  res
) => {
  try {

    const service =
      await Service.findById(
        req.params.id
      );

    if (!service) {
      return res.status(404).json({
        message: "Service not found"
      });
    }

    // 🔥 SECURITY
    if (
      req.user.role !== "super_admin" &&
      service.business.toString() !==
        req.user.businessId
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    res.json(service);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

// ========================================
// 🔥 UPDATE SERVICE
// ========================================
const updateService = async (
  req,
  res
) => {
  try {

    const service =
      await Service.findById(
        req.params.id
      );

    if (!service) {
      return res.status(404).json({
        message: "Service not found"
      });
    }

    // 🔥 SECURITY
    if (
      req.user.role !== "super_admin" &&
      service.business.toString() !==
        req.user.businessId
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    const {
      name,
      category,
      price,
      costPrice,
      duration,
      description,
      code,
      isActive
    } = req.body;

    service.name =
      name ?? service.name;

    service.category =
      category ??
      service.category;

    if (price !== undefined) {
      service.price =
        Number(price);
    }

    if (costPrice !== undefined) {
      service.costPrice =
        Number(costPrice);
    }

    if (duration !== undefined) {
      service.duration =
        Number(duration);
    }

    service.description =
      description ??
      service.description;

    service.code =
      code ?? service.code;

    if (isActive !== undefined) {
      service.isActive =
        Boolean(isActive);
    }

    await service.save();

    res.json(service);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

// ========================================
// 🔥 TOGGLE ACTIVE STATUS
// ========================================
const toggleServiceStatus = async (
  req,
  res
) => {
  try {

    const service =
      await Service.findById(
        req.params.id
      );

    if (!service) {
      return res.status(404).json({
        message: "Service not found"
      });
    }

    // 🔥 SECURITY
    if (
      req.user.role !== "super_admin" &&
      service.business.toString() !==
        req.user.businessId
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    service.isActive =
      !service.isActive;

    await service.save();

    res.json({
      message:
        service.isActive
          ? "Service activated"
          : "Service deactivated",

      service
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

// ========================================
// 🔥 DELETE SERVICE
// ========================================
const deleteService = async (
  req,
  res
) => {
  try {

    const service =
      await Service.findById(
        req.params.id
      );

    if (!service) {
      return res.status(404).json({
        message: "Service not found"
      });
    }

    // 🔥 SECURITY
    if (
      req.user.role !== "super_admin" &&
      service.business.toString() !==
        req.user.businessId
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    await service.deleteOne();

    res.json({
      message:
        "Service deleted"
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

export default {

  createService,

  getServices,

  getServiceById,

  updateService,

  toggleServiceStatus,

  deleteService
};