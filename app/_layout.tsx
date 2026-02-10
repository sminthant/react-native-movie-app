import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ping } from "@/lib/appwrite";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-url-polyfill/auto";
import "./global.css";

function ThemeAwareStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

export default function RootLayout() {
  useEffect(() => {
    ping().catch(() => {
      // Ignore: health endpoint may require health.read scope; app works without it
    });
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemeAwareStatusBar />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="movies/[id]" />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
