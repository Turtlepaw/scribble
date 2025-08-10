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
  const { agent, session } = useAuth();
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
  const sessionRef = useRef(session);
  // Track processing state to avoid loops
  const isProcessingRequests = useRef(false);
  const processingRetries = useRef(0);
  const authenticationRetries = useRef(0);
  const [forceRetry, setForceRetry] = useState(0);

  // Update the refs when agent or session changes
  useEffect(() => {
    agentRef.current = agent;
    sessionRef.current = session;

    // If session exists but agent doesn't have session, trigger a retry
    if (session && agent && !agent.did) {
      console.log(
        "Session exists but agent doesn't have it attached yet, scheduling retry"
      );
      const retryTimeout = setTimeout(() => {
        setForceRetry((prev) => prev + 1);
      }, 500);
      return () => clearTimeout(retryTimeout);
    }
  }, [agent, session]);

  const isAuthenticated = useCallback(() => {
    // Check both ways: either agent has session or we have separate session
    return (
      (agentRef.current && agentRef.current.did) ||
      (agentRef.current && sessionRef.current)
    );
  }, []);

  const fetchFeed = useCallback(
    async (feed?: string | undefined) => {
      console.log("loading", feed);

      // Use the latest agent from the ref
      const currentAgent = agentRef.current;

      // Enhanced authentication check
      const authenticated = isAuthenticated();

      // If not ready or not authenticated, queue the request for later
      if (!currentAgent || !authenticated) {
        console.log(
          `Agent not available or not authenticated, queuing feed request for later: ${
            feed || "main"
          }`,
          `Agent: ${!!currentAgent}, Auth: ${authenticated}`
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
      isAuthenticated,
    ]
  );

  // Process any queued feed requests
  const processPendingRequests = useCallback(async () => {
    // Prevent reentrant processing
    if (isProcessingRequests.current) {
      console.log("Already processing requests, skipping");
      return;
    }

    // Enhanced authentication check
    const authenticated = isAuthenticated();

    // If agent isn't ready or not authenticated, try again later
    if (!agentRef.current || !authenticated) {
      if (processingRetries.current < 5) {
        processingRetries.current++;
        console.log(
          `Agent not ready or not authenticated for processing, will retry (${processingRetries.current}/5)`,
          `Agent: ${!!agentRef.current}, Auth: ${authenticated}`
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
  }, [fetchFeed, isAuthenticated]);

  // Try to load feeds even if there are authentication issues
  useEffect(() => {
    if (authenticationRetries.current >= 3) return;

    if (agent && session && !isReady) {
      console.log(
        "Attempting to force feed load despite authentication issues"
      );
      authenticationRetries.current++;

      setTimeout(() => {
        setIsReady(true);
        processPendingRequests();
      }, 1000 * authenticationRetries.current);
    }
  }, [agent, session, isReady, processPendingRequests, forceRetry]);

  // Effect to initialize feed once agent is available and authenticated
  useEffect(() => {
    if (!agent) {
      console.log("Waiting for agent to become available");
      return;
    }

    // Enhanced authentication check
    const authenticated = isAuthenticated();

    if (!authenticated) {
      console.log(
        `Agent available but not authenticated, waiting for session. Session ref: ${!!sessionRef.current}`
      );
      return;
    }

    console.log("Authenticated agent detected, setting ready state");
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
        console.log("Authenticated agent available, loading initial feed");

        try {
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
        } catch (err) {
          console.error("Error during initial feed loading:", err);
        }
      };

      loadMinimum();
    }, 500); // Small delay to ensure agent is fully initialized
  }, [
    agent,
    agent?.did,
    isInitialized,
    processPendingRequests,
    fetchFeed,
    timeline.posts,
    isAuthenticated,
    forceRetry,
  ]);

  return { fetchFeed, isReady };
}
