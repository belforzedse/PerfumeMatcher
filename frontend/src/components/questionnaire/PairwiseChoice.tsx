"use client";

import { motion } from "framer-motion";
import { useFadeScaleVariants } from "@/lib/motion";
import type { VibePair } from "@/lib/questionnaire-mapper";
import { Icon } from "@/lib/icons";

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
  const itemVariants = useFadeScaleVariants({
    y: 16,
    scale: 0.96,
    blur: 8,
  });

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial="hidden"
      animate="show"
    >
      <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        <motion.button
          onClick={() => onSelect("left")}
          variants={itemVariants}
          className={`glass-card backdrop-blur-xl glass-button-gradient-border group relative flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-3xl p-8 text-center transition-all duration-500 sm:min-h-[200px] ${
            selected === "left"
              ? "border-2 border-[var(--color-accent)] bg-gradient-to-br from-white/95 via-[var(--color-accent-soft)]/30 to-white/95 shadow-strong scale-[1.03] z-10"
              : "border border-[var(--color-border)] hover:scale-[1.02] hover:shadow-soft hover:border-[var(--color-accent)]/40"
          } tap-highlight touch-target touch-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]`}
        >
          {selected === "left" && (
            <motion.div
              layoutId="pairwise-selection"
              className="absolute inset-0 rounded-3xl bg-[var(--color-accent)]/10"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <div className="relative z-10 flex flex-col items-center gap-3">
            {pair.left.icon && (
              <motion.span
                className="text-5xl sm:text-6xl"
                animate={selected === "left" ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                transition={{ duration: 0.6 }}
              >
                <Icon emoji={pair.left.icon} size={64} />
              </motion.span>
            )}
            <h3 className="m-0 text-xl font-semibold text-[var(--color-foreground)] sm:text-2xl">
              {pair.left.label}
            </h3>
            {selected === "left" && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="glass-chip glass-chip--compact glass-chip--accent text-xs font-semibold"
              >
                ✓ {pair.left.label} انتخاب شد
              </motion.div>
            )}
          </div>
        </motion.button>

        <motion.button
          onClick={() => onSelect("right")}
          variants={itemVariants}
          className={`glass-card backdrop-blur-xl glass-button-gradient-border group relative flex min-h-[180px] flex-col items-center justify-center gap-4 rounded-3xl p-8 text-center transition-all duration-500 sm:min-h-[200px] ${
            selected === "right"
              ? "border-2 border-[var(--color-accent)] bg-gradient-to-br from-white/95 via-[var(--color-accent-soft)]/30 to-white/95 shadow-strong scale-[1.03] z-10"
              : "border border-[var(--color-border)] hover:scale-[1.02] hover:shadow-soft hover:border-[var(--color-accent)]/40"
          } tap-highlight touch-target touch-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]`}
        >
          {selected === "right" && (
            <motion.div
              layoutId="pairwise-selection"
              className="absolute inset-0 rounded-3xl bg-[var(--color-accent)]/10"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <div className="relative z-10 flex flex-col items-center gap-3">
            {pair.right.icon && (
              <motion.span
                className="text-5xl sm:text-6xl"
                animate={selected === "right" ? { scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] } : {}}
                transition={{ duration: 0.6 }}
              >
                <Icon emoji={pair.right.icon} size={64} />
              </motion.span>
            )}
            <h3 className="m-0 text-xl font-semibold text-[var(--color-foreground)] sm:text-2xl">
              {pair.right.label}
            </h3>
            {selected === "right" && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="glass-chip glass-chip--compact glass-chip--accent text-xs font-semibold"
              >
                ✓ {pair.right.label} انتخاب شد
              </motion.div>
            )}
          </div>
        </motion.button>
      </div>

      {showNotSure && (
        <motion.button
          onClick={() => onSelect("none")}
          variants={itemVariants}
          className={`glass-surface mx-auto w-full max-w-md rounded-2xl px-6 py-4 text-center transition-all duration-300 ${
            selected === "none"
              ? "bg-[var(--color-accent-soft)] border-2 border-[var(--color-accent)] scale-[1.02]"
              : "border border-[var(--color-border)] hover:bg-white/10 hover:scale-[1.01]"
          } tap-highlight touch-target touch-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]`}
        >
          <span className="text-sm font-medium text-[var(--color-foreground)] sm:text-base">
            ترجیح نمی‌دهم
          </span>
        </motion.button>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-muted sm:text-sm">
        <span>یکی را انتخاب کنید</span>
        <span>•</span>
        <span>یا رد کنید</span>
      </div>
    </motion.div>
  );
}
