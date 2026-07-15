import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface VisionSceneProps {
  progress: number; // 0 to 1.0 (screen progress)
  status: string;   // "waiting" | "countdown" | "running" | "finished"
  timeLeft: number; // seconds left on the running timer
  runStartedAt: number | null;
  duration: number;
}

interface StageData {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  fallbackUrl: string;
}

const STAGES: StageData[] = [
  {
    id: 1,
    name: "풍요로운 농산물 수확 (0% ~ 20%)",
    description: "배추, 토마토, 딸기, 사과 등 고품질 원예농산물 수확",
    imageUrl: "/01_produce.png",
    fallbackUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: 2,
    name: "노지 채소 시험포장 (20% ~ 40%)",
    description: "안정 생산기술을 연구하는 줄 맞춰 가꾸어진 노지 채소밭과 생육 토양 기반",
    imageUrl: "/02_field.png",
    fallbackUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: 3,
    name: "첨단 스마트 유리온실 (40% ~ 60%)",
    description: "생육 환경을 정밀 제어하는 현대적인 유리온실 프레임 및 전문 연구자 생육 품질 연구",
    imageUrl: "/03_greenhouse.png",
    fallbackUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: 4,
    name: "IoT 정밀 토양·생육 모니터링 (60% ~ 80%)",
    description: "온실과 시험포장에 설치된 스마트 센서 및 자율주행 소형 농업로봇 정보망 연계",
    imageUrl: "/04_robot.png",
    fallbackUrl: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: 5,
    name: "생육 원격 모니터링 및 드론 (80% ~ 100%)",
    description: "하늘에서 과수원 전체의 생육 상태를 분석하는 원격 6측 정보망과 자율 분석 드론 작동",
    imageUrl: "/05_drones.png",
    fallbackUrl: "https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: 6,
    name: "비전 선포 완료 (100%)",
    description: "국립원예특작과학원이 열어가는 대한민국 원예산업의 풍요롭고 건강한 미래",
    imageUrl: "/06_vision_text.png",
    fallbackUrl: "https://images.unsplash.com/photo-1464226184884-fa280b87c3aa?auto=format&fit=crop&w=1200&q=80"
  }
];

// Reusable Image Component with automatic fallback support
function VisionImage({
  src,
  fallback,
  alt,
  className
}: {
  src: string;
  fallback: string;
  alt: string;
  className: string;
}) {
  const [currentSrc, setCurrentSrc] = React.useState(src);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setCurrentSrc(fallback);
        }
      }}
    />
  );
}

export default function VisionScene({ progress, status, timeLeft, runStartedAt, duration }: VisionSceneProps) {
  const currentPercentage = Math.round(progress * 100);
  const [customImages, setCustomImages] = React.useState<Record<number, string>>({});

  // State to smoothly step through the stages sequentially
  const [displayedStageIndex, setDisplayedStageIndex] = React.useState(0);
  const displayedStageIndexRef = React.useRef(0);
  displayedStageIndexRef.current = displayedStageIndex;

  const criticalStartRef = React.useRef<{
    msLeftAtStart: number;
    indexAtStart: number;
  } | null>(null);

  const lastTransitionTimeRef = React.useRef<number>(0);

  React.useEffect(() => {
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
        console.error("Error fetching custom images:", err);
      }
    };

    fetchCustomImages();
    const interval = setInterval(fetchCustomImages, 3000);
    return () => clearInterval(interval);
  }, []);

  // Unified loop running at 50ms for high-precision transitions
  React.useEffect(() => {
    if (status === "waiting" || status === "countdown") {
      setDisplayedStageIndex(0);
      criticalStartRef.current = null;
      return;
    }

    if (status === "finished" || progress >= 1.0) {
      setDisplayedStageIndex(5);
      criticalStartRef.current = null;
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      
      // Calculate high-precision ms left
      let msLeft = 30000;
      if (runStartedAt !== null) {
        const elapsed = now - runStartedAt;
        msLeft = Math.max(0, (duration * 1000) - elapsed);
      }

      const currentIdx = displayedStageIndexRef.current;

      // Check if we are in the last 10 seconds of active running
      if (status === "running" && msLeft <= 10000 && msLeft > 0) {
        if (criticalStartRef.current === null) {
          criticalStartRef.current = {
            msLeftAtStart: msLeft,
            indexAtStart: currentIdx
          };
        }

        const { msLeftAtStart, indexAtStart } = criticalStartRef.current;
        const remainingStages = 4 - indexAtStart;

        if (remainingStages > 0) {
          const elapsedInCritical = msLeftAtStart - msLeft;
          const stepDurationMs = msLeftAtStart / remainingStages;
          const offset = Math.floor(elapsedInCritical / stepDurationMs);
          const nextIndex = Math.min(4, indexAtStart + offset);

          if (nextIndex > currentIdx) {
            setDisplayedStageIndex(nextIndex);
          }
        } else {
          if (currentIdx < 4) {
            setDisplayedStageIndex(4);
          }
        }
      } else if (status === "running" && msLeft > 10000) {
        // Normal running mode: progress based on client clicks
        criticalStartRef.current = null;

        let targetStageIndex = 0;
        if (currentPercentage >= 80) {
          targetStageIndex = 4;
        } else if (currentPercentage >= 60) {
          targetStageIndex = 3;
        } else if (currentPercentage >= 40) {
          targetStageIndex = 2;
        } else if (currentPercentage >= 20) {
          targetStageIndex = 1;
        } else {
          targetStageIndex = 0;
        }

        if (targetStageIndex > currentIdx) {
          const nextStage = Math.min(4, currentIdx + 1);
          if (nextStage > currentIdx) {
            const timeSinceLastTransition = now - lastTransitionTimeRef.current;
            if (timeSinceLastTransition >= 1800) {
              setDisplayedStageIndex(nextStage);
              lastTransitionTimeRef.current = now;
            }
          }
        } else if (targetStageIndex < currentIdx) {
          setDisplayedStageIndex(targetStageIndex);
          lastTransitionTimeRef.current = now;
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [status, progress, runStartedAt, duration, currentPercentage]);

  const safeIndex = Math.min(5, Math.max(0, displayedStageIndex));

  return (
    <div id="vision-scene-container" className="relative w-full h-full bg-[#0F2F23] overflow-hidden select-none">
      
      {/* Background Slideshow with Smooth CSS Crossfades */}
      <div className="absolute inset-0 bg-[#0F2F23] overflow-hidden">
        {STAGES.map((stage, idx) => {
          const displaySrc = customImages[stage.id] || stage.fallbackUrl;
          const isActive = idx === safeIndex;
          return (
            <div
              key={stage.id}
              className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out ${
                isActive ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-105 pointer-events-none"
              }`}
            >
              <VisionImage
                src={displaySrc}
                fallback={stage.fallbackUrl}
                alt={stage.name}
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>

    </div>
  );
}
