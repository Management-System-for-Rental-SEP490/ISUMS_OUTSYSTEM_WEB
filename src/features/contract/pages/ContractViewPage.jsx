import { useState, useRef } from "react";
import { useMagicLinkParam } from "../hooks/useMagicLinkParam";
import { useEContract } from "../hooks/useEContract";
import { signEContract, readyEcontract } from "../services/contract.api";
import { ClipLoader } from "react-spinners";

import { toast } from "react-toastify";
import ConfirmModal from "../../../components/ConfirmModal";
import SignModal from "../../../components/SignModal";

//  Lấy dữ liệu cho api Ký hợp đồng từ SignEContract lần 1 để lấy mã xác nhận OTP
const getSignContextFromResponse = (res) => {
  const data = res?.data?.data ?? res?.data ?? res;
  return {
    accessToken: data?.accessToken,
    processId: data?.processId ?? data?.process_id,
    signingPage: data?.pageSign,
    signingPosition: data?.position ?? data?.signing_position ?? "0,0",
  };
};
const getDownloadUrlFromSignResponse = (res) => {
  const data = res?.data?.data ?? res?.data ?? res;
  return data?.downloadUrl || data?.downloadURL || data?.download_url || null;
};

export function ContractViewPage() {
  const { processCode } = useMagicLinkParam();
  const { html, contractInfo, loading, error } = useEContract(processCode);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isReadyToSign, setIsReadyToSign] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [signLoading, setSignLoading] = useState(false);

  // ✅ NEW: trạng thái đã ký + link tải
  const [downloadUrl, setDownloadUrl] = useState(null);

  const signPayloadRef = useRef(null);
  const signContextRef = useRef(null);

  const buildSignPayload = (signaturePayload, otp) => {
    const ctx = signContextRef.current;
    if (!ctx?.processId) {
      throw new Error("Thiếu processId từ bước xác nhận OTP.");
    }
    return {
      processCode: processCode,
      token: ctx.accessToken,
      processId: ctx.processId,
      reason: signaturePayload?.reason ?? "",
      reject: false,
      otp: otp ?? null,
      signatureDisplayMode: Number(signaturePayload?.signatureDisplayMode) || 1,
      signatureImage: signaturePayload?.signatureImage ?? null,
      signingPage: ctx.signingPage ?? 0,
      signatureText: `{{Name}}
{{SignTime}}`,
      signingPosition: ctx.signingPosition ?? "0,0",
      fontSize: signaturePayload?.fontSize ?? 12,
      showReason: true,
      confirmTermsConditions: signaturePayload?.confirmTermsConditions ?? true,
    };
  };

  const handleSignSubmit = async (
    signaturePayload,
    otpPayload,
    onStep1Success,
  ) => {
    if (!processCode) {
      toast.error("Thiếu token từ đường dẫn.");
      return;
    }
    if (!signContextRef.current?.processId) {
      toast.error("Vui lòng hoàn tất bước xác nhận OTP trước khi ký.");
      return;
    }

    setSignLoading(true);
    try {
      // STEP 1: gửi yêu cầu ký -> VNPT gửi OTP
      if (signaturePayload) {
        const payload = buildSignPayload(signaturePayload, null);
        await signEContract(payload);
        signPayloadRef.current = signaturePayload;
        onStep1Success?.();
        toast.info("Mã OTP đã được gửi. Vui lòng nhập để hoàn tất ký.");
      }
      // STEP 2: nhập OTP -> ký thành công, lấy downloadUrl
      else if (otpPayload?.otp) {
        const payload = buildSignPayload(
          signPayloadRef.current,
          otpPayload.otp,
        );

        const res = await signEContract(payload);

        const url = getDownloadUrlFromSignResponse(res);
        if (url) setDownloadUrl(url);

        toast.success("Ký hợp đồng thành công!");
        setSignOpen(false);
        signPayloadRef.current = null;

        // ✅ optional: đóng “ready to sign” để tránh quay lại luồng ký
        setIsReadyToSign(false);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Lỗi ký hợp đồng.";
      toast.error(msg);
    } finally {
      setSignLoading(false);
    }
  };

  const handleConfirm = () => {
    if (downloadUrl) {
      // downloadByBlob(downloadUrl, `${contractInfo?.name || "hop-dong"}.pdf`);
      window.location.replace(downloadUrl);
      return;
    }

    if (processCode === undefined) {
      toast.error("Thiếu id hoặc token từ đường dẫn.");
      return;
    }

    if (isReadyToSign && signContextRef.current?.processId) {
      setSignOpen(true);
    } else {
      setConfirmOpen(true);
    }
  };

  const handleConfirmAgree = async () => {
    try {
      const res = await readyEcontract(processCode);
      signContextRef.current = getSignContextFromResponse(res);
      toast.success("Xác nhận thành công, chuẩn bị ký hợp đồng.");
      setIsReadyToSign(true);
      setConfirmOpen(false);
      setSignOpen(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể gửi yêu cầu xác nhận.";
      toast.error(msg);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <ClipLoader size={50} color={"#123abc"} loading={true} />
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="px-6 py-4 rounded-lg bg-white shadow text-center text-red-500 text-sm md:text-base">
          {error}
        </div>
      </div>
    );

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
        onClose={() => {
          if (signLoading) return;
          setSignOpen(false);
          signContextRef.current = null;
        }}
        onSubmit={handleSignSubmit}
        contractName={contractInfo?.name}
      />

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

          <di v className="flex items-center gap-4">
            <div className="hidden md:flex items-center text-xs md:text-sm text-slate-500">
              <span className="relative mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-500">
                <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-ping" />
              </span>
              <span>Tình trạng: </span>
              <span className="ml-1 font-medium text-slate-800">
                {downloadUrl ? "Đã ký" : "Chờ ký"}
              </span>
            </div>

            <button
              onClick={handleConfirm}
              disabled={signLoading || (!downloadUrl && !processCode)}
              className={`inline-flex items-center justify-center rounded-full px-5 md:px-6 py-2.5 text-xs md:text-sm font-semibold shadow-sm transition-all
              ${
                downloadUrl
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }
              ${
                signLoading || (!downloadUrl && !processCode)
                  ? "opacity-60 cursor-not-allowed"
                  : ""
              }`}
            >
              {downloadUrl
                ? "Tải xuống"
                : isReadyToSign
                  ? "Ký hợp đồng"
                  : "Xác nhận & Ký"}
            </button>
          </di>
        </div>
      </header>

      <main className="flex-grow flex justify-center px-3 md:px-6 py-4 md:py-8">
        <div className="w-full max-w-5xl">
          <div className="mb-4 md:mb-6 flex items-center gap-2 text-xs md:text-sm text-slate-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Vui lòng kiểm tra kỹ nội dung trước khi thực hiện ký số</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 md:p-4 shadow-sm">
            <div
              className="bg-white px-5 md:px-10 py-8 md:py-12 shadow-sm rounded-xl min-h-[900px] contract-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <div className="text-center py-4 md:py-6 text-slate-400 text-xs md:text-sm tracking-wide">
              — Hết nội dung hợp đồng —
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
