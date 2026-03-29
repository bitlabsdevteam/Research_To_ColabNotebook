"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "../lib/supabase";

interface SupabaseSessionContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SupabaseSessionContext = createContext<SupabaseSessionContextType>({
  session: null,
  user: null,
  isLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // No Supabase credentials configured — skip auth, render children as-is
    // Register a test-only mock session event (safe: only reachable when Supabase
    // credentials are absent, which never occurs in production deployments)
    if (!supabase) {
      setIsLoading(false);
      const handler = (e: Event) => {
        const customEvent = e as CustomEvent;
        setSession(customEvent.detail as Session | null);
      };
      window.addEventListener("__supabase_mock_session", handler);
      return () => window.removeEventListener("__supabase_mock_session", handler);
    }

    // Hydrate session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // Listen for auth changes (sign in / sign out / token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Also clear mock session in development
    setSession(null);
  }

  return (
    <SupabaseSessionContext.Provider
      value={{
        session,
        user: (session as any)?.user ?? null,
        isLoading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </SupabaseSessionContext.Provider>
  );
}

export function useSupabaseSession() {
  return useContext(SupabaseSessionContext);
}
