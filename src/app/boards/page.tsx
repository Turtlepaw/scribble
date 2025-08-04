"use client";
import { paramAsString } from "@/app/[did]/[uri]/page";
import LikeCounter from "@/components/LikeCounter";
import { SaveButton } from "@/components/SaveButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LIST_COLLECTION } from "@/constants";
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

export default function BoardsPage() {
  const { boards, isLoading } = useBoardsStore();
  const { agent } = useAuth();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <LoaderCircle className="animate-spin text-black/70 dark:text-white/70 w-8 h-8" />
      </div>
    );
  if (boards.size <= 0)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-black/70 dark:text-white/70">No boards found</p>
      </div>
    );

  return (
    <div className="py-4 px-4 sm:py-8 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Container that adapts to image width */}
      <div className="w-full max-w-4xl flex justify-center">
        <div className="inline-block">
          {Array.from(boards.entries()).map(([key, it]) => (
            <Link
              href={`/board/${agent?.did ?? "unknown"}/${key}`}
              key={key}
              className="bg-accent/80 p-4 rounded-lg m-2 hover:bg-accent"
            >
              {it.name}
            </Link>
          ))}
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
