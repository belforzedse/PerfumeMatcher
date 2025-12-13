"use client";

import React, { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
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
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";

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
  isKiosk = false,
}: {
  title: string;
  subtitle?: string;
  count: number;
  onEdit: () => void;
  className?: string;
  isKiosk?: boolean;
}) {
  return (
    <div
      className={cn(
        "col-span-full flex items-center justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <div className={cn("flex items-center gap-2", isKiosk && "gap-3")}>
          <span
            className={cn(
              "font-semibold text-[var(--color-foreground)]",
              isKiosk ? "text-sm sm:text-base" : "text-xs"
            )}
          >
            {title}
          </span>
          <span
            className={cn("text-muted", isKiosk ? "text-sm" : "text-[11px]")}
          >
            ({count})
          </span>
        </div>

        {subtitle ? (
          <p
            className={cn(
              "m-0 mt-0.5 text-muted line-clamp-1",
              isKiosk ? "text-sm" : "text-[11px]"
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* ✅ Only show edit control in kiosk mode */}
      {isKiosk ? (
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "tap-highlight touch-target touch-feedback",
            "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/10 px-4 py-2",
            "backdrop-blur-md transition-transform duration-150 hover:scale-[1.02]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]"
          )}
          aria-label={`ویرایش بخش ${title}`}
        >
          <BiPencil className="text-base" />
          <span className="text-sm font-semibold">ویرایش</span>
        </button>
      ) : null}
    </div>
  );
}

function Chip({
  chip,
  isRtl,
  variants,
  onClick,
  isKiosk = false,
}: {
  chip: ReviewChip;
  isRtl: boolean;
  variants: Variants;
  onClick: () => void;
  isKiosk?: boolean;
}) {
  const base =
    "glass-chip glass-chip--compact inline-flex items-center rounded-full font-semibold";
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
      className={cn(
        "tap-highlight touch-target touch-feedback",
        "transition-transform duration-150 hover:scale-[1.02]",
        base,
        tone,
        layout,
        isKiosk ? "gap-2.5 px-4 py-3 text-sm" : "gap-1.5 px-3 py-2 text-xs"
      )}
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
          <Icon emoji={chip.icon} size={isKiosk ? 18 : 16} />
        </span>
      ) : null}
      <span className={cn("line-clamp-1", isKiosk && "max-w-[30ch]")}>
        {chip.label}
      </span>
    </motion.button>
  );
}

function KioskCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-surface backdrop-blur-xl glass-chip-gradient-border rounded-3xl",
        "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export default function ReviewScreen({
  responses,
  answers,
  onEdit,
}: ReviewScreenProps) {
  const isKiosk = useKioskMode();

  const containerVariants = useStaggeredListVariants({
    delayChildren: 0.04,
    staggerChildren: 0.02,
  });

  const itemVariants = useFadeScaleVariants({
    y: isKiosk ? 10 : 8,
    scale: 0.99,
    blur: 6,
  }) as Variants;

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

  // ✅ KIOSK LAYOUT (only)
  if (isKiosk) {
    const sceneCount = sceneChips.length;
    const vibeCount = vibeChips.length;
    const noteCount = likeChips.length + dislikeChips.length;

    return (
      <motion.div
        dir="rtl"
        className={cn(
          "h-full min-h-0 w-full",
          // fill the kiosk panel better (less dead space)
          "grid grid-cols-12 grid-rows-[auto_minmax(0,1fr)] gap-5"
        )}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Summary strip (fills top a bit and adds clarity) */}
        <div className="col-span-12">
          <div className="glass-surface backdrop-blur-xl glass-chip-gradient-border rounded-3xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-[var(--color-foreground)]">
                  خلاصه انتخاب‌ها
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-[var(--color-foreground)]">
                  صحنه‌ها: <span className="font-semibold">{sceneCount}</span>
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-[var(--color-foreground)]">
                  شخصیت:{" "}
                  <span className="font-semibold">
                    {vibeCount + (intensityChip ? 1 : 0)}
                  </span>
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-[var(--color-foreground)]">
                  نُت‌ها: <span className="font-semibold">{noteCount}</span>
                </span>
              </div>

              <div className="text-sm text-muted">
                برای ویرایش، روی هر مورد کلیک کنید
              </div>
            </div>
          </div>
        </div>

        {/* Main grid: left big (notes), right stack (scenes + personality) */}
        <div className="col-span-7 min-h-0">
          <KioskCard className="h-full min-h-0 flex flex-col">
            <SectionHeader
              title="نُت‌ها"
              subtitle="دوست داری / دوست نداری"
              count={noteCount}
              onEdit={() => onEdit("notes")}
              isKiosk
            />

            <div className="mt-5 grid min-h-0 flex-1 grid-cols-2 gap-4">
              {/* Likes */}
              <div className="rounded-3xl border border-black/10 bg-white/6 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--color-accent)]">
                    دوست دارم
                  </span>
                  <span className="text-sm text-muted">
                    ({likeChips.length})
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {likeChips.length ? (
                    likeChips.map((c) => (
                      <Chip
                        key={c.id}
                        chip={c}
                        isRtl={isRtl}
                        variants={itemVariants}
                        onClick={() => onEdit(c.editSection)}
                        isKiosk
                      />
                    ))
                  ) : (
                    <div className="mt-6 w-full text-center text-sm text-muted">
                      انتخاب نشده
                    </div>
                  )}
                </div>
              </div>

              {/* Dislikes */}
              <div className="rounded-3xl border border-black/10 bg-white/6 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-red-700">
                    دوست ندارم
                  </span>
                  <span className="text-sm text-muted">
                    ({dislikeChips.length})
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {dislikeChips.length ? (
                    dislikeChips.map((c) => (
                      <Chip
                        key={c.id}
                        chip={c}
                        isRtl={isRtl}
                        variants={itemVariants}
                        onClick={() => onEdit(c.editSection)}
                        isKiosk
                      />
                    ))
                  ) : (
                    <div className="mt-6 w-full text-center text-sm text-muted">
                      انتخاب نشده
                    </div>
                  )}
                </div>
              </div>
            </div>
          </KioskCard>
        </div>

        <div className="col-span-5 min-h-0 flex flex-col gap-5">
          {/* Scenes */}
          {sceneChips.length > 0 ? (
            <KioskCard className="min-h-0 flex-1 flex flex-col">
              <SectionHeader
                title="صحنه‌ها"
                subtitle="جاهایی که دوست داری عطر تو اون فضاها حس بشه"
                count={sceneChips.length}
                onEdit={() => onEdit("scenes")}
                isKiosk
              />

              <div className="mt-5 flex-1">
                <div className="flex flex-wrap gap-3 content-start">
                  {sceneChips.map((c) => (
                    <Chip
                      key={c.id}
                      chip={c}
                      isRtl={isRtl}
                      variants={itemVariants}
                      onClick={() => onEdit(c.editSection)}
                      isKiosk
                    />
                  ))}
                </div>
              </div>
            </KioskCard>
          ) : null}

          {/* Personality */}
          {vibeChips.length > 0 || intensityChip ? (
            <KioskCard className="min-h-0 flex-1 flex flex-col">
              <SectionHeader
                title="شخصیت"
                subtitle="حس‌و‌حال + شدت حضور"
                count={vibeChips.length + (intensityChip ? 1 : 0)}
                onEdit={() => onEdit("vibes")}
                isKiosk
              />

              <div className="mt-5 flex-1">
                <div className="flex flex-wrap gap-3 content-start">
                  {intensityChip ? (
                    <Chip
                      chip={intensityChip}
                      isRtl={isRtl}
                      variants={itemVariants}
                      onClick={() => onEdit(intensityChip.editSection)}
                      isKiosk
                    />
                  ) : null}

                  {vibeChips.map((c) => (
                    <Chip
                      key={c.id}
                      chip={c}
                      isRtl={isRtl}
                      variants={itemVariants}
                      onClick={() => onEdit(c.editSection)}
                      isKiosk
                    />
                  ))}
                </div>
              </div>
            </KioskCard>
          ) : null}
        </div>
      </motion.div>
    );
  }

  // ✅ NORMAL MODE: keep exactly your original structure (pre-kiosk edits)
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
            isKiosk={false}
          />
          <div className="col-span-full flex flex-wrap gap-2">
            {sceneChips.map((c) => (
              <Chip
                key={c.id}
                chip={c}
                isRtl={isRtl}
                variants={itemVariants}
                onClick={() => onEdit(c.editSection)}
                isKiosk={false}
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
            isKiosk={false}
          />

          <div className="col-span-full flex flex-wrap gap-2">
            {intensityChip ? (
              <Chip
                chip={intensityChip}
                isRtl={isRtl}
                variants={itemVariants}
                onClick={() => onEdit(intensityChip.editSection)}
                isKiosk={false}
              />
            ) : null}

            {vibeChips.map((c) => (
              <Chip
                key={c.id}
                chip={c}
                isRtl={isRtl}
                variants={itemVariants}
                onClick={() => onEdit(c.editSection)}
                isKiosk={false}
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
            isKiosk={false}
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
                      isKiosk={false}
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
                      isKiosk={false}
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
