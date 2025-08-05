// lib/stores/useCurrentBoard.ts
import { create } from "zustand";

interface CurrentBoardState {
  currentBoard: string | null;
  setCurrentBoard: (board: string | null) => void;
}

export const useCurrentBoard = create<CurrentBoardState>((set) => ({
  currentBoard: null,
  setCurrentBoard: (board) => set({ currentBoard: board }),
}));
