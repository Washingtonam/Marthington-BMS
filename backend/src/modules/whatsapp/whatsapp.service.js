import axios from "axios";
import Product from "../products/product.model.js";
import Business from "../businesses/business.model.js";
import Customer from "../customers/customer.model.js";
import Sale from "../sales/sale.model.js";
import { initializePayment } from "../payments/paystack.service.js";

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

export const parseWhatsAppOrderIntent = (text = "") => {
  const cleaned = String(text || "").trim();
  if (!cleaned) return null;

  const lower = cleaned.toLowerCase();
  const quantityMatch = cleaned.match(/^(?:i want|i need|please give me|give me|buy|order|purchase)\s+(\d+)\s+(.+)$/i)
    || cleaned.match(/^(\d+)\s+(.+)$/);

  if (quantityMatch) {
    const quantity = Number(quantityMatch[1]);
    const productName = String(quantityMatch[2]).trim();
    if (!productName || !Number.isFinite(quantity) || quantity <= 0) return null;
    return { productName: productName.toLowerCase(), quantity };
  }

  if (!/\b(?:i want|i need|buy|order|purchase|please|hello|hi)\b/i.test(lower) && !/[a-z]/i.test(cleaned)) {
    return null;
  }

  const productName = cleaned.replace(/^(?:i want|i need|please give me|give me|buy|order|purchase|hello|hi|hey|please)\s+/i, "").trim();
  if (!productName) return null;

  if (/^(hello|hi|hey|there|thanks|thank you|good morning|good afternoon|good evening|greetings)$/i.test(productName)) {
    return null;
  }

  return { productName: productName.toLowerCase(), quantity: 1 };
};

export const normalizeWhatsAppNumber = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;

  return digits;
};

export const searchProductForWhatsApp = async ({ businessId, productName }) => {
  if (!businessId || !productName) return null;

  const normalizedQuery = String(productName).trim();
  if (!normalizedQuery) return null;

  const product = await Product.findOne({
    business: businessId,
    name: { $regex: normalizedQuery, $options: "i" }
  }).lean();

  return product;
};

export const buildProductAvailabilityMessage = ({ businessName = "Business", productName = "product", product = null }) => {
  if (!product) {
    return `Hi! ${businessName} could not find \"${productName}\" in stock right now. Please ask for another item or contact the store directly.`;
  }

  return [
    `Hi! ${businessName} has ${product.name} available.`,
    `Price: ${formatCurrency(product.price || 0)}`,
    `Stock: ${Number(product.stock || 0)}`,
    "",
    "Reply with your preferred quantity and we will help you continue."
  ].join("\n");
};

export const sendWhatsAppText = async ({ to, message }) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp API credentials are not configured.");
  }

  const normalizedTo = normalizeWhatsAppNumber(to);
  if (!normalizedTo) {
    throw new Error("Recipient WhatsApp number is required.");
  }

  const response = await axios.post(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to: normalizedTo,
      type: "text",
      text: {
        body: message
      }
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );

  return {
    ok: true,
    data: response.data,
    to: normalizedTo
  };
};

export const getBusinessWhatsAppConfig = async (businessId) => {
  const business = await Business.findById(businessId).lean();
  return {
    businessId: business?._id || null,
    businessName: business?.name || "Business",
    phone: business?.phone || ""
  };
};

export const getWhatsAppPaymentInstructions = async ({ businessId, sale }) => {
  if (!businessId || !sale) {
    return {
      paymentText: "Please pay for your order using the business payment details shared by the store.",
      fallback: true
    };
  }

  const business = await Business.findById(businessId).lean();
  const paymentSettings = business?.paymentSettings || {};
  const bankLine = paymentSettings.bankName && paymentSettings.accountName && paymentSettings.accountNumber
    ? [
        `Bank: ${paymentSettings.bankName}`,
        `Account Name: ${paymentSettings.accountName}`,
        `Account Number: ${paymentSettings.accountNumber}`
      ].join("\n")
    : "";

  const walletLine = paymentSettings.walletName && paymentSettings.walletNumber
    ? [`Wallet: ${paymentSettings.walletName}`, `Wallet Number: ${paymentSettings.walletNumber}`].join("\n")
    : "";

  const instructions = paymentSettings.transferInstructions ? `Transfer Note: ${paymentSettings.transferInstructions}` : "";
  const reference = sale.receiptId || "WA-ORDER";

  return {
    paymentText: [
      `Please pay for your order using the payment details below.`,
      `Reference: ${reference}`,
      bankLine,
      walletLine,
      instructions,
      "After making payment, send the transfer proof or reference to the business admin for confirmation."
    ].filter(Boolean).join("\n"),
    fallback: !(bankLine || walletLine)
  };
};

export const handleInboundWhatsAppMessage = async ({ from, text, businessId }) => {
  const cleanedText = String(text || "").trim();
  const business = businessId ? await Business.findById(businessId).lean() : null;

  if (!cleanedText) {
    return {
      reply: `Hi! ${business?.name || "Business"} received your message. Please tell us the product you want to check.`
    };
  }

  const orderIntent = parseWhatsAppOrderIntent(cleanedText);
  if (orderIntent && businessId) {
    const product = await Product.findOne({
      business: businessId,
      name: { $regex: orderIntent.productName, $options: "i" }
    }).lean();

    if (!product) {
      return {
        reply: `Hi! ${business?.name || "Business"} could not find "${orderIntent.productName}". Please tell us another item or ask for a different product name.`
      };
    }

    const customerPhone = normalizeWhatsAppNumber(from);
    const customer = customerPhone
      ? await Customer.findOne({ business: businessId, phoneNormalized: customerPhone }).lean()
      : null;

    if (!product.stock || Number(product.stock) < orderIntent.quantity) {
      return {
        reply: `Hi! ${business?.name || "Business"} has ${product.name} but only ${Number(product.stock || 0)} left in stock. Please reduce your quantity or ask for another product.`
      };
    }

    const sale = await Sale.create({
      business: businessId,
      customerName: customer?.name || "WhatsApp Customer",
      customerPhone: customerPhone || "",
      customer: customer?._id || null,
      items: [{
        itemType: "product",
        product: product._id,
        name: product.name,
        quantity: orderIntent.quantity,
        costPrice: Number(product.costPrice || 0),
        sellingPrice: Number(product.price || 0),
        total: Number(product.price || 0) * Number(orderIntent.quantity)
      }],
      totalAmount: Number(product.price || 0) * Number(orderIntent.quantity),
      paymentMethod: "cash",
      paymentReference: "whatsapp-order",
      notes: `Order placed via WhatsApp from ${from}`,
      receiptId: `WA-${Date.now()}`,
      status: "pending"
    });

    const paymentInfo = await getWhatsAppPaymentInstructions({
      businessId,
      sale
    });

    return {
      reply: [
        `Hi! ${business?.name || "Business"} has received your order for ${orderIntent.quantity} ${product.name}.`,
        `Total: ${formatCurrency(sale.totalAmount || 0)}`,
        `Order reference: ${sale.receiptId}`,
        paymentInfo.paymentText,
        "Once payment proof is confirmed by the admin, a receipt will be sent to you."
      ].join("\n")
    };
  }

  const product = businessId
    ? await searchProductForWhatsApp({ businessId, productName: cleanedText })
    : null;

  return {
    reply: buildProductAvailabilityMessage({
      businessName: business?.name || "Business",
      productName: cleanedText,
      product
    })
  };
};
