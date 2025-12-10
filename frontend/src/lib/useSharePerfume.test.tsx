import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GlassToastProvider } from "@/components/GlassToastProvider";
import { useSharePerfume } from "@/lib/useSharePerfume";
import type { RankedPerfume } from "@/lib/perfume-matcher";

const mockPerfume: RankedPerfume = {
  id: 99,
  nameEn: "Aurora",
  nameFa: "آرورا",
  brand: "Celestial",
  collection: "Starlight",
  gender: "unisex",
  season: "all",
  family: "floral",
  character: "fresh",
  notes: { top: [], middle: [], base: [] },
  allNotes: [],
  image: "/aurora.png",
  score: 90,
  maxScore: 100,
  matchPercentage: 90,
  reasons: ["دارای رایحه گل های تازه", "مناسب استفاده روزانه"],
  breakdown: [],
  matchedCorePreferences: 5,
  consideredCorePreferences: 6,
  confidence: 82,
};

function TestComponent({ perfume }: { perfume: RankedPerfume }) {
  const share = useSharePerfume();
  return (
    <button type="button" onClick={() => share(perfume)}>
      share
    </button>
  );
}

describe("useSharePerfume", () => {
  const originalShare = navigator.share;
  const originalCanShare = navigator.canShare;
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(navigator, {
      share: originalShare,
      canShare: originalCanShare,
      clipboard: originalClipboard,
    });
  });

  afterEach(() => {
    Object.assign(navigator, {
      share: originalShare,
      canShare: originalCanShare,
      clipboard: originalClipboard,
    });
  });

  it("prefers the Web Share API when available", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      share: shareMock,
      canShare: () => true,
      clipboard: {
        writeText: vi.fn(),
      },
    });

    render(
      <GlassToastProvider>
        <TestComponent perfume={mockPerfume} />
      </GlassToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalled();
    });

    const args = shareMock.mock.calls[0][0];
    expect(args.title).toContain("آرورا");
    expect(args.text).toContain("درصد تطابق: 90٪");
    expect(navigator.clipboard?.writeText).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("درخواست اشتراک‌گذاری باز شد.");
    });
  });

  it("copies formatted details when Web Share is unavailable", async () => {
    Object.assign(navigator, {
      share: undefined,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(
      <GlassToastProvider>
        <TestComponent perfume={mockPerfume} />
      </GlassToastProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(navigator.clipboard?.writeText).toHaveBeenCalledWith(expect.stringContaining("آرورا"));
    });

    expect(navigator.clipboard?.writeText).toHaveBeenCalledWith(expect.stringContaining("درصد تطابق: 90٪"));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("جزئیات عطر در حافظه کپی شد.");
    });
  });
});
