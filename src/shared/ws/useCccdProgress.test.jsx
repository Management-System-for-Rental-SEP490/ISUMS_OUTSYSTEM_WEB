import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const clientInstances = [];
const sockJsInstances = [];

vi.mock("@stomp/stompjs", () => {
  class FakeClient {
    constructor(cfg) {
      this.cfg = cfg;
      this.activated = false;
      this.connected = false;
      this.subscriptions = [];
      this.onConnect = null;
      this.onStompError = null;
      this.onWebSocketError = null;
      this.onWebSocketClose = null;
      clientInstances.push(this);
    }
    activate() {
      this.activated = true;
    }
    deactivate() {
      this.activated = false;
      this.connected = false;
    }
    subscribe(destination, handler) {
      const sub = { destination, handler };
      this.subscriptions.push(sub);
      return sub;
    }
    simulateConnect() {
      this.connected = true;
      if (this.onConnect) this.onConnect();
    }
    simulateMessage(destination, body) {
      const sub = this.subscriptions.find((s) => s.destination === destination);
      if (sub) sub.handler({ body: typeof body === "string" ? body : JSON.stringify(body) });
    }
  }
  return { Client: FakeClient };
});

vi.mock("sockjs-client", () => {
  class FakeSockJS {
    constructor(url) {
      this.url = url;
      sockJsInstances.push(this);
    }
  }
  return { default: FakeSockJS };
});

import { useCccdProgress, STAGE_TO_STEP } from "./useCccdProgress";

const TOPIC = (id) => `/topic/contract/${id}/status`;
const CID = "550e8400-e29b-41d4-a716-446655440000";

const lastClient = () => clientInstances[clientInstances.length - 1];

describe("useCccdProgress", () => {
  beforeEach(() => {
    clientInstances.length = 0;
    sockJsInstances.length = 0;
  });

  it("returns idle state when not active", () => {
    const { result } = renderHook(() => useCccdProgress(CID, false));
    expect(result.current.stage).toBeNull();
    expect(result.current.stepOverride).toBeNull();
    expect(result.current.connected).toBe(false);
    expect(clientInstances).toHaveLength(0);
  });

  it("returns idle state when contractId missing", () => {
    const { result } = renderHook(() => useCccdProgress(null, true));
    expect(result.current.stage).toBeNull();
    expect(clientInstances).toHaveLength(0);
  });

  it("activates STOMP client when active=true and contractId set", () => {
    renderHook(() => useCccdProgress(CID, true));
    expect(clientInstances).toHaveLength(1);
    expect(lastClient().activated).toBe(true);
  });

  it("subscribes to /topic/contract/{id}/status on connect", async () => {
    renderHook(() => useCccdProgress(CID, true));
    act(() => lastClient().simulateConnect());

    await waitFor(() => expect(lastClient().subscriptions).toHaveLength(1));
    expect(lastClient().subscriptions[0].destination).toBe(TOPIC(CID));
  });

  it("flips connected=true after onConnect fires", async () => {
    const { result } = renderHook(() => useCccdProgress(CID, true));
    act(() => lastClient().simulateConnect());
    await waitFor(() => expect(result.current.connected).toBe(true));
  });

  it.each([
    ["OCR_START", 1],
    ["PDF_ASSEMBLY", 2],
    ["VNPT_UPLOAD", 3],
    ["FINALIZING", 3],
    ["COMPLETE", 3],
    ["FAILED", -1],
  ])("maps stage %s to step %s via STAGE_TO_STEP", async (stage, expectedStep) => {
    const { result } = renderHook(() => useCccdProgress(CID, true));
    act(() => lastClient().simulateConnect());
    await waitFor(() => expect(lastClient().subscriptions).toHaveLength(1));

    act(() =>
      lastClient().simulateMessage(TOPIC(CID), { kind: "CCCD_PROGRESS", stage })
    );

    await waitFor(() => expect(result.current.stage).toBe(stage));
    expect(result.current.stepOverride).toBe(expectedStep);
    expect(STAGE_TO_STEP[stage]).toBe(expectedStep);
  });

  it("ignores frames where kind !== 'CCCD_PROGRESS'", async () => {
    const { result } = renderHook(() => useCccdProgress(CID, true));
    act(() => lastClient().simulateConnect());
    await waitFor(() => expect(lastClient().subscriptions).toHaveLength(1));

    act(() =>
      lastClient().simulateMessage(TOPIC(CID), {
        kind: "STATUS_CHANGE",
        stage: "OCR_START",
      })
    );

    expect(result.current.stage).toBeNull();
    expect(result.current.stepOverride).toBeNull();
  });

  it("ignores frames where stage is missing or wrong type", async () => {
    const { result } = renderHook(() => useCccdProgress(CID, true));
    act(() => lastClient().simulateConnect());
    await waitFor(() => expect(lastClient().subscriptions).toHaveLength(1));

    act(() =>
      lastClient().simulateMessage(TOPIC(CID), { kind: "CCCD_PROGRESS", stage: 42 })
    );

    expect(result.current.stage).toBeNull();
  });

  it("ignores malformed JSON (frame.body not valid JSON)", async () => {
    const { result } = renderHook(() => useCccdProgress(CID, true));
    act(() => lastClient().simulateConnect());
    await waitFor(() => expect(lastClient().subscriptions).toHaveLength(1));

    act(() => lastClient().simulateMessage(TOPIC(CID), "not-json{"));

    expect(result.current.stage).toBeNull();
  });

  it("stepOverride is NOT updated when stage is unknown (not in STAGE_TO_STEP)", async () => {
    const { result } = renderHook(() => useCccdProgress(CID, true));
    act(() => lastClient().simulateConnect());
    await waitFor(() => expect(lastClient().subscriptions).toHaveLength(1));

    act(() =>
      lastClient().simulateMessage(TOPIC(CID), {
        kind: "CCCD_PROGRESS",
        stage: "UNKNOWN_STAGE",
      })
    );

    await waitFor(() => expect(result.current.stage).toBe("UNKNOWN_STAGE"));
    expect(result.current.stepOverride).toBeNull();
  });

  it("flips connected=false on STOMP error", async () => {
    const { result } = renderHook(() => useCccdProgress(CID, true));
    act(() => lastClient().simulateConnect());
    await waitFor(() => expect(result.current.connected).toBe(true));

    act(() => lastClient().onStompError && lastClient().onStompError());

    await waitFor(() => expect(result.current.connected).toBe(false));
  });

  it("flips connected=false on WebSocket error", async () => {
    const { result } = renderHook(() => useCccdProgress(CID, true));
    act(() => lastClient().simulateConnect());
    await waitFor(() => expect(result.current.connected).toBe(true));

    act(() => lastClient().onWebSocketError && lastClient().onWebSocketError());

    await waitFor(() => expect(result.current.connected).toBe(false));
  });

  it("flips connected=false on WebSocket close", async () => {
    const { result } = renderHook(() => useCccdProgress(CID, true));
    act(() => lastClient().simulateConnect());
    await waitFor(() => expect(result.current.connected).toBe(true));

    act(() => lastClient().onWebSocketClose && lastClient().onWebSocketClose());

    await waitFor(() => expect(result.current.connected).toBe(false));
  });

  it("deactivates client on unmount (cleanup)", () => {
    const { unmount } = renderHook(() => useCccdProgress(CID, true));
    const client = lastClient();
    expect(client.activated).toBe(true);

    unmount();

    expect(client.activated).toBe(false);
  });

  it("re-activates client when contractId changes", () => {
    const { rerender } = renderHook(({ id }) => useCccdProgress(id, true), {
      initialProps: { id: CID },
    });
    expect(clientInstances).toHaveLength(1);
    const first = clientInstances[0];

    const newId = "660e8400-e29b-41d4-a716-446655440001";
    rerender({ id: newId });

    expect(first.activated).toBe(false);
    expect(clientInstances).toHaveLength(2);
    expect(clientInstances[1].activated).toBe(true);
  });

  it("clears state when toggled from active=true to active=false", async () => {
    const { result, rerender } = renderHook(
      ({ active }) => useCccdProgress(CID, active),
      { initialProps: { active: true } }
    );
    act(() => lastClient().simulateConnect());
    await waitFor(() => expect(lastClient().subscriptions).toHaveLength(1));
    act(() =>
      lastClient().simulateMessage(TOPIC(CID), {
        kind: "CCCD_PROGRESS",
        stage: "OCR_START",
      })
    );
    await waitFor(() => expect(result.current.stage).toBe("OCR_START"));

    rerender({ active: false });

    expect(result.current.stage).toBeNull();
    expect(result.current.stepOverride).toBeNull();
    expect(result.current.connected).toBe(false);
  });
});
