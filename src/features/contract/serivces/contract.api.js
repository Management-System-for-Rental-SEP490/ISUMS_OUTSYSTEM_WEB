import { http } from "../../../shared/api/http";

export function getEContractById(eContractId, token) {
  return http.post("/econtracts/outsystem", { eContractId, token });
}
export function confirmEContractByTenant(eContractId, token) {
  return http.post("/econtracts/ready", { eContractId, token });
}
export function inputOtpEContractByTenant(processCode, token) {
  return http.post("/econtracts/processCode", { processCode, token });
}
