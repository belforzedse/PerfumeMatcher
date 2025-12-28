import type { QuestionnaireAnswers } from "./questionnaire";
import type { UserResponses } from "./questionnaire-mapper";
import { calculateConfidence, getConfidenceLevel, HIGH_CONFIDENCE_THRESHOLD, LOW_CONFIDENCE_THRESHOLD, QUICK_FIRE_TRIGGER } from "./questionnaire-confidence";

export type QuestionPath = "quick" | "deep";
export type QuestionStepType =
  | "path-selection"
  | "gender"
  | "scene-cards"
  | "safety-step"
  | "pairwise"
  | "intensity"
  | "quick-fire-notes"
  | "review";

export interface QuestionStep {
  type: QuestionStepType;
  id: string;
  title: string;
  description?: string;
}

export interface FlowState {
  path: QuestionPath | null;
  currentStep: number;
  steps: QuestionStep[];
  responses: UserResponses;
  confidence: number;
  helpMode: boolean;
}

const QUICK_STEPS: QuestionStep[] = [
  {
    type: "path-selection",
    id: "path",
    title: "راه خود را انتخاب کنید",
    description: "می‌خواهید سریع پیش بروید یا عمیق‌تر ادامه دهیم؟",
  },
  {
    type: "gender",
    id: "gender",
    title: "جنسیت شما چیست؟",
    description: "این انتخاب نتایج را به‌صورت قطعی فیلتر می‌کند.",
  },
  {
    type: "scene-cards",
    id: "scenes-1",
    title: "کدام صحنه بیشتر با شما هماهنگ است؟",
    description: "حداکثر ۳ مورد را انتخاب کنید.",
  },
  {
    type: "safety-step",
    id: "safety",
    title: "چیزی هست که اصلاً نمی‌پسندید؟",
    description: "اختیاری — برای اینکه پیشنهادها از موارد نامطلوب دور بمانند.",
  },
  {
    type: "pairwise",
    id: "vibe-1",
    title: "کدام را ترجیح می‌دهید؟",
  },
  {
    type: "intensity",
    id: "intensity",
    title: "چقدر دوست دارید عطرتان جلب توجه کند؟",
  },
  {
    type: "review",
    id: "review",
    title: "بازبینی پاسخ‌ها",
    description: "آیا این موارد درست است؟",
  },
];

const DEEP_STEPS: QuestionStep[] = [
  {
    type: "path-selection",
    id: "path",
    title: "راه خود را انتخاب کنید",
    description: "می‌خواهید سریع پیش بروید یا عمیق‌تر ادامه دهیم؟",
  },
  {
    type: "gender",
    id: "gender",
    title: "جنسیت شما چیست؟",
    description: "این انتخاب نتایج را به‌صورت قطعی فیلتر می‌کند.",
  },
  {
    type: "scene-cards",
    id: "scenes-1",
    title: "کدام صحنه بیشتر با شما هماهنگ است؟",
    description: "حداکثر ۳ مورد را انتخاب کنید.",
  },
  {
    type: "safety-step",
    id: "safety",
    title: "چیزی هست که اصلاً نمی‌پسندید؟",
    description: "اختیاری — برای اینکه پیشنهادها از موارد نامطلوب دور بمانند.",
  },
  {
    type: "pairwise",
    id: "vibe-1",
    title: "کدام را ترجیح می‌دهید؟",
  },
  {
    type: "pairwise",
    id: "vibe-2",
    title: "و این یکی چطور؟",
  },
  {
    type: "intensity",
    id: "intensity",
    title: "چقدر دوست دارید عطرتان جلب توجه کند؟",
  },
  {
    type: "quick-fire-notes",
    id: "notes",
    title: "رایحه‌های آشنا",
    description: "سریع بگویید: دوست دارید یا نه؟",
  },
  {
    type: "review",
    id: "review",
    title: "بازبینی پاسخ‌ها",
    description: "آیا این موارد درست است؟",
  },
];

export function createInitialFlowState(): FlowState {
  return {
    path: null,
    currentStep: 0,
    steps: [
      {
        type: "path-selection",
        id: "path",
        title: "راه خود را انتخاب کنید",
        description: "می‌خواهید سریع پیش بروید یا عمیق‌تر ادامه دهیم؟",
      },
    ],
    responses: {
      scenes: [],
      vibePairs: [],
      safetyChecks: [],
      quickFireLikes: [],
      quickFireDislikes: [],
      gender: undefined,
    },
    confidence: 0,
    helpMode: false,
  };
}

export function initializeFlow(path: QuestionPath): FlowState {
  const baseSteps = path === "quick" ? QUICK_STEPS : DEEP_STEPS;
  const steps = baseSteps.slice(1);
  return {
    path,
    currentStep: 0,
    steps,
    responses: {
      scenes: [],
      vibePairs: [],
      safetyChecks: [],
      quickFireLikes: [],
      quickFireDislikes: [],
      gender: undefined,
    },
    confidence: 0,
    helpMode: false,
  };
}

export function getCurrentStep(state: FlowState): QuestionStep | null {
  if (state.currentStep < 0 || state.currentStep >= state.steps.length) {
    return null;
  }
  return state.steps[state.currentStep];
}

export function canProceed(state: FlowState): boolean {
  const step = getCurrentStep(state);
  if (!step) return false;

  switch (step.type) {
    case "path-selection":
      return state.path !== null;
    case "gender":
      return Boolean(state.responses.gender);
    case "scene-cards":
      return state.responses.scenes.length > 0;
    case "safety-step":
      return true;
    case "pairwise": {
      const pairwiseIndex = state.steps
        .slice(0, state.currentStep + 1)
        .filter((s) => s.type === "pairwise").length - 1;
      const hasSelection = state.responses.vibePairs.length > pairwiseIndex;
      return hasSelection && state.responses.vibePairs[pairwiseIndex] !== undefined;
    }
    case "intensity":
      return state.responses.intensity !== undefined;
    case "quick-fire-notes":
      return true;
    case "review":
      return true;
    default:
      return false;
  }
}

export function updateConfidence(state: FlowState, answers: QuestionnaireAnswers): FlowState {
  const { overall } = calculateConfidence(answers);
  const level = getConfidenceLevel(overall);
  const helpMode = level === "low" || state.helpMode;

  return {
    ...state,
    confidence: overall,
    helpMode,
  };
}

export function shouldShowQuickFire(state: FlowState): boolean {
  if (state.path === "quick") {
    return state.confidence < QUICK_FIRE_TRIGGER;
  }
  return true;
}

export function shouldShortCircuit(state: FlowState): boolean {
  return state.confidence >= HIGH_CONFIDENCE_THRESHOLD && state.path === "quick";
}

export function getNextStep(state: FlowState): number | null {
  if (state.currentStep >= state.steps.length - 1) {
    return null;
  }

  const nextStep = state.currentStep + 1;
  const nextStepData = state.steps[nextStep];

  if (shouldShortCircuit(state) && nextStepData?.type === "quick-fire-notes") {
    return state.steps.findIndex((s) => s.type === "review");
  }

  return nextStep;
}

export function getProgress(state: FlowState): number {
  if (state.steps.length === 0) return 0;
  return Math.round(((state.currentStep + 1) / state.steps.length) * 100);
}

