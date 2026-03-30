import { useSearchParams, useNavigate } from "react-router-dom";

const formatCurrency = (amountStr) => {
  if (!amountStr) return "0";
  // VNPay amount is multiplied by 100
  const amount = parseInt(amountStr, 10) / 100;
  return amount.toLocaleString("vi-VN");
};

const formatDate = (dateStr) => {
  if (!dateStr || dateStr.length !== 14) return dateStr ?? "";
  // Format: YYYYMMDDHHmmss → YYYY-MM-DD HH:mm:ss
  const y = dateStr.slice(0, 4);
  const mo = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const h = dateStr.slice(8, 10);
  const mi = dateStr.slice(10, 12);
  const s = dateStr.slice(12, 14);
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
};

const BANK_LABELS = {
  NCB: "NCB",
  VIETCOMBANK: "Vietcombank",
  TECHCOMBANK: "Techcombank",
  BIDV: "BIDV",
  AGRIBANK: "Agribank",
  MBBANK: "MB Bank",
  VPBANK: "VPBank",
  TPBANK: "TPBank",
  SACOMBANK: "Sacombank",
  HDBANK: "HDBank",
};

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const responseCode = params.get("vnp_ResponseCode");
  const transactionStatus = params.get("vnp_TransactionStatus");
  const isSuccess = responseCode === "00" && transactionStatus === "00";

  const amount = formatCurrency(params.get("vnp_Amount"));
  const bankCode = params.get("vnp_BankCode") ?? "";
  const bankTranNo = params.get("vnp_BankTranNo") ?? "";
  const payDate = formatDate(params.get("vnp_PayDate"));
  const orderInfo = params.get("vnp_OrderInfo")
    ? decodeURIComponent(params.get("vnp_OrderInfo").replace(/\+/g, " "))
    : "";
  const txnRef = params.get("vnp_TxnRef") ?? "";

  const bankLabel = BANK_LABELS[bankCode] ?? bankCode;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Status icon */}
        <div className="flex flex-col items-center mb-6">
          {isSuccess ? (
            <div className="w-16 h-16 rounded-full bg-teal-500 flex items-center justify-center mb-4 shadow-md">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-4 shadow-md">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-800">
            {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại!"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isSuccess
              ? "Giao dịch của bạn đã được xử lý an toàn."
              : "Giao dịch không thành công. Vui lòng thử lại."}
          </p>
        </div>

        {/* Amount card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-1">
            Số tiền thanh toán
          </p>
          <p
            className={`text-4xl font-bold text-center ${
              isSuccess ? "text-gray-800" : "text-red-500"
            }`}
          >
            {amount}{" "}
            <span className="text-xl font-semibold text-gray-400">VND</span>
          </p>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 mb-4">
          {bankLabel && <DetailRow label="Ngân hàng" value={bankLabel} />}
          <DetailRow
            label="Trạng thái"
            value={
              isSuccess ? (
                <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 text-sm font-medium px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Thành công
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-sm font-medium px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Thất bại
                </span>
              )
            }
          />
          {bankTranNo && (
            <DetailRow
              label="Mã giao dịch"
              value={<span className="font-semibold">{bankTranNo}</span>}
            />
          )}
          {payDate && <DetailRow label="Ngày thực hiện" value={payDate} />}
          {orderInfo && <DetailRow label="Nội dung" value={orderInfo} />}
        </div>

        {/* Security badge */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700">
              Bảo mật bởi ISUMS
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              Hệ thống quản lý nhà cho thuê thông minh
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {isSuccess && txnRef && (
            <button
              onClick={() =>
                (window.location.href = `https://outsystem.isums.pro/contracts/${txnRef}/view`)
              }
              className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Xem hợp đồng
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}
