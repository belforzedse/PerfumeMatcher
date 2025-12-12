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
            className={`glass-surface backdrop-blur-xl glass-chip-gradient-border flex min-h-[60px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-center transition-all duration-300 sm:min-h-[68px] sm:px-5 ${
              isSelected
                ? "border-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-soft"
                : "border border-[var(--color-border)] hover:bg-white/10 hover:shadow-soft"
            } tap-highlight touch-target touch-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]`}
          >
            <span className="text-sm font-medium text-[var(--color-foreground)] sm:text-base">
              {safety.label}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}


