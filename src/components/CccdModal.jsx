import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCccdProgress } from "../shared/ws/useCccdProgress";

// Ranges stay module-scope; labels are resolved inside the component so the
// i18n runtime can pick the right locale per render.
const STEP_RANGES = [
  [0, 15],
  [15, 30],
  [30, 85],
  [85, 100],
];

const OCR_ERROR_MESSAGE_KEYS = {
  OCR_NOT_FRONT_SIDE: "cccd.errors.notFrontSide",
  OCR_NOT_BACK_SIDE: "cccd.errors.notBackSide",
  OCR_CANNOT_READ_ID: "cccd.errors.cannotReadId",
  OCR_CANNOT_READ_NAME: "cccd.errors.cannotReadName",
  OCR_ID_MISMATCH: "cccd.errors.idMismatch",
  OCR_NAME_MISMATCH: "cccd.errors.nameMismatch",
  OCR_IMAGE_NOT_READABLE: "cccd.errors.imageNotReadable",
  OCR_SERVICE_UNAVAILABLE: "cccd.errors.serviceUnavailable",
};

function getApiErrorMessage(err, fallback, t) {
  const data = err?.response?.data;
  const code = data?.code || data?.errorCode || data?.errors?.find((item) => item?.code)?.code;
  if (code && OCR_ERROR_MESSAGE_KEYS[code]) {
    return t(OCR_ERROR_MESSAGE_KEYS[code]);
  }
  return (
    data?.message ||
    data?.errors?.find((item) => item?.message)?.message ||
    data?.error ||
    err?.message ||
    fallback
  );
}

export function CccdLoadingOverlay({ done, onDone, contractId }) {
  const { t } = useTranslation("common");
  const steps = [
    { label: t("cccd.processing.uploading"),  range: STEP_RANGES[0] },
    { label: t("cccd.processing.scanning"),   range: STEP_RANGES[1] },
    { label: t("cccd.processing.analyzing"),  range: STEP_RANGES[2] },
    { label: t("cccd.processing.finalizing"), range: STEP_RANGES[3] },
  ];
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const { stepOverride, connected } = useCccdProgress(contractId, !done);

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 99) {
          clearInterval(interval);
          return 99;
        }
        const increment = p < 30 ? 0.8 : p < 85 ? 0.55 : 0.28;
        const next = Math.min(p + increment, 99);
        progressRef.current = next;
        return next;
      });
    }, 160);
    return () => clearInterval(interval);
  }, [done]);

  useEffect(() => {
    if (stepOverride == null || stepOverride < 0) return;
    const target = STEP_RANGES[stepOverride]?.[0] ?? 0;
    setProgress((p) => {
      if (p >= target) return p;
      progressRef.current = target;
      return target;
    });
  }, [stepOverride]);

  useEffect(() => {
    if (!done) return;
    let p = Math.round(progressRef.current);
    const fast = p < 99;
    const step = fast ? 2 : 1;
    const intervalMs = fast ? 30 : 60;
    const sprint = setInterval(() => {
      p = Math.min(p + step, 100);
      progressRef.current = p;
      setProgress(p);
      if (p >= 100) {
        clearInterval(sprint);
        setTimeout(onDone, 200);
      }
    }, intervalMs);
    return () => clearInterval(sprint);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.round(progress);
  const fakeActiveStep = steps.findIndex((s) => pct < s.range[1]);
  const fakeStep = fakeActiveStep === -1 ? steps.length - 1 : fakeActiveStep;
  const currentStep = connected && stepOverride != null && stepOverride >= 0 ? stepOverride : fakeStep;

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
          {t("cccd.processing.title")}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {t("cccd.processing.subtitle")}
        </p>
      </div>

      {/* Steps */}
      <div className="w-full flex flex-col gap-3">
        {steps.map((step, i) => {
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
                  {done
                    ? t("cccd.processing.statusDone")
                    : active
                      ? t("cccd.processing.statusActive")
                      : t("cccd.processing.statusPending")}
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
        {t("cccd.processing.securityBadge")}
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

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/** Modal cắt ảnh */
function CropModal({ src, originalFile, onCrop, onCancel }) {
  const { t } = useTranslation("common");
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const [cropBox, setCropBox] = useState(null);

  const initCropBox = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    const m = 0.08;
    setCropBox({ x: w * m, y: h * m, w: w * (1 - 2 * m), h: h * (1 - 2 * m) });
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      const d = dragRef.current;
      if (!d || !imgRef.current) return;
      const img = imgRef.current;
      const imgW = img.clientWidth;
      const imgH = img.clientHeight;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const minSize = 24;
      let { x, y, w, h } = d.box;
      const type = d.type;

      if (type === "move") {
        x = clamp(d.box.x + dx, 0, imgW - d.box.w);
        y = clamp(d.box.y + dy, 0, imgH - d.box.h);
      } else {
        if (type.includes("l")) {
          const newX = clamp(d.box.x + dx, 0, d.box.x + d.box.w - minSize);
          w = d.box.x + d.box.w - newX;
          x = newX;
        }
        if (type.includes("r")) {
          w = clamp(d.box.w + dx, minSize, imgW - d.box.x);
        }
        if (type.includes("t")) {
          const newY = clamp(d.box.y + dy, 0, d.box.y + d.box.h - minSize);
          h = d.box.y + d.box.h - newY;
          y = newY;
        }
        if (type.includes("b")) {
          h = clamp(d.box.h + dy, minSize, imgH - d.box.y);
        }
      }
      setCropBox({ x, y, w, h });
    };

    const onMouseUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const startDrag = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      box: { ...cropBox },
    };
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !cropBox) return;
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropBox.w * scaleX);
    canvas.height = Math.round(cropBox.h * scaleY);
    canvas
      .getContext("2d")
      .drawImage(
        img,
        cropBox.x * scaleX,
        cropBox.y * scaleY,
        cropBox.w * scaleX,
        cropBox.h * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    canvas.toBlob(
      (blob) =>
        onCrop(
          new File([blob], originalFile.name, { type: originalFile.type }),
          URL.createObjectURL(blob),
        ),
      originalFile.type,
      0.95,
    );
  };

  const handles = [
    { id: "tl", style: { top: -5, left: -5, cursor: "nw-resize" } },
    {
      id: "tc",
      style: { top: -5, left: "50%", marginLeft: -5, cursor: "n-resize" },
    },
    { id: "tr", style: { top: -5, right: -5, cursor: "ne-resize" } },
    {
      id: "ml",
      style: { top: "50%", left: -5, marginTop: -5, cursor: "w-resize" },
    },
    {
      id: "mr",
      style: { top: "50%", right: -5, marginTop: -5, cursor: "e-resize" },
    },
    { id: "bl", style: { bottom: -5, left: -5, cursor: "sw-resize" } },
    {
      id: "bc",
      style: { bottom: -5, left: "50%", marginLeft: -5, cursor: "s-resize" },
    },
    { id: "br", style: { bottom: -5, right: -5, cursor: "se-resize" } },
  ];

  return (
    <div className="fixed inset-0 z-10000 bg-black/70 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-xl flex flex-col w-full max-w-3xl"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-800">{t("crop.title")}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("crop.subtitle")}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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

        {/* Image area */}
        <div
          className="flex-1 flex items-center justify-center p-6 bg-gray-900 overflow-auto"
          style={{ minHeight: "280px" }}
        >
          <div className="relative inline-block select-none">
            <img
              ref={imgRef}
              src={src}
              alt={t("crop.title")}
              onLoad={initCropBox}
              draggable={false}
              style={{ maxWidth: "100%", maxHeight: "55vh", display: "block" }}
            />

            {cropBox && (
              <>
                {/* SVG mask overlay */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: "100%", height: "100%" }}
                >
                  <defs>
                    <mask id="cccd-crop-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect
                        x={cropBox.x}
                        y={cropBox.y}
                        width={cropBox.w}
                        height={cropBox.h}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  {/* Dark area outside crop */}
                  <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.55)"
                    mask="url(#cccd-crop-mask)"
                  />
                  {/* Crop border */}
                  <rect
                    x={cropBox.x}
                    y={cropBox.y}
                    width={cropBox.w}
                    height={cropBox.h}
                    fill="none"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  {/* Rule-of-thirds grid */}
                  <line
                    x1={cropBox.x + cropBox.w / 3}
                    y1={cropBox.y}
                    x2={cropBox.x + cropBox.w / 3}
                    y2={cropBox.y + cropBox.h}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1}
                  />
                  <line
                    x1={cropBox.x + (2 * cropBox.w) / 3}
                    y1={cropBox.y}
                    x2={cropBox.x + (2 * cropBox.w) / 3}
                    y2={cropBox.y + cropBox.h}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1}
                  />
                  <line
                    x1={cropBox.x}
                    y1={cropBox.y + cropBox.h / 3}
                    x2={cropBox.x + cropBox.w}
                    y2={cropBox.y + cropBox.h / 3}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1}
                  />
                  <line
                    x1={cropBox.x}
                    y1={cropBox.y + (2 * cropBox.h) / 3}
                    x2={cropBox.x + cropBox.w}
                    y2={cropBox.y + (2 * cropBox.h) / 3}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1}
                  />
                </svg>

                {/* Interactive move/resize layer */}
                <div
                  className="absolute cursor-move"
                  style={{
                    left: cropBox.x,
                    top: cropBox.y,
                    width: cropBox.w,
                    height: cropBox.h,
                  }}
                  onMouseDown={(e) => startDrag(e, "move")}
                >
                  {handles.map(({ id, style }) => (
                    <div
                      key={id}
                      className="absolute w-2.5 h-2.5 bg-white border border-gray-400 rounded-sm shadow"
                      style={{ ...style, position: "absolute" }}
                      onMouseDown={(e) => startDrag(e, id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t("actions.cancel")}
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 text-sm font-semibold bg-[#1a3d52] text-white rounded-full hover:bg-[#15324a] transition-colors"
          >
            {t("crop.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageUploadBox({
  label,
  preview,
  rotation,
  onSelect,
  onRotate,
  onCrop,
}) {
  const { t } = useTranslation("common");
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
            {/* Nút đổi ảnh */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              title={t("image.changeImageTip")}
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
              {t("image.changeImage")}
            </button>
            {/* Nút cắt ảnh */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCrop();
              }}
              title={t("image.cropTip")}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 border border-gray-200 shadow text-xs font-medium text-gray-600 hover:bg-white hover:text-purple-600 transition-colors"
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
                  d="M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14"
                />
              </svg>
              {t("image.crop")}
            </button>
            {/* Nút xoay ảnh */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRotate();
              }}
              title={t("image.rotateTip")}
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
              {t("image.rotate")}
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
              {t("image.dropHint")}
            </span>
            <span className="text-xs text-gray-400">
              {t("image.dropFormatCccd")}
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

export default function CccdModal({ open, onClose, onConfirm, stepIndicator, contractId }) {
  const { t } = useTranslation("common");
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [frontRotation, setFrontRotation] = useState(0);
  const [backRotation, setBackRotation] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [cropTarget, setCropTarget] = useState(null); // 'front' | 'back'

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

  const handleCropDone = (croppedFile, croppedUrl) => {
    if (cropTarget === "front") {
      setFrontFile(croppedFile);
      setFrontPreview(croppedUrl);
      setFrontRotation(0);
    } else {
      setBackFile(croppedFile);
      setBackPreview(croppedUrl);
      setBackRotation(0);
    }
    setCropTarget(null);
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
      setSubmitError(getApiErrorMessage(err, t("cccd.verifyFailed"), t));
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
              {t("cccd.modalTitle")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              {t("cccd.modalDescription")}
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
          <CccdLoadingOverlay done={apiDone} onDone={() => setLoading(false)} contractId={contractId} />
        )}

        {/* Upload boxes */}
        <div className={`px-6 pt-3 pb-4 ${loading ? "hidden" : ""}`}>
          <div className="grid grid-cols-2 gap-4">
            <ImageUploadBox
              label={t("cccd.frontLabel")}
              preview={frontPreview}
              rotation={frontRotation}
              onSelect={(f) => handleSelect("front", f)}
              onRotate={() => setFrontRotation((r) => (r + 90) % 360)}
              onCrop={() => setCropTarget("front")}
            />
            <ImageUploadBox
              label={t("cccd.backLabel")}
              preview={backPreview}
              rotation={backRotation}
              onSelect={(f) => handleSelect("back", f)}
              onRotate={() => setBackRotation((r) => (r + 90) % 360)}
              onCrop={() => setCropTarget("back")}
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
              {t("cccd.tipsTitle")}
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>{t("cccd.tip1")}</li>
              <li>{t("cccd.tip2")}</li>
            </ul>
          </div>
        </div>

        <div
          className={`mx-6 mb-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex gap-3 ${loading ? "hidden" : ""}`}
        >
          <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            />
          </svg>
          <div className="text-sm text-gray-700 leading-relaxed">
            <p className="font-semibold text-emerald-800 mb-1">
              {t("cccd.privacyNoticeTitle")}
            </p>
            <p>{t("cccd.privacyNotice")}</p>
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
            {t("actions.cancelLong")}
          </button>
          <button
            type="button"
            disabled={!frontFile || !backFile || loading}
            onClick={handleSubmit}
            className="px-7 py-2.5 rounded-full text-sm font-semibold bg-[#1a3d52] text-white hover:bg-[#15324a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("cccd.uploadingBtn") : t("actions.confirm")}
          </button>
        </div>
      </div>

      {/* Crop modal */}
      {cropTarget && (
        <CropModal
          src={cropTarget === "front" ? frontPreview : backPreview}
          originalFile={cropTarget === "front" ? frontFile : backFile}
          onCrop={handleCropDone}
          onCancel={() => setCropTarget(null)}
        />
      )}
    </div>
  );
}
