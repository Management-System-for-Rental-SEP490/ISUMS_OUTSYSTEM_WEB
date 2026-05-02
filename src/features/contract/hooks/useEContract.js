import { useEffect, useState } from "react";
import i18n from "../../../i18n";
import { readyEcontract } from "../services/contract.api";
import { getSignContextFromResponse } from "../utils/signatureUtils";

// Resolve through the singleton i18n instance so the error string picks
// up the tenant's contract language at load time.
const t = (...args) => i18n.t(...args);

export function useEContract(processCode) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [signingCtx, setSigningCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (processCode === undefined) {
      setError(t("errors.missingProcessCode"));
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
          setError(
            err?.response?.data?.message === "Unexpected error"
              ? t("errors.server")
              : err?.response?.data?.message || err?.message || t("errors.loadContract"),
          );
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
