import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, View } from "react-native";

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
};

const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, onSubmit }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        searchBar: {
          flexDirection: "row",
          alignItems: "center",
          height: 44,
          borderRadius: 12,
          paddingHorizontal: 12,
          backgroundColor: colors.inputBg,
        },
        input: {
          marginLeft: 8,
          flex: 1,
          fontSize: 14,
          color: colors.text,
        },
      }),
    [colors]
  );
  return (
    <View style={styles.searchBar}>
      <Ionicons name="search" size={18} color={colors.inputPlaceholder} />
      <TextInput
        placeholder="Search movies..."
        style={styles.input}
        placeholderTextColor={colors.inputPlaceholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
      />
    </View>
  );
};

export default SearchBar;
