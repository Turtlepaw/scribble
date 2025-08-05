"use client";

import { Feed, feedAsMap } from "@/components/Feed";
import { useFetchTimeline } from "@/lib/hooks/useTimeline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRef, useEffect, useState } from "react";
import { useFeedStore } from "@/lib/stores/feeds";
import { useFeeds } from "@/lib/hooks/useFeeds";
import { LoaderCircle } from "lucide-react";
import { useFeedDefsStore } from "@/lib/stores/feedDefs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/hooks/useAuth";
import { useBoards } from "@/lib/hooks/useBoards";

export default function Home() {
  const { fetchFeed } = useFetchTimeline();
  const feedStore = useFeedStore();
  const { isLoading } = useFeeds();
  const { feeds, defaultFeed, setDefaultFeed } = useFeedDefsStore();
  const { session, loading } = useAuth();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [feed, setFeed] = useState<"timeline" | string>(
    defaultFeed ?? "timeline"
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchFeed(feed);
        }
      },
      { rootMargin: "200px" }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [fetchFeed, feed]);

  useEffect(() => {
    fetchFeed(feed);
  }, [feed]);

  if (session == null) {
    return (
      <div className="items-center justify-items-center text-center">
        <h1 className="text-lg mb-0.5 font-medium">
          You&apos;re not logged in
        </h1>
        <p>Log in to see your feeds</p>
      </div>
    );
  }

  if (isLoading || loading)
    return (
      <div className="flex justify-center py-6 text-sm text-black/70 dark:text-white/70">
        <LoaderCircle className="animate-spin" />
      </div>
    );

  const triggerClass =
    "shrink-0 cursor-pointer dark:hover:bg-white/5 hover:bg-black/5 transition-colors";
  return (
    <main className="px-5">
      <Tabs defaultValue={defaultFeed} className="w-full">
        <TabsList
          className="overflow-x-auto w-full justify-start" //"flex w-full overflow-x-auto whitespace-nowrap no-scrollbar pl-10 pr-4 space-x-4"
          style={{ justifyItems: "unset" }}
        >
          <TabsTrigger
            onClick={() => {
              setFeed("timeline");
              setDefaultFeed("timeline");
            }}
            value="timeline"
            className={triggerClass}
          >
            Timeline
          </TabsTrigger>
          {Object.entries(feeds).map(([value, it]) => (
            <TabsTrigger
              onClick={() => {
                setFeed(value);
                setDefaultFeed(value);
              }}
              key={value}
              value={value}
              className={triggerClass}
            >
              {it?.displayName}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="timeline">
          <Feed
            feed={feedAsMap(feedStore.timeline.posts.map((it) => it.post))}
            isLoading={feedStore.timeline.isLoading}
          />
        </TabsContent>

        {Object.entries(feeds)
          .filter((it) => feedStore.customFeeds?.[it[0]] != null)
          .map(([value]) => (
            <TabsContent key={value} value={value}>
              <Feed
                feed={feedAsMap(feedStore.customFeeds[value].posts)}
                isLoading={feedStore.customFeeds[value].isLoading}
              />
            </TabsContent>
          ))}
      </Tabs>

      <div ref={sentinelRef} className="h-1" />
    </main>
  );
}
