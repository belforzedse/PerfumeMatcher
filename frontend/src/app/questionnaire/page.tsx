"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPersianNumbers } from "@/lib/api";
import { useRouter } from "next/navigation";
import KioskFrame from "@/components/KioskFrame";
import { AnimatePresence, motion } from "framer-motion";
import {
  serializeAnswers,
  type QuestionnaireAnswers,
} from "@/lib/questionnaire";
import {
  signatureTransitions,
  useFadeScaleVariants,
} from "@/lib/motion";
import {
  createInitialFlowState,
  initializeFlow,
  getCurrentStep,
  canProceed,
  updateConfidence,
  getNextStep,
  getProgress,
  shouldShowQuickFire,
  type FlowState,
  type QuestionPath,
} from "@/lib/questionnaire-flow";
import {
  mapResponsesToAnswers,
  getSceneChoices,
  getVibePairs,
  getIntensityChoices,
  getSafetyChoices,
  type UserResponses,
} from "@/lib/questionnaire-mapper";
import PathSelector from "@/components/questionnaire/PathSelector";
import SceneCard from "@/components/questionnaire/SceneCard";
import PairwiseChoice from "@/components/questionnaire/PairwiseChoice";
import IntensityControl from "@/components/questionnaire/IntensityControl";
import SafetyStep from "@/components/questionnaire/SafetyStep";
import QuickFireNotes from "@/components/questionnaire/QuickFireNotes";
import ReviewScreen from "@/components/questionnaire/ReviewScreen";

const formatNumber = (value: number) => toPersianNumbers(String(value));

const SECTION_TRANSITION_DURATION = signatureTransitions.section.duration ?? 0.6;
const DEFAULT_SIGNATURE_EASE =
  signatureTransitions.section.ease ??
  signatureTransitions.surface.ease ??
  signatureTransitions.page.ease ??
  signatureTransitions.hover.ease;
const SECTION_TRANSITION_EASE = DEFAULT_SIGNATURE_EASE;

const questionStackVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: SECTION_TRANSITION_DURATION,
      ease: SECTION_TRANSITION_EASE,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: SECTION_TRANSITION_DURATION * 0.65,
      ease: SECTION_TRANSITION_EASE,
      when: "afterChildren",
    },
  },
} as const;

const questionHeaderVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: SECTION_TRANSITION_DURATION,
      ease: SECTION_TRANSITION_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: {
      duration: SECTION_TRANSITION_DURATION * 0.7,
      ease: SECTION_TRANSITION_EASE,
    },
  },
} as const;

const ICON_BUTTON_BASE =
  "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--color-foreground)] transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)] disabled:pointer-events-none disabled:opacity-40 tap-highlight touch-target touch-feedback";

const NAV_BUTTON_BASE =
  "hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-foreground)] transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)] disabled:pointer-events-none disabled:opacity-50 tap-highlight touch-target touch-feedback sm:inline-flex sm:px-5 sm:py-2.5 sm:text-base md:text-lg";

const MICRO_REWARDS = [
  "عالی!",
  "خوب انتخاب کردید",
  "درست است",
  "عالی پیش می‌روید",
  "خیلی خوب",
];

export default function Questionnaire() {
  const router = useRouter();
  const [flowState, setFlowState] = useState<FlowState>(createInitialFlowState());
  const [answers, setAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [microReward, setMicroReward] = useState<string | null>(null);
  const questionSectionRef = useRef<HTMLElement | null>(null);
  const headingId = "questionnaire-heading";
  const helperId = "questionnaire-helper";

  const currentStep = getCurrentStep(flowState);
  const progress = getProgress(flowState);

  const sceneChoices = useMemo(() => getSceneChoices(), []);
  const vibePairs = useMemo(() => getVibePairs(), []);
  const intensityChoices = useMemo(() => getIntensityChoices(), []);
  const safetyChoices = useMemo(() => getSafetyChoices(), []);

  useEffect(() => {
    if (answers) {
      const updated = updateConfidence(flowState, answers);
      setFlowState(updated);
    }
  }, [answers]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = questionSectionRef.current;
    if (!section) return;

    const isMobile = window.matchMedia
      ? window.matchMedia("(max-width: 767px)").matches
      : window.innerWidth <= 767;

    if (!isMobile) return;

    const { top } = section.getBoundingClientRect();
    if (top <= 16) return;

    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [flowState.currentStep]);

  const showMicroReward = useCallback(() => {
    const reward = MICRO_REWARDS[Math.floor(Math.random() * MICRO_REWARDS.length)];
    setMicroReward(reward);
    setTimeout(() => setMicroReward(null), 2000);
  }, []);

  const handlePathSelect = useCallback((path: QuestionPath) => {
    const newState = initializeFlow(path);
    setFlowState(newState);
    showMicroReward();
  }, [showMicroReward]);

  const handleSceneToggle = useCallback(
    (sceneId: string) => {
      setFlowState((prev) => {
        const scenes = prev.responses.scenes.includes(sceneId)
          ? prev.responses.scenes.filter((id) => id !== sceneId)
          : [...prev.responses.scenes, sceneId].slice(0, 3);

        const newResponses = { ...prev.responses, scenes };
        const newAnswers = mapResponsesToAnswers(newResponses);
        setAnswers(newAnswers);
        showMicroReward();

        return { ...prev, responses: newResponses };
      });
    },
    [showMicroReward]
  );

  const handleSafetyToggle = useCallback(
    (safetyId: string) => {
      setFlowState((prev) => {
        const safetyChecks = prev.responses.safetyChecks.includes(safetyId)
          ? prev.responses.safetyChecks.filter((id) => id !== safetyId)
          : [...prev.responses.safetyChecks, safetyId];

        const newResponses = { ...prev.responses, safetyChecks };
        const newAnswers = mapResponsesToAnswers(newResponses);
        setAnswers(newAnswers);

        return { ...prev, responses: newResponses };
      });
    },
    []
  );

  const handleVibeSelect = useCallback(
    (choice: "left" | "right" | "none") => {
      setFlowState((prev) => {
        const pairwiseIndex = prev.steps
          .slice(0, prev.currentStep + 1)
          .filter((s) => s.type === "pairwise").length - 1;

        const vibePair = vibePairs[pairwiseIndex % vibePairs.length];
        if (!vibePair) return prev;

        const newVibePairs = [...prev.responses.vibePairs];
        if (choice === "none") {
          newVibePairs[pairwiseIndex] = `${vibePair.id}:none`;
        } else {
          newVibePairs[pairwiseIndex] = `${vibePair.id}:${choice}`;
        }

        const newResponses = { ...prev.responses, vibePairs: newVibePairs };
        const newAnswers = mapResponsesToAnswers(newResponses);
        setAnswers(newAnswers);
        showMicroReward();

        return { ...prev, responses: newResponses };
      });
    },
    [vibePairs, showMicroReward]
  );

  const handleIntensitySelect = useCallback(
    (intensityId: string) => {
      setFlowState((prev) => {
        const newResponses = { ...prev.responses, intensity: intensityId };
        const newAnswers = mapResponsesToAnswers(newResponses);
        setAnswers(newAnswers);
        showMicroReward();

        return { ...prev, responses: newResponses };
      });
    },
    [showMicroReward]
  );

  const handleQuickFireLike = useCallback(
    (noteId: string) => {
      setFlowState((prev) => {
        const likes = prev.responses.quickFireLikes.includes(noteId)
          ? prev.responses.quickFireLikes.filter((id) => id !== noteId)
          : [...prev.responses.quickFireLikes, noteId].slice(0, 3);

        const newResponses = { ...prev.responses, quickFireLikes: likes };
        const newAnswers = mapResponsesToAnswers(newResponses);
        setAnswers(newAnswers);

        return { ...prev, responses: newResponses };
      });
    },
    []
  );

  const handleQuickFireDislike = useCallback(
    (noteId: string) => {
      setFlowState((prev) => {
        const dislikes = prev.responses.quickFireDislikes.includes(noteId)
          ? prev.responses.quickFireDislikes.filter((id) => id !== noteId)
          : [...prev.responses.quickFireDislikes, noteId].slice(0, 3);

        const newResponses = { ...prev.responses, quickFireDislikes: dislikes };
        const newAnswers = mapResponsesToAnswers(newResponses);
        setAnswers(newAnswers);

        return { ...prev, responses: newResponses };
      });
    },
    []
  );

  const handleNext = useCallback(() => {
    if (!answers) return;

    const nextStepIndex = getNextStep(flowState);
    if (nextStepIndex === null) {
      const qs = new URLSearchParams({ answers: serializeAnswers(answers) });
      router.push(`/recommendations?${qs.toString()}`);
    } else {
      setFlowState((prev) => ({ ...prev, currentStep: nextStepIndex }));
    }
  }, [flowState, answers, router]);

  const handleBack = useCallback(() => {
    setFlowState((prev) => {
      if (prev.currentStep > 0) {
        return { ...prev, currentStep: prev.currentStep - 1 };
      }
      return prev;
    });
  }, []);

  const handleReset = useCallback(() => {
    setFlowState(createInitialFlowState());
    setAnswers(null);
    setMicroReward(null);
  }, []);

  const handleEdit = useCallback((section: string) => {
    setFlowState((prev) => {
      let targetStep = 0;
      switch (section) {
        case "scenes":
          targetStep = prev.steps.findIndex((s) => s.type === "scene-cards");
          break;
        case "vibes":
          targetStep = prev.steps.findIndex((s) => s.type === "pairwise");
          break;
        case "intensity":
          targetStep = prev.steps.findIndex((s) => s.type === "intensity");
          break;
        case "notes":
          targetStep = prev.steps.findIndex((s) => s.type === "quick-fire-notes");
          if (targetStep === -1) targetStep = prev.steps.length - 2;
          break;
        default:
          return prev;
      }
      if (targetStep >= 0) {
        return { ...prev, currentStep: targetStep };
      }
      return prev;
    });
  }, []);

  const currentVibePairIndex = useMemo(
    () =>
      flowState.steps
        .slice(0, flowState.currentStep + 1)
        .filter((s) => s.type === "pairwise").length - 1,
    [flowState.steps, flowState.currentStep]
  );
  const currentVibePair = useMemo(
    () => vibePairs[currentVibePairIndex % vibePairs.length],
    [currentVibePairIndex, vibePairs]
  );
  const currentVibeSelection = useMemo(
    () => flowState.responses.vibePairs[currentVibePairIndex],
    [flowState.responses.vibePairs, currentVibePairIndex]
  );
  const selectedVibeChoice = useMemo(
    () =>
      currentVibeSelection?.split(":")[1] === "left"
        ? "left"
        : currentVibeSelection?.split(":")[1] === "right"
          ? "right"
          : currentVibeSelection?.split(":")[1] === "none"
            ? "none"
            : null,
    [currentVibeSelection]
  );

  const canProceedNow = canProceed(flowState);

  if (!currentStep) {
    return (
      <KioskFrame>
        <main className="page-main flex min-h-0 w-full flex-1 items-center justify-center px-2 py-4 sm:px-3 md:px-4 lg:px-6 xl:px-8">
          <div className="glass-card backdrop-blur-xl glass-gradient-border page-panel flex h-full w-full min-h-0 flex-1 flex-col">
            <div className="flex flex-1 items-center justify-center">
              <p className="text-muted">در حال بارگذاری...</p>
            </div>
          </div>
        </main>
      </KioskFrame>
    );
  }

  return (
    <KioskFrame>
      <main
        aria-labelledby={headingId}
        className="page-main flex min-h-0 w-full flex-1 items-center justify-center px-2 py-4 sm:px-3 md:px-4 lg:px-6 xl:px-8"
      >
        <div className="glass-card backdrop-blur-xl glass-gradient-border page-panel flex h-full w-full min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              className="flex flex-1 min-h-0 flex-col"
              variants={questionStackVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <motion.header
                className="space-y-2 text-right"
                variants={questionHeaderVariants}
              >
                {flowState.path && (
                  <motion.p
                    className="m-0 text-[11px] text-muted sm:text-xs"
                    aria-live="polite"
                    variants={questionHeaderVariants}
                  >
                    مرحله {formatNumber(flowState.currentStep)} از {formatNumber(flowState.steps.length)}
                  </motion.p>
                )}
                <motion.h1
                  id={headingId}
                  className="m-0 text-xl font-semibold leading-tight text-[var(--color-foreground)] xs:text-2xl md:text-[1.85rem]"
                  variants={questionHeaderVariants}
                >
                  {currentStep.title}
                </motion.h1>
                {currentStep.description && (
                  <motion.p
                    className="m-0 text-xs text-muted sm:text-sm"
                    variants={questionHeaderVariants}
                  >
                    {currentStep.description}
                  </motion.p>
                )}
              </motion.header>

              <motion.div
                className="space-y-3 text-right"
                variants={questionHeaderVariants}
              >
                {flowState.path && (
                  <div className="h-2 w-full rounded-full bg-soft" role="presentation">
                    <div
                      className="h-2 rounded-full bg-[var(--color-accent)] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                      aria-hidden
                    />
                  </div>
                )}
                <div
                  role="status"
                  aria-live="polite"
                  className="relative flex min-h-[28px] justify-end text-[11px] font-medium text-[var(--color-accent)] sm:min-h-[30px] sm:text-xs"
                >
                  <AnimatePresence>
                    {microReward && (
                      <motion.span
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="inline-flex rounded-full bg-[var(--color-accent)]/10 px-2 py-1"
                      >
                        {microReward}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              <motion.section
                ref={questionSectionRef}
                className="page-panel__scroll flex flex-1 min-h-0 flex-col text-right"
                aria-describedby={helperId}
                variants={questionHeaderVariants}
              >
                {currentStep.type === "path-selection" && (
                  <PathSelector onSelect={handlePathSelect} />
                )}

                {currentStep.type === "scene-cards" && (
                  <SceneCard
                    scenes={sceneChoices}
                    selected={flowState.responses.scenes}
                    maxSelections={3}
                    onToggle={handleSceneToggle}
                  />
                )}

                {currentStep.type === "safety-step" && (
                  <SafetyStep
                    safetyChoices={safetyChoices}
                    selected={flowState.responses.safetyChecks}
                    onToggle={handleSafetyToggle}
                  />
                )}

                {currentStep.type === "pairwise" && currentVibePair && (
                  <PairwiseChoice
                    pair={currentVibePair}
                    selected={selectedVibeChoice}
                    onSelect={handleVibeSelect}
                    showNotSure={true}
                  />
                )}

                {currentStep.type === "intensity" && (
                  <IntensityControl
                    intensities={intensityChoices}
                    selected={flowState.responses.intensity || null}
                    onSelect={handleIntensitySelect}
                  />
                )}

                {currentStep.type === "quick-fire-notes" && shouldShowQuickFire(flowState) && (
                  <QuickFireNotes
                    selectedLikes={flowState.responses.quickFireLikes}
                    selectedDislikes={flowState.responses.quickFireDislikes}
                    maxSelections={3}
                    onToggleLike={handleQuickFireLike}
                    onToggleDislike={handleQuickFireDislike}
                  />
                )}

                {currentStep.type === "review" && answers && (
                  <ReviewScreen
                    responses={flowState.responses}
                    answers={answers}
                    onEdit={handleEdit}
                  />
                )}
              </motion.section>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-3 text-right">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={flowState.currentStep === 0}
                aria-label="بازگشت به مرحله قبلی"
                className={`${ICON_BUTTON_BASE} sm:hidden`}
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M7.5 5.25 12.5 10 7.5 14.75"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={flowState.currentStep === 0}
                className={NAV_BUTTON_BASE}
              >
                <span>مرحله قبلی</span>
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M7.5 5.25 12.5 10 7.5 14.75"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                aria-label="شروع مجدد پرسشنامه"
                className={`${ICON_BUTTON_BASE} sm:hidden`}
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M5.25 8.5V5.75h2.75M14.75 11.5v2.75H12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.5 13.5a5 5 0 0 0 8.5-3.5M13.5 6.5a5 5 0 0 0-8.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className={NAV_BUTTON_BASE}
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M5.25 8.5V5.75h2.75M14.75 11.5v2.75H12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.5 13.5a5 5 0 0 0 8.5-3.5M13.5 6.5a5 5 0 0 0-8.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>شروع مجدد</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedNow}
                aria-label={
                  currentStep.type === "review"
                    ? "مشاهده پیشنهادها"
                    : "مرحله بعدی"
                }
                className={`${ICON_BUTTON_BASE} sm:hidden`}
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M12.5 5.25 7.75 10 12.5 14.75"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedNow}
                className={NAV_BUTTON_BASE}
              >
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M12.5 5.25 7.75 10 12.5 14.75"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  {currentStep.type === "review" ? "مشاهده پیشنهادها" : "مرحله بعدی"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </KioskFrame>
  );
}
