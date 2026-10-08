import React, { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import IdleTimer from "./IdleTimer";
import MultiImageUpload from "./MultiImageUpload";
import PairwiseChoice from "./questionnaire/PairwiseChoice";

vi.mock("@/lib/hooks", () => ({ useKioskMode: () => false }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("IdleTimer", () => {
  it("expires once under StrictMode and stops its countdown", () => {
    vi.useFakeTimers();
    const onIdle = vi.fn();
    render(<StrictMode><IdleTimer timeoutMs={3000} isActive onIdle={onIdle} /></StrictMode>);
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("2")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10000));
    expect(onIdle).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("pauses while inactive and resets when its timeout changes", () => {
    vi.useFakeTimers();
    const onIdle = vi.fn();
    const { rerender } = render(<IdleTimer timeoutMs={5000} isActive onIdle={onIdle} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("4")).toBeInTheDocument();
    rerender(<IdleTimer timeoutMs={5000} isActive={false} onIdle={onIdle} />);
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.queryByText("4")).not.toBeInTheDocument();
    expect(onIdle).not.toHaveBeenCalled();
    rerender(<IdleTimer timeoutMs={5000} isActive onIdle={onIdle} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("3")).toBeInTheDocument();
    rerender(<IdleTimer timeoutMs={8000} isActive onIdle={onIdle} />);
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});

describe("PairwiseChoice", () => {
  const pair = { id: "test", left: { label: "Left" }, right: { label: "Right" }, styles: [] };

  it("keeps the choice button mounted and focused as selection changes", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<PairwiseChoice pair={pair} selected={null} onSelect={onSelect} />);
    const choice = screen.getByRole("button", { name: /Left/ });
    choice.focus();
    fireEvent.click(choice);
    expect(onSelect).toHaveBeenCalledWith("left");
    rerender(<PairwiseChoice pair={pair} selected="left" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: /Left/ })).toBe(choice);
    expect(choice).toHaveFocus();
    expect(choice).toHaveTextContent("انتخاب شد");
  });

  it("keeps the skip controls mounted and honors showNotSure", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<PairwiseChoice pair={pair} selected={null} onSelect={onSelect} />);
    const skip = screen.getAllByRole("button", { name: /ترجیح نمی‌دهم/ })[0];
    fireEvent.click(skip);
    expect(onSelect).toHaveBeenCalledWith("none");
    rerender(<PairwiseChoice pair={pair} selected="none" onSelect={onSelect} />);
    expect(screen.getAllByRole("button", { name: /ترجیح نمی‌دهم/ })[0]).toBe(skip);
    rerender(<PairwiseChoice pair={pair} selected="none" onSelect={onSelect} showNotSure={false} />);
    expect(screen.queryByRole("button", { name: /ترجیح نمی‌دهم/ })).not.toBeInTheDocument();
  });
});

describe("MultiImageUpload", () => {
  it("shows URL previews immediately and keeps the remaining preview after removal", () => {
    const onChange = vi.fn();
    const { rerender } = render(<MultiImageUpload value={["/first.png", "/second.png"]} onChange={onChange} />);
    expect(screen.getByAltText("تصویر 1")).toHaveAttribute("src", "/first.png");
    fireEvent.click(screen.getByRole("button", { name: "حذف تصویر 1" }));
    expect(onChange).toHaveBeenCalledWith(["/second.png"]);
    rerender(<MultiImageUpload value={["/second.png"]} onChange={onChange} />);
    expect(screen.getByAltText("تصویر 1")).toHaveAttribute("src", "/second.png");
  });

  it("cancels obsolete reads and associates file previews with the current file", () => {
    class Reader {
      static LOADING = 1;
      static instances: Reader[] = [];
      readyState = Reader.LOADING;
      result: string | null = null;
      onload: (() => void) | null = null;
      abort = vi.fn();
      constructor() { Reader.instances.push(this); }
      readAsDataURL() {}
      complete(result: string) {
        this.result = result;
        this.readyState = 2;
        this.onload?.();
      }
    }
    vi.stubGlobal("FileReader", Reader);
    const first = new File(["first"], "first.png", { type: "image/png" });
    const second = new File(["second"], "second.png", { type: "image/png" });
    const { rerender, unmount } = render(<MultiImageUpload value={[first]} onChange={vi.fn()} />);
    const obsolete = Reader.instances[0];
    const lateCallback = obsolete.onload;
    rerender(<MultiImageUpload value={[second]} onChange={vi.fn()} />);
    expect(obsolete.abort).toHaveBeenCalledOnce();
    act(() => {
      obsolete.result = "data:image/png;base64,old";
      lateCallback?.();
    });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    act(() => Reader.instances[1].complete("data:image/png;base64,new"));
    expect(screen.getByAltText("تصویر 1")).toHaveAttribute("src", "data:image/png;base64,new");
    rerender(<MultiImageUpload value={["/server.png"]} onChange={vi.fn()} />);
    expect(screen.getByAltText("تصویر 1")).toHaveAttribute("src", "/server.png");
    unmount();
    expect(Reader.instances[1].onload).toBeNull();
  });
});
