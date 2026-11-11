import BranchInventory from "./branchInventory.model.js";
import Branch from "./branch.model.js";
import Product from "../products/product.model.js";
import mongoose from "mongoose";
import Business from "../businesses/business.model.js";
import InventoryMovement from "../inventory/inventory.model.js";
import User from "../users/user.model.js";
import OperationLog from "../../models/operationLog.model.js";
import importQueue from "../../queues/importQueue.js";
import { canAccessBranch as canAccessBranchForUser, isPrivileged } from "../../utils/branchAccess.js";

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
    "cost-desc": { [`${productPrefix}costPrice`]: -1, _id: 1 },
    "cost-asc": { [`${productPrefix}costPrice`]: 1, _id: 1 },
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
      costPrice: { $ifNull: ["$product.costPrice", 0] },
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
        branch: branchId,
        type: "transfer",
        quantity: transferQuantity,
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
          costPrice: product.costPrice
        },
        quantity: Number(product.stock || 0),
        branchPrice: Number(product.price || 0),
        isHeadOffice: true,
        sourceLocation: "headOffice"
      }));
      return res.json({
        inventory,
        summary: normalizeSummary(summaries[0]),
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
      { $match: { "product.business": businessObjectId } }
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
                        costPrice: "$product.costPrice"
                      },
                      quantity: 1,
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
      inventory: results.inventory || [],
      summary: normalizeSummary(results.summary?.[0]),
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

    if (normalizedBranchId === "headOffice") {
      const product = await Product.findOne({ _id: normalizedProductId, business: businessId });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (numericQuantity !== undefined) {
        product.stock = numericQuantity;
      }
      if (numericPrice !== undefined) {
        product.price = numericPrice;
      }

      await product.save();
      return res.json(product);
    }

    const branch = await Branch.findOne({ _id: normalizedBranchId, business: businessId });
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const inventory = await BranchInventory.findOne({ business: businessId, branch: normalizedBranchId, product: normalizedProductId });
    if (!inventory) {
      return res.status(404).json({ message: "Branch inventory entry not found" });
    }

    if (quantity !== undefined) {
      inventory.quantity = numericQuantity;
    }
    if (branchPrice !== undefined) {
      inventory.branchPrice = numericPrice;
    }

    await inventory.save();
    res.json(inventory);
  } catch (err) {
    console.error("UPDATE BRANCH INVENTORY ERROR", {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      branchId: req.body?.branchId || req.user?.branchId,
      productId: req.body?.productId
    });
    res.status(500).json({ message: err.message });
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
  updateBranchInventory,
  getImportStatus
};
