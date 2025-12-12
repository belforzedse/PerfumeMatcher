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
      className="grid w-full gap-3 sm:gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))" }}
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
            className={`glass-card backdrop-blur-xl glass-button-gradient-border flex min-h-[120px] flex-col items-start justify-between gap-3 rounded-2xl p-4 text-right transition-all duration-300 sm:min-h-[140px] sm:p-5 ${
              isSelected
                ? "border-2 border-[var(--color-accent)] bg-gradient-to-br from-white/90 to-[var(--color-accent-soft)]/40 shadow-strong"
                : "border border-[var(--color-border)] hover:scale-[1.02] hover:shadow-soft"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "tap-highlight touch-target touch-feedback"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]`}
          >
            <div className="flex w-full items-start justify-between gap-2">
              {scene.icon && <Icon emoji={scene.icon} size={40} />}
              {isSelected && (
                <span className="glass-chip glass-chip--compact glass-chip--accent text-xs font-semibold">
                  انتخاب شده
                </span>
              )}
            </div>
            <div className="space-y-1">
              <h3 className="m-0 text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
                {scene.label}
              </h3>
              {scene.description && (
                <p className="m-0 text-xs text-muted sm:text-sm">{scene.description}</p>
              )}
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
