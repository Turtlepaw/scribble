"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/useAuth";
import {
  AppBskyEmbedImages,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from "@atproto/api";
import { LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function Home() {
  const [timeline, setTimeline] = useState<AppBskyFeedDefs.FeedViewPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { agent } = useAuth();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const seenImageUrls = new Set<string>();

  const fetchFeed = useCallback(async () => {
    if (!agent || loading) return [];
    setLoading(true);
    try {
      const response = await agent.getTimeline({
        cursor: cursor ?? undefined,
        limit: 100,
      });
      if (!response.success) throw new Error("Failed to fetch timeline");

      const nextCursor = response.data.cursor || null;
      setCursor(nextCursor);

      const filtered = response.data.feed.filter((it) => {
        // Filter out reposts
        if (it.reason?.$type === "app.bsky.feed.defs#reasonRepost")
          return false;

        // Must be an image embed
        if (
          !(
            AppBskyEmbedImages.isMain(it.post.embed) ||
            AppBskyEmbedImages.isView(it.post.embed)
          )
        ) {
          return false;
        }

        // Check for new image URLs (to avoid repeats)
        const images = (it.post.embed as AppBskyEmbedImages.View)?.images || [];
        const hasNewImage = images.some(
          (img) => !seenImageUrls.has(img.fullsize)
        );
        if (!hasNewImage) return false;

        // Add seen image URLs
        images.forEach((img) => seenImageUrls.add(img.fullsize));
        return true;
      });

      return filtered;
    } catch (err) {
      console.error("Error fetching timeline", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [agent, cursor, loading]);

  // Initial + fill up to 15 images
  useEffect(() => {
    if (!agent) return;

    const loadMinimumPosts = async () => {
      let accumulated: AppBskyFeedDefs.FeedViewPost[] = [];
      let newCursor = cursor;

      while (
        accumulated.flatMap(
          (p) => (p.post.embed as AppBskyEmbedImages.View)?.images || []
        ).length < 15
      ) {
        const batch = await fetchFeed();
        if (batch.length === 0) break;
        accumulated = [...accumulated, ...batch];
        newCursor = cursor;
      }

      setTimeline(accumulated);
    };

    loadMinimumPosts();
  }, [agent]);

  // Load more on scroll to sentinel
  useEffect(() => {
    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loading && cursor) {
          const more = await fetchFeed();
          setTimeline((prev) => [...prev, ...more]);
        }
      },
      {
        rootMargin: "200px",
      }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
  }, [fetchFeed, cursor, loading]);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 row-start-2">
        {timeline.flatMap((post) => {
          if (!AppBskyEmbedImages.isView(post.post.embed)) return;
          const images = post.post.embed.images || [];
          if (images.length === 0) return [];
          const t: string = (post.post.record.text as string) || "";
          const maxLength = 100;
          return images.map((image, index) => (
            <Link
              href={`/${post.post.author.did}/${post.post.uri
                .split("/")
                .pop()}?image=${index}`}
              key={image.fullsize}
            >
              <div className="group relative w-[200px] h-[200px] overflow-hidden rounded-xl">
                <Image
                  src={image.fullsize}
                  alt={image.alt}
                  placeholder="blur"
                  blurDataURL={image.thumb}
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="200px"
                />
                <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  <div className="text-sm mb-1">
                    {AppBskyFeedPost.isRecord(post.post.record) && (
                      <>
                        {t.length > maxLength ? t.slice(0, maxLength) + "…" : t}
                      </>
                    )}
                  </div>
                  <div className="text-xs flex gap-2">
                    <Avatar>
                      <AvatarImage src={post.post.author.avatar} />
                      <AvatarFallback>
                        {post.post.author.displayName ||
                          post.post.author.handle}
                      </AvatarFallback>
                    </Avatar>
                    {post.post.author.displayName || post.post.author.handle}
                  </div>
                </div>
              </div>
            </Link>
          ));
        })}
        <div ref={sentinelRef} className="h-1 col-span-full" />
        {loading && (
          <div className="col-span-full flex justify-center text-sm text-black/70 dark:text-white/70">
            <LoaderCircle className="animate-spin" />
          </div>
        )}
      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center"></footer>
    </div>
  );
}
