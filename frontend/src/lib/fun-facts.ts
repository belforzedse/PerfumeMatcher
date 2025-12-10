import { join } from "path";
import { readFile } from "fs/promises";

const FACTS_PATH = join(process.cwd(), "data", "fun-facts.json");

export interface FunFactsData {
  facts: string[];
  lastUpdated: number;
}

let cache: FunFactsData | null = null;

export async function getFunFacts(): Promise<FunFactsData> {
  if (cache) {
    return cache;
  }

  try {
    const raw = await readFile(FACTS_PATH, "utf-8");
    const data = JSON.parse(raw) as FunFactsData;
    cache = data;
    return data;
  } catch (error) {
    console.warn("[FunFacts] Failed to load facts file:", error);
    return { facts: [], lastUpdated: 0 };
  }
}
