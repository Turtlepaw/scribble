import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "./ui/button";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { useState } from "react";
import { Heart } from "lucide-react";
import clsx from "clsx";
import LikeCounter from "./LikeCounter";

export function LikeButton({ post }: { post: PostView }) {
  const { agent } = useAuth();
  const [likeUri, setLikeUri] = useState<string | null>(null);
  const [likes, setLikes] = useState(post.likeCount ?? 0);
  const [isLiked, setLiked] = useState(post.viewer?.like ?? false);
  return (
    <Button
      className="flex items-center gap-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
      variant={"ghost"}
      disabled={!post.viewer}
      onClick={async () => {
        if (!agent || !post.viewer) return;
        if (likeUri == null) {
          setLiked(true);
          setLikes(likes + 1);
          const uri = await agent.like(post.uri, post.cid);
          setLikeUri(uri.uri);
        } else {
          setLiked(false);
          setLikes(likes - 1);
          setLikeUri(null);
          await agent.deleteLike(likeUri);
        }
      }}
    >
      <Heart
        className={clsx(
          "w-5 h-5",
          isLiked
            ? "fill-red-500 text-red-500"
            : "text-black/80 dark:text-white/80"
        )}
      />
      <LikeCounter count={likes || 0} />
    </Button>
  );
}
