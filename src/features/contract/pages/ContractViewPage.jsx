import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMagicLinkParam } from "../hooks/useMagicLinkParam";
import { useEContract } from "../hooks/useEContract";
import { signEContract, readyEcontract } from "../services/contract.api";
import { ClipLoader } from "react-spinners";

import { toast } from "react-toastify";
import ConfirmModal from "../../../components/ConfirmModal";
import OtpModal from "../../../components/OtpModal";
import SignModal from "../../../components/SignModal";

//  Lấy dữ liệu cho api Ký hợp đồng từ api xác nhận OTPF
const getSignContextFromResponse = (res) => {
  const data = res?.data?.data ?? res?.data ?? res;
  return {
    accessToken: data?.accessToken,
    processId: data?.processId ?? data?.process_id,
    signingPage: data?.pageSign,
    signingPosition: data?.position ?? data?.signing_position ?? "0,0",
  };
};

// Lấy downloadUrl từ response sign (VNPT trả kiểu res.data.data.downloadUrl)
const getDownloadUrlFromSignResponse = (res) => {
  const data = res?.data?.data ?? res?.data ?? res;
  return data?.downloadUrl || data?.downloadURL || data?.download_url || null;
};

export function ContractViewPage() {
  const { processCode } = useMagicLinkParam();
  const navigate = useNavigate();
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
      token: ctx.accessToken,
      processId: ctx.processId,
      reason: signaturePayload?.reason ?? "",
      reject: false,
      otp: otp ?? null,
      signatureDisplayMode: Number(signaturePayload?.signatureDisplayMode) || 1,
      signatureImage: signaturePayload?.signatureImage ?? null,
      signingPage: ctx.signingPage ?? 0,
      signatureText: `{{Name}}
{{SubjectDN}}
{{Reason}}
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
    // ✅ Nếu đã ký xong thì nút này sẽ thành “Tải xuống”
    if (downloadUrl) {
      window.location.assign(downloadUrl); // direct qua downloadUrl
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
    return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
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

      <div className="flex flex-col">
        <header className="sticky top-0 z-10 w-full bg-white border-b border-gray-300 px-6 py-3 flex justify-between items-center shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-black flex items-center gap-2"
          >
            <span>{contractInfo?.name}</span>
          </button>

          <h1 className="font-semibold text-gray-800 hidden md:block">
            Xem trước hợp đồng
          </h1>

          <button
            onClick={handleConfirm}
            disabled={signLoading || (!downloadUrl && !processCode)}
            className={`px-5 py-2 rounded-md font-medium transition-colors shadow-md text-white
              ${
                downloadUrl
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }
              ${signLoading ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            {downloadUrl
              ? "Tải xuống"
              : isReadyToSign
                ? "Ký hợp đồng"
                : "Xác nhận"}
          </button>
        </header>
      </div>

      <main className="flex-grow flex justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl">
          <div
            className="bg-white p-8 md:p-12 shadow-2xl rounded-sm min-h-[1000px] contract-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <div className="text-center py-6 text-gray-500 text-sm">
            --- Hết nội dung hợp đồng ---
          </div>
        </div>
      </main>
    </div>
  );
}
