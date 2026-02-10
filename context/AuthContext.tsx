import {
  loginUser as appwriteLogin,
  registerUser as appwriteRegister,
  userIdFromDocId,
  type AppUser,
} from "@/lib/appwrite";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_STORAGE_KEY = "@movie_app_user";

type AuthState = {
  user: AppUser | null;
  userId: number;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user ? userIdFromDocId(user.$id) : 0;

  const loadStoredUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppUser;
        setUser(parsed);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredUser();
  }, [loadStoredUser]);

  const login = useCallback(async (email: string, password: string) => {
    const appUser = await appwriteLogin(email, password);
    setUser(appUser);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(appUser));
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const appUser = await appwriteRegister({ username, email, password });
      setUser(appUser);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(appUser));
    },
    [],
  );

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const value: AuthContextValue = {
    user,
    userId,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
