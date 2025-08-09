import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as z from "zod";

export const Board = z.object({
  name: z.string(),
  description: z.string(),
});

export type Board = z.infer<typeof Board>;

type BoardsState = {
  boards: Record<string, Record<string, Board>>;
  isLoading: boolean;
  setLoading: (value: boolean) => void;
  setBoard: (did: string, rkey: string, board: Board) => void;
  removeBoard: (did: string, rkey: string) => void;
  getBoards: (did: string) => Record<string, Board> | undefined;
  getBoardsAsEntries: (did: string) => [string, Board][] | undefined;
  getAllBoards: () => Record<string, Record<string, Board>>;
  clearBoards: (did?: string) => void;
};

export const useBoardsStore = create<BoardsState>()(
  persist(
    (set, get) => ({
      boards: {},
      isLoading: true,

      setLoading: (value) => set(() => ({ isLoading: value })),

      setBoard: (did, rkey, board) =>
        set((state) => ({
          boards: {
            ...state.boards,
            [did]: {
              ...state.boards[did],
              [rkey]: board,
            },
          },
        })),

      removeBoard: (did, rkey) =>
        set((state) => {
          const userBoards = state.boards[did];
          if (!userBoards || !userBoards[rkey]) return state;

          const { [rkey]: removed, ...rest } = userBoards;
          return {
            boards: {
              ...state.boards,
              [did]: rest,
            },
          };
        }),

      getBoards: (did) => get().boards[did],

      getBoardsAsEntries: (did) => {
        const boards = get().boards[did];
        return boards ? Object.entries(boards) : undefined;
      },

      getAllBoards: () => get().boards,

      clearBoards: (did) =>
        set((state) => {
          if (did) {
            const { [did]: removed, ...rest } = state.boards;
            return { boards: rest };
          } else {
            return { boards: {} };
          }
        }),
    }),
    {
      name: "boards",
      partialize: (state) => ({
        boards: state.boards,
      }),
      version: 2,
      // No need for custom storage anymore!
    }
  )
);
