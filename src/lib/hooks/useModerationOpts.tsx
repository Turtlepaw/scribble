"use client";
import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useModerationOptsStore } from "../stores/moderationOpts";
import { DEFAULT_LABEL_SETTINGS } from "@atproto/api";

/**
 * From {@link https://github.com/bluesky-social/social-app/blob/2a6172cbaf2db0eda2a7cd2afaeef4b60aadf3ba/src/state/queries/preferences/moderation.ts#L15}
 */
export const DEFAULT_LOGGED_OUT_LABEL_PREFERENCES: typeof DEFAULT_LABEL_SETTINGS =
  Object.fromEntries(
    Object.entries(DEFAULT_LABEL_SETTINGS).map(([key, _pref]) => [key, "hide"])
  );

export function useModerationOpts() {
  const { agent } = useAuth();
  const {
    moderationPrefs,
    labelDefs,
    isLoading,
    error,
    setModerationOpts,
    setLoading,
    setError,
    isStale,
    shouldRefetch,
  } = useModerationOptsStore();

  useEffect(() => {
    if (!agent || agent?.did == null) return;

    const fetchModerationOpts = async () => {
      try {
        setLoading(true);
        const prefs = await agent.getPreferences();
        const labelDefs = await agent.getLabelDefinitions(prefs);
        setModerationOpts(prefs.moderationPrefs, labelDefs);
      } catch (err) {
        console.error("Error fetching moderation opts:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    // If we have stale data, return it immediately but fetch fresh data in background
    if (moderationPrefs && labelDefs && isStale()) {
      fetchModerationOpts(); // Background refresh
    }
    // If we have no data or data is expired, fetch immediately
    else if (!moderationPrefs || !labelDefs || shouldRefetch()) {
      fetchModerationOpts();
    }
  }, [
    agent,
    moderationPrefs,
    labelDefs,
    isStale,
    shouldRefetch,
    setModerationOpts,
    setLoading,
    setError,
  ]);

  return {
    moderationPrefs,
    labelDefs,
    isLoading,
    error,
  };
}
