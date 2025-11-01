import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiRequest, ApiError } from "@/lib/api";

const AUTH_STORAGE_KEY = "@reptiai/auth-state";

type AuthUser = {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

type AuthSession = {
  token: string;
  expiresAt: string;
};

type Credentials = {
  username: string;
  password: string;
};

type StoredAuthState = {
  user: AuthUser;
  session: AuthSession;
};

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  isInitializing: boolean;
  isAuthenticating: boolean;
  error: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

type AuthResponse = {
  user: AuthUser;
  session: AuthSession;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isSessionExpired(session: AuthSession | null): boolean {
  if (!session) return true;
  return new Date(session.expiresAt).getTime() <= Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistAuthState = useCallback(
    async (nextUser: AuthUser | null, nextSession: AuthSession | null) => {
      if (nextUser && nextSession) {
        const payload: StoredAuthState = { user: nextUser, session: nextSession };
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
        return;
      }

      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    },
    []
  );

  const applyAuthState = useCallback(
    async (nextUser: AuthUser | null, nextSession: AuthSession | null) => {
      setUser(nextUser);
      setSession(nextSession);
      await persistAuthState(nextUser, nextSession);
    },
    [persistAuthState]
  );

  const restoreSession = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed: StoredAuthState = JSON.parse(stored);

      if (isSessionExpired(parsed.session)) {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        return;
      }

      try {
        const refreshed = await apiRequest<AuthResponse>("/auth/me", {
          token: parsed.session.token,
        });

        await applyAuthState(refreshed.user, refreshed.session);
      } catch (authError) {
        const status = (authError as { status?: number }).status;
        if (status === 401 || status === 403) {
          await applyAuthState(null, null);
          return;
        }

        // Network or server error - keep cached session for offline support
        setUser(parsed.user);
        setSession(parsed.session);
      }
    } catch (storageError) {
      console.warn("Failed to restore auth state", storageError);
    }
  }, [applyAuthState]);

  useEffect(() => {
    restoreSession().finally(() => setIsInitializing(false));
  }, [restoreSession]);

  const handleAuthentication = useCallback(
    async (endpoint: "/auth/login" | "/auth/register", credentials: Credentials) => {
    setError(null);
    setIsAuthenticating(true);

    try {
        const payload = await apiRequest<AuthResponse>(endpoint, {
          method: "POST",
          body: credentials,
      });

        await applyAuthState(payload.user, payload.session);
    } catch (authError) {
      if (__DEV__) {
        console.warn("[AuthProvider] authentication error", authError);
        if (authError instanceof ApiError && authError.cause) {
          console.warn("[AuthProvider] authentication error cause", authError.cause);
        }
      }
      const message =
          authError instanceof Error ? authError.message : "Authentication failed";
      setError(message);
      throw authError;
    } finally {
      setIsAuthenticating(false);
    }
    },
    [applyAuthState]
  );

  const signIn = useCallback(
    async (username: string, password: string) => {
      await handleAuthentication("/auth/login", { username, password });
    },
    [handleAuthentication]
  );

  const signUp = useCallback(
    async (username: string, password: string) => {
      await handleAuthentication("/auth/register", { username, password });
    },
    [handleAuthentication]
  );

  const signOut = useCallback(async () => {
    const token = session?.token;

    setUser(null);
    setSession(null);
    await persistAuthState(null, null);

    if (!token) {
      return;
    }

    try {
      await apiRequest<{ success: boolean }>("/auth/logout", {
        method: "POST",
        token,
      });
    } catch (logoutError) {
      // Ignore logout errors - session already cleared locally
      if (__DEV__) {
        console.warn("Failed to notify server about logout", logoutError);
      }
    }
  }, [persistAuthState, session?.token]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      isInitializing,
      isAuthenticating,
      error,
      signIn,
      signUp,
      signOut,
      clearError,
    }),
    [
      user,
      session,
      isInitializing,
      isAuthenticating,
      error,
      signIn,
      signUp,
      signOut,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

