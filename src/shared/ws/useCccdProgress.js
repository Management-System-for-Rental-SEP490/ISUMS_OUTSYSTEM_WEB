import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WS_ENDPOINT =
  (typeof window !== "undefined" && window.__OCRS_WS__) ||
  import.meta.env.VITE_WS_BASE_URL ||
  "https://api.isums.pro/api/econtracts/ws";

const CONNECT_TIMEOUT_MS = 3000;

export const STAGE_TO_STEP = {
  OCR_START: 1,
  PDF_ASSEMBLY: 2,
  VNPT_UPLOAD: 3,
  FINALIZING: 3,
  COMPLETE: 3,
  FAILED: -1,
};

export function useCccdProgress(contractId, active) {
  const [stage, setStage] = useState(null);
  const [stepOverride, setStepOverride] = useState(null);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);

  useEffect(() => {
    if (!active || !contractId) {
      setStage(null);
      setStepOverride(null);
      setConnected(false);
      return;
    }

    let timeoutId = null;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      reconnectDelay: 0,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
    });

    client.onConnect = () => {
      clearTimeout(timeoutId);
      setConnected(true);
      client.subscribe(`/topic/contract/${contractId}/status`, (frame) => {
        try {
          const msg = JSON.parse(frame.body);
          if (msg?.kind !== "CCCD_PROGRESS" || typeof msg?.stage !== "string") return;
          setStage(msg.stage);
          const step = STAGE_TO_STEP[msg.stage];
          if (typeof step === "number") setStepOverride(step);
        } catch {
          // ignore malformed frame
        }
      });
    };

    client.onStompError = () => { setConnected(false); };
    client.onWebSocketError = () => { setConnected(false); };
    client.onWebSocketClose = () => { setConnected(false); };

    timeoutId = setTimeout(() => {
      if (!client.connected) {
        try { client.deactivate(); } catch { /* noop */ }
        setConnected(false);
      }
    }, CONNECT_TIMEOUT_MS);

    try { client.activate(); } catch { setConnected(false); }
    clientRef.current = client;

    return () => {
      clearTimeout(timeoutId);
      try { client.deactivate(); } catch { /* noop */ }
      clientRef.current = null;
    };
  }, [contractId, active]);

  return { stage, stepOverride, connected };
}
