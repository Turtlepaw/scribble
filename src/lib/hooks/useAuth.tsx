"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  BrowserOAuthClient,
  AtprotoDohHandleResolver,
  type OAuthSession,
} from "@atproto/oauth-client-browser";
import { Agent } from "@atproto/api";
import { th } from "zod/v4/locales";

type AuthContextType = {
  session: OAuthSession | null;
  agent: Agent | null;
  loading: boolean;
  login: (handle: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<OAuthSession | null>(null);
  const [agent, setAgent] = useState<Agent | null>(
    new Agent({ service: "https://bsky.social" })
  );
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);

  useEffect(() => {
    const initClient = async () => {
      const isDev = process.env.NODE_ENV === "development";

      const c = isDev
        ? new BrowserOAuthClient({
            handleResolver: "https://bsky.social",
            clientMetadata: {
              client_name: "Statusphere React App",
              client_id: `http://localhost?scope=${encodeURI(
                "atproto transition:generic transition:chat.bsky"
              )}`,
              client_uri: "http://127.0.0.1:3000",
              redirect_uris: ["http://127.0.0.1:3000"],
              scope: "atproto transition:generic",
              grant_types: ["authorization_code", "refresh_token"],
              response_types: ["code"],
              application_type: "web",
              token_endpoint_auth_method: "none",
              dpop_bound_access_tokens: true,
            }, // loopback client
          })
        : await BrowserOAuthClient.load({
            handleResolver: "https://bsky.social",
            clientId: "https://pin.to.it/client-metadata.json",
          });

      setClient(c);

      try {
        const result = await c.init();
        if (result?.session) {
          console.log("session found", result);
          localStorage.setItem("did", result.session.did);
          const ag = new Agent(result.session);
          setSession(result.session);
          setAgent(ag);
          const prefs = await agent?.getPreferences();
          if (!prefs) return;
        } else {
          const did = localStorage.getItem("did");

          console.log("restoring", did);
          if (did != null) {
            const result = await c.restore(did);
            const ag = new Agent(result);
            setSession(result);
            setAgent(ag);
          }
        }
      } catch (err) {
        console.error("OAuth init failed", err);
      } finally {
        setLoading(false);
      }

      c.addEventListener("deleted", (event: CustomEvent) => {
        console.warn("Session invalidated", event.detail);
        setSession(null);
        setAgent(null);
      });
    };

    initClient();
  }, []);

  const login = useCallback(
    async (handle: string) => {
      if (!client) return;
      try {
        await client.signIn(handle, {
          scope: "atproto transition:generic",
          ui_locales: "en", // Only supported by some OAuth servers (requires OpenID Connect support + i18n support)
          signal: new AbortController().signal,
        });
      } catch (e) {
        console.warn("Login aborted or failed", e);
        throw new Error(
          `Login failed: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    },
    [client]
  );

  const logout = useCallback(() => {
    if (client && session) {
      client.revoke(session.sub);
      setSession(null);
      setAgent(null);
      // refresh page
      window.location.reload();
    }
  }, [client, session]);

  return (
    <AuthContext.Provider value={{ session, agent, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
