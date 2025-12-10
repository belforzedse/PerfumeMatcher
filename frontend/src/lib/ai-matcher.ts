import { QuestionnaireAnswers } from "@/lib/questionnaire";
import { Perfume } from "@/lib/api";
import { RankedPerfume } from "@/lib/perfume-matcher";

interface AIRankingsResponse {
  rankings: Array<{
    id: number;
    matchPercentage: number;
    reasons?: string[];
  }>;
}

export async function getAIRankings(
  answers: QuestionnaireAnswers,
  perfumes: Perfume[]
): Promise<RankedPerfume[]> {
  console.log("[AI Matcher Client] Starting getAIRankings...");
  console.log("[AI Matcher Client] Input:", {
    perfumesCount: perfumes.length,
    answersSummary: {
      moods: answers.moods.length,
      moments: answers.moments.length,
      times: answers.times.length,
      intensity: answers.intensity.length,
      styles: answers.styles.length,
      noteLikes: answers.noteLikes.length,
      noteDislikes: answers.noteDislikes.length,
    },
  });

  const requestStartTime = Date.now();

  try {
    console.log("[AI Matcher Client] Fetching from /api/recommendations...");
    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answers,
        perfumes,
      }),
    });

    const fetchElapsed = Date.now() - requestStartTime;
    console.log(`[AI Matcher Client] Fetch completed in ${fetchElapsed}ms, status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("[AI Matcher Client] ERROR: Request failed:", {
        status: response.status,
        statusText: response.statusText,
        error,
      });
      throw new Error(
        error.error || `Failed to get AI rankings: ${response.status}`
      );
    }

    console.log("[AI Matcher Client] Parsing response JSON...");
    const data: AIRankingsResponse = await response.json();
    console.log("[AI Matcher Client] Response received:", {
      rankingsCount: data.rankings.length,
      topMatch: data.rankings[0]
        ? {
            id: data.rankings[0].id,
            matchPercentage: data.rankings[0].matchPercentage,
          }
        : null,
    });

    // Transform AI response to RankedPerfume format
    console.log("[AI Matcher Client] Transforming to RankedPerfume format...");
    const perfumeMap = new Map(perfumes.map((p) => [p.id, p]));
    const rankedPerfumes: RankedPerfume[] = [];

    for (const ranking of data.rankings) {
      const perfume = perfumeMap.get(ranking.id);
      if (!perfume) {
        console.warn(`[AI Matcher Client] WARNING: Perfume ID ${ranking.id} not found in perfume map`);
        continue;
      }

      rankedPerfumes.push({
        ...perfume,
        score: ranking.matchPercentage,
        maxScore: 100,
        matchPercentage: ranking.matchPercentage,
        reasons: ranking.reasons || [],
        breakdown: [],
        matchedCorePreferences: 0,
        consideredCorePreferences: 0,
        confidence: ranking.matchPercentage,
      });
    }

    const totalElapsed = Date.now() - requestStartTime;
    console.log(`[AI Matcher Client] Transformation complete in ${totalElapsed}ms total`);
    console.log("[AI Matcher Client] Final result:", {
      rankedPerfumesCount: rankedPerfumes.length,
      topMatch: rankedPerfumes[0]
        ? {
            id: rankedPerfumes[0].id,
            name: rankedPerfumes[0].nameFa || rankedPerfumes[0].nameEn,
            matchPercentage: rankedPerfumes[0].matchPercentage,
          }
        : null,
    });

    return rankedPerfumes;
  } catch (error) {
    const totalElapsed = Date.now() - requestStartTime;
    console.error(`[AI Matcher Client] ERROR: Failed after ${totalElapsed}ms:`, error);
    throw error;
  }
}

