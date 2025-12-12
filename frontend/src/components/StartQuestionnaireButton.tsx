"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BiChevronLeft } from "react-icons/bi";

interface StartQuestionnaireButtonProps {
  className?: string;
  href?: string;
  label?: string;
}

const MotionLink = motion.create(Link);

export default function StartQuestionnaireButton({
  className = "",
  href = "/questionnaire",
  label = "شروع",
}: StartQuestionnaireButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  const interactiveProps = shouldReduceMotion
    ? {}
    : {
        whileHover: {
          scale: 1.01,
          boxShadow:
            "0 28px 70px rgba(0,0,0,0.18), 0 0 28px var(--accent-glow)",
        },
        whileTap: {
          scale: 0.985,
        },
        transition: {
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1] as const,
        },
      };

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}>
      <MotionLink
        href={href}
        prefetch={false}
        aria-label="شروع پرسشنامه"
        {...interactiveProps}
        className={[
          "tap-highlight touch-target touch-feedback group relative isolate",
          "flex w-full items-center justify-center",
          "overflow-hidden rounded-full",
          "px-8 py-5 sm:px-10 sm:py-6",
          "text-white",
          // gold gradient base (your tokens)
          "bg-[linear-gradient(120deg,var(--accent),var(--accent-strong),var(--accent))]",
          // depth + border
          "shadow-[0_18px_46px_rgba(0,0,0,0.14),0_0_26px_var(--accent-glow)]",
          "ring-1 ring-white/35",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.35)]",
        ].join(" ")}
      >
        {/* top highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.10) 35%, transparent 70%)",
          }}
        />
        {/* inner border sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[1px] rounded-full ring-1 ring-white/20"
        />

        {/* Chevron bubble anchored left (works in RTL too) */}
        <span className="absolute left-4 sm:left-5">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/16 ring-1 ring-white/25 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/22">
            {/* IMPORTANT: no rtl rotation — keep it pointing LEFT */}
            <BiChevronLeft className="h-7 w-7 text-white drop-shadow-sm" />
          </span>
        </span>

        {/* Centered label */}
        <span className="relative text-center text-2xl font-semibold leading-none drop-shadow-[0_3px_10px_rgba(0,0,0,0.18)] sm:text-4xl">
          {label}
        </span>
      </MotionLink>
    </div>
  );
}
