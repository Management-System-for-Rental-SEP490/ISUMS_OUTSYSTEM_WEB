import { useEffect, useState } from "react";
import { readyEcontract } from "../services/contract.api";
import { getSignContextFromResponse } from "../utils/signatureUtils";

export function useEContract(processCode) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [signingCtx, setSigningCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (processCode === undefined) {
      setError("Thiếu mã xử lý hợp đồng, Vui lòng check lại đường link trong email.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function loadContract() {
      try {
        setLoading(true);
        setError(null);
        const res = await readyEcontract(processCode);
        if (cancelled) return;
        const data = res?.data?.data;
        setPdfUrl(data?.pdfUrl ?? null);
        setContractInfo(data ?? null);
        setSigningCtx(getSignContextFromResponse(res));
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || "Lỗi tải hợp đồng.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadContract();
    return () => { cancelled = true; };
  }, [processCode]);

  return { pdfUrl, contractInfo, signingCtx, loading, error };
}
