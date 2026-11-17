import type { QuestionnaireAnswers } from "./questionnaire";

export interface SceneChoice {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  moods: string[];
  moments: string[];
}

export interface VibePair {
  id: string;
  left: { label: string; icon?: string };
  right: { label: string; icon?: string };
  styles: string[];
}

export interface IntensityChoice {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  value: string;
}

export interface SafetyChoice {
  id: string;
  label: string;
  noteDislikes: string[];
  weight: number;
}

export type ScentTraitId =
  | "sweetness"
  | "freshness"
  | "warmth"
  | "bitterness"
  | "powdery"
  | "woody";

export type ScentTraits = Partial<Record<ScentTraitId, number>>;

export type FavoriteReason =
  | "overall"
  | "sweetness"
  | "freshness"
  | "warmth"
  | "woody"
  | "projection"
  | "longevity";



export interface UserResponses {
  scenes: string[];
  vibePairs: string[];
  scentTraits: ScentTraits;
  intensity?: string;
  safetyChecks: string[];
  quickFireLikes: string[];
  quickFireDislikes: string[];
  times?: string;
  gender?: string;
}

const SCENE_MAPPINGS: Record<string, SceneChoice> = {
  "morning-cafe": {
    id: "morning-cafe",
    label: "صبح زود در کافه",
    description: "هوای تازه، قهوه، آرامش",
    icon: "☕",
    moods: ["fresh"],
    moments: ["daily"],
  },
  "evening-party": {
    id: "evening-party",
    label: "شب در مهمانی",
    description: "شب، مهمانی، جشن",
    icon: "🌙",
    moods: ["warm", "sweet"],
    moments: ["evening"],
  },
  "nature-walk": {
    id: "nature-walk",
    label: "پیاده‌روی در طبیعت",
    description: "هوای آزاد، طبیعت، ورزش",
    icon: "🌲",
    moods: ["fresh", "woody"],
    moments: ["outdoor"],
  },
  "cozy-home": {
    id: "cozy-home",
    label: "خانه دنج",
    description: "راحتی، آرامش، روزمره",
    icon: "🏠",
    moods: ["warm", "floral"],
    moments: ["daily"],
  },
  "romantic-dinner": {
    id: "romantic-dinner",
    label: "شام رمانتیک",
    description: "شب، عاشقانه، خاص",
    icon: "🍷",
    moods: ["warm", "floral", "sweet"],
    moments: ["evening"],
  },
  "beach-day": {
    id: "beach-day",
    label: "روز در ساحل",
    description: "آفتاب، دریا، تازگی",
    icon: "🏖️",
    moods: ["fresh"],
    moments: ["outdoor", "daily"],
  },
  "winter-night": {
    id: "winter-night",
    label: "شب زمستانی",
    description: "گرم، دنج، عمیق",
    icon: "❄️",
    moods: ["warm", "woody"],
    moments: ["evening"],
  },
  "gift-occasion": {
    id: "gift-occasion",
    label: "هدیه برای کسی",
    description: "خاص، قابل توجه",
    icon: "🎁",
    moods: ["sweet", "floral"],
    moments: ["gift"],
  },
};

const VIBE_PAIR_MAPPINGS: Record<string, VibePair> = {
  "soft-clean": {
    id: "soft-clean",
    left: { label: "نرم و تمیز", icon: "✨" },
    right: { label: "تیره و جسور", icon: "🌑" },
    styles: ["feminine", "unisex"],
  },
  "minimal-statement": {
    id: "minimal-statement",
    left: { label: "مینیمال", icon: "⚪" },
    right: { label: "پررنگ", icon: "🎨" },
    styles: ["unisex", "feminine"],
  },
  "classic-edgy": {
    id: "classic-edgy",
    left: { label: "کلاسیک", icon: "👔" },
    right: { label: "جسور", icon: "⚡" },
    styles: ["masculine", "unisex"],
  },
  "light-heavy": {
    id: "light-heavy",
    left: { label: "سبک و هوایی", icon: "💨" },
    right: { label: "سنگین و عمیق", icon: "🪨" },
    styles: ["unisex"],
  },
};

const INTENSITY_MAPPINGS: Record<string, IntensityChoice> = {
  whisper: {
    id: "whisper",
    label: "خیلی ملایم",
    description: "ملایم و نزدیک",
    icon: "🫧",
    value: "light",
  },
  noticeable: {
    id: "noticeable",
    label: "قابل توجه",
    description: "متوسط و متعادل",
    icon: "✨",
    value: "medium",
  },
  "make-entrance": {
    id: "make-entrance",
    label: "حضور پررنگ",
    description: "قوی و ماندگار",
    icon: "💥",
    value: "strong",
  },
};

const SAFETY_MAPPINGS: Record<string, SafetyChoice> = {
  "sweet-vanilla": {
    id: "sweet-vanilla",
    label: "وانیل",
    noteDislikes: ["وانیل"],
    weight: 2,
  },

  oud: {
    id: "oud",
    label: "عود",
    noteDislikes: ["عود"],
    weight: 2,
  },

  leather: {
    id: "leather",
    label: "چرم",
    noteDislikes: ["چرم"],
    weight: 2,
  },

  patchouli: {
    id: "patchouli",
    label: "نعناع هندی",
    noteDislikes: ["نعناع هندی", "پاتچولی"],
    weight: 2,
  },

  "white-floral": {
    id: "white-floral",
    label: "گل‌های سفید",
    noteDislikes: [
      "یاس",
      "یاسمن",
      "مریم",
      "گاردنیا",
      "بهار نارنج"
    ],
    weight: 2,
  },

  "sharp-citrus": {
    id: "sharp-citrus",
    label: "مرکبات",
    noteDislikes: ["ترنج", "گریپ فروت", "لیمو"],
    weight: 2,
   },

   musk: {
    id: "musk",
    label: "مشک",
    noteDislikes: ["مشک"],
    weight: 2,
    },


  none: {
    id: "none",
    label: "نمی‌دانم",
    noteDislikes: [],
    weight: 0,
  },
};

export function mapResponsesToAnswers(
  responses: UserResponses
): QuestionnaireAnswers {
  const answers: QuestionnaireAnswers = {
    gender: responses.gender ?? null,
    moods: [],
    moments: [],
    times: [],
    intensity: [],
    styles: [],
    noteLikes: [],
    noteDislikes: [],
    scentTraits: responses.scentTraits ?? {},

  };

  const moodSet = new Set<string>();
  const momentSet = new Set<string>();

  // Process selected scenes
  responses.scenes.forEach((sceneId) => {
    const scene = SCENE_MAPPINGS[sceneId];

    if (scene) {
      scene.moods.forEach((mood) => moodSet.add(mood));
      scene.moments.forEach((moment) => momentSet.add(moment));
    }
  });

  answers.moods = Array.from(moodSet).slice(0, 2);
  answers.moments = Array.from(momentSet).slice(0, 3);

  // Determine preferred time
  if (responses.times) {
    answers.times = [responses.times];
  } else if (answers.moments.includes("evening")) {
    answers.times = ["night"];
  } else if (
    answers.moments.includes("daily") ||
    answers.moments.includes("outdoor")
  ) {
    answers.times = ["day"];
  } else {
    answers.times = ["anytime"];
  }

  // Determine preferred intensity
  if (responses.intensity) {
    const intensityMapping =
      INTENSITY_MAPPINGS[responses.intensity];

    if (intensityMapping) {
      answers.intensity = [intensityMapping.value];
    }
  }

  // Keep compatibility with existing style logic
  const styleSet = new Set<string>();

  responses.vibePairs.forEach((vibeEntry) => {
    if (!vibeEntry) return;

    const [vibeId, choice] = vibeEntry.split(":");

    if (choice === "none") return;

    const vibe = VIBE_PAIR_MAPPINGS[vibeId];

    if (vibe) {
      vibe.styles.forEach((style) => styleSet.add(style));
    }
  });

  if (styleSet.size > 0) {
    answers.styles = [Array.from(styleSet)[0]];
  } else {
    answers.styles = ["unisex"];
  }

  // Process liked notes
  answers.noteLikes = responses.quickFireLikes.slice(0, 5);

  // Process disliked notes
  const dislikeMap = new Map<string, number>();

  responses.safetyChecks.forEach((safetyId) => {
    const safety = SAFETY_MAPPINGS[safetyId];

    if (safety && safety.noteDislikes.length > 0) {
      safety.noteDislikes.forEach((note) => {
        const current = dislikeMap.get(note) || 0;
        dislikeMap.set(note, current + safety.weight);
      });
    }
  });

  responses.quickFireDislikes.forEach((note) => {
    const current = dislikeMap.get(note) || 0;
    dislikeMap.set(note, current + 1);
  });

  const sortedDislikes = Array.from(dislikeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([note]) => note);

  answers.noteDislikes = sortedDislikes;

  return answers;
}

export function getSceneChoices(): SceneChoice[] {
  return Object.values(SCENE_MAPPINGS);
}

export function getVibePairs(): VibePair[] {
  return Object.values(VIBE_PAIR_MAPPINGS);
}

export function getIntensityChoices(): IntensityChoice[] {
  return Object.values(INTENSITY_MAPPINGS);
}

export function getSafetyChoices(): SafetyChoice[] {
  return Object.values(SAFETY_MAPPINGS);
}

export function getSceneLabel(sceneId: string): string {
  return SCENE_MAPPINGS[sceneId]?.label || sceneId;
}

export function getVibeLabel(vibeId: string, side: "left" | "right"): string {
  const vibe = VIBE_PAIR_MAPPINGS[vibeId];
  if (!vibe) return vibeId;
  return side === "left" ? vibe.left.label : vibe.right.label;
}

export function getIntensityLabel(intensityId: string): string {
  return INTENSITY_MAPPINGS[intensityId]?.label || intensityId;
}

export function getSafetyLabel(safetyId: string): string {
  return SAFETY_MAPPINGS[safetyId]?.label || safetyId;
}

