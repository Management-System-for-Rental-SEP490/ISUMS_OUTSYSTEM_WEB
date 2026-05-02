import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { clamp } from "../utils/signatureUtils";

// Map i18n code → BCP-47 locale used by toLocale*String so date/time
// rendering on the signature box matches the rest of the outsystem UI.
const LOCALE_MAP = {
  vi: "vi-VN",
  en: "en-US",
  ja: "ja-JP",
};

export default function DragSignatureBox({
  containerRef,
  position,
  setPosition,
  disabled,
  signatureImage,
  signerName,
  boxW,
  boxH,
  currentPage,
  totalPages,
  currentPosition,
  scale,
}) {
  const { t, i18n } = useTranslation("common");
  const bcp47 = LOCALE_MAP[(i18n.language || "vi").slice(0, 2)] || "vi-VN";
  const dragRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const onPointerDown = (e) => {
    if (disabled) return;
    dragRef.current = true;
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: position.x,
      py: position.y,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current || disabled) return;
    const cw = containerRef.current?.clientWidth ?? 0;
    const ch = containerRef.current?.scrollHeight ?? 0;
    const s = scale ?? 1;
    setPosition({
      x: clamp(
        startRef.current.px + (e.clientX - startRef.current.x) / s,
        0,
        Math.max(0, cw - boxW),
      ),
      y: clamp(
        startRef.current.py + (e.clientY - startRef.current.y) / s,
        0,
        Math.max(0, ch - boxH),
      ),
    });
  };

  const onPointerUp = () => {
    dragRef.current = false;
  };

  return (
    <div
      className="absolute z-[20] border-2 border-blue-500 bg-blue-50/40 rounded-md shadow-sm select-none cursor-move"
      style={{ left: position.x, top: position.y, width: boxW, height: boxH }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute -top-7 left-0 text-[11px] font-semibold bg-blue-600 text-white px-2 py-1 rounded whitespace-nowrap">
        {t("dragSignature.dragHint")}
      </div>
      <div className="absolute -bottom-8 left-0 text-[10px] font-mono bg-black/80 text-white px-2 py-1 rounded whitespace-nowrap pointer-events-none">
        Page {currentPage}/{totalPages} · {currentPosition}
      </div>
      <div className="w-full h-full flex flex-row pointer-events-none">
        {/* Left: signature image — bigger, no padding */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          {signatureImage ? (
            <img
              src={signatureImage}
              alt={t("dragSignature.signaturePlaceholder")}
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <span className="text-[10px] text-blue-400 italic">
              {t("dragSignature.signaturePlaceholder")}
            </span>
          )}
        </div>
        {/* Right: name + datetime */}
        <div className="shrink-0 border-l border-blue-200 flex flex-col justify-center px-2 py-1 bg-white/70" style={{ width: "48%" }}>
          <div className="text-[9px] font-semibold text-blue-700 leading-snug">
            {signerName || t("dragSignature.namePlaceholder")}
          </div>
          <div className="text-[8px] text-blue-500 leading-snug mt-0.5 whitespace-pre-line">
            {(() => {
              const now = new Date();
              const date = now.toLocaleDateString(bcp47, { day: "2-digit", month: "2-digit", year: "numeric" });
              const time = now.toLocaleTimeString(bcp47, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              const offset = "+07:00";
              return `${date} ${time} ${offset}`;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
