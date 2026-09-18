import nodemailer from "nodemailer";
import axios from "axios";

/**
 * Email Configuration
 * Supports SMTP and Mailgun providers
 * Configure via environment variables:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - Or MAILGUN_API_KEY, MAILGUN_DOMAIN
 */

let transporter;
let lastEmailError = null;

// Initialize email transporter based on provider
const initializeEmailTransporter = () => {
  if (process.env.RESEND_API_KEY) {
    console.log("✉️ Email configured with Resend HTTPS API");
  } else if (process.env.SMTP_HOST) {
    // Use SMTP (Nodemailer)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log("✉️ Email configured with SMTP");
  } else if (process.env.MAILGUN_API_KEY) {
    // Mailgun support (future)
    console.log("⚠️ Mailgun support pending");
  } else {
    console.warn("⚠️ Email service not configured (SMTP or Mailgun credentials missing)");
  }
};

// Initialize on import
initializeEmailTransporter();

/**
 * Get email transporter
 */
export const getEmailTransporter = () => {
  if (!transporter) {
    console.warn("Email transporter not initialized. Configure SMTP_* environment variables.");
  }
  return transporter;
};

export const hasResendApi = () => Boolean(process.env.RESEND_API_KEY);

export const getResendConfig = () => ({
  apiKey: process.env.RESEND_API_KEY || "",
  from: process.env.RESEND_FROM || process.env.SMTP_FROM || ""
});

export const getEmailConfigStatus = () => ({
  configured: hasResendApi() || Boolean(transporter),
  provider: hasResendApi() ? "resend-api" : process.env.SMTP_HOST ? "smtp" : process.env.MAILGUN_API_KEY ? "mailgun" : "none",
  host: process.env.SMTP_HOST || null,
  port: process.env.SMTP_PORT || "587",
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER || null,
  from: process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || null,
  lastError: lastEmailError
});

export const setLastEmailError = (error) => {
  lastEmailError = error ? String(error.message || error) : null;
};

/**
 * Verify email configuration
 */
export const verifyEmailConfig = async () => {
  try {
    if (hasResendApi()) {
      await axios.get("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        timeout: 10000
      });
      lastEmailError = null;
      console.log("✅ Resend API verified successfully");
      return true;
    }
    if (transporter) {
      await transporter.verify();
      lastEmailError = null;
      console.log("✅ Email transporter verified successfully");
      return true;
    }
    lastEmailError = "Email transporter is not configured";
    return false;
  } catch (error) {
    lastEmailError = error.message;
    console.error("❌ Email transporter verification failed:", error.message);
    return false;
  }
};

export default {
  getEmailTransporter,
  verifyEmailConfig,
  getEmailConfigStatus,
  hasResendApi,
  getResendConfig,
};
