"use client";

import { useMemo, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { useFadeScaleVariants, useStaggeredListVariants } from "@/lib/motion";
import type { SceneChoice } from "@/lib/questionnaire-mapper";
import { Icon } from "@/lib/icons";
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { FaCheck } from "react-icons/fa";
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

// Color mapping for scene icons (applied to the *badge* tint, not the emoji itself)
const SCENE_ICON_COLORS: Record<string, string> = {
  "morning-cafe": "#927869", // Coffee brown
  "evening-party": "#0C317A", // Deep indigo
  "nature-walk": "#06402B", // Forest green
  "cozy-home": "#B78F7A", // Warm clay
  "romantic-dinner": "#660033", // Deep rose
  "beach-day": "#0EA5E9", // Sky blue
  "winter-night": "#93C5FD", // Cool blue
  "gift-occasion": "#F88379", // Soft pink
};

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

        const tintHex = SCENE_ICON_COLORS[scene.id];
        const tintBg = tintHex
          ? hexToRgba(tintHex, 0.18)
          : "rgba(255,255,255,0.14)";
        const tintRing = tintHex
          ? hexToRgba(tintHex, 0.4)
          : "rgba(255,255,255,0.20)";
        const tintGlow = tintHex
          ? `0 16px 42px ${hexToRgba(tintHex, 0.16)}`
          : undefined;

        const iconBadgeStyle: CSSProperties | undefined = !isSelected
          ? ({
              backgroundColor: tintBg,
              boxShadow: tintGlow,
              ["--tw-ring-color" as unknown as keyof CSSProperties]: tintRing,
            } as unknown as CSSProperties)
          : undefined;

        return (
          <motion.button
            key={scene.id}
            type="button"
            onClick={() => !disabled && onToggle(scene.id)}
            disabled={disabled}
            variants={itemVariants}
            whileHover={
              !disabled
                ? { y: -4, scale: isSelected ? 1.02 : 1.015 }
                : undefined
            }
            whileTap={!disabled ? { scale: 0.99, y: -1 } : undefined}
            className={cn(
              "group relative text-right transition-all duration-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]",
              disabled
                ? "cursor-not-allowed opacity-55"
                : "tap-highlight touch-target touch-feedback",
              useImageCards
                ? [
                    "rounded-[1.5rem]",
                    // allow shadows/glows to render outside the border
                    "overflow-hidden",
                    "min-h-[220px] sm:min-h-[260px]",
                    "aspect-[3/4]",
                    isSelected
                      ? "scene-card-gradient-border-gold"
                      : "scene-card-gradient-border-silver",
                    isSelected
                      ? "shadow-[0_26px_90px_rgba(0,0,0,0.32),0_18px_60px_rgba(212,175,55,0.20)]"
                      : "shadow-[0_20px_60px_rgba(0,0,0,0.18)]",
                    "after:content-[''] after:pointer-events-none after:absolute after:inset-[4px] after:rounded-[1.25rem] after:ring-1 after:ring-white/10",
                    isSelected && "after:ring-[rgba(255,255,255,0.22)]",
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
                      scale: isSelected ? 1.14 : 1.02,
                    }}
                    transition={{
                      duration: 2.2,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover",
                      "brightness-[0.94] contrast-[1.06]",
                      isSelected &&
                        "saturate-[1.15] contrast-[1.10] brightness-[0.98]",
                      !isSelected && "grayscale",
                      "transition-[filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      !isSelected &&
                        "group-hover:grayscale-0 group-hover:saturate-[1.08]"
                    )}
                    loading="lazy"
                  />
                )}

                {/* Selected “premium glow” (very subtle) */}
                {isSelected && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-0",
                      "bg-[radial-gradient(900px_circle_at_50%_0%,rgba(212,175,55,0.22),transparent_55%)]",
                      "opacity-90"
                    )}
                  />
                )}

                {/* Bottom gradient ONLY */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0",
                    isSelected
                      ? "bg-gradient-to-t from-black/90 via-black/34 to-black/0"
                      : "bg-gradient-to-t from-black/85 via-black/30 to-black/0",
                    "transition-opacity duration-500",
                    isSelected ? "opacity-100" : "opacity-[0.92]"
                  )}
                />

                {/* Selected badge */}
                {isSelected && (
                  <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md ring-1 ring-white/18 shadow-[0_10px_26px_rgba(0,0,0,0.35)]">
                    <FaCheck />
                  </span>
                )}

                {/* Content */}
                <div className="relative z-10 flex h-full flex-col px-5 pb-6 pt-5 sm:px-6 sm:pb-7">
                  {scene.icon && (
                    <div className="flex justify-center">
                      <span
                        className={cn(
                          "relative inline-flex h-12 w-12 items-center justify-center rounded-2xl backdrop-blur-md ring-1",
                          "transition-all duration-300",
                          isSelected
                            ? "bg-[rgba(212,175,55,0.16)] ring-[rgba(212,175,55,0.35)] shadow-[0_10px_30px_rgba(212,175,55,0.14)]"
                            : "bg-white/14 ring-white/20"
                        )}
                        style={iconBadgeStyle}
                      >
                        {/* glossy highlight */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(60%_55%_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]"
                        />

                        {/* Icon color */}
                        <span
                          className={cn(
                            "relative transition-colors duration-300",
                            // Selected => gold icon
                            isSelected
                              ? "text-[var(--accent)] drop-shadow-[0_10px_22px_rgba(212,175,55,0.22)]"
                              : "text-white/90"
                          )}
                          style={
                            !isSelected && SCENE_ICON_COLORS[scene.id]
                              ? ({
                                  color: SCENE_ICON_COLORS[scene.id],
                                } as React.CSSProperties)
                              : undefined
                          }
                        >
                          <Icon emoji={scene.icon} size={26} />
                        </span>
                      </span>
                    </div>
                  )}

                  <div className="mt-auto space-y-1.5 text-center">
                    <h3
                      className={cn(
                        "m-0 text-lg font-semibold leading-snug sm:text-xl font-rokh",
                        "drop-shadow-[0_2px_16px_rgba(0,0,0,0.60)]",
                        isSelected
                          ? "bg-[linear-gradient(90deg,#fff7d6_0%,#d4af37_45%,#b88100_100%)] bg-clip-text text-transparent"
                          : "text-white/90"
                      )}
                    >
                      {scene.label}
                    </h3>

                    {/* divider */}
                    <div
                      className={cn(
                        "mx-auto mt-1 h-[2px] w-12 rounded-full",
                        isSelected
                          ? "bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.90),transparent)]"
                          : "bg-white/25"
                      )}
                    />

                    {scene.description && (
                      <p
                        className={cn(
                          "m-0 text-xs leading-relaxed sm:text-sm drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]",
                          isSelected
                            ? "bg-[linear-gradient(90deg,#f7f7f6_0%,#dedad0_50%,#cec7bb_100%)] bg-clip-text text-transparent"
                            : "text-white/65"
                        )}
                      >
                        {scene.description}
                      </p>
                    )}
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
