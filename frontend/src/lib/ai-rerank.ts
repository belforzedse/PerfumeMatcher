import OpenAI from "openai";
import { QuestionnaireAnswers } from "./questionnaire";

export interface Candidate {
  id: number | string;
  name?: string;
  brand?: string;
  gender?: string | null;
  intensity?: string | null;
  score?: number;
  notes?: string[];
}

export interface AIRerankResult {
  rankings: Array<{
    id: number | string;
    matchPercentage: number;
    reasons?: string[];
  }>;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const extractContent = (response: unknown): string | null => {
  if (!response || typeof response !== "object") return null;
  const resp = response as Record<string, unknown>;

  // responses.create (unified) output
  const output = resp.output;
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0] as { content?: unknown };
    const content = first?.content;
    if (Array.isArray(content) && content.length > 0) {
      const textEntry = content[0] as { text?: unknown };
      if (typeof textEntry?.text === "string") return textEntry.text;
    }
  }
  const outputText = (resp as { output_text?: unknown }).output_text;
  if (typeof outputText === "string") return outputText;

  // chat completion fallback
  const choices = (resp as { choices?: unknown }).choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const msg = (choices[0] as { message?: { content?: unknown } }).message;
    if (typeof msg?.content === "string") return msg.content;
  }

  const content = (resp as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
};

const buildPrompt = (answers: QuestionnaireAnswers, candidates: Candidate[]): string =>
  [
    "You are a perfume recommendation expert.",
    "Input JSON fields:",
    '- "userPreferences": the user answers.',
    '- "candidates": array with {id,name,brand,gender,intensity,score,notes}.',
    "Task: rerank candidates by match quality. Return JSON: {\"rankings\":[{id,matchPercentage,reasons[]}]}",
    "Constraints: return only the JSON, keep matchPercentage 0-100 integers, reasons short (<=12 words).",
    "",
    JSON.stringify(
      {
        userPreferences: answers,
        candidates,
      },
      null,
      0
    ),
  ].join("\n");

export async function rerankWithAI(
  answers: QuestionnaireAnswers,
  candidates: Candidate[],
  opts?: { model?: string }
): Promise<AIRerankResult> {
  const model = opts?.model ?? process.env.OPENAI_MODEL ?? "gpt-5-nano";
  const prompt = buildPrompt(answers, candidates);

  const response = await openai.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "Rerank perfumes by user fit. Respond ONLY with JSON per instructions.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_output_tokens: 400,
  });

  const content = extractContent(response);
  if (!content) {
    throw new Error("No content from OpenAI rerank");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON from OpenAI rerank");
  }

  const parsedObj = parsed as Record<string, unknown>;
  const rankingsRaw = Array.isArray(parsedObj?.rankings)
    ? parsedObj.rankings
    : Array.isArray(parsed)
    ? (parsed as unknown[])
    : [];

  const rankings = rankingsRaw.map((item) => {
    const entry = item as Record<string, unknown>;
    const matchPercentage = Math.max(
      0,
      Math.min(100, Number(entry?.matchPercentage) || 0)
    );
    const reasons = Array.isArray(entry?.reasons)
      ? (entry.reasons as unknown[]).slice(0, 4).map(String)
      : [];
    return {
      id: entry?.id as number | string,
      matchPercentage,
      reasons,
    };
  });

  return { rankings };
}

