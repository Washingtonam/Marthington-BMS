import Product from "./product.model.js";
import mongoose from "mongoose";
import Business from "../businesses/business.model.js";
import applyBusinessFilter from "../../utils/applyBusinessFilter.js";
import XLSX from "xlsx";
import { mergeCatalogValues, normalizeCatalogName } from "../catalog/catalogUtils.js";
import { isPrivileged } from "../../utils/branchAccess.js";
import BranchInventory from "../branches/branchInventory.model.js";
import Supplier from "../suppliers/supplier.model.js";
import ProductImportPreview from "./productImportPreview.model.js";
import { parseProductImportRows } from "./productImportParser.js";
import {
  assertBusinessProductCapacity,
  getBusinessPlanAccess
} from "../subscriptions/planAccess.js";

const resolvePreferredSupplier = async (businessId, supplierId) => {
  if (!supplierId) return null;
  const supplier = await Supplier.findOne({ _id: supplierId, business: businessId });
  if (!supplier) throw Object.assign(new Error("Preferred supplier not found in this business"), { statusCode: 400 });
  return supplier._id;
};

const findExistingProductMatch = async (businessId, name, excludeId = null) => {
  if (!name || !String(name).trim()) return null;

  const query = { business: businessId };
  if (excludeId) query._id = { $ne: excludeId };

  const items = await Product.find(query).select("_id name stock price costPrice sku").lean();
  const normalizedName = normalizeCatalogName(name);
  const matches = items.filter((item) => normalizeCatalogName(item.name) === normalizedName);
  if (matches.length > 1) {
    throw Object.assign(new Error("More than one product has this name. Review the duplicate products before adding or editing this product."), { statusCode: 409 });
  }
  return matches[0] || null;
};

// 🔥 CREATE PRODUCT
const createProduct = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business) return res.status(404).json({ message: "Business not found" });

    // 1. Subscription Check
    const isExpired = business.subscription?.status === "expired" || 
                     (business.subscription?.status === "trial" && new Date() > business.trialEndsAt);
    if (isExpired) return res.status(403).json({ message: "Subscription expired. Please upgrade." });

    const { name, sellingPrice, costPrice, stock, category, sku, preferredSupplier } = req.body;
    const resolvedPreferredSupplier = preferredSupplier !== undefined
      ? await resolvePreferredSupplier(business._id, preferredSupplier)
      : undefined;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    const stockValue = stock === undefined || stock === null || stock === "" ? undefined : Number(stock);
    const sellingPriceValue = sellingPrice === undefined || sellingPrice === null || sellingPrice === "" ? undefined : Number(sellingPrice);
    const costPriceValue = costPrice === undefined || costPrice === null || costPrice === "" ? undefined : Number(costPrice);
    for (const [label, value] of [["Stock", stockValue], ["Selling price", sellingPriceValue], ["Cost price", costPriceValue]]) {
      if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
        return res.status(400).json({ message: `${label} must be a non-negative number.` });
      }
    }

    const existing = await findExistingProductMatch(business._id, name);
    if (existing) {
      const existingStock = Number(existing.stock || 0);
      const updates = {
        ...(category !== undefined ? { category: category || "General" } : {}),
        ...(sellingPriceValue !== undefined ? { price: sellingPriceValue } : {}),
        ...(costPriceValue !== undefined ? { costPrice: costPriceValue } : {}),
        ...(isPrivileged(req.user) && stockValue !== undefined ? { stock: stockValue } : {}),
        ...(sku !== undefined ? { sku: sku || "" } : {}),
        ...(resolvedPreferredSupplier !== undefined ? { preferredSupplier: resolvedPreferredSupplier } : {})
      };
      const product = await Product.findOneAndUpdate(
        { _id: existing._id, business: business._id },
        { $set: updates },
        { new: true }
      );
      return res.status(200).json({
        ...product.toObject(),
        matchedExisting: true,
        stockUnchanged: stockValue !== undefined && !isPrivileged(req.user),
        previousStock: existingStock
      });
    }

    await assertBusinessProductCapacity(business, 1);

    const product = await Product.create({
      name: String(name).trim(),
      category: category || "General",
      price: sellingPriceValue ?? 0,
      costPrice: costPriceValue ?? 0,
      stock: isPrivileged(req.user) ? stockValue ?? 0 : 0,
      sku: sku || `SKU-${Date.now()}`,
      preferredSupplier: resolvedPreferredSupplier || null,
      business: business._id
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

// 🔥 BULK IMPORT
const bulkImportProducts = async (req, res) => {
  try {
    const business = await Business.findById(req.user.businessId);
    if (!business) return res.status(404).json({ message: "Business not found" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    if (!rows.length) return res.status(400).json({ message: "File is empty" });
    if (rows.length > 5000) {
      return res.status(400).json({ message: "Imports are limited to 5,000 rows. Split the file and upload it in batches." });
    }

    const stagedRows = parseProductImportRows(rows);
    if (!stagedRows.length) {
      return res.status(400).json({
        message: "No product names found. Add a required “name” or “Product Name” column and include a name on each product row."
      });
    }

    const preview = await ProductImportPreview.create({
      business: business._id,
      createdBy: req.user.id,
      rows: stagedRows
    });

    return res.status(201).json({
      importId: preview._id,
      rowCount: stagedRows.length,
      expiresAt: preview.expiresAt,
      message: "Upload staged. Review stock and price differences in Inventory before applying changes."
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message || "Could not stage product import." });
  }
};

// 🔥 GET PRODUCTS
const getProducts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const requestedLimit = Number(req.query.limit) || 20;
    let limit = Math.min(Math.max(requestedLimit, 1), 5000);
    if (req.query.view === "pos") {
      const business = await Business.findById(req.user.businessId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const planAccess = await getBusinessPlanAccess(business);
      if (planAccess.posProducts !== null) {
        limit = Math.min(limit, planAccess.posProducts);
      }
    }
    const skip = (page - 1) * limit;

    // Retail-only products for POS. School and hospital accounts should not crash.
    if (["school", "hospital"].includes(req.user?.industryType)) {
      return res.json({
        products: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalProducts: 0,
          hasNextPage: false,
          hasPrevPage: page > 1
        }
      });
    }

    const filter = {
      business: req.user.businessId
    };

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { sku: { $regex: req.query.search, $options: "i" } }
      ];
    }
    if (req.query.category) filter.category = req.query.category;

    const sort = req.query.sort === "name-asc"
      ? { name: 1, _id: 1 }
      : req.query.sort === "name-desc"
        ? { name: -1, _id: -1 }
        : { createdAt: -1 };

    const totalProducts = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate("preferredSupplier", "name")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const branchInventory = req.user.branchId
      ? await BranchInventory.find({
          business: req.user.businessId,
          branch: req.user.branchId,
          product: { $in: products.map((product) => product._id) }
        }).lean()
      : [];
    const branchStockByProduct = new Map(
      branchInventory.map((entry) => [String(entry.product), entry])
    );

    // Standardize price fields for frontend
    const safeProducts = products.map((product) => {
      const branchEntry = branchStockByProduct.get(String(product._id));
      const isBranchUser = Boolean(req.user.branchId) && !isPrivileged(req.user);

      return {
        ...product,
        stock: isBranchUser ? Number(branchEntry?.quantity || 0) : product.stock,
        price: isBranchUser ? Number(branchEntry?.branchPrice ?? product.price ?? 0) : product.price || 0,
        sellingPrice: isBranchUser ? Number(branchEntry?.branchPrice ?? product.price ?? 0) : product.price || 0
      };
    });

    res.json({
      products: safeProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        hasNextPage: page * limit < totalProducts,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    return res.status(200).json({ success: true, data: [] });
  }
};

// 🔥 UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const { name, sellingPrice, costPrice, stock, category, sku, preferredSupplier } = req.body;
    const updateData = {};
    const resolvedPreferredSupplier = preferredSupplier !== undefined
      ? await resolvePreferredSupplier(req.user.businessId, preferredSupplier)
      : undefined;

    if (name !== undefined) {
      const duplicate = await findExistingProductMatch(req.user.businessId, name, req.params.id);
      if (duplicate) {
        const merged = mergeCatalogValues(duplicate, {
          name,
          stock: isPrivileged(req.user) ? Number(stock ?? duplicate.stock ?? 0) : Number(duplicate.stock || 0),
          price: Number(sellingPrice ?? duplicate.price ?? 0),
          costPrice: Number(costPrice ?? duplicate.costPrice ?? 0),
          sku: sku || duplicate.sku || ""
        });

        await Product.findByIdAndUpdate(duplicate._id, {
          $set: {
            name: merged.name,
            category: category || duplicate.category || "General",
            price: Number(merged.price) || 0,
            costPrice: Number(merged.costPrice) || 0,
            stock: isPrivileged(req.user) ? Number(merged.stock) || 0 : Number(duplicate.stock || 0),
            sku: merged.sku || duplicate.sku || `SKU-${Date.now()}`,
            ...(resolvedPreferredSupplier !== undefined ? { preferredSupplier: resolvedPreferredSupplier } : {})
          }
        });

        return res.status(200).json({ ...duplicate, name: merged.name, stock: Number(merged.stock) || 0, merged: true });
      }

      updateData.name = String(name).trim();
    }

    if (category !== undefined) updateData.category = category;
    if (sellingPrice !== undefined) updateData.price = Number(sellingPrice);
    if (costPrice !== undefined) updateData.costPrice = Number(costPrice);
    if (stock !== undefined && isPrivileged(req.user)) updateData.stock = Number(stock);
    if (sku !== undefined) updateData.sku = sku;
    if (resolvedPreferredSupplier !== undefined) updateData.preferredSupplier = resolvedPreferredSupplier;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, business: req.user.businessId },
      { $set: updateData },
      { new: true }
    );

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔥 BULK DELETE PRODUCTS
const bulkDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: "A non-empty array of product ids is required." });
    }

    const result = await Product.deleteMany({
      _id: { $in: ids },
      business: req.user.businessId
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} product(s)`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔥 DELETE PRODUCT
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ 
      _id: req.params.id, 
      business: req.user.businessId 
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔥 GET PRODUCTS FOR AUTOCOMPLETE (minimal data for searchable dropdown)
const getProductById = async (req, res) => {
  if (!req.user.businessId) return res.status(400).json({ message: "No business linked to this account." });
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid product ID." });
  }
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      business: req.user.businessId
    }).populate("preferredSupplier", "name").lean();
    if (!product) return res.status(404).json({ message: "Product not found." });
    return res.json({
      ...product,
      sellingPrice: Number(product.price) || 0
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Could not load product." });
  }
};

const getProductsForAutocomplete = async (req, res) => {
  try {
    const { search = "", limit = 20 } = req.query;
    const businessId = req.user.businessId;

    const filter = { business: businessId };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } }
      ];
    }

    const products = await Product.find(filter)
      .select('_id name category price costPrice stock sku')
      .limit(parseInt(limit))
      .lean();

    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
};

export default { createProduct, bulkImportProducts, getProducts, getProductById, getProductsForAutocomplete, updateProduct, deleteProduct, bulkDeleteProducts };