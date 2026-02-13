import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ContractViewPage } from "./features/contract/pages/ContractViewPage";
import "./App.css";
import { ToastContainer } from "react-toastify";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/econtract/view/:id" element={<ContractViewPage />} />
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
