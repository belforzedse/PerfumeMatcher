"use client";

import { motion, type Variants } from "framer-motion";
import { useFadeScaleVariants } from "@/lib/motion";
import type { VibePair } from "@/lib/questionnaire-mapper";
import { Icon } from "@/lib/icons";
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface PairwiseChoiceProps {
  pair: VibePair;
  selected: string | null;
  onSelect: (choice: "left" | "right" | "none") => void;
  showNotSure?: boolean;
}

export default function PairwiseChoice({
  pair,
  selected,
  onSelect,
  showNotSure = true,
}: PairwiseChoiceProps) {
  const isKiosk = useKioskMode();

  const itemVariants = useFadeScaleVariants({
    y: isKiosk ? 18 : 16,
    scale: 0.965,
    blur: 8,
  }) as Variants;

  const baseCard = cn(
    "glass-card backdrop-blur-xl glass-button-gradient-border group relative",
    "flex flex-col items-center justify-center text-center",
    "rounded-3xl transition-all duration-500",
    "tap-highlight touch-target touch-feedback",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]"
  );

  const selectedTone =
    "border-2 border-[var(--color-accent)] bg-gradient-to-br from-white/95 via-[var(--color-accent-soft)]/26 to-white/95 shadow-strong";

  const idleTone =
    "border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 hover:shadow-soft";

  const kioskCardSize =
    "h-full min-h-[420px] lg:min-h-[480px] 2xl:min-h-[520px] gap-8 p-12";
  const normalCardSize = "min-h-[180px] sm:min-h-[200px] gap-4 p-8";

  const iconSize = isKiosk ? 112 : 64;

  function ChoiceCard({ side }: { side: "left" | "right" }) {
    const isSelected = selected === side;
    const data = side === "left" ? pair.left : pair.right;

    return (
      <motion.button
        type="button"
        onClick={() => onSelect(side)}
        variants={itemVariants}
        whileHover={{ y: -4, scale: isSelected ? 1.02 : 1.015 }}
        whileTap={{ scale: 0.99, y: -1 }}
        className={cn(
          baseCard,
          isKiosk ? kioskCardSize : normalCardSize,
          isSelected
            ? cn(selectedTone, "z-10 scale-[1.02]")
            : cn(idleTone, "hover:scale-[1.01]")
        )}
      >
        {/* Selected overlay */}
        {isSelected && (
          <motion.div
            layoutId="pairwise-selection"
            className="pointer-events-none absolute inset-0 rounded-3xl bg-[var(--color-accent)]/10"
            initial={false}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          />
        )}

        {/* kiosk-only premium glow */}
        {isKiosk && isSelected && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(900px_circle_at_50%_0%,rgba(212,175,55,0.24),transparent_55%)]"
          />
        )}

        <div className="relative z-10 flex flex-col items-center gap-4">
          {data.icon && (
            <motion.span
              animate={
                isSelected
                  ? {
                      scale: [1, 1.14, 1],
                      rotate: side === "left" ? [0, 5, -5, 0] : [0, -5, 5, 0],
                    }
                  : {}
              }
              transition={{ duration: 0.6 }}
            >
              <Icon emoji={data.icon} size={iconSize} />
            </motion.span>
          )}

          <h3
            className={cn(
              "m-0 font-semibold leading-tight",
              isKiosk ? "text-3xl" : "text-xl sm:text-2xl",
              isKiosk && isSelected
                ? "bg-[linear-gradient(90deg,#f6f1e3_0%,#d6c98d_50%,#bda96a_100%)] bg-clip-text text-transparent"
                : "text-[var(--color-foreground)]"
            )}
          >
            {data.label}
          </h3>

          {/* subtle helper line (fills space + feels kiosk-friendly) */}
          <p
            className={cn(
              "m-0 text-muted",
              isKiosk ? "text-sm" : "text-xs sm:text-sm"
            )}
          >
            برای انتخاب، لمس کنید
          </p>

          {isSelected && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "glass-chip glass-chip--compact glass-chip--accent font-semibold",
                isKiosk ? "text-sm px-4 py-2" : "text-xs"
              )}
            >
              ✓ {data.label} انتخاب شد
            </motion.div>
          )}
        </div>
      </motion.button>
    );
  }

  function NotSureCard({
    className,
    hidden = false,
  }: {
    className?: string;
    hidden?: boolean;
  }) {
    if (!showNotSure || hidden) return null;
    const isSelected = selected === "none";

    return (
      <motion.button
        type="button"
        onClick={() => onSelect("none")}
        variants={itemVariants}
        whileHover={{ y: -2, scale: isSelected ? 1.01 : 1.008 }}
        whileTap={{ scale: 0.995 }}
        className={cn(
          baseCard,
          // make it match the two big cards in kiosk
          isKiosk
            ? kioskCardSize
            : "mx-auto w-full max-w-md rounded-2xl px-6 py-4",
          // style
          isSelected
            ? "border-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)]/22 shadow-soft"
            : "border border-[var(--color-border)] hover:bg-white/10",
          // dashed feel (kiosk request vibe)
          isKiosk && "border-dashed",
          className
        )}
      >
        <div className="relative z-10 flex flex-col items-center gap-3">
          <span
            className={cn(
              "font-semibold text-[var(--color-foreground)]",
              isKiosk ? "text-xl" : "text-sm sm:text-base"
            )}
          >
            ترجیح نمی‌دهم
          </span>

          <p className={cn("m-0 text-muted", isKiosk ? "text-sm" : "text-xs")}>
            می‌توانید این مرحله را رد کنید
          </p>

          {isSelected && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "glass-chip glass-chip--compact glass-chip--accent font-semibold",
                isKiosk ? "text-sm px-4 py-2" : "text-xs"
              )}
            >
              ✓ رد شد
            </motion.div>
          )}
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      className={cn(
        "relative",
        // ✅ kiosk: fill available space
        isKiosk ? "h-full min-h-0 flex flex-col gap-8" : "flex flex-col gap-6"
      )}
      initial="hidden"
      animate="show"
    >
      {/* subtle kiosk backdrop to avoid “empty white” feeling */}
      {isKiosk && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-70 bg-[radial-gradient(1000px_circle_at_50%_0%,rgba(212,175,55,0.10),transparent_60%)]"
        />
      )}

      {/* ✅ Kiosk: vertically center the cards and let them grow */}
      <div className={cn(isKiosk ? "flex-1 min-h-0 flex items-center" : "")}>
        <div
          className={cn(
            "w-full",
            isKiosk
              ? "grid grid-cols-3 items-stretch gap-8"
              : "relative flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-6"
          )}
        >
          <ChoiceCard side="left" />

          {/* kiosk center card */}
          {isKiosk ? <NotSureCard /> : null}

          {/* mobile in-between (non-kiosk) */}
          {!isKiosk ? <NotSureCard className="sm:hidden" /> : null}

          <ChoiceCard side="right" />
        </div>
      </div>

      {/* desktop below (non-kiosk) */}
      {!isKiosk ? <NotSureCard className="hidden sm:block" /> : null}

      {/* Footer hint */}
      <div
        className={cn(
          "flex items-center justify-center gap-2 text-muted",
          isKiosk ? "text-sm" : "text-xs sm:text-sm"
        )}
      >
        <span>یکی را انتخاب کنید</span>
        <span>•</span>
        <span>یا رد کنید</span>
      </div>
    </motion.div>
  );
}
