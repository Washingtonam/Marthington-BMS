import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBranding } from "../context/BrandingContext.jsx";
import { synchronizeNarrationSegments, applyBrandingToScene } from "./narrationSync.js";
import { resolveSceneMapping } from "./sceneRegistry.js";

export const createScenePlaybackService = ({ navigate, activateProfile }) => {
  let timerId = null;

  const stop = () => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  };

  const activateScene = (segmentOrSceneKey, options = {}) => {
    const mapping = resolveSceneMapping(segmentOrSceneKey);
    if (!mapping) return false;

    if (options.brandingProfile) {
      activateProfile(options.brandingProfile);
    }
    navigate(mapping.route, {
      replace: Boolean(options.replace),
      state: {
        sceneKey: mapping.key,
        targetComponent: mapping.targetComponent,
        demoState: { ...mapping.demoState, ...(options.demoState ?? {}) },
        playbackMode: options.playbackMode ?? "preview",
      },
    });
    return mapping;
  };

  const play = (segments, options = {}) => {
    stop();
    const syncedSegments = synchronizeNarrationSegments(segments, options.timing);
    let activeIndex = -1;

    const playIndex = (index) => {
      if (index >= syncedSegments.length) return;
      activeIndex = index;
      const segment = applyBrandingToScene(syncedSegments[index], options.brandingProfile ?? {});
      activateScene(segment, {
        brandingProfile: options.brandingProfile,
        playbackMode: options.playbackMode ?? "recording",
        replace: index === 0 ? Boolean(options.replace) : true,
      });
      options.onSceneChange?.(segment, index);
      const remaining = syncedSegments[index].endMs - syncedSegments[index].startMs;
      timerId = window.setTimeout(() => playIndex(index + 1), remaining);
    };

    if (syncedSegments.length) playIndex(0);
    return {
      stop,
      segments: syncedSegments,
      getActiveIndex: () => activeIndex,
    };
  };

  return { activateScene, play, stop };
};

export const useScenePlayback = (options = {}) => {
  const navigate = useNavigate();
  const branding = useBranding();
  const serviceRef = useRef(null);

  if (!serviceRef.current) {
    serviceRef.current = createScenePlaybackService({
      navigate,
      activateProfile: branding.activateProfile,
    });
  }

  useEffect(() => () => serviceRef.current?.stop(), []);

  const activateScene = useCallback((scene, sceneOptions = {}) =>
    serviceRef.current.activateScene(scene, {
      brandingProfile: branding.brandingProfile,
      ...sceneOptions,
    }), [branding.brandingProfile]);

  const play = useCallback((segments, playbackOptions = {}) =>
    serviceRef.current.play(segments, {
      brandingProfile: branding.brandingProfile,
      ...playbackOptions,
    }), [branding.brandingProfile]);

  const stop = useCallback(() => serviceRef.current?.stop(), []);

  return useMemo(() => ({
    activeBranding: branding.brandingProfile,
    activateScene,
    play,
    stop,
  }), [branding.brandingProfile, activateScene, play, stop]);
};
