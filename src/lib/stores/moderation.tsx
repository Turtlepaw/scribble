import { create } from "zustand";
import { persist } from "zustand/middleware";
import { moderatePost, ModerationDecision } from "@atproto/api/dist/moderation";
import { type ModerationOpts } from "@atproto/api/dist/moderation/types";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";

export interface ModerationState {
  // Simple content warning preferences
  showContentWarnings: boolean;

  // Actions
  setShowContentWarnings: (show: boolean) => void;

  // Helper to get moderation decision using AT Protocol's built-in moderation
  getModerationDecision: (
    post: PostView,
    opts: ModerationOpts
  ) => ModerationDecision;
  shouldShowWarning: (post: PostView, opts: ModerationOpts) => boolean;
}

export const useModerationStore = create<ModerationState>()(
  persist(
    (set, get) => ({
      showContentWarnings: true,

      setShowContentWarnings: (show) => set({ showContentWarnings: show }),

      getModerationDecision: (post: PostView, opts: ModerationOpts) => {
        return moderatePost(post, opts);
      },

      shouldShowWarning: (post: PostView, opts: ModerationOpts) => {
        const state = get();
        if (!state.showContentWarnings) return false;

        const decision = state.getModerationDecision(post, opts);
        const ui = decision.ui("contentView");

        // Show warning if content has alerts or informs
        return ui.alert || ui.inform;
      },
    }),
    {
      name: "moderation-store",
      partialize: (state) => ({
        showContentWarnings: state.showContentWarnings,
      }),
    }
  )
);
