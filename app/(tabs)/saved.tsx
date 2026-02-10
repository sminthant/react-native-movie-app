import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemeColors } from "@/context/ThemeContext";
import {
  deleteSavedMovie,
  listSavedMovies,
  type SavedMovieDoc,
} from "@/lib/appwrite";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchMovieById } from "../../service/api";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

type SavedItem = SavedMovieDoc & {
  title?: string;
  poster_path?: string | null;
  release_date?: string;
};

function createSavedStyles(colors: ThemeColors) {
  return {
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, paddingHorizontal: 20 },
    header: { paddingTop: 8, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.text },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 4,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    center: {
      flex: 1,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      minHeight: 200,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: "center" as const,
    },
    card: {
      width: CARD_WIDTH,
      marginBottom: 20,
    },
    posterWrap: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 12,
      overflow: "hidden" as const,
      backgroundColor: colors.backgroundSecondary,
    },
    poster: {
      width: "100%" as const,
      height: "100%" as const,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.text,
      marginTop: 8,
    },
    cardYear: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    removeBtn: {
      position: "absolute" as const,
      top: 8,
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    row: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "space-between" as const,
    },
    signInPrompt: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: "center" as const,
      marginBottom: 16,
    },
    signInLink: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.primary,
    },
  };
}

export default function Saved() {
  const { colors } = useTheme();
  const { userId } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const styles = useMemo(
    () => StyleSheet.create(createSavedStyles(colors) as any),
    [colors],
  );

  const loadSaved = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const docs = await listSavedMovies(userId);
      const withDetails: SavedItem[] = await Promise.all(
        docs.map(async (doc) => {
          const movie = await fetchMovieById(String(doc.movieId));
          return {
            ...doc,
            title: movie?.title,
            poster_path: movie?.poster_path ?? null,
            release_date: movie?.release_date,
          };
        }),
      );
      setItems(withDetails);
    } catch (err) {
      console.warn("Failed to load saved movies:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved]),
  );

  const openMovie = useCallback(
    (movieId: number) => router.push(`/movies/${movieId}`),
    [router],
  );

  const removeSaved = useCallback(async (documentId: string, e?: any) => {
    e?.stopPropagation?.();
    setRemovingId(documentId);
    try {
      await deleteSavedMovie(documentId);
      setItems((prev) => prev.filter((i) => i.$id !== documentId));
    } catch (err) {
      console.warn("Failed to remove saved movie:", err);
    } finally {
      setRemovingId(null);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SavedItem }) => {
      const posterUri = item.poster_path
        ? `${IMAGE_BASE_URL}${item.poster_path}`
        : "https://via.placeholder.com/400x600";
      const year = item.release_date
        ? new Date(item.release_date).getFullYear()
        : "";

      return (
        <View style={styles.card}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openMovie(item.movieId)}
            style={styles.posterWrap}
          >
            <Image
              source={{ uri: posterUri }}
              style={styles.poster}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={(e) => removeSaved(item.$id, e)}
              disabled={removingId === item.$id}
            >
              {removingId === item.$id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16 }}>×</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title ?? `Movie ${item.movieId}`}
          </Text>
          {year ? <Text style={styles.cardYear}>{year}</Text> : null}
        </View>
      );
    },
    [styles, removingId, removeSaved, openMovie],
  );

  const keyExtractor = useCallback((item: SavedItem) => item.$id, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Saved</Text>
          <Text style={styles.subtitle}>
            {!userId
              ? "Sign in to save movies and see them here."
              : items.length === 0 && !loading
                ? "Save movies from their detail page to see them here."
                : `${items.length} saved`}
          </Text>
        </View>

        {!userId ? (
          <View style={styles.center}>
            <Text style={styles.signInPrompt}>
              Sign in to see your saved movies
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.signInLink}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No saved movies yet</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
