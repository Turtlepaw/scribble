"use client";
import { Feed } from "@/components/Feed";
import { LoaderCircle } from "lucide-react";
import { useBoardItemsStore } from "@/lib/stores/boardItems";
import { useBoardsStore } from "@/lib/stores/boards";
import { useCurrentBoard } from "@/lib/stores/useCurrentBoard";
import { useAuth } from "@/lib/useAuth";
import { AtUri } from "@atproto/api";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EditButton } from "@/components/EditButton";
import { paramAsString } from "@/lib/utils/params";

export const runtime = "edge";

export default function BoardPage() {
  const { did, rkey } = useParams();
  const { agent } = useAuth();

  useCurrentBoard.getState().setCurrentBoard(rkey?.toString() ?? null);
  const { boards, isLoading: isBoardsLoading } = useBoardsStore();
  const { boardItems: items, isLoading: isItemsLoading } = useBoardItemsStore();

  const [posts, setPosts] = useState<[number, PostView][]>([]);
  const [loading, setLoading] = useState(true);

  const itemsInBoard = useMemo(() => {
    if (!rkey) return [];
    return Array.from(items.entries()).filter(
      ([, item]) => new AtUri(item.list).rkey === paramAsString(rkey)
    );
  }, [items, rkey]);

  const board = useMemo(
    () => (rkey ? boards.get(paramAsString(rkey)) : null),
    [boards, rkey]
  );

  // Initial fetch
  useEffect(() => {
    if (!agent || !rkey || !did || itemsInBoard.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPosts = async () => {
      try {
        const uris = itemsInBoard.map(([, item]) =>
          AtUri.make(item.url.split("?")[0]).toString()
        );

        const response = await agent.getPosts({ uris });
        const skeets = response?.data.posts || [];

        if (!cancelled) {
          const newPosts: [number, PostView][] = skeets.map((skeet) => {
            const uri = new AtUri(skeet.uri);
            const index = Number(uri.searchParams.get("image")) || 0;
            return [index, skeet] as [number, PostView];
          });

          setPosts(newPosts);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
        if (!cancelled) setLoading(false);
      }
    };

    fetchPosts();
    return () => {
      cancelled = true;
    };
  }, [agent, did, rkey, itemsInBoard]);

  if (!rkey || !did) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-red-500 dark:text-red-400">No rkey or did</p>
      </div>
    );
  }

  if (isItemsLoading || isBoardsLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <LoaderCircle className="animate-spin text-black/70 dark:text-white/70 w-8 h-8" />
      </div>
    );
  }

  if (itemsInBoard.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-black/70 dark:text-white/70">No items found</p>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-black/70 dark:text-white/70">No board found</p>
      </div>
    );
  }

  return (
    <div className="px-5">
      <div className="flex flex-row">
        <div className="mb-5 ml-2">
          <h2 className="font-bold text-xl">{board.name}</h2>
          <p className="text-black/80 dark:text-white/80">
            {board.description}
          </p>
        </div>
        <EditButton board={board} rkey={paramAsString(rkey)} className="ml-3" />
      </div>
      <Feed
        feed={posts}
        showUnsaveButton={true}
        onUnsave={(imageUrl, index) => console.log("Unsave", imageUrl)}
      />
    </div>
  );
}
