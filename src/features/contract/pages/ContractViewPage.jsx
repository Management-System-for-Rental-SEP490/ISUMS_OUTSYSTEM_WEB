import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMagicLinkParam } from "../hooks/useMagicLinkParam";
import { getEContractById } from "../serivces/contract.api";
import { mockContract } from "../mock/contract.mock";
import { ClipLoader } from "react-spinners";

import { toast } from "react-toastify";
import OtpModal from "../../../components/OtpModal";
import {
  confirmEContractByTenant,
  inputOtpEContractByTenant,
} from "../serivces/contract.api";

export function ContractViewPage() {
  const { id, token } = useMagicLinkParam();
  const navigate = useNavigate();
  const [html, setHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // OTP modal state
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [contractInfo, setContractInfo] = useState(null);
  useEffect(() => {
    if (!id) {
      setError("Thiếu ID hợp đồng trong đường dẫn.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadContract() {
      try {
        setLoading(true);
        setError(null);
        const response = await getEContractById(id, token);
        if (cancelled) return;
        const contractData = response.data.data;
        console.log(contractData);
        setContractInfo(contractData);
        const contractHtml = response.data.data.html;
        if (!contractHtml) {
          setError("Không tìm thấy nội dung hợp đồng.");
          return;
        }
        setHtml(contractHtml);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || err?.message || "Lỗi tải hợp đồng.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadContract();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  // 1) Toast xác nhận đã đọc + nút đồng ý
  const handleConfirm = () => {
    if (!id || !token) {
      toast.error("Thiếu id hoặc token từ đường dẫn.");
      return;
    }

    toast(
      ({ closeToast }) => (
        <ConfirmReadToast
          onCancel={closeToast}
          onAgree={async () => {
            // gọi API ready
            const loadingId = toast.loading("Đang gửi yêu cầu xác nhận...");
            try {
              await confirmEContractByTenant(id, token);
              toast.update(loadingId, {
                render: "Đã gửi OTP. Vui lòng nhập mã OTP để hoàn tất.",
                type: "success",
                isLoading: false,
                autoClose: 2000,
              });
              closeToast?.();
              setOtpOpen(true); // mở modal OTP
            } catch (err) {
              const msg =
                err?.response?.data?.message ||
                err?.message ||
                "Không thể xác nhận hợp đồng.";
              toast.update(loadingId, {
                render: msg,
                type: "error",
                isLoading: false,
                autoClose: 3000,
              });
            }
          }}
        />
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      },
    );
  };
  const handleSubmitOtp = async (otp) => {
    if (!token) return;
    setOtpLoading(true);
    try {
      await inputOtpEContractByTenant(otp, token);
      toast.success("Xác nhận hợp đồng thành công!");
      setOtpOpen(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "OTP không đúng hoặc đã hết hạn.";
      toast.error(msg);
    } finally {
      setOtpLoading(false);
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
      {/* OTP Modal */}
      <OtpModal
        open={otpOpen}
        loading={otpLoading}
        onClose={() => (otpLoading ? null : setOtpOpen(false))}
        onSubmit={handleSubmitOtp}
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-medium transition-colors shadow-md"
          >
            Xác nhận hợp đồng
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

// Toast content component
function ConfirmReadToast({ onCancel, onAgree }) {
  const [checked, setChecked] = useState(false);
  const [agreeLoading, setAgreeLoading] = useState(false);

  return (
    <div className="min-w-[320px]">
      <div className="font-semibold text-gray-900">Xác nhận trước khi ký</div>
      <div className="text-sm text-gray-700 mt-1">
        Bạn vui lòng xác nhận rằng bạn đã xem đầy đủ nội dung hợp đồng.
      </div>

      <label className="flex items-center gap-2 mt-3 text-sm text-gray-800 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>Tôi đã xem đầy đủ hợp đồng</span>
      </label>

      <div className="mt-4 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
          disabled={agreeLoading}
        >
          Hủy
        </button>

        <button
          type="button"
          disabled={!checked || agreeLoading}
          onClick={async () => {
            setAgreeLoading(true);
            try {
              await onAgree();
            } finally {
              setAgreeLoading(false);
            }
          }}
          className="px-3 py-1.5 rounded text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
        >
          {agreeLoading ? "Đang xử lý..." : "Đồng ý"}
        </button>
      </div>
    </div>
  );
}
