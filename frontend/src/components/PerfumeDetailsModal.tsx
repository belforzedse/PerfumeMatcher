"use client";

import { useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { type RankedPerfume } from "@/lib/perfume-matcher";
import { toPersianNumbers } from "@/lib/api";
import { useSharePerfume } from "@/lib/useSharePerfume";

const formatNumber = (value: number) => toPersianNumbers(String(value));

// Notes are displayed as-is (assumed to be in Persian if needed)
// No translation needed - display notes directly from data
function formatNotes(notes: string[]): string[] {
  if (!Array.isArray(notes)) {
    return [];
  }
  return notes.filter((note) => typeof note === "string" && note.trim().length > 0);
}

interface PerfumeDetailsModalProps {
  perfume: RankedPerfume | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PerfumeDetailsModal({
  perfume,
  isOpen,
  onClose,
}: PerfumeDetailsModalProps) {
  const sharePerfume = useSharePerfume();

  const handleShare = useCallback(() => {
    if (perfume) {
      void sharePerfume(perfume);
    }
  }, [perfume, sharePerfume]);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Format notes for display (no translation needed - display as-is)
  // MUST be called before early return to follow Rules of Hooks
  const displayNotes = useMemo(() => {
    if (!perfume) {
      return { top: [], middle: [], base: [] };
    }
    try {
      const notes = perfume.notes || { top: [], middle: [], base: [] };
      return {
        top: Array.isArray(notes.top) ? formatNotes(notes.top) : [],
        middle: Array.isArray(notes.middle) ? formatNotes(notes.middle) : [],
        base: Array.isArray(notes.base) ? formatNotes(notes.base) : [],
      };
    } catch (error) {
      console.error("Error formatting notes:", error);
      return {
        top: Array.isArray(perfume.notes?.top) ? formatNotes(perfume.notes.top) : [],
        middle: Array.isArray(perfume.notes?.middle) ? formatNotes(perfume.notes.middle) : [],
        base: Array.isArray(perfume.notes?.base) ? formatNotes(perfume.notes.base) : [],
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfume?.notes]);

  if (!perfume) return null;

  // Safe property access with fallbacks
  const title = (perfume.nameFa && perfume.nameFa.trim().length > 0) ? perfume.nameFa : (perfume.nameEn || "عطر");
  const englishName = perfume.nameEn?.trim();
  const brand = perfume.brand?.trim();
  const collection = perfume.collection?.trim();
  const family = perfume.family?.trim();
  const gender = perfume.gender?.trim();
  const season = perfume.season?.trim();
  const character = perfume.character?.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-4 bottom-4 z-[3001] mx-auto flex max-h-[90vh] max-w-6xl flex-col overflow-hidden rounded-3xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="perfume-modal-title"
          >
            <div className="glass-card glass-card--muted flex h-full flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-8 sm:py-5">
                <h2 id="perfume-modal-title" className="m-0 text-xl font-semibold text-[var(--color-foreground)] sm:text-2xl">
                  جزئیات عطر
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="glass-chip glass-chip--compact glass-chip--pill glass-chip--muted flex h-8 w-8 items-center justify-center rounded-full p-0 text-lg transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-label="بستن"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6">
                <div className="mx-auto max-w-4xl space-y-6 text-right">
                  {/* Image and Basic Info */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                    {perfume.image && (
                      <div className="glass-surface glass-surface--media relative mx-auto h-48 w-full flex-shrink-0 overflow-hidden rounded-2xl sm:h-64 sm:w-64">
                        <Image
                          src={perfume.image}
                          alt={title}
                          fill
                          className="object-contain"
                          sizes="256px"
                          priority
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="m-0 text-2xl font-semibold text-[var(--color-foreground)] sm:text-3xl">
                          {title}
                        </h3>
                        {englishName && (
                          <p className="m-0 mt-1 text-sm text-subtle sm:text-base">{englishName}</p>
                        )}
                      </div>
                      {brand && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-muted">برند</span>
                          <p className="m-0 mt-1 text-base font-medium text-[var(--color-foreground)] sm:text-lg">
                            {brand}
                          </p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <div className="glass-chip glass-chip--pill glass-chip--accent px-3 py-1.5 text-sm font-semibold">
                          تطابق: {formatNumber(perfume.matchPercentage)}٪
                        </div>
                        {typeof perfume.confidence === "number" && perfume.confidence > 0 && (
                          <div className="glass-chip glass-chip--pill glass-chip--muted px-3 py-1.5 text-sm">
                            اطمینان: {formatNumber(Math.round(perfume.confidence))}٪
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {collection && (
                      <div className="glass-surface rounded-xl px-4 py-3">
                        <span className="text-xs text-muted">مجموعه</span>
                        <p className="m-0 mt-1 text-sm font-medium text-[var(--color-foreground)]">{collection}</p>
                      </div>
                    )}
                    {family && (
                      <div className="glass-surface rounded-xl px-4 py-3">
                        <span className="text-xs text-muted">خانواده</span>
                        <p className="m-0 mt-1 text-sm font-medium text-[var(--color-foreground)]">{family}</p>
                      </div>
                    )}
                    {gender && (
                      <div className="glass-surface rounded-xl px-4 py-3">
                        <span className="text-xs text-muted">سبک</span>
                        <p className="m-0 mt-1 text-sm font-medium text-[var(--color-foreground)]">{gender}</p>
                      </div>
                    )}
                    {season && (
                      <div className="glass-surface rounded-xl px-4 py-3">
                        <span className="text-xs text-muted">فصل</span>
                        <p className="m-0 mt-1 text-sm font-medium text-[var(--color-foreground)]">{season}</p>
                      </div>
                    )}
                    {character && (
                      <div className="glass-surface rounded-xl px-4 py-3 sm:col-span-2">
                        <span className="text-xs text-muted">کاراکتر</span>
                        <p className="m-0 mt-1 text-sm font-medium text-[var(--color-foreground)]">{character}</p>
                      </div>
                    )}
                  </div>

                  {/* Reasons */}
                  {perfume.reasons.length > 0 && (
                    <div className="glass-surface rounded-xl px-4 py-4">
                      <h4 className="m-0 mb-3 text-sm font-semibold text-[var(--color-foreground)]">دلایل انتخاب</h4>
                      <ul className="m-0 list-disc space-y-2 pr-5 text-sm text-muted">
                        {perfume.reasons.map((reason, index) => (
                          <li key={index} className="leading-6">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Score Breakdown */}
                  {perfume.breakdown && perfume.breakdown.length > 0 && (
                    <div className="glass-surface rounded-xl px-4 py-4">
                      <h4 className="m-0 mb-3 text-sm font-semibold text-[var(--color-foreground)]">جزئیات امتیازدهی</h4>
                      <div className="space-y-3">
                        {perfume.breakdown.map((component, index) => (
                          <div key={index} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted">{component.label}</span>
                              <span className="font-medium text-[var(--color-foreground)]">
                                {formatNumber(Math.round(component.achieved * 100))}٪
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${component.achieved * 100}%` }}
                                transition={{ duration: 0.6, delay: index * 0.05 }}
                                className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent)]/80"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {(displayNotes.top.length > 0 || displayNotes.middle.length > 0 || displayNotes.base.length > 0) && (
                    <div className="glass-surface rounded-xl px-4 py-4">
                      <h4 className="m-0 mb-3 text-sm font-semibold text-[var(--color-foreground)]">نُت‌های عطر</h4>
                      <div className="space-y-3 text-sm">
                        {displayNotes.top.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-muted">نت اولیه</span>
                            <p className="m-0 mt-1 text-[var(--color-foreground)]">
                              {displayNotes.top.join(" • ")}
                            </p>
                          </div>
                        )}
                        {displayNotes.middle.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-muted">نت میانی</span>
                            <p className="m-0 mt-1 text-[var(--color-foreground)]">
                              {displayNotes.middle.join(" • ")}
                            </p>
                          </div>
                        )}
                        {displayNotes.base.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-muted">نت پایانی</span>
                            <p className="m-0 mt-1 text-[var(--color-foreground)]">
                              {displayNotes.base.join(" • ")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4 sm:px-8 sm:py-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost tap-highlight touch-target touch-feedback"
                >
                  بستن
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="btn tap-highlight touch-target touch-feedback"
                >
                  کپی جزئیات
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

