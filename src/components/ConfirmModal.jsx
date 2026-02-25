import React, { useState } from "react";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Ký hợp đồng",
  confirmLabel = "Tiếp tục",
  cancelLabel = "Hủy bỏ",
}) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b bg-white/95 backdrop-blur">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-50 transition-colors"
            disabled={loading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-800 font-medium">
              Vui lòng đồng ý với điều khoản trước khi tiếp tục thực hiện ký
              hợp đồng.
            </p>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                Tôi xác nhận đã đọc và đồng ý với các{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  điều khoản, điều kiện
                </a>{" "}
                của hợp đồng và nền tảng ký số.
              </span>
            </label>
          </div>

          <div className="text-center pt-2">
            <p className="text-sm font-semibold text-red-500">
              Nhấn “Tiếp tục” để chuyển sang bước ký hợp đồng.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 flex gap-4 justify-end border-t bg-gray-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-60"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={!checked || loading}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              "ĐANG XỬ LÝ..."
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
