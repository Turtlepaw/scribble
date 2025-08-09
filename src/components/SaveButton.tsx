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
import { useState } from "react";
import { Button } from "./ui/button";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { LoaderCircle } from "lucide-react";
import { useBoardsStore } from "@/lib/stores/boards";
import { BoardsPicker } from "./BoardPicker";
import { toast } from "sonner";
import { AtUri } from "@atproto/api";
import { LIST_COLLECTION, LIST_ITEM_COLLECTION } from "@/constants";
import { FeedItem } from "./Feed";
import { BoardItem, useBoardItemsStore } from "@/lib/stores/boardItems";

export function SaveButton({ post, image }: { post: PostView; image: number }) {
  const { agent } = useAuth();
  const [isLoading, setLoading] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState("");
  const boardsStore = useBoardsStore();
  const { setBoardItem } = useBoardItemsStore();

  if (agent == null) return <div>not logged in :(</div>;
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="cursor-pointer"
        >
          <Button size="sm" className="cursor-pointer">
            Save
          </Button>
        </span>
      </DialogTrigger>

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
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={async (e) => {
              e.stopPropagation(); // Optional, but safe

              setLoading(true);
              try {
                const record: BoardItem = {
                  url: post.uri + `?image=${image}`,
                  list: AtUri.make(
                    agent?.assertDid,
                    LIST_COLLECTION,
                    selectedBoard
                  ).toString(),
                  $type: LIST_ITEM_COLLECTION,
                  createdAt: new Date().toISOString(),
                };
                const result = await agent.com.atproto.repo.createRecord({
                  collection: LIST_ITEM_COLLECTION,
                  record,
                  repo: agent.assertDid,
                });

                if (result?.success) {
                  const rkey = new AtUri(result.data.uri).rkey;
                  setBoardItem(rkey, record);
                  toast("Image saved");
                  setOpen(false);
                } else {
                  toast("Failed to save image");
                }
              } finally {
                setLoading(false);
              }
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
