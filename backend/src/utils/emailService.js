import { getEmailTransporter, setLastEmailError } from "../config/email.js";
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
      { from, to: [to], subject, html },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 5000 }
    );
    if (!response.data?.id) throw new Error("Resend returned no email id");
    return response.data;
  }

  const transporter = getEmailTransporter();
  if (!transporter) throw new Error("Email transporter is not configured");
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
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
  reportType,
  snapshot,
  unsubscribeUrl
}) => {
  const overview = snapshot?.overview || snapshot?.summary || {};
  const subject = `${businessName} ${reportType === "daily-analysis" ? "Daily Analysis" : "Business Overview"} Report`;
  const amount = (value) => Number(value || 0).toLocaleString();
  const table = (headers, rows) => rows.length === 0 ? "<p style=\"color: #64748b; font-size: 13px;\">No records for this report.</p>" : `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0 22px; font-size: 13px;">
      <thead><tr>${headers.map((header) => `<th style="padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: left;">${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((value) => `<td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  const summaryRows = reportType === "daily-analysis"
    ? [["Revenue", amount(overview.revenue)], ["Expenses", amount(overview.expenses)], ["Net profit", amount(overview.netProfit)], ["Sales", overview.salesCount || 0]]
    : [["Revenue", amount(overview.periodRevenue)], ["Expenses", amount(overview.periodOperatingExpenses)], ["Profit", amount(overview.periodProfit)], ["Sales", snapshot?.sales?.length || 0], ["Inventory value", amount(overview.inventoryValue)]];
  const detailSections = reportType === "daily-analysis"
    ? `
      <h3>Payment methods</h3>${table(["Method", "Sales", "Amount"], (snapshot.paymentMethods || []).map((item) => [item.method, item.count, amount(item.amount)]))}
      <h3>Expenses by category</h3>${table(["Category", "Amount"], Object.entries(snapshot.expensesByCategory || {}).map(([category, value]) => [category, amount(value)]))}
      <h3>Sales</h3>${table(["Date", "Payment", "Amount"], (snapshot.sales || []).map((sale) => [new Date(sale.createdAt).toLocaleDateString(), sale.paymentMethod || "cash", amount(sale.totalAmount)]))}`
    : `
      <h3>Recent sales</h3>${table(["Date", "Customer", "Payment", "Amount"], (snapshot.recentSales || []).map((sale) => [new Date(sale.createdAt).toLocaleDateString(), sale.customerName || "Walk-in customer", sale.paymentMethod || "-", amount(sale.totalAmount)]))}
      <h3>Expenses</h3>${table(["Date", "Category", "Amount"], (snapshot.transactions || []).map((transaction) => [new Date(transaction.occurredAt || transaction.createdAt).toLocaleDateString(), transaction.category || "General", amount(transaction.amount)]))}
      <h3>Low-stock products</h3>${table(["Product", "Stock", "Price"], (snapshot.lowStockProducts || []).map((product) => [product.name || "Unnamed product", product.stock ?? product.quantity ?? 0, amount(product.branchPrice ?? product.price)]))}
      <h3>Staff performance</h3>${table(["Staff", "Sales", "Revenue"], (snapshot.staffPerformance || []).map((staff) => [staff.name, staff.totalSales, amount(staff.totalRevenue)]))}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
      <h2>${escapeHtml(subject)}</h2>
      <p>Hello ${escapeHtml(recipientName || "there")},</p>
      <p>Here is your scheduled report for <strong>${escapeHtml(businessName)}</strong>.</p>
      ${table(["Summary", "Value"], summaryRows)}
      ${detailSections}
      <p style="color: #64748b; font-size: 12px; margin-top: 30px;">You can <a href="${escapeHtml(unsubscribeUrl)}">unsubscribe from scheduled reports</a> at any time.</p>
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
