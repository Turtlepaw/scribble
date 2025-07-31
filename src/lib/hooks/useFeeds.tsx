import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useFeedDefsStore } from "../stores/feedDefs";
import { AtUri } from "@atproto/api";

export function useFeeds() {
  const { agent } = useAuth();
  const store = useFeedDefsStore();
  const [isLoading, setLoading] = useState(store.feeds == null);

  useEffect(() => {
    if (agent == null) return;
    const loadFeeds = async () => {
      try {
        const prefs = await agent.getPreferences();
        if (prefs?.savedFeeds == null) return;

        for (const feed of prefs.savedFeeds) {
          if (!feed.value.startsWith("at")) continue;
          const urip = AtUri.make(feed.value);

          console.log("host", urip.host);
          if (!urip.host.startsWith("did:")) {
            const res = await agent.resolveHandle({ handle: urip.host });
            urip.host = res.data.did;
          }

          console.log("Fetching feed defs", feed);
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
      } finally {
        setLoading(false);
      }
    };
    loadFeeds();
  }, [agent]);

  return { isLoading };
}
