import request from "./client.js";

export const getAffiliateDashboard = async () => request("/affiliates/dashboard");

export const requestPayout = async (payload) => {
	return request("/affiliates/payouts", {
		method: "POST",
		body: JSON.stringify(payload)
	});
};
