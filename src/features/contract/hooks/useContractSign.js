import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { signEContract, readyEcontract } from "../services/contract.api";
import {
  getDownloadUrlFromSignResponse,
  getSignContextFromResponse,
  getDefaultPosition,
} from "../utils/signatureUtils";

export function useContractSign({
  processCode,
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

  // Build payload gửi VNPT
  const buildSignPayload = (signaturePayload, otp) => {
    const ctx = signContextRef.current;
    if (!ctx?.processId)
      throw new Error("Thiếu processId từ bước ready contract.");

    const [llx, lly, urx, ury] = currentPlacement.signingPosition
      .split(",")
      .map(Number);
    const offsetX = -20;
    const offsetY = 252;
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
    handleConfirm,
    handleConfirmAgree,
    handleSignSubmit,
    handleResendOtp,
  };
}
