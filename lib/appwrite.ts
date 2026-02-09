import { Client, Databases, ID, Query } from "react-native-appwrite";

// All IDs from .env — never commit real project/database/collection IDs to the repo
const ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "";
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? "";
const COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID ?? "";
const SAVED_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_SAVED_COLLECTION_ID ?? "";
// Ensure collections allow: Create, Read, Update, Delete for role "guests" in Appwrite Console

const client = new Client().setProject(PROJECT_ID).setEndpoint(ENDPOINT);
const databases = new Databases(client);

/**
 * Pings the Appwrite backend health endpoint to verify the setup.
 */
function ping(): Promise<unknown> {
  return client.call("GET", new URL(`${ENDPOINT}/health`));
}

/**
 * Records a movie search in Appwrite (movieSearchCount collection).
 * Call when the user opens a movie from search results (one movie at a time).
 * Creates a new document if the movie has never been searched, otherwise
 * increments searchCount and updates searchDate, poster_url, and movieTitle.
 */
async function recordMovieSearch(
  movieID: number,
  options?: { posterUrl?: string | null; movieTitle?: string | null }
): Promise<void> {
  const now = new Date().toISOString();
  const poster =
    options?.posterUrl != null && options.posterUrl !== ""
      ? options.posterUrl
      : undefined;
  const movieTitle =
    options?.movieTitle != null && options.movieTitle !== ""
      ? String(options.movieTitle).slice(0, 255)
      : undefined;

  try {
    const { documents } = await databases.listDocuments({
      databaseId: DATABASE_ID,
      collectionId: COLLECTION_ID,
      queries: [Query.equal("movieId", movieID)],
      total: true,
    });

    if (documents.length > 0) {
      const doc = documents[0];
      await databases.incrementDocumentAttribute({
        databaseId: DATABASE_ID,
        collectionId: COLLECTION_ID,
        documentId: doc.$id,
        attribute: "searchCount",
        value: 1,
      });
      const updateData: Record<string, unknown> = { searchDate: now };
      if (poster !== undefined) updateData.poster_url = poster;
      if (movieTitle !== undefined) updateData.movieTitle = movieTitle;
      await databases.updateDocument({
        databaseId: DATABASE_ID,
        collectionId: COLLECTION_ID,
        documentId: doc.$id,
        data: updateData,
      });
    } else {
      const createData: Record<string, unknown> = {
        movieId: movieID,
        searchDate: now,
        searchCount: 1,
      };
      if (poster !== undefined) createData.poster_url = poster;
      if (movieTitle !== undefined) createData.movieTitle = movieTitle;
      await databases.createDocument({
        databaseId: DATABASE_ID,
        collectionId: COLLECTION_ID,
        documentId: ID.unique(),
        data: createData,
      });
    }
  } catch (err) {
    console.error("[Appwrite recordMovieSearch]", err);
    throw err;
  }
}

/** One document from movieSearchCount, ordered by searchCount desc */
export type TrendingSearchDoc = {
  $id: string;
  movieId: number;
  searchCount: number;
  searchDate?: string;
  poster_url?: string | null;
  movieTitle?: string | null;
};

const TRENDING_MAX = 10;

/**
 * Fetches top 1–10 movies by search count (most searched = top 1).
 * Always limited to 10. Use with TMDB to get full movie details for each movieId.
 */
async function getTrendingBySearchCount(
  limit: number = TRENDING_MAX
): Promise<TrendingSearchDoc[]> {
  const cappedLimit = Math.min(Math.max(1, limit), TRENDING_MAX);
  const { documents } = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    queries: [
      Query.orderDesc("searchCount"),
      Query.limit(cappedLimit),
    ],
    total: false,
  });
  return (documents as unknown as TrendingSearchDoc[]).slice(0, cappedLimit);
}

// --- Saved movies (savedMovie collection) ---

export type SavedMovieDoc = {
  $id: string;
  movieId: number;
  dateAdded: string;
  rating?: number | null;
  notes?: string | null;
  isFavorite?: boolean | null;
  $createdAt?: string;
  $updatedAt?: string;
};

/**
 * Creates a saved movie document. dateAdded is set to now.
 * Optional: rating (1–5), notes (max 500), isFavorite.
 */
async function createSavedMovie(
  movieId: number,
  options?: { rating?: number; notes?: string; isFavorite?: boolean }
): Promise<SavedMovieDoc> {
  const dateAdded = new Date().toISOString();
  const data: Record<string, unknown> = { movieId, dateAdded };
  if (options?.rating != null) data.rating = Math.min(5, Math.max(1, options.rating));
  if (options?.notes != null) data.notes = String(options.notes).slice(0, 500);
  if (options?.isFavorite != null) data.isFavorite = options.isFavorite;

  const doc = await databases.createDocument({
    databaseId: DATABASE_ID,
    collectionId: SAVED_COLLECTION_ID,
    documentId: ID.unique(),
    data,
  });
  return doc as unknown as SavedMovieDoc;
}

/**
 * Lists all saved movie documents, newest first.
 */
async function listSavedMovies(): Promise<SavedMovieDoc[]> {
  const { documents } = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: SAVED_COLLECTION_ID,
    queries: [Query.orderDesc("dateAdded")],
    total: false,
  });
  return documents as unknown as SavedMovieDoc[];
}

/**
 * Returns the saved document for the given movieId, or null.
 */
async function getSavedByMovieId(movieId: number): Promise<SavedMovieDoc | null> {
  const { documents } = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: SAVED_COLLECTION_ID,
    queries: [Query.equal("movieId", movieId), Query.limit(1)],
    total: false,
  });
  return (documents[0] as unknown as SavedMovieDoc) ?? null;
}

/**
 * Deletes a saved movie by document ID.
 */
async function deleteSavedMovie(documentId: string): Promise<void> {
  await databases.deleteDocument({
    databaseId: DATABASE_ID,
    collectionId: SAVED_COLLECTION_ID,
    documentId,
  });
}

/**
 * Updates rating, notes, and/or isFavorite for a saved movie.
 */
async function updateSavedMovie(
  documentId: string,
  updates: { rating?: number; notes?: string; isFavorite?: boolean }
): Promise<SavedMovieDoc> {
  const data: Record<string, unknown> = {};
  if (updates.rating != null) data.rating = Math.min(5, Math.max(1, updates.rating));
  if (updates.notes !== undefined) data.notes = String(updates.notes).slice(0, 500);
  if (updates.isFavorite !== undefined) data.isFavorite = updates.isFavorite;

  const doc = await databases.updateDocument({
    databaseId: DATABASE_ID,
    collectionId: SAVED_COLLECTION_ID,
    documentId,
    data,
  });
  return doc as unknown as SavedMovieDoc;
}

export {
  client,
  ping,
  recordMovieSearch,
  getTrendingBySearchCount,
  createSavedMovie,
  listSavedMovies,
  getSavedByMovieId,
  deleteSavedMovie,
  updateSavedMovie,
};
