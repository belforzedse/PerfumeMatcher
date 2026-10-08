import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AnimatedBackground from "./AnimatedBackground";

vi.mock("framer-motion", async () => ({
  ...await vi.importActual<typeof import("framer-motion")>("framer-motion"),
  useReducedMotion: () => false,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("AnimatedBackground capability subscription", () => {
  it("renders on the server without reading browser capability APIs", () => {
    vi.stubGlobal("window", undefined);
    expect(renderToString(<AnimatedBackground />)).toContain("<svg");
  });

  it("switches to the static fallback on pointer changes and unsubscribes", () => {
    const target = new EventTarget();
    const pointerQuery = {
      matches: false,
      addEventListener: vi.fn(target.addEventListener.bind(target)),
      removeEventListener: vi.fn(target.removeEventListener.bind(target)),
    };
    vi.stubGlobal("matchMedia", vi.fn((query: string) => query === "(pointer: coarse)"
      ? pointerQuery
      : { matches: false, addEventListener: vi.fn() }));
    const { container, unmount } = render(<AnimatedBackground />);
    expect(container.querySelector("svg")).not.toBeNull();
    act(() => {
      pointerQuery.matches = true;
      target.dispatchEvent(new Event("change"));
    });
    expect(container.querySelector("svg")).toBeNull();
    act(() => {
      pointerQuery.matches = false;
      target.dispatchEvent(new Event("change"));
    });
    expect(container.querySelector("svg")).not.toBeNull();
    unmount();
    expect(pointerQuery.removeEventListener).toHaveBeenCalledWith(
      "change", pointerQuery.addEventListener.mock.calls[0][1],
    );
  });

  it("honors the staticBackground query parameter on first client render", () => {
    window.history.replaceState(null, "", "/?staticBackground");
    const { container } = render(<AnimatedBackground />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
