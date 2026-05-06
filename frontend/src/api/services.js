import request from "./client.js";

// ========================================
// 🔥 GET ALL SERVICES
// ========================================

export const getServices = async (
  params = {}
) => {

  const query =
    new URLSearchParams(
      params
    ).toString();

  return request(
    `/services${
      query
        ? `?${query}`
        : ""
    }`
  );
};

// ========================================
// 🔥 GET SINGLE SERVICE
// ========================================

export const getServiceById = async (
  id
) => {

  return request(
    `/services/${id}`
  );
};

// ========================================
// 🔥 CREATE SERVICE
// ========================================

export const createService = async (
  payload
) => {

  return request(
    "/services",
    {
      method: "POST",

      body:
        JSON.stringify(
          payload
        )
    }
  );
};

// ========================================
// 🔥 UPDATE SERVICE
// ========================================

export const updateService = async (
  id,
  payload
) => {

  return request(
    `/services/${id}`,
    {
      method: "PUT",

      body:
        JSON.stringify(
          payload
        )
    }
  );
};

// ========================================
// 🔥 TOGGLE STATUS
// ========================================

export const toggleServiceStatus =
  async (id) => {

    return request(
      `/services/${id}/toggle-status`,
      {
        method: "PATCH"
      }
    );
  };

// ========================================
// 🔥 DELETE SERVICE
// ========================================

export const deleteService = async (
  id
) => {

  return request(
    `/services/${id}`,
    {
      method: "DELETE"
    }
  );
};