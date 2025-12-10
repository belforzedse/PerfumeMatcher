import { Perfume } from "./api";

export interface PerfumeResponse extends Perfume {
  notes: {
    top?: string[];
    middle?: string[];
    base?: string[];
  };
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

  const response = await fetch(`${BACKEND_BASE_URL}/api/perfumes/`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load perfumes: ${response.status}`);
  }
  const data = (await response.json()) as PerfumeResponse[];
  cachedPerfumes = data;
  cacheTime = Date.now();
  return data;
}

export async function getData(): Promise<{ perfumes: PerfumeResponse[] }> {
  const perfumes = await loadPerfumes();
  return { perfumes };
}

export function clearCache(): void {
  cachedPerfumes = null;
  cacheTime = 0;
}

