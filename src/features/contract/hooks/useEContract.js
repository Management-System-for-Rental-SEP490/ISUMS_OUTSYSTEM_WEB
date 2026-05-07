import { useEffect, useState } from "react";
import i18n from "../../../i18n";
import { readyEcontract } from "../services/contract.api";
import { getSignContextFromResponse } from "../utils/signatureUtils";

// Resolve through the singleton i18n instance so the error string picks
// up the tenant's contract language at load time.
const t = (...args) => i18n.t(...args);

const ERROR_CODE_KEYS = {
  INVALID_PROCESS_CODE: "errors.invalidProcessCode",
  SIGNING_INFO_UNAVAILABLE: "errors.signingInfoUnavailable",
  CONTRACT_NOT_FOUND: "errors.contractNotFound",
  PDF_NOT_READY: "errors.contractPdfNotReady",
};

function resolveErrorMessage(err) {
  const data = err?.response?.data;
  const code = data?.errors?.find((item) => item?.code)?.code || data?.code;
  if (code && ERROR_CODE_KEYS[code]) return t(ERROR_CODE_KEYS[code]);
  if (data?.message === "Unexpected error") return t("errors.server");
  return t("errors.loadContract");
}

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
        if (!cancelled) setError(resolveErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadContract();
    return () => { cancelled = true; };
  }, [processCode]);

  return { pdfUrl, contractInfo, signingCtx, loading, error };
}
