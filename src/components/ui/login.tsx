// components/LoginButton.tsx
"use client";
import { useAuth } from "@/lib/useAuth";

export default function LoginButton() {
  const { login, loading, session } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (session) return <p>Signed in as {session.sub}</p>;

  return (
    <button onClick={() => login("your.handle.bsky.social")}>
      Sign in with Bluesky
    </button>
  );
}
