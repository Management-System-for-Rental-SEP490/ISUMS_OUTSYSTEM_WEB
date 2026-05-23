import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ContractViewPage } from "./features/contract/pages/ContractViewPage";
import { ContractConfirmPage } from "./features/contract/pages/ContractConfirmPage";
import PaymentResultPage from "./features/payment/pages/PaymentResultPage";
import PaymentRedirectPage from "./features/payment/pages/PaymentRedirectPage";
import { MaintenanceGate } from "./shared/maintenance/MaintenanceGate";
import "./App.css";
import { ToastContainer } from "react-toastify";

function NotFound() {
  const { t } = useTranslation("common");
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>{t("errors.notFound")}</p>
    </div>
  );
}

function App() {
  return (
    <MaintenanceGate>
      <BrowserRouter>
        <Routes>
          <Route
            path="/econtract/view/:processCode"
            element={<ContractViewPage />}
          />
          <Route
            path="/contracts/:contractId/confirm"
            element={<ContractConfirmPage />}
          />
          <Route path="/payments" element={<PaymentRedirectPage />} />
          <Route path="/payments/result" element={<PaymentResultPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ToastContainer position="top-center" autoClose={3000} />
      </BrowserRouter>
    </MaintenanceGate>
  );
}

export default App;
