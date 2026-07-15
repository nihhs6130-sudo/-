import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useEventState } from "../hooks/useEventState";

const ADMIN_STAGES = [
  { id: 1, name: "1단계: 풍요로운 수확", range: "0% ~ 20%", desc: "배추, 토마토, 딸기, 사과 등 고품질 원예농산물 수확 전경", defaultUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=400&q=80" },
  { id: 2, name: "2단계: 노지 채소 시험포장", range: "20% ~ 40%", desc: "줄 맞춰 가꾸어진 노지 채소밭과 생육 토양 기반 전경", defaultUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=80" },
  { id: 3, name: "3단계: 첨단 스마트 유리온실", range: "40% ~ 60%", desc: "유리온실 프레임 및 전문 연구자 생육 품질 연구 전경", defaultUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=400&q=80" },
  { id: 4, name: "4단계: IoT 정밀 모니터링", range: "60% ~ 80%", desc: "스마트 센서 및 자율주행 소형 농업로봇 정보망 연계", defaultUrl: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=400&q=80" },
  { id: 5, name: "5단계: 원격 모니터링 및 드론", range: "80% ~ 100%", desc: "하늘에서 과수원 전체를 원격 분석하는 자율 드론 전경", defaultUrl: "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=400&q=80" },
  { id: 6, name: "6단계: 비전 선포 완료 (엠블럼)", range: "100%", desc: "풍요롭고 건강한 미래 엠블럼 및 6단계 최종 텍스트 이미지", defaultUrl: "https://images.unsplash.com/photo-1464226184884-fa280b87c3aa?auto=format&fit=crop&w=400&q=80" }
];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");

  // Retrieve states
  const { state, connected, refetch } = useEventState("admin_console");

  // Custom uploaded images state
  const [customImages, setCustomImages] = useState<Record<number, string>>({});
  const [uploadingStageId, setUploadingStageId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [dragOverStageId, setDragOverStageId] = useState<number | null>(null);

  // Standby background image state
  const [standbyImage, setStandbyImage] = useState<string>("");
  const [isUploadingStandby, setIsUploadingStandby] = useState<boolean>(false);

  const fetchCustomImages = async () => {
    try {
      const res = await fetch("/api/custom-images");
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          setCustomImages(data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStandbyImage = async () => {
    try {
      const res = await fetch("/api/standby-image");
      if (res.ok) {
        const data = await res.json();
        setStandbyImage(data.standbyImage || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomImages();
    fetchStandbyImage();
  }, [state.customImagesVersion, state.standbyImageVersion]);

  const handleStandbyImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError("15MB 이하의 이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setIsUploadingStandby(true);
    setUploadError("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      if (!base64Data) {
        setUploadError("파일을 읽는 데 실패했습니다.");
        setIsUploadingStandby(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/upload-standby-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data,
            password: "1111"
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "업로드 실패");
        }

        fetchStandbyImage();
      } catch (err: any) {
        setUploadError(err.message || "대기화면 이미지 전송 중 오류가 발생했습니다.");
      } finally {
        setIsUploadingStandby(false);
      }
    };

    reader.onerror = () => {
      setUploadError("대기화면 파일 읽기 중에 오류가 발생했습니다.");
      setIsUploadingStandby(false);
    };

    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (stageId: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError("15MB 이하의 이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setUploadingStageId(stageId);
    setUploadError("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      if (!base64Data) {
        setUploadError("파일을 읽는 데 실패했습니다.");
        setUploadingStageId(null);
        return;
      }

      try {
        const res = await fetch("/api/admin/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId,
            base64Data,
            password: "1111"
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "업로드 실패");
        }

        fetchCustomImages();
      } catch (err: any) {
        setUploadError(err.message || "이미지 전송 중 오류가 발생했습니다.");
      } finally {
        setUploadingStageId(null);
      }
    };

    reader.onerror = () => {
      setUploadError("파일 읽기 중에 오류가 발생했습니다.");
      setUploadingStageId(null);
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStageId(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    setDragOverStageId(null);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageUpload(stageId, files[0]);
    }
  };

  // Local settings form state
  const [targetClicks, setTargetClicks] = useState(1000);
  const [duration, setDuration] = useState(30);
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [virtualRate, setVirtualRate] = useState(25); // clicks per second

  const [saving, setSaving] = useState(false);
  const [adminError, setAdminError] = useState("");
  
  // Modals for confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);

  // Time left and countdown calculators
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [countdownLeft, setCountdownLeft] = useState<number>(3);

  useEffect(() => {
    // Check if password was cached
    const cached = sessionStorage.getItem("admin_authorized");
    if (cached === "true") {
      setIsAuthorized(true);
    }
  }, []);

  // Sync settings form with server state when waiting
  useEffect(() => {
    if (state.status === "waiting") {
      setTargetClicks(state.targetClicks);
      setDuration(state.duration);
      setCountdownDuration(state.countdownDuration);
    }
  }, [state.status, state.targetClicks, state.duration, state.countdownDuration]);

  const [clockOffset, setClockOffset] = useState<number>(0);

  // Sync clock offset when serverState updates to eliminate client-server clock skew
  useEffect(() => {
    if (state && state.serverTime) {
      setClockOffset(state.serverTime - Date.now());
    }
  }, [state.serverTime]);

  // Sync local timer ticks
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

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "1111") {
      setIsAuthorized(true);
      sessionStorage.setItem("admin_authorized", "true");
      setAuthError("");
    } else {
      setAuthError("비밀번호가 일치하지 않습니다. (초기 비밀번호: 1111)");
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthorized(false);
    sessionStorage.removeItem("admin_authorized");
    setPassword("");
  };

  // Remote administrative action trigger
  const sendAdminCommand = async (action: string, payload: any = {}) => {
    try {
      setAdminError("");
      const res = await fetch("/api/admin/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          password: "1111", // Authorized password
          ...payload
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html") || res.url.includes("__cookie_check") || res.url.includes("login")) {
        throw new Error("비공개 개발용 URL(ais-dev)은 모바일 또는 다른 기기에서 연동할 수 없습니다. 상단의 '공유(Share)' 버튼을 눌러 발급된 Public Shared App URL(ais-pre)을 새 탭에서 열어 관리해 주세요!");
      }

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const data = await res.json();
          throw new Error(data.error || "명령 실행 실패");
        } else {
          throw new Error("HTTP 오류 " + res.status);
        }
      }
      
      await refetch();
    } catch (err: any) {
      setAdminError(err.message || "작업에 실패했습니다.");
    }
  };

  // Save Settings handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.status !== "waiting") {
      setAdminError("행사가 대기 상태일 때만 설정을 변경할 수 있습니다.");
      return;
    }

    setSaving(true);
    await sendAdminCommand("updateSettings", {
      settings: {
        targetClicks,
        duration,
        countdownDuration
      }
    });
    setSaving(false);
  };

  if (!isAuthorized) {
    return (
      <div id="admin-shield" className="min-h-screen bg-[#0F2F23] flex items-center justify-center p-6 font-sans text-white select-none">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-[#C6A15B]/30 text-[#26312C]"
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-[#173C2A] flex items-center justify-center text-white text-lg font-bold mx-auto mb-3">원</div>
            <h2 className="text-lg font-black text-[#173C2A]">행사 운영 관리시스템</h2>
            <p className="text-[11px] text-[#26312C]/65 mt-1">원예특작 비전 선포 제어 콘솔에 접근하려면 비밀번호를 입력하십시오.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#173C2A] mb-1.5">운영자 비밀번호</label>
              <input
                id="admin-password-input"
                type="password"
                placeholder="••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full text-center tracking-widest text-lg font-bold bg-[#F7F5EF] border border-[#91A98E]/30 rounded-xl px-4 py-2.5 text-[#173C2A] focus:outline-none focus:border-[#173C2A] transition-colors"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-red-500 text-[11px] font-semibold text-center">{authError}</p>
            )}

            <button
              id="admin-login-button"
              type="submit"
              className="w-full bg-[#173C2A] text-white py-3 rounded-xl font-bold text-sm cursor-pointer hover:bg-[#0F2F23] transition-colors shadow-md border border-[#C6A15B]/25"
            >
              시스템 관리 접근
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="admin-page-root" className="min-h-screen bg-[#F7F5EF] p-6 font-sans text-[#26312C] max-w-4xl mx-auto flex flex-col gap-6 relative">
      
      {/* HEADER BAR */}
      <header className="bg-white border border-[#91A98E]/20 px-6 py-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#173C2A] rounded-lg flex items-center justify-center shrink-0">
            <div className="w-6 h-6 border-2 border-[#C6A15B] rounded-full"></div>
          </div>
          <div className="text-left">
            <h1 className="text-base font-bold text-[#173C2A] leading-tight">국립원예특작과학원 비전 선포</h1>
            <p className="text-[9px] uppercase tracking-widest text-[#91A98E] font-bold">National Institute of Horticultural & Herbal Science</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Server Connection Indicator */}
          <div className="flex items-center gap-1.5 bg-[#F7F5EF] px-3 py-1.5 rounded-full border border-[#91A98E]/25 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="font-bold text-[10px] text-[#173C2A]">
              {connected ? 'RUNNING' : 'CONNECTING'}
            </span>
          </div>
          
          <button
            onClick={handleLogout}
            className="text-xs bg-red-50/70 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-colors"
          >
            접근 해제
          </button>
        </div>
      </header>

      {adminError && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 text-xs font-semibold">
          ⚠️ {adminError}
        </div>
      )}

      {/* TELEMETRY GRID */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Status */}
        <div className="bg-[#173C2A] text-white p-4 rounded-xl shadow-sm border border-[#C6A15B]/30 flex flex-col justify-between min-h-[90px]">
          <span className="text-[10px] font-bold text-[#91A98E] uppercase tracking-wider">행사 진행 상태</span>
          <p id="admin-event-status" className="text-lg font-black mt-2 text-[#C6A15B]">
            {state.status === "waiting" && "● 대기 중 (Waiting)"}
            {state.status === "countdown" && `⏱️ 카운트다운 (${countdownLeft}s)`}
            {state.status === "running" && `⚡ 진행 중 (${timeLeft}s)`}
            {state.status === "finished" && "🏆 완료 (Finished)"}
          </p>
        </div>

        {/* Active Users */}
        <div className="bg-white border border-[#91A98E]/20 p-4 rounded-xl shadow-sm flex flex-col justify-between min-h-[90px]">
          <span className="text-[10px] font-bold text-[#26312C]/60 uppercase tracking-wider">현재 실시간 접속자</span>
          <p id="admin-active-users" className="text-2xl font-black mt-2 text-[#173C2A]">{state.activeUsers} <span className="text-xs font-normal text-[#26312C]/60">명</span></p>
        </div>

        {/* Clicks */}
        <div className="bg-white border border-[#91A98E]/20 p-4 rounded-xl shadow-sm flex flex-col justify-between min-h-[90px]">
          <span className="text-[10px] font-bold text-[#26312C]/60 uppercase tracking-wider">누적 원자적 클릭수</span>
          <p id="admin-total-clicks" className="text-2xl font-black mt-2 text-[#173C2A]">{state.totalClicks} <span className="text-xs font-normal text-[#26312C]/60">/ {state.targetClicks} 회</span></p>
        </div>

        {/* Progresses */}
        <div className="bg-white border border-[#91A98E]/20 p-4 rounded-xl shadow-sm flex flex-col justify-between min-h-[90px]">
          <span className="text-[10px] font-bold text-[#26312C]/60 uppercase tracking-wider">실제 vs LED 진행도</span>
          <p id="admin-progress-comparison" className="text-lg font-black mt-2 text-[#173C2A]">
            {Math.round(state.actualProgress * 100)}% <span className="text-xs font-normal text-[#26312C]/40">vs</span> <span className="text-[#C6A15B]">{Math.round(state.screenProgress * 100)}%</span>
          </p>
        </div>

      </section>

      {/* CORE CONTROL AND SETTINGS FLEX GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. OPERATIONS PANEL (왼쪽 2칸) */}
        <section className="md:col-span-2 bg-white border border-[#91A98E]/20 p-5 rounded-2xl shadow-sm flex flex-col gap-6">
          <div className="border-b border-[#91A98E]/10 pb-3 flex justify-between items-center">
            <h2 className="text-sm font-black text-[#173C2A] flex items-center gap-1.5">
              <span>⚙️ 실시간 행사 운영 제어</span>
            </h2>
            <span className="text-[10px] font-bold text-[#C6A15B]">운영 명령 즉시 송출</span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Prepare */}
            <button
              onClick={() => sendAdminCommand("prepare")}
              disabled={state.status !== "finished" && state.status !== "waiting"}
              className="bg-[#26312C] text-white font-bold py-3 px-4 rounded-xl text-xs hover:bg-[#173C2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex flex-col items-center gap-1"
            >
              <span className="text-base">📋</span>
              <span>1단계: 행사 대기 준비</span>
            </button>

            {/* Start Countdown */}
            <button
              onClick={() => sendAdminCommand("startCountdown")}
              disabled={state.status !== "waiting"}
              className="bg-[#173C2A] text-white font-bold py-3 px-4 rounded-xl text-xs hover:bg-[#0F2F23] transition-colors border-2 border-[#C6A15B]/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex flex-col items-center gap-1"
            >
              <span className="text-base">⏱️</span>
              <span>2단계: 카운트다운 시작</span>
            </button>

            {/* Force 100% finished */}
            <button
              onClick={() => setShowForceConfirm(true)}
              disabled={state.status !== "running"}
              className="bg-amber-600 text-white font-bold py-3 px-4 rounded-xl text-xs hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex flex-col items-center gap-1"
            >
              <span className="text-base">✨</span>
              <span>비상: 강제 100% 완성</span>
            </button>

            {/* Complete Reset */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="bg-red-50 text-red-700 border border-red-200 font-bold py-3 px-4 rounded-xl text-xs hover:bg-red-100 transition-colors cursor-pointer flex flex-col items-center gap-1"
            >
              <span className="text-base">🔄</span>
              <span>비상: 전체 초기화 (Reset)</span>
            </button>
          </div>

          {/* VIRTUAL REHEARSAL INJECTOR */}
          <div className="bg-[#F7F5EF] border border-[#91A98E]/30 p-4 rounded-xl">
            <h3 className="text-xs font-black text-[#173C2A] mb-3 flex items-center gap-1.5">
              <span>🌾 리허설 및 테스트용 가상 클릭 도구</span>
              <span className="text-[9px] font-normal text-[#26312C]/65">(행사 리허설 시 클릭 수 부족 보완)</span>
            </h3>

            <div className="flex flex-wrap items-center gap-4">
              {/* Toggle Virtual Click Generator */}
              <button
                onClick={() => sendAdminCommand("toggleVirtual", { virtualRate })}
                disabled={state.status !== "running"}
                className={`py-2 px-4 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                  state.isVirtualEnabled
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-[#173C2A] text-white hover:bg-[#0F2F23] disabled:opacity-45"
                }`}
              >
                {state.isVirtualEnabled ? "가상 클릭기 끄기 (OFF)" : "가상 클릭기 켜기 (ON)"}
              </button>

              {/* Set Rate */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#26312C]/60">속도:</span>
                <select
                  value={virtualRate}
                  onChange={e => {
                    const rate = Number(e.target.value);
                    setVirtualRate(rate);
                    if (state.isVirtualEnabled) {
                      sendAdminCommand("toggleVirtual", { virtualRate: rate });
                    }
                  }}
                  disabled={state.status !== "running" && state.status !== "waiting"}
                  className="bg-white border border-[#91A98E]/30 rounded px-2 py-1 text-xs font-bold text-[#173C2A]"
                >
                  <option value={10}>10 Clicks/s</option>
                  <option value={25}>25 Clicks/s</option>
                  <option value={50}>50 Clicks/s</option>
                  <option value={100}>100 Clicks/s</option>
                </select>
              </div>

              {/* Add instant massive clicks */}
              <div className="flex gap-1">
                <button
                  onClick={() => sendAdminCommand("addClicks", { count: 100 })}
                  disabled={state.status !== "running"}
                  className="bg-white border border-[#91A98E]/35 text-[#173C2A] px-2.5 py-1.5 rounded text-[11px] font-bold hover:bg-[#91A98E]/10 disabled:opacity-40"
                >
                  +100 클릭
                </button>
                <button
                  onClick={() => sendAdminCommand("addClicks", { count: 500 })}
                  disabled={state.status !== "running"}
                  className="bg-white border border-[#91A98E]/35 text-[#173C2A] px-2.5 py-1.5 rounded text-[11px] font-bold hover:bg-[#91A98E]/10 disabled:opacity-40"
                >
                  +500 클릭
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. CONFIGURATION PANEL (오른쪽 1칸) */}
        <section className="bg-white border border-[#91A98E]/20 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
          <div className="border-b border-[#91A98E]/10 pb-3">
            <h2 className="text-sm font-black text-[#173C2A]">📋 기본 설정 구성</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#26312C]/60 mb-1">목표 누적 클릭수 (목표치)</label>
              <input
                id="target-clicks-settings-input"
                type="number"
                value={targetClicks}
                onChange={e => setTargetClicks(Math.max(10, Number(e.target.value)))}
                disabled={state.status !== "waiting"}
                className="w-full bg-[#F7F5EF] border border-[#91A98E]/30 rounded-xl px-3.5 py-2 text-xs font-bold text-[#173C2A] focus:outline-none focus:border-[#173C2A] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#26312C]/60 mb-1">비전 선포 시간 (초)</label>
              <input
                id="duration-settings-input"
                type="number"
                value={duration}
                onChange={e => setDuration(Math.max(5, Number(e.target.value)))}
                disabled={state.status !== "waiting"}
                className="w-full bg-[#F7F5EF] border border-[#91A98E]/30 rounded-xl px-3.5 py-2 text-xs font-bold text-[#173C2A] focus:outline-none focus:border-[#173C2A] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#26312C]/60 mb-1">시작 전 카운트다운 (초)</label>
              <input
                id="countdown-settings-input"
                type="number"
                value={countdownDuration}
                onChange={e => setCountdownDuration(Math.max(1, Number(e.target.value)))}
                disabled={state.status !== "waiting"}
                className="w-full bg-[#F7F5EF] border border-[#91A98E]/30 rounded-xl px-3.5 py-2 text-xs font-bold text-[#173C2A] focus:outline-none focus:border-[#173C2A] disabled:opacity-50"
              />
            </div>

            <button
              id="save-settings-button"
              type="submit"
              disabled={state.status !== "waiting" || saving}
              className="w-full bg-[#173C2A] text-white py-3 rounded-xl font-bold text-xs cursor-pointer hover:bg-[#0F2F23] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "설정 저장 중..." : "설정 데이터 저장"}
            </button>
            
            {state.status !== "waiting" && (
              <p className="text-[10px] text-amber-600 font-semibold text-center mt-1">
                ※ 행사가 진행 중일 때는 설정을 잠금 처리합니다.
              </p>
            )}
          </form>
        </section>

      </div>

      {/* 2.5. MAIN SCREEN STANDBY IMAGE SECTION */}
      <section className="bg-white border border-[#91A98E]/20 p-5 rounded-2xl shadow-sm flex flex-col gap-4 mt-2">
        <div className="border-b border-[#91A98E]/10 pb-3 text-left">
          <h2 className="text-sm font-black text-[#173C2A] flex items-center gap-1.5">
            <span>🖥️ 메인 대기 화면(Standby) 배경 이미지 설정</span>
          </h2>
          <p className="text-[11px] text-[#26312C]/65 mt-0.5">
            메인 송출 스크린(/screen) 입장 시, 카운트다운 시작 전에 표출될 대기 배경 이미지를 업로드합니다. 
            이미지를 업로드하면 기존의 심플한 배경 대신 해당 이미지가 메인 송출 화면을 꽉 채우게 됩니다. (권장 비율: 16:9 와이드)
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Live Preview Container */}
          <div className="w-full md:w-80 shrink-0">
            <p className="text-[10px] font-bold text-gray-400 mb-1.5 text-left uppercase tracking-wider">송출 화면 대기 상태 미리보기</p>
            <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center group shadow-inner">
              {standbyImage ? (
                <>
                  <img
                    src={standbyImage}
                    alt="Standby Custom Background"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {/* Miniature mockup of QR code card overlay to show how it fits */}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-3">
                    <div className="bg-white/95 scale-75 rounded-lg p-2 border border-[#C6A15B] shadow-lg flex items-center gap-2 max-w-[180px] pointer-events-none select-none">
                      <div className="w-8 h-8 bg-[#173C2A]/10 rounded flex items-center justify-center text-[10px] font-bold text-[#173C2A]">QR</div>
                      <div className="text-[7px] text-left leading-tight text-gray-700">
                        <p className="font-extrabold text-[#173C2A]">실시간 참여형 이벤트</p>
                        <p className="text-[5px] text-gray-400">대기실 인원 표출</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <span className="text-2xl block mb-1">🖼️</span>
                  <p className="text-[10px] text-gray-400 font-bold">기본 테마 배경 적용 중</p>
                  <p className="text-[9px] text-gray-300 mt-0.5">업로드 시 맞춤 배경이 적용됩니다.</p>
                </div>
              )}

              {isUploadingStandby && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 z-10">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] text-white font-bold">이미지 인코딩 중...</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex-1 flex flex-col gap-3 justify-center text-left h-full md:pt-4">
            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                id="standby-image-input"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleStandbyImageUpload(files[0]);
                  }
                }}
              />
              <button
                onClick={() => document.getElementById("standby-image-input")?.click()}
                disabled={isUploadingStandby}
                className="bg-[#173C2A] hover:bg-[#0F2F23] text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                <span>📥 대기 배경 이미지 업로드</span>
              </button>

              {standbyImage && (
                <button
                  onClick={async () => {
                    if (window.confirm("대기화면 배경 이미지를 지우고 기본 배경으로 복원하시겠습니까?")) {
                      try {
                        const res = await fetch("/api/admin/reset-standby-image", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ password: "1111" })
                        });
                        if (!res.ok) throw new Error("초기화 실패");
                        fetchStandbyImage();
                      } catch (err: any) {
                        setUploadError(err.message || "이미지 복원 실패");
                      }
                    }
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  기본 테마 복원
                </button>
              )}
            </div>

            <ul className="text-[10px] text-gray-500 space-y-1 bg-gray-50 rounded-xl p-3 border border-gray-100 max-w-xl">
              <li>• 행사 전 대기 화면에 맞춤형 키비주얼, 로고, 혹은 슬로건 포스터 등을 배경으로 노출할 수 있습니다.</li>
              <li>• 이미지를 등록하면 관객 대기실 큐알 코드 박스 뒤편에 고화질 배경으로 실시간 적용됩니다.</li>
              <li>• 업로드 가능한 최대 용량은 15MB이며, 모든 모던 브라우저용 이미지 포맷을 지원합니다.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. BACKGROUND IMAGE FILE MANAGEMENT SECTION */}
      <section className="bg-white border border-[#91A98E]/20 p-5 rounded-2xl shadow-sm flex flex-col gap-5 mt-2">
        <div className="border-b border-[#91A98E]/10 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-left">
            <h2 className="text-sm font-black text-[#173C2A] flex items-center gap-1.5">
              <span>🖼️ 무대 비전 선포 배경 이미지 관리</span>
            </h2>
            <p className="text-[11px] text-[#26312C]/65 mt-0.5">
              관객 클릭 진행률에 따라 무대 대형 LED 화면에 순서대로 공개되는 1~6단계의 배경 이미지 파일을 관리합니다.
            </p>
          </div>
          <button
            onClick={async () => {
              if (window.confirm("모든 단계를 기본 제공 이미지로 복원하시겠습니까?")) {
                try {
                  const res = await fetch("/api/admin/reset-images", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password: "1111" })
                  });
                  if (!res.ok) throw new Error("초기화 실패");
                  fetchCustomImages();
                } catch (err: any) {
                  setUploadError(err.message || "이미지 초기화 중 오류가 발생했습니다.");
                }
              }
            }}
            className="text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg shrink-0 transition-colors"
          >
            🔄 전체 이미지 기본값 복원
          </button>
        </div>

        {uploadError && (
          <div className="bg-red-50 text-red-600 border border-red-200 text-xs px-4 py-2.5 rounded-xl font-medium text-left">
            ⚠️ {uploadError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ADMIN_STAGES.map((stage) => {
            const hasCustom = !!customImages[stage.id];
            const currentImgUrl = customImages[stage.id] || stage.defaultUrl;
            const isUploading = uploadingStageId === stage.id;
            const isDragging = dragOverStageId === stage.id;

            return (
              <div
                key={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`relative flex flex-col justify-between border-2 rounded-2xl p-3.5 transition-all duration-300 ${
                  isDragging
                    ? "border-[#173C2A] bg-[#173C2A]/5 scale-[1.01]"
                    : "border-gray-100 bg-gray-50/50 hover:border-[#91A98E]/30"
                }`}
              >
                {/* Thumbnail Preview */}
                <div className="relative aspect-[16/10] bg-gray-100 rounded-xl overflow-hidden border border-black/5 mb-3 select-none group">
                  <img
                    src={currentImgUrl}
                    alt={stage.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Badge showing if it's custom or default */}
                  <span className={`absolute top-2 left-2 text-[8px] font-bold px-2 py-0.5 rounded-full select-none ${
                    hasCustom
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-700/80 text-white/90"
                  }`}>
                    {hasCustom ? "커스텀 업로드됨" : "기본 이미지"}
                  </span>

                  {/* Range badge */}
                  <span className="absolute top-2 right-2 text-[8px] font-mono font-bold bg-[#173C2A]/80 text-[#C6A15B] px-2 py-0.5 rounded-full">
                    {stage.range}
                  </span>

                  {/* Uploading Spinner Overlay */}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-white font-bold">인코딩 및 전송 중...</span>
                    </div>
                  )}

                  {/* Drag drop help overlay */}
                  <div className="absolute inset-0 bg-[#173C2A]/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-300 cursor-pointer pointer-events-none">
                    <span className="text-xl">📥</span>
                    <span className="text-[10px] text-white font-extrabold mt-1">파일 드롭 또는 클릭하여 업로드</span>
                  </div>
                </div>

                {/* Stage Info */}
                <div className="text-left mb-3">
                  <h3 className="text-xs font-extrabold text-[#173C2A] flex justify-between items-center">
                    <span>{stage.name}</span>
                  </h3>
                  <p className="text-[10px] text-gray-500 leading-normal mt-1 min-h-[30px] break-keep text-left">
                    {stage.desc}
                  </p>
                </div>

                {/* Interactive upload triggers */}
                <div className="flex gap-1.5 mt-auto pt-2 border-t border-gray-100">
                  {/* Invisible file input */}
                  <input
                    type="file"
                    id={`file-input-${stage.id}`}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleImageUpload(stage.id, files[0]);
                      }
                    }}
                  />

                  {/* Upload button */}
                  <button
                    onClick={() => document.getElementById(`file-input-${stage.id}`)?.click()}
                    className="flex-1 bg-[#173C2A] text-white text-[10px] font-extrabold py-2 px-3 rounded-lg hover:bg-[#0F2F23] transition-colors cursor-pointer text-center"
                  >
                    📂 이미지 업로드
                  </button>

                  {/* Individual Reset */}
                  {hasCustom && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/admin/upload-image", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              stageId: stage.id,
                              base64Data: "", // Empty to clear custom
                              password: "1111"
                            })
                          });
                          if (!res.ok) throw new Error("초기화 실패");
                          fetchCustomImages();
                        } catch (err: any) {
                          setUploadError(err.message || "이미지 초기화 중 실패했습니다.");
                        }
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold py-2 px-2.5 rounded-lg transition-colors cursor-pointer"
                      title="기본 이미지로 복원"
                    >
                      기본값 복원
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* OPERATING GUIDE */}
      <footer className="bg-white border border-[#91A98E]/20 p-5 rounded-2xl shadow-sm text-left text-xs space-y-2">
        <h4 className="font-bold text-[#173C2A] mb-1">📢 행사 담당자를 위한 무대 진행 시나리오</h4>
        <ul className="list-decimal pl-4 space-y-1 text-[#26312C]/80 font-medium">
          <li>행사 시작 전, <strong>목표 클릭수</strong> 및 <strong>비전 선포 시간</strong>을 설정하고 <span className="text-[#173C2A] font-bold">[설정 데이터 저장]</span>을 누릅니다.</li>
          <li>LED 전체 화면(<a href="/screen" target="_blank" className="text-[#173C2A] font-bold underline">/screen</a>)을 무대 대형 전광판에 송출합니다. (대기실 QR 자동 노출)</li>
          <li>안내 아나운서의 안내 멘트에 따라 관객들이 QR 코드를 찍고 모바일 화면(<a href="/join" target="_blank" className="text-[#173C2A] font-bold underline">/join</a>)에 진입하게 합니다.</li>
          <li>시작 멘트 시 관리자가 본 콘솔에서 <span className="text-[#173C2A] font-bold">[카운트다운 시작]</span>을 클릭합니다.</li>
          <li>자동으로 3초 동시 카운트다운 후 30초 동안 버튼 클릭과 스크린 채우기 쇼가 역동적으로 진행됩니다.</li>
          <li>만약 클릭이 저조한 리허설 상황에서는 <span className="text-[#173C2A] font-bold">[가상 클릭기 켜기]</span>를 통해 스크린을 가득 채울 수 있습니다.</li>
        </ul>
      </footer>

      {/* FOOLPROOF MODAL CONFIRMATIONS */}
      <AnimatePresence>
        
        {/* 1. RESET WARNING */}
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6"
          >
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-500 text-center">
              <span className="text-3xl block mb-2">🚨</span>
              <h3 className="text-lg font-black text-red-700 mb-1">정말 전체 초기화하시겠습니까?</h3>
              <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                현재 접속 정보, 누적 클릭 수, 이미지 빌드 상태가 완전히 초기화되며 대기(Waiting) 상태로 되돌아갑니다. 행사 진행 중에는 치명적일 수 있습니다.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    sendAdminCommand("reset");
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 cursor-pointer"
                >
                  초기화 진행
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-200 cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* 2. FORCE COMPLETE WARNING */}
        {showForceConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6"
          >
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-amber-500 text-center">
              <span className="text-3xl block mb-2">⚡</span>
              <h3 className="text-lg font-black text-amber-700 mb-1">강제 비전 완성 명령 송출</h3>
              <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                사용자 참여 여부와 관계없이 스크린을 100% 가득 채우고 비전 선포 슬로건을 즉시 화면 중앙에 띄웁니다. 실제 무대 시간 조율에 필요한 비상 조치 기능입니다.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    sendAdminCommand("forceFinish");
                    setShowForceConfirm(false);
                  }}
                  className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-amber-700 cursor-pointer"
                >
                  비전 강제 완성
                </button>
                <button
                  onClick={() => setShowForceConfirm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-200 cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
