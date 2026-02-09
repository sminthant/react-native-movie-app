import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";

const TAB_BAR_BOTTOM = 28;
const TAB_BAR_HEIGHT = 78;
const TAB_BAR_HORIZONTAL = 20;
const THEME_BTN_SIZE = 44;
const THEME_BTN_TOP = TAB_BAR_BOTTOM + (TAB_BAR_HEIGHT - THEME_BTN_SIZE) / 2;
const THEME_BTN_RIGHT = TAB_BAR_HORIZONTAL + 12;

function TabsLayout() {
  const { colors, isDark, toggleTheme } = useTheme();
  return (
    <View style={styles.wrapper}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 10,
          marginBottom: -1,
        },
        tabBarItemStyle: {
          paddingVertical: 1,
        },
        tabBarStyle: {
          position: "absolute",
          bottom: 28,
          left: 20,
          right: 20,
          paddingVertical: 80,
          height: 78,
          backgroundColor: colors.tabBar,
          borderRadius: 18,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 6,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bookmark" : "bookmark-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
    <TouchableOpacity
      onPress={toggleTheme}
      style={[
        styles.themeBtn,
        {
          top: THEME_BTN_TOP,
          right: THEME_BTN_RIGHT,
          backgroundColor: colors.backgroundSecondary,
        },
      ]}
      activeOpacity={0.7}
    >
      <Ionicons name={isDark ? "sunny" : "moon"} size={22} color={colors.primary} />
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  themeBtn: {
    position: "absolute",
    width: THEME_BTN_SIZE,
    height: THEME_BTN_SIZE,
    borderRadius: THEME_BTN_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default TabsLayout;
