import type { QuestionnaireAnswers } from "./questionnaire";

export interface ConfidenceByField {
  moods: number;
  moments: number;
  times: number;
  intensity: number;
  styles: number;
  noteLikes: number;
  noteDislikes: number;
}

export interface ConfidenceState {
  overall: number;
  byField: ConfidenceByField;
}

const FIELD_WEIGHTS: Record<keyof ConfidenceByField, number> = {
  moods: 0.2,
  moments: 0.2,
  times: 0.1,
  intensity: 0.15,
  styles: 0.15,
  noteLikes: 0.1,
  noteDislikes: 0.1,
};

const NOT_SURE_VALUES = ["not-sure", "any", "anytime", "none"];

function calculateFieldConfidence(
  field: keyof ConfidenceByField,
  values: string[],
  maxSelections?: number
): number {
  if (values.length === 0) {
    return 0;
  }

  const hasNotSure = values.some((v) => NOT_SURE_VALUES.includes(v));
  if (hasNotSure && values.length === 1) {
    return 20;
  }

  const notSureCount = values.filter((v) => NOT_SURE_VALUES.includes(v)).length;
  const definiteCount = values.length - notSureCount;

  if (definiteCount === 0) {
    return 20;
  }

  let baseConfidence = 50;

  if (maxSelections) {
    const selectionRatio = definiteCount / maxSelections;
    baseConfidence = 40 + selectionRatio * 40;
  } else {
    baseConfidence = definiteCount > 0 ? 70 : 20;
  }

  const notSurePenalty = notSureCount * 15;
  const finalConfidence = Math.max(20, Math.min(100, baseConfidence - notSurePenalty));

  return finalConfidence;
}

export function calculateConfidence(answers: QuestionnaireAnswers): ConfidenceState {
  const byField: ConfidenceByField = {
    moods: calculateFieldConfidence("moods", answers.moods, 2),
    moments: calculateFieldConfidence("moments", answers.moments, 3),
    times: calculateFieldConfidence("times", answers.times),
    intensity: calculateFieldConfidence("intensity", answers.intensity),
    styles: calculateFieldConfidence("styles", answers.styles),
    noteLikes: calculateFieldConfidence("noteLikes", answers.noteLikes, 3),
    noteDislikes: calculateFieldConfidence("noteDislikes", answers.noteDislikes, 3),
  };

  const overall =
    Object.entries(byField).reduce(
      (sum, [field, confidence]) => sum + confidence * FIELD_WEIGHTS[field as keyof ConfidenceByField],
      0
    ) / Object.values(FIELD_WEIGHTS).reduce((sum, weight) => sum + weight, 0);

  return {
    overall: Math.round(overall),
    byField,
  };
}

export const HIGH_CONFIDENCE_THRESHOLD = 75;
export const LOW_CONFIDENCE_THRESHOLD = 50;
export const QUICK_FIRE_TRIGGER = 60;

export function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (confidence >= LOW_CONFIDENCE_THRESHOLD) return "medium";
  return "low";
}


