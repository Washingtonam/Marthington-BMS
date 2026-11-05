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

const applyInventoryFilters = (inventory, { stockFilter = "", priceFilter = "", sort = "name-asc" } = {}) => {
  let filtered = inventory.filter((entry) => {
    const quantity = Number(entry.quantity || 0);
    const cost = Number(entry.product?.costPrice || 0);
    const selling = Number(entry.branchPrice ?? entry.product?.price ?? 0);

    if (stockFilter === "in-stock" && quantity <= 0) return false;
    if (stockFilter === "low-stock" && !(quantity > 0 && quantity <= 5)) return false;
    if (stockFilter === "out-of-stock" && quantity !== 0) return false;

    if (priceFilter === "cost-only" && !(cost > 0 && selling <= 0)) return false;
    if (priceFilter === "selling-only" && !(selling > 0 && cost <= 0)) return false;
    if (priceFilter === "complete-pricing" && !(cost > 0 && selling > 0)) return false;
    if (priceFilter === "missing-cost" && cost > 0) return false;
    if (priceFilter === "missing-selling" && selling > 0) return false;
    return true;
  });

  const number = (value) => Number(value || 0);
  const compareName = (a, b) => String(a.product?.name || "").localeCompare(String(b.product?.name || ""), undefined, { sensitivity: "base" });
  filtered.sort((a, b) => {
    if (sort === "name-desc") return compareName(b, a);
    if (sort === "stock-desc") return number(b.quantity) - number(a.quantity);
    if (sort === "stock-asc") return number(a.quantity) - number(b.quantity);
    if (sort === "cost-desc") return number(b.product?.costPrice) - number(a.product?.costPrice);
    if (sort === "cost-asc") return number(a.product?.costPrice) - number(b.product?.costPrice);
    if (sort === "price-desc") return number(b.branchPrice ?? b.product?.price) - number(a.branchPrice ?? a.product?.price);
    if (sort === "price-asc") return number(a.branchPrice ?? a.product?.price) - number(b.branchPrice ?? b.product?.price);
    if (sort === "margin-desc") {
      const marginA = number(a.branchPrice ?? a.product?.price) - number(a.product?.costPrice);
      const marginB = number(b.branchPrice ?? b.product?.price) - number(b.product?.costPrice);
      return marginB - marginA;
    }
    return compareName(a, b);
  });
  return filtered;
};

const buildInventoryResponse = (inventory, totalItems, page, limit, filteredInventory, sourceProducts) => {
  const summary = filteredInventory.reduce((result, entry) => {
    const quantity = Number(entry.quantity || 0);
    const cost = Number(entry.product?.costPrice || 0);
    const selling = Number(entry.branchPrice ?? entry.product?.price ?? 0);
    result.totalUnits += quantity;
    result.inventoryValue += quantity * cost;
    result.totalProducts += 1;
    if (quantity === 0) result.outOfStock += 1;
    else if (quantity <= 5) result.lowStock += 1;
    if (cost <= 0) result.missingCost += 1;
    if (selling <= 0) result.missingSelling += 1;
    return result;
  }, { totalProducts: 0, totalUnits: 0, lowStock: 0, outOfStock: 0, missingCost: 0, missingSelling: 0, inventoryValue: 0 });

  const categories = [...new Set(sourceProducts.map((product) => product.category || "General").filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  return {
    inventory,
    summary,
    categories,
    pagination: {
      currentPage: page,
      totalPages: Math.max(Math.ceil(totalItems / limit), 1),
      totalItems,
      hasNextPage: page * limit < totalItems,
      hasPrevPage: page > 1
    }
  };
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
      const filter = { business: businessId };
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } }
        ];
      }
      if (category) filter.category = category;

      const products = await Product.find(filter).lean();
      let inventory = products.map((product) => ({
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
      inventory = applyInventoryFilters(inventory, { stockFilter, priceFilter, sort });
      const filtered = inventory;
      const totalItems = filtered.length;
      const paged = filtered.slice(skip, skip + limit);
      return res.json(buildInventoryResponse(paged, totalItems, page, limit, filtered, products));
    }

    const branch = await Branch.findOne({ _id: branchId, business: businessId });
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    const inventoryRecords = await BranchInventory.find({ business: businessId, branch: branchId })
      .populate("product", "name sku category price costPrice")
      .lean();

    let filtered = inventoryRecords.filter((entry) => {
      if (!entry.product) return false;
      if (search) {
        const name = entry.product?.name || "";
        const sku = entry.product?.sku || "";
        if (![name, sku].some((value) => value.toLowerCase().includes(search.toLowerCase()))) return false;
      }
      if (category && String(entry.product?.category || "General") !== category) return false;
      return true;
    });
    filtered = applyInventoryFilters(filtered, { stockFilter, priceFilter, sort });
    const paged = filtered.slice(skip, skip + limit);
    const sourceProducts = inventoryRecords.map((entry) => entry.product).filter(Boolean);
    res.json(buildInventoryResponse(paged, filtered.length, page, limit, filtered, sourceProducts));
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
