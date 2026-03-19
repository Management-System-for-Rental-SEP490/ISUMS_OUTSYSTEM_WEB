import { useEffect, useMemo, useRef, useState } from "react";
import {
  A4_SCALE,
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  clamp,
  ptToPixel,
  pixelToPt,
} from "../utils/signatureUtils";

export function useSignaturePlacement({ a4Scale, scrollAreaRef, html, placementMode }) {
  const contractContentRef = useRef(null);
  const iframeRef = useRef(null);

  const [signatureBoxPosition, setSignatureBoxPosition] = useState({ x: 24, y: 24 });
  const [boxPxSize, setBoxPxSize] = useState({ w: 225, h: 113 });
  const [totalPages, setTotalPages] = useState(1);
  const [measuredPageHeight, setMeasuredPageHeight] = useState(0);
  const [iframeHeight, setIframeHeight] = useState(A4_HEIGHT_PX);

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

  // Tính chiều cao trang hiệu dụng
  const effectivePageHeight = useMemo(() => {
    const ratioPageH = A4_WIDTH_PX * A4_SCALE;
    if (!measuredPageHeight) return ratioPageH;
    const diff = Math.abs(measuredPageHeight - ratioPageH) / ratioPageH;
    return diff <= 0.03 ? measuredPageHeight : ratioPageH;
  }, [measuredPageHeight, totalPages, html]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tính signingPage + signingPosition từ drag position
  const currentPlacement = useMemo(() => {
    return pixelToPt(
      contractContentRef.current,
      signatureBoxPosition,
      totalPages,
      boxPxSize.h,
      effectivePageHeight || undefined,
    );
  }, [signatureBoxPosition, boxPxSize.h, totalPages, effectivePageHeight]);

  // Ước tính tổng trang từ iframe
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const innerH =
      iframe.contentDocument?.documentElement?.scrollHeight ??
      iframe.contentDocument?.body?.scrollHeight ??
      A4_HEIGHT_PX;

    setIframeHeight(innerH);

    const ratioPageH = A4_WIDTH_PX * A4_SCALE;
    if (ratioPageH <= 0) return;

    const estimatedPages = Math.max(1, Math.ceil(innerH / ratioPageH));
    setTotalPages((prev) => Math.max(prev, estimatedPages));
    if (estimatedPages > 0) setMeasuredPageHeight(innerH / estimatedPages);
  };

  // Khởi tạo vị trí drag box từ PDF points
  function initDragPosition(ptPosition, signingPage, nPages) {
    const el = contractContentRef.current;
    if (!el) return;

    setTotalPages(nPages);

    const pageH = effectivePageHeight || el.clientWidth * A4_SCALE;
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
    iframeRef,
    signatureBoxPosition,
    setSignatureBoxPosition,
    boxPxSize,
    iframeHeight,
    totalPages,
    currentPlacement,
    initDragPosition,
    handleIframeLoad,
  };
}
