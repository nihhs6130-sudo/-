import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

interface EventState {
  status: 'waiting' | 'countdown' | 'running' | 'finished';
  targetClicks: number;
  duration: number; // in seconds (default 30)
  countdownDuration: number; // in seconds (default 3)
  totalClicks: number;
  actualProgress: number; // 0.0 ~ 1.0
  screenProgress: number; // 0.0 ~ 1.0 (with auto-boost)
  startedAt: number | null; // server timestamp (ms) when countdown started
  runStartedAt: number | null; // server timestamp (ms) when running actually started
  activeUsers: number;
  customImagesVersion: number;
  standbyImageVersion: number;
}

// Global server-side state
let state: EventState = {
  status: 'waiting',
  targetClicks: 1000,
  duration: 30,
  countdownDuration: 3,
  totalClicks: 0,
  actualProgress: 0,
  screenProgress: 0,
  startedAt: null,
  runStartedAt: null,
  activeUsers: 0,
  customImagesVersion: 1,
  standbyImageVersion: 1
};

// Store uploaded custom images (stageId -> base64 string)
let customImages: Record<number, string> = {};

// Store uploaded standby background image (base64 string)
let standbyImage: string = "";

// Track active sessions
const activeSessions: Record<string, number> = {}; // sessionId -> timestamp

// SSE clients list
let sseClients: any[] = [];

// Clean up stale sessions and broadcast active user count
function updateActiveUsers() {
  const now = Date.now();
  let changed = false;
  
  for (const [sid, ts] of Object.entries(activeSessions)) {
    if (now - ts > 8000) { // 8 seconds of inactivity means offline
      delete activeSessions[sid];
      changed = true;
    }
  }
  
  const count = Object.keys(activeSessions).length;
  if (count !== state.activeUsers || changed) {
    state.activeUsers = count;
    broadcastState();
  }
}

// Calculate precise current state (advancing countdown, running timers, applying auto-boost)
function tickState() {
  const now = Date.now();
  let changed = false;

  if (state.status === 'countdown' && state.startedAt !== null) {
    const elapsed = now - state.startedAt;
    const countdownMs = state.countdownDuration * 1000;
    
    if (elapsed >= countdownMs) {
      state.status = 'running';
      state.runStartedAt = state.startedAt + countdownMs;
      changed = true;
    }
  }

  if (state.status === 'running' && state.runStartedAt !== null) {
    const elapsedRun = now - state.runStartedAt;
    const runMs = state.duration * 1000;
    const timeLeftSec = Math.max(0, state.duration - (elapsedRun / 1000));

    // Calculate actual progress based on user clicks
    const actualP = Math.min(1.0, state.totalClicks / state.targetClicks);
    state.actualProgress = actualP;

    // Time elapsed ratio (0.0 to 1.0)
    const elapsedTimeRatio = Math.min(1.0, elapsedRun / runMs);

    let calculatedProgress = actualP;

    // 1) Over-performing: If clicks are too fast and would reach 100% before the duration ends
    if (actualP > elapsedTimeRatio) {
      // Apply a dynamic damping/slowing function so that we guide it to reach 100% exactly at the end
      const dampFactor = (1.0 - elapsedTimeRatio) * 0.4; // custom damp factor that goes to 0 as time approaches end
      calculatedProgress = elapsedTimeRatio + (actualP - elapsedTimeRatio) * dampFactor;
    }

    // Ensure we do not hit exactly 100% until the timer completes, unless forced at the very end
    if (timeLeftSec > 0.1) {
      calculatedProgress = Math.min(0.99, calculatedProgress);
    }

    // 2) Under-performing: If clicks are too slow or target won't be reached
    // If 10 seconds or less remain, force a floor of at least 90%, smoothly scaling to 100% at the end
    if (timeLeftSec <= 10 && timeLeftSec >= 0) {
      const remainingRatio = (10 - timeLeftSec) / 10; // 0.0 at 10s left, 1.0 at 0s left
      
      let baseFloor = 0.90;
      // If they already clicked past 90%, start the interpolation floor from their actual percentage
      if (actualP >= 0.90) {
        baseFloor = actualP;
      }

      const forceFloor = baseFloor + (1.00 - baseFloor) * remainingRatio;
      calculatedProgress = Math.max(calculatedProgress, forceFloor);
    }

    // Ensure screenProgress never decreases during a run
    state.screenProgress = Math.max(state.screenProgress, calculatedProgress);

    if (elapsedRun >= runMs) {
      state.status = 'finished';
      state.screenProgress = 1.0; // fully complete
      changed = true;
    }
  } else if (state.status === 'finished') {
    state.screenProgress = 1.0;
  } else if (state.status === 'waiting') {
    state.actualProgress = 0;
    state.screenProgress = 0;
  }

  return changed;
}

// Send current state to all connected SSE clients
function broadcastState() {
  tickState();
  const payload = JSON.stringify({ ...state, serverTime: Date.now() });
  sseClients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
}

// Background tick every 100ms for timers and active session cleanup
setInterval(() => {
  const stateChanged = tickState();
  updateActiveUsers();
  if (stateChanged || state.status === 'running' || state.status === 'countdown') {
    broadcastState();
  }
}, 100);

// Virtual click simulator (for testing/rehearsals)
let virtualClicksInterval: NodeJS.Timeout | null = null;
let isVirtualEnabled = false;

function toggleVirtualClicks(enable: boolean, clicksPerSec: number = 25) {
  isVirtualEnabled = enable;
  if (virtualClicksInterval) {
    clearInterval(virtualClicksInterval);
    virtualClicksInterval = null;
  }
  
  if (enable) {
    virtualClicksInterval = setInterval(() => {
      if (state.status === 'running') {
        const increment = Math.ceil(clicksPerSec / 10);
        state.totalClicks += increment;
        state.actualProgress = Math.min(1.0, state.totalClicks / state.targetClicks);
        broadcastState();
      }
    }, 100);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Custom stage images API
  app.get("/api/custom-images", (req, res) => {
    res.json(customImages);
  });

  // Standby image API
  app.get("/api/standby-image", (req, res) => {
    res.json({ standbyImage });
  });

  app.post("/api/admin/upload-image", (req, res) => {
    const { stageId, base64Data, password } = req.body;
    if (password !== "1111") {
      return res.status(403).json({ error: "비밀번호가 일치하지 않습니다. (1111)" });
    }
    const id = Number(stageId);
    if (id >= 1 && id <= 6) {
      customImages[id] = base64Data;
      state.customImagesVersion += 1;
      tickState();
      broadcastState();
      res.json({ success: true, version: state.customImagesVersion });
    } else {
      res.status(400).json({ error: "올바르지 않은 단계 ID입니다." });
    }
  });

  app.post("/api/admin/upload-standby-image", (req, res) => {
    const { base64Data, password } = req.body;
    if (password !== "1111") {
      return res.status(403).json({ error: "비밀번호가 일치하지 않습니다. (1111)" });
    }
    standbyImage = base64Data;
    state.standbyImageVersion += 1;
    tickState();
    broadcastState();
    res.json({ success: true, version: state.standbyImageVersion });
  });

  app.post("/api/admin/reset-standby-image", (req, res) => {
    const { password } = req.body;
    if (password !== "1111") {
      return res.status(403).json({ error: "비밀번호가 일치하지 않습니다. (1111)" });
    }
    standbyImage = "";
    state.standbyImageVersion += 1;
    tickState();
    broadcastState();
    res.json({ success: true, version: state.standbyImageVersion });
  });

  app.post("/api/admin/reset-images", (req, res) => {
    const { password } = req.body;
    if (password !== "1111") {
      return res.status(403).json({ error: "비밀번호가 일치하지 않습니다. (1111)" });
    }
    customImages = {};
    state.customImagesVersion += 1;
    tickState();
    broadcastState();
    res.json({ success: true, version: state.customImagesVersion });
  });

  // API Endpoints
  // Get current state
  app.get("/api/state", (req, res) => {
    tickState();
    res.json({ ...state, serverTime: Date.now(), isVirtualEnabled });
  });

  // Client click submission & state sync
  app.post("/api/sync", (req, res) => {
    const { sessionId, clicks } = req.body;

    if (sessionId) {
      activeSessions[sessionId] = Date.now();
    }

    // Only count clicks if the event is running
    if (state.status === 'running' && typeof clicks === 'number' && clicks > 0) {
      // Rate limiting: Limit maximum incoming clicks per 500ms to 20 to prevent auto-clickers
      const safeClicks = Math.min(20, clicks);
      state.totalClicks += safeClicks;
      state.actualProgress = Math.min(1.0, state.totalClicks / state.targetClicks);
    }

    tickState();
    res.json({ ...state, serverTime: Date.now() });
  });

  // Real-time Event Stream (SSE)
  app.get("/api/state/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const client = res;
    sseClients.push(client);

    // Initial broadcast
    tickState();
    client.write(`data: ${JSON.stringify({ ...state, serverTime: Date.now() })}\n\n`);

    req.on("close", () => {
      sseClients = sseClients.filter(c => c !== client);
    });
  });

  // Admin control endpoints (Secret: 1111)
  app.post("/api/admin/control", (req, res) => {
    const { action, password, settings, virtualRate } = req.body;

    if (password !== "1111") {
      return res.status(403).json({ error: "비밀번호가 일치하지 않습니다. (1111)" });
    }

    if (action === "updateSettings") {
      if (state.status !== "waiting") {
        return res.status(400).json({ error: "행사가 진행 중일 때는 설정을 변경할 수 없습니다." });
      }
      if (settings) {
        state.targetClicks = Math.max(10, Number(settings.targetClicks) || 1000);
        state.duration = Math.max(5, Number(settings.duration) || 30);
        state.countdownDuration = Math.max(1, Number(settings.countdownDuration) || 3);
      }
    } else if (action === "prepare") {
      state.status = 'waiting';
      state.totalClicks = 0;
      state.actualProgress = 0;
      state.screenProgress = 0;
      state.startedAt = null;
      state.runStartedAt = null;
    } else if (action === "startCountdown") {
      if (state.status === 'waiting') {
        state.status = 'countdown';
        state.startedAt = Date.now();
        state.totalClicks = 0;
        state.actualProgress = 0;
        state.screenProgress = 0;
      }
    } else if (action === "pause") {
      // Pause is supported by freezing countdown/running
      if (state.status === 'running' || state.status === 'countdown') {
        // Simple mock pause (transition to waiting or pause state)
        // For standard event logic, we can keep it simple or toggle status
      }
    } else if (action === "resume") {
      // Resume action
    } else if (action === "forceFinish") {
      state.status = 'finished';
      state.totalClicks = state.targetClicks;
      state.actualProgress = 1.0;
      state.screenProgress = 1.0;
    } else if (action === "reset") {
      state.status = 'waiting';
      state.totalClicks = 0;
      state.actualProgress = 0;
      state.screenProgress = 0;
      state.startedAt = null;
      state.runStartedAt = null;
      toggleVirtualClicks(false);
    } else if (action === "toggleVirtual") {
      toggleVirtualClicks(!isVirtualEnabled, virtualRate || 25);
    } else if (action === "addClicks") {
      if (state.status === 'running') {
        state.totalClicks += Number(req.body.count) || 100;
        state.actualProgress = Math.min(1.0, state.totalClicks / state.targetClicks);
      }
    }

    tickState();
    broadcastState();
    res.json({ ...state, serverTime: Date.now(), isVirtualEnabled, success: true });
  });

  // Serve static assets
  let currentDir = "";
  try {
    if (typeof __dirname !== "undefined") {
      currentDir = __dirname;
    } else {
      currentDir = path.dirname(fileURLToPath(import.meta.url));
    }
  } catch (e) {
    currentDir = process.cwd();
  }

  const isProduction = currentDir.endsWith("dist") || currentDir.includes("/dist");

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    // In production, server.cjs is in the dist/ folder, so currentDir is the dist/ folder itself.
    const distPath = currentDir;
    app.use(express.static(distPath));
    
    // Shield API routes from wildcard SPA fallback to prevent parsing index.html as JSON
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: "API route not found" });
      }
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          console.error("Error sending index.html from distPath:", err);
          res.status(500).send("Server Error: Static assets not built properly.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[원예특작 비전선포] Server running on port ${PORT}`);
  });
}

startServer();
