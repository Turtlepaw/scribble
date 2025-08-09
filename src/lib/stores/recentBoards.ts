import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentBoardsState {
  recentBoards: string[]; // Array of board IDs
  addRecentBoard: (boardId: string) => void;
  removeRecentBoard: (boardId: string) => void;
  clearRecentBoards: () => void;
}

export const useRecentBoardsStore = create<RecentBoardsState>()(
  persist(
    (set) => ({
      recentBoards: [],

      addRecentBoard: (boardId: string) =>
        set((state) => {
          // Remove board if it already exists (to reorder)
          const filtered = state.recentBoards.filter((id) => id !== boardId);
          // Add board to the beginning of the array (most recent first)
          return { recentBoards: [boardId, ...filtered] };
        }),

      removeRecentBoard: (boardId: string) =>
        set((state) => ({
          recentBoards: state.recentBoards.filter((id) => id !== boardId),
        })),

      clearRecentBoards: () => set({ recentBoards: [] }),
    }),
    {
      name: "recent-boards-storage", // name for localStorage
    }
  )
);
