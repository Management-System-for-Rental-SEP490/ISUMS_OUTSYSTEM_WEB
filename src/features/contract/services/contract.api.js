import { http } from "../../../shared/api/http";
// export function getEContract(processCode) {
//   return http.post("/econtracts/outsystem", { processCode });
// }
export function readyEcontract(processCode) {
  return http.post("/econtracts/processCode", { processCode });
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

export function uploadCccd(id, token, frontImage, backImage) {
  const form = new FormData();
  form.append("frontImage", frontImage);
  form.append("backImage", backImage);
  return http.put(`/econtracts/${id}/cccd`, form, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...(token ? { "X-Contract-Token": token } : {}),
    },
  });
}
