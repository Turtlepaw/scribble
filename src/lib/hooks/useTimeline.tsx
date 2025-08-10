// lib/hooks/useFetchTimeline.ts
import { useEffect, useRef, useCallback, useState } from "react";
import { AppBskyEmbedImages } from "@atproto/api";
import { useAuth } from "@/lib/hooks/useAuth";
import { useFeedStore } from "../stores/feeds";
import { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";

function filterPosts(posts: FeedViewPost[], seenPosts: Set<string>) {
  return posts.filter((it) => {
    if (
      !(
        AppBskyEmbedImages.isMain(it.post.embed) ||
        AppBskyEmbedImages.isView(it.post.embed)
      )
    )
      return false;

    if (seenPosts.has(it.post.uri)) return false;
    seenPosts.add(it.post.uri);

    return true;
  });
}

export function useFetchTimeline() {
  const { agent } = useAuth();
  const {
    timeline,
    appendTimeline,
    setTimelineLoading,
    setCustomFeedLoading,
    customFeeds,
    appendCustomFeed,
  } = useFeedStore();
  const seenImageUrls = useRef<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const pendingFeedRequests = useRef<Set<string>>(new Set());
  // Use a ref to track the latest agent value
  const agentRef = useRef(agent);
  // Track processing state to avoid loops
  const isProcessingRequests = useRef(false);
  const processingRetries = useRef(0);

  // Update the ref when agent changes
  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  const fetchFeed = useCallback(
    async (feed?: string | undefined) => {
      console.log("loading", feed);

      // Use the latest agent from the ref
      const currentAgent = agentRef.current;

      // If not ready, queue the request for later
      if (!currentAgent) {
        console.log(
          "Agent not available, queuing feed request for later:",
          feed || "main"
        );
        pendingFeedRequests.current.add(feed || "main");
        return;
      }

      // Check if we're already loading the timeline
      if (
        (feed && customFeeds?.[feed]?.isLoading) ||
        (!feed && timeline.isLoading)
      ) {
        console.log("Already loading feed, skipping fetch");
        return;
      }

      if (feed) {
        setCustomFeedLoading(feed, true);
      } else setTimelineLoading(true);

      try {
        if (feed && feed != "timeline") {
          const cursor = customFeeds?.[feed]?.cursor ?? undefined;
          console.log(`Fetching ${feed} with cursor ${cursor}`);

          const response = feed.includes("list")
            ? await currentAgent.app.bsky.feed.getListFeed({
                cursor: cursor,
                limit: 100,
                list: feed,
              })
            : await currentAgent.app.bsky.feed.getFeed({
                cursor: cursor,
                limit: 100,
                feed: feed,
              });

          if (!response.success) throw new Error("Failed to fetch timeline");
          const filtered = filterPosts(
            response.data.feed,
            seenImageUrls.current
          ).map((it) => it.post);
          console.log(`Feed ${feed} loaded with ${filtered.length} items`);
          appendCustomFeed(feed, filtered, response.data.cursor);
        } else {
          const response = await currentAgent.getTimeline({
            cursor: timeline.cursor,
            limit: 100,
          });
          if (!response.success) throw new Error("Failed to fetch timeline");

          const newCursor = response.data.cursor;

          const filtered = filterPosts(
            response.data.feed,
            seenImageUrls.current
          );

          appendTimeline(filtered, newCursor);
        }
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        if (feed) {
          setCustomFeedLoading(feed, false);
        } else setTimelineLoading(false);
      }
    },
    [
      timeline,
      customFeeds,
      appendCustomFeed,
      appendTimeline,
      setTimelineLoading,
      setCustomFeedLoading,
    ]
  );

  // Process any queued feed requests
  const processPendingRequests = useCallback(async () => {
    // Prevent reentrant processing
    if (isProcessingRequests.current) {
      console.log("Already processing requests, skipping");
      return;
    }

    // If agent isn't ready, try again later
    if (!agentRef.current) {
      if (processingRetries.current < 5) {
        processingRetries.current++;
        console.log(
          `Agent not ready for processing, will retry (${processingRetries.current}/5)`
        );
        setTimeout(() => processPendingRequests(), 1000);
      } else {
        console.log("Max retries reached, clearing pending requests");
        pendingFeedRequests.current.clear();
        processingRetries.current = 0;
      }
      return;
    }

    // Reset retries counter
    processingRetries.current = 0;

    const requests = Array.from(pendingFeedRequests.current);
    if (requests.length === 0) return;

    console.log(`Processing ${requests.length} pending feed requests`);

    // Mark as processing and clear the queue
    isProcessingRequests.current = true;
    pendingFeedRequests.current.clear();

    try {
      for (const feed of requests) {
        await fetchFeed(feed === "main" ? undefined : feed);
      }
    } finally {
      isProcessingRequests.current = false;
    }
  }, [fetchFeed]);

  // Effect to initialize feed once agent is available
  useEffect(() => {
    if (!agent) {
      console.log("Waiting for agent to become available");
      return;
    }

    console.log("Agent detected, setting ready state");
    setIsReady(true);

    // Give a small delay for agent to fully initialize
    setTimeout(() => {
      if (isInitialized) {
        // Process any pending requests when agent becomes available
        processPendingRequests();
        return;
      }

      const loadMinimum = async () => {
        setIsInitialized(true);
        console.log("Agent available, loading initial feed");

        // Process any pending requests first
        await processPendingRequests();

        // Then load the minimum required images
        let attempts = 0;
        while (
          timeline.posts.flatMap(
            (p) => (p.post.embed as AppBskyEmbedImages.View)?.images || []
          ).length < 30 &&
          attempts < 3
        ) {
          await fetchFeed();
          attempts++;
          if (!timeline.cursor) break;
        }
      };

      loadMinimum();
    }, 500); // Small delay to ensure agent is fully initialized
  }, [agent, isInitialized, processPendingRequests, fetchFeed, timeline.posts]);

  return { fetchFeed, isReady };
}
