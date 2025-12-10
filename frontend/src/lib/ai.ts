import OpenAI from "openai";
import { encoding_for_model } from "tiktoken"; // <-- REAL TOKEN COUNTING
import { QuestionnaireAnswers } from "./questionnaire";
import { Perfume } from "./api";

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AIRankingResult {
  id: number;
  matchPercentage: number;
  reasons?: string[];
}

interface AIRankingsResponse {
  rankings: AIRankingResult[];
}

function isGenderCompatible(
  answers: QuestionnaireAnswers,
  perfume: Perfume
): boolean {
  const stylesLower = (answers.styles ?? []).map((s) => s.toLowerCase());
  const wantsMasculine = stylesLower.includes("masculine");
  const wantsFeminine = stylesLower.includes("feminine");
  const wantsUnisexOnly =
    stylesLower.includes("unisex") && !wantsMasculine && !wantsFeminine;

  const g = (perfume.gender || "").toLowerCase();

  if (!g || (!wantsMasculine && !wantsFeminine && !wantsUnisexOnly)) {
    return true;
  }

  if (g === "unisex") return true;

  if (wantsMasculine && g === "female") return false;

  if (wantsFeminine && g === "male") return false;

  if (wantsUnisexOnly && g !== "unisex") return false;

  return true;
}

function scorePerfume(answers: QuestionnaireAnswers, perfume: Perfume): number {
  let score = 0;

  const notes = perfume.allNotes ?? [];
  const noteSet = new Set(notes);

  for (const like of answers.noteLikes) {
    if (noteSet.has(like)) score += 2;
  }

  for (const dislike of answers.noteDislikes) {
    if (noteSet.has(dislike)) score -= 3;
  }

  const character = (perfume.character || "").toLowerCase();
  const family = (perfume.family || "").toLowerCase();

  for (const mood of answers.moods) {
    const m = mood.toLowerCase();
    if (character.includes(m) || family.includes(m)) {
      score += 1;
    }
  }

  const season = (perfume.season || "").toLowerCase();
  for (const moment of answers.moments) {
    const m = moment.toLowerCase();
    if (m.includes("winter") && season.includes("winter")) score += 1;
    if (m.includes("summer") && season.includes("summer")) score += 1;
  }

  if (answers.intensity.includes("strong") && character.includes("strong")) {
    score += 1;
  }
  if (answers.intensity.includes("medium") && character.includes("medium")) {
    score += 1;
  }
  if (answers.intensity.includes("soft") && character.includes("soft")) {
    score += 1;
  }

  const stylesLower = (answers.styles ?? []).map((s) => s.toLowerCase());
  const wantsMasculine = stylesLower.includes("masculine");
  const wantsFeminine = stylesLower.includes("feminine");
  const g = (perfume.gender || "").toLowerCase();

  if (wantsMasculine && (g === "male" || g === "unisex")) score += 2;
  if (wantsFeminine && (g === "female" || g === "unisex")) score += 2;

  return score;
}

export async function getPerfumeRecommendations(
  answers: QuestionnaireAnswers,
  perfumes: Perfume[]
): Promise<AIRankingsResponse> {
  console.log("[AI] Starting recommendation process...");

  const genderFiltered = perfumes.filter((p) => isGenderCompatible(answers, p));

  const basePool = genderFiltered.length > 0 ? genderFiltered : perfumes;

  const scored = basePool
    .map((p) => ({ perfume: p, score: scorePerfume(answers, p) }))
    .sort((a, b) => b.score - a.score);

  const maxScore = scored[0]?.score ?? 0;
  const minScore = scored[scored.length - 1]?.score ?? 0;

  let maxForModel = 50;
  if (maxScore === minScore) maxForModel = 80;

  const perfumesForPrompt = scored
    .slice(0, Math.min(maxForModel, scored.length))
    .map((s) => s.perfume);

  console.log("[AI] Pre-filter:", {
    originalCount: perfumes.length,
    genderFiltered: genderFiltered.length,
    usedCount: perfumesForPrompt.length,
    maxScore,
    minScore,
  });

  const prompt = buildRecommendationPrompt(answers, perfumesForPrompt);

  // -----------------------------
  // REAL TOKEN COUNT USING TIKTOKEN
  // -----------------------------
  try {
    const enc = encoding_for_model("gpt-5-nano");
    const inputTokens = enc.encode(prompt).length;

    console.log("[AI] REAL TOKEN COUNT:", {
      characters: prompt.length,
      inputTokens,
    });
  } catch (err) {
    console.warn("[AI] WARNING: Tokenizer failed, using fallback estimate.");
    console.log("[AI] Estimated tokens:", Math.ceil(prompt.length / 4));
  }

  console.log("[AI] Prompt built:", {
    length: prompt.length,
    perfumeCount: perfumesForPrompt.length,
    filteredFrom: perfumes.length,
  });

  const model = process.env.OPENAI_MODEL ?? "gpt-5-nano";

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a perfume recommendation expert. Analyze user preferences and match them with available perfumes. Return only valid JSON.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("No response content from OpenAI");

  console.log("[AI] Parsing OpenAI response...");

  const parsed = JSON.parse(content);
  const rankings = Array.isArray(parsed.rankings)
    ? parsed.rankings
    : Array.isArray(parsed)
    ? parsed
    : [];

  const normalizedRankings = rankings.map((item: any) => ({
    id: Number(item.id) || 0,
    matchPercentage: Math.max(
      0,
      Math.min(100, Number(item.matchPercentage) || 0)
    ),
    reasons: Array.isArray(item.reasons) ? item.reasons : [],
  }));

  return {
    rankings: normalizedRankings,
  };
}

function buildRecommendationPrompt(
  answers: QuestionnaireAnswers,
  perfumes: Perfume[]
): string {
  const limit = <T>(arr: T[], max = 6): T[] =>
    arr.length > max ? arr.slice(0, max) : arr;

  const userPrefs = {
    moods: limit(answers.moods),
    moments: limit(answers.moments),
    times: limit(answers.times),
    intensity: limit(answers.intensity),
    styles: limit(answers.styles),
    likedNotes: limit(answers.noteLikes),
    dislikedNotes: limit(answers.noteDislikes),
  };

  const perfumeLines = perfumes
    .map((p) =>
      JSON.stringify({
        id: p.id,
        name: p.nameFa || p.nameEn || "",
        brand: p.brand || "",
        gender: p.gender || "",
        family: p.family || "",
        season: p.season || "",
        notes: (p.allNotes || []).slice(0, 8),
      })
    )
    .join("\n");

  return `
You are a perfume recommendation expert.

We have:
- "userPreferences": one JSON object.
- "perfumes": one JSON object per line.

Task:
1) Analyze userPreferences and perfumes.
2) Compute how well each perfume matches.
3) Return ONLY valid JSON in this exact format:

{
  "rankings": [
    {
      "id": 123,
      "matchPercentage": 85,
      "reasons": ["دلیل اول", "دلیل دوم"]
    }
  ]
}

userPreferences:
${JSON.stringify(userPrefs)}

perfumes (one JSON per line):
${perfumeLines}
`.trim();
}
