import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useEventState } from "../hooks/useEventState";
import VisionScene from "./VisionScene";

export default function ScreenPage() {
  const { state, connected } = useEventState("screen_display");
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [countdownLeft, setCountdownLeft] = useState<number>(3);
  
  const [standbyImage, setStandbyImage] = useState<string>("");
  const [runElapsed, setRunElapsed] = useState<number>(0);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Fetch standby image helper
  const fetchStandbyImage = async () => {
    try {
      const res = await fetch("/api/standby-image");
      if (res.ok) {
        const data = await res.json();
        setStandbyImage(data.standbyImage || "");
      }
    } catch (err) {
      console.error("Error fetching standby image:", err);
    }
  };

  // Re-fetch when state's standby image version changes
  useEffect(() => {
    fetchStandbyImage();
  }, [state.standbyImageVersion]);

  const [clockOffset, setClockOffset] = useState<number>(0);

  // Sync clock offset when serverState updates to eliminate client-server clock skew
  useEffect(() => {
    if (state && state.serverTime) {
      setClockOffset(state.serverTime - Date.now());
    }
  }, [state.serverTime]);

  // Synchronized countdown and run timers
  useEffect(() => {
    const interval = setInterval(() => {
      const adjustedNow = Date.now() + clockOffset;
      
      if (state.status === "countdown" && state.startedAt !== null) {
        const elapsed = Math.max(0, adjustedNow - state.startedAt);
        const count = Math.max(0, state.countdownDuration - Math.floor(elapsed / 1000));
        setCountdownLeft(count);
        setRunElapsed(0);
      } else if (state.status === "running" && state.runStartedAt !== null) {
        const elapsed = Math.max(0, adjustedNow - state.runStartedAt);
        setRunElapsed(elapsed);
        const remaining = Math.max(0, state.duration - Math.floor(elapsed / 1000));
        setTimeLeft(remaining);
      } else {
        setRunElapsed(0);
      }
    }, 100); // 100ms interval for faster updates

    return () => clearInterval(interval);
  }, [state.status, state.startedAt, state.runStartedAt, state.duration, state.countdownDuration, clockOffset]);

  // Trigger screen shake when final 10 seconds count down
  useEffect(() => {
    if (state.status === "running" && timeLeft <= 10 && timeLeft > 0) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 250);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, state.status]);

  // Construct absolute dynamic URL for QR Code based on current page address
  const qrUrl = `${window.location.origin}/join`;

  return (
    <div id="screen-page-root" className="min-h-screen bg-[#0F2F23] flex items-center justify-center p-4 font-sans text-white overflow-hidden select-none">
      
      {/* 16:9 Staging Viewport Container */}
      <div className={`w-full max-w-7xl aspect-[16/9] relative bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between transition-transform duration-75 ${
        isShaking ? "animate-slam-shake" : ""
      }`}>
        
        {/* Core Vision Proclamation Scene Grid */}
        <div className="absolute inset-0 z-0">
          <VisionScene 
            progress={state.screenProgress} 
            status={state.status}
            timeLeft={timeLeft}
            runStartedAt={state.runStartedAt}
            duration={state.duration}
          />
        </div>

        {/* TOP FLOATING INFORMATION PANEL */}
        {/* Fades away slowly if state is finished */}
        <AnimatePresence>
          {state.status !== "finished" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 3.0 } }} // Elegant slow fade-out
              className="absolute top-6 right-6 z-20 bg-[#173C2A]/95 backdrop-blur-md border border-[#C6A15B]/40 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6"
            >
              <div className="text-center">
                <p className="text-[10px] font-extrabold text-neutral-300 uppercase tracking-wider mb-0.5">참여 인원</p>
                <p id="screen-active-users" className="text-xl font-extrabold text-white">{state.activeUsers} <span className="text-xs font-normal">명</span></p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] font-extrabold text-neutral-300 uppercase tracking-wider mb-0.5">총 누적 클릭</p>
                <p id="screen-total-clicks" className="text-xl font-extrabold text-[#FFEBB0]">{state.totalClicks} <span className="text-xs font-normal">회</span></p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] font-extrabold text-neutral-300 uppercase tracking-wider mb-0.5">전체 완성도</p>
                <p id="screen-completion-percentage" className="text-xl font-extrabold text-[#7FE2DC]">{Math.round(state.screenProgress * 100)}%</p>
              </div>
              {state.status === "running" && (
                <>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center min-w-[70px]">
                    <p className="text-[10px] font-extrabold text-neutral-300 uppercase tracking-wider mb-0.5">남은 시간</p>
                    <p id="screen-timer" className="text-xl font-black text-amber-300 animate-pulse">{timeLeft} <span className="text-xs font-normal">초</span></p>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* NIHHS Logo watermark top-left removed as requested */}

        {/* OVERLAYS BY EVENT STATUS */}
        <AnimatePresence>
          
          {/* 1. STANDBY OVERLAY (Centered elegant event standby page, QR code removed) */}
          {state.status === "waiting" && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.0 }}
              className="absolute inset-0 z-30 overflow-hidden flex flex-col items-center justify-center p-8 select-none"
            >
              {/* Standby background */}
              {standbyImage ? (
                <>
                  <img
                    src={standbyImage}
                    alt="Custom Standby Backdrop"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle dark filter to keep elements readable */}
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] z-10" />
                </>
              ) : (
                <>
                  {/* Default majestic deep forest green theme gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0F2F23] via-[#173C2A] to-[#0A1E16] z-0" />
                  
                  {/* Animated warm particle light glow in background */}
                  <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] bg-[#C6A15B]/10 rounded-full filter blur-[100px] animate-pulse z-1" />
                  <div className="absolute bottom-[20%] right-[30%] w-[350px] h-[350px] bg-[#91A98E]/10 rounded-full filter blur-[90px] animate-pulse z-1" />
                </>
              )}

              {/* Centered Standby Content Board */}
              <div className="relative z-20 max-w-2xl w-full text-center flex flex-col items-center px-4">
                
                {/* Official Branding Emblem */}
                <div className="flex items-center gap-3 mb-6 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-lg">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-inner">
                    <div className="w-5 h-5 border-2 border-[#173C2A] rounded-full"></div>
                  </div>
                  <div className="text-left">
                    <h1 className="text-xs font-extrabold text-white leading-tight tracking-wider">국립원예특작과학원</h1>
                    <p className="text-[7px] uppercase tracking-widest text-[#FFEBB0] font-bold">National Institute of Horticultural & Herbal Science</p>
                  </div>
                </div>

                {/* Slogan with majestic gold gradient typography */}
                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FFEBB0] to-[#C6A15B] tracking-tight leading-tight mb-4 drop-shadow-lg filter">
                  함께 채우는 원예특작의 미래
                </h2>

                <p className="text-white/80 text-sm md:text-base leading-relaxed mb-8 max-w-lg font-medium">
                  본 행사는 관람객 여러분의 스마트폰과 연계하여 진행되는<br />
                  <span className="text-[#FFEBB0] font-extrabold">실시간 참여형 비전 선포식</span>입니다. 잠시 후 시작됩니다.
                </p>

                {/* Live Participant count pill */}
                <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-[#91A98E]/30 rounded-2xl px-6 py-3 text-xs font-bold text-white shadow-xl">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6A15B] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C6A15B]"></span>
                  </span>
                  현재 대기실 입장 인원: <span className="font-black text-[#FFEBB0] text-sm ml-1">{state.activeUsers} 명</span>
                </div>

              </div>
            </motion.div>
          )}

          {/* 1.5. GRAND START TRANSITION BANNER (Fires at the start of running phase) */}
          {state.status === "running" && runElapsed < 1500 && (
            <motion.div
              key="grand-start-banner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              {/* Grand gold camera flash at start */}
              <div className="absolute inset-0 bg-[#FFFDF0] animate-gold-flash pointer-events-none" />

              <motion.div
                initial={{ scale: 0.3, opacity: 0, rotate: -3 }}
                animate={{ scale: [0.3, 1.25, 1], opacity: 1, rotate: 0 }}
                exit={{ scale: 2.2, opacity: 0, filter: "blur(15px)" }}
                transition={{ duration: 0.65, times: [0, 0.7, 1], ease: "easeOut" }}
                className="z-10 text-center"
              >
                <h1 className="text-8xl md:text-[150px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FFEBB0] to-[#C6A15B] tracking-wider leading-none drop-shadow-[0_15px_45px_rgba(23,60,42,0.95)] filter">
                  시작!
                </h1>
                <p className="text-[#C6A15B] text-xl md:text-3xl font-black tracking-[0.4em] mt-8 uppercase drop-shadow-[0_5px_15px_rgba(0,0,0,0.7)]">
                  미래 농업의 막이 오릅니다
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* 1.8. 10-SECOND FINAL COUNTDOWN GIANT SLAMMING OVERLAY */}
          {state.status === "running" && timeLeft <= 10 && timeLeft > 0 && (
            <motion.div
              key={`final-countdown-slam-${timeLeft}`}
              initial={{ scale: 4.0, opacity: 0, filter: "blur(8px)" }}
              animate={{ 
                scale: [4.0, 0.85, 1], 
                opacity: 1, 
                filter: "blur(0px)",
                transition: { 
                  duration: 0.45, 
                  times: [0, 0.75, 1],
                  ease: "easeOut" 
                } 
              }}
              exit={{ scale: 1.6, opacity: 0, filter: "blur(12px)", transition: { duration: 0.25 } }}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none text-center"
            >
              <div className="text-[320px] font-black select-none leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#FFF] via-[#FFEBC2] to-[#C6A15B] drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] filter font-mono tracking-tighter">
                {timeLeft}
              </div>
              <div className="bg-[#173C2A]/95 px-8 py-3.5 rounded-2xl border-2 border-[#C6A15B]/50 shadow-[0_15px_30px_rgba(0,0,0,0.7)] backdrop-blur-md animate-pulse -mt-4 pointer-events-auto">
                <p className="text-white text-lg md:text-xl font-black tracking-[0.15em] uppercase">
                  비전 완성 임박! <span className="text-[#FFEBB0]">속도를 높이세요!</span>
                </p>
              </div>
            </motion.div>
          )}

          {/* 2. CINEMATIC COUNTDOWN OVERLAY (Pre-Start countdown, using gentle animation for numbers) */}
          {state.status === "countdown" && (
            <motion.div
              key="screen-countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-center"
            >
              <motion.div
                key={`countdown-num-${countdownLeft}`}
                initial={{ scale: 0.4, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.5, opacity: 0, filter: "blur(10px)" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-[200px] font-black text-white leading-none tracking-tighter filter drop-shadow-[0_10px_20px_rgba(198,161,91,0.5)]"
              >
                {countdownLeft > 0 ? countdownLeft : "시작!"}
              </motion.div>
              <div className="bg-[#173C2A]/90 px-6 py-2.5 rounded-full border border-[#C6A15B]/40 shadow-xl mt-8">
                <p className="text-[#FFEBB0] text-sm md:text-base font-extrabold tracking-[0.25em] uppercase animate-pulse">
                  비전 선포 참여 개시
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Connection and state status monitor removed for a clean presentation */}

      </div>
    </div>
  );
}
