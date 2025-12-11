import { Perfume, PerfumeNotes } from "./api";

export interface PerfumeResponse extends Omit<Perfume, "notes"> {
  notes: PerfumeNotes;
}

// Data file structure for local JSON storage (used by admin API routes)
export interface Brand {
  id: number;
  name: string;
}

export interface Collection {
  id: number;
  name: string;
  brand?: number;
}

export interface PerfumeData {
  id: number;
  name_fa: string;
  name_en: string;
  brand?: number;
  collection?: number;
  gender?: string;
  season?: string;
  family?: string;
  character?: string;
  notes?: PerfumeNotes;
  cover?: { url: string };
}

export interface DataFile {
  brands: Brand[];
  collections: Collection[];
  perfumes: PerfumeData[];
}

let cachedPerfumes: PerfumeResponse[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? "http://localhost:8000";

async function loadPerfumes(): Promise<PerfumeResponse[]> {
  const now = Date.now();
  if (cachedPerfumes && now - cacheTime < CACHE_TTL_MS) {
    return cachedPerfumes;
  }

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/perfumes/`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load perfumes: ${response.status} ${response.statusText}`);
    }
    
    const data = (await response.json()) as PerfumeResponse[];
    cachedPerfumes = data;
    cacheTime = Date.now();
    return data;
  } catch (error) {
    console.error("[data-loader] Error loading perfumes from backend:", error);
    // Return empty array instead of throwing to allow graceful degradation
    return [];
  }
}

export async function getData(): Promise<{ perfumes: PerfumeResponse[] }> {
  const perfumes = await loadPerfumes();
  return { perfumes };
}

export function clearCache(): void {
  cachedPerfumes = null;
  cacheTime = 0;
}

