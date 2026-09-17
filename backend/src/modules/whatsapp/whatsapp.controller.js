import { handleInboundWhatsAppMessage, sendWhatsAppText, getBusinessWhatsAppConfig, searchProductForWhatsApp, buildProductAvailabilityMessage } from "./whatsapp.service.js";

const sendProductAvailabilityMessage = async (req, res) => {
  try {
    const { businessId, to, productName } = req.body || {};

    if (!businessId || !to || !productName) {
      return res.status(400).json({
        message: "businessId, to, and productName are required."
      });
    }

    const businessInfo = await getBusinessWhatsAppConfig(businessId);
    const product = await searchProductForWhatsApp({ businessId, productName });
    const reply = buildProductAvailabilityMessage({
      businessName: businessInfo.businessName,
      productName,
      product
    });

    await sendWhatsAppText({
      to,
      message: reply
    });

    return res.status(200).json({
      ok: true,
      business: businessInfo,
      productFound: Boolean(product),
      reply
    });
  } catch (error) {
    console.error("[whatsapp.sendProductAvailabilityMessage]", error);
    return res.status(500).json({
      message: error.message || "Failed to send WhatsApp message."
    });
  }
};

const handleIncomingWebhook = async (req, res) => {
  try {
    const body = req.body || {};
    const entries = body?.entry || [];
    const firstChange = entries[0]?.changes?.[0]?.value;
    const message = firstChange?.messages?.[0];

    if (!message) {
      return res.status(200).json({ status: "ok", received: false });
    }

    const from = message.from;
    const incomingText = message.text?.body || "";

    const { reply } = await handleInboundWhatsAppMessage({
      from,
      text: incomingText,
      businessId: req.body?.businessId || null
    });

    await sendWhatsAppText({
      to: from,
      message: reply
    });

    return res.status(200).json({
      status: "ok",
      received: true,
      reply
    });
  } catch (error) {
    console.error("[whatsapp.handleIncomingWebhook]", error);
    return res.status(200).json({
      status: "ok",
      received: false,
      error: error.message || "No reply sent"
    });
  }
};

const healthCheck = async (_req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "whatsapp",
    configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
  });
};

export default {
  sendProductAvailabilityMessage,
  handleIncomingWebhook,
  healthCheck
};
