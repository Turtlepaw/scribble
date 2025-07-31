import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/useAuth";
import { useState } from "react";
import { Button } from "./ui/button";
import { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
import { LoaderCircle } from "lucide-react";

function SaveButton(post: PostView) {
  const { login } = useAuth();
  const [handle, setHandle] = useState("");
  const [isLoading, setLoading] = useState(false);
  return (
    <Dialog>
      <DialogTrigger>
        <Button size="sm" className="cursor-pointer">
          Login
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save post to board</DialogTitle>
          <DialogDescription className="pt-5"></DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => {
              setLoading(true);
              login(handle);
            }}
            disabled={!handle}
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
