import { useTheme, type ThemeColors } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { recordMovieSearch } from "@/lib/appwrite";
import { fetchMovie } from "../../service/api";
import SearchBar from "../components/SearchBar";

/* ---------- TYPES ---------- */
type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
};

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function buildPosterUrl(posterPath: string | null): string | null {
  return posterPath ? `${IMAGE_BASE_URL}${posterPath}` : null;
}
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

/* ---------- MAIN ---------- */
export default function Search() {
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const styles = useMemo(
    () => StyleSheet.create(createSearchStyles(colors)),
    [colors]
  );

  /* ---------- AUTO SEARCH (DEBOUNCE) ---------- */
  useEffect(() => {
    const term = query.trim();

    if (!term) {
      setMovies([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const result = await fetchMovie({ query: term });
        setMovies(result);
      } catch {
        setMovies([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const openMovie = (movie: Movie) => {
    recordMovieSearch(movie.id, {
      posterUrl: buildPosterUrl(movie.poster_path),
      movieTitle: movie.title,
    }).catch((err) => {
      console.warn("Failed to record movie search in Appwrite:", err);
    });
    router.push(`/movies/${movie.id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Search</Text>
          <Text style={styles.subtitle}>Find movies by title</Text>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchWrap}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onSubmit={() => {}}
          />
        </View>

        {/* CONTENT */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {!loading && searched && movies.length === 0 && (
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                No movies found for &apos;{query}&apos;
              </Text>
            </View>
          )}

          {!loading && movies.length > 0 && (
            <View style={styles.grid}>
              {movies.map((movie) => (
                <SearchMovieCard
                  key={movie.id}
                  movie={movie}
                  onPress={() => openMovie(movie)}
                  styles={styles}
                />
              ))}
            </View>
          )}

          {!loading && !searched && (
            <View style={styles.center}>
              <Text style={styles.hint}>
                Type a movie name and results will appear
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ---------- MOVIE CARD ---------- */
function SearchMovieCard({
  movie,
  onPress,
  styles,
}: {
  movie: Movie;
  onPress: () => void;
  styles: ReturnType<typeof createSearchStyles>;
}) {
  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "N/A";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image
        source={{
          uri: movie.poster_path
            ? `${IMAGE_BASE_URL}${movie.poster_path}`
            : "https://via.placeholder.com/200x300",
        }}
        style={styles.poster}
        resizeMode="cover"
      />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {movie.title}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.rating}>⭐ {movie.vote_average.toFixed(1)}</Text>
          <Text style={styles.year}>{year}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ---------- STYLES ---------- */
function createSearchStyles(colors: ThemeColors) {
  return {
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
    title: {
      fontSize: 28,
      fontWeight: "800" as const,
      color: colors.text,
    },
    subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
    searchWrap: { paddingHorizontal: 20, marginBottom: 16 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 160 },
    center: {
      flex: 1,
      minHeight: 200,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    hint: { fontSize: 15, color: colors.textMuted },
    emptyText: { fontSize: 16, color: colors.textSecondary, textAlign: "center" as const },
    grid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "space-between" as const,
    },
    card: { width: CARD_WIDTH, marginBottom: 20 },
    poster: {
      width: "100%" as const,
      height: CARD_WIDTH * 1.5,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    cardInfo: { marginTop: 8, paddingHorizontal: 4 },
    cardTitle: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.text,
      marginBottom: 4,
    },
    cardMeta: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    rating: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    year: { fontSize: 13, color: colors.textMuted },
  };
}
