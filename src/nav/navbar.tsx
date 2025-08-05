"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle"; // for dark mode toggle
import { LoaderCircle, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/lib/useProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { session, logout } = useAuth();
  const { profile, loading } = useProfile();

  return (
    <header className="border-b border-border bg-background/90 backdrop-blur-[200px] sticky top-0 z-50">
      <div className="flex items-center justify-between h-16 px-5">
        <Link
          href="/"
          className="text-xl font-bold hover:text-black/70 dark:hover:text-white/70 transition-colors"
        >
          pin.to.it
        </Link>

        <nav className="hidden md:flex gap-4">
          {/* <Link href="/explore" className="hover:underline">
            Explore
          </Link>
          <Link href="/profile" className="hover:underline">
            Profile
          </Link>
          <Link href="/settings" className="hover:underline">
            Settings
          </Link> */}
        </nav>

        <div className="flex items-center gap-2">
          <ModeToggle />
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer">
                <Button variant="ghost" size="icon" className="cursor-pointer">
                  {loading ? (
                    <span className="loader"></span>
                  ) : (
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={profile?.avatar} />
                      <AvatarFallback>
                        {profile?.displayName || profile?.handle}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {/* <DropdownMenuItem>Profile</DropdownMenuItem> */}
                <Link href={"/boards"}>
                  <DropdownMenuItem className="cursor-pointer">
                    My Boards
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem className="cursor-pointer" onClick={logout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 pb-4">
          <nav className="flex flex-col gap-2 mt-2">
            <Link href="/explore" onClick={() => setOpen(false)}>
              Explore
            </Link>
            <Link href="/profile" onClick={() => setOpen(false)}>
              Profile
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)}>
              Settings
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function LoginButton() {
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
          <DialogTitle>Login with your handle on the Atmosphere</DialogTitle>
          <DialogDescription className="pt-5">
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="example.bsky.social"
              className="dark:text-white text-black"
            />
          </DialogDescription>
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
            Sign In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
