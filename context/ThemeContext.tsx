import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";

const STORAGE_KEY = "@app_theme_mode";

let AsyncStorage: {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
} | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
  // no persistence
}

export type ThemeMode = "light" | "dark";

export const PRIMARY_BUTTON_COLOR = "#059669";
export const PRIMARY_BUTTON_TEXT_COLOR = "#FFFFFF";

/** Use for logout UI so it's always visible in light and dark. From constants/colors. */
export const LOGOUT_BUTTON_BG = "#991B1B";
export const LOGOUT_BUTTON_TEXT = "#FFFFFF";

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
  logoutButton: string;
  logoutButtonText: string;
};

const light: ThemeColors = {
  background: "#FAFAFA",
  backgroundSecondary: "#F0FDF4",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  border: "#E2E8F0",
  card: "#F1F5F9",
  cardBorder: "#E2E8F0",
  primary: "#059669",
  primaryText: "#FFFFFF",
  tabBar: "#F0FDF4",
  tabBarBorder: "transparent",
  inputBg: "#F1F5F9",
  inputPlaceholder: "#94A3B8",
  error: "#DC2626",
  overlay: "rgba(0,0,0,0.5)",
  logoutButton: LOGOUT_BUTTON_BG,
  logoutButtonText: LOGOUT_BUTTON_TEXT,
};

const dark: ThemeColors = {
  background: "#0F172A",
  backgroundSecondary: "#1E293B",
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  border: "#334155",
  card: "#1E293B",
  cardBorder: "#334155",
  primary: "#10B981",
  primaryText: "#FFFFFF",
  tabBar: "#1E293B",
  tabBarBorder: "#334155",
  inputBg: "#334155",
  inputPlaceholder: "#64748B",
  error: "#F87171",
  overlay: "rgba(0,0,0,0.7)",
  logoutButton: LOGOUT_BUTTON_BG,
  logoutButtonText: LOGOUT_BUTTON_TEXT,
};

type State = { mode: ThemeMode };
type Action = { type: "SET"; payload: ThemeMode } | { type: "TOGGLE" };

function reduce(state: State, action: Action): State {
  switch (action.type) {
    case "SET":
      return { mode: action.payload };
    case "TOGGLE":
      return { mode: state.mode === "light" ? "dark" : "light" };
    default:
      return state;
  }
}

type Value = {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const Ctx = createContext<Value | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reduce, { mode: "light" });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!AsyncStorage) {
      setReady(true);
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark") dispatch({ type: "SET", payload: stored });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || !AsyncStorage) return;
    AsyncStorage.setItem(STORAGE_KEY, state.mode).catch(() => {});
  }, [state.mode, ready]);

  const setTheme = useCallback((mode: ThemeMode) => dispatch({ type: "SET", payload: mode }), []);
  const toggleTheme = useCallback(() => dispatch({ type: "TOGGLE" }), []);

  const colors = state.mode === "dark" ? dark : light;
  const value: Value = {
    mode: state.mode,
    colors,
    isDark: state.mode === "dark",
    setTheme,
    toggleTheme,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Value {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
