import request from "./client.js";

export const getUserGuide = () => request("/user-guide");

export const saveUserGuide = (guide) => request("/user-guide", {
  method: "PUT",
  body: JSON.stringify({ guide })
});
