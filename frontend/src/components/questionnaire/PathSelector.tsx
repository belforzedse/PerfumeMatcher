"use client";

import { motion } from "framer-motion";
import { useFadeScaleVariants, useStaggeredListVariants } from "@/lib/motion";
import type { QuestionPath } from "@/lib/questionnaire-flow";
import { Icon } from "@/lib/icons";
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface PathSelectorProps {
  onSelect: (path: QuestionPath) => void;
}

const PATH_OPTIONS: Array<{
  path: QuestionPath;
  label: string;
  description: string;
  icon: string;
  time: string;
}> = [
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
  const isKiosk = useKioskMode();

  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.16,
    staggerChildren: 0.08,
  });

  const itemVariants = useFadeScaleVariants({
    y: isKiosk ? 28 : 24,
    scale: 0.965,
    blur: 12,
  });

  const gridClass = cn(
    "grid w-full gap-3 sm:gap-4",
    isKiosk ? "mx-auto max-w-5xl grid-cols-2 gap-8" : ""
  );

  const cardBase = cn(
    "glass-card backdrop-blur-xl glass-button-gradient-border",
    "relative flex flex-col items-start justify-between text-right",
    "transition-all duration-300",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]",
    "tap-highlight touch-target touch-feedback"
  );

  return (
    <motion.div
      className={cn(
        "w-full",
        // ✅ kiosk: occupy height + center cards so it doesn’t float at the top
        isKiosk
          ? "flex h-full min-h-0 flex-col justify-center"
          : "flex flex-col gap-4"
      )}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* subtle kiosk glow so it feels less empty */}
      {isKiosk && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-70 bg-[radial-gradient(1000px_circle_at_50%_0%,rgba(212,175,55,0.10),transparent_60%)]"
        />
      )}

      <motion.div
        className={gridClass}
        // keep your auto-fit grid in normal mode
        style={
          isKiosk
            ? undefined
            : {
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
              }
        }
      >
        {PATH_OPTIONS.map((option) => (
          <motion.button
            key={option.path}
            type="button"
            onClick={() => onSelect(option.path)}
            variants={itemVariants}
            whileHover={
              isKiosk ? { y: -6, scale: 1.02 } : { y: -2, scale: 1.02 }
            }
            whileTap={{ scale: 0.99, y: -1 }}
            className={cn(
              cardBase,
              isKiosk
                ? "min-h-[320px] rounded-[2.25rem] p-10 shadow-[0_28px_80px_rgba(0,0,0,0.14)]"
                : "min-h-[140px] rounded-2xl p-5 hover:shadow-strong sm:min-h-[160px] sm:p-6"
            )}
          >
            {/* crisp inner edge (premium) */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-0 rounded-[inherit]",
                "after:absolute after:inset-[1px] after:rounded-[calc(inherit-1px)] after:ring-1 after:ring-white/10"
              )}
            />

            <div className="flex w-full items-start justify-between gap-3">
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-3xl bg-white/60 ring-1 ring-white/50",
                  isKiosk ? "h-20 w-20" : "h-14 w-14"
                )}
              >
                <Icon emoji={option.icon} size={isKiosk ? 56 : 48} />
              </span>

              <span
                className={cn(
                  "glass-chip glass-chip--compact glass-chip--muted font-medium",
                  isKiosk ? "text-base px-4 py-2" : "text-xs"
                )}
              >
                {option.time}
              </span>
            </div>

            <div className={cn("space-y-2", isKiosk && "space-y-3")}>
              <h3
                className={cn(
                  "m-0 font-semibold text-[var(--color-foreground)] leading-tight",
                  isKiosk ? "text-3xl" : "text-lg sm:text-xl"
                )}
              >
                {option.label}
              </h3>

              <p
                className={cn(
                  "m-0 text-muted leading-relaxed",
                  isKiosk ? "text-lg" : "text-sm"
                )}
              >
                {option.description}
              </p>

              {/* kiosk-only helper line to “fill” and guide */}
              {isKiosk && (
                <p className="m-0 text-sm text-muted">
                  برای شروع، این گزینه را لمس کنید
                </p>
              )}
            </div>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
