"use client";

import { motion } from "framer-motion";
import { useFadeScaleVariants, useStaggeredListVariants } from "@/lib/motion";
import type { QuestionnaireAnswers } from "@/lib/questionnaire";
import {
  getSceneLabel,
  getVibeLabel,
  getIntensityLabel,
  getSafetyLabel,
} from "@/lib/questionnaire-mapper";
import { LABEL_LOOKUP } from "@/lib/kiosk-options";
import type { UserResponses } from "@/lib/questionnaire-mapper";

interface ReviewScreenProps {
  responses: UserResponses;
  answers: QuestionnaireAnswers;
  onEdit: (section: string) => void;
}

export default function ReviewScreen({ responses, answers, onEdit }: ReviewScreenProps) {
  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.1,
    staggerChildren: 0.06,
  });

  const itemVariants = useFadeScaleVariants({
    y: 16,
    scale: 0.98,
    blur: 8,
  });

  return (
    <motion.div
      className="flex flex-col gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {responses.scenes.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card backdrop-blur-xl glass-button-gradient-border rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
              صحنه‌های انتخاب شده
            </h3>
            <button
              onClick={() => onEdit("scenes")}
              className="btn-ghost text-xs sm:text-sm tap-highlight touch-target touch-feedback"
            >
              ویرایش
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {responses.scenes.map((sceneId) => (
              <span
                key={sceneId}
                className="glass-chip glass-chip--compact glass-chip--muted text-xs sm:text-sm"
              >
                {getSceneLabel(sceneId)}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {responses.vibePairs.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card backdrop-blur-xl glass-button-gradient-border rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
              ترجیحات استایل
            </h3>
            <button
              onClick={() => onEdit("vibes")}
              className="btn-ghost text-xs sm:text-sm tap-highlight touch-target touch-feedback"
            >
              ویرایش
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {responses.vibePairs.map((vibeId, index) => (
              <span
                key={`${vibeId}-${index}`}
                className="glass-chip glass-chip--compact glass-chip--muted text-xs sm:text-sm"
              >
                {getVibeLabel(vibeId, "left")} / {getVibeLabel(vibeId, "right")}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {responses.intensity && (
        <motion.div variants={itemVariants} className="glass-card backdrop-blur-xl glass-button-gradient-border rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
              شدت
            </h3>
            <button
              onClick={() => onEdit("intensity")}
              className="btn-ghost text-xs sm:text-sm tap-highlight touch-target touch-feedback"
            >
              ویرایش
            </button>
          </div>
          <span className="glass-chip glass-chip--compact glass-chip--accent text-xs sm:text-sm">
            {getIntensityLabel(responses.intensity)}
          </span>
        </motion.div>
      )}

      {answers.noteLikes.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card backdrop-blur-xl glass-button-gradient-border rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
              رایحه‌های مورد علاقه
            </h3>
            <button
              onClick={() => onEdit("notes")}
              className="btn-ghost text-xs sm:text-sm tap-highlight touch-target touch-feedback"
            >
              ویرایش
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {answers.noteLikes.map((note) => (
              <span
                key={note}
                className="glass-chip glass-chip--compact glass-chip--accent text-xs sm:text-sm"
              >
                {LABEL_LOOKUP[note] || note}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {answers.noteDislikes.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card backdrop-blur-xl glass-button-gradient-border rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
              رایحه‌های غیرقابل قبول
            </h3>
            <button
              onClick={() => onEdit("notes")}
              className="btn-ghost text-xs sm:text-sm tap-highlight touch-target touch-feedback"
            >
              ویرایش
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {answers.noteDislikes.map((note) => (
              <span
                key={note}
                className="glass-chip glass-chip--compact glass-chip--muted text-xs sm:text-sm border-red-500/30"
              >
                {LABEL_LOOKUP[note] || note}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}


