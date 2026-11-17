"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toPersianNumbers } from "@/lib/locale";
import { useRouter } from "next/navigation";
import KioskFrame from "@/components/KioskFrame";
import { AnimatePresence, motion } from "framer-motion";
import { serializeAnswers } from "@/lib/questionnaire";
import { GENDER_CHOICES } from "@/lib/kiosk-options";
import { signatureTransitions } from "@/lib/motion";
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
  type ScentTraitId,
} from "@/lib/questionnaire-mapper";
import ScentTraitsStep from "@/components/questionnaire/ScentTraitsStep";
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import PathSelector from "@/components/questionnaire/PathSelector";
import GenderStep from "@/components/questionnaire/GenderStep";
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

function updateResponses(state: FlowState, responses: UserResponses): FlowState {
  return updateConfidence({ ...state, responses }, mapResponsesToAnswers(responses));
}

function isCurrentQuestion(state: FlowState, renderedState: FlowState): boolean {
  return state.steps === renderedState.steps && state.currentStep === renderedState.currentStep;
}

export default function Questionnaire() {
  const router = useRouter();
  const isKiosk = useKioskMode();
  const [flowState, setFlowState] = useState<FlowState>(createInitialFlowState);
  const answers = useMemo(
    () => flowState.path ? mapResponsesToAnswers(flowState.responses) : null,
    [flowState.path, flowState.responses],
  );
  const [microReward, setMicroReward] = useState<string | null>(null);
  const questionSectionRef = useRef<HTMLElement | null>(null);
  const headingId = "questionnaire-heading";
  const helperId = "questionnaire-helper";

  const currentStep = getCurrentStep(flowState);
  const progress = getProgress(flowState);

  const committedFlowRef = useRef(flowState);
  useLayoutEffect(() => {
    committedFlowRef.current = flowState;
  }, [flowState]);

  const updateCurrentResponses = useCallback((update: (responses: UserResponses) => UserResponses) => {
    // AnimatePresence retains outgoing children with their old event handlers.
    if (!isCurrentQuestion(committedFlowRef.current, flowState)) return false;
    setFlowState((previous) => isCurrentQuestion(previous, flowState)
      ? updateResponses(previous, update(previous.responses))
      : previous);
    return true;
  }, [flowState]);

  const sceneChoices = useMemo(() => getSceneChoices(), []);
  const vibePairs = useMemo(() => getVibePairs(), []);
  const intensityChoices = useMemo(() => getIntensityChoices(), []);
  const safetyChoices = useMemo(() => getSafetyChoices(), []);
  const genderChoices = useMemo(() => GENDER_CHOICES, []);

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

  // Track pending auto-advance timeouts to cancel them when needed
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showMicroReward = useCallback(() => {
    const reward = MICRO_REWARDS[Math.floor(Math.random() * MICRO_REWARDS.length)];
    setMicroReward(reward);
    // Longer display time in kiosk mode for better visibility
    setTimeout(() => setMicroReward(null), isKiosk ? 3000 : 2000);
  }, [isKiosk]);

  const handleNext = useCallback(() => {
    if (!answers) return;

    const nextStepIndex = getNextStep(flowState);
    if (nextStepIndex === null) {
      const qs = new URLSearchParams({ answers: serializeAnswers(answers) });
      router.push(`/recommendations?${qs.toString()}`);
    } else {
      setFlowState((prev) => isCurrentQuestion(prev, flowState)
        ? { ...prev, currentStep: getNextStep(prev) ?? prev.currentStep }
        : prev);
    }
  }, [flowState, answers, router]);


  // Auto-advance helper - uses current state via setFlowState callback
  const autoAdvance = useCallback((renderedState: FlowState) => {
    if (!isCurrentQuestion(committedFlowRef.current, renderedState)) return;
    // Cancel any pending auto-advance
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
setFlowState((prev) => {
  const step = prev.steps[prev.currentStep];

  if (
    !step ||
    step.type === "review" ||
    step.type === "safety-step" ||
    !canProceed(prev)
  ) {
    return prev;
  }

  return {
    ...prev,
    currentStep: prev.currentStep + 1,
  };
});



    // Longer delay in kiosk mode for better UX
    const delay = isKiosk ? 2200 : 1200;

    autoAdvanceTimeoutRef.current = setTimeout(() => {
      setFlowState((prev) => {
        if (!isCurrentQuestion(prev, renderedState)) return prev;
        // Don't auto-advance on review page, safety step (optional), or if can't proceed
        const currentStep = getCurrentStep(prev);

        const nextStepIndex = getNextStep(prev);
        if (nextStepIndex === null) return prev;
        return { ...prev, currentStep: nextStepIndex };
      });
      autoAdvanceTimeoutRef.current = null;
    }, delay); // Delay to show feedback (longer in kiosk mode)
  }, [isKiosk]);

  useEffect(() => () => {
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
  }, []);

  const handlePathSelect = useCallback((path: QuestionPath) => {
    if (!isCurrentQuestion(committedFlowRef.current, flowState)) return;
    setFlowState((previous) => isCurrentQuestion(previous, flowState) ? initializeFlow(path) : previous);
    showMicroReward();
  }, [flowState, showMicroReward]);


  const handleSceneToggle = useCallback(
    (sceneId: string) => {
      const responses = committedFlowRef.current.responses;
      const wasSelected = responses.scenes.includes(sceneId);
      if (!updateCurrentResponses((previous) => ({
        ...previous,
        scenes: previous.scenes.includes(sceneId)
          ? previous.scenes.filter((id) => id !== sceneId)
          : [...previous.scenes, sceneId].slice(0, 5),
      }))) return;
      showMicroReward();

    },
    [flowState, updateCurrentResponses, showMicroReward, autoAdvance]
  );

  const handleGenderSelect = useCallback(
    (gender: string) => {
      const previousGender = committedFlowRef.current.responses.gender;
      if (!updateCurrentResponses((previous) => ({ ...previous, gender }))) return;
      showMicroReward();
      if (previousGender !== gender) {
        setTimeout(() => autoAdvance(flowState), 100);
      }
    },
    [flowState, updateCurrentResponses, showMicroReward, autoAdvance]
  );

  const handleSafetyToggle = useCallback(
    (safetyId: string) => {
      updateCurrentResponses((previous) => ({
        ...previous,
        safetyChecks: previous.safetyChecks.includes(safetyId)
          ? previous.safetyChecks.filter((id) => id !== safetyId)
          : [...previous.safetyChecks, safetyId],
      }));
    },
    [updateCurrentResponses]
  );

  const handleVibeSelect = useCallback(
    (choice: "left" | "right" | "none") => {
      const pairwiseIndex = flowState.steps
        .slice(0, flowState.currentStep + 1)
        .filter((step) => step.type === "pairwise").length - 1;
      const vibePair = vibePairs[pairwiseIndex % vibePairs.length];
      if (!vibePair) return;

      if (!updateCurrentResponses((previous) => {
        const newVibePairs = [...previous.vibePairs];
        newVibePairs[pairwiseIndex] = `${vibePair.id}:${choice}`;
        return { ...previous, vibePairs: newVibePairs };
      })) return;
      showMicroReward();
      if (choice !== "none") {
        setTimeout(() => autoAdvance(flowState), 100);
      }
    },
    [flowState, vibePairs, updateCurrentResponses, showMicroReward, autoAdvance]
  );
  const handleScentTraitChange = useCallback(
   (trait: ScentTraitId, value: number) => {
     updateCurrentResponses((previous) => ({
       ...previous,
      scentTraits: {
         ...(previous.scentTraits ?? {}),
         [trait]: value,
       },
     }));
   },
   [updateCurrentResponses]
   );

  const handleIntensitySelect = useCallback(
    (intensityId: string) => {
      if (!updateCurrentResponses((previous) => ({ ...previous, intensity: intensityId }))) return;
      showMicroReward();
    },
    [updateCurrentResponses, showMicroReward]
  );

  const handleQuickFireLike = useCallback(
    (noteId: string) => {
      updateCurrentResponses((previous) => ({
        ...previous,
        quickFireLikes: previous.quickFireLikes.includes(noteId)
          ? previous.quickFireLikes.filter((id) => id !== noteId)
          : [...previous.quickFireLikes, noteId].slice(0, 5),
      }));
    },
    [updateCurrentResponses]
  );

  const handleQuickFireDislike = useCallback(
    (noteId: string) => {
      updateCurrentResponses((previous) => ({
        ...previous,
        quickFireDislikes: previous.quickFireDislikes.includes(noteId)
          ? previous.quickFireDislikes.filter((id) => id !== noteId)
          : [...previous.quickFireDislikes, noteId].slice(0, 5),
      }));
    },
    [updateCurrentResponses]
  );

  const handleBack = useCallback(() => {
    // Cancel any pending auto-advance when going back
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    setFlowState((prev) => {
      if (prev.currentStep > 0) {
        return { ...prev, currentStep: prev.currentStep - 1 };
      }
      return prev;
    });
  }, []);

  const handleReset = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    setFlowState(createInitialFlowState());
    setMicroReward(null);
  }, []);

  const handleEdit = useCallback((section: string) => {
    if (!isCurrentQuestion(committedFlowRef.current, flowState)) return;
    setFlowState((prev) => {
      if (!isCurrentQuestion(prev, flowState)) return prev;
      let targetStep = 0;
      switch (section) {
        case "scenes":
          targetStep = prev.steps.findIndex((s) => s.type === "scene-cards");
          break;
        case "vibes":
          targetStep = prev.steps.findIndex((s) => s.type === "pairwise");
          break;
        case "gender":
          targetStep = prev.steps.findIndex((s) => s.type === "gender");
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
  }, [flowState]);

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
        className={cn(
          "page-main flex min-h-0 w-full flex-1 items-stretch justify-center",
          // Allow shadows to render - use overflow-y-auto instead of overflow-hidden
          isKiosk ? "overflow-y-auto overflow-x-hidden px-8 py-8" : "overflow-hidden px-2 py-4 sm:px-3 md:px-4 lg:px-6 xl:px-8"
        )}
      >
        <div className={cn(
          "glass-card backdrop-blur-xl glass-gradient-border page-panel flex h-full w-full min-h-0 flex-1 flex-col",
          isKiosk ? "gap-8 p-10" : "gap-6 p-6 sm:p-8",
          // Ensure shadows can render in kiosk mode
          isKiosk && "overflow-y-auto overflow-x-hidden"
        )}>
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
                className={cn("space-y-2 text-right", isKiosk && "space-y-4")}
                variants={questionHeaderVariants}
              >
                {flowState.path && (
                  <motion.p
                    className={cn(
                      "m-0 text-muted",
                      isKiosk ? "text-sm" : "text-[11px] sm:text-xs"
                    )}
                    aria-live="polite"
                    variants={questionHeaderVariants}
                  >
                    مرحله {formatNumber(flowState.currentStep)} از {formatNumber(flowState.steps.length)}
                  </motion.p>
                )}
                <motion.h1
                  id={headingId}
                  className={cn(
                    "m-0 font-semibold leading-tight text-[var(--color-foreground)]",
                    isKiosk
                      ? "text-4xl leading-snug"
                      : "text-xl xs:text-2xl md:text-[1.85rem]"
                  )}
                  variants={questionHeaderVariants}
                >
                  {currentStep.title}
                </motion.h1>
                {currentStep.description && (
                  <motion.p
                    className={cn(
                      "m-0 text-muted",
                      isKiosk ? "text-lg leading-relaxed" : "text-xs sm:text-sm"
                    )}
                    variants={questionHeaderVariants}
                  >
                    {currentStep.description}
                  </motion.p>
                )}
              </motion.header>

              <motion.div
                className={cn("space-y-3 text-right", isKiosk && "space-y-4")}
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
                className={cn(
                  "page-panel__scroll flex flex-1 min-h-0 flex-col text-right",
                  // Allow shadows to render in kiosk mode
                  isKiosk && "overflow-visible"
                )}
                aria-describedby={helperId}
                variants={questionHeaderVariants}
              >
                {currentStep.type === "path-selection" && (
                  <PathSelector onSelect={handlePathSelect} />
                )}

                {currentStep.type === "gender" && (
                  <GenderStep
                    options={genderChoices}
                    selected={flowState.responses.gender ?? null}
                    onSelect={handleGenderSelect}
                  />
                )}

                {currentStep.type === "scene-cards" && (
                  <SceneCard
                    scenes={sceneChoices}
                    selected={flowState.responses.scenes}
                    maxSelections={5}
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

                {currentStep.type === "pairwise" && currentStep.id === "vibe-1" && (
                  <ScentTraitsStep
                    values={flowState.responses.scentTraits ?? {}}
                    onChange={handleScentTraitChange}
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
                    maxSelections={5}
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
                className={cn(
                  ICON_BUTTON_BASE,
                  "sm:hidden",
                  isKiosk && "h-16 w-16 min-h-[64px] min-w-[64px]"
                )}
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
                className={cn(
                  NAV_BUTTON_BASE,
                  isKiosk && "min-h-[64px] px-6 py-3 text-lg"
                )}
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
                className={cn(
                  ICON_BUTTON_BASE,
                  "sm:hidden",
                  isKiosk && "h-16 w-16 min-h-[64px] min-w-[64px]"
                )}
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
                className={cn(
                  NAV_BUTTON_BASE,
                  isKiosk && "min-h-[64px] px-6 py-3 text-lg"
                )}
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
                  currentStep.type === "review" ||
                    currentStep.type === "quick-fire-notes"
                    ? "مشاهده پیشنهادها"
                    : "مرحله بعدی"
                }
                className={cn(
                  ICON_BUTTON_BASE,
                  "sm:hidden",
                  isKiosk && "h-16 w-16 min-h-[64px] min-w-[64px]"
                )}
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
                className={cn(
                  NAV_BUTTON_BASE,
                  isKiosk && "min-h-[64px] px-6 py-3 text-lg"
                )}
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
  {currentStep.type === "review" ||
  currentStep.type === "quick-fire-notes"
    ? "مشاهده پیشنهادها"
    : "مرحله بعدی"}
</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </KioskFrame>
  );
}
