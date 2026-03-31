import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createVnpayPaymentUrl } from "../../contract/services/contract.api";

export default function PaymentRedirectPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  const invoiceId = searchParams.get("invoiceId");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!invoiceId) {
      setError("Đường dẫn không hợp lệ. Thiếu thông tin invoiceId.");
      return;
    }

    createVnpayPaymentUrl(invoiceId, token)
      .then((res) => {
        const paymentUrl = res?.data?.data;
        if (!paymentUrl) {
          setError("Không lấy được link thanh toán. Vui lòng thử lại.");
          return;
        }
        window.location.href = paymentUrl;
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message ||
          "Có lỗi xảy ra khi tạo link thanh toán.";
        setError(msg);
      });
  }, [invoiceId, token]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Lỗi thanh toán
          </h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-teal-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          Đang chuyển đến trang thanh toán...
        </h2>
        <p className="text-sm text-gray-400">Vui lòng không đóng trang này.</p>
      </div>
    </div>
  );
}
