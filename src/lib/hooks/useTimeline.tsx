// lib/hooks/useFetchTimeline.ts
import { useEffect, useRef, useCallback } from "react";
import { AppBskyEmbedImages } from "@atproto/api";
import { useAuth } from "@/lib/useAuth";
import { useFeedStore } from "../stores/feeds";

export function useFetchTimeline() {
  const { agent } = useAuth();
  const { timeline, setTimeline, appendTimeline, setTimelineLoading } =
    useFeedStore();
  const seenImageUrls = useRef<Set<string>>(new Set());

  const fetchFeed = useCallback(async () => {
    if (!agent || timeline.isLoading) return;
    setTimelineLoading(true);
    try {
      const response = await agent.getTimeline({
        cursor: timeline.cursor,
        limit: 100,
      });
      if (!response.success) throw new Error("Failed to fetch timeline");

      const newCursor = response.data.cursor;

      const filtered = response.data.feed.filter((it) => {
        if (it.reason?.$type === "app.bsky.feed.defs#reasonRepost")
          return false;
        if (
          !(
            AppBskyEmbedImages.isMain(it.post.embed) ||
            AppBskyEmbedImages.isView(it.post.embed)
          )
        )
          return false;

        const images = (it.post.embed as AppBskyEmbedImages.View)?.images || [];
        const hasNew = images.some(
          (img) => !seenImageUrls.current.has(img.fullsize)
        );
        if (!hasNew) return false;

        images.forEach((img) => seenImageUrls.current.add(img.fullsize));
        return true;
      });

      appendTimeline(filtered, newCursor);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setTimelineLoading(false);
    }
  }, [agent, timeline]);

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
