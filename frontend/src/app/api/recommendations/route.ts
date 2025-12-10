import { NextRequest, NextResponse } from "next/server";
import { getPerfumeRecommendations } from "@/lib/ai";

interface AIRankingsRequest {
  answers: Parameters<typeof getPerfumeRecommendations>[0];
  perfumes: Parameters<typeof getPerfumeRecommendations>[1];
}

export async function POST(request: NextRequest) {
  console.log("[API Route] POST /api/recommendations - Request received");
  const requestStartTime = Date.now();

  try {
    console.log("[API Route] Parsing request body...");
    const body: AIRankingsRequest = await request.json();

    const { answers, perfumes } = body;

    console.log("[API Route] Request validation:", {
      hasAnswers: !!answers,
      hasPerfumes: !!perfumes,
      perfumesIsArray: Array.isArray(perfumes),
      perfumesCount: Array.isArray(perfumes) ? perfumes.length : 0,
    });

    if (!answers || !perfumes || !Array.isArray(perfumes)) {
      console.error("[API Route] ERROR: Invalid request format");
      return NextResponse.json(
        { error: "Invalid request: answers and perfumes array required" },
        { status: 400 }
      );
    }

    console.log("[API Route] Calling getPerfumeRecommendations...");
    // Get recommendations from OpenAI using ai.ts
    const result = await getPerfumeRecommendations(answers, perfumes);

    const elapsed = Date.now() - requestStartTime;
    console.log(`[API Route] Request completed in ${elapsed}ms`);
    console.log("[API Route] Returning:", {
      rankingsCount: result.rankings.length,
      topMatchId: result.rankings[0]?.id,
      topMatchPercentage: result.rankings[0]?.matchPercentage,
    });

    return NextResponse.json(result);
  } catch (error) {
    const elapsed = Date.now() - requestStartTime;
    console.error(`[API Route] ERROR: Request failed after ${elapsed}ms:`, error);
    
    // Handle specific error types
    if (error instanceof Error) {
      console.error("[API Route] Error details:", {
        message: error.message,
        stack: error.stack?.substring(0, 200),
      });

      if (error.message.includes("OPENAI_API_KEY")) {
        return NextResponse.json(
          { error: "OpenAI API key not configured" },
          { status: 500 }
        );
      }
      if (error.message.includes("Invalid response")) {
        return NextResponse.json(
          { error: "Invalid response format from AI service" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

