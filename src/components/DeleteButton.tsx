import {
  Dialog,
  DialogClose,
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
import { DeleteIcon, EditIcon, LoaderCircle, TrashIcon } from "lucide-react";
import { Board, useBoardsStore } from "@/lib/stores/boards";
import { BoardsPicker } from "./BoardPicker";
import { toast } from "sonner";
import { AtUri } from "@atproto/api";
import { LIST_COLLECTION, LIST_ITEM_COLLECTION } from "@/constants";
import { FeedItem } from "./Feed";
import { BoardItem, useBoardItemsStore } from "@/lib/stores/boardItems";
import clsx from "clsx";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function DeleteButton({ board, rkey }: { board: Board; rkey: string }) {
  const { agent } = useAuth();
  const [isLoading, setLoading] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description);
  const { setBoard, removeBoard } = useBoardsStore();
  const { boardItems } = useBoardItemsStore();

  if (agent == null) return <div>not logged in :(</div>;
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={clsx("cursor-pointer")}
        >
          <Button
            className={clsx(
              "cursor-pointer",
              "text-red-400 hover:text-red-400"
            )}
            variant={"ghost"}
          >
            <TrashIcon /> Delete Board
          </Button>
        </span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete board?</DialogTitle>
          <DialogDescription className="pt-5">
            Are you sure you want to delete the board and all items in it?
            Looked like it was a pretty good board you had going there.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>
            <Button className="cursor-pointer" variant={"secondary"}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={async (e) => {
              e.stopPropagation(); // Optional, but safe

              setLoading(true);
              try {
                const listUri = AtUri.make(
                  agent.assertDid,
                  LIST_COLLECTION,
                  rkey
                );
                const items = boardItems
                  .entries()
                  .filter((e) => AtUri.make(e[1].list).rkey == listUri.rkey);

                for (const item of items) {
                  const itemDeleteRes =
                    await agent.com.atproto.repo.deleteRecord({
                      repo: agent.assertDid,
                      collection: LIST_ITEM_COLLECTION,
                      rkey: item[0],
                    });

                  if (!itemDeleteRes.success) {
                    toast(`Failed to delete ${item[0]}`);
                  }
                }

                const listDeleteRes = await agent.com.atproto.repo.deleteRecord(
                  {
                    repo: agent.assertDid,
                    collection: LIST_COLLECTION,
                    rkey: rkey,
                  }
                );

                if (listDeleteRes.success) {
                  removeBoard(rkey);
                  toast("Board deleted");
                  setOpen(false);
                } else {
                  toast("Failed to delete board");
                }
              } finally {
                setLoading(false);
              }
            }}
            disabled={name.length <= 0}
            className="cursor-pointer"
          >
            {isLoading && <LoaderCircle className="animate-spin ml-2" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
