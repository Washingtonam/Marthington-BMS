import BranchInventory from "./branchInventory.model.js";
import Branch from "./branch.model.js";
import Product from "../products/product.model.js";
import mongoose from "mongoose";
import Business from "../businesses/business.model.js";
import InventoryMovement from "../inventory/inventory.model.js";
import User from "../users/user.model.js";
import Supplier from "../suppliers/supplier.model.js";
import OperationLog from "../../models/operationLog.model.js";
import importQueue from "../../queues/importQueue.js";
import ProductImportPreview from "../products/productImportPreview.model.js";
import {
  canAccessBranch as canAccessBranchForUser,
  canViewInventoryCosts,
  isPrivileged
} from "../../utils/branchAccess.js";
import { findSimilarCatalogGroups, normalizeCatalogName } from "../catalog/catalogUtils.js";
import { assertBusinessProductCapacity } from "../subscriptions/planAccess.js";

const isObjectId = (value) => mongoose.isValidObjectId(value);

export const canAccessBranch = (req, branchId, action = "view") => {
  return canAccessBranchForUser(req.user, branchId, action);
};

const assertBranchAccess = (req, res, branchId, action) => {
  if (branchId === "headOffice") {
    if (!canAccessBranch(req, branchId, action)) {
      res.status(403).json({ message: "You do not have access to head office inventory" });
      return false;
    }
    return true;
  }

  if (!canAccessBranch(req, branchId, action)) {
    res.status(403).json({ message: "You do not have access to this branch inventory" });
    return false;
  }

  return true;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getInventorySort = (sort, productPrefix = "") => {
  const sortFields = {
    "name-asc": { [`${productPrefix}name`]: 1, _id: 1 },
    "name-desc": { [`${productPrefix}name`]: -1, _id: -1 },
    "stock-desc": { quantity: -1, _id: 1 },
    "stock-asc": { quantity: 1, _id: 1 },
    "cost-desc": { costPrice: -1, _id: 1 },
    "cost-asc": { costPrice: 1, _id: 1 },
    "price-desc": { effectiveSellingPrice: -1, _id: 1 },
    "price-asc": { effectiveSellingPrice: 1, _id: 1 },
    "margin-desc": { margin: -1, _id: 1 }
  };
  return sortFields[sort] || sortFields["name-asc"];
};

const getSummaryGroup = () => ({
  _id: null,
  totalProducts: { $sum: 1 },
  totalUnits: { $sum: "$quantity" },
  lowStock: { $sum: { $cond: [{ $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", 5] }] }, 1, 0] } },
  outOfStock: { $sum: { $cond: [{ $lte: ["$quantity", 0] }, 1, 0] } },
  missingCost: { $sum: { $cond: [{ $lte: ["$costPrice", 0] }, 1, 0] } },
  missingSelling: { $sum: { $cond: [{ $lte: ["$effectiveSellingPrice", 0] }, 1, 0] } },
  inventoryValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } }
});

const normalizeSummary = (summary = {}) => ({
  totalProducts: Number(summary.totalProducts || 0),
  totalUnits: Number(summary.totalUnits || 0),
  lowStock: Number(summary.lowStock || 0),
  outOfStock: Number(summary.outOfStock || 0),
  missingCost: Number(summary.missingCost || 0),
  missingSelling: Number(summary.missingSelling || 0),
  inventoryValue: Number(summary.inventoryValue || 0)
});

const removeInventoryCosts = (inventory) => inventory.map((entry) => {
  const safeEntry = { ...entry };
  delete safeEntry.unitCost;
  if (safeEntry.product) {
    safeEntry.product = { ...safeEntry.product };
    delete safeEntry.product.costPrice;
  }
  return safeEntry;
});

const removeSummaryCosts = (summary) => {
  const safeSummary = { ...summary };
  delete safeSummary.missingCost;
  delete safeSummary.inventoryValue;
  return safeSummary;
};

const getFilterStages = ({ search, category, stockFilter, priceFilter }) => {
  const stages = [];
  const productMatch = {};
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    productMatch.$or = [{ "product.name": searchRegex }, { "product.sku": searchRegex }];
  }
  if (category) productMatch["product.category"] = category;
  if (Object.keys(productMatch).length) stages.push({ $match: productMatch });

  stages.push({
    $addFields: {
      effectiveSellingPrice: { $ifNull: ["$branchPrice", "$product.price"] },
      costPrice: {
        $cond: [
          { $gt: [{ $ifNull: ["$unitCost", 0] }, 0] },
          "$unitCost",
          { $ifNull: ["$product.costPrice", 0] }
        ]
      },
      quantity: { $ifNull: ["$quantity", 0] }
    }
  });

  const inventoryMatch = {};
  if (stockFilter === "in-stock") inventoryMatch.quantity = { $gt: 0 };
  if (stockFilter === "low-stock") inventoryMatch.quantity = { $gt: 0, $lte: 5 };
  if (stockFilter === "out-of-stock") inventoryMatch.quantity = { $lte: 0 };
  if (Object.keys(inventoryMatch).length) stages.push({ $match: inventoryMatch });

  const priceConditions = {
    "cost-only": { $and: [{ $gt: ["$costPrice", 0] }, { $lte: ["$effectiveSellingPrice", 0] }] },
    "selling-only": { $and: [{ $gt: ["$effectiveSellingPrice", 0] }, { $lte: ["$costPrice", 0] }] },
    "complete-pricing": { $and: [{ $gt: ["$costPrice", 0] }, { $gt: ["$effectiveSellingPrice", 0] }] },
    "missing-cost": { $lte: ["$costPrice", 0] },
    "missing-selling": { $lte: ["$effectiveSellingPrice", 0] }
  };
  if (priceConditions[priceFilter]) stages.push({ $match: { $expr: priceConditions[priceFilter] } });

  stages.push({ $addFields: { margin: { $subtract: ["$effectiveSellingPrice", "$costPrice"] } } });
  return stages;
};

const importProductToBranch = async (req, res) => {
  let session;
  try {
    const {
      branchId,
      productId,
      quantity,
      branchPrice,
      sourceType = "headOffice",
      sourceBranchId
    } = req.body;
    const businessId = req.user.businessId;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    if (!isObjectId(branchId)) {
      return res.status(400).json({ message: "Invalid branchId" });
    }

    if (sourceType !== "headOffice" && sourceType !== "branch") {
      return res.status(400).json({ message: "sourceType must be either 'headOffice' or 'branch'" });
    }

    const branch = await Branch.findOne({ _id: branchId, business: businessId });
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    if (!assertBranchAccess(req, res, branchId, "manage")) return;

    // BULK IMPORT: when no productId supplied, register branch inventory items
    // in the target branch without changing head office stock.
    if (!productId) {
      if (sourceType === "branch") {
        if (!sourceBranchId) {
          return res.status(400).json({ message: "sourceBranchId is required when importing from another branch" });
        }
        if (sourceBranchId.toString() === branchId.toString()) {
          return res.status(400).json({ message: "sourceBranchId must be different from target branchId" });
        }

        const sourceBranch = await Branch.findOne({ _id: sourceBranchId, business: businessId });
        if (!sourceBranch) {
          return res.status(404).json({ message: "Source branch not found" });
        }

        if (!assertBranchAccess(req, res, sourceBranchId, "manage")) return;
      }

      // Create an operation log and enqueue a background job for processing.
      const jobDoc = await OperationLog.create({
        business: businessId,
        branch: branchId,
        operationType: "branch_bulk_import",
        user: req.user.id,
        status: "pending",
        metadata: { sourceType, sourceBranchId }
      });

      try {
        await importQueue.add({
          jobId: jobDoc._id.toString(),
          businessId,
          branchId,
          userId: req.user.id,
          sourceType,
          sourceBranchId
        });
      } catch (err) {
        console.error("Branch import enqueue failed; falling back to inline processing:", err.message || err);
        if (importQueue.addInline) {
          await importQueue.addInline({
            jobId: jobDoc._id.toString(),
            businessId,
            branchId,
            userId: req.user.id,
            sourceType,
            sourceBranchId
          });
        }
      }

      return res.json({ jobId: jobDoc._id });
    }

    // SINGLE PRODUCT TRANSFER: move stock from the valid source to the target branch
    const transferQuantity = Number(quantity || 0);

    if (!Number.isFinite(transferQuantity) || transferQuantity <= 0) {
      return res.status(400).json({ message: "Quantity must be a positive number" });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const product = await Product.findOne({ _id: productId, business: businessId }).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Product not found" });
    }

    let sourceBranchIdForTransfer = null;
    let sourceStockBefore = null;

    if (sourceType === "branch") {
      if (!sourceBranchId) {
        return res.status(400).json({ message: "sourceBranchId is required when transferring from another branch" });
      }

      if (sourceBranchId.toString() === branchId.toString()) {
        return res.status(400).json({ message: "sourceBranchId must be different from target branchId" });
      }

      const sourceBranch = await Branch.findOne({ _id: sourceBranchId, business: businessId });
      if (!sourceBranch) {
        return res.status(404).json({ message: "Source branch not found" });
      }

      if (!assertBranchAccess(req, res, sourceBranchId, "manage")) {
        await session.abortTransaction();
        session.endSession();
        return;
      }

      sourceBranchIdForTransfer = sourceBranch._id;

      const sourceInventory = await BranchInventory.findOne({
        business: businessId,
        branch: sourceBranchIdForTransfer,
        product: productId
      }).session(session);

      if (!sourceInventory || sourceInventory.quantity < transferQuantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Insufficient stock in source branch for transfer" });
      }

      sourceStockBefore = sourceInventory.quantity;
      sourceInventory.quantity -= transferQuantity;
      await sourceInventory.save({ session });

      await InventoryMovement.create([{
        business: businessId,
        branch: sourceBranchIdForTransfer,
        product: productId,
        type: "transfer",
        quantity: transferQuantity,
        unitCost: Number(sourceInventory.unitCost || product.costPrice || 0),
        previousStock: sourceStockBefore,
        newStock: sourceInventory.quantity,
        note: `Transferred to branch ${branch.name}`,
        createdBy: req.user.id
      }], { session });
    } else {
      if (product.stock < transferQuantity) {
        return res.status(400).json({ message: "Insufficient central stock for transfer" });
      }

      sourceStockBefore = product.stock;
      product.stock -= transferQuantity;
      await product.save({ session });

      await InventoryMovement.create([{
        business: businessId,
        product: productId,
        branch: null,
        type: "transfer",
        quantity: transferQuantity,
        unitCost: Number(product.costPrice || 0),
        previousStock: sourceStockBefore,
        newStock: product.stock,
        note: `Transferred to branch ${branch.name}`,
        createdBy: req.user.id
      }], { session });
    }

    const targetInventory = await BranchInventory.findOne({ business: businessId, branch: branchId, product: productId }).session(session);
    const targetPreviousStock = targetInventory ? targetInventory.quantity : 0;
    const sourceUnitCost = sourceType === "branch"
      ? Number((await BranchInventory.findOne({ business: businessId, branch: sourceBranchIdForTransfer, product: productId }).session(session))?.unitCost || product.costPrice || 0)
      : Number(product.costPrice || 0);

    const inventory = await BranchInventory.findOneAndUpdate(
      { business: businessId, branch: branchId, product: productId },
      {
        $setOnInsert: {
          business: businessId,
          branch: branchId,
          product: productId,
          createdBy: req.user.id
        },
        $inc: { quantity: transferQuantity },
        $set: {
          unitCost: targetInventory && targetInventory.quantity > 0
            ? ((targetInventory.quantity * Number(targetInventory.unitCost || 0)) + (transferQuantity * sourceUnitCost)) / (targetInventory.quantity + transferQuantity)
            : sourceUnitCost,
          ...(branchPrice !== undefined ? { branchPrice: Number(branchPrice) } : {})
        },
      },
      { upsert: true, new: true, session }
    );

    await InventoryMovement.create([{
      business: businessId,
      branch: branchId,
      product: productId,
      type: "transfer",
      quantity: transferQuantity,
      unitCost: sourceUnitCost,
      previousStock: targetPreviousStock,
      newStock: inventory.quantity,
      note: sourceType === "branch"
        ? `Received from branch ${sourceBranchIdForTransfer}`
        : "Received from head office",
      createdBy: req.user.id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json(inventory);
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    res.status(500).json({ message: err.message });
  }
};

const getBranchInventory = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    let branchId = req.query.branchId || req.user.branchId;

    if (!branchId) {
      return res.status(400).json({ message: "branchId is required" });
    }

    if (branchId !== "headOffice" && !isObjectId(branchId)) {
      return res.status(400).json({ message: "Invalid branchId" });
    }

    if (!assertBranchAccess(req, res, branchId, "view")) return;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const requestedLimit = Number(req.query.limit) || 20;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const stockFilter = String(req.query.stockFilter || "").trim();
    const priceFilter = String(req.query.priceFilter || "").trim();
    const sort = String(req.query.sort || "name-asc").trim();
    const viewCosts = canViewInventoryCosts(req.user);
    const costBasedFilters = ["cost-only", "selling-only", "complete-pricing", "missing-cost"];
    const costBasedSorts = ["cost-desc", "cost-asc", "margin-desc"];
    if (!viewCosts && (costBasedFilters.includes(priceFilter) || costBasedSorts.includes(sort))) {
      return res.status(403).json({ message: "You do not have permission to view inventory cost details." });
    }

    if (branchId === "headOffice") {
      const filter = { business: new mongoose.Types.ObjectId(businessId) };
      if (search) {
        const searchRegex = new RegExp(escapeRegex(search), "i");
        filter.$or = [
          { name: searchRegex },
          { sku: searchRegex }
        ];
      }
      if (category) filter.category = category;

      const inventoryMatch = { ...filter };
      if (stockFilter === "in-stock") inventoryMatch.stock = { $gt: 0 };
      if (stockFilter === "low-stock") inventoryMatch.stock = { $gt: 0, $lte: 5 };
      if (stockFilter === "out-of-stock") inventoryMatch.stock = { $lte: 0 };
      if (priceFilter === "cost-only") {
        inventoryMatch.costPrice = { $gt: 0 };
        inventoryMatch.price = { $lte: 0 };
      } else if (priceFilter === "selling-only") {
        inventoryMatch.price = { $gt: 0 };
        inventoryMatch.costPrice = { $lte: 0 };
      } else if (priceFilter === "complete-pricing") {
        inventoryMatch.costPrice = { $gt: 0 };
        inventoryMatch.price = { $gt: 0 };
      } else if (priceFilter === "missing-cost") inventoryMatch.costPrice = { $lte: 0 };
      else if (priceFilter === "missing-selling") inventoryMatch.price = { $lte: 0 };

      const headOfficeSort = {
        "name-asc": { name: 1, _id: 1 },
        "name-desc": { name: -1, _id: -1 },
        "stock-desc": { stock: -1, _id: 1 },
        "stock-asc": { stock: 1, _id: 1 },
        "cost-desc": { costPrice: -1, _id: 1 },
        "cost-asc": { costPrice: 1, _id: 1 },
        "price-desc": { price: -1, _id: 1 },
        "price-asc": { price: 1, _id: 1 },
        "margin-desc": { margin: -1, _id: 1 }
      }[sort] || { name: 1, _id: 1 };
      const [products, totalItems, summaries, categories] = await Promise.all([
        Product.aggregate([
          { $match: inventoryMatch },
          {
            $lookup: {
              from: Supplier.collection.name,
              let: { supplierId: "$preferredSupplier" },
              pipeline: [
                { $match: { $expr: { $and: [{ $eq: ["$_id", "$$supplierId"] }, { $eq: ["$business", filter.business] }] } } },
                { $project: { _id: 1, name: 1 } }
              ],
              as: "preferredSupplier"
            }
          },
          { $addFields: { preferredSupplier: { $arrayElemAt: ["$preferredSupplier", 0] } } },
          { $addFields: { margin: { $subtract: [{ $ifNull: ["$price", 0] }, { $ifNull: ["$costPrice", 0] }] } } },
          { $sort: headOfficeSort },
          { $skip: skip },
          { $limit: limit }
        ]),
        Product.countDocuments(inventoryMatch),
        Product.aggregate([
          { $match: inventoryMatch },
          { $addFields: {
            quantity: { $ifNull: ["$stock", 0] },
            costPrice: { $ifNull: ["$costPrice", 0] },
            effectiveSellingPrice: { $ifNull: ["$price", 0] }
          } },
          { $group: getSummaryGroup() }
        ]),
        Product.distinct("category", { business: new mongoose.Types.ObjectId(businessId) })
      ]);
      const inventory = products.map((product) => ({
        _id: `head-office-${product._id}`,
        product: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          category: product.category,
          price: product.price,
          ...(viewCosts ? { costPrice: product.costPrice } : {}),
          preferredSupplier: product.preferredSupplier || null
        },
        quantity: Number(product.stock || 0),
        branchPrice: Number(product.price || 0),
        isHeadOffice: true,
        sourceLocation: "headOffice"
      }));
      return res.json({
        inventory,
        summary: viewCosts
          ? normalizeSummary(summaries[0])
          : removeSummaryCosts(normalizeSummary(summaries[0])),
        categories: categories.filter(Boolean).sort((a, b) => a.localeCompare(b)),
        pagination: {
          currentPage: page,
          totalPages: Math.max(Math.ceil(totalItems / limit), 1),
          totalItems,
          hasNextPage: page * limit < totalItems,
          hasPrevPage: page > 1
        }
      });
    }

    const branch = await Branch.findOne({ _id: branchId, business: businessId });
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const branchObjectId = new mongoose.Types.ObjectId(branchId);
    const inventoryPipeline = [
      { $match: { business: businessObjectId, branch: branchObjectId } },
      {
        $lookup: {
          from: Product.collection.name,
          localField: "product",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      { $match: { "product.business": businessObjectId } },
      {
        $lookup: {
          from: Supplier.collection.name,
          let: { supplierId: "$product.preferredSupplier" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$_id", "$$supplierId"] }, { $eq: ["$business", businessObjectId] }] } } },
            { $project: { _id: 1, name: 1 } }
          ],
          as: "preferredSupplierRecord"
        }
      },
      { $addFields: { "product.preferredSupplier": { $arrayElemAt: ["$preferredSupplierRecord", 0] } } }
    ];
    const filterStages = getFilterStages({ search, category, stockFilter, priceFilter });
    const sortStage = getInventorySort(sort, "product.");
    const [result = {}] = await BranchInventory.aggregate([
      ...inventoryPipeline,
      {
        $facet: {
          categories: [
            { $group: { _id: { $ifNull: ["$product.category", "General"] } } },
            { $sort: { _id: 1 } }
          ],
          results: [
            ...filterStages,
            {
              $facet: {
                inventory: [
                  { $sort: sortStage },
                  { $skip: skip },
                  { $limit: limit },
                  {
                    $project: {
                      _id: 1,
                      business: 1,
                      branch: 1,
                      product: {
                        _id: "$product._id",
                        name: "$product.name",
                        sku: "$product.sku",
                        category: "$product.category",
                        price: "$product.price",
                        costPrice: "$product.costPrice",
                        preferredSupplier: "$product.preferredSupplier"
                      },
                      quantity: 1,
                      unitCost: 1,
                      branchPrice: 1
                    }
                  }
                ],
                summary: [{ $group: getSummaryGroup() }],
                count: [{ $count: "totalItems" }]
              }
            }
          ]
        }
      }
    ]);
    const results = result.results?.[0] || {};
    const totalItems = Number(results.count?.[0]?.totalItems || 0);
    res.json({
      inventory: viewCosts ? results.inventory || [] : removeInventoryCosts(results.inventory || []),
      summary: viewCosts
        ? normalizeSummary(results.summary?.[0])
        : removeSummaryCosts(normalizeSummary(results.summary?.[0])),
      categories: (result.categories || []).map((item) => item._id).filter(Boolean),
      pagination: {
        currentPage: page,
        totalPages: Math.max(Math.ceil(totalItems / limit), 1),
        totalItems,
        hasNextPage: page * limit < totalItems,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getProductNameAudit = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const viewCosts = canViewInventoryCosts(req.user);
    const branchId = req.query.branchId || req.user.branchId || "headOffice";
    if (branchId !== "headOffice" && !isObjectId(branchId)) {
      return res.status(400).json({ message: "Invalid branchId" });
    }
    if (!assertBranchAccess(req, res, branchId, "view")) return;

    let products;
    if (branchId === "headOffice") {
      products = await Product.find({ business: businessId })
        .select(viewCosts ? "_id name sku category price costPrice stock" : "_id name sku category price stock")
        .populate({ path: "preferredSupplier", match: { business: businessId }, select: "name" })
        .lean();
    } else {
      const branch = await Branch.findOne({ _id: branchId, business: businessId }).select("_id").lean();
      if (!branch) return res.status(404).json({ message: "Branch not found" });
      const entries = await BranchInventory.find({ business: businessId, branch: branchId })
        .select(viewCosts ? "product quantity unitCost branchPrice" : "product quantity branchPrice")
        .populate({
          path: "product",
          match: { business: businessId },
          select: viewCosts
            ? "_id name sku category price costPrice preferredSupplier"
            : "_id name sku category price preferredSupplier",
          populate: { path: "preferredSupplier", match: { business: businessId }, select: "name" }
        })
        .lean();
      products = entries
        .filter((entry) => entry.product)
        .map((entry) => {
          const product = {
            ...entry.product,
            stock: Number(entry.quantity || 0),
            price: Number(entry.branchPrice ?? entry.product.price ?? 0)
          };
          if (viewCosts) {
            product.costPrice = Number(entry.unitCost) > 0
              ? Number(entry.unitCost)
              : Number(entry.product.costPrice || 0);
          }
          return product;
        });
    }

    const audit = findSimilarCatalogGroups(products);
    return res.json({
      branchId,
      scannedProducts: products.length,
      totalGroups: audit.totalGroups,
      truncated: audit.truncated,
      groups: audit.groups
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not audit product names." });
  }
};

const getInventoryHistory = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const viewCosts = canViewInventoryCosts(req.user);
    const branchId = req.query.branchId || req.user.branchId || "headOffice";
    if (branchId !== "headOffice" && !isObjectId(branchId)) {
      return res.status(400).json({ message: "Invalid branchId" });
    }
    if (!assertBranchAccess(req, res, branchId, "view")) return;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const filter = {
      business: businessId,
      branch: branchId === "headOffice" ? null : branchId
    };
    if (req.query.productId) {
      if (!isObjectId(req.query.productId)) return res.status(400).json({ message: "Invalid productId" });
      filter.product = req.query.productId;
    }

    const [history, totalItems] = await Promise.all([
      InventoryMovement.find(filter)
        .populate("product", "name sku")
        .populate("createdBy", "name")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InventoryMovement.countDocuments(filter)
    ]);

    return res.json({
      history: viewCosts
        ? history
        : history.map((movement) => {
          const safeMovement = { ...movement };
          delete safeMovement.unitCost;
          return safeMovement;
        }),
      pagination: {
        currentPage: page,
        totalPages: Math.max(Math.ceil(totalItems / limit), 1),
        totalItems,
        hasNextPage: page * limit < totalItems,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not load inventory history." });
  }
};

const getProductImportReview = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const branchId = req.query.branchId || req.user.branchId || "headOffice";
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid import review ID." });
    }
    if (branchId !== "headOffice" && !isObjectId(branchId)) {
      return res.status(400).json({ message: "Invalid branchId" });
    }
    if (!assertBranchAccess(req, res, branchId, "view")) return;

    const preview = await ProductImportPreview.findOne({
      _id: req.params.id,
      business: businessId,
      createdBy: req.user.id,
      status: "pending",
      expiresAt: { $gt: new Date() }
    }).lean();
    if (!preview) {
      return res.status(404).json({ message: "This import review has expired, was already applied, or is not available to your account." });
    }

    const products = await Product.find({ business: businessId })
      .select("_id name category sku stock price costPrice")
      .lean();
    const productsByName = new Map();
    for (const product of products) {
      const key = normalizeCatalogName(product.name);
      if (!key) continue;
      const group = productsByName.get(key) || [];
      group.push(product);
      productsByName.set(key, group);
    }
    const uploadedNames = new Map();
    for (const row of preview.rows) {
      const key = normalizeCatalogName(row.name);
      uploadedNames.set(key, (uploadedNames.get(key) || 0) + 1);
    }

    let branchInventoryByProduct = new Map();
    if (branchId !== "headOffice") {
      const branch = await Branch.findOne({ _id: branchId, business: businessId }).select("_id").lean();
      if (!branch) return res.status(404).json({ message: "Branch not found" });
      const entries = await BranchInventory.find({ business: businessId, branch: branchId })
        .select("product quantity unitCost branchPrice")
        .lean();
      branchInventoryByProduct = new Map(entries.map((entry) => [String(entry.product), entry]));
    }

    const viewCosts = canViewInventoryCosts(req.user);
    const rows = preview.rows.map((row) => {
      const matchingProducts = productsByName.get(normalizeCatalogName(row.name)) || [];
      const duplicateUpload = uploadedNames.get(normalizeCatalogName(row.name)) > 1;
      const ambiguousMatch = matchingProducts.length > 1;
      const product = matchingProducts.length === 1 ? matchingProducts[0] : null;
      const branchEntry = product && branchId !== "headOffice"
        ? branchInventoryByProduct.get(String(product._id))
        : null;
      const current = product
        ? {
          stock: Number(branchId === "headOffice" ? product.stock || 0 : branchEntry?.quantity || 0),
          sellingPrice: Number(branchId === "headOffice"
            ? product.price || 0
            : branchEntry?.branchPrice ?? product.price ?? 0),
          ...(viewCosts ? {
            costPrice: Number(branchId === "headOffice"
              ? product.costPrice || 0
              : branchEntry?.unitCost || product.costPrice || 0)
          } : {})
        }
        : null;
      const imported = {
        stock: row.stock,
        sellingPrice: row.sellingPrice,
        ...(viewCosts ? { costPrice: row.costPrice } : {})
      };
      return {
        rowNumber: row.rowNumber,
        name: row.name,
        category: row.category,
        sku: row.sku,
        productId: product?._id || null,
        current,
        imported,
        isNew: matchingProducts.length === 0,
        ambiguousMatch,
        duplicateUpload,
        differences: current ? {
          stock: row.stock !== null && row.stock !== current.stock,
          sellingPrice: row.sellingPrice !== null && row.sellingPrice !== current.sellingPrice,
          ...(viewCosts ? { costPrice: row.costPrice !== null && row.costPrice !== current.costPrice } : {})
        } : {
          stock: row.stock !== null,
          sellingPrice: row.sellingPrice !== null,
          ...(viewCosts ? { costPrice: row.costPrice !== null } : {})
        }
      };
    });

    return res.json({
      importId: preview._id,
      branchId,
      expiresAt: preview.expiresAt,
      rows,
      totalRows: rows.length,
      newProducts: rows.filter((row) => row.isNew && !row.duplicateUpload).length,
      exactMatches: rows.filter((row) => row.productId).length,
      ambiguousMatches: rows.filter((row) => row.ambiguousMatch).length,
      duplicateUploadRows: rows.filter((row) => row.duplicateUpload).length,
      canUpdateStockAtHeadOffice: branchId !== "headOffice" || isPrivileged(req.user),
      canViewCosts: viewCosts
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not prepare the product import review." });
  }
};

const applyProductImportReview = async (req, res) => {
  let session;
  try {
    const businessId = req.user.businessId;
    const { branchId, decisions } = req.body;
    if (!branchId || (branchId !== "headOffice" && !isObjectId(branchId))) {
      return res.status(400).json({ message: "A valid inventory location is required." });
    }
    if (!Array.isArray(decisions) || decisions.length > 5000) {
      return res.status(400).json({ message: "Import decisions must be a list of up to 5,000 rows." });
    }
    if (!decisions.length) {
      return res.status(400).json({ message: "Select at least one product or field to apply." });
    }
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid import review ID." });
    }
    if (!req.user.permissions?.canManageProducts && !isPrivileged(req.user)) {
      return res.status(403).json({ message: "You do not have permission to manage products." });
    }
    if (!assertBranchAccess(req, res, branchId, "manage")) return;

    const preview = await ProductImportPreview.findOne({
      _id: req.params.id,
      business: businessId,
      createdBy: req.user.id,
      status: "pending",
      expiresAt: { $gt: new Date() }
    });
    if (!preview) {
      return res.status(404).json({ message: "This import review has expired, was already applied, or is not available to your account." });
    }

    const rowsByNumber = new Map(preview.rows.map((row) => [Number(row.rowNumber), row]));
    const uploadNameCounts = new Map();
    for (const row of preview.rows) {
      const key = normalizeCatalogName(row.name);
      uploadNameCounts.set(key, (uploadNameCounts.get(key) || 0) + 1);
    }
    const seenRows = new Set();
    const selectedNames = [];
    for (const decision of decisions) {
      if (!decision || typeof decision !== "object" || Array.isArray(decision)) {
        return res.status(400).json({ message: "Each import decision must be an object." });
      }
      const rowNumber = Number(decision.rowNumber);
      if (!rowsByNumber.has(rowNumber) || seenRows.has(rowNumber)) {
        return res.status(400).json({ message: "Import decisions contain an invalid or repeated row." });
      }
      seenRows.add(rowNumber);
      const stagedRow = rowsByNumber.get(rowNumber);
      if (uploadNameCounts.get(normalizeCatalogName(stagedRow.name)) > 1) {
        return res.status(409).json({ message: `The uploaded file contains repeated product names near row ${rowNumber}. Remove duplicates from the file before applying.` });
      }
      if (decision.addProduct === true) selectedNames.push(stagedRow.name);
      if (decision.updateCostPrice === true && !canViewInventoryCosts(req.user)) {
        return res.status(403).json({ message: "You do not have permission to update cost prices." });
      }
      if ((decision.updateStock === true && stagedRow.stock === null)
        || (decision.updateSellingPrice === true && stagedRow.sellingPrice === null)
        || (decision.updateCostPrice === true && stagedRow.costPrice === null)) {
        return res.status(400).json({ message: `Row ${rowNumber} does not contain the selected value.` });
      }
      if (decision.updateStock === true && branchId === "headOffice" && !isPrivileged(req.user)) {
        return res.status(403).json({ message: "Only an owner or super admin can update head office stock." });
      }
      for (const field of ["addProduct", "updateStock", "updateSellingPrice", "updateCostPrice"]) {
        if (decision[field] !== undefined && typeof decision[field] !== "boolean") {
          return res.status(400).json({ message: `Invalid ${field} selection for row ${rowNumber}.` });
        }
      }
    }

    const existingNames = await Product.find({ business: businessId }).select("name").lean();
    const existingNameKeys = new Set(existingNames.map((product) => normalizeCatalogName(product.name)));
    const selectedNewProducts = [...new Set(selectedNames.map(normalizeCatalogName))]
      .filter((name) => !existingNameKeys.has(name)).length;
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: "Business not found." });
    await assertBusinessProductCapacity(business, selectedNewProducts);

    session = await mongoose.startSession();
    let updatedProducts = 0;
    let createdProducts = 0;
    let stockChanges = 0;
    await session.withTransaction(async () => {
      updatedProducts = 0;
      createdProducts = 0;
      stockChanges = 0;
      const currentPreview = await ProductImportPreview.findOne({
        _id: preview._id,
        business: businessId,
        createdBy: req.user.id,
        status: "pending",
        expiresAt: { $gt: new Date() }
      }).session(session);
      if (!currentPreview) throw Object.assign(new Error("This import review is no longer available."), { statusCode: 409 });

      const allProducts = await Product.find({ business: businessId })
        .select("_id name stock price costPrice")
        .session(session)
        .lean();
      const productsByName = new Map();
      for (const product of allProducts) {
        const key = normalizeCatalogName(product.name);
        const group = productsByName.get(key) || [];
        group.push(product);
        productsByName.set(key, group);
      }
      const branch = branchId === "headOffice"
        ? null
        : await Branch.findOne({ _id: branchId, business: businessId }).session(session);
      if (branchId !== "headOffice" && !branch) {
        throw Object.assign(new Error("Branch not found."), { statusCode: 404 });
      }

      for (const decision of decisions) {
        const row = rowsByNumber.get(Number(decision.rowNumber));
        if (decision.addProduct !== true && !decision.updateStock && !decision.updateSellingPrice && !decision.updateCostPrice) continue;
        const matches = productsByName.get(normalizeCatalogName(row.name)) || [];
        if (matches.length > 1) {
          throw Object.assign(new Error(`Row ${row.rowNumber} matches multiple existing products. Resolve the duplicate names first.`), { statusCode: 409 });
        }
        let product = matches[0] || null;
        if (decision.productId && String(product?._id || "") !== String(decision.productId)) {
          throw Object.assign(new Error(`Product "${row.name}" changed since this review was loaded. Refresh the review before applying.`), { statusCode: 409 });
        }
        if (!product && decision.addProduct !== true) {
          throw Object.assign(new Error(`No exact match exists for "${row.name}". Select Add product or review the import again.`), { statusCode: 409 });
        }

        if (!product) {
          const initialPrice = decision.updateSellingPrice ? Number(row.sellingPrice || 0) : 0;
          const initialCost = decision.updateCostPrice ? Number(row.costPrice || 0) : 0;
          product = await Product.create([{
            name: row.name,
            category: row.category || "General",
            sku: row.sku || `SKU-${Date.now()}-${row.rowNumber}`,
            price: initialPrice,
            costPrice: initialCost,
            stock: branchId === "headOffice" && decision.updateStock ? Number(row.stock || 0) : 0,
            business: businessId
          }], { session }).then((created) => created[0].toObject());
          createdProducts += 1;
          productsByName.set(normalizeCatalogName(row.name), [product]);
          if (branchId !== "headOffice") {
            const quantity = decision.updateStock ? Number(row.stock || 0) : 0;
            const branchPrice = decision.updateSellingPrice ? Number(row.sellingPrice || 0) : null;
            const unitCost = decision.updateCostPrice ? Number(row.costPrice || 0) : initialCost;
            await BranchInventory.create([{
              business: businessId,
              branch: branchId,
              product: product._id,
              quantity,
              branchPrice,
              unitCost,
              createdBy: req.user.id
            }], { session });
            if (quantity > 0) {
              await InventoryMovement.create([{
                business: businessId,
                branch: branchId,
                product: product._id,
                type: "adjustment",
                quantity,
                unitCost,
                previousStock: 0,
                newStock: quantity,
                note: "Initial stock from reviewed product import",
                createdBy: req.user.id
              }], { session });
              stockChanges += 1;
            }
          } else if (decision.updateStock && Number(row.stock || 0) > 0) {
            await InventoryMovement.create([{
              business: businessId,
              branch: null,
              product: product._id,
              type: "adjustment",
              quantity: Number(row.stock),
              unitCost: initialCost,
              previousStock: 0,
              newStock: Number(row.stock),
              note: "Initial stock from reviewed product import",
              createdBy: req.user.id
            }], { session });
            stockChanges += 1;
          }
          continue;
        }

        if (branchId === "headOffice") {
          const existingProduct = await Product.findOne({ _id: product._id, business: businessId }).session(session);
          if (!existingProduct) throw Object.assign(new Error(`Product "${row.name}" no longer exists.`), { statusCode: 409 });
          const previousStock = Number(existingProduct.stock || 0);
          if (decision.updateStock && row.stock !== null) existingProduct.stock = Number(row.stock);
          if (decision.updateSellingPrice && row.sellingPrice !== null) existingProduct.price = Number(row.sellingPrice);
          if (decision.updateCostPrice && row.costPrice !== null) existingProduct.costPrice = Number(row.costPrice);
          await existingProduct.save({ session });
          const newStock = Number(existingProduct.stock || 0);
          if (decision.updateStock && newStock !== previousStock) {
            await InventoryMovement.create([{
              business: businessId,
              branch: null,
              product: existingProduct._id,
              type: "adjustment",
              quantity: Math.abs(newStock - previousStock),
              unitCost: Number(existingProduct.costPrice || 0),
              previousStock,
              newStock,
              note: "Stock count applied from reviewed product import",
              createdBy: req.user.id
            }], { session });
            stockChanges += 1;
          }
        } else {
          const branchEntry = await BranchInventory.findOne({
            business: businessId,
            branch: branchId,
            product: product._id
          }).session(session);
          const previousStock = Number(branchEntry?.quantity || 0);
          const nextQuantity = decision.updateStock && row.stock !== null
            ? Number(row.stock)
            : previousStock;
          const nextBranchPrice = decision.updateSellingPrice && row.sellingPrice !== null
            ? Number(row.sellingPrice)
            : branchEntry?.branchPrice ?? null;
          const nextUnitCost = decision.updateCostPrice && row.costPrice !== null
            ? Number(row.costPrice)
            : branchEntry?.unitCost ?? Number(product.costPrice || 0);
          if (branchEntry) {
            branchEntry.quantity = nextQuantity;
            if (decision.updateSellingPrice && row.sellingPrice !== null) branchEntry.branchPrice = nextBranchPrice;
            if (decision.updateCostPrice && row.costPrice !== null) branchEntry.unitCost = nextUnitCost;
            await branchEntry.save({ session });
          } else {
            await BranchInventory.create([{
              business: businessId,
              branch: branchId,
              product: product._id,
              quantity: nextQuantity,
              branchPrice: nextBranchPrice,
              unitCost: nextUnitCost,
              createdBy: req.user.id
            }], { session });
          }
          if (decision.updateStock && nextQuantity !== previousStock) {
            await InventoryMovement.create([{
              business: businessId,
              branch: branchId,
              product: product._id,
              type: "adjustment",
              quantity: Math.abs(nextQuantity - previousStock),
              unitCost: nextUnitCost,
              previousStock,
              newStock: nextQuantity,
              note: "Stock count applied from reviewed product import",
              createdBy: req.user.id
            }], { session });
            stockChanges += 1;
          }
        }
        updatedProducts += 1;
      }

      currentPreview.status = "applied";
      currentPreview.appliedAt = new Date();
      await currentPreview.save({ session });
    });

    return res.json({
      message: "Reviewed import changes applied.",
      updatedProducts,
      createdProducts,
      stockChanges
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || "Could not apply the reviewed import." });
  } finally {
    if (session) await session.endSession();
  }
};

const updateBranchInventory = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const branchId = req.body.branchId || req.user.branchId;
    const { productId, quantity, branchPrice } = req.body;
    const normalizedBranchId = typeof branchId === "object" ? branchId?._id : branchId;
    const normalizedProductId = typeof productId === "object" ? productId?._id : productId;

    if (!normalizedBranchId || !normalizedProductId) {
      return res.status(400).json({ message: "branchId and productId are required" });
    }

    if (!isObjectId(normalizedProductId)) {
      return res.status(400).json({ message: "Invalid productId" });
    }

    if (normalizedBranchId !== "headOffice" && !isObjectId(normalizedBranchId)) {
      return res.status(400).json({ message: "Invalid branchId" });
    }

    const numericQuantity = quantity === undefined ? undefined : Number(quantity);
    const numericPrice = branchPrice === undefined ? undefined : Number(branchPrice);
    if (numericQuantity !== undefined && (!Number.isFinite(numericQuantity) || numericQuantity < 0)) {
      return res.status(400).json({ message: "Quantity must be a valid non-negative number" });
    }
    if (numericPrice !== undefined && (!Number.isFinite(numericPrice) || numericPrice < 0)) {
      return res.status(400).json({ message: "Branch price must be a valid non-negative number" });
    }

    if (!assertBranchAccess(req, res, normalizedBranchId, "manage")) return;

    const session = await mongoose.startSession();
    let updatedItem;
    try {
      await session.withTransaction(async () => {
        if (normalizedBranchId === "headOffice") {
          const product = await Product.findOne({ _id: normalizedProductId, business: businessId }).session(session);
          if (!product) throw Object.assign(new Error("Product not found"), { statusCode: 404 });

          const previousStock = Number(product.stock || 0);
          if (numericQuantity !== undefined) product.stock = numericQuantity;
          if (numericPrice !== undefined) product.price = numericPrice;
          await product.save({ session });

          if (numericQuantity !== undefined && numericQuantity !== previousStock) {
            const change = numericQuantity - previousStock;
            await InventoryMovement.create([{
              business: businessId,
              branch: null,
              product: product._id,
              type: "adjustment",
              quantity: Math.abs(change),
              unitCost: Number(product.costPrice || 0),
              previousStock,
              newStock: numericQuantity,
              note: `Manual head office stock adjustment (${change > 0 ? "+" : ""}${change})`,
              createdBy: req.user.id
            }], { session });
          }
          updatedItem = product;
          return;
        }

        const branch = await Branch.findOne({ _id: normalizedBranchId, business: businessId }).session(session);
        if (!branch) throw Object.assign(new Error("Branch not found"), { statusCode: 404 });

        const inventory = await BranchInventory.findOne({
          business: businessId,
          branch: normalizedBranchId,
          product: normalizedProductId
        }).session(session);
        if (!inventory) throw Object.assign(new Error("Branch inventory entry not found"), { statusCode: 404 });

        const previousStock = Number(inventory.quantity || 0);
        if (numericQuantity !== undefined) inventory.quantity = numericQuantity;
        if (numericPrice !== undefined) inventory.branchPrice = numericPrice;
        await inventory.save({ session });

        if (numericQuantity !== undefined && numericQuantity !== previousStock) {
          const change = numericQuantity - previousStock;
          const product = await Product.findOne({ _id: normalizedProductId, business: businessId })
            .select("costPrice")
            .session(session);
          await InventoryMovement.create([{
            business: businessId,
            branch: normalizedBranchId,
            product: normalizedProductId,
            type: "adjustment",
            quantity: Math.abs(change),
            unitCost: Number(inventory.unitCost || product?.costPrice || 0),
            previousStock,
            newStock: numericQuantity,
            note: `Manual branch stock adjustment (${change > 0 ? "+" : ""}${change})`,
            createdBy: req.user.id
          }], { session });
        }
        updatedItem = inventory;
      });
    } finally {
      await session.endSession();
    }
    return res.json(updatedItem);
  } catch (err) {
    console.error("UPDATE BRANCH INVENTORY ERROR", {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      branchId: req.body?.branchId || req.user?.branchId,
      productId: req.body?.productId
    });
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const getImportStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const job = await OperationLog.findById(id).lean();
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.business?.toString() !== req.user.businessId || !assertBranchAccess(req, res, job.branch?.toString(), "manage")) return;
    res.json({ status: job.status, metadata: job.metadata, error: job.error });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default {
  importProductToBranch,
  getBranchInventory,
  getProductNameAudit,
  getInventoryHistory,
  getProductImportReview,
  applyProductImportReview,
  updateBranchInventory,
  getImportStatus
};
