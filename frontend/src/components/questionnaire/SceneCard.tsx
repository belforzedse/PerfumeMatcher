"use client";

import { motion } from "framer-motion";
import { useFadeScaleVariants, useStaggeredListVariants } from "@/lib/motion";
import type { SceneChoice } from "@/lib/questionnaire-mapper";
import { Icon } from "@/lib/icons";

interface SceneCardProps {
  scenes: SceneChoice[];
  selected: string[];
  maxSelections: number;
  onToggle: (sceneId: string) => void;
}

export default function SceneCard({ scenes, selected, maxSelections, onToggle }: SceneCardProps) {
  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.15,
    staggerChildren: 0.08,
  });

  const itemVariants = useFadeScaleVariants({
    y: 20,
    scale: 0.95,
    blur: 10,
  });

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 w-full gap-3 sm:gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {scenes.map((scene) => {
        const isSelected = selected.includes(scene.id);
        const disabled = !isSelected && selected.length >= maxSelections;

        return (
          <motion.button
            key={scene.id}
            onClick={() => !disabled && onToggle(scene.id)}
            disabled={disabled}
            variants={itemVariants}
            className={`glass-card backdrop-blur-xl glass-button-gradient-border flex min-h-[100px] flex-col items-start justify-between gap-2 rounded-2xl p-3 text-right transition-all duration-300 sm:min-h-[140px] sm:gap-3 sm:p-5 ${
              isSelected
                ? "border-2 border-[var(--color-accent)] bg-gradient-to-br from-white/90 to-[var(--color-accent-soft)]/40 shadow-strong"
                : "border border-[var(--color-border)] hover:scale-[1.02] hover:shadow-soft"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "tap-highlight touch-target touch-feedback"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]`}
          >
            <div className="flex w-full items-start justify-between gap-2">
              {scene.icon && (
                <motion.span
                  animate={isSelected ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 0.5 }}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
                >
                  <Icon emoji={scene.icon} size={32} className="w-full h-full" />
                </motion.span>
              )}
              {isSelected && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-chip glass-chip--compact glass-chip--accent text-[10px] sm:text-xs font-semibold"
                >
                  انتخاب شده
                </motion.span>
              )}
            </div>
            <div className="space-y-1">
              <h3 className={`m-0 text-base font-semibold sm:text-lg ${
                isSelected ? "text-[var(--color-accent)]" : "text-[var(--color-foreground)]"
              }`}>
                {scene.label}
              </h3>
              {scene.description && (
                <p className={`m-0 text-xs sm:text-sm ${
                  isSelected ? "text-[var(--color-foreground)]/90" : "text-muted"
                }`}>
                  {scene.description}
                </p>
              )}
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
