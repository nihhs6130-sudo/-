import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useEventState } from "../hooks/useEventState";
import { safeStorage } from "../utils/safeStorage";

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export default function JoinPage() {
  // Generate or retrieve anonymous session ID
  const [sessionId] = useState(() => {
    let sid = safeStorage.getItem("vision_session_id");
    if (!sid) {
      sid = "user_" + Math.random().toString(36).substr(2, 9);
      safeStorage.setItem("vision_session_id", sid);
    }
    return sid;
  });

  const { state, connected, error, syncClicks } = useEventState(sessionId);
  const [personalClicks, setPersonalClicks] = useState<number>(() => {
    return Number(safeStorage.getItem(`clicks_${state.startedAt || 'event'}`)) || 0;
  });

  // Local click buffers to enforce the 500ms grouping mandate
  const [localUnsentClicks, setLocalUnsentClicks] = useState<number>(0);
  const unsentClicksRef = useRef<number>(0);
  unsentClicksRef.current = localUnsentClicks;

  // Streak counter to show continuous click accumulation without resetting every 500ms
  const [streakCount, setStreakCount] = useState<number>(0);
  const streakTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (streakTimeoutRef.current) {
        clearTimeout(streakTimeoutRef.current);
      }
    };
  }, []);

  // Particle list
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef<number>(0);

  // Remaining time calculation based on server timestamps
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [countdownLeft, setCountdownLeft] = useState<number>(3);

  // Synchronize localStorage clicks when startedAt changes
  useEffect(() => {
    if (state.startedAt) {
      const stored = safeStorage.getItem(`clicks_${state.startedAt}`);
      setPersonalClicks(stored ? Number(stored) : 0);
    }
  }, [state.startedAt]);

  const [clockOffset, setClockOffset] = useState<number>(0);

  // Sync clock offset when serverState updates to eliminate client-server clock skew
  useEffect(() => {
    if (state && state.serverTime) {
      setClockOffset(state.serverTime - Date.now());
    }
  }, [state.serverTime]);

  // Server Time Synchronized Countdown & Timer updates
  useEffect(() => {
    const interval = setInterval(() => {
      const adjustedNow = Date.now() + clockOffset;
      
      if (state.status === "countdown" && state.startedAt !== null) {
        const elapsed = Math.max(0, adjustedNow - state.startedAt);
        const count = Math.max(0, state.countdownDuration - Math.floor(elapsed / 1000));
        setCountdownLeft(count);
      } else if (state.status === "running" && state.runStartedAt !== null) {
        const elapsed = Math.max(0, adjustedNow - state.runStartedAt);
        const remaining = Math.max(0, state.duration - Math.floor(elapsed / 1000));
        setTimeLeft(remaining);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [state.status, state.startedAt, state.runStartedAt, state.duration, state.countdownDuration, clockOffset]);

  // Flush clicks to server every 500ms
  useEffect(() => {
    const flushInterval = setInterval(() => {
      const clicksToSync = unsentClicksRef.current;
      if (clicksToSync > 0) {
        syncClicks(clicksToSync);
        setLocalUnsentClicks(0); // clear unsent count
      }
    }, 500);

    return () => clearInterval(flushInterval);
  }, [syncClicks]);

  // Handle tactile clicks
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (state.status !== "running") return;

    // Vibrate device briefly (tactile feedback)
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }

    // Increment local metrics
    setPersonalClicks(prev => {
      const next = prev + 1;
      if (state.startedAt) {
        safeStorage.setItem(`clicks_${state.startedAt}`, String(next));
      }
      return next;
    });
    setLocalUnsentClicks(prev => prev + 1);

    // Increment continuous streak count
    setStreakCount(prev => prev + 1);
    if (streakTimeoutRef.current) {
      clearTimeout(streakTimeoutRef.current);
    }
    streakTimeoutRef.current = setTimeout(() => {
      setStreakCount(0);
    }, 1500); // Reset streak after 1.5 seconds of inactivity

    // Spawn 3 beautiful floating leaf/particle SVGs around the tap area
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const newParticles: Particle[] = Array.from({ length: 3 }).map(() => {
      particleIdRef.current += 1;
      return {
        id: particleIdRef.current,
        x: clickX,
        y: clickY,
        rotation: Math.random() * 360,
        scale: 0.6 + Math.random() * 0.6
      };
    });

    setParticles(prev => [...prev, ...newParticles]);

    // Clean up particles
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);
  };

  return (
    <div id="join-page-root" className="min-h-screen bg-[#F7F5EF] flex flex-col justify-between p-6 font-sans text-[#26312C] max-w-md mx-auto relative overflow-hidden select-none">
      
      {/* Background Leaves Accent */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#91A98E]/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-[#173C2A]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Connection Status Notification */}
      {!connected && (
        <div className="absolute top-4 left-6 right-6 z-50 bg-[#C6A15B]/95 text-white py-2 px-4 rounded-full text-xs font-semibold text-center shadow-md animate-pulse">
          {error || "서버 연결 대기 중..."}
        </div>
      )}

      {/* TOP HEADER */}
      <header className="text-center pt-4 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-3 bg-white px-3.5 py-1.5 rounded-full border border-[#91A98E]/25 shadow-xs">
          <div className="w-4 h-4 bg-[#173C2A] rounded-sm flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 border border-[#C6A15B] rounded-full"></div>
          </div>
          <span className="text-[10px] font-bold text-[#91A98E] uppercase tracking-widest leading-none">/join 모바일 화면</span>
        </div>
        <h1 className="text-base font-bold text-[#173C2A] tracking-tight mb-1">
          함께 채우는 원예특작의 미래
        </h1>
        <p className="text-[11px] text-[#26312C]/70 leading-relaxed px-4">
          터치에 따른 실시간 잎사귀 입자 피드백과 동시 진동 효과로 무대 LED 전경에 미래 원예 비전을 채워주세요.
        </p>
      </header>

      {/* CENTRAL AREA - TACTILE INTERACTION */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 relative">
        <AnimatePresence mode="wait">
          
          {/* 1. STANDBY STATUS */}
          {state.status === "waiting" && (
            <motion.div
              key="join-waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-full bg-[#173C2A]/10 flex items-center justify-center mb-6 text-[#173C2A] animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-base font-bold text-[#173C2A] mb-1">
                잠시 후 이벤트가 시작됩니다
              </p>
              <p className="text-xs text-[#26312C]/60">
                무대 LED 대형 스크린의 안내에 집중해 주세요.
              </p>
            </motion.div>
          )}

          {/* 2. COUNTDOWN STATUS */}
          {state.status === "countdown" && (
            <motion.div
              key="join-countdown"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="text-center"
            >
              <div className="text-[100px] font-black text-[#173C2A] leading-none select-none tracking-tighter filter drop-shadow animate-ping">
                {countdownLeft > 0 ? countdownLeft : "시작!"}
              </div>
              <p className="text-sm font-bold text-[#C6A15B] mt-4 uppercase tracking-widest">
                곧 비전 선포 시작됩니다
              </p>
            </motion.div>
          )}

          {/* 3. RUNNING STATUS */}
          {state.status === "running" && (
            <motion.div
              key="join-running"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center"
            >
              {/* TACTILE TOUCH BUTTON */}
              <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                
                {/* Outer Ripple Rings */}
                <div className="absolute inset-0 bg-[#173C2A]/5 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-4 bg-[#91A98E]/10 rounded-full animate-pulse pointer-events-none" />

                {/* Main Leaf Button */}
                <button
                  id="touch-participation-button"
                  onClick={handleButtonClick}
                  className="relative w-[190px] h-[190px] rounded-full bg-gradient-to-tr from-[#0F2F23] to-[#173C2A] text-white shadow-2xl flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 transition-transform duration-75 border-4 border-[#C6A15B] hover:border-[#F7F5EF] group outline-none"
                  style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }} // Leaf contouring
                >
                  {/* Subtle Leaf Vein Accent */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <svg viewBox="0 0 100 100" className="w-full h-full p-6 stroke-white stroke-[2] fill-none">
                      <path d="M50 90 L50 10" />
                      <path d="M50 70 Q30 50 20 40" />
                      <path d="M50 50 Q70 30 80 20" />
                      <path d="M50 30 Q30 20 15 10" />
                    </svg>
                  </div>

                  <span className="text-[#C6A15B] text-[10px] font-bold tracking-[0.2em] mb-1">TOUCH</span>
                  <span className="text-lg font-black tracking-wide">미래를 채우기</span>
                  
                  {/* Interactive Clicks Floating Feedback */}
                  <AnimatePresence>
                    {streakCount > 0 && (
                      <motion.div
                        key="streak-bubble"
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: [1, 1.2, 1], y: -45 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bg-[#C6A15B] text-[#173C2A] text-xs font-black rounded-full px-3 py-1 shadow-lg pointer-events-none z-10"
                      >
                        +{streakCount}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* HTML5 Particle emission canvas/layer */}
                  <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                    {particles.map(p => (
                      <span
                        key={p.id}
                        className="absolute block text-lg transition-transform duration-1000 ease-out"
                        style={{
                          left: `${p.x}px`,
                          top: `${p.y}px`,
                          transform: `translate(-50%, -50%) translate(${(p.x - 95) * 1.5}px, ${(p.y - 95) * 1.5}px) rotate(${p.rotation}deg) scale(${p.scale})`,
                          opacity: 0,
                          transition: 'transform 1s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.8s ease-out'
                        }}
                        ref={(el) => {
                          if (el) {
                            // Force trigger layout & styling to play the transition
                            requestAnimationFrame(() => {
                              el.style.transform = `translate(-50%, -50%) translate(${(Math.random() - 0.5) * 180}px, ${-120 - Math.random() * 80}px) rotate(${p.rotation + 180}deg) scale(0)`;
                              el.style.opacity = '1';
                            });
                          }
                        }}
                      >
                        🍃
                      </span>
                    ))}
                  </div>
                </button>
              </div>

              {/* Tap encouragement */}
              <p className="text-xs text-[#173C2A] font-bold tracking-wider animate-pulse mt-3 bg-white px-3 py-1.5 rounded-full shadow-sm">
                ⚡ 화면의 녹색 잎을 빠르게 연타하세요!
              </p>
            </motion.div>
          )}

          {/* 4. FINISHED STATUS */}
          {state.status === "finished" && (
            <motion.div
              key="join-finished"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center px-4"
            >
              <div className="w-20 h-20 rounded-full bg-[#173C2A] flex items-center justify-center mx-auto mb-6 shadow-lg border-2 border-[#C6A15B]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-[#173C2A] mb-2">비전 완성 성공!</h3>
              <p className="text-xs text-[#26312C]/80 leading-relaxed mb-1">
                여러분의 참여로 원예특작의 미래 비전이 스크린에 가득 채워졌습니다.
              </p>
              <p className="text-xs font-bold text-[#C6A15B]">
                함께해 주셔서 진심으로 감사드립니다.
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER - PERSONAL & GLOBAL PROGRESS REPORT */}
      <footer className="bg-white/80 border border-[#91A98E]/20 backdrop-blur rounded-2xl p-4 shadow-md">
        
        {/* Dynamic Progress Slider */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1 text-[11px] font-bold">
            <span className="text-[#26312C]/60">전체 스크린 완성도</span>
            <span className="text-[#173C2A]">{Math.round(state.screenProgress * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-[#F7F5EF] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#91A98E] to-[#173C2A] transition-all duration-300"
              style={{ width: `${state.screenProgress * 100}%` }}
            />
          </div>
        </div>

        {/* Real-time stats grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-medium border-t border-[#91A98E]/10 pt-3">
          <div className="border-r border-[#91A98E]/10">
            <p className="text-[#26312C]/55 mb-0.5">나의 기여도</p>
            <p id="personal-clicks-display" className="text-sm font-extrabold text-[#173C2A]">{personalClicks}회</p>
          </div>
          <div className="border-r border-[#91A98E]/10">
            <p className="text-[#26312C]/55 mb-0.5">남은 시간</p>
            <p className="text-sm font-extrabold text-[#173C2A]">
              {state.status === "running" ? `${timeLeft}초` : "-"}
            </p>
          </div>
          <div>
            <p className="text-[#26312C]/55 mb-0.5">현재 참가자</p>
            <p className="text-sm font-extrabold text-[#C6A15B]">{state.activeUsers}명</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
