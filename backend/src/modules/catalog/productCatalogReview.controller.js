import mongoose from "mongoose";
import Branch from "../branches/branch.model.js";
import BranchInventory from "../branches/branchInventory.model.js";
import BranchTransferRequest from "../branches/branchTransfer.model.js";
import Expense from "../expenses/expense.model.js";
import InventoryMovement from "../inventory/inventory.model.js";
import Invoice from "../invoices/invoice.model.js";
import Product from "../products/product.model.js";
import PurchaseOrder from "../purchaseOrders/purchaseOrder.model.js";
import Sale from "../sales/sale.model.js";
import ShopOrder from "../shop/shopOrder.model.js";
import Supplier from "../suppliers/supplier.model.js";
import CatalogPairDecision from "./catalogPairDecision.model.js";
import { canAccessBranch, isPrivileged } from "../../utils/branchAccess.js";
import { canManageGlobalCatalog, chooseMergeStock, chooseMergeValue } from "./catalogMergeUtils.js";

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const resolveProductPair = async (businessId, primaryId, secondaryId, session) => {
  if (!isValidObjectId(primaryId) || !isValidObjectId(secondaryId) || String(primaryId) === String(secondaryId)) {
    throw Object.assign(new Error("Choose two different valid products."), { statusCode: 400 });
  }
  const products = await Product.find({
    business: businessId,
    _id: { $in: [primaryId, secondaryId] }
  }).session(session || null).lean();
  if (products.length !== 2) {
    throw Object.assign(new Error("One or both products no longer exist in this business."), { statusCode: 404 });
  }
  const primary = products.find((product) => String(product._id) === String(primaryId));
  const secondary = products.find((product) => String(product._id) === String(secondaryId));
  return { primary, secondary };
};

const countReferences = async (businessId, productId) => {
  const [branchInventory, inventoryMovements, sales, invoices, purchases, expenses, shopOrders, transfers] = await Promise.all([
    BranchInventory.countDocuments({ business: businessId, product: productId }),
    InventoryMovement.countDocuments({ business: businessId, product: productId }),
    Sale.countDocuments({ business: businessId, "items.product": productId }),
    Invoice.countDocuments({ business: businessId, "items.product": productId }),
    PurchaseOrder.countDocuments({ business: businessId, "items.product": productId }),
    Expense.countDocuments({ business: businessId, "inventoryItems.product": productId }),
    ShopOrder.countDocuments({
      items: { $elemMatch: { business: businessId, product: productId } }
    }),
    BranchTransferRequest.countDocuments({ business: businessId, product: productId })
  ]);
  return { branchInventory, inventoryMovements, sales, invoices, purchases, expenses, shopOrders, transfers };
};

const getMergePreview = async (req, res) => {
  try {
    if (!canManageGlobalCatalog(req.user)) {
      return res.status(403).json({ message: "Merging products requires product management and all-branch inventory management access." });
    }
    const businessId = req.user.businessId;
    const { primaryId, secondaryId } = req.query;
    const { primary, secondary } = await resolveProductPair(businessId, primaryId, secondaryId);
    const branchEntries = await BranchInventory.find({
      business: businessId,
      product: { $in: [primary._id, secondary._id] }
    })
      .populate("branch", "name")
      .lean();
    const byBranch = new Map();
    for (const entry of branchEntries) {
      const branchId = String(entry.branch?._id || entry.branch);
      const current = byBranch.get(branchId) || {
        branchId,
        branchName: entry.branch?.name || "Branch",
        primary: null,
        secondary: null
      };
      current[String(entry.product) === String(primary._id) ? "primary" : "secondary"] = {
        quantity: Number(entry.quantity || 0),
        sellingPriceIsInherited: entry.branchPrice === null || entry.branchPrice === undefined,
        sellingPrice: Number(entry.branchPrice ?? (
          String(entry.product) === String(primary._id) ? primary.price : secondary.price
        ) ?? 0),
        costPrice: Number(entry.unitCost || (
          String(entry.product) === String(primary._id) ? primary.costPrice : secondary.costPrice
        ) || 0)
      };
      byBranch.set(branchId, current);
    }
    const [primaryReferences, secondaryReferences, branches, suppliers] = await Promise.all([
      countReferences(businessId, primary._id),
      countReferences(businessId, secondary._id),
      Branch.find({ business: businessId }).select("_id name").lean(),
      Supplier.find({
        business: businessId,
        _id: { $in: [primary.preferredSupplier, secondary.preferredSupplier].filter(Boolean) }
      }).select("_id name").lean()
    ]);
    const supplierName = (product) => suppliers.find((supplier) =>
      String(supplier._id) === String(product.preferredSupplier)
    )?.name || null;
    const locations = branches.map((branch) => byBranch.get(String(branch._id)) || {
      branchId: String(branch._id),
      branchName: branch.name,
      primary: null,
      secondary: null
    });

    return res.json({
      primary: {
        _id: primary._id,
        name: primary.name,
        sku: primary.sku,
        category: primary.category,
        preferredSupplier: supplierName(primary),
        shopVisible: primary.shopVisible !== false,
        stock: Number(primary.stock || 0),
        sellingPrice: Number(primary.price || 0),
        costPrice: Number(primary.costPrice || 0),
        references: primaryReferences
      },
      secondary: {
        _id: secondary._id,
        name: secondary.name,
        sku: secondary.sku,
        category: secondary.category,
        preferredSupplier: supplierName(secondary),
        shopVisible: secondary.shopVisible !== false,
        stock: Number(secondary.stock || 0),
        sellingPrice: Number(secondary.price || 0),
        costPrice: Number(secondary.costPrice || 0),
        references: secondaryReferences
      },
      locations,
      warning: "This operation merges the products across head office and every branch, and updates linked sales, invoices, purchases, expenses, transfers, online orders, and stock history."
    });
  } catch (err) {
    if (!err.statusCode || err.statusCode >= 500) console.error("PRODUCT MERGE PREVIEW ERROR", err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Could not prepare the product merge preview." });
  }
};

const recordMergeMovement = async ({ session, businessId, branchId = null, productId, previousStock, newStock, unitCost, note, userId }) => {
  if (previousStock === newStock) return;
  await InventoryMovement.create([{
    business: businessId,
    branch: branchId,
    product: productId,
    type: "adjustment",
    quantity: Math.abs(newStock - previousStock),
    unitCost,
    previousStock,
    newStock,
    note,
    createdBy: userId
  }], { session });
};

const mergeProducts = async (req, res) => {
  let session;
  try {
    if (!canManageGlobalCatalog(req.user)) {
      return res.status(403).json({ message: "Merging products requires product management and all-branch inventory management access." });
    }
    const businessId = req.user.businessId;
    const {
      primaryId,
      secondaryId,
      stockPolicy,
      sellingPricePolicy,
      costPricePolicy
    } = req.body;
    const validStockPolicies = ["sum", "primary", "secondary"];
    const validSellingPolicies = ["primary", "secondary", "highest", "lowest"];
    const validCostPolicies = ["primary", "secondary", "highest", "lowest", "weighted-average"];
    if (!validStockPolicies.includes(stockPolicy)
      || !validSellingPolicies.includes(sellingPricePolicy)
      || !validCostPolicies.includes(costPricePolicy)) {
      return res.status(400).json({ message: "Choose valid stock, selling-price, and cost-price merge rules." });
    }

    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      const { primary, secondary } = await resolveProductPair(businessId, primaryId, secondaryId, session);
      const previousPrimaryStock = Number(primary.stock || 0);
      const previousSecondaryStock = Number(secondary.stock || 0);
      const nextPrimaryStock = chooseMergeStock(previousPrimaryStock, previousSecondaryStock, stockPolicy);
      const nextSellingPrice = chooseMergeValue(Number(primary.price || 0), Number(secondary.price || 0), sellingPricePolicy);
      const nextCostPrice = chooseMergeValue(
        Number(primary.costPrice || 0),
        Number(secondary.costPrice || 0),
        costPricePolicy,
        previousPrimaryStock,
        previousSecondaryStock
      );
      const branchEntries = await BranchInventory.find({
        business: businessId,
        product: { $in: [primary._id, secondary._id] }
      }).session(session);
      const entriesByBranch = new Map();
      for (const entry of branchEntries) {
        const key = String(entry.branch);
        const pair = entriesByBranch.get(key) || { primary: null, secondary: null };
        pair[String(entry.product) === String(primary._id) ? "primary" : "secondary"] = entry;
        entriesByBranch.set(key, pair);
      }

      const updatedPrimary = await Product.findOne({ _id: primary._id, business: businessId }).session(session);
      updatedPrimary.stock = nextPrimaryStock;
      updatedPrimary.price = nextSellingPrice;
      updatedPrimary.costPrice = nextCostPrice;
      await updatedPrimary.save({ session });

      for (const [branchId, pair] of entriesByBranch) {
        const primaryEntry = pair.primary;
        const secondaryEntry = pair.secondary;
        const primaryQuantity = Number(primaryEntry?.quantity || 0);
        const secondaryQuantity = Number(secondaryEntry?.quantity || 0);
        const nextQuantity = chooseMergeStock(primaryQuantity, secondaryQuantity, stockPolicy);
        const primaryBranchPrice = primaryEntry?.branchPrice ?? Number(primary.price || 0);
        const secondaryBranchPrice = secondaryEntry?.branchPrice ?? Number(secondary.price || 0);
        const chosenBranchPrice = chooseMergeValue(primaryBranchPrice, secondaryBranchPrice, sellingPricePolicy);
        const primaryPriceInherited = primaryEntry?.branchPrice === null || primaryEntry?.branchPrice === undefined;
        const secondaryPriceInherited = secondaryEntry?.branchPrice === null || secondaryEntry?.branchPrice === undefined;
        const nextBranchPrice = primaryPriceInherited && secondaryPriceInherited
          ? null
          : chosenBranchPrice;
        const primaryUnitCost = Number(primaryEntry?.unitCost || primary.costPrice || 0);
        const secondaryUnitCost = Number(secondaryEntry?.unitCost || secondary.costPrice || 0);
        const nextUnitCost = chooseMergeValue(
          primaryUnitCost,
          secondaryUnitCost,
          costPricePolicy,
          primaryQuantity,
          secondaryQuantity
        );
        if (primaryEntry) {
          primaryEntry.quantity = nextQuantity;
          primaryEntry.branchPrice = nextBranchPrice;
          primaryEntry.unitCost = nextUnitCost;
          await primaryEntry.save({ session });
        } else if (nextQuantity !== 0 || nextBranchPrice !== null) {
          await BranchInventory.create([{
            business: businessId,
            branch: branchId,
            product: primary._id,
            quantity: nextQuantity,
            branchPrice: nextBranchPrice,
            unitCost: nextUnitCost,
            createdBy: req.user.id
          }], { session });
        }
        await recordMergeMovement({
          session,
          businessId,
          branchId,
          productId: primary._id,
          previousStock: primaryQuantity,
          newStock: nextQuantity,
          unitCost: nextUnitCost,
          note: `Product merge stock reconciliation (${stockPolicy}; merged ${secondary.name})`,
          userId: req.user.id
        });
        if (secondaryEntry) await BranchInventory.deleteOne({ _id: secondaryEntry._id }).session(session);
      }

      const arrayReferenceModels = [
        { model: Sale, path: "items.product" },
        { model: Invoice, path: "items.product" },
        { model: PurchaseOrder, path: "items.product" },
        { model: Expense, path: "inventoryItems.product" }
      ];
      for (const { model, path } of arrayReferenceModels) {
        await model.updateMany(
          { business: businessId, [path]: secondary._id },
          { $set: { [`${path.split(".")[0]}.$[item].product`]: primary._id } },
          { arrayFilters: [{ "item.product": secondary._id }], session }
        );
      }
      await ShopOrder.updateMany(
        { items: { $elemMatch: { business: businessId, product: secondary._id } } },
        { $set: { "items.$[item].product": primary._id } },
        { arrayFilters: [{ "item.business": businessId, "item.product": secondary._id }], session }
      );
      await BranchTransferRequest.updateMany(
        { business: businessId, product: secondary._id },
        { $set: { product: primary._id } },
        { session }
      );
      await InventoryMovement.updateMany(
        { business: businessId, product: secondary._id },
        [{
          $set: {
            product: primary._id,
            note: {
              $concat: [`[Merged from ${secondary.name}] `, { $ifNull: ["$note", ""] }]
            }
          }
        }],
        { session }
      );
      await recordMergeMovement({
        session,
        businessId,
        productId: primary._id,
        previousStock: previousPrimaryStock,
        newStock: nextPrimaryStock,
        unitCost: nextCostPrice,
        note: `Product merge stock reconciliation (${stockPolicy}; merged ${secondary.name})`,
        userId: req.user.id
      });
      await CatalogPairDecision.deleteMany({
        business: businessId,
        $or: [
          { firstProduct: { $in: [primary._id, secondary._id] } },
          { secondProduct: { $in: [primary._id, secondary._id] } }
        ]
      }).session(session);
      await Product.deleteOne({ _id: secondary._id, business: businessId }).session(session);
      result = {
        primaryProductId: primary._id,
        removedProductId: secondary._id,
        stockPolicy,
        sellingPricePolicy,
        costPricePolicy,
        headOfficeStock: nextPrimaryStock
      };
    });

    return res.json({
      message: "Products merged successfully.",
      ...result
    });
  } catch (err) {
    if (!err.statusCode || err.statusCode >= 500) console.error("PRODUCT MERGE ERROR", err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Could not merge the selected products." });
  } finally {
    if (session) await session.endSession();
  }
};

const keepProductsSeparate = async (req, res) => {
  try {
    const { branchId, firstProductId, secondProductId, keepSeparate = true } = req.body;
    if (typeof keepSeparate !== "boolean") {
      return res.status(400).json({ message: "Choose whether to keep this product pair separate." });
    }
    if (!branchId || (branchId !== "headOffice" && !isValidObjectId(branchId))) {
      return res.status(400).json({ message: "A valid inventory location is required." });
    }
    if (!canAccessBranch(req.user, branchId, "view")) {
      return res.status(403).json({ message: "You do not have access to this inventory location." });
    }
    if (!req.user.permissions?.canManageProducts && !isPrivileged(req.user)) {
      return res.status(403).json({ message: "Product-management permission is required to record catalog decisions." });
    }
    const { first, second } = await resolveProductPair(req.user.businessId, firstProductId, secondProductId);
    const [firstId, secondId] = [String(first._id), String(second._id)].sort();
    if (!keepSeparate) {
      await CatalogPairDecision.deleteOne({
        business: req.user.businessId,
        firstProduct: firstId,
        secondProduct: secondId
      });
      return res.json({ message: "The keep-separate decision was removed." });
    }
    await CatalogPairDecision.findOneAndUpdate(
      { business: req.user.businessId, firstProduct: firstId, secondProduct: secondId },
      {
        $set: { decision: "keep-separate", decidedBy: req.user.id },
        $setOnInsert: { business: req.user.businessId, firstProduct: firstId, secondProduct: secondId }
      },
      { upsert: true, new: true, runValidators: true }
    );
    return res.json({ message: "These products will remain separate and will no longer be suggested as a pair." });
  } catch (err) {
    if (!err.statusCode || err.statusCode >= 500) console.error("PRODUCT SEPARATION DECISION ERROR", err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Could not save the catalog decision." });
  }
};

export default { getMergePreview, mergeProducts, keepProductsSeparate, canManageGlobalCatalog };
