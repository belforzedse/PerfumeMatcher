import { NextResponse } from "next/server";

import type { QuestionnaireAnswers } from "@/lib/questionnaire";
import type { RankedPerfume } from "@/lib/perfume-matcher";
import type { BackendPerfumeData } from "@/lib/api";
import { toPerfume } from "@/lib/api";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8000";
const RERANK_ENDPOINT = `${BACKEND_BASE_URL}/api/recommend/rerank/`;
const BASELINE_ENDPOINT = `${BACKEND_BASE_URL}/api/recommend/`;
const PERFUMES_ENDPOINT = `${BACKEND_BASE_URL}/api/perfumes/`;

type BackendRerankItem = {
  id: string | number;
  matchPercentage: number;
  reasons?: string[];
};

type BackendRerankResponse = {
  rankings: BackendRerankItem[];
  fallback?: boolean;
  elapsedMs?: number;
};

type BackendBaselineResponse = {
  results: Array<{ id: string | number; score: number } & BackendPerfumeData>;
};

let cachedCatalog: BackendPerfumeData[] | null = null;
let cachedCatalogTime = 0;
const CATALOG_TTL_MS = 5 * 60 * 1000;

async function getCatalog(): Promise<BackendPerfumeData[]> {
  const now = Date.now();
  if (cachedCatalog && now - cachedCatalogTime < CATALOG_TTL_MS) {
    return cachedCatalog;
  }

  const res = await fetch(PERFUMES_ENDPOINT, {
    // Let Next/server cache this for a short time to reduce repeated catalog downloads.
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Failed to load catalog (HTTP ${res.status})`);
  }

  const data = (await res.json()) as BackendPerfumeData[];
  cachedCatalog = data;
  cachedCatalogTime = now;
  return data;
}

function toRankedPerfume(perfumeData: BackendPerfumeData, matchPercentage: number, reasons: string[]): RankedPerfume {
  const perfume = toPerfume(perfumeData);
  const clamped = Math.max(0, Math.min(100, Number.isFinite(matchPercentage) ? matchPercentage : 0));
  return {
    ...perfume,
    score: clamped / 100,
    maxScore: 100,
    matchPercentage: clamped,
    reasons,
    breakdown: [],
    matchedCorePreferences: 0,
    consideredCorePreferences: 0,
    confidence: clamped,
  };
}

export async function POST(request: Request) {
  let answers: QuestionnaireAnswers;
  try {
    answers = (await request.json()) as QuestionnaireAnswers;
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  try {
    // First: ask backend for rerank results (fast payload).
    const rerankController = new AbortController();
    const rerankTimeoutId = setTimeout(() => rerankController.abort(), 120_000);
    const rerankRes = await fetch(RERANK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
      // backend can take a while; keep the browser request short by doing this server-side
      signal: rerankController.signal,
    }).finally(() => clearTimeout(rerankTimeoutId));

    if (!rerankRes.ok) {
      throw new Error(`Rerank HTTP ${rerankRes.status}`);
    }

    const rerank = (await rerankRes.json()) as BackendRerankResponse;
    const catalog = await getCatalog();
    const catalogMap = new Map(catalog.map((p) => [String(p.id), p]));

    const ranked = (rerank.rankings ?? [])
      .slice(0, 12) // keep a little slack in case of missing IDs
      .map((item) => {
        const perfumeData = catalogMap.get(String(item.id));
        if (!perfumeData) return null;
        return toRankedPerfume(perfumeData, item.matchPercentage, item.reasons ?? []);
      })
      .filter((p): p is RankedPerfume => p !== null)
      .slice(0, 6);

    return NextResponse.json({ ranked, fallback: Boolean(rerank.fallback) });
  } catch (rerankError) {
    // Fallback: baseline endpoint returns full perfume objects.
    try {
      const baselineController = new AbortController();
      const baselineTimeoutId = setTimeout(() => baselineController.abort(), 120_000);
      const baselineRes = await fetch(BASELINE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
        signal: baselineController.signal,
      }).finally(() => clearTimeout(baselineTimeoutId));
      if (!baselineRes.ok) {
        throw new Error(`Baseline HTTP ${baselineRes.status}`);
      }

      const baseline = (await baselineRes.json()) as BackendBaselineResponse;
      const ranked = (baseline.results ?? []).slice(0, 6).map((item) => {
        const score = typeof item.score === "number" ? item.score : 0;
        const matchPercentage = Math.round(Math.max(0, Math.min(1, score)) * 100);
        return toRankedPerfume(item, matchPercentage, []);
      });

      return NextResponse.json({ ranked, fallback: true });
    } catch (baselineError) {
      console.error("[/api/recommendations] rerank failed:", rerankError);
      console.error("[/api/recommendations] baseline failed:", baselineError);
      return NextResponse.json(
        { error: "در دریافت پیشنهادها خطایی رخ داد. لطفاً دوباره تلاش کنید." },
        { status: 502 },
      );
    }
  }
}
