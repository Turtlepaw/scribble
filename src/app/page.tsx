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
import Masonry from "react-masonry-css";
import { motion } from "motion/react";

export const runtime = "edge";

export default function Home() {
  const [timeline, setTimeline] = useState<AppBskyFeedDefs.FeedViewPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { agent, session } = useAuth();
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

  const breakpointColumnsObj = {
    default: 5,
    1536: 4,
    1280: 3,
    1024: 2,
    768: 1,
  };

  console.log(session);

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

  return (
    <div className="items-center justify-items-center">
      <div className="h-5" />
      <main className="px-5">
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex -mx-2 w-auto"
          columnClassName="px-2 space-y-4"
        >
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
                className="block"
              >
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  whileTap={{ scale: 0.99 }}
                  className="group relative w-full min-h-[120px] min-w-[120px] overflow-hidden rounded-xl bg-gray-900"
                >
                  {/* Blurred background */}
                  <Image
                    src={image.fullsize}
                    alt=""
                    fill
                    placeholder="blur"
                    blurDataURL={image.thumb}
                    className="object-cover filter blur-xl scale-110 opacity-30"
                  />

                  {/* Centered foreground image */}
                  <div className="relative z-10 flex items-center justify-center w-full min-h-[120px]">
                    <Image
                      src={image.fullsize}
                      alt={image.alt}
                      placeholder="blur"
                      blurDataURL={image.thumb}
                      width={image?.aspectRatio?.width ?? 400}
                      height={image?.aspectRatio?.height ?? 400}
                      className="object-contain max-w-full max-h-full rounded-lg"
                    />
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 z-20 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <div className="text-sm mb-1">
                      {AppBskyFeedPost.isRecord(post.post.record) && (
                        <>
                          {t.length > maxLength
                            ? t.slice(0, maxLength) + "…"
                            : t}
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
                </motion.div>
              </Link>
            ));
          })}
        </Masonry>
        <div ref={sentinelRef} className="h-1 col-span-full" />
        {loading && (
          <div className="col-span-full flex justify-center text-sm text-black/70 dark:text-white/70">
            <LoaderCircle className="animate-spin" />
          </div>
        )}
      </main>

      {/* <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center"></footer> */}
    </div>
  );
}
