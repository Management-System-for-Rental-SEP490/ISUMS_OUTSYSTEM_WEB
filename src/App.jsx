import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ContractViewPage } from "./features/contract/pages/ContractViewPage";
import { ContractConfirmPage } from "./features/contract/pages/ContractConfirmPage";
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
