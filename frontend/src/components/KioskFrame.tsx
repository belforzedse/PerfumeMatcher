"use client";

import React, { startTransition, useEffect, useRef, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import AnimatedBackground from "@/components/AnimatedBackground";
import IdleTimer from "@/components/IdleTimer";
import { GlassToastProvider } from "@/components/GlassToastProvider";
import {
  durations,
  easings,
  signatureTransitions,
  transitions,
  useMotionPreference,
  useMotionSafeTransition,
} from "@/lib/motion";

// In development, disable idle timer (0) or use much longer timeouts
const isDev = process.env.NODE_ENV === "development";
const QUESTIONNAIRE_TIMEOUT_MS = isDev ? 1000_000 : 30_000; // 30 seconds (disabled in dev)
const RECOMMENDATIONS_TIMEOUT_MS = isDev ? 0 : 120_000; // 2 minutes (disabled in dev)
// Kiosk mode timeouts (longer for better UX)
const QUESTIONNAIRE_TIMEOUT_MS_KIOSK = isDev ? 1000_000 : 45_000; // 45 seconds in kiosk
const RECOMMENDATIONS_TIMEOUT_MS_KIOSK = isDev ? 0 : 180_000; // 3 minutes in kiosk
const NON_INTERACTIVE_KEYS = new Set([
  "Shift",
  "Meta",
  "Control",
  "Alt",
  "CapsLock",
  "NumLock",
  "ScrollLock",
  "Dead",
]);

export default function KioskFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const idleTimerRef = useRef<number | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const shouldReduceMotion = useMotionPreference();
  const filterDuration =
    (signatureTransitions.page.duration ?? durations.relaxed) * 0.62;
  const pageTransition = useMotionSafeTransition(
    () => ({
      ...signatureTransitions.page,
      scale: transitions.gentleSpring,
      filter: {
        delay: 0.12,
        duration: filterDuration,
        ease:
          signatureTransitions.hover.ease ??
          signatureTransitions.surface.ease ??
          easings.signature,
      },
    }),
    [filterDuration]
  );

  const isHome = pathname === "/";
  const isQuestionnaire = pathname === "/questionnaire";
  const isRecommendations = pathname === "/recommendations";

  // Detect kiosk mode (height >= 1024px, width < height, width >= 600px)
  const [isKiosk, setIsKiosk] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkKiosk = () => {
      const height = window.innerHeight;
      const width = window.innerWidth;
      setIsKiosk(height >= 1024 && width < height && width >= 600);
    };
    checkKiosk();
    window.addEventListener("resize", checkKiosk);
    return () => window.removeEventListener("resize", checkKiosk);
  }, []);

  // Determine timeout based on current page and kiosk mode
  const IDLE_TIMEOUT_MS = useMemo(() => {
    if (isHome) return 0; // No timeout on home
    if (isQuestionnaire) return isKiosk ? QUESTIONNAIRE_TIMEOUT_MS_KIOSK : QUESTIONNAIRE_TIMEOUT_MS;
    if (isRecommendations) return isKiosk ? RECOMMENDATIONS_TIMEOUT_MS_KIOSK : RECOMMENDATIONS_TIMEOUT_MS;
    return isKiosk ? 180_000 : 120_000; // Default timeout (longer in kiosk)
  }, [isHome, isQuestionnaire, isRecommendations, isKiosk]);

  useEffect(() => {
    if (typeof window === "undefined" || isHome || IDLE_TIMEOUT_MS === 0) {
      return;
    }

    const goHome = () => {
      if (pathname === "/") return;

      const navigate = () => {
        try {
          router.replace("/");
        } catch (error) {
          console.error("Idle redirect failed via router.replace, falling back", error);
          window.location.replace("/");
        }
      };

      if (typeof startTransition === "function") {
        startTransition(navigate);
      } else {
        navigate();
      }
    };

    const resetTimer = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(goHome, IDLE_TIMEOUT_MS);
      // Reset the timer widget by changing key
      setTimerKey((prev) => prev + 1);
    };

    const rootElement = document.querySelector(".kiosk-root");
    let lastInteractionTimestamp = 0;
    const MIN_RESET_INTERVAL_MS = 250;

    const scheduleReset = () => {
      const now = Date.now();
      if (now - lastInteractionTimestamp < MIN_RESET_INTERVAL_MS) {
        return;
      }
      lastInteractionTimestamp = now;
      resetTimer();
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        resetTimer();
      }
    };

    const isWithinRoot = (target: EventTarget | null): target is Node => {
      if (!(target instanceof Node)) {
        return false;
      }
      if (!rootElement) {
        return false;
      }
      return rootElement.contains(target);
    };

    const handlePointerActivity = (event: PointerEvent) => {
      if (!event.isTrusted || !isWithinRoot(event.target)) {
        return;
      }
      scheduleReset();
    };

    const handleWheel = (event: WheelEvent) => {
      if (!event.isTrusted || !isWithinRoot(event.target)) {
        return;
      }
      scheduleReset();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.isTrusted || !isWithinRoot(event.target)) {
        return;
      }

      if (NON_INTERACTIVE_KEYS.has(event.key)) {
        return;
      }

      scheduleReset();
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!event.isTrusted || !isWithinRoot(event.target)) {
        return;
      }
      scheduleReset();
    };

    window.addEventListener("pointerdown", handlePointerActivity, { passive: true });
    window.addEventListener("pointermove", handlePointerActivity, { passive: true });
    window.addEventListener("pointerup", handlePointerActivity, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("focusin", handleFocusIn);

    resetTimer();

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      window.removeEventListener("pointerdown", handlePointerActivity);
      window.removeEventListener("pointermove", handlePointerActivity);
      window.removeEventListener("pointerup", handlePointerActivity);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [router, pathname, isHome, IDLE_TIMEOUT_MS]);

  return (
    <GlassToastProvider>
      <div className="kiosk-root">
        <AnimatedBackground />
        {!isHome && IDLE_TIMEOUT_MS > 0 && (
          <IdleTimer
            key={timerKey}
            timeoutMs={IDLE_TIMEOUT_MS}
            isActive={true}
          />
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={shouldReduceMotion ? "static" : pathname}
            className={`kiosk-frame ${className}`}
            initial={
              shouldReduceMotion
                ? false
                : { opacity: 0, y: 26, scale: 0.984 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 0, y: -18, scale: 0.988 }
            }
            transition={pageTransition}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </GlassToastProvider>
  );
}

