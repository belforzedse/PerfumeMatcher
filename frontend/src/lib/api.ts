import { getData } from "./data-loader";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8000";
const PERFUMES_ENDPOINT = `${BACKEND_BASE_URL}/api/perfumes/`;

export interface PerfumeNotes {
  top: string[];
  middle: string[];
  base: string[];
}

export interface Perfume {
  id: string | number;
  nameEn: string;
  nameFa: string;
  brand?: string;
  collection?: string;
  gender?: string;
  season?: string;
  family?: string;
  character?: string;
  intensity?: string;
  notes: PerfumeNotes;
  allNotes: string[];
  image?: string;
}

const dedupeNotes = (notes: PerfumeNotes): string[] => {
  const unique = new Set<string>([
    ...notes.top,
    ...notes.middle,
    ...notes.base,
  ]);
  return Array.from(unique).sort((a, b) => a.localeCompare(b, "en"));
};

const fetchWithRetry = async (url: string, options: RequestInit & { retries?: number; timeout?: number } = {}) => {
  const { retries = 2, timeout = 10000, ...fetchOptions } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[API] Fetch attempt ${attempt + 1}/${retries + 1} failed:`, lastError.message);
      
      if (attempt < retries) {
        // Exponential backoff: 500ms, 1000ms
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error("Fetch failed");
};

interface BackendPerfumeData {
  id: number | string;
  name_en?: string;
  name_fa?: string;
  name?: string;
  nameEn?: string;
  nameFa?: string;
  brand?: string;
  collection?: string;
  gender?: string;
  season?: string;
  family?: string;
  character?: string;
  intensity?: string;
  notes_top?: string[];
  notes_middle?: string[];
  notes_base?: string[];
  notes?: {
    top?: string[];
    middle?: string[];
    base?: string[];
  };
  all_notes?: string[];
  images?: string[];
  cover?: {
    url?: string;
  };
}

const toPerfume = (perfumeData: BackendPerfumeData): Perfume => {
  // Backend API returns brand/collection as strings already, not IDs
  const brand = typeof perfumeData.brand === "string" ? perfumeData.brand : undefined;
  const collection = typeof perfumeData.collection === "string" ? perfumeData.collection : undefined;
  const notes: PerfumeNotes = {
    top: Array.isArray(perfumeData.notes_top) ? [...perfumeData.notes_top] : 
         Array.isArray(perfumeData.notes?.top) ? [...perfumeData.notes.top] : [],
    middle: Array.isArray(perfumeData.notes_middle) ? [...perfumeData.notes_middle] :
             Array.isArray(perfumeData.notes?.middle) ? [...perfumeData.notes.middle] : [],
    base: Array.isArray(perfumeData.notes_base) ? [...perfumeData.notes_base] :
          Array.isArray(perfumeData.notes?.base) ? [...perfumeData.notes.base] : [],
  };

  let imageUrl: string | undefined;
  if (Array.isArray(perfumeData.images) && perfumeData.images.length > 0) {
    imageUrl = perfumeData.images[0];
  } else if (perfumeData.cover?.url) {
    const url = perfumeData.cover.url.trim();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      imageUrl = url;
    } else if (url.startsWith("/")) {
      imageUrl = url;
    } else {
      imageUrl = `/${url}`;
    }
  }

  return {
    id: perfumeData.id,
    nameEn: perfumeData.name_en || perfumeData.nameEn || perfumeData.name || "",
    nameFa: perfumeData.name_fa || perfumeData.nameFa || perfumeData.name || "",
    brand,
    collection,
    gender: perfumeData.gender || undefined,
    season: perfumeData.season || undefined,
    family: perfumeData.family || undefined,
    character: perfumeData.character || undefined,
    intensity: perfumeData.intensity || undefined,
    notes,
    allNotes: Array.isArray(perfumeData.all_notes)
      ? perfumeData.all_notes
      : dedupeNotes(notes),
    image: imageUrl,
  };
};

let perfumeListCache: Perfume[] | null = null;
let perfumeListCacheTime = 0;
let perfumeListPromise: Promise<Perfume[]> | null = null;
const PERFUME_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getPerfumes(): Promise<Perfume[]> {
  console.log("[API] getPerfumes() called");
  const now = Date.now();

  if (perfumeListCache && now - perfumeListCacheTime < PERFUME_CACHE_TTL_MS) {
    console.log("[API] Returning cached perfume list:", perfumeListCache.length);
    return perfumeListCache;
  }

  if (perfumeListPromise) {
    console.log("[API] Waiting for existing perfume list promise...");
    return perfumeListPromise;
  }

  console.log("[API] Loading perfumes from backend...");
  perfumeListPromise = (async () => {
    try {
      // Try backend first
      console.log("[API] Loading perfumes from backend:", PERFUMES_ENDPOINT);
      const res = await fetchWithRetry(PERFUMES_ENDPOINT, {
        cache: "no-store",
        retries: 2,
        timeout: 10000,
      });
      
      const backendData = await res.json() as BackendPerfumeData[];
      console.log("[API] Backend data received:", backendData.length, "items");
      
      const perfumes = backendData.map((p) => toPerfume(p));
      perfumeListCache = perfumes;
      perfumeListCacheTime = Date.now();
      console.log("[API] Perfumes loaded from backend:", perfumes.length);
      return perfumes;
    } catch (error) {
      console.error("[API] ERROR loading perfumes from backend:", error);
      
      // Fallback to local data
      try {
        console.log("[API] Attempting local fallback...");
        const data = await getData();
        const perfumes = data.perfumes.map((p) => toPerfume(p));
        perfumeListCache = perfumes;
        perfumeListCacheTime = Date.now();
        console.log("[API] Fallback successful:", perfumes.length);
        return perfumes;
      } catch (fallbackError) {
        console.error("[API] Fallback failed:", fallbackError);
        perfumeListCache = null;
        perfumeListCacheTime = 0;
        throw error instanceof Error ? error : new Error("Failed to load perfumes");
      }
    } finally {
      perfumeListPromise = null;
    }
  })();

  return perfumeListPromise;
}

export async function getScentFamilies(): Promise<string[]> {
  try {
    const perfumes = await getPerfumes();
    const families = new Set<string>();
    perfumes.forEach((p) => {
      if (p.family && p.family.trim().length > 0) {
        families.add(p.family.trim());
      }
    });
    return Array.from(families).sort((a, b) => a.localeCompare(b, "fa"));
  } catch (error) {
    console.error("Error loading scent families:", error);
    return [];
  }
}

export async function getOccasions(): Promise<string[]> {
  try {
    const perfumes = await getPerfumes();
    const seasons = new Set<string>();
    perfumes.forEach((p) => {
      if (p.season && p.season.trim().length > 0) {
        seasons.add(p.season.trim());
      }
    });
    return Array.from(seasons).sort((a, b) => a.localeCompare(b, "fa"));
  } catch (error) {
    console.error("Error loading occasions:", error);
    return [];
  }
}

export async function getIntensities(): Promise<string[]> {
  try {
    const perfumes = await getPerfumes();
    const characters = new Set<string>();
    perfumes.forEach((p) => {
      if (p.character && p.character.trim().length > 0) {
        characters.add(p.character.trim());
      }
    });
    return Array.from(characters).sort((a, b) => a.localeCompare(b, "fa"));
  } catch (error) {
    console.error("Error loading intensities:", error);
    return [];
  }
}

export async function getGenders(): Promise<string[]> {
  try {
    const perfumes = await getPerfumes();
    const genders = new Set<string>();
    perfumes.forEach((p) => {
      if (p.gender && p.gender.trim().length > 0) {
        genders.add(p.gender.trim());
      }
    });
    return Array.from(genders).sort((a, b) => a.localeCompare(b, "fa"));
  } catch (error) {
    console.error("Error loading genders:", error);
    return [];
  }
}

export async function getBrands(): Promise<string[]> {
  try {
    const perfumes = await getPerfumes();
    const brands = new Set<string>();
    perfumes.forEach((p) => {
      if (p.brand && p.brand.trim().length > 0) {
        brands.add(p.brand.trim());
      }
    });
    return Array.from(brands).sort((a, b) => a.localeCompare(b, "fa"));
  } catch (error) {
    console.error("Error loading brands:", error);
    return [];
  }
}

export async function getNoteOptions(): Promise<string[]> {
  try {
    const perfumes = await getPerfumes();
    const notes = new Set<string>();
    perfumes.forEach((p) => {
      const allNotes = [...p.notes.top, ...p.notes.middle, ...p.notes.base];
      allNotes.forEach((note) => {
        if (typeof note === "string" && note.trim().length > 0) {
          notes.add(note.trim());
        }
      });
    });
    return Array.from(notes).sort((a, b) => a.localeCompare(b, "fa"));
  } catch (error) {
    console.error("Error loading note options:", error);
    return [];
  }
}

export const toPersianNumbers = (value: string): string => {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return value.replace(/[0-9]/g, (digit) => persianDigits[parseInt(digit, 10)]);
};
