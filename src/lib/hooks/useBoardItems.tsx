"use client";
import { PropsWithChildren, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useFeedDefsStore } from "../stores/feedDefs";
import { AtUri } from "@atproto/api";
import { Board, useBoardsStore } from "../stores/boards";
import { LIST_COLLECTION, LIST_ITEM_COLLECTION } from "@/constants";
import { BoardItem, useBoardItemsStore } from "../stores/boardItems";
import { getAllRecords } from "../records";

export function useBoardItems() {
  const { agent } = useAuth();
  const store = useBoardItemsStore();
  const [isLoading, setLoading] = useState(store.boardItems.size == 0);

  useEffect(() => {
    if (agent == null) return;
    const loadItems = async () => {
      try {
        const boards = await getAllRecords({
          collection: LIST_ITEM_COLLECTION,
          repo: agent.assertDid,
          limit: 100,
          agent,
        });

        for (const item of boards) {
          const safeItem = BoardItem.safeParse(item.value);
          if (safeItem.success)
            store.setBoardItem(new AtUri(item.uri).rkey, safeItem.data);
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
