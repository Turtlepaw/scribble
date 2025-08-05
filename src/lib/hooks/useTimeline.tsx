// lib/hooks/useFetchTimeline.ts
import { useEffect, useRef, useCallback, Ref } from "react";
import { AppBskyEmbedImages, AtUri } from "@atproto/api";
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

  const fetchFeed = useCallback(
    async (feed?: string | undefined) => {
      console.log("loading", feed);
      if (!agent || timeline.isLoading) return;
      if (feed) {
        setCustomFeedLoading(feed, true);
      } else setTimelineLoading(true);
      try {
        if (feed && feed != "timeline") {
          const cursor = customFeeds?.[feed]?.cursor ?? undefined;
          const response = feed.includes("list")
            ? await agent.app.bsky.feed.getListFeed({
                cursor: cursor,
                limit: 100,
                list: feed,
              })
            : await agent.app.bsky.feed.getFeed({
                cursor: cursor,
                limit: 100,
                feed: feed,
              });

          if (!response.success) throw new Error("Failed to fetch timeline");
          const filtered = filterPosts(
            response.data.feed,
            seenImageUrls.current
          ).map((it) => it.post);
          console.log("feed", filtered);
          appendCustomFeed(feed, filtered, response.data.cursor);
        } else {
          const response = await agent.getTimeline({
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
    [agent, timeline, customFeeds]
  );

  useEffect(() => {
    const loadMinimum = async () => {
      while (
        timeline.posts.flatMap(
          (p) => (p.post.embed as AppBskyEmbedImages.View)?.images || []
        ).length < 30
      ) {
        await fetchFeed();
        if (!timeline.cursor) break;
      }
    };
    loadMinimum();
  }, [agent]);

  return { fetchFeed };
}
