"use client";

import type { ScentTraitId, ScentTraits } from "@/lib/questionnaire-mapper";

const TRAITS: {
  id: ScentTraitId;
  label: string;
  low: string;
  high: string;
}[] = [
  {
    id: "sweetness",
    label: "شیرینی",
    low: "بدون شیرینی",
    high: "خیلی شیرین",
  },
  {
    id: "freshness",
    label: "تازگی",
    low: "تازگی کم",
    high: "خیلی تازه",
  },
  {
    id: "warmth",
    label: "گرمی",
    low: "خنک",
    high: "گرم",
  },
  {
    id: "bitterness",
    label: "تلخی",
    low: "بدون تلخی",
    high: "خیلی تلخ",
  },
  {
    id: "powdery",
    label: "پودری‌بودن",
    low: "غیرپودری",
    high: "خیلی پودری",
  },
  {
    id: "woody",
    label: "چوبی‌بودن",
    low: "غیرچوبی",
    high: "خیلی چوبی",
  },
];

interface ScentTraitsStepProps {
  values: ScentTraits;
  onChange: (trait: ScentTraitId, value: number) => void;
}

export default function ScentTraitsStep({
  values,
  onChange,
}: ScentTraitsStepProps) {
  return (
    <div className="w-full space-y-5" dir="rtl">
      {TRAITS.map((trait) => {
        const value = values[trait.id];

        return (
          <div
            key={trait.id}
            className="rounded-2xl border border-white/15 bg-white/5 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium">{trait.label}</span>

              <span className="text-sm opacity-70">
                {value === undefined ? "انتخاب نشده" : `${value} از ۵`}
              </span>
            </div>

            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={value ?? 3}
              onChange={(event) =>
                onChange(trait.id, Number(event.target.value))
              }
              aria-label={trait.label}
              className="trait-slider w-full"
              dir="rtl"
            />

            <div className="mt-2 flex justify-between text-xs opacity-70">
              <span>{trait.low}</span>
              <span>{trait.high}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}