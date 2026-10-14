import { sendWhatsAppTemplate } from "../modules/whatsapp/whatsapp.service.js";

const formatAmount = (value) => `NGN ${Number(value || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export const buildReportWhatsAppParameters = ({ subscription, businessName, periodLabel, snapshot }) => {
  const overview = snapshot?.overview || snapshot?.summary || {};
  return [
    subscription.recipientName || "there",
    subscription.frequency,
    businessName || "your business",
    periodLabel,
    formatAmount(overview.revenue ?? overview.periodRevenue),
    formatAmount(overview.expenses ?? overview.periodOperatingExpenses),
    formatAmount(overview.netProfit ?? overview.periodProfit)
  ];
};

export const sendBusinessReportWhatsApp = async ({ subscription, businessName, periodLabel, snapshot }) => (
  sendWhatsAppTemplate({
    to: subscription.recipientPhone,
    templateName: process.env.WHATSAPP_REPORT_TEMPLATE_NAME || "business_report",
    languageCode: process.env.WHATSAPP_REPORT_TEMPLATE_LANGUAGE || "en",
    bodyParameters: buildReportWhatsAppParameters({ subscription, businessName, periodLabel, snapshot })
  })
);
