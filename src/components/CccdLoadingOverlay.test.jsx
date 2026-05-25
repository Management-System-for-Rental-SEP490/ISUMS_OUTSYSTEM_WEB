import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

let hookState = { stage: null, stepOverride: null, connected: false };
const hookMock = vi.fn(() => hookState);

vi.mock("../shared/ws/useCccdProgress", () => ({
  useCccdProgress: (...args) => hookMock(...args),
  STAGE_TO_STEP: {
    OCR_START: 1,
    PDF_ASSEMBLY: 2,
    VNPT_UPLOAD: 3,
    FINALIZING: 3,
    COMPLETE: 3,
    FAILED: -1,
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => {
      const m = {
        "cccd.processing.title": "Đang xử lý CCCD",
        "cccd.processing.subtitle": "Vui lòng chờ...",
        "cccd.processing.uploading": "Tải lên",
        "cccd.processing.scanning": "Quét",
        "cccd.processing.analyzing": "Phân tích",
        "cccd.processing.finalizing": "Hoàn tất",
        "cccd.processing.statusDone": "Xong",
        "cccd.processing.statusActive": "Đang xử lý",
        "cccd.processing.statusPending": "Chờ",
        "cccd.processing.securityBadge": "Bảo mật bởi ISUMS",
      };
      return m[key] || key;
    },
  }),
}));

import { CccdLoadingOverlay } from "./CccdModal";

const CID = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  hookState = { stage: null, stepOverride: null, connected: false };
  hookMock.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CccdLoadingOverlay", () => {
  it("renders all 4 step labels and starts at 0%", () => {
    render(<CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />);

    expect(screen.getByText("Tải lên")).toBeInTheDocument();
    expect(screen.getByText("Quét")).toBeInTheDocument();
    expect(screen.getByText("Phân tích")).toBeInTheDocument();
    expect(screen.getByText("Hoàn tất")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders the i18n title + subtitle + security badge", () => {
    render(<CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />);

    expect(screen.getByText("Đang xử lý CCCD")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng chờ...")).toBeInTheDocument();
    expect(screen.getByText("Bảo mật bởi ISUMS")).toBeInTheDocument();
  });

  it("subscribes via useCccdProgress with (contractId, !done)", () => {
    render(<CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />);

    expect(hookMock).toHaveBeenCalledWith(CID, true);
  });

  it("passes active=false to hook when done=true (stops realtime updates)", () => {
    render(<CccdLoadingOverlay done={true} onDone={() => {}} contractId={CID} />);

    expect(hookMock).toHaveBeenCalledWith(CID, false);
  });

  it("fake progress advances over time when not done", () => {
    render(<CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />);
    expect(screen.getByText("0%")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(160 * 25);
    });

    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    const percentText = document.querySelector(".text-base.font-bold");
    expect(percentText).toBeTruthy();
    const pct = parseInt(percentText.textContent, 10);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThanOrEqual(99);
  });

  it("clamps fake progress at 99% (never auto-completes without done flag)", () => {
    render(<CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />);

    act(() => {
      vi.advanceTimersByTime(160 * 1000);
    });

    const percentText = document.querySelector(".text-base.font-bold");
    expect(parseInt(percentText.textContent, 10)).toBeLessThanOrEqual(99);
  });

  it("when realtime stepOverride arrives, progress jumps forward to step range start", () => {
    const { rerender } = render(
      <CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />
    );
    expect(screen.getByText("0%")).toBeInTheDocument();

    hookState = { stage: "VNPT_UPLOAD", stepOverride: 3, connected: true };
    act(() => {
      rerender(<CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />);
    });

    const percentText = document.querySelector(".text-base.font-bold");
    expect(parseInt(percentText.textContent, 10)).toBeGreaterThanOrEqual(85);
  });

  it("FAILED stage (stepOverride=-1) does NOT trigger progress jump", () => {
    const { rerender } = render(
      <CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />
    );
    act(() => vi.advanceTimersByTime(160 * 5));
    const baseline = parseInt(
      document.querySelector(".text-base.font-bold").textContent,
      10
    );

    hookState = { stage: "FAILED", stepOverride: -1, connected: true };
    act(() => {
      rerender(<CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />);
    });

    const afterFail = parseInt(
      document.querySelector(".text-base.font-bold").textContent,
      10
    );
    expect(afterFail).toBeLessThanOrEqual(baseline + 1);
  });

  it("when done=true sprints to 100% and calls onDone", () => {
    const onDone = vi.fn();
    render(<CccdLoadingOverlay done={true} onDone={onDone} contractId={CID} />);

    act(() => {
      vi.advanceTimersByTime(30 * 60);
    });

    const percentText = document.querySelector(".text-base.font-bold");
    expect(parseInt(percentText.textContent, 10)).toBeGreaterThanOrEqual(99);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onDone).toHaveBeenCalled();
  });

  it("ignores stepOverride that would move progress backward", () => {
    hookState = { stage: "VNPT_UPLOAD", stepOverride: 3, connected: true };
    const { rerender } = render(
      <CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />
    );
    const beforePct = parseInt(
      document.querySelector(".text-base.font-bold").textContent,
      10
    );
    expect(beforePct).toBeGreaterThanOrEqual(85);

    hookState = { stage: "OCR_START", stepOverride: 1, connected: true };
    act(() => {
      rerender(<CccdLoadingOverlay done={false} onDone={() => {}} contractId={CID} />);
    });

    const afterPct = parseInt(
      document.querySelector(".text-base.font-bold").textContent,
      10
    );
    expect(afterPct).toBeGreaterThanOrEqual(beforePct);
  });
});
