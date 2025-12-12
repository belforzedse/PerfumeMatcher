import { QuestionnaireAnswers } from "@/lib/questionnaire";
import { Perfume, toPerfume, type BackendPerfumeData } from "@/lib/api";
import { RankedPerfume } from "@/lib/perfume-matcher";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8000";
const RECOMMEND_ENDPOINT = `${BACKEND_BASE_URL}/api/recommend/`;

interface BackendRecommendResult {
  profile_text?: string;
  results: Array<{
    id: number | string;
    score: number;
    // Full perfume data from backend
    [key: string]: any;
  }>;
}

export async function getBaselineRankings(
  answers: QuestionnaireAnswers,
  _perfumes?: Perfume[] // No longer needed - backend returns full data
): Promise<RankedPerfume[]> {
  console.log("[Baseline Matcher] Starting getBaselineRankings...");
  const requestStartTime = Date.now();

  try {
    const response = await fetch(RECOMMEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(answers),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: BackendRecommendResult = await response.json();
    console.log(`[Baseline Matcher] Received ${data.results?.length || 0} results from backend`);

    const rankedPerfumes: RankedPerfume[] = [];
    for (const result of data.results || []) {
      // Backend now returns full perfume data, convert it using toPerfume
      const perfumeData = result as BackendPerfumeData;
      const perfume = toPerfume(perfumeData);
      
      const score = typeof result.score === "number" ? result.score : 0;
      const matchPercentage = Math.max(0, Math.min(100, Math.round(score * 100)));
      
      rankedPerfumes.push({
        ...perfume,
        score: score,
        maxScore: 1,
        matchPercentage: matchPercentage,
        reasons: [], // Baseline matcher doesn't provide reasons
        breakdown: [],
        matchedCorePreferences: 0,
        consideredCorePreferences: 0,
        confidence: matchPercentage,
      });
      console.log(`[Baseline Matcher] Ranked perfume ${perfume.id}: image = ${perfume.image || 'NO IMAGE'}`);
    }

    const totalElapsed = Date.now() - requestStartTime;
    console.log(`[Baseline Matcher] Successfully ranked ${rankedPerfumes.length} perfumes in ${totalElapsed}ms`);
    return rankedPerfumes;
  } catch (error) {
    const totalElapsed = Date.now() - requestStartTime;
    console.error(`[Baseline Matcher] ERROR: Failed after ${totalElapsed}ms:`, error);
    throw error;
  }
}

