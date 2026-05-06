import Product from "./product.model.js";
import Business from "../businesses/business.model.js";
import applyBusinessFilter from "../../utils/applyBusinessFilter.js";
import XLSX from "xlsx";


// 🔥 CREATE PRODUCT
const createProduct = async (req, res) => {
  try {
    const business = await Business.findById(
      req.user.businessId
    );

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    // 🔥 SUBSCRIPTION CHECK
    const isExpired =
      business.subscription?.status === "expired" ||
      (
        business.subscription?.status === "trial" &&
        new Date() > business.trialEndsAt
      );

    if (isExpired) {
      return res.status(403).json({
        message:
          "Your subscription has expired. Upgrade to continue."
      });
    }

    // 🔥 PRODUCT LIMIT
    const limits = business.getLimits();

    const currentCount =
      await Product.countDocuments({
        business: business._id
      });

    if (currentCount >= limits.products) {
      return res.status(403).json({
        message:
          "Product limit reached. Upgrade your plan."
      });
    }

    const {
      name,
      sellingPrice,
      costPrice,
      stock,
      category,
      sku
    } = req.body;

    const product = await Product.create({
      name,
      category: category || "General",

      price: Number(sellingPrice) || 0,

      costPrice: Number(costPrice) || 0,

      stock: Number(stock) || 0,

      sku: sku || "",

      business: business._id
    });

    res.json(product);

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};


// 🔥 BULK IMPORT PRODUCTS
const bulkImportProducts = async (
  req,
  res
) => {
  try {

    const business =
      await Business.findById(
        req.user.businessId
      );

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    // 🔥 READ EXCEL
    const workbook =
      XLSX.read(req.file.buffer, {
        type: "buffer"
      });

    const sheetName =
      workbook.SheetNames[0];

    const worksheet =
      workbook.Sheets[sheetName];

    const rows =
      XLSX.utils.sheet_to_json(
        worksheet
      );

    if (!rows.length) {
      return res.status(400).json({
        message: "Excel file is empty"
      });
    }

    const productsToInsert = [];

    for (const row of rows) {

      if (!row.name) continue;

      // 🔥 DUPLICATE CHECK
      const existing =
        await Product.findOne({
          name: row.name,
          business: business._id
        });

      if (existing) continue;

      productsToInsert.push({
        name: String(row.name),

        category:
          row.category || "General",

        price:
          Number(
            row.sellingPrice ||
            row.price ||
            0
          ),

        costPrice:
          Number(
            row.costPrice || 0
          ),

        stock:
          Number(
            row.stock || 0
          ),

        sku:
          row.sku ||
          `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,

        business: business._id
      });
    }

    if (!productsToInsert.length) {
      return res.status(400).json({
        message:
          "No valid products found"
      });
    }

    await Product.insertMany(
      productsToInsert
    );

    res.json({
      message:
        `${productsToInsert.length} products imported successfully`
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};


// 🔥 GET PRODUCTS (PAGINATED)
const getProducts = async (req, res) => {
  try {

    // ====================================
    // PAGINATION
    // ====================================

    const page =
      Math.max(
        Number(req.query.page) || 1,
        1
      );

    const limit =
      Math.min(
        Number(req.query.limit) || 20,
        100
      );

    const skip =
      (page - 1) * limit;

    // ====================================
    // SEARCH
    // ====================================

    const search =
      req.query.search || "";

    const category =
      req.query.category || "";

    // ====================================
    // BASE FILTER
    // ====================================

    const filter =
      applyBusinessFilter(req);

    // ====================================
    // SEARCH FILTER
    // ====================================

    if (search) {

      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i"
          }
        },
        {
          sku: {
            $regex: search,
            $options: "i"
          }
        }
      ];
    }

    // ====================================
    // CATEGORY FILTER
    // ====================================

    if (category) {
      filter.category = category;
    }

    // ====================================
    // TOTAL COUNT
    // ====================================

    const totalProducts =
      await Product.countDocuments(
        filter
      );

    // ====================================
    // FETCH PRODUCTS
    // ====================================

    const products =
      await Product.find(filter)

        .sort({
          createdAt: -1
        })

        .skip(skip)

        .limit(limit)

        .lean();

    // ====================================
    // SAFE NORMALIZATION
    // ====================================

    const safeProducts =
      products.map((p) => ({
        ...p,

        price:
          Number(p.price) || 0,

        sellingPrice:
          Number(p.price) || 0,

        costPrice:
          Number(p.costPrice) || 0,

        stock:
          Number(p.stock) || 0
      }));

    // ====================================
    // RESPONSE
    // ====================================

    res.json({

      products: safeProducts,

      pagination: {

        currentPage: page,

        totalPages:
          Math.ceil(
            totalProducts / limit
          ),

        totalProducts,

        limit,

        hasNextPage:
          page <
          Math.ceil(
            totalProducts / limit
          ),

        hasPrevPage:
          page > 1
      }
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};

// 🔥 UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {

    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    // 🔥 BUSINESS SECURITY
    if (
      req.user.role !== "super_admin" &&
      product.business.toString() !==
        req.user.businessId
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    const {
      name,
      sellingPrice,
      costPrice,
      stock,
      category,
      sku
    } = req.body;

    product.name =
      name ?? product.name;

    product.category =
      category ?? product.category;

    if (sellingPrice !== undefined) {
      product.price = Number(sellingPrice);
    }

    if (costPrice !== undefined) {
      product.costPrice = Number(costPrice);
    }

    if (stock !== undefined) {
      product.stock = Number(stock);
    }

    product.sku =
      sku ?? product.sku;

    await product.save();

    res.json(product);

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};


// 🔥 DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {

    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    // 🔥 BUSINESS SECURITY
    if (
      req.user.role !== "super_admin" &&
      product.business.toString() !==
        req.user.businessId
    ) {
      return res.status(403).json({
        message: "Unauthorized"
      });
    }

    await product.deleteOne();

    res.json({
      message: "Product deleted"
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};


export default {
  createProduct,
  bulkImportProducts,
  getProducts,
  updateProduct,
  deleteProduct
};