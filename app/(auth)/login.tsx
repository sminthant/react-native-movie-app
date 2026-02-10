import { useAuth } from "@/context/AuthContext";
import {
  PRIMARY_BUTTON_COLOR,
  PRIMARY_BUTTON_TEXT_COLOR,
  useTheme,
  type ThemeColors,
} from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    container: {
      flexGrow: 1,
      paddingHorizontal: 28,
      paddingTop: 24,
      paddingBottom: 40,
    },
    hero: {
      alignItems: "center",
      marginBottom: 36,
      paddingTop: 20,
    },
    logo: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.primary + "22",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    form: {
      marginBottom: 28,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textMuted,
      marginBottom: 8,
    },
    labelFirst: { marginTop: 0 },
    labelSpaced: { marginTop: 18 },
    input: {
      height: 52,
      backgroundColor: colors.inputBg || colors.background,
      borderRadius: 14,
      paddingHorizontal: 18,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    error: {
      fontSize: 13,
      color: colors.error,
      marginTop: 10,
    },
    primaryBtn: {
      height: 54,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 28,
      backgroundColor: PRIMARY_BUTTON_COLOR,
    },
    primaryBtnText: {
      fontSize: 17,
      fontWeight: "700",
      color: PRIMARY_BUTTON_TEXT_COLOR,
    },
    secondaryBtn: {
      height: 54,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: "transparent",
    },
    secondaryBtnText: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.text,
    },
    footer: {
      alignItems: "center",
      marginTop: 8,
    },
    footerText: {
      fontSize: 14,
      color: colors.textMuted,
    },
  });
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Ionicons name="film" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to your account to continue
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.label, styles.labelFirst]}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.inputPlaceholder}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />
            <Text style={[styles.label, styles.labelSpaced]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.inputPlaceholder}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError("");
              }}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
              secureTextEntry
              editable={!loading}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={PRIMARY_BUTTON_TEXT_COLOR} size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit</Text>
              )}
            </Pressable>

            <Link href="/(auth)/register" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.secondaryBtnText}>Register</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? Register above.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
