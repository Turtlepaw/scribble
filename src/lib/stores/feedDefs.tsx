import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BasicFeedItem {
  displayName: string;
}

type FeedDefsState = {
  feeds: Record<string, BasicFeedItem>;
  setFeedDef: (id: string, feed: BasicFeedItem) => void;
};

export const useFeedDefsStore = create<FeedDefsState>()(
  persist(
    (set) => ({
      feeds: {},
      setFeedDef: (id, feed) =>
        set((state) => ({
          feeds: {
            ...state.feeds,
            [id]: feed,
          },
        })),
    }),
    {
      name: "feed-defs",
      partialize: (state) => ({
        feeds: state.feeds, // Only persist this part
      }),
    }
  )
);
