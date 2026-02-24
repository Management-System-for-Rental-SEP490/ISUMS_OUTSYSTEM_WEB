import React, { useRef, useState, useCallback, useEffect } from "react";

/** 1: Chỉ văn bản | 2: Văn bản và hình ảnh | 3: Chỉ hình ảnh */
export const SIGNATURE_DISPLAY_MODE = {
  TEXT_ONLY: 1,
  TEXT_AND_IMAGE: 2,
  IMAGE_ONLY: 3,
};

export default function SignModal({
  open,
  onClose,
  onSubmit,
  loading,
  contractName,
}) {
  const [step, setStep] = useState(1); // 1: signature, 2: OTP
  const [signatureDisplayMode, setSignatureDisplayMode] = useState(1); // 1 văn bản | 2 văn bản và hình ảnh | 3 hình ảnh ( vẽ chữ kí)
  const [signatureImage, setSignatureImage] = useState(null);
  const [reason, setReason] = useState("");
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [otp, setOtp] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(null); // đếm ngược OTP ký
  const [signatureInputMode, setSignatureInputMode] = useState("draw"); // draw | upload
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatureImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (open) {
      setStep(1);
      setSignatureDisplayMode(1);
      setSignatureImage(null);
      setSignatureInputMode("draw");
      setReason("");
      setConfirmTerms(false);
      setOtp("");
      setRemainingSeconds(null);
    }
  }, [open]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureImage(null);
  }, []);

  useEffect(() => {
    if (
      !open ||
      (signatureDisplayMode !== 2 && signatureDisplayMode !== 3) ||
      signatureInputMode !== "draw"
    )
      return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const start = (e) => {
      e.preventDefault();
      isDrawing.current = true;
      const pos = getPos(e);
      console.log(pos);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const end = () => {
      isDrawing.current = false;
      const data = canvas.toDataURL("image/png");
      setSignatureImage(data);
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", end);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("mouseleave", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", end);
    };
  }, [open, signatureDisplayMode, signatureInputMode]);

  const needImage = signatureDisplayMode === 2 || signatureDisplayMode === 3;
  const isValidStep1 = confirmTerms && (needImage ? !!signatureImage : true);
  const isValidStep2 = /^\d{6}$/.test(otp) && (remainingSeconds ?? 1) > 0;

  const handleStep1Submit = () => {
    if (!isValidStep1) return;
    const payload = {
      signatureDisplayMode,
      signatureImage: needImage ? signatureImage : null,
      reason: reason.trim() || null,
      confirmTermsConditions: confirmTerms,
    };
    onSubmit(payload, null, (processId) => {
      setStep(2);
      setRemainingSeconds(5 * 60);
    });
  };

  const handleStep2Submit = () => {
    if (!isValidStep2) return;
    const payload = { otp };
    onSubmit(null, payload, () => {});
  };

  // đếm ngược OTP (chỉ ở bước 2)
  useEffect(() => {
    if (!open || step !== 2 || remainingSeconds == null) return;
    if (remainingSeconds <= 0) return;

    const id = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev == null || prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [open, step, remainingSeconds]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <h3 className="font-semibold text-gray-800">
            {step === 1 ? "Ký hợp đồng" : "Nhập mã OTP"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black disabled:opacity-50"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5">
          {step === 1 ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Vui lòng tạo chữ ký và xác nhận điều khoản để tiếp tục ký hợp
                đồng {contractName ? `"${contractName}"` : ""}.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chế độ hiển thị chữ ký
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="signatureDisplayMode"
                        value={1}
                        checked={signatureDisplayMode === 1}
                        onChange={() => setSignatureDisplayMode(1)}
                      />
                      <span>1. Chỉ văn bản</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="signatureDisplayMode"
                        value={2}
                        checked={signatureDisplayMode === 2}
                        onChange={() => setSignatureDisplayMode(2)}
                      />
                      <span>2. Văn bản và hình ảnh</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="signatureDisplayMode"
                        value={3}
                        checked={signatureDisplayMode === 3}
                        onChange={() => setSignatureDisplayMode(3)}
                      />
                      <span>3. Chỉ hình ảnh</span>
                    </label>
                  </div>
                </div>

                {signatureDisplayMode === 2 || signatureDisplayMode === 3 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {signatureDisplayMode === 2
                        ? "Chữ ký (văn bản và hình ảnh)"
                        : "Chữ ký (chỉ hình ảnh)"}
                    </label>

                    {signatureInputMode === "draw" ? (
                      <div className="space-y-2">
                        <div className="border rounded-lg overflow-hidden bg-white">
                          <canvas
                            ref={canvasRef}
                            width={400}
                            height={150}
                            className="w-full touch-none"
                            style={{
                              width: "100%",
                              height: "150px",
                              cursor: "crosshair",
                            }}
                          />
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="text-sm text-gray-500 hover:text-red-600 py-1 px-2"
                          >
                            Xóa và vẽ lại
                          </button>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => {
                            setSignatureImage(null);
                            setSignatureInputMode("upload");
                          }}
                        >
                          Đã có hình ảnh chữ ký? Tải lên ngay
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600">
                          Tải lên hình ảnh chữ ký của bạn.
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="block w-full text-xs text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-xs file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                        />
                        {signatureImage && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">
                              Xem trước hình ảnh chữ ký:
                            </p>
                            <img
                              src={signatureImage}
                              alt="Chữ ký đã chọn"
                              className="max-h-32 border rounded-md"
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => {
                            setSignatureImage(null);
                            setSignatureInputMode("draw");
                            clearCanvas();
                          }}
                        >
                          Vẽ chữ ký
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lý do ký (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ví dụ: Đồng ý với nội dung hợp đồng"
                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div> */}

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmTerms}
                    onChange={(e) => setConfirmTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    Tôi xác nhận đã đọc và đồng ý với các điều khoản của hợp
                    đồng
                  </span>
                </label>
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  onClick={handleStep1Submit}
                  disabled={!isValidStep1 || loading}
                  className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Đang xử lý..." : "Gửi và nhận OTP"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Mã OTP đã được gửi đến số điện thoại/email của bạn. Vui lòng
                nhập mã 6 chữ số để hoàn tất ký hợp đồng.
              </p>

              {typeof remainingSeconds === "number" && (
                <div className="mb-3 text-sm text-gray-700 flex items-baseline gap-2">
                  <span className="font-semibold">
                    {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}{" "}
                    Phút {String(remainingSeconds % 60).padStart(2, "0")} Giây
                  </span>
                  {remainingSeconds <= 0 && (
                    <span className="text-red-500">
                      OTP đã hết hạn, vui lòng gửi lại yêu cầu ký.
                    </span>
                  )}
                </div>
              )}

              <input
                value={otp}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(v);
                }}
                inputMode="numeric"
                autoFocus
                placeholder="______"
                className="w-full text-center tracking-[0.6em] text-2xl font-semibold border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleStep2Submit}
                  disabled={!isValidStep2 || loading}
                  className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Đang ký..." : "Hoàn tất ký"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
