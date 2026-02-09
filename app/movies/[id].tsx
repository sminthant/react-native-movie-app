import { useTheme, type ThemeColors } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createSavedMovie,
  deleteSavedMovie,
  getSavedByMovieId,
  type SavedMovieDoc,
} from "@/lib/appwrite";
import { fetchMovieById, MovieDetails } from "../../service/api";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

export default function MovieDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savedDoc, setSavedDoc] = useState<SavedMovieDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const styles = useMemo(
    () => StyleSheet.create(createMovieDetailStyles(colors) as Parameters<typeof StyleSheet.create>[0]),
    [colors]
  ) as any;

  const loadMovie = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchMovieById(id);
      setMovie(data);
    } catch {
      setMovie(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMovie();
  }, [loadMovie]);

  useEffect(() => {
    if (!id) return;
    const movieId = Number(id);
    if (Number.isNaN(movieId)) return;
    getSavedByMovieId(movieId)
      .then((doc) => {
        setSavedDoc(doc);
        setSaved(!!doc);
      })
      .catch(() => {
        setSavedDoc(null);
        setSaved(false);
      });
  }, [id]);

  const toggleSaved = useCallback(async () => {
    if (!id || saving) return;
    const movieId = Number(id);
    if (Number.isNaN(movieId)) return;
    setSaving(true);
    try {
      if (saved && savedDoc) {
        await deleteSavedMovie(savedDoc.$id);
        setSaved(false);
        setSavedDoc(null);
      } else {
        const doc = await createSavedMovie(movieId);
        setSaved(true);
        setSavedDoc(doc);
      }
    } catch (err) {
      console.warn("Failed to update saved state:", err);
    } finally {
      setSaving(false);
    }
  }, [id, saved, savedDoc, saving]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!movie) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Movie not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "N/A";
  const posterUri = movie.poster_path
    ? `${IMAGE_BASE_URL}${movie.poster_path}`
    : "https://via.placeholder.com/400x600";
  const backdropUri = movie.backdrop_path
    ? `${IMAGE_BASE_URL}${movie.backdrop_path}`
    : posterUri;

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={{ uri: backdropUri }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroShade} />

          {/* Floating back */}
          <SafeAreaView style={styles.heroSafe} edges={["top"]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.heroBackBtn}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={22} color={colors.primaryText} />
              <Text style={styles.heroBackText}>Back</Text>
            </TouchableOpacity>
          </SafeAreaView>

          {/* Title on hero */}
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle} numberOfLines={3}>
              {movie.title}
            </Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaPill}>
                <Ionicons name="star" size={14} color="#FFD60A" />
                <Text style={styles.heroMetaText}>
                  {movie.vote_average.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.heroMetaDot}>·</Text>
              <Text style={styles.heroMetaText}>{year}</Text>
              {movie.runtime != null && (
                <>
                  <Text style={styles.heroMetaDot}>·</Text>
                  <Text style={styles.heroMetaText}>{movie.runtime} min</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Content card */}
        <View style={styles.card}>
          <View style={styles.posterRow}>
            <View style={styles.posterWrap}>
              <Image
                source={{ uri: posterUri }}
                style={styles.poster}
                resizeMode="cover"
              />
            </View>
            <View style={styles.titleBlock}>
              {movie.genres?.length > 0 && (
                <View style={styles.genres}>
                  {movie.genres.slice(0, 3).map((g) => (
                    <View key={g.id} style={styles.genreChip}>
                      <Text style={styles.genreText}>{g.name}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, saved && styles.saveBtnActive]}
                onPress={toggleSaved}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={saved ? "#FFFFFF" : "#da4167"} />
                ) : (
                  <Ionicons
                    name={saved ? "bookmark" : "bookmark-outline"}
                    size={20}
                    color={saved ? "#FFFFFF" : "#da4167"}
                  />
                )}
                <Text
                  style={[
                    styles.saveBtnText,
                    saved && styles.saveBtnTextActive,
                  ]}
                >
                  {saving ? "…" : saved ? "Saved" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {movie.overview ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Overview</Text>
              <Text style={styles.overview}>{movie.overview}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function createMovieDetailStyles(colors: ThemeColors) {
  return {
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  topBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 8,
    paddingRight: 12,
  },
  backBtnText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 48,
  },

  hero: {
    height: 320,
    width: "100%" as const,
    position: "relative" as const,
  },

  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },

  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  heroSafe: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
  },

  heroBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginLeft: 16,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  heroBackText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  heroContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 34,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },

  heroMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  heroMetaText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  heroMetaDot: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "300",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  card: {
    marginTop: -12,
    marginHorizontal: 20,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    backgroundColor: colors.background,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  posterRow: {
    flexDirection: "row",
    marginBottom: 28,
  },

  posterWrap: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  poster: {
    width: 110,
    height: 165,
    borderRadius: 16,
    backgroundColor: colors.card,
  },

  titleBlock: {
    flex: 1,
    marginLeft: 20,
    justifyContent: "flex-end",
  },

  genres: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  genreText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
  },
  saveBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 16,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  saveBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  saveBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.primary,
    letterSpacing: 0.2,
  },
  saveBtnTextActive: {
    color: colors.primaryText,
  },
  section: { paddingTop: 4 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: "uppercase" as const,
  },
  overview: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
    letterSpacing: 0.1,
  },
  };
}
