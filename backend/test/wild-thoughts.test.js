import test from "node:test";
import assert from "node:assert/strict";
import WildThought from "../src/modules/admin/wildThought.model.js";
import {
  createWildThought,
  getWildThoughts,
  updateWildThought
} from "../src/modules/admin/wildThought.controller.js";

const mockResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test("wild thought schema requires a venture and thought and constrains status", () => {
  const missingFields = new WildThought({ title: "Idea" });
  const validationError = missingFields.validateSync();
  assert.ok(validationError.errors.thought);
  assert.ok(validationError.errors.venture);

  const invalidStatus = new WildThought({
    title: "Idea",
    thought: "Improve onboarding",
    venture: "Marthington BMS",
    createdBy: "507f1f77bcf86cd799439011",
    status: "ignored"
  });
  assert.ok(invalidStatus.validateSync().errors.status);
});

test("wild thought creation validates content and scopes saved thought to the admin", { concurrency: false }, async () => {
  const originalCreate = WildThought.create;
  let saved;
  WildThought.create = async (payload) => {
    saved = payload;
    return { _id: "thought-id", ...payload };
  };
  const req = {
    user: { id: "507f1f77bcf86cd799439011" },
    body: {
      title: "Try sector demo",
      thought: "Make a short version for hardware shops.",
      venture: "Marthington BMS",
      category: "marketing",
      priority: "high",
      status: "captured",
      nextAction: "",
      reviewDate: null
    }
  };
  const res = mockResponse();
  try {
    await createWildThought(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(saved.createdBy, req.user.id);
    assert.equal(res.body.thought.title, req.body.title);

    const invalidResponse = mockResponse();
    await createWildThought({ ...req, body: { ...req.body, category: "not-a-category" } }, invalidResponse);
    assert.equal(invalidResponse.statusCode, 400);
  } finally {
    WildThought.create = originalCreate;
  }
});

test("wild thought listing is filtered to the current super admin", { concurrency: false }, async () => {
  const originalFind = WildThought.find;
  const originalCountDocuments = WildThought.countDocuments;
  let findFilter;
  let countFilter;
  WildThought.find = (filter) => {
    findFilter = filter;
    return {
      sort() { return this; },
      limit() { return this; },
      lean: async () => [{ _id: "thought-id" }]
    };
  };
  WildThought.countDocuments = async (filter) => {
    countFilter = filter;
    return 1;
  };
  const req = {
    user: { id: "507f1f77bcf86cd799439011" },
    query: { venture: "Marthington BMS", limit: "3" }
  };
  const res = mockResponse();
  try {
    await getWildThoughts(req, res);
    assert.equal(res.body.total, 1);
    assert.deepEqual(findFilter, { createdBy: req.user.id, venture: "Marthington BMS" });
    assert.deepEqual(countFilter, findFilter);
  } finally {
    WildThought.find = originalFind;
    WildThought.countDocuments = originalCountDocuments;
  }
});

test("wild thought updates cannot cross admin ownership boundaries", { concurrency: false }, async () => {
  const originalFindOneAndUpdate = WildThought.findOneAndUpdate;
  let updateFilter;
  WildThought.findOneAndUpdate = (filter, update, options) => {
    updateFilter = filter;
    assert.deepEqual(update, { $set: { title: "Updated title" } });
    assert.equal(options.runValidators, true);
    return { lean: async () => ({ _id: filter._id, title: "Updated title" }) };
  };
  const req = {
    user: { id: "507f1f77bcf86cd799439011" },
    params: { id: "507f1f77bcf86cd799439012" },
    body: { title: "Updated title" }
  };
  const res = mockResponse();
  try {
    await updateWildThought(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(updateFilter, { _id: req.params.id, createdBy: req.user.id });
  } finally {
    WildThought.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
