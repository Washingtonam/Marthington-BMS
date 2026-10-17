import UserGuide from "./userGuide.model.js";

const isText = (value, maxLength) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;

const validateItems = (items, requiredFields, label) => {
  if (!Array.isArray(items) || items.length > 100) {
    return `${label} must be a list of no more than 100 items.`;
  }

  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return `${label} contains an invalid item.`;
    }
    for (const [field, maxLength] of Object.entries(requiredFields)) {
      if (!isText(item[field], maxLength)) {
        return `${label} items require a valid ${field}.`;
      }
    }
  }

  return null;
};

const validateGuideContent = (content) => {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "Guide content must be an object.";
  }
  if (!isText(content.title, 160) || !isText(content.description, 1000)) {
    return "A title and description are required.";
  }

  const validations = [
    validateItems(content.workflows, {
      id: 80, title: 160, category: 80, tag: 80, route: 160,
      routeLabel: 80, description: 1000
    }, "Workflows"),
    validateItems(content.directory, {
      title: 160, path: 160, summary: 1000, action: 80
    }, "Directory"),
    validateItems(content.checklist, { id: 80, label: 240 }, "Checklist"),
    validateItems(content.faqs, { question: 300, answer: 2000 }, "FAQs")
  ];

  if (validations.some(Boolean)) return validations.find(Boolean);
  if (!Array.isArray(content.quickFlow) || content.quickFlow.length > 30
    || content.quickFlow.some((step) => !isText(step, 1000))) {
    return "Quick-start steps must be a list of no more than 30 text items.";
  }
  if (content.workflows.some((item) => !Array.isArray(item.steps)
    || item.steps.length > 30
    || item.steps.some((step) => !isText(step, 1000)))) {
    return "Each workflow requires a list of valid steps.";
  }
  if (content.workflows.some((item) => !/^\/app(?:\/|$)/.test(item.route) || item.route.startsWith("//"))
    || content.directory.some((item) => !/^\/app(?:\/|$)/.test(item.path) || item.path.startsWith("//"))) {
    return "Guide links must point to an in-app page.";
  }

  return null;
};

const getUserGuide = async (req, res) => {
  try {
    const saved = await UserGuide.findOne({ key: "global" }).lean();
    res.json({ guide: saved?.content || null, updatedAt: saved?.updatedAt || null });
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not load the user guide." });
  }
};

const saveUserGuide = async (req, res) => {
  const validationError = validateGuideContent(req.body?.guide);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const saved = await UserGuide.findOneAndUpdate(
      { key: "global" },
      { $set: { content: req.body.guide, savedBy: req.user._id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ guide: saved.content, updatedAt: saved.updatedAt });
  } catch (error) {
    res.status(500).json({ message: error.message || "Could not save the user guide." });
  }
};

export { getUserGuide, saveUserGuide };
