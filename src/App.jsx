import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ContractViewPage } from "./features/contract/pages/ContractViewPage";
import { ContractConfirmPage } from "./features/contract/pages/ContractConfirmPage";
import PaymentResultPage from "./features/payment/pages/PaymentResultPage";
import PaymentRedirectPage from "./features/payment/pages/PaymentRedirectPage";
import "./App.css";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Web cũ: ký hợp đồng bằng processCode */}
        <Route
          path="/econtract/view/:processCode"
          element={<ContractViewPage />}
        />
        {/* Web mới: preview PDF + upload CCCD */}
        <Route
          path="/contracts/:contractId/confirm"
          element={<ContractConfirmPage />}
        />
        {/* Direct link thanh toán VNPay từ email */}
        <Route path="/payments" element={<PaymentRedirectPage />} />
        {/* Kết quả thanh toán VNPay */}
        <Route path="/payments/result" element={<PaymentResultPage />} />
        <Route
          path="*"
          element={
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <p>Link không hợp lệ. Vui lòng sử dụng đường dẫn từ email.</p>
            </div>
          }
        />
      </Routes>
      <ToastContainer position="top-center" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;
