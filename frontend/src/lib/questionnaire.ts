import {
  Choice,
  INTENSITY_CHOICES,
  MOMENT_CHOICES,
  MOOD_CHOICES,
  NOTE_CHOICES,
  STYLE_CHOICES,
  TIME_CHOICES,
} from "@/lib/kiosk-options";

export type QuestionType = "multiple" | "single";
//hello
export interface QuestionnaireAnswers {
  moods: string[];
  moments: string[];
  times: string[];
  intensity: string[];
  styles: string[];
  noteLikes: string[];
  noteDislikes: string[];
}
//camel by camel

export type AnswerKey = keyof QuestionnaireAnswers;

export interface QuestionDefinition {
  title: string;
  description?: string;
  type: QuestionType;
  options: Choice[];
  key: AnswerKey;
  optional?: boolean;
  maxSelections?: number;
}

export const createInitialAnswers = (): QuestionnaireAnswers => ({
  moods: [],
  moments: [],
  times: [],
  intensity: [],
  styles: [],
  noteLikes: [],
  noteDislikes: [],
});

export const QUESTION_FLOW: QuestionDefinition[] = [
  {
    title: "حال‌وهواهای مورد علاقه شما چیست؟",
    description: "حداکثر دو مورد را انتخاب کنید.",
    type: "multiple",
    options: MOOD_CHOICES,
    key: "moods",
    maxSelections: 2,
  },
  {
    title: "این عطر را بیشتر برای چه موقعیت‌هایی می‌خواهید؟",
    description: "حداکثر سه مورد را انتخاب کنید.",
    type: "multiple",
    options: MOMENT_CHOICES,
    key: "moments",
    maxSelections: 3,
  },
  {
    title: "بیشتر برای چه زمانی از روز؟",
    type: "single",
    options: TIME_CHOICES,
    key: "times",
  },
  {
    title: "شدت پخش بو را ترجیح می‌دهید؟",
    description: "از ملایم تا قوی.",
    type: "single",
    options: INTENSITY_CHOICES,
    key: "intensity",
  },
  {
    title: "سبک عطر مورد علاقه شما چیست؟",
    type: "single",
    options: STYLE_CHOICES,
    key: "styles",
  },
  {
    title: "به کدام دسته از نُت‌ها علاقه دارید؟",
    description: "اختیاری؛ تا سه مورد.",
    type: "multiple",
    options: NOTE_CHOICES,
    key: "noteLikes",
    optional: true,
    maxSelections: 3,
  },
  {
    title: "از کدام دسته از نُت‌ها خوشتان نمی‌آید؟",
    description: "اختیاری؛ تا سه مورد.",
    type: "multiple",
    options: NOTE_CHOICES,
    key: "noteDislikes",
    optional: true,
    maxSelections: 3,
  },
];

export const TOTAL_QUESTIONS = QUESTION_FLOW.length;

export const serializeAnswers = (answers: QuestionnaireAnswers): string =>
  JSON.stringify(answers);

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((item) => {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed.length > 0) {
        unique.add(trimmed);
      }
    }
  });
  return Array.from(unique);
};

export const parseAnswers = (
  raw: string | null
): QuestionnaireAnswers | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const base = createInitialAnswers();
    (Object.keys(base) as AnswerKey[]).forEach((key) => {
      base[key] = ensureStringArray(parsed[key]);
    });
    return base;
  } catch (error) {
    console.error("Failed to parse questionnaire answers:", error);
    return null;
  }
};
