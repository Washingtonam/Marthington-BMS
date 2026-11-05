const DEFAULT_CONFIG = Object.freeze({
  video: Object.freeze({
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
    targetResolution: "1920x1080",
    targetOutputResolutions: Object.freeze(["1920x1080"]),
  }),
  account: Object.freeze({
    type: "demo",
    isDemo: true,
    showDemoLabel: false,
    showDemoWatermark: false,
  }),
  business: Object.freeze({
    name: "",
    displayName: "",
  }),
  replacements: Object.freeze([]),
});

const ACCOUNT_TYPES = new Set(["live", "demo"]);
const ASPECT_RATIO_PATTERN = /^(\d{1,5})\s*:\s*(\d{1,5})$/;
const RESOLUTION_PATTERN = /^(\d{3,5})\s*[xX]\s*(\d{3,5})$/;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const cleanString = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const gcd = (a, b) => {
  let left = Math.abs(Math.round(a));
  let right = Math.abs(Math.round(b));
  while (right) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left || 1;
};

export const getAspectRatio = (width, height) => {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return "16:9";
  }
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

const parseResolution = (value) => {
  if (typeof value !== "string" || !RESOLUTION_PATTERN.test(value.trim())) {
    return null;
  }
  const match = value.trim().match(RESOLUTION_PATTERN);
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width >= 240 && height >= 240 ? { width, height } : null;
};

const parseAspectRatio = (value) => {
  if (typeof value !== "string" || !ASPECT_RATIO_PATTERN.test(value.trim())) {
    return null;
  }
  const match = value.trim().match(ASPECT_RATIO_PATTERN);
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? `${width}:${height}` : null;
};

const parseFrontMatter = (rawInput) => {
  if (typeof rawInput !== "string") {
    return { metadata: {}, script: typeof rawInput?.script === "string" ? rawInput.script : "" };
  }

  const match = rawInput.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) {
    return { metadata: {}, script: rawInput };
  }

  const frontMatter = match[1].trim();
  if (frontMatter.startsWith("{")) {
    try {
      const parsed = JSON.parse(frontMatter);
      return { metadata: isPlainObject(parsed) ? parsed : {}, script: rawInput.slice(match[0].length) };
    } catch {
      return { metadata: {}, script: rawInput.slice(match[0].length) };
    }
  }

  const metadata = {};
  let currentSection = null;

  for (const line of frontMatter.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const sectionMatch = line.match(/^([A-Za-z][\w-]*):\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      metadata[currentSection] = {};
      continue;
    }

    const keyValueMatch = line.match(/^[- ]*([A-Za-z][\w-]*):\s*(.*?)\s*$/);
    if (!keyValueMatch) continue;
    const key = keyValueMatch[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    let value = keyValueMatch[2].replace(/^["']|["']$/g, "");

    if (/^(true|false)$/i.test(value)) value = /^true$/i.test(value);
    else if (/^-?\d+$/.test(value)) value = Number(value);
    else if (value.includes(",")) {
      const list = value.split(",").map((item) => item.trim()).filter(Boolean);
      value = list.length ? list : value;
    }

    if (currentSection && !line.match(/^\s{2}/)) {
      currentSection = null;
    }
    if (currentSection && line.startsWith("  ")) {
      metadata[currentSection][key] = value;
    } else {
      metadata[key] = value;
    }
  }

  return { metadata, script: rawInput.slice(match[0].length) };
};

const mergeInput = (rawInput) => {
  const frontMatter = parseFrontMatter(rawInput);
  if (isPlainObject(rawInput)) {
    return {
      metadata: {
        ...frontMatter.metadata,
        ...(isPlainObject(rawInput.metadata) ? rawInput.metadata : {}),
        ...(isPlainObject(rawInput.video) ? { video: rawInput.video } : {}),
        ...(isPlainObject(rawInput.account) ? { account: rawInput.account } : {}),
        ...(isPlainObject(rawInput.business) ? { business: rawInput.business } : {}),
      },
      script: cleanString(rawInput.script),
    };
  }
  return frontMatter;
};

const toReplacements = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => isPlainObject(item))
      .map((item) => ({ from: cleanString(item.from ?? item.source), to: cleanString(item.to ?? item.target) }))
      .filter((item) => item.from && item.to);
  }

  if (isPlainObject(value)) {
    return Object.entries(value)
      .filter(([, to]) => typeof to === "string" || typeof to === "number")
      .map(([from, to]) => ({ from: from.trim(), to: String(to).trim() }))
      .filter((item) => item.from && item.to);
  }

  return [];
};

export const validateScriptVideoConfig = (input) => {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(input) && typeof input !== "string") {
    errors.push("Input must be a configuration object or a script string.");
  }

  if (isPlainObject(input)) {
    if (input.video !== undefined && !isPlainObject(input.video) && typeof input.video !== "number") {
      errors.push("video must be an object containing width and height.");
    }
    if (input.account !== undefined && !isPlainObject(input.account) && typeof input.account !== "string") {
      errors.push("account must be an object or an account type string.");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
};

export const parseScriptVideoConfig = (rawInput) => {
  const validation = validateScriptVideoConfig(rawInput);
  const { metadata, script } = mergeInput(rawInput);

  const videoMetadata =
    isPlainObject(metadata.video) ? metadata.video :
      isPlainObject(metadata.dimensions) ? metadata.dimensions :
      metadata;
  const accountMetadata = isPlainObject(metadata.account)
    ? metadata.account
    : { type: typeof metadata.account === "string" ? metadata.account : undefined };
  const businessMetadata = isPlainObject(metadata.business) ? metadata.business : metadata;

  const dimensions = isPlainObject(metadata.dimensions) ? metadata.dimensions : {};
  const widthCandidate = videoMetadata.width ?? dimensions.width ?? metadata.width;
  const heightCandidate = videoMetadata.height ?? dimensions.height ?? metadata.height;

  let resolution = null;
  if (typeof videoMetadata.resolution === "string") {
    resolution = parseResolution(videoMetadata.resolution);
  }
  if (!resolution && typeof videoMetadata.targetResolution === "string") {
    resolution = parseResolution(videoMetadata.targetResolution);
  }
  if (!resolution && typeof metadata.resolution === "string") {
    resolution = parseResolution(metadata.resolution);
  }

  const width = Number.isInteger(widthCandidate) && widthCandidate > 0
    ? widthCandidate
    : resolution?.width ?? DEFAULT_CONFIG.video.width;
  const height = Number.isInteger(heightCandidate) && heightCandidate > 0
    ? heightCandidate
    : resolution?.height ?? DEFAULT_CONFIG.video.height;

  const aspectCandidate = videoMetadata.aspectRatio ?? metadata.aspectRatio;
  const parsedAspectRatio = parseAspectRatio(aspectCandidate) ?? getAspectRatio(width, height);

  const targetResolution = `${width}x${height}`;
  const rawTargetResolutions = videoMetadata.targetOutputResolutions ?? metadata.targetOutputResolutions;
  const targetOutputResolutions = Array.isArray(rawTargetResolutions)
    ? [...new Set(rawTargetResolutions.map(parseResolution).filter(Boolean).map((item) => `${item.width}x${item.height}`))]
    : [targetResolution];
  if (!targetOutputResolutions.includes(targetResolution)) {
    targetOutputResolutions.push(targetResolution);
  }

  const requestedAccountType = cleanString(accountMetadata.type ?? metadata.accountType ?? "").toLowerCase();
  const accountType = ACCOUNT_TYPES.has(requestedAccountType)
    ? requestedAccountType
    : DEFAULT_CONFIG.account.type;
  const isDemo = accountType === "demo";

  const businessName = cleanString(
    businessMetadata.name ?? businessMetadata.businessName ?? businessMetadata.shopName ?? metadata.businessName ?? metadata.shopName
  );
  const displayName = cleanString(businessMetadata.displayName ?? businessName);

  const replacements = toReplacements(
    metadata.replacements ??
    metadata.dynamicNames ??
    metadata.businessNames ??
    metadata.businessNameReplacements
  );
  if (businessName && replacements.every((item) => item.to !== businessName)) {
    const originalNames = [
      cleanString(metadata.originalBusinessName),
      cleanString(metadata.originalShopName),
      cleanString(metadata.sourceBusinessName),
      cleanString(metadata.placeholder),
    ].filter(Boolean);
    originalNames.forEach((from) => replacements.push({ from, to: businessName }));
  }

  if (widthCandidate !== undefined && (!Number.isInteger(widthCandidate) || widthCandidate <= 0)) {
    validation.warnings.push("Invalid width; defaulted to 1920.");
  }
  if (heightCandidate !== undefined && (!Number.isInteger(heightCandidate) || heightCandidate <= 0)) {
    validation.warnings.push("Invalid height; defaulted to 1080.");
  }
  if (aspectCandidate !== undefined && !parseAspectRatio(aspectCandidate)) {
    validation.warnings.push("Invalid aspect ratio; derived it from the video dimensions.");
  }
  if (requestedAccountType && !ACCOUNT_TYPES.has(requestedAccountType)) {
    validation.warnings.push("Invalid account type; defaulted to demo.");
  }

  return {
    video: {
      width,
      height,
      aspectRatio: parsedAspectRatio,
      targetResolution,
      targetOutputResolutions,
    },
    account: {
      type: accountType,
      isDemo,
      showDemoLabel: false,
      showDemoWatermark: false,
    },
    business: {
      name: businessName,
      displayName,
    },
    replacements,
    script,
    validation,
  };
};

export const injectBusinessConfiguration = (template, configOrInput) => {
  if (typeof template !== "string") return template;

  const config = configOrInput?.video ? configOrInput : parseScriptVideoConfig(configOrInput ?? {});
  let result = template;

  for (const { from, to } of config.replacements ?? []) {
    if (!from) continue;
    result = result.split(from).join(to);
  }

  const businessName = config.business?.name ?? "";
  const displayName = config.business?.displayName ?? businessName;
  const placeholders = {
    "{{businessName}}": businessName,
    "{{shopName}}": displayName,
    "{{business}}": displayName,
  };

  for (const [placeholder, value] of Object.entries(placeholders)) {
    result = result.split(placeholder).join(value);
  }

  return result;
};

export const injectConfigurationIntoState = (componentState, configOrInput) => {
  const config = configOrInput?.video ? configOrInput : parseScriptVideoConfig(configOrInput ?? {});

  const transform = (value) => {
    if (typeof value === "string") return injectBusinessConfiguration(value, config);
    if (Array.isArray(value)) return value.map(transform);
    if (isPlainObject(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transform(item)]));
    }
    return value;
  };

  const state = transform(componentState ?? {});
  if (isPlainObject(state)) {
    state.businessName = config.business.name || state.businessName || "";
    state.videoConfig = {
      ...(state.videoConfig ?? {}),
      ...config.video,
    };
    state.accountMetadata = {
      ...(state.accountMetadata ?? {}),
      ...config.account,
    };
  }
  return state;
};
