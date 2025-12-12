"use client";

import { motion } from "framer-motion";
import { useFadeScaleVariants, useStaggeredListVariants } from "@/lib/motion";
import type { SafetyChoice } from "@/lib/questionnaire-mapper";

interface SafetyStepProps {
  safetyChoices: SafetyChoice[];
  selected: string[];
  onToggle: (safetyId: string) => void;
}

export default function SafetyStep({ safetyChoices, selected, onToggle }: SafetyStepProps) {
  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.1,
    staggerChildren: 0.05,
  });

  const itemVariants = useFadeScaleVariants({
    y: 16,
    scale: 0.98,
    blur: 8,
  });

  return (
    <motion.div
      className="grid w-full gap-2.5 sm:gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))" }}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {safetyChoices.map((safety) => {
        const isSelected = selected.includes(safety.id);

        return (
          <motion.button
            key={safety.id}
            onClick={() => onToggle(safety.id)}
            variants={itemVariants}
            animate={isSelected ? { scale: [1, 1.08, 1.02] } : {}}
            transition={{ duration: 0.4 }}
            className={`glass-surface backdrop-blur-xl glass-chip-gradient-border relative flex min-h-[60px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-center transition-all duration-300 sm:min-h-[68px] sm:px-5 ${
              isSelected
                ? "border-2 border-[var(--color-accent)] bg-gradient-to-br from-[var(--color-accent-soft)]/90 to-[var(--color-accent-soft)]/60 shadow-strong scale-[1.02] ring-2 ring-[var(--color-accent)]/20"
                : "border border-[var(--color-border)] hover:bg-white/10 hover:shadow-soft hover:border-[var(--color-accent)]/30"
            } tap-highlight touch-target touch-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]`}
          >
            {isSelected && (
              <>
                <motion.div
                  layoutId={`safety-selection-${safety.id}`}
                  className="absolute inset-0 rounded-xl bg-[var(--color-accent)]/10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <motion.span
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-white text-sm font-bold shadow-lg"
                >
                  ✓
                </motion.span>
              </>
            )}
            <span className={`relative z-10 text-sm font-semibold sm:text-base transition-colors duration-300 ${
              isSelected 
                ? "text-[var(--color-accent)]" 
                : "text-[var(--color-foreground)]"
            }`}>
              {safety.label}
            </span>
            {isSelected && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-bold text-white shadow-md"
              >
                انتخاب شد
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}


