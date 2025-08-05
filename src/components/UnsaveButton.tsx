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
import { LoaderCircle } from "lucide-react";
import { useBoardsStore } from "@/lib/stores/boards";
import { BoardsPicker } from "./BoardPicker";
import { toast } from "sonner";
import { AtUri } from "@atproto/api";
import { LIST_COLLECTION, LIST_ITEM_COLLECTION } from "@/constants";
import { FeedItem } from "./Feed";
import { useCurrentBoard } from "@/lib/stores/useCurrentBoard";
import { useBoardItemsStore } from "@/lib/stores/boardItems";

export function UnsaveButton({
  post,
  image,
}: {
  post: PostView;
  image: number;
}) {
  const { agent } = useAuth();
  const [isLoading, setLoading] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const { removeBoardItem, boardItems } = useBoardItemsStore();

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
            Remove
          </Button>
        </span>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove from board?</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this from your board?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>
            <Button className="cursor-pointer">Cancel</Button>
          </DialogClose>
          <Button
            onClick={async (e) => {
              e.stopPropagation(); // Optional, but safe

              setLoading(true);
              try {
                const postRkey = AtUri.make(post.uri).rkey;
                const record = boardItems
                  .entries()
                  .find((e) => AtUri.make(e[1].url).rkey == postRkey);
                if (!record)
                  return toast(
                    "Couldn't find post. You might be viewing stale data."
                  );

                const rkey = record[0];
                console.log("using rkey", rkey, "and record", record);
                const result = await agent.com.atproto.repo.deleteRecord({
                  collection: LIST_ITEM_COLLECTION,
                  rkey,
                  repo: agent.assertDid,
                });

                if (result?.success) {
                  removeBoardItem(rkey);
                  toast("Removed from board");
                  setOpen(false);
                } else {
                  toast("Failed to remove");
                }
              } finally {
                setLoading(false);
              }
            }}
            className="cursor-pointer"
            variant="destructive"
          >
            {isLoading && <LoaderCircle className="animate-spin ml-2" />}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
