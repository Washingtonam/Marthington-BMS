import { getEmailTransporter, getConfiguredFrom, setLastEmailError } from "../config/email.js";
import { getResendConfig, hasResendApi } from "../config/email.js";
import EmailHistory from "../models/emailHistory.model.js";
import jwt from "jsonwebtoken";
import axios from "axios";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const sendEmailMessage = async ({ to, subject, html }) => {
  if (hasResendApi()) {
    const { apiKey, from } = getResendConfig();
    if (!from) throw new Error("RESEND_FROM is not configured");
    const response = await axios.post(
      "https://api.resend.com/emails",
      { from: getConfiguredFrom(), to: [to], subject, html },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 5000 }
    );
    if (!response.data?.id) throw new Error("Resend returned no email id");
    return response.data;
  }

  const transporter = getEmailTransporter();
  if (!transporter) throw new Error("Email transporter is not configured");
  return transporter.sendMail({
    from: getConfiguredFrom(),
    to,
    subject,
    html
  });
};

/**
 * Email Service
 * Handles sending all invoice-related emails with history tracking
 */

/**
 * Log email to EmailHistory collection
 */
export const logEmailHistory = async ({
  business,
  invoice,
  recipientEmail,
  recipientName,
  subject,
  emailType,
  status = "sent",
  errorMessage = null,
  sharedMessage = null,
  metadata = {},
  createdBy = null
}) => {
  try {
    await EmailHistory.create({
      business,
      invoice,
      recipientEmail,
      recipientName,
      subject,
      emailType,
      status,
      errorMessage,
      sharedMessage,
      metadata,
      sentAt: status === "sent" ? new Date() : null,
      createdBy
    });
  } catch (error) {
    console.error("Failed to log email history:", error.message);
  }
};

export const sendReportEmail = async ({
  recipientEmail,
  recipientName,
  businessName,
  businessProfile = {},
  reportType,
  frequency = "daily",
  periodLabel = "",
  reportSections = ["summary", "sales", "expenses", "inventory", "staff", "paymentMethods"],
  snapshot,
  unsubscribeUrl
}) => {
  const profile = businessProfile || {};
  const displayName = profile.name || businessName || "Your business";
  const logoUrl = profile.logo || process.env.EMAIL_LOGO_URL || "https://marthington.vercel.app/logo-icon.png";
  const websiteUrl = String(profile.website || "").trim();
  const contactEmail = profile.supportEmail || profile.email || "";
  const contactPhone = profile.supportPhone || profile.phone || "";
  const contactDetails = [profile.address, contactPhone, contactEmail, websiteUrl]
    .filter(Boolean)
    .map(escapeHtml);
  const overview = snapshot?.overview || snapshot?.summary || {};
  const includes = (section) => reportSections.includes(section);
  const frequencyLabel = frequency === "monthly" ? "Monthly" : frequency === "weekly" ? "Weekly" : "Daily";
  const contentLabel = reportType === "daily-analysis" ? "Analysis" : "Business Overview";
  const subject = `${displayName} ${frequencyLabel} ${contentLabel} Report`;
  const amount = (value) => Number(value || 0).toLocaleString();
  const salesSummaryAmount = reportType === "daily-analysis"
    ? amount(overview.revenue ?? overview.periodRevenue)
    : amount(overview.periodRevenue ?? overview.revenue);
  const profitAmount = reportType === "daily-analysis"
    ? amount(overview.netProfit ?? overview.periodProfit)
    : amount(overview.periodProfit ?? overview.netProfit);
  const expenseAmount = reportType === "daily-analysis"
    ? amount(overview.expenses ?? overview.periodOperatingExpenses)
    : amount(overview.periodOperatingExpenses ?? overview.expenses);
  const salesCount = reportType === "daily-analysis"
    ? overview.salesCount || 0
    : snapshot?.sales?.length || snapshot?.recentSales?.length || 0;
  const usageLabel = frequency === "monthly" ? "this month" : frequency === "weekly" ? "this week" : "today";
  const summaryTitle = frequency === "monthly" ? "Sales for this month" : frequency === "weekly" ? "Sales for this week" : "Sales for today";
  const summaryText = frequency === "monthly"
    ? `This is your monthly sales summary for ${escapeHtml(displayName)}.`
    : frequency === "weekly"
      ? `This is your weekly sales summary for ${escapeHtml(displayName)}.`
      : `This is your daily sales summary for ${escapeHtml(displayName)}.`;
  const detailCards = [
    ["Revenue", `₦${salesSummaryAmount}`],
    ["Expenses", `₦${expenseAmount}`],
    ["Profit", `₦${profitAmount}`],
    [summaryTitle, `${salesCount} sales`]
  ];
  const unpaidInvoiceRows = (snapshot.unpaidInvoices || []).map((invoice) => `
    <div style="display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; border-bottom: 1px solid #f1f5f9;">
      <div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">${escapeHtml(invoice.invoiceNumber || "INV")}</div>
        <div style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(invoice.customerName || "Customer")}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; color: #64748b;">${escapeHtml(invoice.paymentStatus || "Unpaid")}</div>
        <div style="font-size: 15px; font-weight: 700; color: #0f172a;">₦${escapeHtml(amount(invoice.balanceDue || 0))}</div>
      </div>
    </div>
  `).join("") || '<p style="padding: 14px; margin: 0; color: #64748b; font-size: 13px;">No unpaid invoices at the moment.</p>';

  const detailSections = reportType === "daily-analysis"
    ? `${includes("paymentMethods") ? `<div style="margin-top: 26px;"><h3 style="margin: 0 0 12px; font-size: 16px; color: #0f172a;">Payment methods</h3><div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">${(snapshot.paymentMethods || []).slice(0, 4).map((item) => `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;"><div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">${escapeHtml(item.method || "Method")}</div><div style="font-size: 12px; color: #475569; margin-bottom: 4px;">${item.count || 0} sales</div><div style="font-size: 18px; font-weight: 700; color: #0f172a;">₦${escapeHtml(amount(item.amount))}</div></div>`).join("")}</div></div>` : ""}
      ${includes("expenses") && Object.keys(snapshot.expensesByCategory || {}).length ? `<div style="margin-top: 26px;"><h3 style="margin: 0 0 12px; font-size: 16px; color: #0f172a;">Expense snapshot</h3><div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 0;">${Object.entries(snapshot.expensesByCategory || {}).slice(0, 4).map(([category, value]) => `<div style="display: flex; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px;"><span style="color: #475569;">${escapeHtml(category)}</span><strong style="color: #0f172a;">₦${escapeHtml(amount(value))}</strong></div>`).join("")}</div></div>` : ""}`
    : `${includes("sales") ? `<div style="margin-top: 26px;"><h3 style="margin: 0 0 12px; font-size: 16px; color: #0f172a;">Sales summary</h3><div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">${(snapshot.recentSales || []).slice(0, 4).map((sale) => `<div style="display: flex; justify-content: space-between; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #f1f5f9;"><div><div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">${new Date(sale.createdAt).toLocaleDateString()}</div><div style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(sale.customerName || "Walk-in customer")}</div></div><div style="text-align: right;"><div style="font-size: 12px; color: #64748b;">${escapeHtml(sale.paymentMethod || "Cash")}</div><div style="font-size: 15px; font-weight: 700; color: #0f172a;">₦${escapeHtml(amount(sale.totalAmount))}</div></div></div>`).join("") || '<p style="padding: 14px; margin: 0; color: #64748b; font-size: 13px;">No recent sales recorded for this period.</p>'}</div></div>` : ""}
      ${includes("expenses") && (snapshot.transactions || []).length ? `<div style="margin-top: 26px;"><h3 style="margin: 0 0 12px; font-size: 16px; color: #0f172a;">Expense summary</h3><div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">${(snapshot.transactions || []).slice(0, 4).map((transaction) => `<div style="display: flex; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #f1f5f9;"><div><div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">${new Date(transaction.occurredAt || transaction.createdAt).toLocaleDateString()}</div><div style="font-size: 13px; color: #0f172a; font-weight: 600;">${escapeHtml(transaction.category || "General")}</div></div><strong style="color: #0f172a; font-size: 14px;">₦${escapeHtml(amount(transaction.amount))}</strong></div>`).join("")}</div></div>` : ""}
      ${includes("summary") ? `<div style="margin-top: 26px;"><h3 style="margin: 0 0 12px; font-size: 16px; color: #0f172a;">Unpaid invoices</h3><div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">${unpaidInvoiceRows}</div></div>` : ""}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #f8fafc; padding: 0; color: #0f172a;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #0f766e 100%); padding: 24px 28px 18px; border-radius: 18px 18px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(displayName)}" width="190" height="52" style="display:block; width: 190px; max-width: 190px; height: 52px; max-height: 52px; object-fit: contain; border-radius: 8px; background: rgba(255,255,255,0.08);" />` : `<div style="font-size: 22px; color: #ffffff; font-weight: 700;">${escapeHtml(displayName)}</div>`}
            </td>
          </tr>
        </table>
        <div style="margin-top: 18px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.72); font-weight: 700;">Performance update</div>
        <div style="font-size: 22px; color: #ffffff; font-weight: 700; margin-top: 8px;">${escapeHtml(summaryTitle)}</div>
      </div>
      <div style="padding: 26px 28px 18px; background: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <p style="margin: 0 0 18px; font-size: 14px; color: #475569;">Hello ${escapeHtml(recipientName || "there")},</p>
        <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.7; color: #334155;">${summaryText}</p>
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px;">
          ${detailCards.map(([label, value]) => `
            <div style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);">
              <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">${escapeHtml(label)}</div>
              <div style="font-size: 22px; line-height: 1.2; font-weight: 700; color: #0f172a;">${escapeHtml(value)}</div>
            </div>
          `).join("")}
        </div>
        <div style="background: linear-gradient(135deg, #ecfeff 0%, #f0fdf4 100%); border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 18px; margin-bottom: 18px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);">
          <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #0f766e; font-weight: 700; margin-bottom: 8px;">Summary</div>
          <div style="font-size: 15px; line-height: 1.7; color: #0f172a;">
            ${escapeHtml(displayName)} recorded <strong>${escapeHtml(summaryTitle)}</strong> of <strong>₦${escapeHtml(salesSummaryAmount)}</strong>, with a total profit of <strong>₦${escapeHtml(profitAmount)}</strong> and operating expenses of <strong>₦${escapeHtml(expenseAmount)}</strong>.
          </div>
        </div>
        ${detailSections}
        <div style="margin-top: 30px; text-align: center;">
          <a href="${escapeHtml((process.env.FRONTEND_URL || "https://marthington.vercel.app") + "/app/reports")}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 10px; font-size: 15px; font-weight: 700; box-shadow: 0 10px 26px rgba(15, 118, 110, 0.22);">View more details</a>
        </div>
      </div>
      <div style="padding: 20px 28px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 18px 18px;">
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${escapeHtml(displayName)}</div>
        ${contactDetails.length ? `<p style="margin: 0 0 10px; color: #64748b; font-size: 12px; line-height: 1.7;">${contactDetails.join(" &bull; ")}</p>` : ""}
        <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; line-height: 1.6;">This report contains confidential business information intended for the recipient only.</p>
        <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">You can <a href="${escapeHtml(unsubscribeUrl)}" style="color: #0f766e; text-decoration: none;">unsubscribe from scheduled reports</a> at any time.</p>
      </div>
    </div>
  `;

  try {
    await sendEmailMessage({ to: recipientEmail, subject, html: htmlContent });
    return true;
  } catch (error) {
    setLastEmailError(error);
    console.error(`Failed to send report email: ${error.message}`);
    return false;
  }
};

export const sendCampaignEmail = async ({
  recipientEmail,
  recipientName,
  subject,
  previewText,
  bodyHtml,
  footerText,
  footerAddress,
  userId
}) => {
  const token = jwt.sign(
    { userId: userId.toString(), purpose: "campaign-unsubscribe" },
    process.env.JWT_SECRET,
    { expiresIn: "10y" }
  );
  const apiUrl = String(process.env.PUBLIC_API_URL || process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  const unsubscribeUrl = `${apiUrl}/api/report-subscriptions/unsubscribe-campaign?token=${encodeURIComponent(token)}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
      <div style="border-bottom: 1px solid #e2e8f0; padding: 20px 0;">
        <strong style="color: #059669;">Marthington BMS</strong>
      </div>
      <p style="color: #64748b; font-size: 13px;">${escapeHtml(previewText)}</p>
      <p>Hello ${escapeHtml(recipientName || "there")},</p>
      <div style="font-size: 15px; line-height: 1.7;">${bodyHtml}</div>
      <footer style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 18px; color: #64748b; font-size: 12px;">
        <p>${escapeHtml(footerText)}</p>
        <p>${escapeHtml(footerAddress)}</p>
        <p><a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe from promotional emails</a></p>
      </footer>
    </div>
  `;

  try {
    await sendEmailMessage({ to: recipientEmail, subject, html: htmlContent });
    return true;
  } catch (error) {
    setLastEmailError(error);
    console.error(`Failed to send campaign email: ${error.message}`);
    return false;
  }
};

/**
 * Send Invoice Created notification
 */
export const sendInvoiceCreatedEmail = async ({
  recipientEmail,
  recipientName,
  businessName,
  businessId,
  invoiceId,
  invoiceNumber,
  customerName,
  amount,
  dueDate,
  invoiceUrl,
  createdBy = null
}) => {
  const transporter = getEmailTransporter();
  if (!transporter) return false;

  const subject = `Invoice ${invoiceNumber} from ${businessName}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Invoice Created</h2>
      <p>Hello ${recipientName},</p>
      <p><strong>${businessName}</strong> has created an invoice for you:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Amount:</strong> ${amount}</p>
        <p><strong>Due Date:</strong> ${dueDate}</p>
      </div>
      
      <p>
        <a href="${invoiceUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Invoice
        </a>
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This is an automated email. Please do not reply to this message.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject,
      html: htmlContent,
    });

    console.log(`✅ Invoice created email sent to ${recipientEmail}`);
    
    // Log to email history
    await logEmailHistory({
      business: businessId,
      invoice: invoiceId,
      recipientEmail,
      recipientName,
      subject,
      emailType: "invoice_created",
      status: "sent",
      createdBy
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to send invoice created email: ${error.message}`);
    
    // Log failure to email history
    await logEmailHistory({
      business: businessId,
      invoice: invoiceId,
      recipientEmail,
      recipientName,
      subject,
      emailType: "invoice_created",
      status: "failed",
      errorMessage: error.message,
      createdBy
    });

    return false;
  }
};

/**
 * Send Payment Received notification
 */
export const sendPaymentReceivedEmail = async ({
  recipientEmail,
  recipientName,
  businessName,
  businessId,
  invoiceId,
  invoiceNumber,
  paymentAmount,
  paymentDate,
  remainingBalance,
  invoiceUrl,
  createdBy = null
}) => {
  const transporter = getEmailTransporter();
  if (!transporter) return false;

  const subject = `Payment Received for Invoice ${invoiceNumber}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Received</h2>
      <p>Hello ${recipientName},</p>
      <p>We have received your payment for <strong>Invoice ${invoiceNumber}</strong>:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Amount Received:</strong> ${paymentAmount}</p>
        <p><strong>Payment Date:</strong> ${paymentDate}</p>
        <p><strong>Remaining Balance:</strong> ${remainingBalance}</p>
      </div>
      
      <p>
        <a href="${invoiceUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Invoice
        </a>
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Thank you for your business!
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject,
      html: htmlContent,
    });

    console.log(`✅ Payment received email sent to ${recipientEmail}`);
    
    // Log to email history
    await logEmailHistory({
      business: businessId,
      invoice: invoiceId,
      recipientEmail,
      recipientName,
      subject,
      emailType: "payment_received",
      status: "sent",
      createdBy
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to send payment received email: ${error.message}`);
    
    // Log failure to email history
    await logEmailHistory({
      business: businessId,
      invoice: invoiceId,
      recipientEmail,
      recipientName,
      subject,
      emailType: "payment_received",
      status: "failed",
      errorMessage: error.message,
      createdBy
    });

    return false;
  }
};

/**
 * Send Invoice Overdue notification
 */
export const sendInvoiceOverdueEmail = async ({
  recipientEmail,
  recipientName,
  businessName,
  businessId,
  invoiceId,
  invoiceNumber,
  daysOverdue,
  amountDue,
  invoiceUrl,
  createdBy = null
}) => {
  const transporter = getEmailTransporter();
  if (!transporter) return false;

  const subject = `URGENT: Invoice ${invoiceNumber} is ${daysOverdue} days overdue`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">Invoice Overdue</h2>
      <p>Hello ${recipientName},</p>
      <p style="color: #d32f2f;">
        <strong>Invoice ${invoiceNumber} from ${businessName} is now ${daysOverdue} days overdue.</strong>
      </p>
      
      <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d32f2f;">
        <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
        <p><strong>Amount Due:</strong> ${amountDue}</p>
        <p><strong>Days Overdue:</strong> ${daysOverdue}</p>
      </div>
      
      <p>Please settle this invoice at your earliest convenience to avoid any further action.</p>
      
      <p>
        <a href="${invoiceUrl}" style="background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Pay Now
        </a>
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        If you have already made this payment, please disregard this email.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject,
      html: htmlContent,
    });

    console.log(`✅ Overdue invoice email sent to ${recipientEmail}`);
    
    // Log to email history
    await logEmailHistory({
      business: businessId,
      invoice: invoiceId,
      recipientEmail,
      recipientName,
      subject,
      emailType: "invoice_overdue",
      status: "sent",
      metadata: { daysOverdue, amountDue },
      createdBy
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to send overdue email: ${error.message}`);
    
    // Log failure to email history
    await logEmailHistory({
      business: businessId,
      invoice: invoiceId,
      recipientEmail,
      recipientName,
      subject,
      emailType: "invoice_overdue",
      status: "failed",
      errorMessage: error.message,
      createdBy
    });

    return false;
  }
};

/**
 * Send Invoice Shared notification
 */
export const sendInvoiceSharedEmail = async ({
  recipientEmail,
  recipientName,
  senderName,
  businessName,
  businessId,
  invoiceId,
  invoiceNumber,
  message,
  invoiceUrl,
  createdBy = null
}) => {
  const transporter = getEmailTransporter();
  if (!transporter) return false;

  const subject = `${senderName} shared Invoice ${invoiceNumber} with you`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Invoice Shared</h2>
      <p>Hello ${recipientName},</p>
      <p><strong>${senderName}</strong> from <strong>${businessName}</strong> has shared an invoice with you:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
      </div>
      
      <p>
        <a href="${invoiceUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Invoice
        </a>
      </p>
      
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This is an automated email. Please do not reply to this message.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject,
      html: htmlContent,
    });

    console.log(`✅ Invoice shared email sent to ${recipientEmail}`);
    
    // Log to email history
    await logEmailHistory({
      business: businessId,
      invoice: invoiceId,
      recipientEmail,
      recipientName,
      subject,
      emailType: "invoice_shared",
      status: "sent",
      sharedMessage: message,
      createdBy
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to send invoice shared email: ${error.message}`);
    
    // Log failure to email history
    await logEmailHistory({
      business: businessId,
      invoice: invoiceId,
      recipientEmail,
      recipientName,
      subject,
      emailType: "invoice_shared",
      status: "failed",
      errorMessage: error.message,
      sharedMessage: message,
      createdBy
    });

    return false;
  }
};

/**
 * Send Budget Exceeded Alert
 */
export const sendBudgetExceededEmail = async ({
  recipientEmail,
  recipientName,
  businessName,
  businessId,
  month,
  year,
  categories,
  totalVariance,
  expensesUrl,
  createdBy = null
}) => {
  const transporter = getEmailTransporter();
  if (!transporter) return false;

  const subject = `Budget Alert: Expenses exceeding budget for ${month}/${year}`;
  
  // Format categories into HTML rows
  const categoryRows = categories.map(cat => `
    <tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 10px; text-align: left;">${cat.label}</td>
      <td style="padding: 10px; text-align: right;">₦${cat.budget.toLocaleString()}</td>
      <td style="padding: 10px; text-align: right;">₦${cat.actual.toLocaleString()}</td>
      <td style="padding: 10px; text-align: right; color: #d32f2f; font-weight: bold;">+₦${cat.variance.toLocaleString()} (${cat.variancePercent.toFixed(1)}%)</td>
    </tr>
  `).join('');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #856404;">⚠️ Budget Alert - ${month}/${year}</h2>
        <p style="margin: 5px 0; color: #856404;">Hello ${recipientName},</p>
      </div>

      <p style="color: #333; margin: 15px 0;">
        <strong>${businessName}</strong> has exceeded its budget for <strong>${month}/${year}</strong>.
      </p>

      <p style="color: #d32f2f; font-weight: bold; margin: 15px 0;">
        Total Overspend: ₦${Math.abs(totalVariance).toLocaleString()}
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9f9f9;">
        <thead>
          <tr style="background-color: #f0f0f0; border-bottom: 2px solid #d0d0d0;">
            <th style="padding: 12px; text-align: left; font-weight: bold;">Category</th>
            <th style="padding: 12px; text-align: right; font-weight: bold;">Budget</th>
            <th style="padding: 12px; text-align: right; font-weight: bold;">Actual</th>
            <th style="padding: 12px; text-align: right; font-weight: bold;">Variance</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
        </tbody>
      </table>

      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0; font-size: 13px; color: #666;">
          <strong>Recommended Actions:</strong>
        </p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #666; font-size: 13px;">
          <li>Review expense approvals for the month</li>
          <li>Identify cost-saving opportunities</li>
          <li>Adjust budget for upcoming months if needed</li>
          <li>Prioritize essential expenses only</li>
        </ul>
      </div>

      <p>
        <a href="${expensesUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          Review Expenses Dashboard
        </a>
      </p>

      <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
        This is an automated budget alert. You are receiving this because you have finance/admin permissions for ${businessName}. 
        To modify alert preferences, contact your business administrator.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipientEmail,
      subject,
      html: htmlContent,
    });

    console.log(`✅ Budget exceeded alert sent to ${recipientEmail}`);
    
    // Log to email history
    await logEmailHistory({
      business: businessId,
      recipientEmail,
      recipientName,
      subject,
      emailType: "budget_exceeded",
      status: "sent",
      metadata: { 
        month, 
        year, 
        categoriesCount: categories.length,
        totalVariance,
        overBudgetCategories: categories.map(c => c.label)
      },
      createdBy
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to send budget alert email: ${error.message}`);
    
    // Log failure to email history
    await logEmailHistory({
      business: businessId,
      recipientEmail,
      recipientName,
      subject,
      emailType: "budget_exceeded",
      status: "failed",
      errorMessage: error.message,
      metadata: { month, year, categoriesCount: categories.length },
      createdBy
    });

    return false;
  }
};

export default {
  sendInvoiceCreatedEmail,
  sendPaymentReceivedEmail,
  sendInvoiceOverdueEmail,
  sendInvoiceSharedEmail,
  sendBudgetExceededEmail,
  sendReportEmail,
  sendCampaignEmail,
  logEmailHistory
};
