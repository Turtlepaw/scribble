import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as z from "zod";
import { createMapStorage } from "../utils/mapStorage";

export const Board = z.object({
  name: z.string(),
  description: z.string(),
});

export type Board = z.infer<typeof Board>;

type FeedDefsState = {
  boards: Map<string, Board>;
  setBoard: (rkey: string, board: Board) => void;
  isLoading: boolean;
  setLoading: (value: boolean) => void;
};

export const useBoardsStore = create<FeedDefsState>()(
  persist(
    (set) => ({
      boards: new Map(),
      setBoard: (rkey, board) =>
        set((state) => ({
          boards: new Map(state.boards).set(rkey, board),
        })),
      isLoading: true,
      setLoading(value) {
        set(() => ({
          isLoading: value,
        }));
      },
    }),
    {
      name: "boards",
      partialize: (state) => ({
        boards: state.boards,
      }),
      storage: createMapStorage("boards"),
    }
  )
);
