import request from "./client.js";

export const getAffiliateDashboard = async () => request("/affiliates/dashboard");

export const getAffiliateProfile = async () => {
	return request("/affiliates/profile", {
		method: "GET"
	});
};

export const updateAffiliateProfile = async (payload) => {
	return request("/affiliates/profile", {
		method: "PUT",
		body: JSON.stringify(payload)
	});
};

export const requestPayout = async (payload) => {
	return request("/affiliates/payouts", {
		method: "POST",
		body: JSON.stringify(payload)
	});
};

export const getPayoutHistory = async () => {
	return request("/affiliates/payouts", {
		method: "GET"
	});
};
