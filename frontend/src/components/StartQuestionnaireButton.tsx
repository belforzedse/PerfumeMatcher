"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

interface StartQuestionnaireButtonProps {
  className?: string;
}

const MotionLink = motion.create(Link);

export default function StartQuestionnaireButton({
  className = "",
}: StartQuestionnaireButtonProps) {
  const wrapperClassName = ["w-full", className].filter(Boolean).join(" ");
  const shouldReduceMotion = useReducedMotion();

  const baseShimmer =
    "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0.58) 100%)";
  const rippleOverlay =
    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.18) 60%, transparent 100%)";

  const interactiveProps = shouldReduceMotion
    ? {}
    : {
        whileHover: {
          backgroundPosition: "120% 50%",
          boxShadow: "0 30px 72px rgba(var(--shadow-color) / 0.2)",
          scale: 1.008,
        },
        whileTap: {
          scale: 0.992,
          backgroundImage: `${rippleOverlay}, ${baseShimmer}`,
          boxShadow: "0 24px 58px rgba(var(--shadow-color) / 0.24)",
        },
        transition: {
          duration: 0.75,
          ease: [0.16, 1, 0.3, 1] as const,
        },
      };

  return (
    <div className={wrapperClassName}>
      <MotionLink
        href="/questionnaire"
        prefetch={false}
        className="tap-highlight touch-target touch-feedback group glass-cta relative isolate flex w-full flex-col items-center gap-4 overflow-hidden rounded-full px-7 py-6 text-center text-[var(--color-foreground)] transition-[box-shadow,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-strong)] xs:px-9 xs:py-7 sm:flex-row sm:items-center sm:justify-between sm:px-11 sm:py-8"
        aria-label="شروع پرسشنامه و رفتن به فرم انتخاب عطر"
        style={{
          backgroundImage: shouldReduceMotion ? undefined : baseShimmer,
          backgroundSize: shouldReduceMotion ? undefined : "220% 220%",
          backgroundPosition: shouldReduceMotion ? undefined : "0% 50%",
        }}
        {...interactiveProps}
      >
        <span className="flex flex-col gap-1 sm:text-left">
          <span className="text-lg font-semibold sm:text-xl">شروع پرسشنامه</span>
          <span className="text-sm font-normal text-[var(--color-foreground-muted)] sm:text-base">
            چند پاسخ کوتاه و نتیجه فوری
          </span>
        </span>
        <span className="relative flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(120deg,var(--accent),var(--accent-strong),var(--accent))] px-5 py-2 text-sm font-semibold text-white shadow-[0_0_25px_var(--accent-glow)] ring-1 ring-white/40 transition-[box-shadow,filter,transform] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:brightness-[1.08] group-hover:shadow-[0_0_36px_var(--accent-glow)] group-active:scale-[0.98] sm:text-base">
            <span className="drop-shadow-[0_3px_6px_rgba(0,0,0,0.18)]">شروع</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-5 w-5 text-white"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12h12m0 0-4-4m4 4-4 4"
              />
            </svg>
          </span>
          <span
            className="pointer-events-none absolute inset-0 rounded-full bg-white/20 opacity-0 blur-2xl transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-70"
            aria-hidden
          />
        </span>
      </MotionLink>
    </div>
  );
}

