import { useRef, useState } from "react";
import { toast } from "react-toastify";
import i18n from "../../../i18n";
import { signEContract } from "../services/contract.api";
import {
  getDownloadUrlFromSignResponse,
  getDefaultPosition,
} from "../utils/signatureUtils";

// i18next.t() called outside React components — the instance is a singleton
// that's already init'd in i18n.js at app boot.
const t = (...args) => i18n.t(...args);

export function useContractSign({
  processCode,
  signingCtx: preloadedCtx,
  currentPlacement,
  initDragPosition,
  placementMode,
  setPlacementMode,
}) {
  const signPayloadRef = useRef(null);
  const signContextRef = useRef(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isReadyToSign, setIsReadyToSign] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [signLoading, setSignLoading] = useState(false);
  const [initialStep, setInitialStep] = useState(1);
  const [downloadUrl, setDownloadUrl] = useState(null);

  // ─── Step hiện tại (1–4): Điều khoản → Tạo chữ ký → Vị trí ký → Nhập OTP ──
  const currentStep = (() => {
    if (signOpen && initialStep === 2) return 4;
    if (placementMode) return 3;
    if (signOpen && initialStep === 1) return 2;
    if (confirmOpen) return 1;
    return 0;
  })();

  // ─── Rollback về bước n ────────────────────────────────────────────────────
  const goToStep = (n) => {
    setConfirmOpen(false);
    setSignOpen(false);
    setPlacementMode(false);

    if (n === 1) {
      setIsReadyToSign(false);
      signContextRef.current = null;
      signPayloadRef.current = null;
      setConfirmOpen(true);
    } else if (n === 2) {
      signPayloadRef.current = null;
      setInitialStep(1);
      setSignOpen(true);
    } else if (n === 3) {
      setPlacementMode(true);
    } else if (n === 4) {
      setInitialStep(2);
      setSignOpen(true);
    }
  };

  // ─── Build payload gửi VNPT ────────────────────────────────────────────────
  const buildSignPayload = (signaturePayload, otp) => {
    const ctx = signContextRef.current;
    if (!ctx?.processId)
      throw new Error(t("signHooks.missingProcessId"));

    const [llx, lly, urx, ury] = currentPlacement.signingPosition
      .split(",")
      .map(Number);
    const offsetX = 0;
    const offsetY = 0;
    const adjustedPosition = `${llx + offsetX},${lly + offsetY},${urx + offsetX},${ury + offsetY}`;
    console.log("[sign] raw:", currentPlacement.signingPosition, "→ sent:", adjustedPosition, "page:", currentPlacement.signingPage);

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
      fontSize: 8,
      showReason: true,
      confirmTermsConditions: signaturePayload?.confirmTermsConditions ?? true,
    };
  };

  const handleSignSubmit = async (signaturePayload, otpPayload) => {
    if (!processCode) {
      toast.error(t("signHooks.missingProcessCode"));
      return;
    }
    if (!signContextRef.current?.processId) {
      toast.error(t("signHooks.confirmFirst"));
      return;
    }

    if (signaturePayload) {
      signPayloadRef.current = signaturePayload;
      setSignOpen(false);
      setPlacementMode(true);
      toast.info(t("signHooks.dragHint"));
      return;
    }

    if (!otpPayload?.otp) return;
    setSignLoading(true);
    try {
      const payload = buildSignPayload(signPayloadRef.current, otpPayload.otp);
      const res = await signEContract(payload);
      const url = getDownloadUrlFromSignResponse(res);
      if (url) setDownloadUrl(url);
      toast.success(t("signHooks.signSuccess"));
      setSignOpen(false);
      setPlacementMode(false);
      setIsReadyToSign(false);
      signPayloadRef.current = null;
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || t("signHooks.signError"),
      );
    } finally {
      setSignLoading(false);
    }
  };

  const requestOtpAfterPositioning = async () => {
    if (!signPayloadRef.current) {
      toast.error(t("signHooks.createSigFirst"));
      return;
    }
    setSignLoading(true);
    try {
      const payload = buildSignPayload(signPayloadRef.current, null);
      await signEContract(payload);
      toast.info(t("signHooks.otpSent"));
      setPlacementMode(false);
      setInitialStep(2);
      setSignOpen(true);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || t("signHooks.otpSendFail"),
      );
    } finally {
      setSignLoading(false);
    }
  };

  const handleResendOtp = async (resetTimer) => {
    if (!signPayloadRef.current) {
      toast.error(t("signHooks.createSigFirst"));
      return;
    }
    setSignLoading(true);
    try {
      const payload = buildSignPayload(signPayloadRef.current, null);
      await signEContract(payload);
      toast.info(t("signHooks.otpResent"));
      resetTimer();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t("signHooks.otpResendFail"),
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
      toast.error(t("signHooks.missingProcessCodePath"));
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

  // ─── Dùng signingCtx đã load sẵn, mở SignModal ngay (bỏ CCCD) ──────────────
  const handleReject = async (reason) => {
    if (!processCode) {
      toast.error(t("signHooks.missingProcessCode"));
      return;
    }
    const ctx = preloadedCtx;
    if (!ctx?.processId) {
      toast.error(t("signHooks.cannotReject"));
      return;
    }
    try {
      await signEContract({
        processCode,
        token: ctx.accessToken,
        processId: ctx.processId,
        reason: reason ?? "",
        reject: true,
        otp: null,
        signatureDisplayMode: 2,
        signatureImage: null,
        signingPage: null,
        signatureText: null,
        signingPosition: null,
        fontSize: 8,
        showReason: true,
        confirmTermsConditions: true,
      });
      toast.success(t("signHooks.rejectSuccess"));
      setConfirmOpen(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || t("signHooks.rejectError"),
      );
    }
  };

  const handleConfirmAgree = () => {
    const ctx = preloadedCtx;
    if (!ctx?.processId) {
      toast.error(t("signHooks.cannotConfirm"));
      return;
    }

    signContextRef.current = ctx;

    const nPages = Math.max(1, Number(ctx.signingPage) || 1);
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
  };

  return {
    signPayloadRef,
    confirmOpen,
    setConfirmOpen,
    isReadyToSign,
    signOpen,
    setSignOpen,
    signLoading,
    initialStep,
    downloadUrl,
    currentStep,
    goToStep,
    handleConfirm,
    handleConfirmAgree,
    handleReject,
    handleSignSubmit,
    handleResendOtp,
  };
}
