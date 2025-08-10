"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppBskyEmbedImages, AppBskyFeedPost, AtUri } from "@atproto/api";
import { LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import Masonry from "react-masonry-css";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { SaveButton } from "./SaveButton";
import { UnsaveButton } from "./UnsaveButton";
import { LikeButton } from "./LikeButton";
import { useState, useEffect } from "react";

export type FeedItem = {
  id: string;
  imageUrl: string;
  alt?: string;
  author?: {
    avatar?: string;
    displayName?: string;
    handle: string;
    did?: string;
  };
  text?: string;
  uri: string;
  aspectRatio?: { width: number; height: number };
  blurDataURL?: string;
};

// Props for the Feed component
interface FeedProps {
  /**
   * Map of the index of the embedded media and post view
   */
  feed?: [number, PostView][];

  isLoading?: boolean;
  showUnsaveButton?: boolean;
}

function getText(post: PostView) {
  if (!AppBskyFeedPost.isRecord(post.record)) return;
  return (post.record as AppBskyFeedPost.Record).text;
}

function getImageFromItem(it: PostView, index: number) {
  if (
    AppBskyEmbedImages.isMain(it.embed) ||
    AppBskyEmbedImages.isView(it.embed)
  ) {
    return it.embed.images[index];
  } else return null;
}

// Add this function to prefetch and cache images
function prefetchAndCacheImages(feed: [number, PostView][] | undefined) {
  if (!feed || typeof window === "undefined") return;

  feed.forEach(([index, item]) => {
    const image = getImageFromItem(item, index);
    if (image && image.fullsize) {
      const img = new window.Image();
      img.src = image.fullsize;

      // If service worker is active, explicitly add to cache
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        fetch(image.fullsize, { mode: "no-cors" }).catch((err) =>
          console.warn("Error prefetching image:", err)
        );
      }
    }
  });
}

function ImageCard({
  item,
  showUnsaveButton,
  index,
}: {
  item: PostView;
  showUnsaveButton?: boolean;
  index: number;
}) {
  const image = getImageFromItem(item, index);
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  if (!image) return;

  const ActionButton = showUnsaveButton ? UnsaveButton : SaveButton;
  const txt = getText(item);

  return (
    <div className={`relative group ${isDropdownOpen ? "hover-active" : ""}`}>
      {/* Save/Unsave button – top-left */}
      <div className="absolute top-3 left-3 z-30 opacity-0 group-hover:opacity-100 group-[.hover-active]:opacity-100 transition-opacity">
        {ActionButton && (
          <ActionButton
            image={index}
            post={item}
            onDropdownOpenChange={setDropdownOpen}
          />
        )}
      </div>

      {/* Like button – top-right */}
      <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 group-[.hover-active]:opacity-100 transition-opacity">
        <LikeButton post={item} />
      </div>

      {/* Link wraps image only */}
      <Link
        href={`/${item.author.did}/${AtUri.make(item.uri).rkey}`}
        className="block"
      >
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          whileTap={{ scale: 0.95 }}
          className="group relative w-full min-h-[120px] min-w-[120px] overflow-hidden rounded-xl bg-gray-900"
        >
          {/* Blurred background */}
          <Image
            src={image.fullsize}
            alt=""
            fill
            placeholder={image.thumb ? "blur" : "empty"}
            blurDataURL={image.thumb}
            className="object-cover filter blur-xl scale-110 opacity-30"
          />

          {/* Foreground image */}
          <div className="relative z-10 flex items-center justify-center w-full min-h-[120px]">
            <Image
              src={image.fullsize}
              alt={image.alt || ""}
              placeholder={image.thumb ? "blur" : "empty"}
              blurDataURL={image.thumb}
              width={image.aspectRatio?.width ?? 400}
              height={image.aspectRatio?.height ?? 400}
              className="object-contain max-w-full max-h-full rounded-lg"
              priority
            />
          </div>

          {/* Author info */}
          {item.author && (
            <div className="absolute inset-0 z-20 bg-black/40 text-white opacity-0 group-hover:opacity-100 group-[.hover-active]:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
              <div className="w-fit self-start" />

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={item.author.avatar} />
                    <AvatarFallback>
                      {item.author.displayName || item.author.handle}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col leading-tight">
                    <span>{item.author.displayName || item.author.handle}</span>
                    <span className="text-white/70 text-[0.75rem]">
                      @{item.author.handle}
                    </span>
                  </div>
                </div>

                {txt && (
                  <div className="text-sm">
                    {txt.length > 100 ? txt.slice(0, 100) + "…" : txt}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </Link>
    </div>
  );
}

export function feedAsMap(feed: PostView[]) {
  const map: [number, PostView][] = [];
  for (const it of feed) {
    if (
      AppBskyEmbedImages.isMain(it.embed) ||
      AppBskyEmbedImages.isView(it.embed)
    ) {
      it.embed.images.forEach((image, index) => map.push([index, it]));
    }
  }
  return map;
}

export const breakpointColumnsObj = {
  default: 5,
  1536: 4,
  1280: 3,
  1024: 2,
  768: 1,
};

export function Feed({
  feed,
  isLoading = false,
  showUnsaveButton = false,
}: FeedProps) {
  // Use effect to prefetch and cache images when feed changes
  useEffect(() => {
    prefetchAndCacheImages(feed);
  }, [feed]);

  return (
    <>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="flex -mx-2 w-auto"
        columnClassName="px-2 space-y-4"
      >
        {feed?.map(([index, item]) => (
          <ImageCard
            key={`${item.uri}-${index}`}
            item={item}
            index={index}
            showUnsaveButton={showUnsaveButton}
          />
        ))}
      </Masonry>

      {isLoading && (
        <div className="flex justify-center py-6 text-sm text-black/70 dark:text-white/70">
          <LoaderCircle className="animate-spin" />
        </div>
      )}
    </>
  );
}
