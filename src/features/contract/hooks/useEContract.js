import { useEffect, useState } from "react";
import { getEContract } from "../services/contract.api";
export function useEContract(processCode) {
  const [html, setHtml] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (processCode === undefined) {
      setError(
        "Thiếu mã xử lý hợp đồng, Vui lòng check lại đường link trong email.",
      );
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function loadContract() {
      try {
        setLoading(true);
        setError(null);

        const response = await getEContract(processCode);
        if (cancelled) return;

        const contractData = response?.data?.data;
        const contractHtml = contractData?.html;

        setContractInfo(contractData ?? null);

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
  }, [processCode]);

  return { html, contractInfo, loading, error };
}
