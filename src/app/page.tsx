"use client";

import { Feed } from "@/components/Feed";
import { useFetchTimeline } from "@/lib/hooks/useTimeline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRef, useEffect } from "react";
import { useFeedStore } from "@/lib/stores/feeds";
import { useFeeds } from "@/lib/hooks/useFeeds";
import { LoaderCircle } from "lucide-react";
import { useFeedDefsStore } from "@/lib/stores/feedDefs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/useAuth";

export default function Home() {
  const { fetchFeed } = useFetchTimeline();
  const feedStore = useFeedStore();
  const { isLoading } = useFeeds();
  const { feeds } = useFeedDefsStore();
  const { session } = useAuth();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchFeed();
        }
      },
      { rootMargin: "200px" }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [fetchFeed]);

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

  if (isLoading)
    return (
      <div className="flex justify-center py-6 text-sm text-black/70 dark:text-white/70">
        <LoaderCircle className="animate-spin" />
      </div>
    );

  return (
    <main className="px-5">
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList
          className="flex w-full overflow-x-auto whitespace-nowrap no-scrollbar px-4 space-x-4"
          style={{ justifyItems: "unset" }}
        >
          <TabsTrigger value="timeline" className="shrink-0 ml-10">
            Timeline
          </TabsTrigger>
          {Object.entries(feeds).map(([value, it]) => (
            <TabsTrigger key={value} value={value} className="shrink-0">
              {it?.displayName}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="timeline">
          <Feed
            feed={feedStore.timeline.posts.map((it) => it.post)}
            isLoading={feedStore.timeline.isLoading}
          />
        </TabsContent>

        {Object.entries(feeds).map(([value]) => (
          <TabsContent key={value} value={value}></TabsContent>
        ))}
      </Tabs>

      <div ref={sentinelRef} className="h-1" />
    </main>
  );
}
