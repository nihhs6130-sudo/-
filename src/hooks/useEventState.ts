import { useState, useEffect, useCallback, useRef } from "react";
import { EventState } from "../types";

export function useEventState(sessionId?: string) {
  const [state, setState] = useState<EventState>({
    status: "waiting",
    targetClicks: 1000,
    duration: 30,
    countdownDuration: 3,
    totalClicks: 0,
    actualProgress: 0,
    screenProgress: 0,
    startedAt: null,
    runStartedAt: null,
    activeUsers: 0,
    serverTime: Date.now(),
  });

  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to hold latest state to prevent stale closures
  const stateRef = useRef<EventState>(state);
  stateRef.current = state;

  // Poll fallback function
  const pollState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("HTTP error " + res.status);
      
      // Check response Content-Type to prevent JSON parse errors on HTML redirects
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html") || res.url.includes("__cookie_check") || res.url.includes("login")) {
        throw new Error("HTML_REDIRECT");
      }
      
      const data: EventState = await res.json();
      setState(data);
      setConnected(true);
      setError(null);
    } catch (err: any) {
      setConnected(false);
      if (err.message === "HTML_REDIRECT") {
        setError("비공개 개발용 URL(ais-dev)은 모바일 또는 다른 기기에서 연동할 수 없습니다. 우측 상단의 '공유(Share)' 버튼을 누른 뒤 발급된 'Shared App URL'(ais-pre로 시작하는 URL)을 스마트폰이나 새 탭에서 열어주세요!");
      } else {
        setError(err.message || "서버와 연결을 시도하는 중입니다...");
      }
    }
  }, []);

  // Sync client clicks
  const syncClicks = useCallback(async (clicks: number) => {
    if (clicks <= 0) return null;
    
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, clicks }),
      });
      
      if (!res.ok) throw new Error("Sync failed");
      
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html") || res.url.includes("__cookie_check") || res.url.includes("login")) {
        throw new Error("HTML_REDIRECT");
      }
      
      const data: EventState = await res.json();
      setState(data);
      setConnected(true);
      return data;
    } catch (err: any) {
      console.error("클릭 전송 실패, 재시도 중...", err);
      if (err.message === "HTML_REDIRECT") {
        setError("비공개 개발용 URL(ais-dev)은 모바일 또는 다른 기기에서 연동할 수 없습니다. 'Shared App URL'(ais-pre)을 사용해 주세요!");
      }
      // Fail silently, but return null so client knows to keep buffered clicks
      return null;
    }
  }, [sessionId]);

  // Connect via SSE (EventSource) for instant broadcasts
  useEffect(() => {
    let sse: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        sse = new EventSource("/api/state/stream");

        sse.onopen = () => {
          setConnected(true);
          setError(null);
          // If we have a polling fallback running, clear it
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        };

        sse.onmessage = (event) => {
          try {
            const data: EventState = JSON.parse(event.data);
            setState(data);
          } catch (err) {
            console.error("Failed to parse SSE payload", err);
          }
        };

        sse.onerror = (err) => {
          console.warn("SSE disconnected, falling back to polling...", err);
          setConnected(false);
          sse?.close();
          
          // Start polling fallback immediately
          if (!pollInterval) {
            pollState(); // poll immediately
            pollInterval = setInterval(pollState, 1000);
          }
        };
      } catch (err) {
        console.warn("SSE unsupported or failed to construct, polling...", err);
        if (!pollInterval) {
          pollState();
          pollInterval = setInterval(pollState, 1000);
        }
      }
    };

    connectSSE();

    return () => {
      if (sse) sse.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollState]);

  return { state, connected, error, syncClicks, refetch: pollState };
}
