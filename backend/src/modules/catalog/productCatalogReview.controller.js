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
import {
  canManageGlobalCatalog,
  chooseMergeFieldFromProducts,
  chooseMergeStockFromProducts
} from "./catalogMergeUtils.js";

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const getRequestedProductIds = (source = {}) => {
  const secondaries = Array.isArray(source.secondaryIds)
    ? source.secondaryIds
    : String(source.secondaryIds || source.secondaryId || "").split(",").filter(Boolean);
  return [source.primaryId, ...secondaries].filter(Boolean).map(String);
};

const resolveProducts = async (businessId, productIds, session) => {
  const ids = productIds.map(String);
  if (ids.length < 2 || ids.length > 50 || new Set(ids).size !== ids.length || ids.some((id) => !isValidObjectId(id))) {
    throw Object.assign(new Error("Choose between 2 and 50 different valid products."), { statusCode: 400 });
  }
  const products = await Product.find({
    business: businessId,
    _id: { $in: ids }
  }).session(session || null).lean();
  if (products.length !== ids.length) {
    throw Object.assign(new Error("One or more products no longer exist in this business."), { statusCode: 404 });
  }
  return ids.map((id) => products.find((product) => String(product._id) === id));
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
    const productIds = getRequestedProductIds(req.query);
    const products = await resolveProducts(businessId, productIds);
    const branchEntries = await BranchInventory.find({
      business: businessId,
      product: { $in: products.map((product) => product._id) }
    })
      .populate("branch", "name")
      .lean();
    const byBranch = new Map();
    for (const entry of branchEntries) {
      const branchId = String(entry.branch?._id || entry.branch);
      const current = byBranch.get(branchId) || {
        branchId,
        branchName: entry.branch?.name || "Branch",
        products: {}
      };
      const product = products.find((candidate) => String(candidate._id) === String(entry.product));
      current.products[String(entry.product)] = {
        quantity: Number(entry.quantity || 0),
        sellingPriceIsInherited: entry.branchPrice === null || entry.branchPrice === undefined,
        sellingPrice: Number(entry.branchPrice ?? (
          product?.price
        ) ?? 0),
        costPrice: Number(entry.unitCost || product?.costPrice || 0)
      };
      byBranch.set(branchId, current);
    }
    const [references, branches, suppliers] = await Promise.all([
      Promise.all(products.map((product) => countReferences(businessId, product._id))),
      Branch.find({ business: businessId }).select("_id name").lean(),
      Supplier.find({
        business: businessId,
        _id: { $in: products.map((product) => product.preferredSupplier).filter(Boolean) }
      }).select("_id name").lean()
    ]);
    const supplierName = (product) => suppliers.find((supplier) =>
      String(supplier._id) === String(product.preferredSupplier)
    )?.name || null;
    const locations = branches.map((branch) => byBranch.get(String(branch._id)) || {
      branchId: String(branch._id),
      branchName: branch.name,
      products: {}
    });

    return res.json({
      products: products.map((product, index) => ({
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        preferredSupplier: supplierName(product),
        shopVisible: product.shopVisible !== false,
        stock: Number(product.stock || 0),
        sellingPrice: Number(product.price || 0),
        costPrice: Number(product.costPrice || 0),
        references: references[index]
      })),
      locations,
      warning: `This operation merges ${products.length} products across head office and every branch, and updates linked sales, invoices, purchases, expenses, transfers, online orders, and stock history.`
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
      secondaryIds,
      stockPolicy,
      sellingPricePolicy,
      costPricePolicy
    } = req.body;
    const productIds = getRequestedProductIds({ primaryId, secondaryId, secondaryIds });
    const products = await resolveProducts(businessId, productIds);
    const survivor = products[0];
    const removedProducts = products.slice(1);
    const validSourcePolicy = (policy) => productIds.includes(String(policy))
      || policy === "primary"
      || policy === "secondary";
    if (!(stockPolicy === "sum" || validSourcePolicy(stockPolicy))
      || !(validSourcePolicy(sellingPricePolicy) || ["highest", "lowest"].includes(sellingPricePolicy))
      || !(validSourcePolicy(costPricePolicy) || ["weighted-average", "highest", "lowest"].includes(costPricePolicy))) {
      return res.status(400).json({ message: "Choose a stock policy and valid selling-price and cost-price sources." });
    }
    const resolvePolicyId = (policy) => policy === "primary"
      ? String(survivor._id)
      : policy === "secondary"
        ? String(products[1]._id)
        : String(policy);
    const normalizedStockPolicy = stockPolicy === "sum" ? "sum" : resolvePolicyId(stockPolicy);
    const normalizedSellingPolicy = ["highest", "lowest"].includes(sellingPricePolicy)
      ? sellingPricePolicy
      : resolvePolicyId(sellingPricePolicy);
    const normalizedCostPolicy = ["weighted-average", "highest", "lowest"].includes(costPricePolicy)
      ? costPricePolicy
      : resolvePolicyId(costPricePolicy);
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      const currentProducts = await resolveProducts(businessId, productIds, session);
      const currentSurvivor = currentProducts[0];
      const currentRemoved = currentProducts.slice(1);
      const previousSurvivorStock = Number(currentSurvivor.stock || 0);
      const stockValues = currentProducts.map((product) => ({
        _id: product._id,
        stock: Number(product.stock || 0)
      }));
      const nextSurvivorStock = chooseMergeStockFromProducts(stockValues, normalizedStockPolicy, currentSurvivor._id);
      const nextSellingPrice = chooseMergeFieldFromProducts(
        currentProducts,
        normalizedSellingPolicy,
        "price"
      );
      const nextCostPrice = chooseMergeFieldFromProducts(
        currentProducts,
        normalizedCostPolicy,
        "costPrice",
        currentProducts.map((product) => Number(product.stock || 0))
      );
      const branchEntries = await BranchInventory.find({
        business: businessId,
        product: { $in: currentProducts.map((product) => product._id) }
      }).session(session);
      const entriesByBranch = new Map();
      for (const entry of branchEntries) {
        const key = String(entry.branch);
        const branchItems = entriesByBranch.get(key) || new Map();
        branchItems.set(String(entry.product), entry);
        entriesByBranch.set(key, branchItems);
      }

      const updatedSurvivor = await Product.findOne({ _id: currentSurvivor._id, business: businessId }).session(session);
      updatedSurvivor.stock = nextSurvivorStock;
      updatedSurvivor.price = nextSellingPrice;
      updatedSurvivor.costPrice = nextCostPrice;
      await updatedSurvivor.save({ session });

      for (const [branchId, branchItems] of entriesByBranch) {
        const branchValues = currentProducts.map((product) => {
          const entry = branchItems.get(String(product._id));
          return {
            _id: product._id,
            entry,
            stock: Number(entry?.quantity || 0),
            price: Number(entry?.branchPrice ?? product.price ?? 0),
            costPrice: Number(entry?.unitCost || product.costPrice || 0),
            hasPriceOverride: entry?.branchPrice !== null && entry?.branchPrice !== undefined
          };
        });
        const survivorValue = branchValues[0];
        const nextQuantity = chooseMergeStockFromProducts(branchValues, normalizedStockPolicy, currentSurvivor._id);
        const nextBranchPrice = productIds.includes(normalizedSellingPolicy)
          ? branchValues.find((item) => String(item._id) === normalizedSellingPolicy)?.hasPriceOverride
            ? branchValues.find((item) => String(item._id) === normalizedSellingPolicy).price
            : null
          : branchValues.every((item) => !item.hasPriceOverride)
            ? null
            : chooseMergeFieldFromProducts(branchValues, normalizedSellingPolicy, "price");
        const nextUnitCost = chooseMergeFieldFromProducts(
          branchValues,
          normalizedCostPolicy,
          "costPrice",
          branchValues.map((item) => item.stock)
        );
        const survivorEntry = branchItems.get(String(currentSurvivor._id));
        if (survivorEntry) {
          survivorEntry.quantity = nextQuantity;
          survivorEntry.branchPrice = nextBranchPrice;
          survivorEntry.unitCost = nextUnitCost;
          await survivorEntry.save({ session });
        } else if (nextQuantity !== 0 || nextBranchPrice !== null) {
          await BranchInventory.create([{
            business: businessId,
            branch: branchId,
            product: currentSurvivor._id,
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
          productId: currentSurvivor._id,
          previousStock: survivorValue.stock,
          newStock: nextQuantity,
          unitCost: nextUnitCost,
          note: `Product merge stock reconciliation (${normalizedStockPolicy === "sum" ? "sum all" : `use ${normalizedStockPolicy}`}; merged ${currentRemoved.map((product) => product.name).join(", ")})`,
          userId: req.user.id
        });
        const entriesToRemove = currentRemoved
          .map((product) => branchItems.get(String(product._id)))
          .filter(Boolean)
          .map((entry) => entry._id);
        if (entriesToRemove.length) {
          await BranchInventory.deleteMany({ _id: { $in: entriesToRemove } }).session(session);
        }
      }

      const arrayReferenceModels = [
        { model: Sale, path: "items.product" },
        { model: Invoice, path: "items.product" },
        { model: PurchaseOrder, path: "items.product" },
        { model: Expense, path: "inventoryItems.product" }
      ];
      for (const removed of currentRemoved) {
        for (const { model, path } of arrayReferenceModels) {
          await model.updateMany(
            { business: businessId, [path]: removed._id },
            { $set: { [`${path.split(".")[0]}.$[item].product`]: currentSurvivor._id } },
            { arrayFilters: [{ "item.product": removed._id }], session }
          );
        }
        await ShopOrder.updateMany(
          { items: { $elemMatch: { business: businessId, product: removed._id } } },
          { $set: { "items.$[item].product": currentSurvivor._id } },
          { arrayFilters: [{ "item.business": businessId, "item.product": removed._id }], session }
        );
        await BranchTransferRequest.updateMany(
          { business: businessId, product: removed._id },
          { $set: { product: currentSurvivor._id } },
          { session }
        );
        await InventoryMovement.updateMany(
          { business: businessId, product: removed._id },
          [{
            $set: {
              product: currentSurvivor._id,
              note: {
                $concat: [`[Merged from ${removed.name}] `, { $ifNull: ["$note", ""] }]
              }
            }
          }],
          { session }
        );
      }
      await recordMergeMovement({
        session,
        businessId,
        productId: currentSurvivor._id,
        previousStock: previousSurvivorStock,
        newStock: nextSurvivorStock,
        unitCost: nextCostPrice,
        note: `Product merge stock reconciliation (${normalizedStockPolicy === "sum" ? "sum all" : `use ${normalizedStockPolicy}`}; merged ${currentRemoved.map((product) => product.name).join(", ")})`,
        userId: req.user.id
      });
      await CatalogPairDecision.deleteMany({
        business: businessId,
        $or: [
          { firstProduct: { $in: currentProducts.map((product) => product._id) } },
          { secondProduct: { $in: currentProducts.map((product) => product._id) } }
        ]
      }).session(session);
      await Product.deleteMany({
        _id: { $in: currentRemoved.map((product) => product._id) },
        business: businessId
      }).session(session);
      result = {
        primaryProductId: currentSurvivor._id,
        removedProductIds: currentRemoved.map((product) => product._id),
        stockPolicy: normalizedStockPolicy,
        sellingPricePolicy: normalizedSellingPolicy,
        costPricePolicy: normalizedCostPolicy,
        headOfficeStock: nextSurvivorStock
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
    const {
      branchId,
      productIds,
      firstProductId,
      secondProductId,
      keepSeparate = true
    } = req.body;
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
    const selectedIds = Array.isArray(productIds) ? productIds.map(String) : [firstProductId, secondProductId].filter(Boolean).map(String);
    const products = await resolveProducts(req.user.businessId, selectedIds);
    const pairs = [];
    for (let firstIndex = 0; firstIndex < products.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < products.length; secondIndex += 1) {
        const [firstId, secondId] = [String(products[firstIndex]._id), String(products[secondIndex]._id)].sort();
        pairs.push({ firstId, secondId });
      }
    }
    if (!keepSeparate) {
      await CatalogPairDecision.deleteMany({
        business: req.user.businessId,
        $or: pairs.map(({ firstId, secondId }) => ({
          firstProduct: firstId,
          secondProduct: secondId
        }))
      });
      return res.json({ message: "The keep-separate decision was removed." });
    }
    await CatalogPairDecision.bulkWrite(pairs.map(({ firstId, secondId }) => ({
      updateOne: {
        filter: { business: req.user.businessId, firstProduct: firstId, secondProduct: secondId },
        update: {
          $set: { decision: "keep-separate", decidedBy: req.user.id },
          $setOnInsert: { business: req.user.businessId, firstProduct: firstId, secondProduct: secondId }
        },
        upsert: true
      }
    })));
    return res.json({ message: `Saved: all ${products.length} selected products will remain separate from one another.` });
  } catch (err) {
    if (!err.statusCode || err.statusCode >= 500) console.error("PRODUCT SEPARATION DECISION ERROR", err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Could not save the catalog decision." });
  }
};

export default { getMergePreview, mergeProducts, keepProductsSeparate, canManageGlobalCatalog };
