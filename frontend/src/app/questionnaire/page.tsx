"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPersianNumbers } from "@/lib/api";
import { useRouter } from "next/navigation";
import KioskFrame from "@/components/KioskFrame";
import { AnimatePresence, motion } from "framer-motion";
import {
  QUESTION_FLOW,
  QuestionnaireAnswers,
  QuestionDefinition,
  TOTAL_QUESTIONS,
  createInitialAnswers,
  serializeAnswers,
} from "@/lib/questionnaire";
import {
  signatureTransitions,
  useFadeScaleVariants,
  useStaggeredListVariants,
} from "@/lib/motion";

const BTN_BASE =
  "question-option text-base sm:text-lg font-semibold transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)] tap-highlight touch-target touch-feedback";

const ICON_BUTTON_BASE =
  "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[var(--color-foreground)] transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)] disabled:pointer-events-none disabled:opacity-40 tap-highlight touch-target touch-feedback";

const NAV_BUTTON_BASE =
  "hidden items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-foreground)] transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)] disabled:pointer-events-none disabled:opacity-50 tap-highlight touch-target touch-feedback sm:inline-flex sm:px-5 sm:py-2.5 sm:text-base md:text-lg";

const formatNumber = (value: number) => toPersianNumbers(String(value));

const AUTO_ADVANCE_CONFIRMATION_DURATION = 450;

const SECTION_TRANSITION_DURATION = signatureTransitions.section.duration ?? 0.6;
const DEFAULT_SIGNATURE_EASE =
  signatureTransitions.section.ease ??
  signatureTransitions.surface.ease ??
  signatureTransitions.page.ease ??
  signatureTransitions.hover.ease;
const SECTION_TRANSITION_EASE = DEFAULT_SIGNATURE_EASE;
const LIST_TRANSITION_DURATION = signatureTransitions.listItem.duration ?? 0.45;
const LIST_TRANSITION_EASE =
  signatureTransitions.listItem.ease ?? DEFAULT_SIGNATURE_EASE;
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

const questionSubheaderVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: SECTION_TRANSITION_DURATION * 0.9,
      ease: SECTION_TRANSITION_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: {
      duration: SECTION_TRANSITION_DURATION * 0.7,
      ease: SECTION_TRANSITION_EASE,
    },
  },
} as const;

const questionTitleVariants = {
  hidden: { opacity: 0, y: 18 },
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
    y: -14,
    transition: {
      duration: SECTION_TRANSITION_DURATION * 0.75,
      ease: SECTION_TRANSITION_EASE,
    },
  },
} as const;

const helperTextVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: SECTION_TRANSITION_DURATION * 0.8,
      ease: SECTION_TRANSITION_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: SECTION_TRANSITION_DURATION * 0.6,
      ease: SECTION_TRANSITION_EASE,
    },
  },
} as const;

const toggleSelection = (
  previous: QuestionnaireAnswers,
  question: QuestionDefinition,
  value: string
): { next: QuestionnaireAnswers; limited: boolean } => {
  const key = question.key;
  const currentValues = previous[key];
  const isSelected = currentValues.includes(value);

  if (question.type === "single") {
    return {
      next: { ...previous, [key]: isSelected ? [] : [value] },
      limited: false,
    };
  }

  if (
    !isSelected &&
    typeof question.maxSelections === "number" &&
    currentValues.length >= question.maxSelections
  ) {
    return { next: previous, limited: true };
  }

  const nextValues = isSelected
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value];

  return {
    next: { ...previous, [key]: nextValues },
    limited: false,
  };
};

const buildHelperText = (
  question: QuestionDefinition,
  selectedCount: number,
  limitReached: boolean,
  limitMessage: string | null
) => {
  if (limitMessage) return limitMessage;

  if (question.type === "multiple" && question.maxSelections) {
    const limit = formatNumber(question.maxSelections);
    if (selectedCount === 0) {
      return question.optional
        ? `می‌توانید حداکثر ${limit} مورد را به صورت اختیاری انتخاب کنید.`
        : `برای ادامه بین ۱ تا ${limit} گزینه انتخاب کنید.`;
    }
    const selected = formatNumber(selectedCount);
    return limitReached
      ? `حداکثر ${limit} مورد انتخاب شده است.`
      : `انتخاب شده: ${selected} از ${limit}`;
  }

  if (selectedCount === 0) {
    return question.optional
      ? "این سوال اختیاری است."
      : "برای ادامه لطفاً یک گزینه را انتخاب کنید.";
  }

  return "آماده ادامه هستید.";
};

export default function Questionnaire() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(() => createInitialAnswers());
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [showAutoAdvanceConfirmation, setShowAutoAdvanceConfirmation] =
    useState(false);
  const autoAdvanceAnimationFrameRef = useRef<number | null>(null);
  const autoAdvanceStartTimestampRef = useRef<number | null>(null);
  const questionSectionRef = useRef<HTMLElement | null>(null);
  const headingId = "questionnaire-heading";
  const helperId = "questionnaire-helper";

  const questions = QUESTION_FLOW;
  const currentQuestion = questions[currentStep];
  const totalQuestions = questions.length;
  const optionsContainerVariants = useStaggeredListVariants({
    delayChildren: SECTION_TRANSITION_DURATION * 0.35,
    staggerChildren: LIST_TRANSITION_DURATION * 0.3,
  });
  const optionVariants = useFadeScaleVariants({
    y: 26,
    scale: 0.94,
    blur: 14,
    duration: LIST_TRANSITION_DURATION,
    ease: LIST_TRANSITION_EASE,
    exitY: -18,
  });

  useEffect(() => {
    setLimitMessage(null);
    if (autoAdvanceAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(autoAdvanceAnimationFrameRef.current);
      autoAdvanceAnimationFrameRef.current = null;
    }
    autoAdvanceStartTimestampRef.current = null;
    setShowAutoAdvanceConfirmation(false);
  }, [currentQuestion]);

  useEffect(() => {
    return () => {
      if (autoAdvanceAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(autoAdvanceAnimationFrameRef.current);
        autoAdvanceAnimationFrameRef.current = null;
      }
      autoAdvanceStartTimestampRef.current = null;
    };
  }, []);

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
  }, [currentStep]);

  const reset = useCallback((nextAnswers: QuestionnaireAnswers) => {
    setAnswers(nextAnswers);
  }, []);

  const handleReset = useCallback(() => {
    if (autoAdvanceAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(autoAdvanceAnimationFrameRef.current);
      autoAdvanceAnimationFrameRef.current = null;
    }
    autoAdvanceStartTimestampRef.current = null;
    setShowAutoAdvanceConfirmation(false);
    setLimitMessage(null);
    reset(createInitialAnswers());
    setCurrentStep(0);
  }, [reset]);

  const next = useCallback(
    (overrideAnswers?: QuestionnaireAnswers) => {
      const answersToUse = overrideAnswers ?? answers;
      if (currentStep < totalQuestions - 1) {
        setCurrentStep((s) => Math.min(s + 1, totalQuestions - 1));
      } else {
        const qs = new URLSearchParams({ answers: serializeAnswers(answersToUse) });
        router.push(`/recommendations?${qs.toString()}`);
      }
    },
    [answers, currentStep, router, totalQuestions]
  );

  const toggle = useCallback(
    (value: string) => {
      if (autoAdvanceAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(autoAdvanceAnimationFrameRef.current);
        autoAdvanceAnimationFrameRef.current = null;
      }
      autoAdvanceStartTimestampRef.current = null;
      setShowAutoAdvanceConfirmation(false);

      let shouldAutoAdvance = false;
      let updatedAnswersSnapshot: QuestionnaireAnswers | null = null;

      setAnswers((prev) => {
        const wasSelected = prev[currentQuestion.key].includes(value);
        const { next: updatedAnswers, limited } = toggleSelection(prev, currentQuestion, value);
        if (limited) {
          if (currentQuestion.maxSelections) {
            const limit = formatNumber(currentQuestion.maxSelections);
            setLimitMessage(`حداکثر ${limit} انتخاب مجاز است.`);
          }
          return prev;
        }

        setLimitMessage(null);
        updatedAnswersSnapshot = updatedAnswers;

        const selectionCount = updatedAnswers[currentQuestion.key].length;
        const maxSelections =
          typeof currentQuestion.maxSelections === "number"
            ? currentQuestion.maxSelections
            : null;
        const reachedMax = maxSelections !== null && selectionCount === maxSelections;

        shouldAutoAdvance =
          !wasSelected &&
          ((currentQuestion.type === "single" && !currentQuestion.optional && selectionCount > 0) ||
            (reachedMax && !currentQuestion.optional));

        return updatedAnswers;
      });

      if (shouldAutoAdvance && updatedAnswersSnapshot) {
        const answersForAutoAdvance = updatedAnswersSnapshot;
        setShowAutoAdvanceConfirmation(true);

        const animate = (timestamp: number) => {
          if (autoAdvanceStartTimestampRef.current === null) {
            autoAdvanceStartTimestampRef.current = timestamp;
          }

          const elapsed = timestamp - autoAdvanceStartTimestampRef.current;

          if (elapsed >= AUTO_ADVANCE_CONFIRMATION_DURATION) {
            autoAdvanceAnimationFrameRef.current = null;
            autoAdvanceStartTimestampRef.current = null;
            setShowAutoAdvanceConfirmation(false);
            next(answersForAutoAdvance);
            return;
          }

          autoAdvanceAnimationFrameRef.current = window.requestAnimationFrame(animate);
        };

        autoAdvanceAnimationFrameRef.current = window.requestAnimationFrame(animate);
      }
    },
    [currentQuestion, next]
  );

  const back = () => currentStep > 0 && setCurrentStep((s) => s - 1);

  const selectedCount = answers[currentQuestion.key].length;
  const limitReached = Boolean(
    currentQuestion.maxSelections && selectedCount >= currentQuestion.maxSelections
  );

  const canProceed = currentQuestion.optional || selectedCount > 0;

  const helperText = buildHelperText(
    currentQuestion,
    selectedCount,
    limitReached,
    limitMessage
  );

  const progress = Math.round(((currentStep + 1) / TOTAL_QUESTIONS) * 100);

  return (
    <KioskFrame>
      <main
        aria-labelledby={headingId}
        className="page-main flex min-h-0 w-full flex-1 items-center justify-center px-2 py-4 sm:px-3 md:px-4 lg:px-6 xl:px-8"
      >
        <div className="glass-card page-panel flex h-full w-full min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.key}
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
                <motion.p
                  className="m-0 text-[11px] text-muted sm:text-xs"
                  aria-live="polite"
                  variants={questionSubheaderVariants}
                >
                  سوال {formatNumber(currentStep + 1)} از {formatNumber(TOTAL_QUESTIONS)}
                </motion.p>
                <motion.h1
                  id={headingId}
                  className="m-0 text-xl font-semibold leading-tight text-[var(--color-foreground)] xs:text-2xl md:text-[1.85rem]"
                  variants={questionTitleVariants}
                >
                  {currentQuestion.title}
                </motion.h1>
                {currentQuestion.description && (
                  <motion.p
                    className="m-0 text-xs text-muted sm:text-sm"
                    variants={questionSubheaderVariants}
                  >
                    {currentQuestion.description}
                  </motion.p>
                )}
              </motion.header>

              <motion.div
                className="space-y-3 text-right"
                variants={questionSubheaderVariants}
              >
                <div className="h-2 w-full rounded-full bg-soft" role="presentation">
                  <div
                    className="h-2 rounded-full bg-[var(--color-accent)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                    aria-hidden
                  />
                </div>
                <motion.p
                  id={helperId}
                  className="m-0 text-[11px] text-muted sm:text-xs"
                  aria-live="polite"
                  variants={helperTextVariants}
                >
                  {helperText}
                </motion.p>
                <div
                  role="status"
                  aria-live="polite"
                  className="relative flex min-h-[28px] justify-end text-[11px] font-medium text-[var(--color-accent)] sm:min-h-[30px] sm:text-xs"
                >
                  <AnimatePresence>
                    {showAutoAdvanceConfirmation && (
                      <motion.span
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="inline-flex rounded-full bg-[var(--color-accent)]/10 px-2 py-1"
                      >
                        انتخاب ثبت شد
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
                <div className="mb-2 hidden text-xs font-medium text-muted lg:block">گزینه‌های خود را لمس کنید</div>
                <div className="flex-1 min-h-0 pr-1">
                  <motion.div
                    className="grid w-full gap-2.5 sm:gap-3 md:gap-4"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))" }}
                    variants={optionsContainerVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                  >
                    {currentQuestion.options.map((option) => {
                  const values = answers[currentQuestion.key];
                  const isSelected = values.includes(option.value);
                  const disabled =
                    !isSelected &&
                    typeof currentQuestion.maxSelections === "number" &&
                    values.length >= currentQuestion.maxSelections;
                  return (
                    <motion.button
                      key={option.value}
                      onClick={() => toggle(option.value)}
                      disabled={disabled}
                      aria-pressed={isSelected}
                      variants={optionVariants}
                      className={`${BTN_BASE} ${
                        isSelected ? "question-option--selected" : "question-option--default"
                      } ${disabled ? "question-option--disabled" : ""} min-h-[56px] text-sm sm:min-h-[60px] sm:text-base md:min-h-[68px] md:text-lg`}
                    >
                      <span className="flex-1 text-right">{option.label}</span>
                      {currentQuestion.type === "multiple" && isSelected && (
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[0.7rem] text-muted">انتخاب شده</span>
                      )}
                    </motion.button>
                  );
                })}
                    {currentQuestion.options.length === 0 && (
                      <div className="glass-surface col-span-full flex h-full items-center justify-center rounded-2xl p-6 text-xs text-muted sm:text-sm">
                        گزینه‌ای یافت نشد.
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.section>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-3 text-right">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={back}
                disabled={currentStep === 0}
                aria-label="بازگشت به سوال قبلی"
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
                onClick={back}
                disabled={currentStep === 0}
                className={NAV_BUTTON_BASE}
              >
                <span>سوال قبلی</span>
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
                onClick={() => next()}
                disabled={!canProceed}
                aria-label={
                  currentStep === totalQuestions - 1
                    ? "مشاهده پیشنهادها"
                    : "سوال بعدی"
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
                onClick={() => next()}
                disabled={!canProceed}
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
                  {currentStep === totalQuestions - 1 ? "مشاهده پیشنهادها" : "سوال بعدی"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </KioskFrame>
  );
}

