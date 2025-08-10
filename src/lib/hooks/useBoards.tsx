"use client";
import { PropsWithChildren, useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useFeedDefsStore } from "../stores/feedDefs";
import { AtUri } from "@atproto/api";
import { Board, useBoardsStore } from "../stores/boards";
import { LIST_COLLECTION } from "@/constants";
import { useBoardItems } from "./useBoardItems";
import { Agent } from "http";
import { getPdsAgent } from "../utils/pds";
import { useDidStore } from "../stores/did";

export function useBoards(did?: string | null) {
  const { agent } = useAuth();
  const store = useBoardsStore();
  const didStore = useDidStore();
  const [isLoading, setLoading] = useState(
    Object.entries(store.boards).length == 0
  );

  useEffect(() => {
    if (agent == null) return;
    const loadBoards = async () => {
      try {
        console.log(
          `Loading board items for ${did ?? agent.assertDid} (raw: ${did})`
        );

        const resolvedDid = did ?? agent.assertDid;
        const tempAgent = await getPdsAgent(resolvedDid, didStore, agent);

        const boards = await tempAgent.com.atproto.repo.listRecords({
          collection: LIST_COLLECTION,
          repo: did ?? agent.assertDid,
          limit: 100,
        });

        for (const board of boards.data.records) {
          const safeBoard = Board.safeParse(board.value);
          if (safeBoard.success)
            store.setBoard(
              resolvedDid,
              new AtUri(board.uri).rkey,
              safeBoard.data
            );
        }
      } finally {
        setLoading(false);
        store.setLoading(false);
      }
    };
    loadBoards();
  }, [agent, did]);

  return { isLoading };
}
