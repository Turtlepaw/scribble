"use client";
import { PropsWithChildren, useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useFeedDefsStore } from "../stores/feedDefs";
import { AtUri } from "@atproto/api";
import { Board, useBoardsStore } from "../stores/boards";
import { LIST_COLLECTION, LIST_ITEM_COLLECTION } from "@/constants";
import { BoardItem, useBoardItemsStore } from "../stores/boardItems";
import { getAllRecords } from "../records";
import { getPdsAgent } from "../utils/pds";
import { useDidStore } from "../stores/did";

export function useBoardItems(did?: string | null) {
  const { agent } = useAuth();
  const store = useBoardItemsStore();
  const [isLoading, setLoading] = useState(store.boardItems.size == 0);
  const didStore = useDidStore();

  useEffect(() => {
    if (agent == null) return;
    const loadItems = async () => {
      try {
        console.log(
          `Loading board items for ${did ?? agent.assertDid} (raw: ${did})`
        );

        const resolvedDid = did ?? agent.assertDid;
        const tempAgent = await getPdsAgent(resolvedDid, didStore, agent);
        const boards = await getAllRecords({
          collection: LIST_ITEM_COLLECTION,
          repo: resolvedDid,
          limit: 100,
          agent: tempAgent,
        });

        for (const item of boards) {
          const safeItem = BoardItem.safeParse(item.value);
          if (safeItem.success)
            store.setBoardItem(new AtUri(item.uri).rkey, safeItem.data);
          else
            console.warn(`${item.uri} could not be parsed safely`, item.value);
        }
      } finally {
        setLoading(false);
        store.setLoading(false);
      }
    };
    loadItems();
  }, [agent]);

  return { isLoading };
}
