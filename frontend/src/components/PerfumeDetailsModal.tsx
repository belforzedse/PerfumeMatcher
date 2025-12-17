"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

import { type RankedPerfume } from "@/lib/perfume-matcher";
import { toPersianNumbers } from "@/lib/locale";
import { useSharePerfume } from "@/lib/useSharePerfume";
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const formatNumber = (value: number) => toPersianNumbers(String(value));

function formatNotes(notes: string[]): string[] {
  if (!Array.isArray(notes)) return [];
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
  const isKiosk = useKioskMode();

  // ✅ portal-safe mount flag
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleShare = useCallback(() => {
    if (perfume) void sharePerfume(perfume);
  }, [perfume, sharePerfume]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // MUST be called before early return
  const displayNotes = useMemo(() => {
    if (!perfume) return { top: [], middle: [], base: [] };
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
        middle: Array.isArray(perfume.notes?.middle)
          ? formatNotes(perfume.notes.middle)
          : [],
        base: Array.isArray(perfume.notes?.base) ? formatNotes(perfume.notes.base) : [],
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfume?.notes]);

  if (!mounted || !perfume) return null;

  const title =
    perfume.nameFa && perfume.nameFa.trim().length > 0
      ? perfume.nameFa
      : perfume.nameEn || "عطر";
  const englishName = perfume.nameEn?.trim();
  const brand = perfume.brand?.trim();
  const collection = perfume.collection?.trim();
  const family = perfume.family?.trim();
  const gender = perfume.gender?.trim();
  const season = perfume.season?.trim();
  const character = perfume.character?.trim();

  const modalShellClass = cn(
    // base
    "fixed z-[3001] mx-auto flex flex-col overflow-hidden rounded-3xl",
    // ✅ normal mode (unchanged behavior)
    !isKiosk &&
      "inset-x-4 top-4 bottom-4 max-h-[90vh] max-w-6xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85vh]",
    // ✅ kiosk mode: fill viewport area cleanly (no center transform conflict)
    isKiosk && "inset-6 sm:inset-8 md:inset-10 max-h-[92vh] max-w-6xl"
  );

  const node = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed inset-0 z-[3000] bg-black/60 backdrop-blur-sm",
              isKiosk && "bg-black/55 backdrop-blur-md"
            )}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={modalShellClass}
            role="dialog"
            aria-modal="true"
            aria-labelledby="perfume-modal-title"
            // prevent click-through to backdrop
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-card glass-card--muted flex h-full flex-col overflow-hidden">
              {/* Header */}
              <div
                className={cn(
                  "flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-8 sm:py-5",
                  isKiosk && "px-10 py-7"
                )}
              >
                <div className="min-w-0">
                  <h2
                    id="perfume-modal-title"
                    className={cn(
                      "m-0 text-xl font-semibold text-[var(--color-foreground)] sm:text-2xl",
                      isKiosk && "text-3xl sm:text-[2.2rem] leading-tight"
                    )}
                  >
                    جزئیات عطر
                  </h2>
                  {isKiosk && (
                    <p className="m-0 mt-1 text-sm text-muted">
                      برای بستن، Esc را بزنید یا بیرون از پنجره لمس کنید.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isKiosk && (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="btn tap-highlight touch-target touch-feedback px-5 py-2.5 text-base"
                    >
                      کپی جزئیات
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      "glass-chip glass-chip--compact glass-chip--pill glass-chip--muted flex h-8 w-8 items-center justify-center rounded-full p-0 text-lg transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                      isKiosk && "h-12 w-12 text-2xl"
                    )}
                    aria-label="بستن"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className={cn("flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6", isKiosk && "px-10 py-8")}>
                <div className={cn("mx-auto max-w-4xl space-y-6 text-right", isKiosk && "max-w-6xl space-y-0")}>
                  <div className={cn("flex flex-col gap-6", isKiosk && "grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr]")}>
                    {/* Left column */}
                    <div className={cn(isKiosk && "lg:sticky lg:top-6 h-fit")}>
                      <div className={cn("flex flex-col gap-4", !isKiosk && "sm:flex-row sm:items-start sm:gap-6")}>
                        {perfume.image && (
                          <div
                            className={cn(
                              "glass-surface glass-surface--media relative mx-auto h-48 w-full flex-shrink-0 overflow-hidden rounded-2xl sm:h-64 sm:w-64",
                              isKiosk && "h-[320px] w-full lg:h-[360px] rounded-[1.75rem]"
                            )}
                          >
                            <img
                              src={perfume.image}
                              alt={title}
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 h-full w-full object-contain"
                              onError={(e) => {
                                console.error(
                                  "[PerfumeDetailsModal] Image load failed:",
                                  perfume.id,
                                  perfume.image
                                );
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        )}

                        <div className={cn("flex-1 space-y-3", isKiosk && "space-y-4")}>
                          <div>
                            <h3 className={cn("m-0 text-2xl font-semibold text-[var(--color-foreground)] sm:text-3xl", isKiosk && "text-3xl sm:text-[2.2rem] leading-tight")}>
                              {title}
                            </h3>
                            {englishName && (
                              <p className={cn("m-0 mt-1 text-sm text-subtle sm:text-base", isKiosk && "text-base sm:text-lg")}>
                                {englishName}
                              </p>
                            )}
                          </div>

                          {brand && (
                            <div>
                              <span className={cn("text-xs uppercase tracking-wider text-muted", isKiosk && "text-sm")}>
                                برند
                              </span>
                              <p className={cn("m-0 mt-1 text-base font-medium text-[var(--color-foreground)] sm:text-lg", isKiosk && "text-lg sm:text-xl")}>
                                {brand}
                              </p>
                            </div>
                          )}

                          <div className={cn("flex flex-wrap gap-3", isKiosk && "gap-4")}>
                            <div className={cn("glass-chip glass-chip--pill glass-chip--accent px-3 py-1.5 text-sm font-semibold", isKiosk && "px-5 py-3 text-base")}>
                              تطابق: {formatNumber(perfume.matchPercentage)}٪
                            </div>
                            {typeof perfume.confidence === "number" && perfume.confidence > 0 && (
                              <div className={cn("glass-chip glass-chip--pill glass-chip--muted px-3 py-1.5 text-sm", isKiosk && "px-5 py-3 text-base")}>
                                اطمینان: {formatNumber(Math.round(perfume.confidence))}٪
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isKiosk && (
                        <div className="mt-6 grid grid-cols-2 gap-4">
                          {collection && (
                            <div className="glass-surface rounded-2xl px-5 py-4">
                              <span className="text-sm text-muted">مجموعه</span>
                              <p className="m-0 mt-1 text-base font-semibold text-[var(--color-foreground)] line-clamp-1">
                                {collection}
                              </p>
                            </div>
                          )}
                          {family && (
                            <div className="glass-surface rounded-2xl px-5 py-4">
                              <span className="text-sm text-muted">خانواده</span>
                              <p className="m-0 mt-1 text-base font-semibold text-[var(--color-foreground)] line-clamp-1">
                                {family}
                              </p>
                            </div>
                          )}
                          {gender && (
                            <div className="glass-surface rounded-2xl px-5 py-4">
                              <span className="text-sm text-muted">سبک</span>
                              <p className="m-0 mt-1 text-base font-semibold text-[var(--color-foreground)] line-clamp-1">
                                {gender}
                              </p>
                            </div>
                          )}
                          {season && (
                            <div className="glass-surface rounded-2xl px-5 py-4">
                              <span className="text-sm text-muted">فصل</span>
                              <p className="m-0 mt-1 text-base font-semibold text-[var(--color-foreground)] line-clamp-1">
                                {season}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right column */}
                    <div className="space-y-6">
                      {!isKiosk && (
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
                      )}

                      {isKiosk && character && (
                        <div className="glass-surface rounded-2xl px-6 py-5">
                          <h4 className="m-0 text-base font-semibold text-[var(--color-foreground)]">کاراکتر</h4>
                          <p className="m-0 mt-2 text-base text-muted leading-7">{character}</p>
                        </div>
                      )}

                      {perfume.reasons.length > 0 && (
                        <div className={cn("glass-surface rounded-xl px-4 py-4", isKiosk && "rounded-2xl px-6 py-6")}>
                          <h4 className={cn("m-0 mb-3 text-sm font-semibold text-[var(--color-foreground)]", isKiosk && "text-base mb-4")}>
                            دلایل انتخاب
                          </h4>
                          <ul className={cn("m-0 list-disc space-y-2 pr-5 text-sm text-muted", isKiosk && "text-base space-y-3 pr-6")}>
                            {perfume.reasons.map((reason, index) => (
                              <li key={index} className={cn("leading-6", isKiosk && "leading-8")}>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {perfume.breakdown && perfume.breakdown.length > 0 && (
                        <div className={cn("glass-surface rounded-xl px-4 py-4", isKiosk && "rounded-2xl px-6 py-6")}>
                          <h4 className={cn("m-0 mb-3 text-sm font-semibold text-[var(--color-foreground)]", isKiosk && "text-base mb-4")}>
                            جزئیات امتیازدهی
                          </h4>
                          <div className={cn("space-y-3", isKiosk && "space-y-4")}>
                            {perfume.breakdown.map((component, index) => (
                              <div key={index} className="space-y-1.5">
                                <div className={cn("flex items-center justify-between text-xs", isKiosk && "text-sm")}>
                                  <span className="text-muted">{component.label}</span>
                                  <span className="font-medium text-[var(--color-foreground)]">
                                    {formatNumber(Math.round(component.achieved * 100))}٪
                                  </span>
                                </div>
                                <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/10", isKiosk && "h-2.5")}>
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

                      {(displayNotes.top.length > 0 ||
                        displayNotes.middle.length > 0 ||
                        displayNotes.base.length > 0) && (
                        <div className={cn("glass-surface rounded-xl px-4 py-4", isKiosk && "rounded-2xl px-6 py-6")}>
                          <h4 className={cn("m-0 mb-3 text-sm font-semibold text-[var(--color-foreground)]", isKiosk && "text-base mb-4")}>
                            نُت‌های عطر
                          </h4>
                          <div className={cn("space-y-3 text-sm", isKiosk && "space-y-4 text-base")}>
                            {displayNotes.top.length > 0 && (
                              <div>
                                <span className={cn("text-xs font-medium text-muted", isKiosk && "text-sm")}>
                                  نت اولیه
                                </span>
                                <p className={cn("m-0 mt-1 text-[var(--color-foreground)] leading-7", isKiosk && "leading-8")}>
                                  {displayNotes.top.join(" • ")}
                                </p>
                              </div>
                            )}
                            {displayNotes.middle.length > 0 && (
                              <div>
                                <span className={cn("text-xs font-medium text-muted", isKiosk && "text-sm")}>
                                  نت میانی
                                </span>
                                <p className={cn("m-0 mt-1 text-[var(--color-foreground)] leading-7", isKiosk && "leading-8")}>
                                  {displayNotes.middle.join(" • ")}
                                </p>
                              </div>
                            )}
                            {displayNotes.base.length > 0 && (
                              <div>
                                <span className={cn("text-xs font-medium text-muted", isKiosk && "text-sm")}>
                                  نت پایانی
                                </span>
                                <p className={cn("m-0 mt-1 text-[var(--color-foreground)] leading-7", isKiosk && "leading-8")}>
                                  {displayNotes.base.join(" • ")}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={cn("flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4 sm:px-8 sm:py-5", isKiosk && "px-10 py-6")}>
                <button
                  type="button"
                  onClick={onClose}
                  className={cn("btn-ghost tap-highlight touch-target touch-feedback", isKiosk && "px-6 py-3 text-base")}
                >
                  بستن
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className={cn("btn tap-highlight touch-target touch-feedback", isKiosk && "px-7 py-3 text-base")}
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

  // ✅ the actual fix
  return createPortal(node, document.body);
}
