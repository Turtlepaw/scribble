import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as z from "zod";

export const Board = z.object({
  name: z.string(),
  description: z.string(),
});

export type Board = z.infer<typeof Board>;

type FeedDefsState = {
  boards: Map<string, Board>;
  setBoard: (rkey: string, board: Board) => void;
};

export const useBoardsStore = create<FeedDefsState>()(
  persist(
    (set) => ({
      boards: new Map(),
      setBoard: (rkey, board) =>
        set((state) => ({
          boards: state.boards.set(rkey, board),
        })),
    }),
    {
      name: "boards",
      partialize: (state) => ({
        feeds: state.boards,
      }),
    }
  )
);
