import React, { createContext, useCallback, useContext, useEffect, useReducer } from "react";

const THEME_STORAGE_KEY = "@app_theme_mode";

// Optional: persist theme. Install @react-native-async-storage/async-storage for persistence.
let AsyncStorage: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void> } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  // persistence disabled
}

export type ThemeMode = "light" | "dark";

export type ThemeColors = {
  background: string;
  backgroundSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  card: string;
  cardBorder: string;
  primary: string;
  primaryText: string;
  tabBar: string;
  tabBarBorder: string;
  inputBg: string;
  inputPlaceholder: string;
  error: string;
  overlay: string;
};

const lightColors: ThemeColors = {
  background: "#FFFFFF",
  backgroundSecondary: "#F5F5F5",
  text: "#1A1A1A",
  textSecondary: "#666666",
  textMuted: "#999999",
  border: "#E8E8E8",
  card: "#F0F0F0",
  cardBorder: "#E8E8E8",
  primary: "#da4167",
  primaryText: "#FFFFFF",
  tabBar: "#f0eff4",
  tabBarBorder: "transparent",
  inputBg: "#f2f2f2",
  inputPlaceholder: "#888",
  error: "#FF3B30",
  overlay: "rgba(0, 0, 0, 0.5)",
};

const darkColors: ThemeColors = {
  background: "#0D0D0D",
  backgroundSecondary: "#1A1A1A",
  text: "#FFFFFF",
  textSecondary: "#B0B0B0",
  textMuted: "#888888",
  border: "#2A2A2A",
  card: "#1E1E1E",
  cardBorder: "#2A2A2A",
  primary: "#e85578",
  primaryText: "#FFFFFF",
  tabBar: "#1A1A1A",
  tabBarBorder: "#2A2A2A",
  inputBg: "#2A2A2A",
  inputPlaceholder: "#888",
  error: "#FF6B6B",
  overlay: "rgba(0, 0, 0, 0.7)",
};

type ThemeState = { mode: ThemeMode };
type ThemeAction = { type: "SET_THEME"; payload: ThemeMode } | { type: "TOGGLE" };

function themeReducer(state: ThemeState, action: ThemeAction): ThemeState {
  switch (action.type) {
    case "SET_THEME":
      return { mode: action.payload };
    case "TOGGLE":
      return { mode: state.mode === "light" ? "dark" : "light" };
    default:
      return state;
  }
}

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const defaultState: ThemeState = { mode: "light" };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(themeReducer, defaultState);
  const [hydrated, setHydrated] = React.useState(false);

  useEffect(() => {
    if (!AsyncStorage) {
      setHydrated(true);
      return;
    }
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light" || stored === "dark") {
          dispatch({ type: "SET_THEME", payload: stored });
        }
      } catch {
        // ignore
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated || !AsyncStorage) return;
    AsyncStorage.setItem(THEME_STORAGE_KEY, state.mode).catch(() => {});
  }, [state.mode, hydrated]);

  const setTheme = useCallback((mode: ThemeMode) => {
    dispatch({ type: "SET_THEME", payload: mode });
  }, []);

  const toggleTheme = useCallback(() => {
    dispatch({ type: "TOGGLE" });
  }, []);

  const colors = state.mode === "dark" ? darkColors : lightColors;
  const value: ThemeContextValue = {
    mode: state.mode,
    colors,
    isDark: state.mode === "dark",
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
