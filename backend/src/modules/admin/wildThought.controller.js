import mongoose from "mongoose";
import WildThought from "./wildThought.model.js";

const categories = new Set([
  "product",
  "marketing",
  "sales",
  "operations",
  "customer_experience",
  "finance",
  "new_venture",
  "other"
]);
const priorities = new Set(["low", "medium", "high"]);
const statuses = new Set(["captured", "planned", "in_progress", "done"]);
const fields = ["title", "thought", "venture", "category", "priority", "status", "nextAction", "reviewDate"];

const validateInput = (input, partial = false) => {
  const payload = {};
  for (const field of fields) {
    if (partial && !Object.hasOwn(input, field)) continue;
    const value = input[field];
    if (field === "reviewDate") {
      if (value === null || value === "") {
        payload.reviewDate = null;
      } else if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        return { error: "Review date must be a valid date" };
      } else {
        payload.reviewDate = new Date(value);
      }
      continue;
    }
    if (typeof value !== "string") {
      return { error: `${field} must be text` };
    }
    const normalized = value.trim();
    const limits = { title: 160, thought: 10000, venture: 120, nextAction: 1000 };
    if (limits[field] && normalized.length > limits[field]) {
      return { error: `${field} must be ${limits[field]} characters or fewer` };
    }
    if (["title", "thought", "venture"].includes(field) && !normalized) {
      return { error: `${field} is required` };
    }
    if (field === "category" && !categories.has(normalized)) return { error: "Invalid category" };
    if (field === "priority" && !priorities.has(normalized)) return { error: "Invalid priority" };
    if (field === "status" && !statuses.has(normalized)) return { error: "Invalid status" };
    payload[field] = normalized;
  }
  return { payload };
};

const getWildThoughts = async (req, res) => {
  try {
    const { venture, status, category } = req.query;
    const filter = { createdBy: req.user.id };
    if (typeof venture === "string" && venture.trim()) filter.venture = venture.trim();
    if (typeof status === "string" && status) {
      if (!statuses.has(status)) return res.status(400).json({ message: "Invalid status filter" });
      filter.status = status;
    }
    if (typeof category === "string" && category) {
      if (!categories.has(category)) return res.status(400).json({ message: "Invalid category filter" });
      filter.category = category;
    }
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 100;
    const [thoughts, total] = await Promise.all([
      WildThought.find(filter).sort({ updatedAt: -1 }).limit(limit).lean(),
      WildThought.countDocuments(filter)
    ]);
    return res.json({ thoughts, total });
  } catch (error) {
    return res.status(500).json({ message: "Could not load wild thoughts" });
  }
};

const createWildThought = async (req, res) => {
  const { payload, error } = validateInput(req.body);
  if (error) return res.status(400).json({ message: error });
  try {
    const thought = await WildThought.create({ ...payload, createdBy: req.user.id });
    return res.status(201).json({ thought });
  } catch (err) {
    return res.status(500).json({ message: "Could not save wild thought" });
  }
};

const updateWildThought = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid wild thought ID" });
  }
  const { payload, error } = validateInput(req.body, true);
  if (error) return res.status(400).json({ message: error });
  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ message: "Provide at least one field to update" });
  }
  try {
    const thought = await WildThought.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();
    if (!thought) return res.status(404).json({ message: "Wild thought not found" });
    return res.json({ thought });
  } catch (err) {
    return res.status(500).json({ message: "Could not update wild thought" });
  }
};

const deleteWildThought = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid wild thought ID" });
  }
  try {
    const thought = await WildThought.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!thought) return res.status(404).json({ message: "Wild thought not found" });
    return res.json({ message: "Wild thought deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete wild thought" });
  }
};

export {
  createWildThought,
  deleteWildThought,
  getWildThoughts,
  updateWildThought
};
