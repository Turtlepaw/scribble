"use client";
import { useBoardsStore } from "@/lib/stores/boards";
import { useAuth } from "@/lib/hooks/useAuth";
import { $Typed } from "@atproto/api";
import { AppBskyEmbedImages } from "@atproto/api/dist/client";
import { LoaderCircle } from "lucide-react";
import Image, { ImageProps } from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import Masonry from "react-masonry-css";
import { breakpointColumnsObj } from "@/components/Feed";

export const runtime = "edge";

function truncateString(str: string, num: number) {
  return str.length > num ? str.slice(0, num) + "..." : str;
}

export default function BoardsPage() {
  const { boards, isLoading, getBoards } = useBoardsStore();
  const { agent } = useAuth();

  if (!agent) return <div>Not logged in</div>;
  const boardsFromDid = getBoards(agent.assertDid);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <LoaderCircle className="animate-spin text-black/70 dark:text-white/70 w-8 h-8" />
      </div>
    );
  if (!boardsFromDid || Object.entries(boardsFromDid).length <= 0)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-black/70 dark:text-white/70">No boards found</p>
      </div>
    );

  return (
    <div className="py-4 px-4 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <h1 className="font-medium text-lg mb-4">My Boards</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {Array.from(Object.entries(boardsFromDid)).map(([key, it]) => (
            <Link
              href={`/board/${agent?.did ?? "unknown"}/${key}`}
              key={key}
              className="h-full"
            >
              <motion.div
                initial={{ opacity: 0, y: 2, filter: "blur(14px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col h-full bg-black/10 dark:bg-white/3 p-4 rounded-lg hover:bg-black/15 dark:hover:bg-white/5 transition-colors"
              >
                <h2 className="font-medium text-lg">{it.name}</h2>
                <p className="text-sm text-black/80 dark:text-white/80 mt-1 line-clamp-2">
                  {it.description}
                </p>
              </motion.div>
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
