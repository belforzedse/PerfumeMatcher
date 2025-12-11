import { QuestionnaireAnswers } from "@/lib/questionnaire";
import { Perfume } from "@/lib/api";
import { RankedPerfume } from "@/lib/perfume-matcher";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8000";
const RECOMMEND_ENDPOINT = `${BACKEND_BASE_URL}/api/recommend/rerank/`;

interface BackendRanking {
  id: string | number;
  matchPercentage: number;
  reasons?: string[];
  name?: string;
  brand?: string;
  score?: number;
}

interface BackendRecommendResponse {
  rankings: BackendRanking[];
  fallback?: boolean;
  elapsedMs?: number;
}

const fetchWithRetry = async (url: string, options: RequestInit & { retries?: number; timeout?: number } = {}) => {
  const { retries = 1, timeout = 120000, ...fetchOptions } = options; // 120 seconds to match backend timeout
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
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[AI Matcher] Attempt ${attempt + 1}/${retries + 1} failed:`, lastError.message);
      
      if (attempt < retries) {
        // Wait 1s before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error("Request failed");
};

export async function getAIRankings(
  answers: QuestionnaireAnswers,
  perfumes: Perfume[]
): Promise<RankedPerfume[]> {
  console.log("[AI Matcher Client] Starting getAIRankings (backend)...");
  const requestStartTime = Date.now();

  if (!RECOMMEND_ENDPOINT) {
    throw new Error("Backend URL not configured. Set NEXT_PUBLIC_BACKEND_URL in environment.");
  }

  try {
    const response = await fetchWithRetry(RECOMMEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(answers),
      retries: 1,
      timeout: 120000, // 120 seconds to match backend timeout (90s default + buffer)
    });

    const fetchElapsed = Date.now() - requestStartTime;
    console.log(`[AI Matcher Client] Request completed in ${fetchElapsed}ms`);

    const data: BackendRecommendResponse = await response.json();
    console.log(`[AI Matcher] Received ${data.rankings?.length || 0} rankings from backend`);
    console.log(`[AI Matcher] Backend returned IDs:`, data.rankings?.map(r => r.id).slice(0, 5));
    
    const perfumeMap = new Map(perfumes.map((p) => [String(p.id), p]));
    console.log(`[AI Matcher] Catalog has ${perfumes.length} perfumes`);
    console.log(`[AI Matcher] Sample catalog IDs:`, perfumes.slice(0, 5).map(p => p.id));

    const rankedPerfumes: RankedPerfume[] = [];
    for (const ranking of data.rankings || []) {
      const perfume = perfumeMap.get(String(ranking.id));
      if (!perfume) {
        console.warn(`[AI Matcher] Perfume ID ${ranking.id} (type: ${typeof ranking.id}) not found in catalog`);
        continue;
      }
      const matchPercentage = typeof ranking.matchPercentage === "number" 
        ? Math.max(0, Math.min(100, ranking.matchPercentage))
        : 0;
      
      rankedPerfumes.push({
        ...perfume,
        score: matchPercentage / 100, // Convert percentage to 0-1 scale
        maxScore: 100,
        matchPercentage: matchPercentage,
        reasons: ranking.reasons || [],
        breakdown: [],
        matchedCorePreferences: 0,
        consideredCorePreferences: 0,
        confidence: matchPercentage,
      });
    }

    const totalElapsed = Date.now() - requestStartTime;
    console.log(`[AI Matcher] Successfully ranked ${rankedPerfumes.length} perfumes in ${totalElapsed}ms`);
    return rankedPerfumes;
  } catch (error) {
    const totalElapsed = Date.now() - requestStartTime;
    console.error(`[AI Matcher Client] ERROR: Failed after ${totalElapsed}ms:`, error);
    throw error;
  }
}

