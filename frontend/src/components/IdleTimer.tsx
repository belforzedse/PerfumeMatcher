"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { durations, signatureTransitions, useFadeScaleVariants } from "@/lib/motion";

interface IdleTimerProps {
  timeoutMs: number;
  onIdle?: () => void;
  isActive: boolean;
}

export default function IdleTimer({ timeoutMs, onIdle, isActive }: IdleTimerProps) {
  return <Countdown key={timeoutMs} timeoutMs={timeoutMs} onIdle={onIdle} isActive={isActive} />;
}

function Countdown({ timeoutMs, onIdle, isActive }: IdleTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeoutMs);
  const remainingRef = useRef(timeoutMs);
  const timerVariants = useFadeScaleVariants({
    y: 16,
    scale: 0.92,
    blur: 12,
    duration: signatureTransitions.surface.duration ?? durations.moderate,
    ease: signatureTransitions.surface.ease,
  });

  useEffect(() => {
    if (!isActive || timeoutMs === 0 || remainingRef.current === 0) return;

    const interval = setInterval(() => {
      const next = Math.max(0, remainingRef.current - 1000);
      remainingRef.current = next;
      setTimeRemaining(next);
      if (next === 0) {
        clearInterval(interval);
        onIdle?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutMs, isActive, onIdle]);

  const isVisible = timeRemaining < timeoutMs && timeRemaining <= 30000 && timeRemaining > 0;
  if (!isVisible || !isActive || timeoutMs === 0) return null;

  const seconds = Math.max(0, Math.ceil(timeRemaining / 1000));
  const progress = Math.min(100, Math.max(0, (timeRemaining / timeoutMs) * 100));
  const urgency = seconds <= 10 ? "critical" : seconds <= 20 ? "warning" : "idle";
  const circumference = 2 * Math.PI * 15.5;

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50"
      variants={timerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      
    >
      <div
        className="idle-timer glass-chip glass-chip--compact glass-chip--pill focus-visible:outline backdrop-blur-xl focus-visible:outline-[var(--color-accent-strong)] focus-visible:outline-offset-2"
        data-urgency={urgency}
        tabIndex={-1}
      >
        {/* Circular Progress */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg className="idle-timer__ring w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            {/* Background circle */}
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="idle-timer__track"
              strokeDasharray={circumference}
            />
            {/* Progress circle */}
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              className="idle-timer__progress"
              strokeLinecap="round"
            />
          </svg>
          <span className="idle-timer__label absolute text-xs font-semibold">
            {seconds}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
