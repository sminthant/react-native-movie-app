import { useTheme } from "@/context/ThemeContext";
import React from "react";
import { Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const { colors } = useTheme();

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
        title: {
          fontSize: 28,
          fontWeight: "800",
          color: colors.text,
          marginBottom: 8,
        },
        subtitle: { fontSize: 15, color: colors.textSecondary },
      }),
    [colors]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Your account and preferences</Text>
      </View>
    </SafeAreaView>
  );
}
