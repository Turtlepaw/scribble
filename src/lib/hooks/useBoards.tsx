"use client";
import { PropsWithChildren, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useFeedDefsStore } from "../stores/feedDefs";
import { AtUri } from "@atproto/api";
import { Board, useBoardsStore } from "../stores/boards";
import { LIST_COLLECTION } from "@/constants";
import { useBoardItems } from "./useBoardItems";

export function useBoards() {
  const { agent } = useAuth();
  const store = useBoardsStore();
  const [isLoading, setLoading] = useState(store.boards.size == 0);

  useEffect(() => {
    if (agent == null) return;
    const loadBoards = async () => {
      try {
        const boards = await agent.com.atproto.repo.listRecords({
          collection: LIST_COLLECTION,
          repo: agent.assertDid,
          limit: 100,
        });

        for (const board of boards.data.records) {
          const safeBoard = Board.safeParse(board.value);
          if (safeBoard.success)
            store.setBoard(new AtUri(board.uri).rkey, safeBoard.data);
        }
      } finally {
        setLoading(false);
        store.setLoading(false);
      }
    };
    loadBoards();
  }, [agent]);

  return { isLoading };
}

export function BoardsProvider({ children }: PropsWithChildren) {
  useBoards();
  useBoardItems();
  return children;
}
