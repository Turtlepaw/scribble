"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Board } from "@/lib/stores/boards";
import clsx from "clsx";

export function BoardsPicker({
  boards,
  onCreateBoard,
  onSelected: setValue,
  selected: value,
}: {
  selected: string;
  onSelected: (value: string) => unknown;
  boards: Map<string, Board>;
  onCreateBoard: (name: string) => void; // New prop
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const entries = Array.from(boards.entries()).filter(([_, board]) =>
    board.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedBoard = boards.get(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={clsx(
            "w-full justify-between",
            selectedBoard ? "dark:text-white text-black" : ""
          )}
        >
          {selectedBoard ? selectedBoard.name : "Select board..."}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or create a board..."
            onValueChange={(val) => setSearch(val)}
          />
          <CommandList>
            <CommandGroup>
              {entries.length > 0 ? (
                entries.map(([key, it]) => (
                  <CommandItem
                    key={key}
                    value={it.name}
                    onSelect={() => {
                      setValue(key === value ? "" : key);
                      setOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === key ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {it.name}
                  </CommandItem>
                ))
              ) : (
                <CommandItem
                  onSelect={() => {
                    onCreateBoard(search.trim());
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>
                    Create board: <b>{search.trim()}</b>
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
