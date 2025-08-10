"use client";
import { PropsWithChildren } from "react";
import { useBoards } from "../hooks/useBoards";
import { useBoardItems } from "../hooks/useBoardItems";
import { useModerationOpts } from "../hooks/useModerationOpts";

export function StoresProvider({ children }: PropsWithChildren) {
  useBoards();
  useBoardItems();
  useModerationOpts();
  return children;
}
