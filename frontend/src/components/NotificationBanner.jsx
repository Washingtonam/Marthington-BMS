import { useState, useEffect } from "react";
import { markNotificationAsRead, deleteNotification } from "../api/notifications.js";

const NotificationBanner = ({ notification, onDismiss, darkMode = true }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 8 seconds if unread
    if (!notification.isRead) {
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [notification.isRead]);

  const handleMarkRead = async () => {
    try {
      await markNotificationAsRead(notification._id);
      onDismiss?.(notification._id);
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleDismiss = async () => {
    try {
      await deleteNotification(notification._id);
      setVisible(false);
      onDismiss?.(notification._id);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  if (!visible) return null;

  // Determine styling based on notification type and dark mode
  const getStyles = () => {
    if (darkMode) {
      switch (notification.type) {
        case "payout_approved":
          return {
            bg: "bg-blue-500/10",
            border: "border-blue-400/30",
            icon: "💳",
            titleColor: "text-blue-200",
            messageColor: "text-blue-100/80",
            buttonColor: "text-blue-300 hover:text-blue-200"
          };
        case "payout_settled":
          return {
            bg: "bg-green-500/10",
            border: "border-green-400/30",
            icon: "✓",
            titleColor: "text-green-200",
            messageColor: "text-green-100/80",
            buttonColor: "text-green-300 hover:text-green-200"
          };
        case "payout_rejected":
          return {
            bg: "bg-red-500/10",
            border: "border-red-400/30",
            icon: "⚠",
            titleColor: "text-red-200",
            messageColor: "text-red-100/80",
            buttonColor: "text-red-300 hover:text-red-200"
          };
        default:
          return {
            bg: "bg-slate-500/10",
            border: "border-slate-400/30",
            icon: "ℹ",
            titleColor: "text-slate-200",
            messageColor: "text-slate-100/80",
            buttonColor: "text-slate-300 hover:text-slate-200"
          };
      }
    } else {
      // Light mode styles (for admin dashboard)
      switch (notification.type) {
        case "payout_approved":
          return {
            bg: "bg-blue-50",
            border: "border-blue-200",
            icon: "💳",
            titleColor: "text-blue-900",
            messageColor: "text-blue-700",
            buttonColor: "text-blue-600 hover:text-blue-700"
          };
        case "payout_settled":
          return {
            bg: "bg-green-50",
            border: "border-green-200",
            icon: "✓",
            titleColor: "text-green-900",
            messageColor: "text-green-700",
            buttonColor: "text-green-600 hover:text-green-700"
          };
        case "payout_rejected":
          return {
            bg: "bg-red-50",
            border: "border-red-200",
            icon: "⚠",
            titleColor: "text-red-900",
            messageColor: "text-red-700",
            buttonColor: "text-red-600 hover:text-red-700"
          };
        default:
          return {
            bg: "bg-slate-50",
            border: "border-slate-200",
            icon: "ℹ",
            titleColor: "text-slate-900",
            messageColor: "text-slate-700",
            buttonColor: "text-slate-600 hover:text-slate-700"
          };
      }
    }
  };

  const styles = getStyles();

  return (
    <div className={`${styles.bg} border-l-4 ${styles.border} rounded-lg p-4 shadow-sm`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">{styles.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`${styles.titleColor} font-semibold text-sm mb-1`}>
            {notification.title}
          </h3>
          <p className={`${styles.messageColor} text-sm leading-relaxed`}>
            {notification.message}
          </p>
          {notification.amount && (
            <p className={`${styles.titleColor} font-bold text-sm mt-2`}>
              ₦{notification.amount.toLocaleString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          {!notification.isRead && (
            <button
              onClick={handleMarkRead}
              className={`text-xs font-medium ${styles.buttonColor} px-2 py-1`}
            >
              Read
            </button>
          )}
          <button
            onClick={handleDismiss}
            className={`text-xs font-medium ${styles.buttonColor} px-2 py-1`}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;
