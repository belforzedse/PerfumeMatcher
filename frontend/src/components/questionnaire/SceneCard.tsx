"use client";

import { motion } from "framer-motion";
import { useFadeScaleVariants, useStaggeredListVariants } from "@/lib/motion";
import type { SceneChoice } from "@/lib/questionnaire-mapper";
import { Icon } from "@/lib/icons";
import { useViewportHeight } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface SceneCardProps {
  scenes: SceneChoice[];
  selected: string[];
  maxSelections: number;
  onToggle: (sceneId: string) => void;
}

/**
 * Placeholder images (picsum). Replace these with your own uploaded images later.
 * NOTE: we do NOT rely on Picsum params for grayscale etc — grayscale is done via CSS filters.
 */
const SCENE_IMAGES: Record<string, string> = {
  "morning-cafe": "https://picsum.photos/seed/morning-cafe/900/1200",
  "evening-party": "https://picsum.photos/seed/evening-party/900/1200",
  "nature-walk": "https://picsum.photos/seed/nature-walk/900/1200",
  "cozy-home": "https://picsum.photos/seed/cozy-home/900/1200",
  "romantic-dinner": "https://picsum.photos/seed/romantic-dinner/900/1200",
  "beach-day": "https://picsum.photos/seed/beach-day/900/1200",
  "winter-night": "https://picsum.photos/seed/winter-night/900/1200",
  "gift-occasion": "https://picsum.photos/seed/gift-occasion/900/1200",
};

function OrnateFrameOverlay({ selected }: { selected: boolean }) {
  // Ornate border that frames the card from outside
  const borderColor = selected 
    ? "rgba(255,255,255,0.9)" 
    : "rgba(255,255,255,0.65)";
  const innerColor = selected
    ? "rgba(255,255,255,0.4)"
    : "rgba(255,255,255,0.28)";
  
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      {/* Outer ornate border */}
      <path
        d="
          M3 8
          Q3 3 8 3
          H92
          Q97 3 97 8
          V132
          Q97 137 92 137
          H8
          Q3 137 3 132
          V8
          Z
        "
        stroke={borderColor}
        strokeWidth="2.5"
        fill="none"
      />

      {/* Inner decorative border */}
      <path
        d="
          M8 12
          Q8 8 12 8
          H88
          Q92 8 92 12
          V128
          Q92 132 88 132
          H12
          Q8 132 8 128
          V12
          Z
        "
        stroke={innerColor}
        strokeWidth="1.5"
        fill="none"
      />

      {/* Corner flourishes - top left */}
      <path
        d="M12 10 C8 10 8 14 8 18"
        stroke={borderColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Corner flourishes - top right */}
      <path
        d="M88 10 C92 10 92 14 92 18"
        stroke={borderColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Corner flourishes - bottom left */}
      <path
        d="M12 130 C8 130 8 126 8 122"
        stroke={borderColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Corner flourishes - bottom right */}
      <path
        d="M88 130 C92 130 92 126 92 122"
        stroke={borderColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Additional decorative elements */}
      <circle cx="50" cy="8" r="1.5" fill={borderColor} opacity="0.8" />
      <circle cx="50" cy="132" r="1.5" fill={borderColor} opacity="0.8" />
      <circle cx="8" cy="70" r="1.5" fill={borderColor} opacity="0.8" />
      <circle cx="92" cy="70" r="1.5" fill={borderColor} opacity="0.8" />
    </svg>
  );
}

export default function SceneCard({
  scenes,
  selected,
  maxSelections,
  onToggle,
}: SceneCardProps) {
  // Back to your original “kiosk height” gate (undo the testing threshold).
  const isKioskHeight = useViewportHeight(768);

  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.12,
    staggerChildren: 0.06,
  });

  const itemVariants = useFadeScaleVariants({
    y: 16,
    scale: 0.97,
    blur: 8,
  });

  return (
    <motion.div
      className={cn(
        "grid w-full gap-3 sm:gap-4",
        // Bigger, more “kiosk-filling” layout when tall enough
        isKioskHeight
          ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
      )}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {scenes.map((scene) => {
        const isSelected = selected.includes(scene.id);
        const disabled = !isSelected && selected.length >= maxSelections;

        const img = SCENE_IMAGES[scene.id];

        // In “non-kiosk height” mode you said you want it closer to the old style.
        // So we only do the big image cards when isKioskHeight is true.
        const useImageCard = Boolean(img) && isKioskHeight;

        return (
          <motion.div
            key={scene.id}
            variants={itemVariants}
            className={cn(
              "relative",
              useImageCard
                ? cn(
                    // Image card sizing with border wrapper - add padding for border
                    "aspect-[3/4] min-h-[190px] sm:min-h-[240px]",
                    "p-[3px]"
                  )
                : ""
            )}
          >
            {/* Ornate frame border - wraps the entire card from outside */}
            {useImageCard && (
              <OrnateFrameOverlay selected={isSelected} />
            )}

            <motion.button
              type="button"
              onClick={() => !disabled && onToggle(scene.id)}
              disabled={disabled}
              className={cn(
                "relative h-full w-full overflow-hidden text-right transition-all duration-300",
                "rounded-2xl sm:rounded-3xl",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]",
                disabled ? "opacity-45 cursor-not-allowed" : "hover:scale-[1.02]",
                useImageCard
                  ? cn(
                      // Image card - full size, border is outside wrapper
                      "shadow-soft hover:shadow-strong"
                    )
                  : cn(
                      // Old-ish glass fallback (compact)
                      "glass-card backdrop-blur-xl glass-button-gradient-border",
                      "min-h-[110px] sm:min-h-[140px]",
                      "p-4 sm:p-5",
                      isSelected
                        ? "border-2 border-[var(--color-accent)]/55 shadow-strong"
                        : "border border-[var(--color-border)] hover:shadow-soft"
                    )
              )}
            >
              {/* IMAGE MODE (kiosk height) */}
              {useImageCard ? (
                <>
                  {/* Background image - full size, border is outside wrapper */}
                  <img
                    src={img}
                    alt=""
                    className={cn(
                      "absolute inset-0 h-full w-full object-cover",
                      "transition-[filter,transform] duration-500",
                      // grayscale ONLY when NOT selected
                      !isSelected
                        ? "grayscale contrast-[1.05] brightness-[0.92]"
                        : "grayscale-0",
                      // subtle zoom on hover (but not when disabled)
                      !disabled && "group-hover:scale-[1.03]"
                    )}
                    draggable={false}
                  />

                  {/* Bottom gradient only (no extra color overlay, no gold) */}
                  <div
                    className={cn(
                      "absolute inset-0",
                      // stronger at bottom; lighter at top
                      "bg-gradient-to-t from-black/80 via-black/25 to-black/5"
                    )}
                    aria-hidden="true"
                  />

                {/* Selected indicator */}
                {isSelected && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pointer-events-none absolute left-4 top-4 z-30 rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md"
                  >
                    انتخاب شده
                  </motion.span>
                )}

                {/* Icon chip (top-right, subtle) */}
                {scene.icon && (
                  <div className="pointer-events-none absolute right-4 top-4 z-30">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/20">
                      <Icon
                        emoji={scene.icon}
                        size={20}
                        className="text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Content bottom (sit where gradient is strong) */}
                <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-5">
                  <h3 className="m-0 text-base font-semibold text-white sm:text-lg">
                    {scene.label}
                  </h3>

                  {scene.description && (
                    <p className="m-0 mt-1 text-xs text-white/80 sm:text-sm">
                      {scene.description}
                    </p>
                  )}

                  <div className="mt-3 h-[2px] w-10 rounded-full bg-white/40" />
                </div>

                {/* Click affordance */}
                <span className="pointer-events-none absolute inset-0 ring-1 ring-white/10" />
              </>
            ) : (
              /* FALLBACK MODE (old-ish) */
              <>
                <div className="flex items-start justify-between gap-3">
                  {scene.icon && (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/30">
                      <Icon emoji={scene.icon} size={22} />
                    </span>
                  )}
                  {isSelected && (
                    <span className="glass-chip glass-chip--compact glass-chip--accent text-[10px] font-semibold">
                      انتخاب شده
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1">
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
                    <p className="m-0 text-xs text-muted sm:text-sm">
                      {scene.description}
                    </p>
                  )}
                </div>
              </>
            )}
            </motion.button>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
