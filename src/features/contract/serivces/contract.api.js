import { http } from "../../../shared/api/http";

export function getEContractById(eContractId, token) {
  return http.post("/econtracts/outsystem", { eContractId, token });
}
export function confirmEContractByTenant(eContractId, token) {
  return http.post("/econtracts/ready", { eContractId, token });
}
export function c(processCode, token) {
  return http.post("/econtracts/processCode", { processCode, token });
}
export function signEContract(payload) {
  return http.post("/econtracts/sign", payload);
}
