"use client";

import { motion } from "framer-motion";
import { useFadeScaleVariants, useStaggeredListVariants } from "@/lib/motion";
import { type Choice } from "@/lib/kiosk-options";
import { Icon } from "@/lib/icons";
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface GenderStepProps {
  options: Choice[];
  selected: string | null;
  onSelect: (value: string) => void;
}

export default function GenderStep({ options, selected, onSelect }: GenderStepProps) {
  const isKiosk = useKioskMode();
  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.1,
    staggerChildren: 0.05,
  });

  const itemVariants = useFadeScaleVariants({
    y: 18,
    scale: 0.97,
    blur: 10,
  });

  return (
    <motion.div
      className="grid w-full gap-3 sm:gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))" }}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {options.map((option) => {
        const isSelected = selected === option.value;

        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            variants={itemVariants}
            animate={isSelected ? { scale: [1, 1.06, 1.02] } : {}}
            transition={{ duration: 0.4 }}
            className={cn(
              "glass-surface backdrop-blur-xl glass-chip-gradient-border relative flex min-h-[72px] items-center justify-center gap-3 rounded-2xl px-4 py-4 text-center transition-all duration-300",
              "tap-highlight touch-target touch-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]",
              isSelected
                ? "border-2 border-[var(--color-accent)] bg-gradient-to-br from-[var(--color-accent-soft)]/90 to-[var(--color-accent-soft)]/60 shadow-strong scale-[1.02] ring-2 ring-[var(--color-accent)]/20"
                : "border border-[var(--color-border)] hover:bg-white/10 hover:shadow-soft hover:border-[var(--color-accent)]/30",
              isKiosk && "min-h-[100px] gap-4 px-6 py-5"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId={`gender-selection-${option.value}`}
                className="absolute inset-0 rounded-2xl bg-[var(--color-accent)]/10"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            {option.icon ? (
              <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <Icon emoji={option.icon} size={isKiosk ? 28 : 22} />
              </span>
            ) : null}
            <span
              className={cn(
                "relative z-10 text-sm font-semibold sm:text-base transition-colors duration-300",
                isSelected ? "text-[var(--color-accent)]" : "text-[var(--color-foreground)]",
                isKiosk && "text-lg"
              )}
            >
              {option.label}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
