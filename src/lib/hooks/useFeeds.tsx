import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useFeedDefsStore } from "../stores/feedDefs";
import { AtUri } from "@atproto/api";

// How long the cache stays fresh (30 minutes by default)
const CACHE_DURATION = 30 * 60 * 1000;

export function useFeeds() {
  const { agent } = useAuth();
  const store = useFeedDefsStore();
  const [isLoading, setLoading] = useState(store.feeds == null);

  useEffect(() => {
    if (agent == null) return;

    // Use cached data immediately if available
    if (store.feeds != null) {
      setLoading(false);
    }

    // Check if we need to refresh the data
    const lastFetchedAt = localStorage.getItem("feedsLastFetchedAt");
    const now = Date.now();
    const isStale =
      !lastFetchedAt || now - parseInt(lastFetchedAt) > CACHE_DURATION;

    // Skip fetching if data is fresh
    if (!isStale && store.feeds != null) return;

    const loadFeeds = async () => {
      // Only show loading state if we have no cached data
      const isBackgroundRefresh = store.feeds != null;
      if (!isBackgroundRefresh) {
        setLoading(true);
      }

      try {
        const prefs = await agent.getPreferences();
        if (prefs?.savedFeeds == null) return;

        for (const feed of prefs.savedFeeds) {
          if (!feed.value.startsWith("at")) continue;
          const urip = AtUri.make(feed.value);

          if (!urip.host.startsWith("did:")) {
            const res = await agent.resolveHandle({ handle: urip.host });
            urip.host = res.data.did;
          }

          if (feed.type == "feed") {
            const feedDef = await agent.app.bsky.feed.getFeedGenerators({
              feeds: [urip.toString()],
            });

            store.setFeedDef(feed.value, feedDef.data.feeds[0]);
          } else if (feed.type == "list") {
            const listDef = await agent.app.bsky.graph.getList({
              list: urip.toString(),
            });

            store.setFeedDef(feed.value, {
              displayName: listDef.data.list.name,
            });
          }
        }

        // Update the last fetched timestamp
        localStorage.setItem("feedsLastFetchedAt", now.toString());
      } finally {
        setLoading(false);
      }
    };

    loadFeeds();
  }, [agent]);

  return { isLoading };
}
