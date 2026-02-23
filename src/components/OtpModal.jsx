import React, { useMemo, useState } from "react";

export default function OtpModal({ open, onClose, onSubmit, loading }) {
  const [otp, setOtp] = useState("");

  const isValid = useMemo(() => /^\d{6}$/.test(otp), [otp]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Nhập mã OTP</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm text-gray-600 mb-3">
            Vui lòng nhập mã OTP gồm 6 chữ số để hoàn tất xác nhận.
          </p>

          <input
            value={otp}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setOtp(v);
            }}
            inputMode="numeric"
            autoFocus
            placeholder="______"
            className="w-full text-center tracking-[0.6em] text-2xl font-semibold border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="mt-5 flex gap-2 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              onClick={() => onSubmit(otp)}
              disabled={!isValid || loading}
              className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Đang xác minh..." : "Xác minh"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
