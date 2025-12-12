"use client";

import { motion } from "framer-motion";
import { useFadeScaleVariants, useStaggeredListVariants } from "@/lib/motion";
import type { QuestionPath } from "@/lib/questionnaire-flow";
import { Icon } from "@/lib/icons";

interface PathSelectorProps {
  onSelect: (path: QuestionPath) => void;
}

const PATH_OPTIONS: Array<{ path: QuestionPath; label: string; description: string; icon: string; time: string }> = [
  {
    path: "quick",
    label: "سریع (۳۰ ثانیه)",
    description: "برای کسانی که می‌دانند چه می‌خواهند",
    icon: "⚡",
    time: "~30s",
  },
  {
    path: "deep",
    label: "عمیق (۶۰-۹۰ ثانیه)",
    description: "کاوش کامل برای پیدا کردن عطر ایده‌آل",
    icon: "🔍",
    time: "60-90s",
  },
];

export default function PathSelector({ onSelect }: PathSelectorProps) {
  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.2,
    staggerChildren: 0.1,
  });

  const itemVariants = useFadeScaleVariants({
    y: 24,
    scale: 0.96,
    blur: 12,
  });

  return (
    <motion.div
      className="flex flex-col gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div
        className="grid w-full gap-3 sm:gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}
      >
        {PATH_OPTIONS.map((option) => (
          <motion.button
            key={option.path}
            onClick={() => onSelect(option.path)}
            variants={itemVariants}
            className="glass-card backdrop-blur-xl glass-button-gradient-border flex min-h-[140px] flex-col items-start justify-between gap-3 rounded-2xl p-5 text-right transition-all duration-300 hover:scale-[1.02] hover:shadow-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)] tap-highlight touch-target touch-feedback sm:min-h-[160px] sm:p-6"
          >
            <div className="flex w-full items-start justify-between gap-3">
              <Icon emoji={option.icon} size={48} />
              <span className="glass-chip glass-chip--compact glass-chip--muted text-xs font-medium">
                {option.time}
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="m-0 text-lg font-semibold text-[var(--color-foreground)] sm:text-xl">
                {option.label}
              </h3>
              <p className="m-0 text-sm text-muted">{option.description}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
