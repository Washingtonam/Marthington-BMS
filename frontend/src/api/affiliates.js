import request from "./client.js";

export const getAffiliateDashboard = async () => request("/affiliates/dashboard");
