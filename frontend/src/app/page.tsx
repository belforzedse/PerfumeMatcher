"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import StartQuestionnaireButton from "@/components/StartQuestionnaireButton";
import KioskFrame from "@/components/KioskFrame";
import { signatureTransitions, useMotionPreference } from "@/lib/motion";
import { useKioskMode } from "@/lib/hooks";
import { cn } from "@/lib/utils";

function KioskFeature({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-surface backdrop-blur-xl glass-chip-gradient-border rounded-3xl p-6 text-right shadow-[0_18px_46px_rgba(28,24,21,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-lg font-semibold text-[var(--color-foreground)]">
            {title}
          </h3>
          <p className="m-0 mt-2 text-sm leading-relaxed text-muted">{desc}</p>
        </div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-white/60">
          {icon}
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const shouldReduceMotion = useMotionPreference();
  const panelTransition = signatureTransitions.page;
  const headerTransition = signatureTransitions.section;
  const isKiosk = useKioskMode();

  return (
    <KioskFrame>
      <main
        className={cn(
          "flex min-h-0 w-full flex-1 justify-center",
          isKiosk ? "px-10 py-10" : "px-4 py-8 sm:px-6 lg:px-12"
        )}
      >
        <motion.article
          className={cn(
            "glass-card backdrop-blur-xl page-panel relative flex w-full flex-col items-center text-center",
            // ✅ kiosk: fill height + distribute content to kill empty space
            isKiosk
              ? "max-w-6xl min-h-[82vh] gap-10 px-14 py-14 justify-between"
              : "max-w-5xl gap-6 px-6 py-8 sm:gap-8 sm:px-10 sm:py-10 lg:gap-12 lg:py-12"
          )}
          initial={
            shouldReduceMotion
              ? false
              : { opacity: 0, y: 28, scale: 0.985, filter: "blur(8px)" }
          }
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
          }
          exit={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 0, y: -18, scale: 0.99, filter: "blur(6px)" }
          }
          transition={shouldReduceMotion ? { duration: 0 } : panelTransition}
        >
          {/* subtle kiosk glow to avoid “flat white” */}
          {isKiosk && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 opacity-80 bg-[radial-gradient(1200px_circle_at_50%_0%,rgba(212,175,55,0.12),transparent_60%)]"
            />
          )}

          {/* TOP: Logo */}
          <div className="relative flex items-center justify-center">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[54px] bg-gradient-to-br from-white/45 via-white/12 to-transparent blur-2xl"
              aria-hidden
            />
            <div
              className={cn(
                "glass-card relative rounded-[42px] border border-white/60 bg-white/80 shadow-[0_22px_48px_rgba(28,24,21,0.10)]",
                isKiosk ? "p-10" : "p-6 sm:p-8"
              )}
            >
              <Image
                src="/logo.webp"
                alt="لوگوی فروشگاه"
                width={360}
                height={360}
                priority
                className={cn(
                  "w-full object-contain",
                  isKiosk ? "max-w-[420px]" : "max-w-[220px] sm:max-w-[660px]"
                )}
              />
            </div>
          </div>

          {/* MIDDLE: Heading + (kiosk-only) features */}
          <section
            className={cn(
              "flex w-full flex-col items-center text-center",
              isKiosk
                ? "max-w-5xl gap-10 flex-1 justify-center"
                : "max-w-2xl gap-6 sm:gap-8"
            )}
          >
            <motion.header
              className={cn("space-y-6", isKiosk && "space-y-8")}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              animate={
                shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
              }
              exit={
                shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -12 }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { ...headerTransition, delay: 0.12 }
              }
            >
              <h1
                className={cn(
                  "m-0 font-semibold leading-[1.05] text-[var(--color-foreground)]",
                  isKiosk
                    ? "text-[3.6rem]"
                    : "text-[2.35rem] xs:text-[2.6rem] sm:text-[3rem] lg:text-[3.2rem]"
                )}
              >
                سلیقه عطری خود را کشف کنید
              </h1>
              <p
                className={cn(
                  "m-0 max-w-2xl text-muted",
                  isKiosk ? "text-xl" : "text-base sm:text-lg"
                )}
              >
                تجربه‌ای شفاف و سریع برای انتخاب رایحه‌ای که با حال‌وهوای شما
                هماهنگ است.
              </p>
            </motion.header>

            {/* ✅ kiosk-only: fill space with helpful “what happens next” blocks */}
            {isKiosk && (
              <div className="grid w-full grid-cols-3 gap-6">
                <KioskFeature
                  title="کمتر از یک دقیقه"
                  desc="چند انتخاب کوتاه؛ بدون فرم طولانی."
                  icon={
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-7 w-7 text-[var(--color-accent)]"
                    >
                      <path
                        d="M12 7v6l4 2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  }
                />
                <KioskFeature
                  title="نتیجه دقیق‌تر"
                  desc="از صحنه‌ها تا شدت حضور؛ ترکیب می‌کنیم."
                  icon={
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-7 w-7 text-[var(--color-accent)]"
                    >
                      <path
                        d="M12 3l2.2 6.7H21l-5.4 3.9L17.8 21 12 16.9 6.2 21l2.2-7.4L3 9.7h6.8L12 3Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
                <KioskFeature
                  title="6 پیشنهاد برتر"
                  desc="به‌همراه بهترین گزینه‌ی مطابق سلیقه."
                  icon={
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-7 w-7 text-[var(--color-accent)]"
                    >
                      <path
                        d="M7 7h10M7 12h10M7 17h6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8l-3 2v-2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                />
              </div>
            )}
          </section>

          {/* BOTTOM: CTA (bigger + anchored for kiosk) */}
          <div
            className={cn(
              "w-full flex flex-col items-center",
              isKiosk ? "gap-4" : "gap-3"
            )}
          >
            <StartQuestionnaireButton
              className={isKiosk ? "max-w-lg" : "max-w-xs"}
            />
            {isKiosk && (
              <p className="m-0 text-sm text-muted">
                برای شروع، دکمه را لمس کنید
              </p>
            )}
          </div>
        </motion.article>
      </main>
    </KioskFrame>
  );
}
