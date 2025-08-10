import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ActorProfilesState {
  profiles: Record<string, ProfileViewDetailed>;
  loadingProfiles: Set<string>;
  errors: Record<string, string>;
  setProfile: (did: string, profile: ProfileViewDetailed) => void;
  setLoading: (did: string, isLoading: boolean) => void;
  setError: (did: string, error: string | null) => void;
  getProfile: (did: string) => ProfileViewDetailed | null;
  isLoading: (did: string) => boolean;
  getError: (did: string) => string | null;
}

export const useActorProfilesStore = create<ActorProfilesState>()(
  persist(
    (set, get) => ({
      profiles: {},
      loadingProfiles: new Set<string>(),
      errors: {},

      setProfile: (did, profile) =>
        set((state) => ({
          profiles: { ...state.profiles, [did]: profile },
        })),

      setLoading: (did, isLoading) =>
        set((state) => {
          const newLoadingProfiles = new Set(state.loadingProfiles);
          if (isLoading) {
            newLoadingProfiles.add(did);
          } else {
            newLoadingProfiles.delete(did);
          }
          return { loadingProfiles: newLoadingProfiles };
        }),

      setError: (did, error) =>
        set((state) => {
          const newErrors = { ...state.errors };
          if (error) {
            newErrors[did] = error;
          } else {
            delete newErrors[did];
          }
          return { errors: newErrors };
        }),

      getProfile: (did) => get().profiles[did] || null,
      isLoading: (did) => get().loadingProfiles.has(did),
      getError: (did) => get().errors[did] || null,
    }),
    {
      name: "actor-profiles-storage",
      partialize: (state) => ({ profiles: state.profiles }),
    }
  )
);

// Hook to fetch and use actor profiles
import { useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  ProfileView,
  ProfileViewDetailed,
} from "@atproto/api/dist/client/types/app/bsky/actor/defs";

export function useActorProfile(did: string | null) {
  const { agent } = useAuth();
  const { getProfile, setProfile, isLoading, setLoading, getError, setError } =
    useActorProfilesStore();

  useEffect(() => {
    if (!did || !agent) return;

    // Check if we already have the profile
    if (getProfile(did)) return;

    // Check if already loading
    if (isLoading(did)) return;

    const fetchProfile = async () => {
      setLoading(did, true);
      setError(did, null);

      try {
        const response = await agent.getProfile({ actor: did });
        if (response.success) {
          setProfile(did, response.data);
        } else {
          throw new Error("Failed to fetch profile");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(did, err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(did, false);
      }
    };

    fetchProfile();
  }, [did, agent, getProfile, setProfile, isLoading, setLoading, setError]);

  return {
    profile: did ? getProfile(did) : null,
    isLoading: did ? isLoading(did) : false,
    error: did ? getError(did) : null,
  };
}
