import React, { StrictMode, useState, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Questionnaire from "./page";
import type { QuestionnaireAnswers } from "@/lib/questionnaire";
import { getVibePairs } from "@/lib/questionnaire-mapper";

const { push, presence } = vi.hoisted(() => ({ push: vi.fn(), presence: { retainExits: false } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/hooks", () => ({ useKioskMode: () => false }));
vi.mock("@/components/KioskFrame", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("framer-motion", async () => {
  function RetainedPresence({ children, mode }: { children: ReactNode; mode?: string }) {
    const key = React.isValidElement(children) ? children.key : null;
    const [last, setLast] = useState({ key, children, outgoing: null as ReactNode });
    if (last.children !== children) {
      setLast({ key, children, outgoing: key !== last.key ? last.children : last.outgoing });
    }
    return presence.retainExits && mode === "wait" ? (
      <><div data-testid="outgoing-question">{last.outgoing}</div><div data-testid="current-question">{children}</div></>
    ) : <>{children}</>;
  }
  return {
    ...await vi.importActual<typeof import("framer-motion")>("framer-motion"),
    AnimatePresence: RetainedPresence,
  };
});
vi.mock("@/components/questionnaire/ReviewScreen", () => ({
  default: ({ answers, onEdit }: { answers: QuestionnaireAnswers; onEdit: (section: string) => void }) => (
    <div>
      <output data-testid="review-answers">{JSON.stringify(answers)}</output>
      <button onClick={() => onEdit("intensity")}>Edit intensity</button>
    </div>
  ),
}));

beforeEach(() => {
  vi.useFakeTimers();
  push.mockClear();
  presence.retainExits = false;
  vi.stubGlobal("matchMedia", vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })));
});

const current = () => within(screen.getByTestId("current-question"));
const outgoing = () => within(screen.getByTestId("outgoing-question"));

it("ignores outgoing gender interactions and old auto-advance after moving to scenes", () => {
  presence.retainExits = true;
  render(<StrictMode><Questionnaire /></StrictMode>);
  fireEvent.click(current().getByRole("button", { name: /سریع \(۳۰ ثانیه\)/ }));
  fireEvent.click(current().getByRole("button", { name: /مرد/ }));
  next();
  fireEvent.click(outgoing().getByRole("button", { name: /زن/ }));
  expect(current().getByRole("heading", { name: "کدام صحنه بیشتر با شما هماهنگ است؟" })).toBeInTheDocument();
  fireEvent.click(current().getByRole("button", { name: /صبح زود در کافه/ }));
  act(() => vi.advanceTimersByTime(1300));
  expect(current().getByRole("heading", { name: "کدام صحنه بیشتر با شما هماهنگ است؟" })).toBeInTheDocument();
});

it("ignores outgoing scene and vibe interactions without changing review answers", () => {
  presence.retainExits = true;
  render(<StrictMode><Questionnaire /></StrictMode>);
  fireEvent.click(current().getByRole("button", { name: /سریع \(۳۰ ثانیه\)/ }));
  fireEvent.click(current().getByRole("button", { name: /مرد/ }));
  next();
  fireEvent.click(current().getByRole("button", { name: /صبح زود در کافه/ }));
  next();
  fireEvent.click(outgoing().getByRole("button", { name: /شب در مهمانی/ }));
  expect(current().getByRole("heading", { name: "چیزی هست که اصلاً نمی‌پسندید؟" })).toBeInTheDocument();
  next();
  fireEvent.click(current().getAllByRole("button", { name: /ترجیح نمی‌دهم/ })[0]);
  next();
  fireEvent.click(outgoing().getByRole("button", { name: new RegExp(getVibePairs()[0].left.label) }));
  expect(current().getByRole("heading", { name: "چقدر دوست دارید عطرتان جلب توجه کند؟" })).toBeInTheDocument();
  fireEvent.click(current().getByRole("button", { name: /قابل توجه/ }));
  next();
  expect(JSON.parse(current().getByTestId("review-answers").textContent!)).toMatchObject({
    gender: "male", moods: ["fresh"], styles: ["unisex"], intensity: ["medium"],
  });
});

it("cannot resurrect a reset questionnaire from a retained outgoing question", () => {
  presence.retainExits = true;
  render(<StrictMode><Questionnaire /></StrictMode>);
  fireEvent.click(current().getByRole("button", { name: /سریع \(۳۰ ثانیه\)/ }));
  fireEvent.click(current().getByRole("button", { name: /مرد/ }));
  fireEvent.click(screen.getByRole("button", { name: "شروع مجدد پرسشنامه" }));
  fireEvent.click(outgoing().getByRole("button", { name: /زن/ }));
  act(() => vi.advanceTimersByTime(1300));
  expect(current().getByRole("button", { name: /سریع \(۳۰ ثانیه\)/ })).toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const next = () => fireEvent.click(screen.getAllByRole("button", { name: "مرحله بعدی" })[0]);

it("keeps quick-path review and submitted answers current after edits under StrictMode", () => {
  render(<StrictMode><Questionnaire /></StrictMode>);
  fireEvent.click(screen.getByRole("button", { name: /سریع \(۳۰ ثانیه\)/ }));
  expect(screen.getByRole("heading", { name: "جنسیت شما چیست؟" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /مرد/ }));
  act(() => vi.advanceTimersByTime(1300));
  expect(screen.getByRole("heading", { name: "کدام صحنه بیشتر با شما هماهنگ است؟" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /صبح زود در کافه/ }));
  next();
  expect(screen.getByRole("heading", { name: "چیزی هست که اصلاً نمی‌پسندید؟" })).toBeInTheDocument();
  next();
  fireEvent.click(screen.getAllByRole("button", { name: /ترجیح نمی‌دهم/ })[0]);
  next();
  fireEvent.click(screen.getByRole("button", { name: /قابل توجه/ }));
  next();
  expect(JSON.parse(screen.getByTestId("review-answers").textContent!)).toMatchObject({
    gender: "male", moods: ["fresh"], intensity: ["medium"],
  });

  fireEvent.click(screen.getByRole("button", { name: "Edit intensity" }));
  fireEvent.click(screen.getByRole("button", { name: /حضور پررنگ/ }));
  next();
  expect(JSON.parse(screen.getByTestId("review-answers").textContent!).intensity).toEqual(["strong"]);
  fireEvent.click(screen.getAllByRole("button", { name: "مشاهده پیشنهادها" })[0]);
  expect(push).toHaveBeenCalledTimes(1);
  const submitted = new URL(push.mock.calls[0][0], "http://localhost").searchParams.get("answers")!;
  expect(JSON.parse(submitted)).toMatchObject({ gender: "male", moods: ["fresh"], intensity: ["strong"] });

  fireEvent.click(screen.getByRole("button", { name: "شروع مجدد پرسشنامه" }));
  expect(screen.getByRole("button", { name: /سریع \(۳۰ ثانیه\)/ })).toBeInTheDocument();
  expect(screen.queryByTestId("review-answers")).not.toBeInTheDocument();
});
