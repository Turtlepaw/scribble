"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AppBskyActorDefs } from "@atproto/api";
import { useAuth } from "./hooks/useAuth";

type Profile = AppBskyActorDefs.ProfileViewDetailed;

type ProfileContextType = {
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
};

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { agent, loading: authLoading, session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!agent || authLoading || !session?.did)
        return console.warn(
          "No agent or session available",
          !agent,
          authLoading,
          session?.did
        );

      setLoading(true);
      setError(null);

      try {
        const res = await agent.getProfile({
          actor: session!.did,
        });
        setProfile(res.data);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch profile")
        );
        setProfile(null);
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [agent, authLoading, session]);

  return (
    <ProfileContext.Provider value={{ profile, loading, error }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}
