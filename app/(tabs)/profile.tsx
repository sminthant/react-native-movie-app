import { LOGOUT } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemeColors } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BOTTOM_PAD = 120;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: 28,
      paddingTop: 28,
      paddingBottom: BOTTOM_PAD,
    },
    header: {
      alignItems: "center",
      marginBottom: 36,
    },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 14,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    section: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 22,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowIcon: { marginRight: 12 },
    rowLabel: { fontSize: 14, color: colors.textMuted, flex: 1 },
    rowValue: { fontSize: 16, fontWeight: "600", color: colors.text },
    empty: { alignItems: "center", paddingVertical: 40 },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });
}

export default function Profile() {
  const { colors, isDark } = useTheme();
  const { user, logout } = useAuth();
  const logoutTextColor = isDark ? "#FFFFFF" : "#000000";
  const router = useRouter();
  const s = React.useMemo(() => createStyles(colors), [colors]);

  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={s.avatar}>
            <Ionicons name="person" size={38} color={colors.primary} />
          </View>
          <Text style={s.title}>Profile</Text>
          <Text style={s.subtitle}>
            {user ? "Account and preferences" : "Sign in to continue"}
          </Text>
        </View>

        {user ? (
          <>
            <Text style={s.section}>Account</Text>
            <View style={s.card}>
              <View style={s.row}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textMuted}
                  style={s.rowIcon}
                />
                <Text style={s.rowLabel}>Username</Text>
                <Text style={s.rowValue}>{user.username}</Text>
              </View>
              <View style={[s.row, s.rowLast]}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textMuted}
                  style={s.rowIcon}
                />
                <Text style={s.rowLabel}>Email</Text>
                <Text style={s.rowValue}>{user.email}</Text>
              </View>
            </View>

            <Text style={s.section}>Session</Text>
            <View style={{ marginBottom: 22, alignItems: "center" }}>
              <Pressable
                onPress={onLogout}
                style={({ pressed }) => ({
                  alignItems: "center",
                  justifyContent: "center",
                  height: 52,
                  paddingHorizontal: 32,
                  borderRadius: 14,
                  backgroundColor: LOGOUT.background,
                  borderWidth: 2,
                  borderColor: LOGOUT.border,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 4,
                })}
              >
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: logoutTextColor,
                    letterSpacing: 0.2,
                  }}
                >
                  Log out
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={s.empty}>
            <Text style={s.emptyText}>Sign in to see your profile.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
