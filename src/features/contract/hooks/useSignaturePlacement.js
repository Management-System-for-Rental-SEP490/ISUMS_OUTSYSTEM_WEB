import { useMemo, useRef, useState, useEffect } from "react";
import {
  A4_SCALE,
  A4_WIDTH_PX,
  clamp,
  ptToPixel,
  pixelToPt,
} from "../utils/signatureUtils";

export function useSignaturePlacement({ a4Scale, scrollAreaRef, placementMode }) {
  const contractContentRef = useRef(null);

  const [signatureBoxPosition, setSignatureBoxPosition] = useState({ x: 24, y: 24 });
  const [boxPxSize, setBoxPxSize] = useState({ w: 225, h: 113 });
  const [totalPages, setTotalPages] = useState(1);

  const effectivePageHeight = A4_WIDTH_PX * A4_SCALE;

  // Auto-scroll đến drag box khi bật placement mode
  useEffect(() => {
    if (!placementMode) return;
    const scrollEl = scrollAreaRef.current;
    const containerEl = contractContentRef.current;
    if (!scrollEl || !containerEl) return;

    const containerRect = containerEl.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();
    const containerTopInScroll =
      containerRect.top - scrollRect.top + scrollEl.scrollTop;

    const boxVisualY = containerTopInScroll + signatureBoxPosition.y * a4Scale;
    const boxCenterY = boxVisualY + (boxPxSize.h * a4Scale) / 2;
    const scrollTarget = boxCenterY - scrollEl.clientHeight / 2;

    scrollEl.scrollTo({ top: Math.max(0, scrollTarget), behavior: "smooth" });
  }, [placementMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tính signingPage + signingPosition từ drag position
  const currentPlacement = useMemo(() => {
    return pixelToPt(
      contractContentRef.current,
      signatureBoxPosition,
      totalPages,
      boxPxSize.h,
      effectivePageHeight,
    );
  }, [signatureBoxPosition, boxPxSize.h, totalPages, effectivePageHeight]);

  // Khởi tạo vị trí drag box từ PDF points
  function initDragPosition(ptPosition, signingPage, nPages) {
    const el = contractContentRef.current;
    if (!el) return;

    setTotalPages(nPages);

    const pageH = effectivePageHeight;
    const px = ptToPixel(el, ptPosition, nPages, signingPage, pageH);
    const cw = el.clientWidth;
    const totalH = nPages * pageH;

    setSignatureBoxPosition({
      x: clamp(px.x, 0, Math.max(0, cw - px.w)),
      y: clamp(px.y, 0, Math.max(0, totalH - px.h)),
    });
    setBoxPxSize({ w: px.w, h: px.h });
  }

  return {
    contractContentRef,
    signatureBoxPosition,
    setSignatureBoxPosition,
    boxPxSize,
    totalPages,
    setTotalPages,
    currentPlacement,
    initDragPosition,
  };
}
