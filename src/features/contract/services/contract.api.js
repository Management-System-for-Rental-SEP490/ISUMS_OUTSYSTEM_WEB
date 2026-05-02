import { http } from "../../../shared/api/http";
// export function getEContract(processCode) {
//   return http.post("/econtracts/outsystem", { processCode });
// }
export function readyEcontract(processCode) {
  return http.post("/econtracts/processCode", { processCode }, { silent500: true });
}
export function signEContract(payload) {
  return http.post("/econtracts/sign", payload);
}
/** Lấy presigned PDF URL — GET /econtracts/{id}/pdf-url, header X-Contract-Token */
export function getContractPdfUrl(contractId, token) {
  return http.get(`/econtracts/${contractId}/pdf-url`, {
    headers: { "X-Contract-Token": token },
  });
}

export function createVnpayPaymentUrl(invoiceId, token) {
  return http.post(
    `/payments/outsystem/vnpay?invoiceId=${invoiceId}&token=${token}`,
    { invoiceId, bankCode: "VNBANK", locale: "vn" },
  );
}

export function uploadCccd(id, token, frontImage, backImage) {
  const form = new FormData();
  form.append("frontImage", frontImage);
  form.append("backImage", backImage);
  return http.post(`/econtracts/${id}/cccd`, form, {
    headers: {
      ...(token ? { "X-Contract-Token": token } : {}),
    },
    silent500: true,
  });
}

/**
 * Upload passport (single image) for foreign tenant identity verification.
 * BE counterpart: PUT /econtracts/{id}/passport — requires `X-Contract-Token`
 * header. BE runs OCR + transitions the contract to READY + dispatches the
 * "ready-for-landlord-signature" Kafka event, same as the CCCD flow.
 */
export function uploadPassport(id, token, passportImage) {
  const form = new FormData();
  form.append("passportImage", passportImage);
  return http.put(`/econtracts/${id}/passport`, form, {
    headers: {
      ...(token ? { "X-Contract-Token": token } : {}),
    },
    silent500: true,
  });
}

/**
 * Fetch tenantType + contractLanguage for the confirm page router.
 * Returns { data: { tenantType: "VIETNAMESE" | "FOREIGNER",
 *                   contractLanguage: "VI" | "VI_EN" | "VI_JA" } }.
 * Only the magic token is required — no JWT session.
 */
export function getContractTenantMeta(contractId, token) {
  return http.get(`/econtracts/${contractId}/tenant-meta`, {
    headers: { "X-Contract-Token": token },
  });
}
