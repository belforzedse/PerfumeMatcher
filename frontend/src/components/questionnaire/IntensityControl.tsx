"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Slider from "rc-slider";
import { motion } from "framer-motion";
import type { IntensityChoice } from "@/lib/questionnaire-mapper";
import { Icon } from "@/lib/icons";
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";

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
  const isKiosk = useKioskMode();

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

  // Slider is LTR visually; in RTL we invert meaning
  const sliderValue = isRtl ? max - baseIndex : baseIndex;

  const handleSliderChange = (value: number | number[]) => {
    const raw = Array.isArray(value) ? value[0] : value;
    const mappedIndex = isRtl ? max - raw : raw;
    const item = sortedIntensities[mappedIndex];
    if (item) onSelect(item.id);
  };

  const selectedItem =
    selectedIndex >= 0 ? sortedIntensities[selectedIndex] : null;

  // Kiosk sizing tokens
  const cardPadding = isKiosk ? "p-10" : "p-6 sm:p-8";
  const iconSize = isKiosk ? 72 : 54;
  const optionMinH = isKiosk ? "min-h-[170px]" : "min-h-[80px]";
  const optionGap = isKiosk ? "gap-4 py-6" : "gap-2 py-3";
  const sliderH = isKiosk ? 10 : 6;

  const handleStyle: CSSProperties = {
    borderColor: "var(--color-accent)",
    backgroundColor: "white",
    width: isKiosk ? 56 : 26,
    height: isKiosk ? 56 : 26,
    marginTop: isKiosk ? -26 : -10,
    boxShadow: isKiosk
      ? "0 14px 36px rgba(0,0,0,0.18)"
      : "0 8px 20px rgba(0,0,0,0.16)",
    borderWidth: isKiosk ? 3 : 2,
  };

  return (
    <div
      className={cn(
        "w-full",
        // Fill the available space in kiosk panels so we don't leave a giant blank area
        isKiosk ? "mx-auto flex h-full max-w-6xl flex-col" : "flex flex-col gap-6"
      )}
    >
      <div
        className={cn(
          "glass-card backdrop-blur-xl glass-button-gradient-border relative w-full rounded-3xl",
          cardPadding,
          // Use space better in kiosk
          isKiosk && "flex flex-1 flex-col"
        )}
      >
        {/* Optional: subtle top sheen for kiosk (adds depth so the big card doesn't look empty) */}
        {isKiosk && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(1200px_circle_at_50%_-10%,rgba(255,255,255,0.22),transparent_55%)]"
          />
        )}

        {/* Options + Selected preview (kiosk fills space) */}
        <div className={cn(isKiosk ? "relative z-10 flex flex-1 flex-col" : "relative z-10")}>
          {/* Options */}
          <div
            className={cn(
              "relative flex w-full items-stretch justify-between",
              isKiosk ? "mb-10 gap-8" : "mb-8 gap-2 sm:gap-6"
            )}
          >
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
                  className={cn(
                    "relative z-10 flex flex-1 flex-col items-center rounded-2xl px-2",
                    "transition-all duration-300",
                    "tap-highlight touch-target touch-feedback",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]",
                    // Keep it clean (no “card” inside card)
                    "!bg-transparent !shadow-none",
                    // BUT in kiosk we add a faint outline so the space feels filled and tappable
                    !isSelected && isKiosk && "border border-black/5",
                    isSelected
                      ? "border border-[var(--color-accent)]/60"
                      : "border border-transparent",
                    !isSelected && isHovered ? "opacity-95" : "opacity-100",
                    isSelected ? "scale-[1.03]" : isHovered ? "scale-[1.01]" : "scale-100",
                    optionMinH,
                    optionGap
                  )}
                >
                  {/* Icon */}
                  {intensity.icon && (
                    <span className="relative">
                      {isSelected && (
                        <span className="absolute -inset-8 rounded-full bg-[var(--color-accent)]/16 blur-2xl" />
                      )}
                      <span
                        className={cn(
                          "relative block transition-all duration-300",
                          isSelected
                            ? "text-[var(--color-accent)] drop-shadow-[0_14px_30px_rgba(212,175,55,0.22)]"
                            : "text-[var(--color-foreground)]/85"
                        )}
                      >
                        <Icon emoji={intensity.icon} size={iconSize} />
                      </span>
                    </span>
                  )}

                  <span
                    className={cn(
                      "font-semibold transition-colors duration-300",
                      isKiosk ? "text-lg" : "text-sm sm:text-base",
                      isSelected ? "text-[var(--color-accent)]" : "text-muted"
                    )}
                  >
                    {intensity.label}
                  </span>

                  {intensity.description && (
                    <span
                      className={cn(
                        "text-center text-muted",
                        isKiosk ? "text-sm" : "text-[10px] sm:text-xs"
                      )}
                    >
                      {intensity.description}
                    </span>
                  )}

                  {isSelected && (
                    <motion.div
                      layoutId="intensity-indicator"
                      className={cn(
                        "absolute -bottom-2 h-1 rounded-full bg-[var(--color-accent)]",
                        isKiosk ? "w-16" : "w-12"
                      )}
                      initial={false}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected preview (inside card, fills space in kiosk) */}
          <div className={cn(isKiosk ? "mb-10" : "mb-6")}>
            {selectedItem ? (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "glass-surface backdrop-blur-xl glass-gradient-border mx-auto flex w-full items-center justify-between rounded-2xl",
                  isKiosk ? "px-8 py-6" : "px-5 py-4"
                )}
              >
                <div className="flex items-center gap-4">
                  {selectedItem.icon && (
                    <motion.span
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 0.5 }}
                      className="text-[var(--color-accent)]"
                    >
                      <Icon emoji={selectedItem.icon} size={isKiosk ? 34 : 24} />
                    </motion.span>
                  )}

                  <div className="text-right">
                    <div
                      className={cn(
                        "font-semibold text-[var(--color-foreground)]",
                        isKiosk ? "text-lg" : "text-sm sm:text-base"
                      )}
                    >
                      ✓ {selectedItem.label} انتخاب شد
                    </div>
                    {selectedItem.description && (
                      <div className={cn("text-muted", isKiosk ? "text-sm" : "text-xs")}>
                        {selectedItem.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* little hint to use slider too */}
                {isKiosk && (
                  <div className="text-sm text-muted">
                    با اسلایدر هم می‌توانید تغییر دهید
                  </div>
                )}
              </motion.div>
            ) : (
              isKiosk && (
                <div className="mx-auto w-full rounded-2xl border border-black/5 bg-white/5 px-8 py-6 text-center text-sm text-muted">
                  یکی از گزینه‌ها را انتخاب کنید.
                </div>
              )
            )}
          </div>

          {/* Slider (anchored lower in kiosk) */}
          <div className={cn("px-2", isKiosk ? "mt-auto" : "")}>
            <div dir="ltr">
              <Slider
                min={0}
                max={max}
                step={1}
                value={sliderValue}
                onChange={handleSliderChange}
                trackStyle={{
                  backgroundColor: "var(--color-accent)",
                  height: sliderH,
                }}
                handleStyle={handleStyle}
                railStyle={{
                  backgroundColor: "rgba(255,255,255,0.18)",
                  height: sliderH,
                }}
                dotStyle={{ display: "none" }}
              />
            </div>

            {/* Slider endpoints (adds structure so space feels intentional) */}
            <div
              className={cn(
                "mt-4 flex items-center justify-between text-muted",
                isKiosk ? "text-sm" : "text-[11px]"
              )}
            >
              <span>{sortedIntensities[0]?.label ?? ""}</span>
              <span>{sortedIntensities[max]?.label ?? ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Non-kiosk: keep the old separate pill (optional) */}
      {!isKiosk && selectedItem && (
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
