import { useRef, useState, useEffect } from "react";

const STEPS = [
  { label: "Đang tải lên hình ảnh...", range: [0, 15] },
  { label: "Đang quét dữ liệu CCCD...", range: [15, 30] },
  { label: "Đang phân tích CCCD...", range: [30, 85] },
  { label: "Đang xử lí hợp đồng...", range: [85, 100] },
];

function CccdLoadingOverlay({ done, onDone }) {
  const [progress, setProgress] = useState(0);

  // Phase 1: tăng dần đến 95
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) {
          clearInterval(interval);
          return 95;
        }
        const increment = p < 40 ? 2 : p < 75 ? 1 : 0.4;
        return Math.min(p + increment, 99);
      });
    }, 160);
    return () => clearInterval(interval);
  }, []);

  // Phase 2: khi API xong, sprint nhanh 95→100 rồi gọi onDone
  useEffect(() => {
    if (!done) return;
    let p = 95;
    const sprint = setInterval(() => {
      p += 1;
      setProgress(p);
      if (p >= 100) {
        clearInterval(sprint);
        setTimeout(onDone, 200);
      }
    }, 60);
    return () => clearInterval(sprint);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.round(progress);
  const activeStep = STEPS.findIndex((s) => pct < s.range[1]);
  const currentStep = activeStep === -1 ? STEPS.length - 1 : activeStep;

  // SVG circular progress
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  return (
    <div className="flex flex-col items-center justify-center px-8 py-10 gap-6">
      {/* Circular progress */}
      <div className="relative flex items-center justify-center w-28 h-28">
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#0d7a8a"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 0.16s linear" }}
          />
        </svg>
        <div className="flex flex-col items-center">
          <svg
            className="w-6 h-6 text-[#0d7a8a] mb-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            />
          </svg>
          <span className="text-base font-bold text-[#0d7a8a]">{pct}%</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <p className="text-lg font-bold text-gray-800">
          Đang tải lên và xác minh CCCD
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Vui lòng giữ kết nối, chúng tôi đang xử lý bảo mật cho tài liệu của
          bạn.
        </p>
      </div>

      {/* Steps */}
      <div className="w-full flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const done = pct >= step.range[1];
          const active = i === currentStep && !done;
          return (
            <div
              key={i}
              className={[
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                done
                  ? "bg-white border-gray-200"
                  : active
                    ? "bg-teal-50 border-teal-200"
                    : "bg-white border-gray-100",
              ].join(" ")}
            >
              {/* Icon */}
              <div
                className={[
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                  done
                    ? "bg-green-500"
                    : active
                      ? "bg-white border-2 border-teal-400"
                      : "bg-gray-100",
                ].join(" ")}
              >
                {done ? (
                  <svg
                    className="w-4 h-4 text-white"
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
                ) : active ? (
                  <svg
                    className="w-4 h-4 text-teal-500 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    />
                  </svg>
                )}
              </div>
              {/* Text */}
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {step.label}
                </p>
                <p
                  className={[
                    "text-xs font-medium",
                    done
                      ? "text-green-500"
                      : active
                        ? "text-teal-500"
                        : "text-gray-400",
                  ].join(" ")}
                >
                  {done ? "Hoàn tất" : active ? "Đang xử lý" : "Chờ đợi"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer badge */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          />
        </svg>
        BẢO MẬT CHUẨN AES-256
      </div>
    </div>
  );
}

/** Xoay ảnh bằng canvas và trả về File mới đã rotate */
async function rotateImageFile(file, degrees) {
  if (degrees === 0) return file;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const rad = (degrees * Math.PI) / 180;
  const swap = degrees % 180 !== 0;
  canvas.width = swap ? bitmap.height : bitmap.width;
  canvas.height = swap ? bitmap.width : bitmap.height;
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) => resolve(new File([blob], file.name, { type: file.type })),
      file.type,
    ),
  );
}

function ImageUploadBox({ label, preview, rotation, onSelect, onRotate }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onSelect(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div
        onClick={() => !preview && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={[
          "relative flex flex-col items-center justify-center w-full h-52 rounded-xl transition-colors overflow-hidden",
          preview
            ? "border-2 border-teal-400 bg-white"
            : "border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer",
        ].join(" ")}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={label}
              className="absolute inset-0 w-full h-full object-contain p-2 transition-transform duration-300"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            {/* Checkmark badge */}
            <span className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full bg-green-500 shadow z-10">
              <svg
                className="w-4 h-4 text-white"
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
            </span>
            {/* Nút xoay ảnh */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRotate();
              }}
              title="Xoay ảnh 90°"
              className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 border border-gray-200 shadow text-xs font-medium text-gray-600 hover:bg-white hover:text-teal-600 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Xoay
            </button>
            {/* Nút đổi ảnh */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              title="Chọn ảnh khác"
              className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 border border-gray-200 shadow text-xs font-medium text-gray-600 hover:bg-white hover:text-blue-600 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Đổi ảnh
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 select-none px-4 text-center">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                strokeWidth={1.5}
              />
              <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.5} />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 15l-5-5L5 21"
              />
            </svg>
            <span className="text-sm font-semibold text-gray-700">
              Nhấn hoặc kéo ảnh vào đây
            </span>
            <span className="text-xs text-gray-400">
              Định dạng hỗ trợ: JPG, PNG, tối đa 5MB
            </span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

export default function CccdModal({ open, onClose, onConfirm, stepIndicator }) {
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [frontRotation, setFrontRotation] = useState(0);
  const [backRotation, setBackRotation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  if (!open) return null;

  const handleSelect = (side, file) => {
    const url = URL.createObjectURL(file);
    if (side === "front") {
      setFrontFile(file);
      setFrontPreview(url);
      setFrontRotation(0);
    } else {
      setBackFile(file);
      setBackPreview(url);
      setBackRotation(0);
    }
  };

  const handleSubmit = async () => {
    if (!frontFile || !backFile) return;
    setLoading(true);
    setApiDone(false);
    setSubmitError(null);
    try {
      const [rotatedFront, rotatedBack] = await Promise.all([
        rotateImageFile(frontFile, frontRotation),
        rotateImageFile(backFile, backRotation),
      ]);
      await onConfirm(rotatedFront, rotatedBack);
      setApiDone(true); // trigger sprint 95→100 rồi overlay tự gọi onDone
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Xác minh CCCD thất bại, vui lòng thử lại.";
      setSubmitError(msg);
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview(null);
    setBackPreview(null);
    setFrontRotation(0);
    setBackRotation(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-9999 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {stepIndicator && (
          <div className="px-8 pt-6 pb-5 border-b border-gray-100">
            {stepIndicator}
          </div>
        )}
        {/* Header */}
        <div className="px-6 pt-6 pb-3 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#1a3d52]">
              Xác minh danh tính (CCCD)
            </h3>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              Vui lòng tải lên ảnh mặt trước và mặt sau Căn cước công dân để xác
              minh danh tính trước khi ký hợp đồng.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="ml-4 mt-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors shrink-0"
          >
            <svg
              className="w-5 h-5"
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

        {/* Loading overlay */}
        {loading && (
          <CccdLoadingOverlay done={apiDone} onDone={() => setLoading(false)} />
        )}

        {/* Upload boxes */}
        <div className={`px-6 pt-3 pb-4 ${loading ? "hidden" : ""}`}>
          <div className="grid grid-cols-2 gap-4">
            <ImageUploadBox
              label="Mặt trước CCCD"
              preview={frontPreview}
              rotation={frontRotation}
              onSelect={(f) => handleSelect("front", f)}
              onRotate={() => setFrontRotation((r) => (r + 90) % 360)}
            />
            <ImageUploadBox
              label="Mặt sau CCCD"
              preview={backPreview}
              rotation={backRotation}
              onSelect={(f) => handleSelect("back", f)}
              onRotate={() => setBackRotation((r) => (r + 90) % 360)}
            />
          </div>
        </div>

        {/* Tips */}
        <div
          className={`mx-6 mb-5 rounded-xl bg-slate-50 border border-slate-200 p-4 flex gap-3 ${loading ? "hidden" : ""}`}
        >
          <svg
            className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7-4a1 1 0 10-2 0v1a1 1 0 102 0V6zm-1 3a1 1 0 00-1 1v4a1 1 0 102 0v-4a1 1 0 00-1-1z"
            />
          </svg>
          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-700 mb-1">
              Lưu ý khi chụp ảnh:
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Ảnh chụp cần rõ nét, không bị lóa sáng hay mất góc.</li>
              <li>Thông tin trên thẻ phải còn thời hạn sử dụng.</li>
            </ul>
          </div>
        </div>

        {/* Error banner */}
        <div
          className="mx-6 overflow-hidden transition-all duration-500 ease-in-out"
          style={{
            maxHeight: !loading && submitError ? "80px" : "0px",
            opacity: !loading && submitError ? 1 : 0,
            marginBottom: !loading && submitError ? "1rem" : "0",
          }}
        >
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <svg
              className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              />
            </svg>
            <p className="text-sm text-red-600">{submitError}</p>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-6 pb-6 flex items-center justify-end gap-4 ${loading ? "hidden" : ""}`}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={!frontFile || !backFile || loading}
            onClick={handleSubmit}
            className="px-7 py-2.5 rounded-full text-sm font-semibold bg-[#1a3d52] text-white hover:bg-[#15324a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang tải lên..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}
