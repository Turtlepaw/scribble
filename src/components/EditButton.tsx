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
import { EditIcon, LoaderCircle } from "lucide-react";
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
import { DeleteButton } from "./DeleteButton";

export function EditButton({
  board,
  rkey,
  className,
}: {
  board: Board;
  rkey: string;
  className: string;
}) {
  const { agent } = useAuth();
  const [isLoading, setLoading] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description);
  const { setBoard } = useBoardsStore();

  if (agent == null) return <div>not logged in :(</div>;
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={clsx("cursor-pointer", className)}
        >
          <Button
            size="sm"
            className={clsx("cursor-pointer")}
            variant={"ghost"}
          >
            <EditIcon />
          </Button>
        </span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update board</DialogTitle>
          <DialogDescription className="pt-5">
            <Input
              onChange={(e) => setName(e.target.value)}
              value={name}
              className="dark:text-white text-black"
            />
            <Textarea
              className="mt-2 dark:text-white text-black"
              onChange={(e) => setDescription(e.target.value)}
              value={description}
              placeholder="Enter a description of your board..."
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-between flex w-full">
          <DeleteButton board={board} rkey={rkey} />
          <Button
            onClick={async (e) => {
              e.stopPropagation(); // Optional, but safe

              setLoading(true);
              try {
                const record: Board = {
                  name,
                  description,
                };

                const result = await agent.com.atproto.repo.applyWrites({
                  repo: agent.assertDid,
                  writes: [
                    {
                      $type: "com.atproto.repo.applyWrites#update",
                      collection: LIST_COLLECTION,
                      value: record,
                      rkey: rkey,
                    },
                  ],
                });

                const newRecord = await agent.com.atproto.repo.getRecord({
                  repo: agent.assertDid,
                  collection: LIST_COLLECTION,
                  rkey: rkey,
                });

                const newRecordData = Board.safeParse(newRecord.data.value);

                if (
                  result?.success &&
                  newRecord.success &&
                  newRecordData.success
                ) {
                  setBoard(rkey, newRecordData.data);
                  toast("Board updated");
                  setOpen(false);
                } else {
                  toast("Failed to update board");
                }
              } finally {
                setLoading(false);
              }
            }}
            disabled={name.length <= 0}
            className="cursor-pointer"
          >
            {isLoading && <LoaderCircle className="animate-spin ml-2" />}
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
