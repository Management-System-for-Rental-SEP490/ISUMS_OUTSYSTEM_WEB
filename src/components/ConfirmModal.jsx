import React, { useState } from "react";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Xác nhận trước khi ký",
  message = "Bạn vui lòng xác nhận rằng bạn đã xem đầy đủ nội dung hợp đồng.",
  confirmLabel = "Đồng ý",
  cancelLabel = "Hủy",
  checkboxLabel = "Tôi đã xem đầy đủ hợp đồng",
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
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black disabled:opacity-50 text-xl leading-none"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm text-gray-600">{message}</p>

          <label className="flex items-center gap-2 mt-4 text-sm text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="rounded"
            />
            <span>{checkboxLabel}</span>
          </label>

          <div className="mt-6 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={!checked || loading}
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Đang xử lý..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
