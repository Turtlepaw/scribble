import { AppBskyFeedDefs } from "@atproto/api";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { create } from "zustand";
import { combine } from "zustand/middleware";

type Post = AppBskyFeedDefs.FeedViewPost;

type FeedState = {
  posts: PostView[];
  isLoading: boolean;
  cursor?: string;
};

type FeedMap = Record<string, FeedState>;

export const useFeedStore = create(
  combine(
    {
      timeline: {
        posts: [] as Post[],
        isLoading: false,
        cursor: undefined as string | undefined,
      },
      customFeeds: {} as FeedMap,
    },
    (set, get) => ({
      // TIMELINE METHODS
      setTimeline: (posts: Post[], cursor?: string) =>
        set({
          timeline: {
            posts,
            isLoading: false,
            cursor,
          },
        }),

      appendTimeline: (newPosts: Post[], cursor?: string) =>
        set((state) => {
          const existing = state.timeline.posts;
          const deduped = [
            ...existing,
            ...newPosts.filter(
              (p) => !existing.some((ep) => ep.post.uri === p.post.uri)
            ),
          ];
          return {
            timeline: {
              posts: deduped,
              isLoading: false,
              cursor,
            },
          };
        }),

      setTimelineLoading: (isLoading: boolean) =>
        set((state) => ({
          timeline: {
            ...state.timeline,
            isLoading,
          },
        })),

      // CUSTOM FEED METHODS
      setCustomFeed: (feedId: string, posts: PostView[], cursor?: string) =>
        set((state) => ({
          customFeeds: {
            ...state.customFeeds,
            [feedId]: {
              posts,
              isLoading: false,
              cursor,
            },
          },
        })),

      appendCustomFeed: (
        feedId: string,
        newPosts: PostView[],
        cursor?: string
      ) => {
        const current = get().customFeeds[feedId] || {
          posts: [],
          isLoading: false,
          cursor: undefined,
        };
        const deduped = [
          ...current.posts,
          ...newPosts.filter(
            (p) => !current.posts.some((ep) => ep.uri === p.uri)
          ),
        ];
        set((state) => ({
          customFeeds: {
            ...state.customFeeds,
            [feedId]: {
              posts: deduped,
              isLoading: false,
              cursor,
            },
          },
        }));
      },

      setCustomFeedLoading: (feedId: string, isLoading: boolean) => {
        const current = get().customFeeds[feedId] || {
          posts: [],
          isLoading: false,
          cursor: undefined,
        };
        set((state) => ({
          customFeeds: {
            ...state.customFeeds,
            [feedId]: {
              ...current,
              isLoading,
            },
          },
        }));
      },
    })
  )
);
