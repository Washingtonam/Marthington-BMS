import Product from "../products/product.model.js";
import ShopOrder from "./shopOrder.model.js";

export const expireUnpaidShopOrders = async () => {
  const expired = await ShopOrder.find({
    status: "awaiting_payment",
    stockReserved: true,
    paymentExpiresAt: { $lte: new Date() }
  }).select("_id items");

  for (const candidate of expired) {
    const claimed = await ShopOrder.findOneAndUpdate(
      { _id: candidate._id, status: "awaiting_payment", stockReserved: true },
      { $set: { status: "expired", paymentStatus: "failed", stockReserved: false } },
      { new: true }
    );
    if (!claimed) continue;
    for (const item of claimed.items) {
      await Product.updateOne(
        { _id: item.product, business: item.business },
        { $inc: { stock: item.quantity } }
      );
    }
  }
};
