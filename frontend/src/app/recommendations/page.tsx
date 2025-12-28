"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import KioskFrame from "@/components/KioskFrame";
import { toPersianNumbers } from "@/lib/locale";
import { useKioskMode } from "@/lib/hooks";

import { parseAnswers, type QuestionnaireAnswers } from "@/lib/questionnaire";
import { type RankedPerfume } from "@/lib/perfume-matcher";

const BrainThinkingAnimation = dynamic(() => import("@/components/BrainThinkingAnimation"), { ssr: false });
const PerfumeDetailsModal = dynamic(() => import("@/components/PerfumeDetailsModal"), { ssr: false });

const formatNumber = (value: number) => toPersianNumbers(String(value));

type CompactMode = "normal" | "tight" | "ultra";

const MatchCard = ({
  perfume,
  order,
  compact = "normal",
  onClick,
  isKiosk = false,
}: {
  perfume: RankedPerfume;
  order: number;
  compact?: CompactMode;
  onClick: (perfume: RankedPerfume) => void;
  isKiosk?: boolean;
}) => {
  const title =
    perfume.nameFa && perfume.nameFa.trim().length > 0
      ? perfume.nameFa
      : perfume.nameEn;

  const detailLine = [perfume.collection, perfume.family]
    .filter((v): v is string => !!v && v.trim().length > 0)
    .join(" • ");

  const isTop = order === 1;

  const imageHeight = useMemo(() => {
    // ✅ kiosk: make media area feel “bigger” + more cinematic
    if (isKiosk) {
      if (compact === "tight") return "min(26vh, 280px)";
      return "min(30vh, 320px)";
    }

    return compact === "ultra"
      ? "min(16vh, 105px)"
      : compact === "tight"
      ? "min(20vh, 135px)"
      : "min(24vh, 160px)";
  }, [compact, isKiosk]);

  const brand = perfume.brand?.trim();
  const englishName = perfume.nameEn?.trim();

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(perfume);
    }
  };

  // Use scene-card style in kiosk mode, regular style otherwise
  const useImageCardStyle = isKiosk;

  // Use placeholder image for testing if no image available (perfume-related)
  const imageUrl = perfume.image || `https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=800&fit=crop&q=80&seed=${perfume.id}`;

  // Calculate grayscale intensity based on order (1 = most colorful, 6 = most grayscale)
  // For 6 cards: order 1 = 0%, order 6 = 80% grayscale
  const grayscaleIntensity = useImageCardStyle
    ? Math.min(((order - 1) / 5) * 80, 80)
    : 0;

  return (
    <button
      type="button"
      onClick={() => onClick(perfume)}
      onKeyUp={handleKeyUp}
      className={cn(
        "group relative text-right transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.45)]",
        "tap-highlight touch-target touch-feedback",
        useImageCardStyle
          ? [
              "h-full w-full",
              "rounded-[1.5rem]",
              "overflow-hidden",
              order <= 2
                ? "scene-card-gradient-border-gold"
                : "scene-card-gradient-border-silver",
              order <= 2
                ? "shadow-[0_26px_90px_rgba(0,0,0,0.32),0_18px_60px_rgba(212,175,55,0.20)]"
                : "shadow-[0_20px_60px_rgba(0,0,0,0.18)]",
              "after:content-[''] after:pointer-events-none after:absolute after:inset-[4px] after:rounded-[1.25rem] after:ring-1 after:ring-white/10",
              order <= 2 && "after:ring-[rgba(255,255,255,0.22)]",
            ]
          : [
              "glass-card glass-card--muted flex h-full w-full flex-col gap-3 rounded-2xl p-3 text-right transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] focus-visible:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:gap-4 sm:rounded-3xl sm:p-4 md:gap-5 md:p-5 lg:p-6",
            ]
      )}
      aria-label={`مشاهده جزئیات ${title}`}
    >
      {useImageCardStyle ? (
        <div className="scene-card-inner relative">
          {/* Background image */}
          {imageUrl && (
            <motion.img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              animate={{
                scale: 1.02,
              }}
              transition={{
                duration: 2.2,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                filter: useImageCardStyle
                  ? order <= 2
                    ? `brightness(0.98) contrast(1.10) saturate(1.15) grayscale(${grayscaleIntensity}%)`
                    : `brightness(0.94) contrast(1.06) grayscale(${grayscaleIntensity}%)`
                  : undefined,
              }}
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                "transition-[filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              )}
              loading={order <= 2 ? "eager" : "lazy"}
            />
          )}

          {/* Selected "premium glow" for top 2 */}
          {order <= 2 && (
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-0",
                "bg-[radial-gradient(900px_circle_at_50%_0%,rgba(212,175,55,0.22),transparent_55%)]",
                "opacity-90"
              )}
            />
          )}

          {/* Bottom gradient ONLY */}
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-0",
              order <= 2
                ? "bg-gradient-to-t from-black/90 via-black/34 to-black/0"
                : "bg-gradient-to-t from-black/85 via-black/30 to-black/0",
              "transition-opacity duration-500",
              order <= 2 ? "opacity-100" : "opacity-[0.92]"
            )}
          />

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col px-5 pb-6 pt-5 sm:px-6 sm:pb-7">
            {/* Order and match badges at top */}
            <div className="flex items-start justify-between mb-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md ring-1 ring-white/18 shadow-[0_10px_26px_rgba(0,0,0,0.35)]">
                {formatNumber(order)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md ring-1 ring-white/18 shadow-[0_10px_26px_rgba(0,0,0,0.35)]">
                {formatNumber(perfume.matchPercentage)}٪
              </span>
            </div>

            {/* Main content at bottom */}
            <div className="mt-auto space-y-1.5 text-center">
              {brand && (
                <p className="m-0 text-[10px] sm:text-xs uppercase tracking-[0.15em] text-white/75 line-clamp-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.50)]">
                  {brand}
                </p>
              )}
              <h3
                className={cn(
                  "m-0 text-lg font-semibold leading-snug sm:text-xl font-rokh",
                  "drop-shadow-[0_2px_16px_rgba(0,0,0,0.60)]",
                  order <= 2
                    ? "bg-[linear-gradient(90deg,#fff7d6_0%,#d4af37_45%,#b88100_100%)] bg-clip-text text-transparent"
                    : "text-white/90"
                )}
              >
                {title}
              </h3>

              {/* divider */}
              <div
                className={cn(
                  "mx-auto mt-1 h-[2px] w-12 rounded-full",
                  order <= 2
                    ? "bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.90),transparent)]"
                    : "bg-white/25"
                )}
              />

              {detailLine && (
                <p
                  className={cn(
                    "m-0 text-xs leading-relaxed sm:text-sm drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]",
                    order <= 2
                      ? "bg-[linear-gradient(90deg,#f7f7f6_0%,#dedad0_50%,#cec7bb_100%)] bg-clip-text text-transparent"
                      : "text-white/65"
                  )}
                >
                  {detailLine}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <header className="flex items-center justify-between text-muted">
            <span
              className={cn(
                "glass-chip glass-chip--compact glass-chip--pill glass-chip--muted px-2 sm:px-2.5 md:px-3 text-[10px] sm:text-xs font-medium"
              )}
            >
              {formatNumber(order)}
            </span>

            <span
              className={cn(
                "glass-chip glass-chip--compact glass-chip--pill glass-chip--accent text-xs sm:text-sm font-semibold"
              )}
            >
              {formatNumber(perfume.matchPercentage)}٪
            </span>
          </header>

          {perfume.image ? (
            <div className="flex flex-grow items-center justify-center min-h-0">
              <div
                className={cn(
                  "glass-surface glass-surface--media relative w-full overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
                )}
                style={{ height: imageHeight }}
              >
                <img
                  src={perfume.image}
                  alt={title}
                  loading={order <= 2 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    console.error(
                      `[Recommendations] Image load error for perfume ${perfume.id}:`,
                      perfume.image,
                      e
                    );
                    const target = e.currentTarget;
                    target.style.display = "none";
                  }}
                />
              </div>
            </div>
          ) : null}

      <div className="space-y-1 sm:space-y-1.5 md:space-y-1.5 text-right">
        {brand && (
          <p
            className={cn(
              "m-0 text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-muted line-clamp-1",
              isKiosk && "text-[11px] sm:text-xs md:text-sm"
            )}
          >
            {brand}
          </p>
        )}

        <h3
          className={cn(
            "m-0 font-semibold text-[var(--color-foreground)] line-clamp-1",
            compact === "ultra"
              ? "text-base sm:text-lg"
              : "text-lg sm:text-xl md:text-2xl",
            isKiosk &&
              compact !== "ultra" &&
              "text-2xl sm:text-3xl md:text-[2rem]"
          )}
        >
          {title}
        </h3>

        {compact !== "ultra" && englishName && (
          <p
            className={cn(
              "m-0 text-[10px] sm:text-xs text-subtle line-clamp-1",
              isKiosk && "text-sm sm:text-base"
            )}
          >
            {englishName}
          </p>
        )}

        {compact === "normal" && detailLine && (
          <p
            className={cn(
              "m-0 text-[10px] sm:text-xs text-muted line-clamp-1",
              isKiosk && "text-sm sm:text-base"
            )}
          >
            {detailLine}
          </p>
        )}

        {perfume.reasons.length > 0 && compact !== "ultra" && (
          <ul
            className={cn(
              "m-0 list-disc space-y-0.5 pr-4 text-[10px] text-muted sm:text-xs",
              isKiosk && "text-sm sm:text-base space-y-1"
            )}
          >
            {perfume.reasons
              .slice(0, isKiosk ? 2 : compact === "tight" ? 1 : 2)
              .map((reason) => (
                <li key={reason} className="leading-5">
                  {reason}
                </li>
              ))}
          </ul>
        )}

        {compact === "normal" &&
          typeof perfume.confidence === "number" &&
          perfume.confidence > 0 && (
            <div className={cn("mt-2 space-y-1", isKiosk && "mt-3 space-y-2")}>
              <div
                className={cn(
                  "flex items-center justify-between text-[9px] text-muted sm:text-[10px]",
                  isKiosk && "text-sm"
                )}
              >
                <span>اطمینان سیستم</span>
                <span className="font-medium text-[var(--color-foreground)]">
                  {formatNumber(Math.round(perfume.confidence))}٪
                </span>
              </div>
              <div className="confidence-meter w-full">
                <div
                  className="confidence-meter__fill"
                  style={{ width: `${perfume.confidence}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </>
      )}
    </button>
  );
};

function RecommendationsContent() {
  const searchParams = useSearchParams();
  const answersParam = searchParams.get("answers");

  const [recommendations, setRecommendations] = useState<RankedPerfume[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [compact, setCompact] = useState<CompactMode>("normal");
  const [refreshToken, setRefreshToken] = useState(0);

  const headingId = "recommendations-heading";

  const [selectedPerfume, setSelectedPerfume] = useState<RankedPerfume | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isKiosk = useKioskMode();

  const handlePerfumeClick = useCallback((perfume: RankedPerfume) => {
    setSelectedPerfume(perfume);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedPerfume(null), 300);
  }, []);

  useEffect(() => {
    const updateCompact = () => {
      const height = window.innerHeight;
      const width = window.innerWidth;

      // ✅ Kiosk mode: stay readable (never ultra)
      if (isKiosk) {
        if (height <= 980) setCompact("tight");
        else setCompact("normal");
        return;
      }

      // Mobile devices
      if (width < 768) {
        if (height <= 760) setCompact("ultra");
        else if (height <= 920) setCompact("tight");
        else setCompact("normal");
      } else {
        // Desktop/tablet
        if (height <= 820) setCompact("ultra");
        else if (height <= 1000) setCompact("tight");
        else setCompact("normal");
      }
    };

    updateCompact();
    window.addEventListener("resize", updateCompact);
    return () => window.removeEventListener("resize", updateCompact);
  }, [isKiosk]);

  useEffect(() => {
    let cancelled = false;

    if (!answersParam) {
      setAnswers(null);
      setRecommendations([]);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const parsedAnswers = parseAnswers(answersParam);
    if (!parsedAnswers) {
      setAnswers(null);
      setRecommendations([]);
      setError("پاسخ‌ها معتبر نیستند. لطفاً پرسشنامه را مجدداً تکمیل کنید.");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setAnswers(parsedAnswers);
	    setLoading(true);
	    setError(null);

	    const fetchRecommendations = async () => {
	      try {
	        const response = await fetch("/api/recommendations", {
	          method: "POST",
	          headers: { "Content-Type": "application/json" },
	          body: JSON.stringify(parsedAnswers),
	        });

	        if (!response.ok) {
	          const data = await response.json().catch(() => null);
	          const message =
	            (data && typeof data.error === "string" && data.error) ||
	            "در دریافت پیشنهادها خطایی رخ داد. لطفاً دوباره تلاش کنید.";
	          throw new Error(message);
	        }

	        const data = (await response.json()) as { ranked: RankedPerfume[] };
	        setRecommendations(Array.isArray(data.ranked) ? data.ranked : []);
	      } catch (err) {
	        if (cancelled) return;
	        console.error("Error generating recommendations:", err);
	        setRecommendations([]);
	        setError(
	          err instanceof Error
	            ? err.message
	            : "در دریافت پیشنهادها خطایی رخ داد. لطفاً دوباره تلاش کنید.",
	        );
	      } finally {
	        if (!cancelled) setLoading(false);
	      }
	    };

    fetchRecommendations();

    return () => {
      cancelled = true;
    };
  }, [answersParam, refreshToken]);

  const visibleRecommendations = useMemo(
    () => recommendations.slice(0, 6),
    [recommendations]
  );

  // ✅ kiosk-friendly panel sizing (normal stays identical)
  const mainClass = cn(
    "page-main flex min-h-0 w-full flex-1 items-center justify-center",
    isKiosk ? "px-8 py-8" : "px-2 py-4 sm:px-3 md:px-4 lg:px-6 xl:px-8"
  );

  const panelClass = cn(
    "glass-card backdrop-blur-xl glass-gradient-border page-panel flex h-full w-full flex-1 flex-col overflow-hidden rounded-[28px]",
    isKiosk
      ? "max-h-[94vh] max-w-6xl gap-6 p-8"
      : "max-h-[94vh] max-w-5xl gap-4 p-4 sm:p-6 md:p-8"
  );

  if (loading) {
    return (
      <main aria-labelledby={headingId} className={mainClass}>
        <div className={cn(panelClass, isKiosk && "gap-6")}>
          <div className="flex flex-col gap-2.5 text-right animate-fade-in">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p
                  className={cn(
                    "m-0 text-[12px] text-muted",
                    isKiosk && "text-sm"
                  )}
                >
                  در حال تحلیل ترجیحات شما
                </p>
                <h1
                  id={headingId}
                  className={cn(
                    "m-0 text-[23px] xs:text-[27px] sm:text-[32px] font-semibold text-[var(--color-foreground)] leading-tight",
                    isKiosk && "text-[2.6rem] sm:text-[3.1rem]"
                  )}
                >
                  در حال آماده‌سازی پیشنهادها...
                </h1>
                <p
                  className={cn(
                    "m-0 text-xs text-muted",
                    isKiosk && "text-base"
                  )}
                >
                  پاسخ‌هایتان با رایحه‌های موجود تطبیق داده می‌شود؛ معمولاً کمتر
                  از ۵ ثانیه طول می‌کشد.
                </p>
              </div>

              <div
                className={cn(
                  "rounded-2xl bg-white/75 px-3.5 py-2.5 text-[11px] text-muted shadow-soft",
                  isKiosk && "text-sm px-5 py-3"
                )}
              >
                سیستم تطبیق پیشرفته فعال است
              </div>
            </div>

            <div
              className={cn(
                "flex flex-wrap items-center gap-2 text-[11px] text-muted",
                isKiosk && "text-sm gap-3"
              )}
            >
              <span className="h-1.5 w-14 rounded-full bg-[var(--color-accent)]/70" />
              <span>مرحله ۱ از ۲: تحلیل</span>
              <span className="text-[var(--color-foreground-muted)]">•</span>
              <span className="text-muted">مرحله ۲: نمایش نتایج</span>
              <span className="text-[var(--color-foreground-muted)]">•</span>
              <span>۲۵۸ رایحه • ۸۰ فیلتر فعال • ۴۸ نکته دانش‌بنیان</span>
            </div>
          </div>

          <div
            className={cn(
              "glass-surface relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl p-6 sm:p-8 md:p-10 animate-blur-in min-h-[500px]",
              isKiosk && "min-h-[560px] rounded-[2rem]"
            )}
          >
            <div className="absolute inset-0 pointer-events-none opacity-80">
              <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-white/28 to-[var(--color-accent-soft)]/28" />
              <div className="animate-aurora-layer absolute inset-0" />
              <div className="animate-aurora-layer-delayed absolute inset-0" />
            </div>

            <div className="relative z-10 w-full max-w-3xl">
              <BrainThinkingAnimation />
            </div>

            <div
              className={cn(
                "absolute bottom-4 right-4 rounded-full bg-white/70 px-3 py-1 text-[11px] text-muted shadow-soft",
                isKiosk && "text-sm px-4 py-2"
              )}
            >
              موتور تحلیل چندمرحله‌ای فعال
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/questionnaire"
              className={cn(
                "btn-ghost tap-highlight touch-target touch-feedback text-sm sm:text-base",
                isKiosk && "text-base"
              )}
            >
              بازبینی پرسشنامه
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main aria-labelledby={headingId} className={mainClass}>
        <div className={panelClass}>
          <header className="space-y-2 text-right">
            <h1
              id={headingId}
              className={cn(
                "m-0 text-xl sm:text-2xl font-semibold text-[var(--color-foreground)]",
                isKiosk && "text-3xl"
              )}
            >
              مشکلی پیش آمد.
            </h1>
            <p
              className={cn(
                "m-0 text-xs text-muted sm:text-sm",
                isKiosk && "text-base"
              )}
            >
              {error}
            </p>
          </header>

          <div className="flex flex-col items-end gap-2 sm:flex-row-reverse">
            <Link
              href="/questionnaire"
              className="btn tap-highlight touch-target touch-feedback text-sm sm:text-base"
            >
              بازگشت به پرسشنامه
            </Link>
            <button
              type="button"
              onClick={() => setRefreshToken((token) => token + 1)}
              className="btn-ghost tap-highlight touch-target touch-feedback text-sm sm:text-base"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!answers) {
    return (
      <main aria-labelledby={headingId} className={mainClass}>
        <div className={panelClass}>
          <header className="space-y-2 text-right">
            <h1
              id={headingId}
              className={cn(
                "m-0 text-xl sm:text-2xl font-semibold text-[var(--color-foreground)]",
                isKiosk && "text-3xl"
              )}
            >
              پاسخی ثبت نشد.
            </h1>
            <p
              className={cn(
                "m-0 text-xs text-muted sm:text-sm",
                isKiosk && "text-base"
              )}
            >
              برای دریافت پیشنهادها، پرسشنامه را تکمیل کنید.
            </p>
          </header>

          <div className="flex justify-end">
            <Link
              href="/questionnaire"
              className="btn tap-highlight touch-target touch-feedback text-sm sm:text-base"
            >
              شروع پرسشنامه
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const topMatch = recommendations.length > 0 ? recommendations[0] : null;
  const answeredCount =
    (answers.gender ? 1 : 0) +
    [
      answers.moods,
      answers.moments,
      answers.times,
      answers.intensity,
      answers.styles,
      answers.noteLikes,
      answers.noteDislikes,
    ].filter((values) => values.length > 0).length;

  // ✅ kiosk grid: force 2x3 to fully occupy height (normal stays identical)
  const resultsGridClass = isKiosk
    ? "grid h-full w-full grid-cols-2 grid-rows-3 gap-5"
    : "grid h-full w-full grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:gap-3.5 lg:grid-cols-3 lg:grid-rows-2";

  return (
    <main aria-labelledby={headingId} className={mainClass}>
      <div className={panelClass}>
        <header
          className={cn(
            "flex flex-col gap-3 text-right sm:flex-row sm:items-start sm:justify-between",
            isKiosk && "gap-4"
          )}
        >
          <div className="space-y-1">
            <h1
              id={headingId}
              className={cn(
                "m-0 text-xl xs:text-2xl sm:text-3xl font-semibold text-[var(--color-foreground)]",
                isKiosk && "text-[2.6rem] leading-[1.05]"
              )}
            >
              پیشنهادهای شما
            </h1>

            <p
              className={cn(
                "m-0 text-xs text-muted sm:text-sm",
                isKiosk && "text-base"
              )}
            >
              {recommendations.length > 0
                ? `${formatNumber(
                    recommendations.length
                  )} رایحه بر اساس ${formatNumber(
                    answeredCount
                  )} پاسخ شما پیشنهاد شد.`
                : "نتیجه‌ای پیدا نشد. می‌توانید پرسشنامه را بازبینی کنید."}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 sm:flex-row-reverse sm:items-center">
            <Link
              href="/questionnaire"
              className={cn(
                "btn-ghost tap-highlight touch-target touch-feedback text-sm sm:text-base",
                isKiosk && "text-base"
              )}
            >
              بازبینی پرسشنامه
            </Link>
            <Link
              href="/"
              className={cn(
                "btn tap-highlight touch-target touch-feedback text-sm sm:text-base",
                isKiosk && "text-base"
              )}
            >
              بازگشت به صفحه اصلی
            </Link>
          </div>
        </header>

        {/* ✅ kiosk: show a single, bigger top-match strip (normal remains unchanged) */}
        {isKiosk && topMatch && (
          <section
            className="glass-surface flex items-center justify-between gap-6 rounded-[2rem] px-7 py-6 text-right"
            aria-label="بهترین هماهنگی"
          >
            <div className="min-w-0 space-y-1">
              <p className="m-0 text-sm font-semibold text-[var(--color-accent)]">
                بهترین هماهنگی
              </p>
              <p className="m-0 text-2xl font-semibold text-[var(--color-foreground)] line-clamp-1">
                {topMatch.nameFa && topMatch.nameFa.trim().length > 0
                  ? topMatch.nameFa
                  : topMatch.nameEn}
              </p>
              <p className="m-0 text-sm text-muted">
                درصد تطابق: {formatNumber(topMatch.matchPercentage)}٪
                {typeof topMatch.confidence === "number" &&
                topMatch.confidence > 0
                  ? ` • اطمینان سیستم: ${formatNumber(
                      Math.round(topMatch.confidence)
                    )}٪`
                  : ""}
              </p>
              {topMatch.reasons.length > 0 && (
                <p className="m-0 text-sm text-muted line-clamp-1">
                  {topMatch.reasons[0]}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => handlePerfumeClick(topMatch)}
              className="btn tap-highlight touch-target touch-feedback px-6 py-3 text-base"
            >
              مشاهده جزئیات
            </button>
          </section>
        )}

        {/* ✅ normal mode: keep your two existing topMatch sections exactly */}
        {!isKiosk && topMatch && (
          <section className="glass-surface hidden flex-col gap-2 rounded-2xl px-4 py-4 text-right text-xs text-muted sm:flex sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:text-sm">
            <div className="space-y-1">
              <p className="m-0 text-xs font-semibold text-[var(--color-accent)] sm:text-sm">
                بهترین هماهنگی
              </p>
              <p className="m-0 text-base font-semibold text-[var(--color-foreground)] sm:text-lg">
                {topMatch.nameFa && topMatch.nameFa.trim().length > 0
                  ? topMatch.nameFa
                  : topMatch.nameEn}
              </p>
              <p className="m-0">
                درصد تطابق: {formatNumber(topMatch.matchPercentage)}٪
              </p>
              {typeof topMatch.confidence === "number" &&
                topMatch.confidence > 0 && (
                  <p className="m-0">
                    اطمینان سیستم:{" "}
                    {formatNumber(Math.round(topMatch.confidence))}٪
                  </p>
                )}
              {(topMatch.collection || topMatch.family) && (
                <p className="m-0 text-[11px] sm:text-xs">
                  {[topMatch.collection, topMatch.family]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              )}
            </div>
            {topMatch.reasons.length > 0 && (
              <ul className="m-0 list-disc space-y-1 pr-4">
                {topMatch.reasons.slice(0, 2).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {!isKiosk && topMatch && (
          <section className="glass-surface flex flex-col gap-2 rounded-2xl px-4 py-4 text-right text-xs text-muted sm:hidden">
            <div className="space-y-1">
              <p className="m-0 text-xs font-semibold text-[var(--color-accent)]">
                بهترین هماهنگی
              </p>
              <p className="m-0 text-base font-semibold text-[var(--color-foreground)]">
                {topMatch.nameFa && topMatch.nameFa.trim().length > 0
                  ? topMatch.nameFa
                  : topMatch.nameEn}
              </p>
              <p className="m-0">
                درصد تطابق: {formatNumber(topMatch.matchPercentage)}٪
              </p>
              {typeof topMatch.confidence === "number" &&
                topMatch.confidence > 0 && (
                  <p className="m-0">
                    اطمینان سیستم:{" "}
                    {formatNumber(Math.round(topMatch.confidence))}٪
                  </p>
                )}
              {(topMatch.collection || topMatch.family) && (
                <p className="m-0 text-[11px]">
                  {[topMatch.collection, topMatch.family]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              )}
            </div>
            {topMatch.reasons.length > 0 && (
              <ul className="m-0 list-disc space-y-1 pr-4">
                {topMatch.reasons.slice(0, 1).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="flex flex-1 min-h-0 flex-col overflow-hidden text-right animate-fade-in-up">
          {recommendations.length > 0 && (
            <div
              className={cn(
                "mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted sm:text-xs",
                isKiosk && "text-sm mb-3"
              )}
            >
              <span>
                برای مشاهده جزئیات، کارت هر عطر را لمس کنید یا کلید Enter را
                فشار دهید.
              </span>

              <span
                className={cn(
                  "rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-muted",
                  isKiosk && "text-sm px-4 py-2"
                )}
              >
                تطابق میانگین:{" "}
                {formatNumber(
                  Math.round(
                    recommendations.reduce(
                      (sum, item) => sum + item.matchPercentage,
                      0
                    ) / recommendations.length
                  )
                )}
                ٪
              </span>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-hidden">
            <div className={resultsGridClass}>
              {visibleRecommendations.length > 0 ? (
                visibleRecommendations.map((perfume, index) => (
                  <div
                    key={perfume.id}
                    className={cn(
                      "h-full animate-fade-in-up",
                      // normal mode keeps your min height
                      !isKiosk && "min-h-[200px]"
                    )}
                    style={{
                      animationDelay: `${80 * index}ms`,
                      animationDuration: "560ms",
                    }}
                  >
                    <MatchCard
                      perfume={perfume}
                      order={index + 1}
                      compact={compact}
                      onClick={handlePerfumeClick}
                      isKiosk={isKiosk}
                    />
                  </div>
                ))
              ) : (
                <div className="glass-surface col-span-full flex h-full flex-col items-center justify-center gap-3 rounded-2xl p-6 text-xs text-muted sm:text-sm">
                  <p className="m-0">
                    مورد مناسبی پیدا نشد. لطفاً پاسخ‌ها را تغییر دهید.
                  </p>
                  <Link
                    href="/questionnaire"
                    className="btn-ghost tap-highlight touch-target touch-feedback text-sm transition-all duration-200 hover:bg-white/10"
                  >
                    بازبینی پرسشنامه
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <PerfumeDetailsModal
        perfume={selectedPerfume}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </main>
  );
}

export default function RecommendationsPage() {
  return (
    <KioskFrame>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <div
              className="loader-orbit"
              role="status"
              aria-label="در حال بارگذاری"
            />
          </div>
        }
      >
        <RecommendationsContent />
      </Suspense>
    </KioskFrame>
  );
}
