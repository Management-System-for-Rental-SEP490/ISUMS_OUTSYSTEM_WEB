import { http } from "../../../shared/api/http";

export function getEContract(processCode) {
  return http.post("/econtracts/outsystem", { processCode });
}
export function readyEcontract(processCode) {
  return http.post("/econtracts/processCode", { processCode });
}
export function signEContract(payload) {
  return http.post("/econtracts/sign", payload);
}
