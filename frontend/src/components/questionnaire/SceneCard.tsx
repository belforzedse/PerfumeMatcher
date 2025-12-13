"use client";

import Image from "next/image";
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

/**
 * Minarets and points - rendered OUTSIDE button to not extend click area.
 */
function FrameDecorations({ selected }: { selected: boolean }) {
  const borderColor = selected
    ? "rgba(160, 140, 100, 1)"
    : "rgba(120, 105, 75, 0.85)";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-30">
      {/* Top center point */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderBottom: `8px solid ${borderColor}`,
        }}
      />

      {/* Bottom center point */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `8px solid ${borderColor}`,
        }}
      />

      {/* Minaret - Left */}
      <div className="absolute left-[10px] top-0 flex -translate-y-[100%] flex-col items-center">
        <div
          className="h-[5px] w-[5px] rounded-full"
          style={{ backgroundColor: borderColor, opacity: selected ? 1 : 0.7 }}
        />
        <div
          className="h-[3px] w-[2px]"
          style={{ backgroundColor: borderColor, opacity: selected ? 1 : 0.7 }}
        />
        <div
          className="h-[5px] w-[10px] rounded-t-full"
          style={{ backgroundColor: borderColor, opacity: selected ? 1 : 0.7 }}
        />
        <div
          className="h-[12px] w-[6px] rounded-b-sm"
          style={{ backgroundColor: borderColor, opacity: selected ? 1 : 0.7 }}
        />
      </div>

      {/* Minaret - Right */}
      <div className="absolute right-[10px] top-0 flex -translate-y-[100%] flex-col items-center">
        <div
          className="h-[5px] w-[5px] rounded-full"
          style={{ backgroundColor: borderColor, opacity: selected ? 1 : 0.7 }}
        />
        <div
          className="h-[3px] w-[2px]"
          style={{ backgroundColor: borderColor, opacity: selected ? 1 : 0.7 }}
        />
        <div
          className="h-[5px] w-[10px] rounded-t-full"
          style={{ backgroundColor: borderColor, opacity: selected ? 1 : 0.7 }}
        />
        <div
          className="h-[12px] w-[6px] rounded-b-sm"
          style={{ backgroundColor: borderColor, opacity: selected ? 1 : 0.7 }}
        />
      </div>
    </div>
  );
}

/**
 * Frame borders only - inside button, no overflow elements.
 */
function FrameBorders({ selected }: { selected: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Outer frame border */}
      <div
        className={cn(
          "absolute inset-[3px] rounded-[20px] border-2",
          selected
            ? "border-[rgba(160,140,100,1)]"
            : "border-[rgba(120,105,75,0.6)]"
        )}
      />

      {/* Inner decorative border */}
      <div
        className={cn(
          "absolute inset-[9px] rounded-[16px] border",
          selected
            ? "border-[rgba(160,140,100,0.35)]"
            : "border-[rgba(120,105,75,0.2)]"
        )}
      />

      {/* Corner ornaments */}
      <div
        className={cn(
          "absolute left-[6px] top-[6px] h-4 w-4 rounded-tl-[14px] border-l-2 border-t-2",
          selected
            ? "border-[rgba(180,160,120,1)]"
            : "border-[rgba(140,120,90,0.6)]"
        )}
      />
      <div
        className={cn(
          "absolute right-[6px] top-[6px] h-4 w-4 rounded-tr-[14px] border-r-2 border-t-2",
          selected
            ? "border-[rgba(180,160,120,1)]"
            : "border-[rgba(140,120,90,0.6)]"
        )}
      />
      <div
        className={cn(
          "absolute bottom-[6px] left-[6px] h-4 w-4 rounded-bl-[14px] border-b-2 border-l-2",
          selected
            ? "border-[rgba(180,160,120,1)]"
            : "border-[rgba(140,120,90,0.6)]"
        )}
      />
      <div
        className={cn(
          "absolute bottom-[6px] right-[6px] h-4 w-4 rounded-br-[14px] border-b-2 border-r-2",
          selected
            ? "border-[rgba(180,160,120,1)]"
            : "border-[rgba(140,120,90,0.6)]"
        )}
      />
    </div>
  );
}

export default function SceneCard({
  scenes,
  selected,
  maxSelections,
  onToggle,
}: SceneCardProps) {
  const useImageCards = useViewportHeight(600);

  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.12,
    staggerChildren: 0.06,
  });

  const itemVariants = useFadeScaleVariants({
    y: 18,
    scale: 0.96,
    blur: 10,
  });

  const gridClass = useImageCards
    ? "grid grid-cols-2 sm:grid-cols-3 w-full gap-4 sm:gap-5"
    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 w-full gap-3 sm:gap-4";

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
          <motion.div
            key={scene.id}
            variants={itemVariants}
            className={cn(
              "relative",
              useImageCards && "pt-[25px] pb-[4px]" // Space for minarets top, point bottom
            )}
          >
            {/* Decorations OUTSIDE the button */}
            {useImageCards && <FrameDecorations selected={isSelected} />}

            <motion.button
              type="button"
              onClick={() => !disabled && onToggle(scene.id)}
              disabled={disabled}
              className={cn(
                "group relative w-full overflow-hidden text-right",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2",
                disabled
                  ? "cursor-not-allowed opacity-55"
                  : "tap-highlight touch-target touch-feedback",
                useImageCards
                  ? [
                      "rounded-[20px]",
                      "min-h-[220px] sm:min-h-[260px]",
                      "aspect-[3/4]",
                      "transition-transform duration-200 hover:scale-[1.01]",
                    ]
                  : [
                      "glass-card backdrop-blur-xl glass-button-gradient-border",
                      "rounded-2xl p-4 sm:p-5",
                      "min-h-[120px] sm:min-h-[150px]",
                      "border border-[var(--color-border)]",
                      "transition-transform duration-200 hover:scale-[1.02] hover:shadow-soft",
                      isSelected &&
                        "border-2 border-[var(--color-accent)] bg-gradient-to-br from-white/90 to-[var(--color-accent-soft)]/40 shadow-strong",
                    ]
              )}
            >
              {useImageCards ? (
                <>
                  {/* Image layer */}
                  {imageUrl && (
                    <Image
                      src={imageUrl}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className={cn(
                        "object-cover rounded-[20px]",
                        !isSelected && "grayscale",
                        "transition-[filter] duration-300",
                        !isSelected && "group-hover:grayscale-0"
                      )}
                      loading="lazy"
                      unoptimized
                    />
                  )}

                  {/* Bottom gradient */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[20px] bg-gradient-to-t from-black/85 via-black/30 to-black/0"
                  />

                  {/* Frame borders (inside button - no overflow) */}
                  <FrameBorders selected={isSelected} />

                  {/* Selected badge */}
                  {isSelected && (
                    <span className="absolute left-4 top-4 z-30 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20">
                      انتخاب شده
                    </span>
                  )}

                  {/* Content */}
                  <div className="relative z-10 flex h-full flex-col px-5 pb-6 pt-5 sm:px-6 sm:pb-7">
                    {scene.icon && (
                      <div className="flex justify-center">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black/30 ring-1 ring-white/20">
                          <Icon emoji={scene.icon} size={24} />
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
                </>
              ) : (
                /* Non-image card fallback */
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
          </motion.div>
        );
      })}
    </motion.div>
  );
}
