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
  name_en: string;
  name_fa: string;
  brand?: number;
  collection?: number;
  gender?: string;
  season?: string;
  family?: string;
  character?: string;
  notes: {
    top?: string[];
    middle?: string[];
    base?: string[];
  };
  cover?: {
    url?: string;
    alternativeText?: string;
  };
}

export interface DataFile {
  brands: Brand[];
  collections: Collection[];
  perfumes: PerfumeData[];
}

let cachedData: DataFile | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadDataFile(): Promise<DataFile> {
  console.log("[Data Loader] loadDataFile called");
  const now = Date.now();

  // Return cached data if still valid
  if (cachedData && now - cacheTime < CACHE_TTL_MS) {
    console.log("[Data Loader] Returning cached data");
    return cachedData;
  }

  try {
    const isServer = typeof window === "undefined";
    console.log("[Data Loader] Environment:", { isServer });

    if (isServer) {
      // Server-side: dynamically import Node.js modules
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");
      console.log("[Data Loader] Node.js modules imported successfully");
      
      // Server-side: read from data folder in project root
      const filePath = join(process.cwd(), "data", "data.json");
      console.log("[Data Loader] Reading from:", filePath);
      const fileContents = await readFile(filePath, "utf-8");
      const data = JSON.parse(fileContents) as DataFile;
      console.log("[Data Loader] File loaded:", {
        brands: data.brands.length,
        collections: data.collections.length,
        perfumes: data.perfumes.length,
      });
      cachedData = data;
      cacheTime = Date.now();
      return data;
    } else {
      // Client-side: fetch from public folder
      console.log("[Data Loader] Fetching from /data/data.json (client-side)");
      const response = await fetch("/data/data.json");
      if (!response.ok) {
        console.error("[Data Loader] Fetch failed:", response.status);
        throw new Error(`Failed to load data file: ${response.status}`);
      }
      const data = (await response.json()) as DataFile;
      console.log("[Data Loader] Data fetched:", {
        brands: data.brands.length,
        collections: data.collections.length,
        perfumes: data.perfumes.length,
      });
      cachedData = data;
      cacheTime = Date.now();
      return data;
    }
  } catch (error) {
    console.error("[Data Loader] Error loading data file:", error);
    // Return empty structure on error
    return {
      brands: [],
      collections: [],
      perfumes: [],
    };
  }
}

export async function getData(): Promise<DataFile> {
  return loadDataFile();
}

export function clearCache(): void {
  cachedData = null;
  cacheTime = 0;
}

