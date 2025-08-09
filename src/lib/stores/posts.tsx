import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { createMapStorage } from "../utils/mapStorage";

// Cache policy
const STALE_AFTER = 5 * 60 * 1000; // 5 minutes
const EXPIRE_AFTER = 60 * 60 * 1000; // 1 hour

export interface PostWithIndex {
  post: PostView;
  // 'index' is the image index to render, NOT a sort key. Do not sort by this.
  index: number;
}

export interface BoardPostsData {
  posts: PostWithIndex[];
  totalItems: number;
  loadedPages: number[];
}

export interface CacheResult {
  boardKey: string;
  data: BoardPostsData;
  updatedAt: number;
  stale: boolean;
  expired: boolean;
}

export interface PostsCache {
  boards: Map<string, CacheResult>;
  setBoardPosts: (
    boardKey: string,
    posts: [number, PostView][],
    page: number,
    pageSize: number,
    totalItems: number
  ) => CacheResult;
  getBoardPosts: (
    boardKey: string,
    page: number,
    pageSize: number
  ) => [number, PostView][];
  checkCache: (boardKey: string) => CacheResult | null;
  refreshCache: (
    boardKey: string,
    fetchFn: () => Promise<BoardPostsData | null>,
    prev?: CacheResult
  ) => Promise<void>;
  appendBoardPosts: (
    boardKey: string,
    posts: [number, PostView][],
    page: number
  ) => CacheResult | null;
  hasCachedPage: (boardKey: string, page: number) => boolean;
  getTotalPages: (boardKey: string, pageSize: number) => number;
  clearEntry: (boardKey: string) => void;
  clear: () => void;
}

function makeKey(p: PostWithIndex) {
  return `${p.post.uri}#${p.index}`;
}

export const usePostsStore = create<PostsCache>()(
  persist(
    (set, get) => ({
      boards: new Map(),

      setBoardPosts: (boardKey, posts, page, pageSize, totalItems) => {
        const now = Date.now();
        const newPosts = posts.map(([index, post]) => ({ post, index }));

        const existingEntry = get().boards.get(boardKey);
        let combined: PostWithIndex[] = [];
        let loadedPages: number[] = [];

        if (!existingEntry) {
          combined = [...newPosts];
          loadedPages = [page];
        } else if (page === 0) {
          // Replace only page 0 segment: prepend new posts, keep existing non-duplicated after
          const existing = existingEntry.data.posts;
          const seenNew = new Set(newPosts.map((p) => makeKey(p)));
          const rest = existing.filter((p) => !seenNew.has(makeKey(p)));
          combined = [...newPosts, ...rest];
          loadedPages = Array.from(
            new Set([0, ...(existingEntry.data.loadedPages || [])])
          );
        } else {
          const existing = existingEntry.data.posts;
          const seen = new Set(existing.map((p) => makeKey(p)));
          const dedupNew = newPosts.filter((p) => !seen.has(makeKey(p)));
          combined = [...existing, ...dedupNew];
          loadedPages = Array.from(
            new Set([...(existingEntry.data.loadedPages || []), page])
          );
        }

        const entry: CacheResult = {
          boardKey,
          data: {
            posts: combined,
            totalItems,
            loadedPages,
          },
          updatedAt: now,
          stale: false,
          expired: false,
        };

        set((state) => ({
          boards: new Map(state.boards).set(boardKey, entry),
        }));

        return entry;
      },

      appendBoardPosts: (boardKey, posts, page) => {
        const existingEntry = get().boards.get(boardKey);
        if (!existingEntry) return null;

        const now = Date.now();
        const newPosts = posts.map(([index, post]) => ({ post, index }));

        // Preserve order and dedupe by (uri, index)
        const existing = existingEntry.data.posts;
        const seen = new Set(existing.map((p) => makeKey(p)));
        const toAdd = newPosts.filter((p) => !seen.has(makeKey(p)));
        const combined = [...existing, ...toAdd];

        const loadedPages = Array.from(
          new Set([...(existingEntry.data.loadedPages || []), page])
        );

        const entry: CacheResult = {
          ...existingEntry,
          data: {
            ...existingEntry.data,
            posts: combined,
            loadedPages,
          },
          updatedAt: now,
          stale: false,
          expired: false,
        };

        set((state) => ({
          boards: new Map(state.boards).set(boardKey, entry),
        }));

        return entry;
      },

      getBoardPosts: (boardKey, page, pageSize) => {
        const entry = get().boards.get(boardKey);
        if (!entry) return [];

        const startIndex = page * pageSize;
        const endIndex = startIndex + pageSize;

        return entry.data.posts
          .slice(startIndex, endIndex)
          .map(({ post, index }) => [index, post] as [number, PostView]);
      },

      checkCache: (boardKey) => {
        const entry = get().boards.get(boardKey);
        if (!entry) return null;

        const now = Date.now();
        const age = now - entry.updatedAt;
        const stale = age > STALE_AFTER;
        const expired = age > EXPIRE_AFTER;

        if (stale !== entry.stale || expired !== entry.expired) {
          const updated: CacheResult = {
            ...entry,
            stale,
            expired,
          };

          set((state) => ({
            boards: new Map(state.boards).set(boardKey, updated),
          }));

          return updated;
        }

        return entry;
      },

      refreshCache: async (
        boardKey: string,
        fetchFn: () => Promise<BoardPostsData | null>,
        prev?: CacheResult
      ) => {
        try {
          const data = await fetchFn();
          if (data) {
            const now = Date.now();
            const entry: CacheResult = {
              boardKey,
              data,
              updatedAt: now,
              stale: false,
              expired: false,
            };

            set((state) => ({
              boards: new Map(state.boards).set(boardKey, entry),
            }));
          } else if (prev) {
            // Keep existing but mark as expired
            set((state) => {
              const updated: CacheResult = {
                ...prev,
                stale: true,
                expired: true,
              };
              return {
                boards: new Map(state.boards).set(boardKey, updated),
              };
            });
          } else {
            get().clearEntry(boardKey);
          }
        } catch {
          // Network or validation failure — don't overwrite unless necessary
        }
      },

      hasCachedPage: (boardKey, page) => {
        try {
          const entry = get().boards.get(boardKey);
          return entry?.data.loadedPages.includes(page) ?? false;
        } catch (err) {
          console.error("Failed to check cached page", err);
          return false;
        }
      },

      getTotalPages: (boardKey, pageSize) => {
        const entry = get().boards.get(boardKey);
        if (!entry) return 0;
        return Math.ceil(entry.data.totalItems / pageSize);
      },

      clearEntry: (boardKey) => {
        set((state) => {
          const map = new Map(state.boards);
          map.delete(boardKey);
          return { boards: map };
        });
      },

      clear: () => {
        set(() => ({ boards: new Map() }));
      },
    }),
    {
      name: "posts",
      partialize: (state) => ({
        boards: state.boards,
      }),
      storage: createMapStorage("boards"),
    }
  )
);
