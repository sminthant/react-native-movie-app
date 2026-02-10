import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemeColors } from "@/context/ThemeContext";
import { getTrendingBySearchCount, recordMovieSearch } from "@/lib/appwrite";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
import {
  fetchMovie,
  fetchMovieById,
  GenreKey,
  GENRES,
} from "../../service/api";
import SearchBar from "../components/SearchBar";

type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
};

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const SCREEN_WIDTH = Dimensions.get("window").width;
const HERO_WIDTH = SCREEN_WIDTH - 32;
const TRENDING_CARD_WIDTH = 140;
const TRENDING_CARD_HEIGHT = TRENDING_CARD_WIDTH * 1.5;

export default function Home() {
  const { colors } = useTheme();
  const { userId } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GenreKey>("All");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [trendingForYou, setTrendingForYou] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = useMemo(
    () => StyleSheet.create(createHomeStyles(colors)),
    [colors],
  );

  const loadMovies = useCallback(
    async (query?: string, category?: GenreKey) => {
      try {
        setLoading(true);
        setError(null);

        const genreId = category ? GENRES[category] : GENRES[selectedCategory];

        const result = await fetchMovie({
          query: query || undefined,
          genreId: genreId || undefined,
        });

        setMovies(result);
      } catch (err: any) {
        setError(err.message || "Error fetching movies");
      } finally {
        setLoading(false);
      }
    },
    [selectedCategory],
  );

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true);
    try {
      const isLoggedIn = userId != null && userId > 0;
      let docs = await getTrendingBySearchCount(10, isLoggedIn ? userId : undefined);
      let forYou = isLoggedIn && docs.length > 0;
      if (isLoggedIn && docs.length === 0) {
        docs = await getTrendingBySearchCount(10, undefined);
        forYou = false;
      }
      setTrendingForYou(forYou);
      const details = await Promise.all(
        docs.map((d) => fetchMovieById(String(d.movieId))),
      );
      const list: Movie[] = details
        .filter((m): m is NonNullable<typeof m> => m != null)
        .map((m) => ({
          id: m.id,
          title: m.title,
          poster_path: m.poster_path,
          vote_average: m.vote_average,
          release_date: m.release_date ?? "",
        }))
        .slice(0, 10);
      setTrendingMovies(list);
    } catch {
      setTrendingMovies([]);
      setTrendingForYou(false);
    } finally {
      setTrendingLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadMovies();
      loadTrending();
    }, [loadMovies, loadTrending]),
  );

  const featuredMovies = movies.slice(0, 5);

  const openMovie = (movie: Movie, recordSearch?: boolean) => {
    const shouldRecord =
      recordSearch || (searchQuery.trim().length > 0);
    if (shouldRecord) {
      recordMovieSearch(movie.id, {
        posterUrl: movie.poster_path
          ? `${IMAGE_BASE_URL}${movie.poster_path}`
          : null,
        movieTitle: movie.title,
        userId: userId ?? 0,
      }).catch(() => {});
    }
    router.push(`/movies/${movie.id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmit={() => loadMovies(searchQuery, selectedCategory)}
          />
        </View>

        {/* Hero Carousel */}
        {!error && featuredMovies.length > 0 && !searchQuery && (
          <HeroCarousel
            movies={featuredMovies}
            styles={styles}
            onMoviePress={openMovie}
          />
        )}

        {/* Category Filters */}
        <View style={styles.categorySection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryContainer}
          >
            {(Object.keys(GENRES) as GenreKey[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Movies Grid */}
        <ScrollView
          style={styles.moviesScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.moviesContent}
        >
          {/* Trending by search count — only when "All" category is selected */}
          {!searchQuery && selectedCategory === "All" && (
            <View style={styles.trendingSection}>
              <View style={styles.trendingHeader}>
                <Text style={styles.trendingTitle}>Trending</Text>
                <Text style={styles.trendingSubtitle}>
                  {trendingForYou
                    ? "Most searched by you"
                    : "Most searched"}
                </Text>
              </View>
              {trendingLoading ? (
                <View style={styles.trendingLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : trendingMovies.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trendingScrollContent}
                >
                  {trendingMovies.map((movie, index) => (
                    <TrendingMovieCard
                      key={movie.id}
                      movie={movie}
                      rank={index + 1}
                      onPress={() => openMovie(movie, true)}
                      styles={styles}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Discover</Text>
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!loading && !error && movies.length > 0 && (
            <View style={styles.moviesGrid}>
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPress={() => openMovie(movie)}
                  styles={styles}
                />
              ))}
            </View>
          )}

          {!loading && !error && movies.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No movies found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* ---------- HERO CAROUSEL ---------- */
const HeroCarousel = ({
  movies,
  styles,
  onMoviePress,
}: {
  movies: Movie[];
  styles: ReturnType<typeof createHomeStyles>;
  onMoviePress: (movie: Movie) => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const onScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentIndex(index);
  };

  return (
    <View style={styles.heroWrapper}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.heroScroll}
      >
        {movies.map((movie) => (
          <HeroBanner
            key={movie.id}
            movie={movie}
            styles={styles}
            onPress={() => onMoviePress(movie)}
          />
        ))}
      </ScrollView>
      <View style={styles.heroDots}>
        {movies.map((_, index) => (
          <View
            key={index}
            style={[
              styles.heroDot,
              currentIndex === index && styles.heroDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

/* ---------- HERO BANNER ---------- */
const HeroBanner = ({
  movie,
  styles,
  onPress,
}: {
  movie: Movie;
  styles: ReturnType<typeof createHomeStyles>;
  onPress: () => void;
}) => {
  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "N/A";

  return (
    <TouchableOpacity
      style={styles.heroBanner}
      onPress={onPress}
      activeOpacity={1}
    >
      <Image
        source={{
          uri: movie.poster_path
            ? `${IMAGE_BASE_URL}${movie.poster_path}`
            : "https://via.placeholder.com/400x200",
        }}
        style={styles.heroImage}
        resizeMode="cover"
      />
      <View style={styles.heroGradient}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {movie.title}
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroRatingBadge}>
              <Text style={styles.heroRatingText}>
                ⭐ {movie.vote_average.toFixed(1)}
              </Text>
            </View>
            <Text style={styles.heroYear}>{year}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ---------- TRENDING MOVIE CARD (slider) ---------- */
const TrendingMovieCard = ({
  movie,
  rank,
  onPress,
  styles,
}: {
  movie: Movie;
  rank: number;
  onPress: () => void;
  styles: ReturnType<typeof createHomeStyles>;
}) => {
  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "N/A";
  return (
    <TouchableOpacity
      style={styles.trendingCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.trendingPosterWrap}>
        <Image
          source={{
            uri: movie.poster_path
              ? `${IMAGE_BASE_URL}${movie.poster_path}`
              : "https://via.placeholder.com/200x300",
          }}
          style={styles.trendingPoster}
          resizeMode="cover"
        />
        <View style={styles.trendingRankBadge}>
          <Text style={styles.trendingRankText}>Top {rank}</Text>
        </View>
      </View>
      <Text style={styles.trendingCardTitle} numberOfLines={2}>
        {movie.title}
      </Text>
      <Text style={styles.trendingCardYear}>{year}</Text>
    </TouchableOpacity>
  );
};

/* ---------- MOVIE CARD ---------- */
const MovieCard = ({
  movie,
  onPress,
  styles,
}: {
  movie: Movie;
  onPress: () => void;
  styles: ReturnType<typeof createHomeStyles>;
}) => {
  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "N/A";

  return (
    <TouchableOpacity
      style={styles.movieCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.moviePosterContainer}>
        <Image
          source={{
            uri: movie.poster_path
              ? `${IMAGE_BASE_URL}${movie.poster_path}`
              : "https://via.placeholder.com/200x300",
          }}
          style={styles.moviePoster}
          resizeMode="cover"
        />
        <View style={styles.movieRatingBadge}>
          <Text style={styles.movieRatingText}>
            ⭐ {movie.vote_average.toFixed(1)}
          </Text>
        </View>
      </View>
      <View style={styles.movieInfo}>
        <Text style={styles.movieCardTitle} numberOfLines={2}>
          {movie.title}
        </Text>
        <Text style={styles.movieCardYear}>{year}</Text>
      </View>
    </TouchableOpacity>
  );
};

/* ---------- STYLES ---------- */
function createHomeStyles(colors: ThemeColors) {
  return {
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 0,
      paddingTop: 8,
      paddingBottom: 20,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.text,
      letterSpacing: -0.5,
    },
    trendingSection: { marginBottom: 24 },
    trendingHeader: { marginBottom: 14 },
    trendingTitle: {
      fontSize: 20,
      fontWeight: "800" as const,
      color: colors.text,
      letterSpacing: -0.4,
    },
    trendingSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    trendingLoader: {
      height: TRENDING_CARD_HEIGHT + 56,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    trendingScrollContent: { paddingRight: 20 },
    trendingCard: {
      width: TRENDING_CARD_WIDTH,
      marginRight: 14,
    },
    trendingPosterWrap: { position: "relative" as const, marginBottom: 8 },
    trendingPoster: {
      width: TRENDING_CARD_WIDTH,
      height: TRENDING_CARD_HEIGHT,
      borderRadius: 14,
      backgroundColor: colors.card,
    },
    trendingRankBadge: {
      position: "absolute" as const,
      top: 8,
      left: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    trendingRankText: {
      color: colors.primaryText,
      fontSize: 12,
      fontWeight: "800" as const,
    },
    trendingCardTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.text,
      marginBottom: 2,
      lineHeight: 18,
    },
    trendingCardYear: { fontSize: 12, color: colors.textMuted },
    headerSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: 4,
      fontWeight: "400" as const,
    },
    searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
    heroWrapper: { marginBottom: 24 },
    heroScroll: { borderRadius: 20 },
    heroBanner: {
      width: HERO_WIDTH,
      height: 190,
      borderRadius: 20,
      overflow: "hidden" as const,
      marginHorizontal: 16,
      backgroundColor: colors.card,
    },
    heroImage: { width: "100%" as const, height: "100%" as const },
    heroGradient: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end" as const,
    },
    heroContent: { padding: 20 },
    heroTitle: {
      fontSize: 26,
      fontWeight: "700" as const,
      color: "#FFFFFF",
      marginBottom: 12,
      letterSpacing: -0.3,
    },
    heroMeta: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    heroRatingBadge: {
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    heroRatingText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700" as const,
    },
    heroYear: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "500" as const,
    },
    heroDots: {
      flexDirection: "row" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      marginTop: 12,
      gap: 6,
    },
    heroDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    heroDotActive: {
      width: 24,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    categorySection: { marginBottom: 20 },
    categoryContainer: { paddingHorizontal: 20, gap: 10 },
    categoryChip: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    categoryChipTextActive: {
      color: colors.primaryText,
    },
    moviesScroll: { flex: 1 },
    moviesContent: { paddingHorizontal: 20, paddingBottom: 160 },
    moviesGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "space-between" as const,
      gap: 16,
    },
    movieCard: { width: "47%" as const, marginBottom: 20 },
    moviePosterContainer: { position: "relative" as const, marginBottom: 10 },
    moviePoster: {
      width: "100%" as const,
      height: 280,
      borderRadius: 16,
      backgroundColor: colors.card,
    },
    movieRatingBadge: {
      position: "absolute" as const,
      top: 12,
      right: 12,
      backgroundColor: colors.overlay,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    movieRatingText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700" as const,
    },
    movieInfo: { paddingHorizontal: 4 },
    movieCardTitle: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.text,
      marginBottom: 4,
      lineHeight: 22,
    },
    movieCardYear: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "500" as const,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      minHeight: 300,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      minHeight: 300,
    },
    errorText: {
      color: colors.error,
      fontSize: 16,
      fontWeight: "500" as const,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      minHeight: 300,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: "500" as const,
    },
  };
}
