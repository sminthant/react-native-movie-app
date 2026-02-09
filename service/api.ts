export const TMDB_CONFIG = {
    BASE_URL: 'https://api.themoviedb.org/3',
    API_KEY: process.env.EXPO_PUBLIC_API_KEY,
    headers: {
        accept: 'application/json',
        Authorization: 'Bearer ' + process.env.EXPO_PUBLIC_API_KEY
    }
}

// Genre IDs from TMDB
export const GENRES = {
    All: null,
    Action: 28,
    Comedy: 35,
    Drama: 18,
    Horror: 27,
    Romance: 10749,
    Thriller: 53,
    SciFi: 878,
} as const;

export type GenreKey = keyof typeof GENRES;

export const fetchMovie = async ({query, genreId} : { query? : string; genreId?: number | null }) => {
    let endpoint: string;
    
    if (query) {
        endpoint = `/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
    } else if (genreId) {
        endpoint = `/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&include_adult=false&language=en-US&page=1`;
    } else {
        endpoint = '/discover/movie?sort_by=popularity.desc&include_adult=false&language=en-US&page=1';
    }
    
    const url = `${TMDB_CONFIG.BASE_URL}${endpoint}`;
    
    const response = await fetch(url,{
        method : 'GET',
        headers : TMDB_CONFIG.headers
    })

    if(!response.ok){
        throw new Error(`Failed to fetch movie data: ${response.statusText}`);
    }

    const data = await response.json();

    return data.results || [];
}

export type MovieDetails = {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    release_date: string;
    runtime: number | null;
    genres: { id: number; name: string }[];
};

export const fetchMovieById = async (movieId: string | string[]): Promise<MovieDetails | null> => {
    const id = Array.isArray(movieId) ? movieId[0] : movieId;
    if (!id) return null;

    const url = `${TMDB_CONFIG.BASE_URL}/movie/${id}?language=en-US`;

    const response = await fetch(url, {
        method: 'GET',
        headers: TMDB_CONFIG.headers,
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data;
};

// const url = 'https://api.themoviedb.org/3/keyword/keyword_id/movies?include_adult=false&language=en-US&page=1';
// const options = {
//   method: 'GET',
//   headers: {
//     accept: 'application/json',
//     Authorization: 'Bearer '
//   }
// };

// fetch(url, options)
//   .then(res => res.json())
//   .then(json => console.log(json))
//   .catch(err => console.error(err));