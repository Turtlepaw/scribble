import { useState, useEffect, useCallback, useMemo } from "react";
import { AtUri } from "@atproto/api";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { Agent } from "@atproto/api";
import { getAllPosts } from "@/lib/records";
import { usePostsStore, BoardPostsData } from "@/lib/stores/posts";

import { BoardItem } from "../stores/boardItems";

export interface UseBoardPostsOptions {
  itemsInBoard: [string, BoardItem][]; // [rkey, BoardItem]
  agent: Agent | null;
  pageSize: number;
  enabled: boolean;
  boardKey: string;
}

export interface UseBoardPostsReturn {
  posts: [number, PostView][];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  error: Error | null;
  isStale: boolean;
}

export function useBoardPosts({
  itemsInBoard,
  agent,
  pageSize,
  enabled,
  boardKey,
}: UseBoardPostsOptions): UseBoardPostsReturn {
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { setBoardPosts, appendBoardPosts, checkCache, refreshCache } =
    usePostsStore();

  // Subscribe to the cache entry so component re-renders when it changes
  const cacheEntry = usePostsStore((s) =>
    boardKey ? s.boards.get(boardKey) ?? null : null
  );

  // Check cache status
  const cacheResult = useMemo(() => {
    return boardKey ? checkCache(boardKey) : null;
  }, [boardKey, checkCache]);

  const isStale = cacheResult?.stale ?? false;
  const isExpired = cacheResult?.expired ?? false;

  // Get posts from cache for pages 0..currentPage
  const posts = useMemo(() => {
    if (!boardKey || !cacheEntry) return [];

    const all = cacheEntry.data.posts;
    const end = Math.min((currentPage + 1) * pageSize, all.length);
    return all
      .slice(0, end)
      .map(({ post, index }) => [index, post] as [number, PostView]);
  }, [boardKey, cacheEntry, currentPage, pageSize]);

  // Calculate pagination info
  const totalPages = useMemo(() => {
    // Derive from live itemsInBoard length so we don't freeze totalPages at initial fetch
    return Math.ceil(itemsInBoard.length / pageSize) || 0;
  }, [itemsInBoard.length, pageSize]);
  const hasMore = currentPage < totalPages - 1;

  // Create fetch function for refreshCache
  const createFetchFunction = useCallback(
    (targetPage: number) => {
      return async (): Promise<BoardPostsData | null> => {
        if (!agent || !boardKey || itemsInBoard.length === 0) {
          return null;
        }

        try {
          // Calculate which items to load for this page
          const startIndex = targetPage * pageSize;
          const endIndex = Math.min(startIndex + pageSize, itemsInBoard.length);
          const pageItems = itemsInBoard.slice(startIndex, endIndex);

          if (pageItems.length === 0) {
            return null;
          }

          // Extract canonical URIs and dedupe to minimize API calls
          const canonicalUris = pageItems.map(
            ([, item]) => item.url.split("?")[0]
          );
          const uniqueAtUris = Array.from(new Set(canonicalUris)).map(
            (u) => new AtUri(u)
          );

          console.log(
            `Fetching page ${targetPage}: ${canonicalUris.length} items (${uniqueAtUris.length} unique posts)`
          );

          // Fetch unique posts
          const fetchedPosts = await getAllPosts({
            posts: uniqueAtUris,
            agent,
          });

          // Build a map for quick lookup
          const postByUri = new Map(fetchedPosts.map((p) => [p.uri, p]));

          // Rebuild result preserving duplicates and per-image index from saved board item URL
          const postsWithIndex = pageItems
            .map(([, item]) => {
              const cleanUrl = item.url.split("?")[0];
              const post = postByUri.get(cleanUrl);
              if (!post) return null;

              // Extract ?image=<n> from the saved URL (query on at:// string)
              let imageIndex = 0;
              const qs = item.url.split("?")[1];
              if (qs) {
                const sp = new URLSearchParams(qs);
                const v = sp.get("image");
                if (v != null) imageIndex = Number(v) || 0;
              }

              return { post, index: imageIndex };
            })
            .filter((v): v is { post: PostView; index: number } => v !== null);

          return {
            posts: postsWithIndex,
            totalItems: itemsInBoard.length,
            loadedPages: [targetPage],
          };
        } catch (err) {
          console.error(`Error fetching page ${targetPage}:`, err);
          throw err;
        }
      };
    },
    [agent, boardKey, itemsInBoard, pageSize]
  );

  // Load posts for a specific page
  const loadPage = useCallback(
    async (page: number, isInitial = false, force = false) => {
      if (!enabled || !agent || !boardKey || itemsInBoard.length === 0) {
        return;
      }

      // Check if page is already cached and not forcing refresh
      const hasPage = cacheEntry?.data.loadedPages.includes(page) ?? false;
      if (hasPage && !force && !isInitial) {
        return;
      }

      const setLoadingState = isInitial ? setIsLoading : setIsLoadingMore;
      setLoadingState(true);
      setError(null);

      try {
        const shouldRefresh = page === 0 && (force || isExpired || !hasPage);
        if (shouldRefresh) {
          // Page 0 – replace cache via refresh
          await refreshCache(
            boardKey,
            createFetchFunction(page),
            cacheResult || undefined
          );
        } else {
          // Page > 0 – fetch and append
          const fetchFunction = createFetchFunction(page);
          const result = await fetchFunction();

          if (result && result.posts.length > 0) {
            const postsWithIndex: [number, PostView][] = result.posts.map(
              ({ post, index }) => [index, post]
            );

            if (page === 0) {
              setBoardPosts(
                boardKey,
                postsWithIndex,
                page,
                pageSize,
                result.totalItems
              );
            } else {
              appendBoardPosts(boardKey, postsWithIndex, page);
            }
          }
        }
      } catch (err) {
        console.error(`Error loading page ${page}:`, err);
        setError(
          err instanceof Error ? err : new Error("Failed to load posts")
        );
      } finally {
        setLoadingState(false);
      }
    },
    [
      enabled,
      agent,
      boardKey,
      itemsInBoard,
      pageSize,
      cacheEntry?.data.loadedPages,
      refreshCache,
      createFetchFunction,
      setBoardPosts,
      appendBoardPosts,
      cacheResult,
      isExpired,
    ]
  );

  // Load more posts (next page)
  const loadMore = useCallback(async () => {
    const firstPageReady = cacheEntry?.data.loadedPages.includes(0) ?? false;
    if (isLoadingMore || !hasMore || isLoading || !firstPageReady) return;

    const nextPage = currentPage + 1;
    await loadPage(nextPage);
    setCurrentPage(nextPage);
  }, [
    currentPage,
    hasMore,
    isLoadingMore,
    isLoading,
    cacheEntry?.data.loadedPages,
    loadPage,
  ]);

  // Refresh all data
  const refresh = useCallback(async () => {
    if (!boardKey) return;

    setCurrentPage(0);
    setError(null);
    await loadPage(0, true, true); // Force refresh
  }, [boardKey, loadPage]);

  // Load initial page when enabled
  useEffect(() => {
    if (enabled && boardKey) {
      const needsLoad =
        !cacheEntry ||
        isExpired ||
        !(cacheEntry.data.loadedPages || []).includes(0);
      if (needsLoad) {
        setCurrentPage(0);
        loadPage(0, true, isExpired);
      }
    }
  }, [enabled, boardKey, cacheEntry, isExpired, loadPage]);

  // Auto-refresh stale data in background
  useEffect(() => {
    if (enabled && boardKey && isStale && !isLoading && !isLoadingMore) {
      // Background refresh for stale data
      loadPage(0, false, true);
    }
  }, [enabled, boardKey, isStale, isLoading, isLoadingMore, loadPage]);

  // Update loading state
  useEffect(() => {
    if (enabled && boardKey && posts.length === 0 && !cacheEntry) {
      setIsLoading(true);
    } else if (!isLoading) {
      setIsLoading(false);
    }
  }, [enabled, boardKey, posts.length, cacheEntry, isLoading]);

  return {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    currentPage,
    totalPages,
    loadMore,
    refresh,
    error,
    isStale,
  };
}
