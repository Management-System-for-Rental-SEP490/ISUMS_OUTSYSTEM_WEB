import { useEffect, useMemo, useRef, useState } from "react";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";

import { useMagicLinkParam } from "../hooks/useMagicLinkParam";
import { useEContract } from "../hooks/useEContract";
import { signEContract, readyEcontract } from "../services/contract.api";
import ConfirmModal from "../../../components/ConfirmModal";
import SignModal from "../../../components/SignModal";

import ContractHeader from "../components/ContractHeader";
import ContractViewer from "../components/ContractViewer";
import {
  A4_SCALE,
  A4_WIDTH_PX,
  A4_HEIGHT_PX,
  clamp,
  ptToPixel,
  pixelToPt,
  getDownloadUrlFromSignResponse,
  getSignContextFromResponse,
  getDefaultPosition,
} from "../utils/signatureUtils";

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
  const [iframeHeight, setIframeHeight] = useState(A4_HEIGHT_PX);
  const [a4Scale, setA4Scale] = useState(1);

  const [signatureBoxPosition, setSignatureBoxPosition] = useState({
    x: 24,
    y: 24,
  });
  const [boxPxSize, setBoxPxSize] = useState({ w: 225, h: 113 });

  const contractContentRef = useRef(null);
  const iframeRef = useRef(null);
  const signPayloadRef = useRef(null);
  const signContextRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // ── Responsive A4 scale ───────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - 40;
      setA4Scale(Math.min(1, available / (A4_WIDTH_PX + 40)));
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Auto-scroll đến drag box khi bật placement mode ──────────────────────
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

  // ── Tính chiều cao trang hiệu dụng ───────────────────────────────────────
  const effectivePageHeight = useMemo(() => {
    const ratioPageH = A4_WIDTH_PX * A4_SCALE;
    if (!measuredPageHeight) return ratioPageH;
    const diff = Math.abs(measuredPageHeight - ratioPageH) / ratioPageH;
    return diff <= 0.03 ? measuredPageHeight : ratioPageH;
  }, [measuredPageHeight, totalPages, html]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tính signingPage + signingPosition từ drag position ──────────────────
  const currentPlacement = useMemo(() => {
    return pixelToPt(
      contractContentRef.current,
      signatureBoxPosition,
      totalPages,
      boxPxSize.h,
      effectivePageHeight || undefined,
    );
  }, [signatureBoxPosition, boxPxSize.h, totalPages, effectivePageHeight]);

  // ── Ước tính tổng trang từ iframe ────────────────────────────────────────
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

  // ── Khởi tạo vị trí drag box từ PDF points ───────────────────────────────
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

  // ── Build payload gửi VNPT ────────────────────────────────────────────────
  const buildSignPayload = (signaturePayload, otp) => {
    const ctx = signContextRef.current;
    if (!ctx?.processId)
      throw new Error("Thiếu processId từ bước ready contract.");

    const [llx, lly, urx, ury] = currentPlacement.signingPosition
      .split(",")
      .map(Number);
    const offsetX = -30;
    const offsetY = -263;
    const adjustedPosition = `${llx + offsetX},${lly + offsetY},${urx + offsetX},${ury + offsetY}`;

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
      signatureText: `\n\n\n{{Name}}\n{{SignTime}}`,
      signingPosition: adjustedPosition,
      fontSize: 9,
      showReason: true,
      confirmTermsConditions: signaturePayload?.confirmTermsConditions ?? true,
    };
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
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

  // ── Render states ─────────────────────────────────────────────────────────
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

      <ContractHeader
        contractName={contractInfo?.name}
        downloadUrl={downloadUrl}
        placementMode={placementMode}
        isReadyToSign={isReadyToSign}
        signLoading={signLoading}
        processCode={processCode}
        currentPlacement={currentPlacement}
        onConfirm={handleConfirm}
      />

      <main
        className="flex-grow flex overflow-hidden"
        style={{ height: "calc(100vh - 57px)" }}
      >
        <ContractViewer
          scrollAreaRef={scrollAreaRef}
          contractContentRef={contractContentRef}
          iframeRef={iframeRef}
          html={html}
          iframeHeight={iframeHeight}
          totalPages={totalPages}
          a4Scale={a4Scale}
          placementMode={placementMode}
          signLoading={signLoading}
          signatureBoxPosition={signatureBoxPosition}
          setSignatureBoxPosition={setSignatureBoxPosition}
          boxPxSize={boxPxSize}
          currentPlacement={currentPlacement}
          signatureImage={signPayloadRef.current?.signatureImage}
          signerName={
            contractInfo?.signerName ??
            contractInfo?.fullName ??
            contractInfo?.participantName ??
            ""
          }
          onIframeLoad={handleIframeLoad}
        />
      </main>
    </div>
  );
}
