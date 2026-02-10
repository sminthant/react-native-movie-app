import * as Crypto from "expo-crypto";
import { Client, Databases, ID, Query } from "react-native-appwrite";

/** Salt + SHA-256 password hashing (works in React Native; no Node crypto) */
async function hashPassword(password: string): Promise<string> {
  const salt = await Crypto.getRandomBytesAsync(16);
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltHex + password,
  );
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const i = stored.indexOf(":");
  if (i === -1) return false;
  const saltHex = stored.slice(0, i);
  const hashHex = stored.slice(i + 1);
  const inputHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltHex + password,
  );
  return inputHash === hashHex;
}

// All IDs from .env — never commit real project/database/collection IDs to the repo
const ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ??
  "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "";
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? "";
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID ?? "";
const SAVED_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_SAVED_COLLECTION_ID ?? "";
const USERS_COLLECTION_ID =
  process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID ?? "";
// Ensure collections allow: Create, Read, Update, Delete for role "guests" in Appwrite Console

const client = new Client().setProject(PROJECT_ID).setEndpoint(ENDPOINT);
const databases = new Databases(client);

/** Convert Appwrite document $id (hex string) to a numeric userId for use in other collections */
export function userIdFromDocId(docId: string): number {
  const hex = String(docId).replace(/-/g, "").slice(0, 13);
  return parseInt(hex || "0", 16) || 0;
}

// --- Users (auth) ---

export type AppUser = {
  $id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string | null;
};

async function registerUser(credentials: {
  username: string;
  email: string;
  password: string;
}): Promise<AppUser> {
  const { username, email, password } = credentials;
  const trimmedUsername = String(username).trim().slice(0, 50);
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!trimmedUsername || !trimmedEmail || !password) {
    throw new Error("Username, email and password are required");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const data = {
    username: trimmedUsername,
    email: trimmedEmail,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };

  const doc = await databases.createDocument({
    databaseId: DATABASE_ID,
    collectionId: USERS_COLLECTION_ID,
    documentId: ID.unique(),
    data,
  });
  return {
    $id: doc.$id,
    username: (doc as any).username,
    email: (doc as any).email,
    createdAt: (doc as any).createdAt,
    updatedAt: (doc as any).updatedAt,
    lastLogin: (doc as any).lastLogin ?? null,
  };
}

async function loginUser(
  email: string,
  password: string
): Promise<AppUser> {
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!trimmedEmail || !password) {
    throw new Error("Email and password are required");
  }

  const { documents } = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: USERS_COLLECTION_ID,
    queries: [Query.equal("email", trimmedEmail), Query.limit(1)],
    total: false,
  });

  const doc = documents[0];
  if (!doc) {
    throw new Error("Invalid email or password");
  }

  const passwordHash = (doc as any).passwordHash;
  const match = await verifyPassword(password, passwordHash);
  if (!match) {
    throw new Error("Invalid email or password");
  }

  const now = new Date().toISOString();
  await databases.updateDocument({
    databaseId: DATABASE_ID,
    collectionId: USERS_COLLECTION_ID,
    documentId: doc.$id,
    data: { updatedAt: now, lastLogin: now },
  });

  return {
    $id: doc.$id,
    username: (doc as any).username,
    email: (doc as any).email,
    createdAt: (doc as any).createdAt,
    updatedAt: now,
    lastLogin: now,
  };
}

/**
 * Pings the Appwrite backend health endpoint to verify the setup.
 */
function ping(): Promise<unknown> {
  return client.call("GET", new URL(`${ENDPOINT}/health`));
}

/**
 * Records a movie search in Appwrite (movieSearchCount collection).
 * Call when the user opens a movie from search results (one movie at a time).
 * userId: use 0 for guest, or numeric id from userIdFromDocId(user.$id) when logged in.
 */
async function recordMovieSearch(
  movieID: number,
  options?: {
    posterUrl?: string | null;
    movieTitle?: string | null;
    userId?: number;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const userId = options?.userId ?? 0;
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
      queries: [
        Query.equal("movieId", movieID),
        Query.equal("userId", userId),
      ],
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
        userId,
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
  userId?: number;
};

const TRENDING_MAX = 10;

/**
 * Fetches top 1–10 movies by search count. Pass userId to get trending for that user, or omit for global.
 */
async function getTrendingBySearchCount(
  limit: number = TRENDING_MAX,
  userId?: number,
): Promise<TrendingSearchDoc[]> {
  const cappedLimit = Math.min(Math.max(1, limit), TRENDING_MAX);
  const queries = [Query.orderDesc("searchCount"), Query.limit(cappedLimit)];
  if (userId !== undefined && userId !== null) {
    queries.unshift(Query.equal("userId", userId));
  }
  const { documents } = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    queries,
    total: false,
  });
  return (documents as unknown as TrendingSearchDoc[]).slice(0, cappedLimit);
}

// --- Saved movies (savedMovie collection) ---

export type SavedMovieDoc = {
  $id: string;
  movieId: number;
  dateAdded: string;
  userId: number;
  personalRating?: number | null;
  notes?: string | null;
  isFavorite?: boolean | null;
  watchDate?: string | null;
  genre?: string | null;
  directorName?: string | null;
  language?: string | null;
  country?: string | null;
  $createdAt?: string;
  $updatedAt?: string;
};

/**
 * Creates a saved movie document. userId is required. dateAdded set to now.
 * Optional: personalRating (0–10), notes (255), isFavorite, watchDate, genre (64), directorName (128), language (32), country (64).
 */
async function createSavedMovie(
  movieId: number,
  userId: number,
  options?: {
    personalRating?: number;
    notes?: string;
    isFavorite?: boolean;
    watchDate?: string;
    genre?: string;
    directorName?: string;
    language?: string;
    country?: string;
  },
): Promise<SavedMovieDoc> {
  const dateAdded = new Date().toISOString();
  const data: Record<string, unknown> = { movieId, dateAdded, userId };
  if (options?.personalRating != null)
    data.personalRating = Math.min(10, Math.max(0, options.personalRating));
  if (options?.notes != null) data.notes = String(options.notes).slice(0, 255);
  if (options?.isFavorite != null) data.isFavorite = options.isFavorite;
  if (options?.watchDate != null) data.watchDate = options.watchDate;
  if (options?.genre != null) data.genre = String(options.genre).slice(0, 64);
  if (options?.directorName != null)
    data.directorName = String(options.directorName).slice(0, 128);
  if (options?.language != null)
    data.language = String(options.language).slice(0, 32);
  if (options?.country != null)
    data.country = String(options.country).slice(0, 64);

  const doc = await databases.createDocument({
    databaseId: DATABASE_ID,
    collectionId: SAVED_COLLECTION_ID,
    documentId: ID.unique(),
    data,
  });
  return doc as unknown as SavedMovieDoc;
}

/**
 * Lists saved movie documents for the given userId, newest first.
 */
async function listSavedMovies(userId: number): Promise<SavedMovieDoc[]> {
  const { documents } = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: SAVED_COLLECTION_ID,
    queries: [
      Query.equal("userId", userId),
      Query.orderDesc("dateAdded"),
    ],
    total: false,
  });
  return documents as unknown as SavedMovieDoc[];
}

/**
 * Returns the saved document for the given movieId and userId, or null.
 */
async function getSavedByMovieId(
  movieId: number,
  userId: number,
): Promise<SavedMovieDoc | null> {
  const { documents } = await databases.listDocuments({
    databaseId: DATABASE_ID,
    collectionId: SAVED_COLLECTION_ID,
    queries: [
      Query.equal("movieId", movieId),
      Query.equal("userId", userId),
      Query.limit(1),
    ],
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
 * Updates saved movie fields: personalRating (0–10), notes (255), isFavorite, watchDate, genre, directorName, language, country.
 */
async function updateSavedMovie(
  documentId: string,
  updates: {
    personalRating?: number;
    notes?: string;
    isFavorite?: boolean;
    watchDate?: string;
    genre?: string;
    directorName?: string;
    language?: string;
    country?: string;
  },
): Promise<SavedMovieDoc> {
  const data: Record<string, unknown> = {};
  if (updates.personalRating != null)
    data.personalRating = Math.min(10, Math.max(0, updates.personalRating));
  if (updates.notes !== undefined)
    data.notes = String(updates.notes).slice(0, 255);
  if (updates.isFavorite !== undefined) data.isFavorite = updates.isFavorite;
  if (updates.watchDate !== undefined) data.watchDate = updates.watchDate;
  if (updates.genre !== undefined) data.genre = String(updates.genre).slice(0, 64);
  if (updates.directorName !== undefined)
    data.directorName = String(updates.directorName).slice(0, 128);
  if (updates.language !== undefined)
    data.language = String(updates.language).slice(0, 32);
  if (updates.country !== undefined)
    data.country = String(updates.country).slice(0, 64);

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
  createSavedMovie,
  deleteSavedMovie,
  getSavedByMovieId,
  getTrendingBySearchCount,
  listSavedMovies,
  loginUser,
  ping,
  recordMovieSearch,
  registerUser,
  updateSavedMovie,
};

