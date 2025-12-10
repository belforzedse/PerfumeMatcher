import { Perfume } from "@/lib/api";

// Simplified types - all matching logic removed, kept only for type compatibility

export interface ScoreComponent {
  key:
    | "moods"
    | "moments"
    | "times"
    | "intensity"
    | "styles"
    | "noteAffinity"
    | "noteLayering"
    | "synergy"
    | "versatility";
  label: string;
  weight: number;
  achieved: number;
  reason?: string;
  isCore?: boolean;
}

export interface RankedPerfume extends Perfume {
  score: number;
  maxScore: number;
  matchPercentage: number;
  reasons: string[];
  breakdown: ScoreComponent[];
  matchedCorePreferences: number;
  consideredCorePreferences: number;
  confidence: number;
}
