"use client";

import { useMemo, useState } from "react";
import Slider from "rc-slider";
import { motion } from "framer-motion";
import type { IntensityChoice } from "@/lib/questionnaire-mapper";
import { Icon } from "@/lib/icons";

interface IntensityControlProps {
  intensities: IntensityChoice[];
  selected: string | null;
  onSelect: (intensityId: string) => void;
}

const ORDER = ["whisper", "noticeable", "make-entrance"] as const;

export default function IntensityControl({
  intensities,
  selected,
  onSelect,
}: IntensityControlProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const sortedIntensities = useMemo(() => {
    return [...intensities].sort((a, b) => {
      const ai = ORDER.indexOf(a.id as (typeof ORDER)[number]);
      const bi = ORDER.indexOf(b.id as (typeof ORDER)[number]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [intensities]);

  const isRtl = useMemo(() => {
    if (typeof window === "undefined") return false;
    const dir = document.documentElement.getAttribute("dir");
    if (dir) return dir.toLowerCase() === "rtl";
    return getComputedStyle(document.documentElement).direction === "rtl";
  }, []);

  const selectedIndex = useMemo(
    () => sortedIntensities.findIndex((i) => i.id === selected),
    [sortedIntensities, selected]
  );

  const max = Math.max(0, sortedIntensities.length - 1);
  const baseIndex = selectedIndex >= 0 ? selectedIndex : Math.min(1, max);

  // Slider is LTR visually; in RTL we invert meaning so "left" = stronger (or whatever your visual order implies)
  const sliderValue = isRtl ? max - baseIndex : baseIndex;

  const handleSliderChange = (value: number | number[]) => {
    const raw = Array.isArray(value) ? value[0] : value;
    const mappedIndex = isRtl ? max - raw : raw;
    const item = sortedIntensities[mappedIndex];
    if (item) onSelect(item.id);
  };

  const selectedItem =
    selectedIndex >= 0 ? sortedIntensities[selectedIndex] : null;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="glass-card backdrop-blur-xl glass-button-gradient-border relative w-full rounded-3xl p-6 sm:p-8">
        {/* Options (NO background cards) */}
        <div className="relative mb-8 flex w-full items-center justify-between gap-2 sm:gap-6">
          {sortedIntensities.map((intensity, index) => {
            const isSelected = selected === intensity.id;
            const isHovered = hoveredIndex === index;

            return (
              <button
                key={intensity.id}
                type="button"
                onClick={() => onSelect(intensity.id)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={[
                  "relative z-10 flex flex-1 flex-col items-center gap-2 rounded-2xl px-2 py-3",
                  "transition-all duration-300",
                  "tap-highlight touch-target touch-feedback",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]",

                  // ✅ force transparent (kills any inherited “card” feel)
                  "!bg-transparent !shadow-none",

                  // selection is border-only
                  isSelected
                    ? "border border-[var(--color-accent)]/60"
                    : "border border-transparent",

                  // minimal hover feedback without filling the card
                  !isSelected && isHovered ? "opacity-95" : "opacity-100",

                  isSelected
                    ? "scale-[1.02]"
                    : isHovered
                    ? "scale-[1.01]"
                    : "scale-100",
                ].join(" ")}
              >
                {/* Icon glow / light-up (no bubble, no bg) */}
                {intensity.icon && (
                  <span className="relative">
                    {isSelected && (
                      <span className="absolute -inset-6 rounded-full bg-[var(--color-accent)]/16 blur-2xl" />
                    )}
                    <span
                      className={[
                        "relative block transition-all duration-300",
                        isSelected
                          ? "text-[var(--color-accent)] drop-shadow-lg"
                          : "text-[var(--color-foreground)]/85",
                      ].join(" ")}
                    >
                      <Icon emoji={intensity.icon} size={54} />
                    </span>
                  </span>
                )}

                <span
                  className={[
                    "text-sm font-semibold transition-colors duration-300 sm:text-base",
                    isSelected ? "text-[var(--color-accent)]" : "text-muted",
                  ].join(" ")}
                >
                  {intensity.label}
                </span>

                {intensity.description && (
                  <span className="text-[10px] text-muted sm:text-xs">
                    {intensity.description}
                  </span>
                )}

                {isSelected && (
                  <motion.div
                    layoutId="intensity-indicator"
                    className="absolute -bottom-2 h-1 w-12 rounded-full bg-[var(--color-accent)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Slider */}
        <div className="px-2">
          {/* Keep slider DOM LTR; meaning is controlled by sliderValue/mappedIndex */}
          <div dir="ltr">
            <Slider
              min={0}
              max={max}
              step={1}
              value={sliderValue}
              onChange={handleSliderChange}
              trackStyle={{ backgroundColor: "var(--color-accent)", height: 6 }}
              handleStyle={{
                borderColor: "var(--color-accent)",
                backgroundColor: "white",
                width: 26,
                height: 26,
                marginTop: -10,
                boxShadow: "0 8px 20px rgba(0,0,0,0.16)",
              }}
              railStyle={{
                backgroundColor: "rgba(255,255,255,0.18)",
                height: 6,
              }}
              dotStyle={{ display: "none" }}
            />
          </div>
        </div>
      </div>

      {/* Selected pill with description */}
      {selectedItem && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="glass-surface backdrop-blur-xl glass-gradient-border flex w-full flex-col items-center gap-2 rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            {selectedItem.icon && (
              <motion.span
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.6 }}
                className="text-[var(--color-accent)]"
              >
                <Icon emoji={selectedItem.icon} size={24} />
              </motion.span>
            )}
            <span className="text-sm font-semibold text-[var(--color-foreground)] sm:text-base">
              ✓ {selectedItem.label} انتخاب شد
            </span>
          </div>
          {selectedItem.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="m-0 text-xs text-muted text-center"
            >
              {selectedItem.description}
            </motion.p>
          )}
        </motion.div>
      )}
    </div>
  );
}
