import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ping } from "@/lib/appwrite";
import { useEffect } from "react";
import "react-native-url-polyfill/auto";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "./global.css";

function ThemeAwareStatusBar() {
  const { isDark } = useTheme();
  return (
    <StatusBar style={isDark ? "light" : "dark"} />
  );
}

export default function RootLayout() {
  useEffect(() => {
    ping().catch(() => {
      // Ignore: health endpoint may require health.read scope; app works without it
    });
  }, []);

  return (
    <ThemeProvider>
      <ThemeAwareStatusBar />
      <Stack>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="movies/[id]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
