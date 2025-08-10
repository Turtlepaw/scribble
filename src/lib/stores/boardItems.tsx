import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as z from "zod";
import { createMapStorage } from "../utils/mapStorage";

export const BoardItem = z.looseObject({
  url: z.string(),
  list: z.string(),
  $type: z.string(),
  createdAt: z.string().optional(),
});

export type BoardItem = z.infer<typeof BoardItem>;

type BoardItemsState = {
  boardItems: Map<string, BoardItem>;
  setBoardItem: (rkey: string, board: BoardItem) => void;
  removeBoardItem: (rkey: string) => void;
  isLoading: boolean;
  setLoading: (value: boolean) => void;
};

export const useBoardItemsStore = create<BoardItemsState>()(
  persist(
    (set) => ({
      boardItems: new Map(),
      setBoardItem: (rkey, board) =>
        set((state) => ({
          boardItems: new Map(state.boardItems).set(rkey, board),
        })),
      removeBoardItem: (rkey) =>
        set((state) => {
          const newMap = new Map(state.boardItems);
          newMap.delete(rkey);
          return {
            boardItems: newMap,
          };
        }),
      isLoading: true,
      setLoading(value) {
        set(() => ({
          isLoading: value,
        }));
      },
    }),
    {
      name: "board-items",
      partialize: (state) => ({
        items: state.boardItems,
      }),
      storage: createMapStorage("boardItems"),
    }
  )
);
