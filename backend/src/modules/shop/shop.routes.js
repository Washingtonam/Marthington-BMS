import express from "express";
import multer from "multer";
import protect from "../../middlewares/auth.middleware.js";
import authorize from "../../middlewares/role.middleware.js";
import protectShopCustomer from "./shopCustomer.middleware.js";
import {
  addShopCustomerAddress,
  createShopOrder,
  deleteShopCustomerAddress,
  getCustomerOrders,
  getShopAdminOrders,
  getShopAdminProducts,
  getShopCustomer,
  getShopListings,
  getShopProduct,
  initializeDeliveryFeePayment,
  loginShopCustomer,
  registerShopCustomer,
  updateShopAdminOrder,
  updateShopAdminProduct,
  updateShopCustomerAddress,
  verifyDeliveryFeePayment,
  verifyShopPayment
} from "./shop.controller.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image uploads are allowed."));
      return;
    }
    callback(null, true);
  }
});

router.get("/", getShopListings);
router.get("/products/:id", getShopProduct);

router.post("/customers/register", registerShopCustomer);
router.post("/customers/login", loginShopCustomer);
router.get("/customers/me", protectShopCustomer, getShopCustomer);
router.post("/customers/addresses", protectShopCustomer, addShopCustomerAddress);
router.patch("/customers/addresses/:addressId", protectShopCustomer, updateShopCustomerAddress);
router.delete("/customers/addresses/:addressId", protectShopCustomer, deleteShopCustomerAddress);

router.post("/orders", protectShopCustomer, createShopOrder);
router.post("/orders/verify-payment", protectShopCustomer, verifyShopPayment);
router.get("/orders", protectShopCustomer, getCustomerOrders);
router.post("/orders/verify-delivery-payment", protectShopCustomer, verifyDeliveryFeePayment);
router.post("/orders/:id/delivery-fee/initialize", protectShopCustomer, initializeDeliveryFeePayment);

router.get("/admin/products", protect, authorize("super_admin"), getShopAdminProducts);
router.patch("/admin/products/:id", protect, authorize("super_admin"), upload.single("image"), updateShopAdminProduct);
router.get("/admin/orders", protect, authorize("super_admin"), getShopAdminOrders);
router.patch("/admin/orders/:id", protect, authorize("super_admin"), updateShopAdminOrder);

export default router;
