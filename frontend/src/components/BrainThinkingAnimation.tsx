"use client";

import { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const DEFAULT_CAPTIONS = [
  "در حال تحلیل ترجیحات شما...",
  "در حال جستجوی بهترین عطرها...",
  "ترکیب نت‌های محبوب شما...",
];

const FALLBACK_FACTS = [
  "ابن‌سینا روش تقطیر گلاب را در قرن ۱۰ میلادی کشف کرد.",
  "عطر روی پوست گرم ماندگارتر می‌شود.",
  "نت‌های چوبی دوام بیشتری نسبت به مرکبات دارند.",
  "۹۷٪ افراد با زدن عطر احساس اعتماد به نفس بیشتری می‌کنند.",
  "گلاب ایرانی از بهترین گلاب‌های جهان محسوب می‌شود.",
  "حس بویایی مستقیماً به سیستم لیمبیک مغز متصل است.",
];

interface BrainThinkingAnimationProps {
  className?: string;
}

export function BrainThinkingAnimation({ className }: BrainThinkingAnimationProps) {
  const [captions] = useState(DEFAULT_CAPTIONS);
  const [facts, setFacts] = useState(FALLBACK_FACTS);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [dotLottieAvailable, setDotLottieAvailable] = useState(false);
  const BRAIN_LOTTIE_URL = "https://assets7.lottiefiles.com/packages/lf20_3vbOcw.json"; // JSON fallback
  const BRAIN_DOT_LOTTIE_URL = "/neural-network.lottie"; // local .lottie for better performance

  const lottieOptions = useMemo(() => {
    if (!animationData) return null;
    return {
      animationData,
      loop: true,
      autoplay: true,
    };
  }, [animationData]);

  useEffect(() => {
    let timer: number | null = null;
    timer = window.setInterval(() => {
      setCaptionIndex((prev) => (prev + 1) % captions.length);
    }, 3200);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [captions.length]);

  useEffect(() => {
    let timer: number | null = null;
    timer = window.setInterval(() => {
      setFactIndex((prev) => (prev + 1) % facts.length);
    }, 4600);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [facts.length]);

  useEffect(() => {
    const loadFacts = async () => {
      try {
        const res = await fetch("/api/fun-facts", { cache: "force-cache" });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.facts) && data.facts.length > 0) {
          setFacts(data.facts);
        }
      } catch (error) {
        console.warn("[BrainThinkingAnimation] Failed to load facts", error);
      }
    };
    loadFacts();

    const loadAnimation = async () => {
      try {
        const res = await fetch(BRAIN_LOTTIE_URL, { cache: "force-cache" });
        if (!res.ok) return;
        const data = await res.json();
        setAnimationData(data);
      } catch (error) {
        console.warn("[BrainThinkingAnimation] Failed to load animation", error);
      }
    };
    loadAnimation();

    const checkDotLottie = async () => {
      try {
        const res = await fetch(BRAIN_DOT_LOTTIE_URL, { method: "HEAD", cache: "force-cache" });
        setDotLottieAvailable(res.ok);
      } catch {
        setDotLottieAvailable(false);
      }
    };
    checkDotLottie();
  }, []);

  return (
    <div className={`flex w-full flex-col items-center gap-2.5 text-center ${className ?? ""}`}>
      <div className="relative h-72 w-72 sm:h-96 sm:w-96">
        <div className="absolute inset-[-14%] rounded-full bg-[conic-gradient(from_120deg,rgba(216,180,103,0.18),rgba(255,255,255,0.05),rgba(216,180,103,0.12))] blur-3xl opacity-80 animate-spin-slow" />
        <div className="absolute inset-[-8%] rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.24),rgba(216,180,103,0.12),rgba(0,0,0,0))] blur-xl opacity-70 animate-pulse-slow" />
        {dotLottieAvailable ? (
          <DotLottieReact src={BRAIN_DOT_LOTTIE_URL} autoplay loop style={{ width: "100%", height: "100%" }} />
        ) : lottieOptions ? (
          <Lottie {...lottieOptions} />
        ) : (
          <div className="loader-orbit" aria-label="در حال بارگذاری" />
        )}
      </div>
      <div className="h-1.5 w-40 max-w-full rounded-full bg-white/60 shadow-soft overflow-hidden">
        <div className="h-full w-1/2 animate-shimmer rounded-full bg-[var(--color-accent)]/65" />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <p className="m-0 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-foreground-muted)] animate-fade-in" aria-live="polite">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent)] shadow-soft" />
          نکته عطر امروز
        </p>
        <p className="m-0 text-base font-semibold text-[var(--color-foreground)] animate-fade-in" aria-live="polite">
          {captions[captionIndex]}
        </p>
        <p className="m-0 text-sm text-muted animate-fade-in" style={{ animationDelay: "140ms" }} aria-live="polite">
          {facts[factIndex]}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {facts.slice(0, 5).map((_, idx) => (
            <span
              key={idx}
              className={`block h-1.5 w-3 rounded-full transition-all duration-300 ${
                idx === factIndex % facts.length ? "bg-[var(--color-accent)] opacity-90" : "bg-[var(--color-foreground-muted)] opacity-30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default BrainThinkingAnimation;
