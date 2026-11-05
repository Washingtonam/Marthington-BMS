import { replaceBrandName, applyBrandingToValue } from "../utils/brandingTemplate.js";
import { resolveSceneMapping } from "./sceneRegistry.js";

const DEFAULT_WORDS_PER_MINUTE = 150;

export const countNarrationWords = (text = "") =>
  String(text ?? "")
    .replace(/{{[\w]+}}/g, "")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

export const calculateNarrationTiming = ({
  narration = "",
  wordsPerMinute = DEFAULT_WORDS_PER_MINUTE,
  minimumDurationMs = 1200,
  maximumDurationMs = 120000,
} = {}) => {
  const wordCount = countNarrationWords(narration);
  const safeWpm = Number.isFinite(wordsPerMinute) && wordsPerMinute > 0
    ? wordsPerMinute
    : DEFAULT_WORDS_PER_MINUTE;
  const durationMs = Math.round((wordCount / safeWpm) * 60000);
  return {
    wordCount,
    wordsPerMinute: safeWpm,
    durationMs: Math.max(minimumDurationMs, Math.min(maximumDurationMs, durationMs)),
  };
};

export const synchronizeNarrationSegments = (
  segments = [],
  { wordsPerMinute = DEFAULT_WORDS_PER_MINUTE, minimumDurationMs = 1200 } = {}
) => {
  if (!Array.isArray(segments)) return [];

  let startMs = 0;
  return segments.map((segment, index) => {
    const narration = String(
      segment?.narration ?? segment?.text ?? segment?.narrationText ?? ""
    );
    const timing = calculateNarrationTiming({
      narration,
      wordsPerMinute,
      minimumDurationMs,
    });
    const mapping = resolveSceneMapping(segment);
    const synchronized = {
      ...segment,
      index,
      sceneKey: mapping?.key ?? segment?.sceneKey ?? segment?.scene ?? null,
      route: mapping?.route ?? segment?.route ?? null,
      targetComponent: mapping?.targetComponent ?? segment?.targetComponent ?? null,
      narration,
      timing,
      startMs,
      endMs: startMs + timing.durationMs,
    };
    startMs = synchronized.endMs;
    return synchronized;
  });
};

export const parseNarrationScenes = (text = "") => {
  const source = String(text ?? "");
  const headingPattern = /^#{2,4}\s*(dashboard_overview|pos_checkout|invoice_management|suppliers_page|team_permissions|customers_crm)\b[:\s]*(.*)$/im;
  const matches = [...source.matchAll(new RegExp(headingPattern.source, "gim"))];

  if (!matches.length) {
    return source.trim()
      ? [{ sceneKey: null, narration: source.trim() }]
      : [];
  }

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const nextStart = index + 1 < matches.length
      ? matches[index + 1].index ?? source.length
      : source.length;
    const sceneKey = match[1].toLowerCase();
    const headingText = match[2].trim();
    const narration = source.slice(start, nextStart)
      .replace(/^#{2,4}\s*[^\n]*(?:\n|$)/i, "")
      .replace(/^\s+|\s+$/g, "");
    return {
      sceneKey,
      title: headingText || sceneKey.replace(/_/g, " "),
      narration,
    };
  });
};

export const applyBrandingToScene = (scene, brandingProfile = {}) => {
  const mapping = resolveSceneMapping(scene);
  const brandedNarration = replaceBrandName(
    scene?.narration ?? "",
    brandingProfile
  );
  return {
    ...applyBrandingToValue(scene, brandingProfile),
    ...(mapping ? {
      route: mapping.route,
      targetComponent: mapping.targetComponent,
      demoState: applyBrandingToValue(mapping.demoState, brandingProfile),
    } : {}),
    narration: brandedNarration,
  };
};

