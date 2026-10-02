import request from "./client.js";

export const getNotifications = async (query = "") => {
  const q = query ? `?${query}` : "";
  return request(`/notifications${q}`);
};

export const markNotificationAsRead = async (notificationId) => {
  return request(`/notifications/${notificationId}/read`, {
    method: "PUT"
  });
};

export const markAllNotificationsAsRead = async () => {
  return request(`/notifications/mark-all-as-read`, {
    method: "PUT"
  });
};

export const deleteNotification = async (notificationId) => {
  return request(`/notifications/${notificationId}`, {
    method: "DELETE"
  });
};

export default {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};
