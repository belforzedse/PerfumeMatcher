"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useFadeScaleVariants, useStaggeredListVariants } from "@/lib/motion";
import type { SceneChoice } from "@/lib/questionnaire-mapper";
import { Icon } from "@/lib/icons";
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface SceneCardProps {
  scenes: SceneChoice[];
  selected: string[];
  maxSelections: number;
  onToggle: (sceneId: string) => void;
}

// TEMP placeholders only (no URL params / grayscale params).
// Replace these with your own uploaded images later.
const SCENE_IMAGES: Record<string, string> = {
  "morning-cafe": "https://picsum.photos/seed/morning-cafe/900/1400.webp",
  "evening-party": "https://picsum.photos/seed/evening-party/900/1400.webp",
  "nature-walk": "https://picsum.photos/seed/nature-walk/900/1400.webp",
  "cozy-home": "https://picsum.photos/seed/cozy-home/900/1400.webp",
  "romantic-dinner": "https://picsum.photos/seed/romantic-dinner/900/1400.webp",
  "beach-day": "https://picsum.photos/seed/beach-day/900/1400.webp",
  "winter-night": "https://picsum.photos/seed/winter-night/900/1400.webp",
  "gift-occasion": "https://picsum.photos/seed/gift-occasion/900/1400.webp",
};

export default function SceneCard({
  scenes,
  selected,
  maxSelections,
  onToggle,
}: SceneCardProps) {
  // Show image-cards only on kiosk displays (height >= 1024px and portrait orientation)
  const useImageCards = useKioskMode();

  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.12,
    staggerChildren: 0.06,
  });

  const itemVariants = useFadeScaleVariants({
    y: 18,
    scale: 0.96,
    blur: 10,
  });

  const gridClass = useMemo(() => {
    if (useImageCards) {
      return "grid grid-cols-2 sm:grid-cols-3 w-full gap-4 sm:gap-5";
    }
    return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 w-full gap-3 sm:gap-4";
  }, [useImageCards]);

  return (
    <motion.div
      className={gridClass}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {scenes.map((scene) => {
        const isSelected = selected.includes(scene.id);
        const disabled = !isSelected && selected.length >= maxSelections;

        const imageUrl = useImageCards ? SCENE_IMAGES[scene.id] : null;

        return (
          <motion.button
            key={scene.id}
            type="button"
            onClick={() => !disabled && onToggle(scene.id)}
            disabled={disabled}
            variants={itemVariants}
            className={cn(
              "group relative overflow-hidden text-right transition-all duration-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]",
              disabled
                ? "cursor-not-allowed opacity-55"
                : "tap-highlight touch-target touch-feedback",
              useImageCards
                ? [
                    "min-h-[220px] sm:min-h-[260px]",
                    "aspect-[3/4]",
                    isSelected
                      ? "scene-card-gradient-border-gold shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                      : "scene-card-gradient-border-silver shadow-[0_20px_60px_rgba(0,0,0,0.18)]",
                    "hover:shadow-[0_28px_80px_rgba(0,0,0,0.22)]",
                    "hover:scale-[1.01]",
                    "transition-all duration-300",
                  ]
                : [
                    "glass-card backdrop-blur-xl glass-button-gradient-border",
                    "rounded-2xl p-4 sm:p-5",
                    "min-h-[120px] sm:min-h-[150px]",
                    "border border-[var(--color-border)]",
                    "hover:scale-[1.02] hover:shadow-soft",
                    isSelected &&
                      "border-2 border-[var(--color-accent)] bg-gradient-to-br from-white/90 to-[var(--color-accent-soft)]/40 shadow-strong",
                  ]
            )}
          >
            {useImageCards ? (
              <div className="scene-card-inner relative">
                {/* Image: grayscale ONLY when NOT selected (no URL params) */}
                {imageUrl && (
                  <motion.img
                    src={imageUrl}
                    alt=""
                    aria-hidden="true"
                    animate={{
                      scale: isSelected ? 1.15 : 1,
                    }}
                    transition={{
                      duration: 2.2,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover",
                      // Base cinematic tuning
                      "brightness-[0.95] contrast-[1.06]",
                      // ✅ grayscale only for unselected
                      !isSelected && "grayscale",
                      // smooth transitions for filter
                      "transition-[filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      // on hover, slightly restore color even if not selected (feels alive)
                      !isSelected && "group-hover:grayscale-0"
                    )}
                    loading="lazy"
                  />
                )}

                {/* Bottom gradient ONLY */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0",
                    "bg-gradient-to-t from-black/85 via-black/30 to-black/0",
                    "transition-opacity duration-500",
                    isSelected ? "opacity-100" : "opacity-[0.92]"
                  )}
                />

                {/* Selected badge */}
                {isSelected && (
                  <span className="absolute right-4 top-4 z-10 rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md ring-1 ring-white/20">
                    انتخاب شده
                  </span>
                )}

                {/* Content (lower into stronger gradient) */}
                <div className="relative z-10 flex h-full flex-col px-5 pb-6 pt-5 sm:px-6 sm:pb-7">
                  {scene.icon && (
                    <div className="flex justify-center">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14 backdrop-blur-md ring-1 ring-white/20">
                        <Icon emoji={scene.icon} size={26} />
                      </span>
                    </div>
                  )}

                  <div className="mt-auto space-y-1.5 text-center">
                    <h3 className="m-0 text-lg font-semibold leading-snug text-white sm:text-xl">
                      {scene.label}
                    </h3>

                    {scene.description && (
                      <p className="m-0 text-xs leading-relaxed text-white/80 sm:text-sm">
                        {scene.description}
                      </p>
                    )}

                    <div className="mx-auto mt-3 h-[2px] w-10 rounded-full bg-white/25" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-start justify-between gap-3">
                <div className="flex w-full items-start justify-between gap-2">
                  {scene.icon && (
                    <span className="flex h-10 w-10 items-center justify-center">
                      <Icon emoji={scene.icon} size={32} />
                    </span>
                  )}
                  {isSelected && (
                    <span className="glass-chip glass-chip--compact glass-chip--accent text-[10px] font-semibold sm:text-xs">
                      انتخاب شده
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3
                    className={cn(
                      "m-0 text-base font-semibold sm:text-lg",
                      isSelected
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-foreground)]"
                    )}
                  >
                    {scene.label}
                  </h3>
                  {scene.description && (
                    <p
                      className={cn(
                        "m-0 text-xs sm:text-sm",
                        isSelected
                          ? "text-[var(--color-foreground)]/90"
                          : "text-muted"
                      )}
                    >
                      {scene.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
