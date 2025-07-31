"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/useAuth";
import {
  AppBskyEmbedImages,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from "@atproto/api";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import Masonry from "react-masonry-css";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";

function getText(post: PostView) {
  if (!AppBskyFeedPost.isRecord(post.record)) return;
  return (post.record as AppBskyFeedPost.Record).text;
}

export function Feed({
  feed,
  isLoading = false,
}: {
  feed: PostView[];
  isLoading?: boolean;
}) {
  const breakpointColumnsObj = {
    default: 5,
    1536: 4,
    1280: 3,
    1024: 2,
    768: 1,
  };

  return (
    <>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="flex -mx-2 w-auto"
        columnClassName="px-2 space-y-4"
      >
        {feed.flatMap((post) => {
          if (!AppBskyEmbedImages.isView(post.embed)) return [];
          const images = post.embed.images || [];
          if (images.length === 0) return [];
          const t: string = getText(post) || "";
          const maxLength = 100;
          return images.map((image, index) => (
            <Link
              href={`/${post.author.did}/${post.uri
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

                {/* Bottom: Avatar, display name, and handle */}
                <div className="absolute inset-0 z-20 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                  <div className="w-fit self-start" />

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={post.author.avatar} />
                        <AvatarFallback>
                          {post.author.displayName || post.author.handle}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col leading-tight">
                        <span>
                          {post.author.displayName || post.author.handle}
                        </span>
                        <span className="text-white/70 text-[0.75rem]">
                          @{post.author.handle}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm">
                      {t.length > maxLength ? t.slice(0, maxLength) + "…" : t}
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          ));
        })}
      </Masonry>

      {isLoading && (
        <div className="flex justify-center py-6 text-sm text-black/70 dark:text-white/70">
          <LoaderCircle className="animate-spin" />
        </div>
      )}
    </>
  );
}
