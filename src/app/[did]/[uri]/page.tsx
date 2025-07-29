"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import Image, { ImageProps } from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";

function paramAsString(str: string | string[]): string {
  if (Array.isArray(str)) {
    return str[0];
  }
  return str;
}

export default function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { did, uri: rkey } = useParams();
  const queryParams = useSearchParams();
  const imageIndex = queryParams.get("image") ?? 0;
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<PostView | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { agent } = useAuth();

  useEffect(() => console.log("Agent", agent), [agent]);
  useEffect(() => {
    console.log("Effect triggered", { agent, did, rkey });
    if (!agent || !did || !rkey) return;

    const fetchPost = async () => {
      try {
        setLoading(true);
        const urip = AtUri.make(
          decodeURIComponent(paramAsString(did)),
          "app.bsky.feed.post",
          paramAsString(rkey)
        );

        if (!urip.host.startsWith("did:")) {
          const res = await agent.resolveHandle({ handle: urip.host });
          urip.host = res.data.did;
        }

        const res = await agent.getPosts({ uris: [urip.toString()] });

        if (res.success && res.data.posts[0]) {
          setPost(res.data.posts[0]);
          console.log("Post fetched", res.data.posts[0]);
        } else {
          throw new Error("Failed to fetch post");
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [agent, did, rkey]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderCircle className="animate-spin text-black/70 dark:text-white/70 w-8 h-8" />
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error: {error.message}</p>
      </div>
    );
  if (!post)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No post found</p>
      </div>
    );

  return (
    <div className="min-h-screen py-4 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-lg overflow-hidden min-h-[80vh] text-black dark:text-white">
          {/* Blurred Background Image - Full Container */}
          <BskyImage
            embed={post.embed}
            fill
            className="absolute inset-0 object-cover blur-lg scale-110 z-0 opacity-10"
          />

          {/* Foreground Content */}
          <div className="relative z-10 bg-black/30 dark:bg-white/10 p-4 sm:p-6 lg:p-8 min-h-[80vh] flex flex-col">
            {/* Centered Image */}
            <div className="flex-1 flex items-center justify-center py-4">
              <div className="w-full max-w-2xl">
                <BskyImage
                  embed={post.embed}
                  width={800}
                  height={800}
                  style={{
                    objectFit: "contain",
                    width: "100%",
                    height: "auto",
                    maxHeight: "60vh",
                  }}
                  className="rounded-lg mb-4"
                />
              </div>
            </div>

            {/* Author Info */}
            <div className="flex items-center mb-4 sm:mb-6">
              <Avatar className="mr-4">
                <AvatarImage src={post.author.avatar} />
                <AvatarFallback>
                  {post.author.displayName || post.author.handle}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-base sm:text-lg">
                  {post.author.displayName || post.author.handle}
                </p>
                <p className="text-sm text-black/80 dark:text-white/80">
                  @{post.author.handle}
                </p>
              </div>
            </div>

            {/* Post Text */}
            {AppBskyFeedPost.isRecord(post.record) &&
              typeof post.record.text === "string" &&
              post.record.text && (
                <p className="text-sm sm:text-base text-black/90 dark:text-white/90 leading-relaxed mb-4 sm:mb-6">
                  {post.record.text.length > 280
                    ? post.record.text.slice(0, 280) + "…"
                    : post.record.text}
                </p>
              )}

            {/* Bottom Section - Stats and External Link */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <Heart
                    className={clsx(
                      "w-5 h-5",
                      post.viewer?.like
                        ? "fill-red-500 text-red-500"
                        : "text-black/80 dark:text-white/80"
                    )}
                  />
                  <span className="text-sm font-medium text-black dark:text-white">
                    {post.likeCount || 0}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MessagesSquare className="w-5 h-5 text-black/80 dark:text-white/80" />
                  <span className="text-sm font-medium text-black dark:text-white">
                    {post.replyCount || 0}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Repeat
                    className={clsx(
                      "w-5 h-5",
                      post.viewer?.repost
                        ? "fill-blue-500 text-blue-500"
                        : "text-black/80 dark:text-white/80"
                    )}
                  />
                  <span className="text-sm font-medium text-black dark:text-white">
                    {post.repostCount || 0}
                  </span>
                </div>
              </div>

              {/* External Link */}
              <Link
                href={
                  "https://bsky.app/profile/" +
                  post.author.did +
                  "/post/" +
                  post.uri.split("/").pop()
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="cursor-pointer flex items-center gap-2 text-sm font-medium px-4 py-2 dark:bg-white/10 bg-black/10 dark:border-white/20 border-black/15 text-black dark:text-white dark:hover:bg-white/20 hover:bg-black/15"
                >
                  Open in Bluesky
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            </div>
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

export function BskyImage({ embed, imageIndex = 0, ...props }: BskyImageProps) {
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
