import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { ChevronDown, ExternalLink, LoaderCircle } from "lucide-react";
import { useBoardsStore } from "@/lib/stores/boards";
import { BoardsPicker } from "./BoardPicker";
import { toast } from "sonner";
import { AtUri } from "@atproto/api";
import { LIST_COLLECTION, LIST_ITEM_COLLECTION } from "@/constants";
import { FeedItem } from "./Feed";
import { BoardItem, useBoardItemsStore } from "@/lib/stores/boardItems";
import { useRecentBoardsStore } from "@/lib/stores/recentBoards";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SaveButton({
  post,
  image,
  onDropdownOpenChange,
}: {
  post: PostView;
  image: number;
  onDropdownOpenChange?: (isOpen: boolean) => void;
}) {
  const { agent } = useAuth();
  const [isLoading, setLoading] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState("");
  const boardsStore = useBoardsStore();
  const { setBoardItem } = useBoardItemsStore();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const { recentBoards, addRecentBoard } = useRecentBoardsStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle closing dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update parent component when dropdown state changes
  useEffect(() => {
    onDropdownOpenChange?.(isDropdownOpen);
  }, [isDropdownOpen, onDropdownOpenChange]);

  const saveToBoard = async (boardId: string) => {
    setLoading(true);
    try {
      if (!agent || !agent.assertDid) {
        toast("Unable to save - not logged in properly");
        return;
      }

      const record: BoardItem = {
        url: post.uri + `?image=${image}`,
        list: AtUri.make(agent.assertDid, LIST_COLLECTION, boardId).toString(),
        $type: LIST_ITEM_COLLECTION,
        createdAt: new Date().toISOString(),
      };
      const result = await agent?.com.atproto.repo.createRecord({
        collection: LIST_ITEM_COLLECTION,
        record,
        repo: agent?.assertDid || "",
      });

      if (result?.success) {
        const rkey = new AtUri(result.data.uri).rkey;
        setBoardItem(rkey, record);
        addRecentBoard(boardId);
        toast("Image saved");
        setOpen(false);
        setDropdownOpen(false);
      } else {
        toast("Failed to save image");
      }
    } finally {
      setLoading(false);
    }
  };

  if (agent == null) return <div>not logged in :(</div>;

  // Get board names for recent boards with correct board structure
  const recentBoardsWithNames = recentBoards
    .map((boardId) => {
      // Look through all DIDs in the boards store
      for (const did in boardsStore.boards) {
        // Check if this DID has the board we're looking for
        if (boardsStore.boards[did]?.[boardId]) {
          return {
            id: boardId,
            name: boardsStore.boards[did][boardId].name || "Unnamed Board",
          };
        }
      }
      // If board not found
      return { id: boardId, name: "Unnamed Board" };
    })
    .slice(0, 5); // Show only top 5 recent boards

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <div className="flex items-center" ref={dropdownRef}>
        {/* Main Save button - always opens dialog */}
        <Button
          size="sm"
          className="rounded-r-none border-r-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          Save
        </Button>

        {/* Dropdown arrow for recents */}
        <DropdownMenu
          open={isDropdownOpen}
          onOpenChange={(open) => {
            setDropdownOpen(open);
            onDropdownOpenChange?.(open);
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="default"
              className="rounded-l-none px-2 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50" sideOffset={5}>
            <DropdownMenuLabel>Recent Boards</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentBoardsWithNames.length > 0 ? (
              recentBoardsWithNames.map((board) => (
                <DropdownMenuItem
                  key={board.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    saveToBoard(board.id);
                  }}
                  className="cursor-pointer"
                >
                  {board.name}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled className="cursor-not-allowed">
                No recent boards
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save post to board</DialogTitle>
          <DialogDescription className="pt-5">
            <BoardsPicker
              onSelected={setSelectedBoard}
              selected={selectedBoard}
              boards={boardsStore.boards}
              onCreateBoard={async (name) => {
                const record = {
                  name: name,
                  $type: LIST_COLLECTION,
                  createdAt: new Date().toISOString(),
                  description: "",
                };
                const result = await agent?.com.atproto.repo.createRecord({
                  collection: LIST_COLLECTION,
                  record,
                  repo: agent.assertDid,
                });

                if (result?.success) {
                  toast("Board created");

                  const rkey = new AtUri(result.data.uri).rkey;
                  boardsStore.setBoard(agent.assertDid, rkey, record);
                  setSelectedBoard(rkey);
                } else {
                  toast("Failed to create board");
                }
              }}
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Saved posts use{" "}
              <a
                href="https://scrapboard.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:underline text-blue-400 mr-1"
              >
                scrapboard.org&apos;s
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
              standard format, making them interoperable.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={async (e) => {
              e.stopPropagation();
              addRecentBoard(selectedBoard);
              await saveToBoard(selectedBoard);
            }}
            disabled={selectedBoard.trim().length <= 0}
            className="cursor-pointer"
          >
            {isLoading && <LoaderCircle className="animate-spin ml-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
