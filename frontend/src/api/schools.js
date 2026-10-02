import request from "./client.js";

export const getSchool = async () => {
  return await request("/schools");
};

export const createSchool = async (payload) => {
  return await request("/schools", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const updateSchool = async (payload) => {
  return await request("/schools", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
};

export const getStudents = async () => {
  return await request("/schools/students");
};

export const createStudent = async (payload) => {
  return await request("/schools/students", {
    method: "POST",
    body: JSON.stringify(payload)
  });
};

export const getStudentById = async (id) => {
  return await request(`/schools/students/${id}`);
};
