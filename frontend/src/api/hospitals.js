import request from "./client.js";

export const getHospital = async () => {
  return await request("/hospitals");
};

export const createHospital = async (payload) => {
  return await request("/hospitals", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const updateHospital = async (payload) => {
  return await request("/hospitals", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
};

export const getPatients = async () => {
  return await request("/hospitals/patients");
};

export const createPatient = async (payload) => {
  return await request("/hospitals/patients", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getPatientById = async (id) => {
  return await request(`/hospitals/patients/${id}`);
};
