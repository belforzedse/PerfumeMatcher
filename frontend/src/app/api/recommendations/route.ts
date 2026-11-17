
import { NextResponse } from "next/server";

import type { QuestionnaireAnswers } from "@/lib/questionnaire";
import type { RankedPerfume } from "@/lib/perfume-matcher";
import type { BackendPerfumeData } from "@/lib/api";
import { toPerfume } from "@/lib/api";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  "http://127.0.0.1:8000";

type GandomResult = BackendPerfumeData & {
  id: number;
  score?: number;
  matchPercentage?: number;
  product_url?: string;
  price?: string;
  image?: string;
};

export async function POST(request: Request) {
  try {
    const answers =
      (await request.json()) as QuestionnaireAnswers;

    const response = await fetch(
      `${BACKEND_URL}/api/recommend/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(answers),
        cache: "no-store",
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!response.ok) {
      const details = await response.text();

      console.error(
        "Gandom recommendation error:",
        response.status,
        details
      );

      return NextResponse.json(
        { error: "خطا در دریافت پیشنهادهای عطر" },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      results?: GandomResult[];
    };

    const ranked: RankedPerfume[] = (
      data.results ?? []
    )
      .slice(0, 6)
      .map((item) => {
        const perfume = toPerfume(item);

        const percentage =
          typeof item.matchPercentage === "number"
            ? item.matchPercentage
            : Math.round(
                Math.max(
                  0,
                  Math.min(1, Number(item.score) || 0)
                ) * 100
              );

        return {
          ...perfume,
          score: percentage / 100,
          maxScore: 100,
          matchPercentage: percentage,
          reasons: [],
          breakdown: [],
          matchedCorePreferences: 0,
          consideredCorePreferences: 0,
          confidence: percentage,
        };
      });

    console.log(
      "Gandom recommendations:",
      ranked.length
    );

    return NextResponse.json({
      ranked,
      fallback: false,
    });

  } catch (error) {
    console.error(
      "Recommendation API error:",
      error
    );

    return NextResponse.json(
      { error: "ارتباط با موتور پیشنهاد برقرار نشد" },
      { status: 502 }
    );
  }
}
