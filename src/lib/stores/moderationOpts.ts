import { create } from "zustand";
import { persist } from "zustand/middleware";
import { InterpretedLabelValueDefinition, ModerationPrefs } from "@atproto/api";

interface ModerationOptsData {
  moderationPrefs: ModerationPrefs | undefined;
  labelDefs: Record<string, InterpretedLabelValueDefinition[]> | undefined;
  lastFetched: number | null;
  isLoading: boolean;
  error: string | null;
}

interface ModerationOptsState extends ModerationOptsData {
  setModerationOpts: (
    moderationPrefs: ModerationPrefs,
    labelDefs: Record<string, InterpretedLabelValueDefinition[]>
  ) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  isStale: () => boolean;
  shouldRefetch: () => boolean;
  clear: () => void;
}

const STALE_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds

export const useModerationOptsStore = create<ModerationOptsState>()(
  persist(
    (set, get) => ({
      moderationPrefs: undefined,
      labelDefs: undefined,
      lastFetched: null,
      isLoading: false,
      error: null,

      setModerationOpts: (moderationPrefs, labelDefs) => {
        set({
          moderationPrefs,
          labelDefs,
          lastFetched: Date.now(),
          error: null,
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      isStale: () => {
        const { lastFetched } = get();
        if (!lastFetched) return true;
        return Date.now() - lastFetched > STALE_TIME;
      },

      shouldRefetch: () => {
        const { lastFetched, isLoading } = get();
        if (isLoading) return false;
        if (!lastFetched) return true;
        return Date.now() - lastFetched > CACHE_TIME;
      },

      clear: () =>
        set({
          moderationPrefs: undefined,
          labelDefs: undefined,
          lastFetched: null,
          error: null,
        }),
    }),
    {
      name: "moderation-opts-storage",
      partialize: (state) => ({
        moderationPrefs: state.moderationPrefs,
        labelDefs: state.labelDefs,
        lastFetched: state.lastFetched,
      }),
      // Add storage configuration to handle complex objects
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            const parsed = JSON.parse(str);
            return parsed;
          } catch (error) {
            console.error(
              "Failed to parse moderation opts from localStorage:",
              error
            );
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error(
              "Failed to serialize moderation opts to localStorage:",
              error
            );
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// Utility function to clear moderation options cache (useful for logout)
export const clearModerationOptsCache = () => {
  useModerationOptsStore.getState().clear();
};
