"use client";

import { Feed } from "@/components/Feed";
import { GitFork, LoaderCircle } from "lucide-react";
import { BoardItem, useBoardItemsStore } from "@/lib/stores/boardItems";
import { Board, useBoardsStore } from "@/lib/stores/boards";
import { useCurrentBoard } from "@/lib/stores/useCurrentBoard";
import { useAuth } from "@/lib/hooks/useAuth";
import { AtUri } from "@atproto/api";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useCallback, useState } from "react";
import { EditButton } from "@/components/EditButton";
import { paramAsString } from "@/lib/utils/params";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LIST_COLLECTION, LIST_ITEM_COLLECTION } from "@/constants";
import { useBoards } from "@/lib/hooks/useBoards";
import { useBoardItems } from "@/lib/hooks/useBoardItems";
import { useBoardPosts } from "@/lib/hooks/posts";
import { InfiniteScrollWrapper } from "@/components/InfiniteScrollWrapper";
import { decode } from "punycode";
import { getAllRecords } from "@/lib/records";
import { getPdsAgent } from "@/lib/utils/pds";
import { de } from "zod/v4/locales";
import { useDidStore } from "@/lib/stores/did";

export const runtime = "edge";

type BoardPageParams = {
  did: string;
  rkey: string;
};

const POSTS_PER_PAGE = 25;

export default function BoardPage() {
  const { did, rkey } = useParams<BoardPageParams>();
  const { agent } = useAuth();
  const router = useRouter();
  const [isForkingBoard, setIsForkingBoard] = useState(false);

  // Parse and validate params
  const { decodedDid, isValidParams } = useMemo(() => {
    if (!did || !rkey) return { decodedDid: null, isValidParams: false };

    try {
      return {
        decodedDid: decodeURIComponent(paramAsString(did)),
        isValidParams: true,
      };
    } catch {
      return { decodedDid: null, isValidParams: false };
    }
  }, [did, rkey]);

  // Set current board
  useEffect(() => {
    useCurrentBoard.getState().setCurrentBoard(rkey?.toString() ?? null);
  }, [rkey]);

  // Load board data
  const {} = useBoardItems(isValidParams ? decodedDid : null);
  const { isLoading: isBoardsLoading } = useBoards(
    isValidParams ? decodedDid : null
  );

  // Get stores
  const { boards } = useBoardsStore();
  const { boardItems: items, isLoading: isItemsLoading } = useBoardItemsStore();

  // Get current board and items
  const { board, itemsInBoard, cacheKey } = useMemo(() => {
    if (!isValidParams || !decodedDid || !rkey) {
      return { board: null, itemsInBoard: [], cacheKey: "" };
    }

    const currentBoard = boards[decodedDid]?.[paramAsString(rkey)] || null;
    const currentItems = Array.from(items.entries()).filter(([, item]) => {
      const listUri = new AtUri(item.list);
      return (
        listUri.rkey === paramAsString(rkey) && listUri.host === decodedDid
      );
    });

    const key = `${decodedDid}:${paramAsString(rkey)}`;

    return { board: currentBoard, itemsInBoard: currentItems, cacheKey: key };
  }, [boards, items, decodedDid, rkey, isValidParams]);

  // Use posts hook with pagination
  const {
    posts,
    isLoading: isPostsLoading,
    hasMore,
    loadMore,
    isLoadingMore,
    refresh,
    error,
    totalPages,
  } = useBoardPosts({
    itemsInBoard,
    agent,
    pageSize: POSTS_PER_PAGE,
    enabled: isValidParams && !isItemsLoading && itemsInBoard.length > 0,
    boardKey: cacheKey,
  });

  // Fork board handler
  const handleForkBoard = useCallback(async () => {
    if (!agent || !board || !decodedDid || isForkingBoard) {
      if (!isForkingBoard) toast("Unable to fork board");
      return;
    }

    setIsForkingBoard(true);

    try {
      toast("Forking board...", { duration: Infinity, dismissible: false });

      // First, fetch ALL board items from the API, not just loaded ones
      const boardUri = AtUri.make(
        decodedDid,
        LIST_COLLECTION,
        paramAsString(rkey)
      );

      const tempAgent = await getPdsAgent(
        decodedDid,
        useDidStore.getState(),
        agent
      );

      // Query all list items for this board
      const allItemsResponse = await getAllRecords({
        repo: decodedDid,
        collection: LIST_ITEM_COLLECTION,
        limit: 100,
        agent: tempAgent,
      });

      // Filter items that belong to this specific board
      const allBoardItems = allItemsResponse.filter((record) => {
        const value = BoardItem.safeParse(record.value);
        if (!value.success) return false;
        const item = value.data;
        return item.list === boardUri.toString();
      });

      // Create list record
      const listRes = await agent.com.atproto.repo.createRecord({
        collection: LIST_COLLECTION,
        record: board,
        repo: agent.assertDid,
      });

      if (!listRes.success) {
        toast("Failed to create list");
        return;
      }

      const { setBoardItem } = useBoardItemsStore.getState();
      const { setBoard } = useBoardsStore.getState();
      const newRkey = new AtUri(listRes.data.uri).rkey;
      const newBoardUri = listRes.data.uri;

      setBoard(agent.assertDid, newRkey, board);

      // Create list items for ALL items, not just loaded ones
      const itemPromises = allBoardItems.map(async (record) => {
        const originalItem = record.value as BoardItem;

        // Update the list reference to point to the new forked board
        const newItem = {
          ...originalItem,
          list: newBoardUri,
        };

        const listItemRes = await agent.com.atproto.repo.createRecord({
          collection: LIST_ITEM_COLLECTION,
          record: newItem,
          repo: agent.assertDid,
        });

        if (listItemRes.success) {
          const itemResult = BoardItem.safeParse(listItemRes.data);
          if (itemResult.success) {
            setBoardItem(new AtUri(listItemRes.data.uri).rkey, itemResult.data);
          }
        } else {
          console.warn("List item failed to be created", originalItem);
        }
      });

      await Promise.allSettled(itemPromises);

      toast.dismiss(); // Dismiss the forking toast
      toast(`Board forked successfully with ${allBoardItems.length} items!`);

      // Redirect to the new forked board
      const encodedDid = encodeURIComponent(agent.assertDid);
      router.push(`/board/${encodedDid}/${newRkey}`);
    } catch (error) {
      console.error("Error forking board:", error);
      toast.dismiss();
      toast("Failed to fork board");
    } finally {
      setIsForkingBoard(false);
    }
  }, [agent, board, decodedDid, rkey, isForkingBoard, router]);

  // Loading states
  if (!isValidParams) {
    return <ErrorState message="Invalid board parameters" />;
  }

  if (isItemsLoading || isBoardsLoading) {
    return <LoadingState />;
  }

  if (!board) {
    return <EmptyState message="Board not found" />;
  }

  const canEdit = agent?.did == decodedDid;
  const isLoading = isPostsLoading || isLoadingMore;

  return (
    <div className="px-5">
      <BoardHeader
        board={board}
        canEdit={canEdit}
        rkey={paramAsString(rkey)}
        onFork={handleForkBoard}
        isForkingBoard={isForkingBoard}
      />
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">
            Error loading posts: {error.message}
          </p>
          <button
            onClick={refresh}
            className="mt-2 text-red-600 dark:text-red-400 hover:underline text-sm"
          >
            Try again
          </button>
        </div>
      )}
      {itemsInBoard.length === 0 && (
        <EmptyState message="No items in this board" />
      )}
      {itemsInBoard.length > 0 && (
        <InfiniteScrollWrapper
          hasMore={hasMore}
          onLoadMore={loadMore}
          isLoadingMore={isLoadingMore}
          showEndMessage={totalPages > 1}
        >
          <Feed
            feed={posts}
            isLoading={isLoading && posts.length === 0}
            showUnsaveButton={canEdit}
          />
        </InfiniteScrollWrapper>
      )}
    </div>
  );
}

// Extracted components for better maintainability
function BoardHeader({
  board,
  canEdit,
  rkey,
  onFork,
  isForkingBoard,
}: {
  board: Board;
  canEdit: boolean;
  rkey: string;
  onFork: () => void;
  isForkingBoard: boolean;
}) {
  return (
    <div className="flex flex-row mb-5 justify-between">
      <div className="flex flex-row">
        <div className="ml-2">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-xl">{board.name}</h2>
          </div>
          <p className="text-black/80 dark:text-white/80">
            {board.description}
          </p>
        </div>
        {canEdit && <EditButton board={board} rkey={rkey} className="ml-3" />}
      </div>
      {!canEdit && (
        <div>
          <Button
            className="gap-2 cursor-pointer"
            onClick={onFork}
            disabled={isForkingBoard}
          >
            {isForkingBoard ? (
              <LoaderCircle className="animate-spin w-4 h-4" />
            ) : (
              <GitFork />
            )}
            {isForkingBoard ? "Forking..." : "Fork"}
          </Button>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <LoaderCircle className="animate-spin text-black/70 dark:text-white/70 w-8 h-8" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className="text-black/70 dark:text-white/70">{message}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className="text-red-500 dark:text-red-400">{message}</p>
    </div>
  );
}
