"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { BiPencil } from "react-icons/bi";

import { useFadeScaleVariants, useStaggeredListVariants } from "@/lib/motion";
import type { QuestionnaireAnswers } from "@/lib/questionnaire";
import type { UserResponses } from "@/lib/questionnaire-mapper";
import { NOTE_CHOICES } from "@/lib/kiosk-options";
import { Icon } from "@/lib/icons";
import {
  getSceneChoices,
  getVibePairs,
  getIntensityChoices,
} from "@/lib/questionnaire-mapper";

interface ReviewScreenProps {
  responses: UserResponses;
  answers: QuestionnaireAnswers;
  onEdit: (section: string) => void;
}

type ChipKind = "neutral" | "accent" | "danger";

type ReviewChip = {
  id: string;
  label: string;
  icon?: string;
  editSection: string;
  kind: ChipKind;
};

function SectionHeader({
  title,
  subtitle,
  count,
  onEdit,
  className = "",
}: {
  title: string;
  subtitle?: string;
  count: number;
  onEdit: () => void;
  className?: string;
}) {
  return (
    <div
      className={[
        "col-span-full flex items-center justify-between",
        className,
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-foreground)]">
            {title}
          </span>
          <span className="text-[11px] text-muted">({count})</span>
        </div>
        {subtitle ? (
          <p className="m-0 mt-0.5 text-[11px] text-muted line-clamp-1">
            {subtitle}
          </p>
        ) : null}
      </div>

    
    </div>
  );
}

function Chip({
  chip,
  isRtl,
  variants,
  onClick,
}: {
  chip: ReviewChip;
  isRtl: boolean;
  variants: any;
  onClick: () => void;
}) {
  const base =
    "glass-chip glass-chip--compact inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold";
  const layout = isRtl ? "flex-row-reverse" : "flex-row";

  const tone =
    chip.kind === "danger"
      ? "border border-red-500/25 bg-red-500/8 text-red-700"
      : chip.kind === "accent"
      ? "border border-[var(--color-accent)]/22 bg-[var(--color-accent-soft)]/14 text-[var(--color-accent)]"
      : "border border-[var(--color-border)] bg-white/10 text-[var(--color-foreground)]";

  return (
    <motion.button
      type="button"
      variants={variants}
      onClick={onClick}
      className={[
        "tap-highlight touch-target touch-feedback",
        "transition-transform duration-150 hover:scale-[1.02]",
        base,
        tone,
        layout,
      ].join(" ")}
    >
      {chip.icon ? (
        <span
          className={
            chip.kind === "danger"
              ? "text-red-600"
              : chip.kind === "accent"
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-foreground)]"
          }
        >
          <Icon emoji={chip.icon} size={16} />
        </span>
      ) : null}
      <span className="line-clamp-1">{chip.label}</span>
    </motion.button>
  );
}

export default function ReviewScreen({
  responses,
  answers,
  onEdit,
}: ReviewScreenProps) {
  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.04,
    staggerChildren: 0.02,
  });

  const itemVariants = useFadeScaleVariants({
    y: 8,
    scale: 0.99,
    blur: 6,
  });

  const isRtl = useMemo(() => {
    if (typeof window === "undefined") return true;
    const dir = document.documentElement.getAttribute("dir");
    if (dir) return dir.toLowerCase() === "rtl";
    return getComputedStyle(document.documentElement).direction === "rtl";
  }, []);

  // Preload mappings once
  const sceneChoices = useMemo(() => getSceneChoices(), []);
  const vibePairs = useMemo(() => getVibePairs(), []);
  const intensityChoices = useMemo(() => getIntensityChoices(), []);

  const sceneMap = useMemo(
    () => new Map(sceneChoices.map((s) => [s.id, s])),
    [sceneChoices]
  );
  const vibeMap = useMemo(
    () => new Map(vibePairs.map((v) => [v.id, v])),
    [vibePairs]
  );
  const intensityMap = useMemo(
    () => new Map(intensityChoices.map((i) => [i.id, i])),
    [intensityChoices]
  );
  const noteMap = useMemo(
    () => new Map(NOTE_CHOICES.map((n) => [n.value, n])),
    []
  );

  const sceneChips: ReviewChip[] = useMemo(() => {
    return (responses.scenes ?? [])
      .map((id) => {
        const s = sceneMap.get(id);
        if (!s) return null;
        return {
          id: `scene-${id}`,
          label: s.label,
          icon: s.icon,
          editSection: "scenes",
          kind: "neutral" as const,
        };
      })
      .filter(Boolean) as ReviewChip[];
  }, [responses.scenes, sceneMap]);

  const vibeChips: ReviewChip[] = useMemo(() => {
    const chips: ReviewChip[] = [];
    (responses.vibePairs ?? []).forEach((entry, idx) => {
      if (!entry) return;
      const [vibeId, side] = entry.split(":");
      const v = vibeMap.get(vibeId);
      if (!v) return;
      const chosen = side === "left" ? v.left : v.right;
      if (!chosen) return;

      chips.push({
        id: `vibe-${entry}-${idx}`,
        label: chosen.label,
        icon: chosen.icon,
        editSection: "vibes",
        kind: "neutral",
      });
    });
    return chips;
  }, [responses.vibePairs, vibeMap]);

  const intensityChip: ReviewChip | null = useMemo(() => {
    if (!responses.intensity) return null;
    const it = intensityMap.get(responses.intensity);
    if (!it) return null;
    return {
      id: `intensity-${responses.intensity}`,
      label: it.label,
      icon: it.icon,
      editSection: "intensity",
      kind: "accent",
    };
  }, [responses.intensity, intensityMap]);

  const likeChips: ReviewChip[] = useMemo(() => {
    return (answers.noteLikes ?? [])
      .map((val) => {
        const n = noteMap.get(val);
        if (!n) return null;
        return {
          id: `like-${val}`,
          label: n.label,
          icon: n.icon,
          editSection: "notes",
          kind: "accent" as const,
        };
      })
      .filter(Boolean) as ReviewChip[];
  }, [answers.noteLikes, noteMap]);

  const dislikeChips: ReviewChip[] = useMemo(() => {
    return (answers.noteDislikes ?? [])
      .map((val) => {
        const n = noteMap.get(val);
        if (!n) return null;
        return {
          id: `dislike-${val}`,
          label: n.label,
          icon: n.icon,
          editSection: "notes",
          kind: "danger" as const,
        };
      })
      .filter(Boolean) as ReviewChip[];
  }, [answers.noteDislikes, noteMap]);

  return (
    <motion.div
      className="grid grid-cols-1 gap-3 sm:gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Scenes */}
      {sceneChips.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          <SectionHeader
            title="صحنه‌ها"
            subtitle="جاهایی که دوست داری عطر تو اون فضاها حس بشه"
            count={sceneChips.length}
            onEdit={() => onEdit("scenes")}
          />
          <div className="col-span-full flex flex-wrap gap-2">
            {sceneChips.map((c) => (
              <Chip
                key={c.id}
                chip={c}
                isRtl={isRtl}
                variants={itemVariants}
                onClick={() => onEdit(c.editSection)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Personality: vibes + intensity together (dense) */}
      {vibeChips.length > 0 || intensityChip ? (
        <div className="grid grid-cols-1 gap-2">
          <SectionHeader
            title="شخصیت"
            subtitle="حس‌و‌حال + شدت حضور"
            count={vibeChips.length + (intensityChip ? 1 : 0)}
            onEdit={() => onEdit("vibes")}
          />

          <div className="col-span-full flex flex-wrap gap-2">
            {intensityChip ? (
              <Chip
                chip={intensityChip}
                isRtl={isRtl}
                variants={itemVariants}
                onClick={() => onEdit(intensityChip.editSection)}
              />
            ) : null}

            {vibeChips.map((c) => (
              <Chip
                key={c.id}
                chip={c}
                isRtl={isRtl}
                variants={itemVariants}
                onClick={() => onEdit(c.editSection)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Notes: 2-column feel on mobile without big cards */}
      {likeChips.length > 0 || dislikeChips.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          <SectionHeader
            title="نُت‌ها"
            subtitle="دوست داری / دوست نداری"
            count={likeChips.length + dislikeChips.length}
            onEdit={() => onEdit("notes")}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* Likes */}
            <div className="glass-surface backdrop-blur-xl glass-chip-gradient-border rounded-2xl p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--color-accent)]">
                  دوست دارم
                </span>
                <span className="text-[11px] text-muted">
                  ({likeChips.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {likeChips.length ? (
                  likeChips.map((c) => (
                    <Chip
                      key={c.id}
                      chip={c}
                      isRtl={isRtl}
                      variants={itemVariants}
                      onClick={() => onEdit(c.editSection)}
                    />
                  ))
                ) : (
                  <span className="text-[11px] text-muted">انتخاب نشده</span>
                )}
              </div>
            </div>

            {/* Dislikes */}
            <div className="glass-surface backdrop-blur-xl glass-chip-gradient-border rounded-2xl p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-red-700">
                  دوست ندارم
                </span>
                <span className="text-[11px] text-muted">
                  ({dislikeChips.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dislikeChips.length ? (
                  dislikeChips.map((c) => (
                    <Chip
                      key={c.id}
                      chip={c}
                      isRtl={isRtl}
                      variants={itemVariants}
                      onClick={() => onEdit(c.editSection)}
                    />
                  ))
                ) : (
                  <span className="text-[11px] text-muted">انتخاب نشده</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
