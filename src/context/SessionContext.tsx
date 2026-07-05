"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session, ModuloSlug } from "@/types/session";
import { SESSION_COOKIE, parseSession, serializeSession } from "@/types/session";

interface SessionContextValue {
  session:    Session | null;
  loading:    boolean;
  setSession: (s: Session) => void;
  logout:     () => void;
  tieneAcceso: (modulo: ModuloSlug) => boolean;
}

const SessionContext = createContext<SessionContextValue>({
  session:     null,
  loading:     true,
  setSession:  () => {},
  logout:      () => {},
  tieneAcceso: () => false,
});

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

function writeCookie(name: string, value: string, maxAgeSecs: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSecs}; samesite=lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading]      = useState(true);
  const router = useRouter();

  useEffect(() => {
    const raw = getCookieValue(SESSION_COOKIE);
    if (raw) {
      const parsed = parseSession(raw);
      setSessionState(parsed);
    }
    setLoading(false);
  }, []);

  const setSession = useCallback((s: Session) => {
    writeCookie(SESSION_COOKIE, serializeSession(s), 60 * 60 * 24 * 7);
    setSessionState(s);
  }, []);

  const logout = useCallback(() => {
    deleteCookie(SESSION_COOKIE);
    setSessionState(null);
    router.push("/login");
  }, [router]);

  const tieneAcceso = useCallback(
    (modulo: ModuloSlug) => {
      if (!session) return false;
      if (session.es_admin) return true;
      return session.permisos.includes(modulo);
    },
    [session]
  );

  return (
    <SessionContext.Provider value={{ session, loading, setSession, logout, tieneAcceso }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
