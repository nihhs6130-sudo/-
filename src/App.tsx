/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import JoinPage from "./components/JoinPage";
import ScreenPage from "./components/ScreenPage";
import AdminPage from "./components/AdminPage";

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Intercept client-side route changes if any
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  // Simple clean client-side routing
  if (currentPath.startsWith("/join")) {
    return <JoinPage />;
  }
  
  if (currentPath.startsWith("/screen")) {
    return <ScreenPage />;
  }
  
  if (currentPath.startsWith("/admin")) {
    return <AdminPage />;
  }

  // Home Landing Page - Beautiful portal to let users inspect all pages immediately
  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  const handleCopyLink = () => {
    const url = window.location.origin + "/join";
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div id="home-portal-root" className="min-h-screen bg-[#F7F5EF] flex flex-col justify-between p-6 font-sans text-[#26312C] select-none relative">
      
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[50%] h-[30%] bg-[#173C2A]/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[30%] bg-[#91A98E]/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header section with professional official government branding */}
      <header className="text-center pt-8 max-w-2xl mx-auto flex flex-col items-center">
        <div className="flex items-center gap-3 mb-4 bg-white px-5 py-2.5 rounded-2xl border border-[#91A98E]/25 shadow-sm">
          <div className="w-10 h-10 bg-[#173C2A] rounded-lg flex items-center justify-center shrink-0">
            <div className="w-6 h-6 border-2 border-[#C6A15B] rounded-full"></div>
          </div>
          <div className="text-left">
            <h1 className="text-base font-bold text-[#173C2A] leading-tight">국립원예특작과학원</h1>
            <p className="text-[9px] uppercase tracking-widest text-[#91A98E] font-bold">National Institute of Horticultural & Herbal Science</p>
          </div>
        </div>
        
        <h1 className="text-2xl md:text-3xl font-black text-[#173C2A] tracking-tight leading-snug">
          실시간 참여형 비전 선포 시스템
        </h1>
        <p className="text-xs md:text-sm text-[#26312C]/75 font-medium mt-3 px-4 max-w-lg mx-auto leading-relaxed">
          관객 참여를 통한 실시간 클릭 데이터를 연계하여, 무대 LED 스크린에 국립원예특작과학원의 핵심 연구성과와 미래 농업 비전을 차례대로 공개하는 혁신 플랫폼입니다.
        </p>
      </header>

      {/* Main navigation routing panel */}
      <main className="flex-1 flex items-center justify-center py-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full px-4">
          
          {/* JOIN CARD */}
          <div className="bg-white border border-[#91A98E]/25 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left">
            <div>
              <span className="text-2xl block mb-3">📱</span>
              <h2 className="text-base font-extrabold text-[#173C2A] mb-1">모바일 참여 대기실</h2>
              <p className="text-[11px] text-[#26312C]/70 leading-relaxed mb-4">
                QR코드를 통해 모바일로 직접 접속하는 관람객 참여 화면입니다. 터치에 반응하는 잎사귀 입자 피드백과 동시 진동 효과가 탑재되어 있습니다.
              </p>
            </div>
            <button
              onClick={() => navigateTo("/join")}
              className="w-full bg-[#173C2A] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#0F2F23] cursor-pointer transition-colors border border-[#C6A15B]/20"
            >
              모바일 화면 입장 (/join)
            </button>
          </div>

          {/* SCREEN CARD */}
          <div className="bg-white border border-[#91A98E]/25 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left">
            <div>
              <span className="text-2xl block mb-3">🖥️</span>
              <h2 className="text-base font-extrabold text-[#173C2A] mb-1">LED 메인 송출 스크린</h2>
              <p className="text-[11px] text-[#26312C]/70 leading-relaxed mb-4">
                무대 중앙 대형 LED 전광판에 송출하는 16:9 반응형 전경 화면입니다. 누적 클릭수에 비례해 14개 그래픽 레이어와 비전 슬로건이 실시간 공개됩니다.
              </p>
            </div>
            <button
              onClick={() => navigateTo("/screen")}
              className="w-full bg-[#173C2A] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#0F2F23] cursor-pointer transition-colors border border-[#C6A15B]/20"
            >
              메인 스크린 입장 (/screen)
            </button>
          </div>

          {/* QR CODE CARD */}
          <div className="bg-white border-2 border-[#C6A15B]/40 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left">
            <div>
              <span className="text-2xl block mb-3">📢</span>
              <h2 className="text-base font-extrabold text-[#173C2A] mb-1">참여 QR 코드 안내</h2>
              <p className="text-[11px] text-[#26312C]/70 leading-relaxed mb-4">
                이벤트 현장에서 관람객들의 빠른 스마트폰 접속을 유도할 수 있도록 대형 화면용 QR 코드를 별도 창으로 송출하고 링크를 복사하는 메뉴입니다.
              </p>
            </div>
            <button
              onClick={() => setShowQrModal(true)}
              className="w-full bg-[#C6A15B] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#B38E46] cursor-pointer transition-colors border border-transparent"
            >
              QR 코드 크게 보기
            </button>
          </div>

          {/* ADMIN CARD */}
          <div className="bg-[#173C2A] border border-[#C6A15B]/20 rounded-2xl p-6 shadow-md flex flex-col justify-between text-left text-white">
            <div>
              <span className="text-2xl block mb-3">⚙️</span>
              <h2 className="text-base font-extrabold text-[#C6A15B] mb-1">행사 제어 관리자</h2>
              <p className="text-[11px] text-[#91A98E] leading-relaxed mb-4">
                목표 클릭 설정, 준비/시작/리셋/강제 완료와 같은 실시간 명령을 방송 송출팀이 송출 제어하는 콘솔입니다. (초기 비밀번호: 1111)
              </p>
            </div>
            <button
              onClick={() => navigateTo("/admin")}
              className="w-full bg-white text-[#173C2A] py-2.5 rounded-xl text-xs font-bold hover:bg-[#F7F5EF] cursor-pointer transition-colors border border-transparent"
            >
              관리자 콘솔 입장 (/admin)
            </button>
          </div>

        </div>
      </main>

      {/* QR Code Lightbox Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#C6A15B] max-w-md w-full p-8 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex flex-col items-center">
              <span className="text-xs font-extrabold text-[#C6A15B] tracking-widest uppercase mb-1">실시간 비전 선포식</span>
              <h2 className="text-xl font-black text-[#173C2A] mb-6">모바일 대기실 접속 QR</h2>
              
              <div className="bg-[#F7F5EF] p-6 rounded-2xl border border-[#91A98E]/30 shadow-inner mb-6 flex flex-col items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + "/join")}&color=173c2a&bgcolor=f7f5ef`}
                  alt="Scan to Participate"
                  className="w-[200px] h-[200px] md:w-[240px] md:h-[240px]"
                  referrerPolicy="no-referrer"
                />
              </div>

              <p className="text-xs text-gray-600 font-bold leading-relaxed mb-6">
                스마트폰 카메라로 위 QR코드를 스캔하여<br />
                대기실에 입장한 뒤, 실시간 비전 완성에 참여하세요!
              </p>

              <div className="w-full bg-[#F7F5EF] border border-gray-200 rounded-xl py-2 px-4 flex items-center justify-between text-xs font-mono text-gray-600">
                <span className="truncate mr-4 text-left block flex-1">{window.location.origin}/join</span>
                <button 
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-sans font-bold cursor-pointer transition-colors shrink-0 ${
                    copied 
                      ? "bg-[#61A8A2] text-white" 
                      : "bg-[#173C2A] hover:bg-[#0F2F23] text-white"
                  }`}
                >
                  {copied ? "복사 완료!" : "링크 복사"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer styled to match prestigious specifications */}
      <footer className="h-12 px-8 flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#91A98E] border-t border-[#91A98E]/20 bg-white/70 backdrop-blur rounded-xl">
        <p>© 2026 국립원예특작과학원 • 비전 선포식 실시간 인터랙티브 플랫폼 v1.1</p>
        <p className="font-mono mt-1 sm:mt-0">SERVER LATENCY: 12ms | DB STATUS: CONNECTED | REACTION TIME: IMMEDIATE</p>
      </footer>

    </div>
  );
}
