import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DidDocument } from "@atcute/identity";
import { createMapStorage } from "../utils/mapStorage";

// Cache policy
const STALE_AFTER = 5 * 60 * 1000; // 5 minutes
const EXPIRE_AFTER = 60 * 60 * 1000; // 1 hour

export type CacheResult = {
  did: string;
  doc: DidDocument;
  updatedAt: number;
  stale: boolean;
  expired: boolean;
};

export type DidCache = {
  dids: Map<string, CacheResult>;
  setDid: (did: string, doc: DidDocument) => CacheResult;
  getDid: (did: string) => CacheResult | undefined;
  checkCache: (did: string) => CacheResult | null;
  refreshCache: (
    did: string,
    fetchFn: () => Promise<DidDocument | null>,
    prev?: CacheResult
  ) => Promise<void>;
  clearEntry: (did: string) => void;
  clear: () => void;
};

export const useDidStore = create<DidCache>()(
  persist(
    (set, get) => ({
      dids: new Map(),

      setDid: (did, doc) => {
        const now = Date.now();
        const entry: CacheResult = {
          did,
          doc,
          updatedAt: now,
          stale: false,
          expired: false,
        };
        set((state) => ({
          dids: new Map(state.dids).set(did, entry),
        }));
        return entry;
      },

      getDid: (did) => {
        return get().dids.get(did);
      },

      checkCache: (did) => {
        const entry = get().dids.get(did);
        if (!entry) return null;

        const now = Date.now();
        const age = now - entry.updatedAt;
        const stale = age > STALE_AFTER;
        const expired = age > EXPIRE_AFTER;

        if (stale !== entry.stale || expired !== entry.expired) {
          const updated: CacheResult = {
            ...entry,
            stale,
            expired,
          };
          set((state) => ({
            dids: new Map(state.dids).set(did, updated),
          }));
          return updated;
        }

        return entry;
      },

      refreshCache: async (
        did: string,
        fetchFn: () => Promise<DidDocument | null>,
        prev?: CacheResult
      ) => {
        try {
          const doc = await fetchFn();
          if (doc) {
            get().setDid(did, doc);
          } else if (prev) {
            // keep existing but mark as expired
            set((state) => {
              const updated: CacheResult = {
                ...prev,
                stale: true,
                expired: true,
              };
              return {
                dids: new Map(state.dids).set(did, updated),
              };
            });
          } else {
            get().clearEntry(did);
          }
        } catch {
          // network or validation failure — don't overwrite unless necessary
        }
      },

      clearEntry: (did) => {
        set((state) => {
          const map = new Map(state.dids);
          map.delete(did);
          return { dids: map };
        });
      },

      clear: () => {
        set(() => ({ dids: new Map() }));
      },
    }),
    {
      name: "dids",
      partialize: (state) => ({
        dids: state.dids,
      }),
      storage: createMapStorage("dids"),
    }
  )
);
