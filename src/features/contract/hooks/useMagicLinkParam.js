import { useParams } from "react-router-dom";
export function useMagicLinkParam() {
  const { processCode } = useParams();
  return { processCode };
}
