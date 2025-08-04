"use client";
import { paramAsString } from "@/app/[did]/[uri]/page";
import LikeCounter from "@/components/LikeCounter";
import { SaveButton } from "@/components/SaveButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LIST_COLLECTION, LIST_ITEM_COLLECTION } from "@/constants";
import { useBoardItemsStore } from "@/lib/stores/boardItems";
import { Board, useBoardsStore } from "@/lib/stores/boards";
import { useAuth } from "@/lib/useAuth";
import { $Typed, AtUri } from "@atproto/api";
import { AppBskyEmbedImages, AppBskyFeedPost } from "@atproto/api/dist/client";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import clsx from "clsx";
import {
  ExternalLink,
  Heart,
  LoaderCircle,
  MessagesSquare,
  Repeat,
  Repeat2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image, { ImageProps } from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";
import z from "zod";

export const runtime = "edge";

export default function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { did, rkey } = useParams();

  const { boards, isLoading: isBoardsLoading } = useBoardsStore();
  const { boardItems: items, isLoading: isItemsLoading } = useBoardItemsStore();

  if (!rkey || !did)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400">No rkey or did</p>
        </div>
      </div>
    );
  if (isItemsLoading || isBoardsLoading)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <LoaderCircle className="animate-spin text-black/70 dark:text-white/70 w-8 h-8" />
      </div>
    );

  const board = boards.get(paramAsString(rkey));
  const itemsInBoard = items
    .entries()
    .filter((it) => new AtUri(it[1].list).rkey == paramAsString(rkey))
    .toArray();
  if (itemsInBoard.length <= 0)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-black/70 dark:text-white/70">No items found</p>
      </div>
    );
  if (!board)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-black/70 dark:text-white/70">No board found</p>
      </div>
    );

  return (
    <div className="py-4 px-4 sm:py-8 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Container that adapts to image width */}
      <div className="w-full max-w-4xl flex justify-center">
        <div className="inline-block">
          <div>
            <h2>{board?.name}</h2>
            <p>{board.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

type BskyImageProps = {
  embed:
    | $Typed<AppBskyEmbedImages.View>
    | {
        $type: string;
      }
    | undefined;
  imageIndex?: number;
  className?: string;
  width?: number;
  height?: number;
} & Omit<ImageProps, "src" | "alt">;

function BskyImage({ embed, imageIndex = 0, ...props }: BskyImageProps) {
  if (!AppBskyEmbedImages.isView(embed)) return null;

  const image = embed.images?.[imageIndex];
  if (!image) return null;

  return (
    <Image
      src={image.fullsize}
      alt={image.alt || "Post Image"}
      placeholder="blur"
      blurDataURL={image.thumb}
      {...props}
    />
  );
}
