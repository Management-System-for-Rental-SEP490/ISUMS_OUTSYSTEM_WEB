import { useParams, useSearchParams } from "react-router-dom";
export function useMagicLinkParam() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  return { id, token };
}
