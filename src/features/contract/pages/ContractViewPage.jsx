import { useEffect, useMemo, useRef, useState } from "react";
import { useMagicLinkParam } from "../hooks/useMagicLinkParam";
import { useEContract } from "../hooks/useEContract";
import { signEContract, readyEcontract } from "../services/contract.api";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import ConfirmModal from "../../../components/ConfirmModal";
import SignModal from "../../../components/SignModal";
// ─── Kích thước box chữ ký (đơn vị: PDF points) ──────────────────────────────
const BOX_W_PT = 170; // width của khung chữ ký tính bằng PDF points
const BOX_H_PT = 90; // height

// ─── Kích thước box hiển thị trên màn hình (đơn vị: pixel) ───────────────────
const BOX_W_PX = 180; // chỉ dùng để render drag box visually
const BOX_H_PX = 90;

// Kích thước trang PDF gốc (Portrait A4, đơn vị: points)
const PDF_PAGE_W_PT = 595.275;
const PDF_PAGE_H_PT = 841.875;

// Tỉ lệ chiều cao / chiều rộng A4 — dùng để tính pageH_px chính xác từ containerWidth
const A4_SCALE = PDF_PAGE_H_PT / PDF_PAGE_W_PT; // ≈ 1.4142
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

// ─── Vị trí ký chuẩn (PDF points, origin bottom-left) ────────────────────────
const DEFAULT_SIGN_POSITIONS = {
  PARTY_A: { signingPage: 3, signingPosition: "87,140,257,230" },
  PARTY_B: { signingPage: 3, signingPosition: "343,140,513,230" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse "llx,lly,urx,ury" string → object
 */
function parseRect(position) {
  const parts = String(position || "")
    .split(",")
    .map((x) => Number(x.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return { llx: 0, lly: 0, urx: BOX_W_PT, ury: BOX_H_PT };
  }
  const [llx, lly, urx, ury] = parts;
  return { llx, lly, urx, ury };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Chuyển đổi PDF points → pixel position cho drag box.
 */
function ptToPixel(
  containerEl,
  ptPosition,
  _totalPages,
  signingPage,
  pageHOverridePx,
) {
  const rect = parseRect(ptPosition);
  const containerW = containerEl?.clientWidth ?? PDF_PAGE_W_PT;
  const scale = containerW / PDF_PAGE_W_PT;
  const pageH_px = pageHOverridePx ?? containerW * A4_SCALE;

  const pageOffset = (signingPage - 1) * pageH_px;
  const boxTopInPage = (PDF_PAGE_H_PT - rect.ury) * scale;

  return {
    x: rect.llx * scale,
    y: pageOffset + boxTopInPage,
    w: (rect.urx - rect.llx) * scale,
    h: (rect.ury - rect.lly) * scale,
  };
}

/**
 * Chuyển đổi pixel drag position → PDF points.
 */
function pixelToPt(containerEl, pixelPos, totalPages, boxH, pageHOverridePx) {
  const containerW = containerEl?.clientWidth ?? PDF_PAGE_W_PT;
  const scale = containerW / PDF_PAGE_W_PT;
  const pageH_px = pageHOverridePx ?? containerW * A4_SCALE;

  const actualBoxH = boxH ?? BOX_H_PX;
  const boxCenterY = pixelPos.y + actualBoxH / 2;
  const pageIndex = clamp(
    Math.floor(pageH_px > 0 ? boxCenterY / pageH_px : 0) + 1,
    1,
    totalPages,
  );

  const pageTopY = (pageIndex - 1) * pageH_px;
  const localTopY = pixelPos.y - pageTopY;

  const llx_pt = Math.round(clamp(pixelPos.x / scale, 0, PDF_PAGE_W_PT));
  const urx_pt = Math.round(llx_pt + BOX_W_PT);
  const ury_pt = Math.round(
    clamp((pageH_px - localTopY) / scale, 0, PDF_PAGE_H_PT),
  );
  const lly_pt = Math.round(Math.max(0, ury_pt - BOX_H_PT));

  return {
    signingPage: pageIndex,
    signingPosition: `${llx_pt},${lly_pt},${urx_pt},${ury_pt}`,
  };
}

function getDownloadUrlFromSignResponse(res) {
  const data = res?.data?.data ?? res?.data ?? res;
  return data?.downloadUrl || data?.downloadURL || data?.download_url || null;
}

function getSignContextFromResponse(res) {
  const data = res?.data?.data ?? res?.data ?? res;
  return {
    accessToken: data?.accessToken,
    processId: data?.processId ?? data?.process_id,
    signerRole: data?.signerRole ?? data?.signer_role ?? null, // "PARTY_A" | "PARTY_B"
    signingPage: data?.pageSign,
    signingPosition: data?.position ?? data?.signing_position ?? null,
  };
}

// ─── DragSignatureBox ─────────────────────────────────────────────────────────

function DragSignatureBox({
  containerRef,
  position,
  setPosition,
  disabled,
  signatureImage,
  boxW,
  boxH,
  currentPage,
  totalPages,
  currentPosition,
  scale,
}) {
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
        Kéo để đặt vị trí ký
      </div>
      <div className="absolute -bottom-8 left-0 text-[10px] font-mono bg-black/80 text-white px-2 py-1 rounded whitespace-nowrap pointer-events-none">
        Page {currentPage}/{totalPages} · {currentPosition}
      </div>
      {signatureImage ? (
        <img
          src={signatureImage}
          alt="Signature preview"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[11px] text-blue-600 font-medium pointer-events-none">
          Signature Preview
        </div>
      )}
    </div>
  );
}

// ─── ContractViewPage ─────────────────────────────────────────────────────────

export function ContractViewPage() {
  const { processCode } = useMagicLinkParam();
  const { html, contractInfo, loading, error } = useEContract(processCode);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isReadyToSign, setIsReadyToSign] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const [initialStep, setInitialStep] = useState(1);
  const [placementMode, setPlacementMode] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [measuredPageHeight, setMeasuredPageHeight] = useState(0);

  // Drag box position (pixels)
  const [signatureBoxPosition, setSignatureBoxPosition] = useState({
    x: 24,
    y: 24,
  });

  const [boxPxSize, setBoxPxSize] = useState({ w: BOX_W_PX, h: BOX_H_PX });

  const contractContentRef = useRef(null);
  const iframeRef = useRef(null);
  const signPayloadRef = useRef(null);
  const signContextRef = useRef(null);
  const scrollAreaRef = useRef(null);

  const [a4Scale, setA4Scale] = useState(1);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - 40; // trừ px-5 (20px * 2)
      setA4Scale(Math.min(1, available / (A4_WIDTH_PX + 40)));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Auto-scroll đến vị trí drag box khi bật placement mode
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

  const [iframeHeight, setIframeHeight] = useState(A4_HEIGHT_PX);

  // ── Ước tính tổng trang từ chiều cao render thực trong iframe ───────────────
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
    if (estimatedPages > 0) {
      setMeasuredPageHeight(innerH / estimatedPages);
    }
  };

  const effectivePageHeight = useMemo(() => {
    const ratioPageH = A4_WIDTH_PX * A4_SCALE;
    if (!measuredPageHeight) return ratioPageH;
    const diff = Math.abs(measuredPageHeight - ratioPageH) / ratioPageH;
    return diff <= 0.03 ? measuredPageHeight : ratioPageH;
  }, [measuredPageHeight, totalPages, html]);

  // ── Tính signingPage + signingPosition (PDF points) từ drag position ────────
  const currentPlacement = useMemo(() => {
    const el = containerRef_safe();
    return pixelToPt(
      el,
      signatureBoxPosition,
      totalPages,
      boxPxSize.h,
      effectivePageHeight || undefined,
    );
  }, [signatureBoxPosition, boxPxSize.h, totalPages, effectivePageHeight]);

  function containerRef_safe() {
    return contractContentRef.current;
  }

  // ── Khởi tạo vị trí drag box từ PDF points ──────────────────────────────────
  function initDragPosition(ptPosition, signingPage, nPages) {
    const el = contractContentRef.current;
    if (!el) return;

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

  function getDefaultPosition(signerRole) {
    const role = signerRole?.toUpperCase();
    return DEFAULT_SIGN_POSITIONS[role] ?? DEFAULT_SIGN_POSITIONS.PARTY_A;
  }

  // ── Build payload gửi VNPT ───────────────────────────────────────────────────
  const buildSignPayload = (signaturePayload, otp) => {
    const ctx = signContextRef.current;
    if (!ctx?.processId)
      throw new Error("Thiếu processId từ bước ready contract.");

    return {
      processCode,
      token: ctx.accessToken,
      processId: ctx.processId,
      reason: signaturePayload?.reason ?? "",
      reject: false,
      otp: otp ?? null,
      signatureDisplayMode: 2,
      signatureImage: signaturePayload?.signatureImage ?? null,
      signingPage: currentPlacement.signingPage,
      signatureText: `{{Name}}
      {{SignTime}}`,
      signingPosition: (() => {
        const [llx, lly, urx, ury] = currentPlacement.signingPosition
          .split(",")
          .map(Number);
        // ── Chỉnh offset tại đây ─────────────────────────────
        const offsetLlx = 29; // dịch trái/phải điểm góc dưới-trái
        const offsetLly = -260 - 40; // dịch lên/xuống điểm góc dưới-trái
        const offsetUrx = 29; // dịch trái/phải điểm góc trên-phải
        const offsetUry = -260 - 40; // dịch lên/xuống điểm góc trên-phải
        // ─────────────────────────────────────────────────────
        return `${llx + offsetLlx},${lly + offsetLly},${urx + offsetUrx},${ury + offsetUry}`;
      })(),
      fontSize: 9,
      showReason: true,
      confirmTermsConditions: signaturePayload?.confirmTermsConditions ?? true,
    };
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSignSubmit = async (signaturePayload, otpPayload) => {
    if (!processCode) {
      toast.error("Thiếu processCode từ URL.");
      return;
    }
    if (!signContextRef.current?.processId) {
      toast.error("Vui lòng xác nhận hợp đồng trước khi ký.");
      return;
    }

    if (signaturePayload) {
      signPayloadRef.current = signaturePayload;
      setSignOpen(false);
      setPlacementMode(true);
      toast.info("Hãy kéo chữ ký tới vị trí mong muốn trên hợp đồng.");
      return;
    }

    if (!otpPayload?.otp) return;
    setSignLoading(true);
    try {
      const payload = buildSignPayload(signPayloadRef.current, otpPayload.otp);
      const res = await signEContract(payload);
      const url = getDownloadUrlFromSignResponse(res);
      if (url) setDownloadUrl(url);
      toast.success("Ký hợp đồng thành công!");
      setSignOpen(false);
      setPlacementMode(false);
      setIsReadyToSign(false);
      signPayloadRef.current = null;
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Lỗi ký hợp đồng.",
      );
    } finally {
      setSignLoading(false);
    }
  };

  const requestOtpAfterPositioning = async () => {
    if (!signPayloadRef.current) {
      toast.error("Bạn cần tạo chữ ký trước.");
      return;
    }
    setSignLoading(true);
    try {
      const payload = buildSignPayload(signPayloadRef.current, null);
      await signEContract(payload);
      toast.info("OTP đã được gửi. Vui lòng nhập OTP để hoàn tất ký.");
      setPlacementMode(false);
      setInitialStep(2);
      setSignOpen(true);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || "Không thể gửi OTP.",
      );
    } finally {
      setSignLoading(false);
    }
  };

  const handleResendOtp = async (resetTimer) => {
    if (!signPayloadRef.current) {
      toast.error("Bạn cần tạo chữ ký trước.");
      return;
    }
    setSignLoading(true);
    try {
      const payload = buildSignPayload(signPayloadRef.current, null);
      await signEContract(payload);
      toast.info("OTP mới đã được gửi.");
      resetTimer();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể gửi lại OTP.",
      );
    } finally {
      setSignLoading(false);
    }
  };

  const handleConfirm = () => {
    if (downloadUrl) {
      window.location.replace(downloadUrl);
      return;
    }
    if (!processCode) {
      toast.error("Thiếu processCode từ đường dẫn.");
      return;
    }
    if (placementMode) {
      requestOtpAfterPositioning();
      return;
    }
    if (isReadyToSign && signContextRef.current?.processId) {
      setInitialStep(1);
      setSignOpen(true);
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmAgree = async () => {
    try {
      const res = await readyEcontract(processCode);
      const ctx = getSignContextFromResponse(res);
      signContextRef.current = ctx;

      const nPages = Math.max(1, Number(ctx.signingPage) || 1);
      setTotalPages(nPages);

      const defaultPos = getDefaultPosition(ctx.signerRole);
      const ptPosition = ctx.signingPosition ?? defaultPos.signingPosition;
      const ptPage = ctx.signingPosition
        ? (ctx.signingPage ?? defaultPos.signingPage)
        : defaultPos.signingPage;

      signContextRef.current.signingPage = ptPage;
      initDragPosition(ptPosition, ptPage, nPages);

      setIsReadyToSign(true);
      setConfirmOpen(false);
      setInitialStep(1);
      setSignOpen(true);
      toast.success("Xác nhận thành công, vui lòng tạo chữ ký.");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể gửi yêu cầu xác nhận.",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <ClipLoader size={50} color="#123abc" loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="px-6 py-4 rounded-lg bg-white shadow text-center text-red-500 text-sm md:text-base">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmAgree}
      />
      <SignModal
        open={signOpen}
        loading={signLoading}
        initialStep={initialStep}
        onClose={() => {
          if (signLoading) return;
          setSignOpen(false);
        }}
        onSubmit={handleSignSubmit}
        contractName={contractInfo?.name}
        onResendOtp={handleResendOtp}
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 w-full bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold">
                Hợp đồng điện tử
              </div>
              <div className="text-sm md:text-base font-medium text-slate-900 truncate">
                {contractInfo?.name || "Xem trước hợp đồng"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center text-xs md:text-sm text-slate-500">
              <span className="relative mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-500">
                <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping" />
              </span>
              <span>Tình trạng: </span>
              <span className="ml-1 font-medium text-slate-800">
                {downloadUrl
                  ? "Đã ký"
                  : placementMode
                    ? "Đang chỉnh vị trí ký"
                    : "Chờ ký"}
              </span>
            </div>

            {placementMode && (
              <div className="hidden lg:block text-[11px] text-slate-400 font-mono">
                trang {currentPlacement.signingPage} ·{" "}
                {currentPlacement.signingPosition}
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={signLoading || (!downloadUrl && !processCode)}
              className={`inline-flex items-center justify-center rounded-full px-5 md:px-6 py-2.5 text-xs md:text-sm font-semibold shadow-sm transition-all
                ${downloadUrl ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                ${signLoading || (!downloadUrl && !processCode) ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {downloadUrl
                ? "Tải xuống"
                : placementMode
                  ? "Xác nhận vị trí & nhận OTP"
                  : isReadyToSign
                    ? "Ký hợp đồng"
                    : "Xác nhận & Ký"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main — PDF Viewer layout ── */}
      <main
        className="flex-grow flex overflow-hidden"
        style={{ height: "calc(100vh - 57px)" }}
      >
        {/* ── PDF scroll area ── */}
        <div
          ref={scrollAreaRef}
          className="pdf-scroll-area flex-grow overflow-y-auto bg-gray-300 py-8 px-5"
        >
          <div className="flex flex-col items-center gap-4">
            {/* Hint */}
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-white/70 rounded-full px-3 py-1.5 shadow-sm">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              Vui lòng kiểm tra kỹ nội dung trước khi thực hiện ký số
            </div>

            {/* ── A4 contract page ── */}
            <div
              style={{
                width: (A4_WIDTH_PX + 40) * a4Scale,
                height: (totalPages * A4_HEIGHT_PX + 40) * a4Scale,
                position: "relative",
                flexShrink: 0,
              }}
            >
              <div
                className="bg-white shadow-xl ring-1 ring-black/10"
                style={{
                  padding: "20px 20px",
                  transform: `scale(${a4Scale})`,
                  transformOrigin: "top left",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                <div
                  ref={contractContentRef}
                  className="relative"
                  style={{
                    width: A4_WIDTH_PX,
                    minHeight: totalPages * A4_HEIGHT_PX,
                  }}
                >
                  {html && (
                    <iframe
                      ref={iframeRef}
                      srcDoc={html}
                      title="contract-preview"
                      onLoad={handleIframeLoad}
                      scrolling="no"
                      style={{
                        width: "100%",
                        height: iframeHeight,
                        border: "none",
                        display: "block",
                        pointerEvents: placementMode ? "none" : "auto",
                      }}
                    />
                  )}

                  {/* Drag box chữ ký */}
                  {placementMode && (
                    <DragSignatureBox
                      containerRef={contractContentRef}
                      position={signatureBoxPosition}
                      setPosition={setSignatureBoxPosition}
                      disabled={signLoading}
                      signatureImage={signPayloadRef.current?.signatureImage}
                      boxW={boxPxSize.w}
                      boxH={boxPxSize.h}
                      currentPage={currentPlacement.signingPage}
                      totalPages={totalPages}
                      currentPosition={currentPlacement.signingPosition}
                      scale={a4Scale}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Placement info bar */}
            {placementMode && (
              <div
                className="text-xs text-gray-700 bg-white rounded-lg px-3 py-2 shadow-sm ring-1 ring-gray-200"
                style={{ width: 794 }}
              >
                Trang{" "}
                <span className="font-semibold text-blue-700">
                  {currentPlacement.signingPage}
                </span>{" "}
                · tọa độ PDF (pt):{" "}
                <span className="font-mono text-gray-500">
                  {currentPlacement.signingPosition}
                </span>
              </div>
            )}

            <div className="text-gray-500 text-xs py-2">
              — Hết nội dung hợp đồng —
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
