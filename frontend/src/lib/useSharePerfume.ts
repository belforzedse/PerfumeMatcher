"use client";

import { useCallback } from "react";
import type { RankedPerfume } from "@/lib/perfume-matcher";
import { useGlassToast } from "@/components/GlassToastProvider";

function formatPerfumeDetails(perfume: RankedPerfume) {
  const parts: string[] = [];
  const title = perfume.nameFa?.trim().length
    ? perfume.nameFa.trim()
    : perfume.nameEn?.trim() ?? "عطر پیشنهادی";
  parts.push(title);

  if (perfume.brand?.trim()) {
    parts.push(`برند: ${perfume.brand.trim()}`);
  }

  const details = [perfume.collection, perfume.family].filter((value) => value && value.trim().length > 0);
  if (details.length > 0) {
    parts.push(`دسته‌بندی: ${details.join(" • ")}`);
  }

  parts.push(`درصد تطابق: ${perfume.matchPercentage}٪`);
  if (typeof perfume.confidence === "number" && perfume.confidence > 0) {
    parts.push(`اطمینان سیستم: ${Math.round(perfume.confidence)}٪`);
  }

  if (perfume.reasons?.length) {
    const highlighted = perfume.reasons.slice(0, 2).join("، ");
    if (highlighted) {
      parts.push(`به این دلایل انتخاب شد: ${highlighted}`);
    }
  }

  if (typeof window !== "undefined" && window.location) {
    parts.push(`از عطرساز: ${window.location.origin}${window.location.pathname}`);
  }

  return parts.join("\n");
}

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined") {
    throw new Error("Clipboard not available");
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

export function useSharePerfume() {
  const { showToast } = useGlassToast();

  return useCallback(
    async (perfume: RankedPerfume) => {
      const description = formatPerfumeDetails(perfume);

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          const shareData: ShareData = {
            title:
              perfume.nameFa?.trim().length
                ? perfume.nameFa.trim()
                : perfume.nameEn?.trim() ?? "عطر پیشنهادی",
            text: description,
          };

          if (!navigator.canShare || navigator.canShare(shareData)) {
            await navigator.share(shareData);
            showToast("درخواست اشتراک‌گذاری باز شد.", { tone: "success" });
            return;
          }
        } catch (error) {
          console.warn("navigator.share failed, falling back to clipboard", error);
        }
      }

      try {
        await copyToClipboard(description);
        showToast("جزئیات عطر در حافظه کپی شد.", { tone: "success" });
      } catch (error) {
        console.error("Unable to copy share text", error);
        showToast("کپی جزئیات ناموفق بود. لطفاً به صورت دستی کپی کنید.", { tone: "error" });
      }
    },
    [showToast]
  );
}

export type SharePerfumeHandler = ReturnType<typeof useSharePerfume>;
