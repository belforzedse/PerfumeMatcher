"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import StartQuestionnaireButton from "@/components/StartQuestionnaireButton";
import KioskFrame from "@/components/KioskFrame";
import { signatureTransitions, useMotionPreference } from "@/lib/motion";

export default function HomePage() {
  const shouldReduceMotion = useMotionPreference();
  const panelTransition = signatureTransitions.page;
  const headerTransition = signatureTransitions.section;

  return (
    <KioskFrame>
      <main className="flex min-h-0 w-full flex-1 justify-center px-4 py-8 sm:px-6 lg:px-12">
        <motion.article
          className="glass-card backdrop-blur-xl glass-gradient-border page-panel relative flex w-full max-w-5xl max-h-[94vh] flex-col items-center gap-6 px-6 py-8 text-center sm:gap-8 sm:px-10 sm:py-10 lg:gap-12 lg:py-12"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 28, scale: 0.985, filter: "blur(8px)" }}
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
          <div className="relative flex items-center justify-center">
            <div className="pointer-events-none absolute -inset-4 rounded-[46px] bg-gradient-to-br from-white/40 via-white/10 to-transparent blur-xl" aria-hidden />
            <div className="glass-card relative rounded-[38px] border border-white/60 bg-white/80 p-6 shadow-[0_22px_48px_rgba(28,24,21,0.1)] sm:p-8">
              <Image
                src="/logo.webp"
                alt="لوگوی فروشگاه"
                width={360}
                height={360}
                priority
                className="w-full max-w-[220px] object-contain sm:max-w-[260px]"
              />
            </div>
          </div>
          <section className="flex w-full max-w-2xl flex-col items-center gap-6 text-center sm:gap-8">
            <motion.header
              className="space-y-6"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -12 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { ...headerTransition, delay: 0.12 }
              }
            >
              <h1 className="m-0 text-[2.35rem] font-semibold leading-[1.05] text-[var(--color-foreground)] xs:text-[2.6rem] sm:text-[3rem] lg:text-[3.2rem]">
                سلیقه عطری خود را کشف کنید
              </h1>
              <p className="m-0 max-w-xl text-base text-muted sm:text-lg">
                تجربه‌ای شفاف و سریع برای انتخاب رایحه‌ای که با حال‌وهوای شما هماهنگ است.
              </p>
            </motion.header>
          </section>

          <StartQuestionnaireButton className="max-w-xs" />
        </motion.article>
      </main>
    </KioskFrame>
  );
}
