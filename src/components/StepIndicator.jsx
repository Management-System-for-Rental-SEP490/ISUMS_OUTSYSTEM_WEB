import React from "react";

const STEPS = [
  {
    label: "Điều khoản",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: "Tạo chữ ký",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    label: "Vị trí ký",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Nhập OTP",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

/**
 * currentStep: 1–4
 * onGoToStep(n): rollback về bước n (chỉ cho phép về bước đã hoàn thành)
 */
export default function StepIndicator({ currentStep, onGoToStep }) {
  return (
    <div className="flex items-start w-full select-none px-2">
      {STEPS.map(({ label, icon }, idx) => {
        const n = idx + 1;
        const done = n < currentStep;
        const active = n === currentStep;
        const canBack = done && typeof onGoToStep === "function";

        return (
          <React.Fragment key={n}>
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => canBack && onGoToStep(n)}
                disabled={!canBack}
                title={canBack ? `Quay lại: ${label}` : undefined}
                className={[
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  done
                    ? "bg-green-500 text-white shadow-sm hover:bg-green-600 cursor-pointer"
                    : active
                    ? "border-2 border-[#1a3d52] text-[#1a3d52] bg-white shadow-sm cursor-default"
                    : "border border-gray-300 text-gray-400 bg-white cursor-default",
                ].join(" ")}
              >
                {done ? (
                  /* Checkmark khi hoàn thành */
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  icon
                )}
              </button>

              <span
                className={[
                  "text-xs text-center leading-tight whitespace-nowrap",
                  active
                    ? "font-semibold text-[#1a3d52]"
                    : done
                    ? "font-medium text-green-600"
                    : "text-gray-400",
                ].join(" ")}
              >
                {label}
              </span>
            </div>

            {/* Đường nối (căn giữa với circle h-12 = 48px → mt-6 = 24px) */}
            {idx < STEPS.length - 1 && (
              <div
                className={[
                  "flex-1 h-0.5 mt-6 mx-1",
                  done ? "bg-green-400" : "bg-gray-200",
                ].join(" ")}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
