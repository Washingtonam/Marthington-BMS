import Business from "./business.model.js";
import cloudinary from "../../utils/cloudinary.js";

// 🔥 NORMALIZE BUSINESS RESPONSE (SINGLE SOURCE OF TRUTH)
const formatBusiness = (business) => {
  const obj = business?.toObject ? business.toObject() : business || {};
  const industryType = obj.industryType || "retail";
  const businessType = obj.businessType || "general_services";
  const subscription = {
    plan: obj.subscription?.plan || "free",
    status: obj.subscription?.status || "trial",
    billingCycle: obj.subscription?.billingCycle || null,
    startedAt: obj.subscription?.startedAt || null,
    expiresAt: obj.subscription?.expiresAt || null,
    amount: obj.subscription?.amount || 0,
    tier: obj.subscription?.tier || "",
    reference: obj.subscription?.reference || ""
  };

  return {
    ...obj,
    industryType,
    businessType,
    plan: subscription.plan,
    isPro:
      obj.isPro === true ||
      (subscription.plan === "pro" && subscription.status === "active"),
    subscription,
    whatsapp: {
      enabled: obj.whatsapp?.enabled || false,
      number: obj.whatsapp?.number || "",
      webhookSecret: obj.whatsapp?.webhookSecret || "",
      apiMode: obj.whatsapp?.apiMode || "meta",
      lastMessageSentAt: obj.whatsapp?.lastMessageSentAt || null
    },
    paymentSettings: {
      bankName: obj.paymentSettings?.bankName || "",
      accountName: obj.paymentSettings?.accountName || "",
      accountNumber: obj.paymentSettings?.accountNumber || "",
      walletName: obj.paymentSettings?.walletName || "",
      walletNumber: obj.paymentSettings?.walletNumber || "",
      transferInstructions: obj.paymentSettings?.transferInstructions || ""
    }
  };
};

// 🔥 GET BUSINESS (HARDENED)
export const getBusiness = async (req, res) => {
  try {
    if (!req.user?.businessId) {
      const fallbackBusiness = {
        industryType: "retail",
        businessType: "general_services",
        name: "",
        address: "",
        phone: "",
        email: "",
        receiptFooter: "",
        receiptTheme: "",
        logo: "",
        products: [],
        subscription: {
          plan: "free",
          status: "trial",
          billingCycle: null,
          startedAt: null,
          expiresAt: null,
          amount: 0,
          tier: "",
          reference: ""
        },
        isPro: false,
        studentCount: 0,
        activePatientCount: 0
      };

      return res.status(200).json({
        success: true,
        data: fallbackBusiness
      });
    }

    const rawBusiness = await Business.findById(req.user.businessId);

    if (!rawBusiness) {
      return res.status(404).json({
        success: false,
        message: "Business not found"
      });
    }

    const business = {
      ...rawBusiness.toObject(),
      industryType: rawBusiness?.industryType || "retail",
      businessType: rawBusiness?.businessType || "general_services",
      name: rawBusiness?.name || "",
      address: rawBusiness?.address || "",
      phone: rawBusiness?.phone || "",
      email: rawBusiness?.email || "",
      receiptFooter: rawBusiness?.receiptFooter || "",
      receiptTheme: rawBusiness?.receiptTheme || "",
      logo: rawBusiness?.logo || "",
      products: Array.isArray(rawBusiness?.products) ? rawBusiness.products : [],
      subscription: {
        ...(rawBusiness?.subscription || {}),
        plan: rawBusiness?.subscription?.plan || "free",
        status: rawBusiness?.subscription?.status || "trial",
        billingCycle: rawBusiness?.subscription?.billingCycle || null,
        startedAt: rawBusiness?.subscription?.startedAt || null,
        expiresAt: rawBusiness?.subscription?.expiresAt || null,
        amount: rawBusiness?.subscription?.amount || 0,
        tier: rawBusiness?.subscription?.tier || "",
        reference: rawBusiness?.subscription?.reference || ""
      },
      isPro:
        rawBusiness?.isPro === true ||
        (rawBusiness?.subscription?.plan === "pro" &&
          rawBusiness?.subscription?.status === "active"),
      whatsapp: {
        enabled: rawBusiness?.whatsapp?.enabled || false,
        number: rawBusiness?.whatsapp?.number || "",
        webhookSecret: rawBusiness?.whatsapp?.webhookSecret || "",
        apiMode: rawBusiness?.whatsapp?.apiMode || "meta",
        lastMessageSentAt: rawBusiness?.whatsapp?.lastMessageSentAt || null
      },
      paymentSettings: {
        bankName: rawBusiness?.paymentSettings?.bankName || "",
        accountName: rawBusiness?.paymentSettings?.accountName || "",
        accountNumber: rawBusiness?.paymentSettings?.accountNumber || "",
        walletName: rawBusiness?.paymentSettings?.walletName || "",
        walletNumber: rawBusiness?.paymentSettings?.walletNumber || "",
        transferInstructions: rawBusiness?.paymentSettings?.transferInstructions || ""
      },
      studentCount: rawBusiness?.studentCount || 0,
      activePatientCount: rawBusiness?.activePatientCount || 0
    };

    return res.status(200).json({
      success: true,
      data: business
    });
  } catch (err) {
    console.error("❌ GET BUSINESS ERROR:", err);

    const fallbackBusiness = {
      industryType: "retail",
      businessType: "general_services",
      name: "",
      address: "",
      phone: "",
      email: "",
      receiptFooter: "",
      receiptTheme: "",
      logo: "",
      products: [],
      subscription: {
        plan: "free",
        status: "trial",
        billingCycle: null,
        startedAt: null,
        expiresAt: null,
        amount: 0,
        tier: "",
        reference: ""
      },
      isPro: false,
      studentCount: 0,
      activePatientCount: 0
    };

    return res.status(200).json({
      success: true,
      data: fallbackBusiness
    });
  }
};

// 🔥 UPDATE BUSINESS SETTINGS (HARDENED)
export const updateBusiness = async (req, res) => {
  try {
    if (!req.user?.businessId) {
      return res.status(400).json({
        message: "No business linked to user"
      });
    }

    const business = await Business.findById(req.user.businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found"
      });
    }

    const {
      name,
      address,
      phone,
      email,
      website,
      supportEmail,
      supportPhone,
      receiptFooter,
      receiptTheme,
      businessType,
      industryType,
      logo,
      approvalRules,
      whatsappEnabled,
      whatsappNumber,
      whatsappWebhookSecret,
      whatsappApiMode,
      paymentSettings,
      paymentBankName,
      paymentAccountName,
      paymentAccountNumber,
      paymentWalletName,
      paymentWalletNumber,
      paymentTransferInstructions
    } = req.body;

    if (req.file) {
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(base64, {
        folder: "business_logos"
      });

      business.logo = result.secure_url;
    }

    if (logo === "") {
      business.logo = "";
    }

    business.name = name ?? business.name;
    business.address = address ?? business.address;
    business.phone = phone ?? business.phone;
    business.email = email ?? business.email;
    business.website = website ?? business.website;
    business.supportEmail = supportEmail ?? business.supportEmail;
    business.supportPhone = supportPhone ?? business.supportPhone;
    business.receiptFooter = receiptFooter ?? business.receiptFooter;
    business.receiptTheme = receiptTheme ?? business.receiptTheme;
    business.businessType = businessType ?? business.businessType;
    business.industryType = industryType || business.industryType || "retail";

    const nextWhatsAppEnabled = whatsappEnabled !== undefined
      ? String(whatsappEnabled) === "true"
      : Boolean(business.whatsapp?.enabled);

    const nextWhatsAppNumber = whatsappNumber !== undefined ? whatsappNumber : business.whatsapp?.number || "";
    const nextWhatsAppWebhookSecret = whatsappWebhookSecret !== undefined ? whatsappWebhookSecret : business.whatsapp?.webhookSecret || "";
    const nextWhatsAppApiMode = whatsappApiMode !== undefined ? whatsappApiMode : business.whatsapp?.apiMode || "meta";

    business.whatsapp = {
      ...(business.whatsapp || {}),
      enabled: nextWhatsAppEnabled,
      number: nextWhatsAppNumber,
      webhookSecret: nextWhatsAppWebhookSecret,
      apiMode: ["meta", "twilio", "manual"].includes(nextWhatsAppApiMode) ? nextWhatsAppApiMode : "meta"
    };

    const normalizedPaymentSettings = paymentSettings || {
      bankName: paymentBankName ?? business.paymentSettings?.bankName ?? "",
      accountName: paymentAccountName ?? business.paymentSettings?.accountName ?? "",
      accountNumber: paymentAccountNumber ?? business.paymentSettings?.accountNumber ?? "",
      walletName: paymentWalletName ?? business.paymentSettings?.walletName ?? "",
      walletNumber: paymentWalletNumber ?? business.paymentSettings?.walletNumber ?? "",
      transferInstructions: paymentTransferInstructions ?? business.paymentSettings?.transferInstructions ?? ""
    };

    if (paymentSettings || paymentBankName !== undefined || paymentAccountName !== undefined || paymentAccountNumber !== undefined || paymentWalletName !== undefined || paymentWalletNumber !== undefined || paymentTransferInstructions !== undefined) {
      business.paymentSettings = {
        ...(business.paymentSettings || {}),
        bankName: normalizedPaymentSettings.bankName ?? business.paymentSettings?.bankName ?? "",
        accountName: normalizedPaymentSettings.accountName ?? business.paymentSettings?.accountName ?? "",
        accountNumber: normalizedPaymentSettings.accountNumber ?? business.paymentSettings?.accountNumber ?? "",
        walletName: normalizedPaymentSettings.walletName ?? business.paymentSettings?.walletName ?? "",
        walletNumber: normalizedPaymentSettings.walletNumber ?? business.paymentSettings?.walletNumber ?? "",
        transferInstructions: normalizedPaymentSettings.transferInstructions ?? business.paymentSettings?.transferInstructions ?? ""
      };
    }

    if (approvalRules) {
      business.approvalRules = {
        ...business.approvalRules,
        ...approvalRules,
        exemptCategories: Array.isArray(approvalRules.exemptCategories)
          ? approvalRules.exemptCategories
          : business.approvalRules?.exemptCategories || [],
        trustedSuppliers: Array.isArray(approvalRules.trustedSuppliers)
          ? approvalRules.trustedSuppliers
          : business.approvalRules?.trustedSuppliers || []
      };
    }

    await business.save();
    return res.json(formatBusiness(business));
  } catch (err) {
    console.error("❌ UPDATE BUSINESS ERROR:", err);
    return res.status(500).json({
      message: err.message
    });
  }
};