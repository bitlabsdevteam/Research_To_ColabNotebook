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
}

const SupabaseSessionContext = createContext<SupabaseSessionContextType>({
  session: null,
  user: null,
  isLoading: true,
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // No Supabase credentials configured — skip auth, render children as-is
    if (!supabase) {
      setIsLoading(false);
      return;
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

  return (
    <SupabaseSessionContext.Provider
      value={{ session, user: session?.user ?? null, isLoading }}
    >
      {children}
    </SupabaseSessionContext.Provider>
  );
}

export function useSupabaseSession() {
  return useContext(SupabaseSessionContext);
}
