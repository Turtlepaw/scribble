"use client";
import LikeCounter from "@/components/LikeCounter";
import { SaveButton } from "@/components/SaveButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { paramAsString } from "@/lib/utils/params";
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
} from "lucide-react";
import Image, { ImageProps } from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export const runtime = "edge";

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
  const [likeUri, setLikeUri] = useState<string | null>(null);
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <LoaderCircle className="animate-spin text-black/70 dark:text-white/70 w-8 h-8" />
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400">
            Error: {error.message}
          </p>
        </div>
      </div>
    );
  if (!post)
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-black/70 dark:text-white/70">No post found</p>
      </div>
    );

  return (
    <div className="py-4 px-4 sm:py-8 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Container that adapts to image width */}
      <div className="w-full max-w-4xl flex justify-center">
        <div className="inline-block">
          <div className="relative rounded-lg overflow-hidden text-black dark:text-white bg-white/10 dark:bg-white/1 border-[1px] border-black/8 dark:border-white/5">
            {/* Blurred Background Image - Full Container */}
            <BskyImage
              embed={post.embed}
              fill
              className="absolute inset-0 object-cover blur-3xl scale-110 z-0 opacity-30"
            />

            {/* Foreground Content */}
            <div className="relative z-10 ">
              {/* Image Container */}
              <div className="p-4 sm:p-6 lg:p-8 pb-0">
                <BskyImage
                  embed={post.embed}
                  width={800}
                  height={600}
                  style={{
                    objectFit: "contain",
                    height: "auto",
                    width: "auto",
                    maxHeight: "70vh",
                    maxWidth: "90vw",
                  }}
                  className="rounded-lg shadow-lg"
                />
              </div>

              {/* Bottom Content - Author, Text, and Actions */}
              <div className="p-4 sm:p-6 lg:p-8">
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
                    <Button
                      className="flex items-center gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                      variant={"ghost"}
                      disabled={!post.viewer}
                      onClick={async () => {
                        if (!agent || !post.viewer) return;
                        if (likeUri == null) {
                          const uri = await agent.like(post.uri, post.cid);
                          setLikeUri(uri.uri);
                        } else {
                          agent.deleteLike(likeUri);
                        }

                        //@ts-expect-error ignore this
                        setPost((prev) => ({
                          ...prev,
                          viewer: {
                            ...prev!.viewer,
                            like: !prev!.viewer?.like,
                          },
                          likeCount:
                            (prev!.likeCount || 0) +
                            (prev!.viewer?.like ? -1 : 1),
                        }));
                      }}
                    >
                      <Heart
                        className={clsx(
                          "w-5 h-5",
                          post.viewer?.like
                            ? "fill-red-500 text-red-500"
                            : "text-black/80 dark:text-white/80"
                        )}
                      />
                      <LikeCounter count={post.likeCount || 0} />
                    </Button>

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
                  <div>
                    <SaveButton image={Number(imageIndex)} post={post} />
                    <Link
                      href={
                        "https://bsky.app/profile/" +
                        post.author.did +
                        "/post/" +
                        post.uri.split("/").pop()
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2"
                    >
                      <Button variant="outline" className="cursor-pointer">
                        Open in Bluesky
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
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
