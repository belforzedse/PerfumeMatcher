import { getData, type DataFile } from "./data-loader";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const PERFUMES_ENDPOINT = BACKEND_URL ? `${BACKEND_URL}/perfumes/` : "";

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

const toPerfume = (
  perfumeData: DataFile["perfumes"][number],
  brands: DataFile["brands"],
  collections: DataFile["collections"]
): Perfume => {
  const brand = perfumeData.brand
    ? brands.find((b) => b.id === perfumeData.brand)?.name
    : undefined;

  const collection = perfumeData.collection
    ? collections.find((c) => c.id === perfumeData.collection)?.name
    : undefined;

  const notes: PerfumeNotes = {
    top: Array.isArray(perfumeData.notes?.top) ? [...perfumeData.notes.top] : [],
    middle: Array.isArray(perfumeData.notes?.middle)
      ? [...perfumeData.notes.middle]
      : [],
    base: Array.isArray(perfumeData.notes?.base)
      ? [...perfumeData.notes.base]
      : [],
  };

  let imageUrl: string | undefined;
  if (perfumeData.cover?.url) {
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
    nameEn: perfumeData.name_en || "",
    nameFa: perfumeData.name_fa || "",
    brand,
    collection,
    gender: perfumeData.gender || undefined,
    season: perfumeData.season || undefined,
    family: perfumeData.family || undefined,
    character: perfumeData.character || undefined,
    notes,
    allNotes: dedupeNotes(notes),
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

  perfumeListPromise = (async () => {
    try {
      // Try backend first if configured
      if (PERFUMES_ENDPOINT) {
        console.log("[API] Loading perfumes from backend:", PERFUMES_ENDPOINT);
        const res = await fetchWithRetry(PERFUMES_ENDPOINT, {
          cache: "no-store",
          retries: 2,
          timeout: 10000,
        });
        
        const data = await res.json() as DataFile;
        console.log("[API] Backend data received");
        
        const perfumes = data.perfumes.map((p) => toPerfume(p, data.brands, data.collections));
        perfumeListCache = perfumes;
        perfumeListCacheTime = Date.now();
        console.log("[API] Perfumes loaded from backend:", perfumes.length);
        return perfumes;
      }

      // Fallback to local data
      console.log("[API] Backend not configured, loading from local data...");
      const data = await getData();
      const perfumes = data.perfumes.map((p) => toPerfume(p, data.brands, data.collections));
      perfumeListCache = perfumes;
      perfumeListCacheTime = Date.now();
      console.log("[API] Perfumes loaded locally:", perfumes.length);
      return perfumes;
    } catch (error) {
      console.error("[API] ERROR loading perfumes:", error);
      perfumeListCache = null;
      perfumeListCacheTime = 0;
      
      // Try local fallback on backend error
      try {
        console.log("[API] Attempting local fallback...");
        const data = await getData();
        const perfumes = data.perfumes.map((p) => toPerfume(p, data.brands, data.collections));
        perfumeListCache = perfumes;
        perfumeListCacheTime = Date.now();
        console.log("[API] Fallback successful:", perfumes.length);
        return perfumes;
      } catch (fallbackError) {
        console.error("[API] Fallback failed:", fallbackError);
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
    const data = await getData();
    const families = new Set<string>();
    data.perfumes.forEach((p) => {
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
    const data = await getData();
    const seasons = new Set<string>();
    data.perfumes.forEach((p) => {
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
    const data = await getData();
    const characters = new Set<string>();
    data.perfumes.forEach((p) => {
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
    const data = await getData();
    const genders = new Set<string>();
    data.perfumes.forEach((p) => {
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
    const data = await getData();
    return data.brands
      .map((b) => b.name)
      .filter((name) => name.trim().length > 0)
      .sort((a, b) => a.localeCompare(b, "fa"));
  } catch (error) {
    console.error("Error loading brands:", error);
    return [];
  }
}

export async function getNoteOptions(): Promise<string[]> {
  try {
    const data = await getData();
    const notes = new Set<string>();
    data.perfumes.forEach((p) => {
      const allNotes = [
        ...(p.notes?.top || []),
        ...(p.notes?.middle || []),
        ...(p.notes?.base || []),
      ];
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
