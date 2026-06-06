import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { createSessionToken } from "./simpleAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { Server as SocketIOServer } from "socket.io";
import { mockRecordings, getStats, generateMockAudioBuffer } from "../mockData";
import type { Socket } from "socket.io";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Simple username/password login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body ?? {};
      if (!username || !password) {
        return res.status(400).json({ error: "username and password required" });
      }

      const adminUser = process.env.ADMIN_USER || "admin";
      const adminPass = process.env.ADMIN_PASS || "password";

      if (username !== adminUser || password !== adminPass) {
        return res.status(401).json({ error: "invalid credentials" });
      }

      const token = await createSessionToken({ username });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return res.json({ success: true });
    } catch (err) {
      console.error("/api/login error", err);
      return res.status(500).json({ error: "login failed" });
    }
  });

  // ─── REST API para gravações ───────────────────────────────────────────────
  // Endpoint para listar gravações — usa bot se configurado, senão mock
  app.get("/api/recordings", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const base = (() => {
      if (ENV.botApiBase) return ENV.botApiBase.replace(/\/+$/, "");
      if (ENV.botHost) {
        const protocol = ENV.botProtocol || "http";
        const port = ENV.botPort ? `:${ENV.botPort}` : "";
        return `${protocol}://${ENV.botHost}${port}/api`;
      }
      return null;
    })();
    if (base) {
      try {
        const headers: Record<string, string> = ENV.botAuthToken ? { Authorization: `Bearer ${ENV.botAuthToken}` } : {};
        const botResp = await fetch(`${base}/recordings`, { headers });
        if (botResp.ok) return res.json(await botResp.json());
      } catch (err) {
        console.warn("[proxy] /api/recordings falhou, usando mock:", err);
      }
    }
    res.json(mockRecordings);
  });

  // Endpoint para estatísticas — usa bot se configurado, senão mock
  app.get("/api/stats", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const base = (() => {
      if (ENV.botApiBase) return ENV.botApiBase.replace(/\/+$/, "");
      if (ENV.botHost) {
        const protocol = ENV.botProtocol || "http";
        const port = ENV.botPort ? `:${ENV.botPort}` : "";
        return `${protocol}://${ENV.botHost}${port}/api`;
      }
      return null;
    })();
    if (base) {
      try {
        const headers: Record<string, string> = ENV.botAuthToken ? { Authorization: `Bearer ${ENV.botAuthToken}` } : {};
        const botResp = await fetch(`${base}/stats`, { headers });
        if (botResp.ok) return res.json(await botResp.json());
      } catch (err) {
        console.warn("[proxy] /api/stats falhou, usando mock:", err);
      }
    }
    res.json(getStats());
  });

  // Endpoint para clips — usa bot se configurado
  app.get("/api/clips", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const base = (() => {
      if (ENV.botApiBase) return ENV.botApiBase.replace(/\/+$/, "");
      if (ENV.botHost) {
        const protocol = ENV.botProtocol || "http";
        const port = ENV.botPort ? `:${ENV.botPort}` : "";
        return `${protocol}://${ENV.botHost}${port}/api`;
      }
      return null;
    })();
    if (base) {
      try {
        const headers: Record<string, string> = ENV.botAuthToken ? { Authorization: `Bearer ${ENV.botAuthToken}` } : {};
        const botResp = await fetch(`${base}/clips`, { headers });
        if (botResp.ok) return res.json(await botResp.json());
      } catch (err) {
        console.warn("[proxy] /api/clips falhou:", err);
      }
    }
    res.json([]);
  });

  // Download de clip — proxy para o bot
  app.get("/api/clips/file/:filename", async (req, res) => {
    const { filename } = req.params;
    const base = (() => {
      if (ENV.botApiBase) return ENV.botApiBase.replace(/\/+$/, "");
      if (ENV.botHost) {
        const protocol = ENV.botProtocol || "http";
        const port = ENV.botPort ? `:${ENV.botPort}` : "";
        return `${protocol}://${ENV.botHost}${port}/api`;
      }
      return null;
    })();
    if (!base) return res.status(404).json({ error: "Bot não configurado" });
    try {
      const headers: Record<string, string> = ENV.botAuthToken ? { Authorization: `Bearer ${ENV.botAuthToken}` } : {};
      const botResp = await fetch(`${base}/clips/file/${encodeURIComponent(filename)}`, { headers });
      if (!botResp.ok) return res.status(botResp.status).json({ error: "Clip não encontrado" });
      const ct = botResp.headers.get("content-type") || "audio/mpeg";
      res.setHeader("Content-Type", ct);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      const buf = await botResp.arrayBuffer();
      res.send(Buffer.from(buf));
    } catch (err) {
      console.error("[proxy] /api/clips/file falhou:", err);
      res.status(502).json({ error: "bot unreachable" });
    }
  });

  // Proxy endpoints to fetch real data from external bot host if configured
  const botBase = (() => {
    if (ENV.botApiBase) return ENV.botApiBase.replace(/\/+$/, "");
    if (ENV.botHost) {
      const protocol = ENV.botProtocol || "http";
      const port = ENV.botPort ? `:${ENV.botPort}` : "";
      return `${protocol}://${ENV.botHost}${port}/api`;
    }
    return null;
  })();

  const botHeaders: Record<string, string> = {
    ...(ENV.botAuthToken ? { Authorization: `Bearer ${ENV.botAuthToken}` } : {}),
  };

  if (botBase) {
    app.get("/api/bot/recordings", async (req, res) => {
      try {
        const url = new URL("/recordings", botBase);
        const botResp = await fetch(url.toString(), { headers: botHeaders });
        if (!botResp.ok) {
          const txt = await botResp.text().catch(() => "");
          return res.status(botResp.status).send(txt || "Bot error");
        }
        const json = await botResp.json();
        res.json(json);
      } catch (err) {
        console.error("/api/bot/recordings proxy failed:", err);
        res.status(502).json({ error: "bot unreachable" });
      }
    });

    app.get("/api/bot/recordings/file/:filename", async (req, res) => {
      const { filename } = req.params;
      try {
        const url = new URL(`/recordings/file/${encodeURIComponent(filename)}`, botBase);
        const botResp = await fetch(url.toString(), {
          headers: {
            ...botHeaders,
            // forward range header if present for streaming
            ...(req.headers.range ? { range: req.headers.range as string } : {}),
          },
        });

        if (!botResp.ok) {
          const txt = await botResp.text().catch(() => "");
          return res.status(botResp.status).send(txt || "Bot error");
        }

        // propagate important headers
        const headersToCopy = [
          "content-type",
          "content-length",
          "content-range",
          "accept-ranges",
          "cache-control",
          "content-disposition",
        ];
        for (const h of headersToCopy) {
          const v = botResp.headers.get(h);
          if (v) res.setHeader(h, v);
        }

        const array = await botResp.arrayBuffer();
        res.send(Buffer.from(array));
      } catch (err) {
        console.error("/api/bot/recordings/file proxy failed:", err);
        res.status(502).json({ error: "bot unreachable" });
      }
    });

    app.get("/api/bot/stats", async (req, res) => {
      try {
        const url = new URL("/stats", botBase);
        const botResp = await fetch(url.toString(), { headers: botHeaders });
        if (!botResp.ok) {
          const txt = await botResp.text().catch(() => "");
          return res.status(botResp.status).send(txt || "Bot error");
        }
        const json = await botResp.json();
        res.json(json);
      } catch (err) {
        console.error("/api/bot/stats proxy failed:", err);
        res.status(502).json({ error: "bot unreachable" });
      }
    });
  }

  app.get("/api/recordings/file/:filename", (req, res) => {
    const { filename } = req.params;
    const download = req.query.download === 'true';
    
    // Verificar se o arquivo existe nos dados mock
    const recording = mockRecordings.find(r => r.filename === filename);
    if (!recording) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Gerar buffer de áudio mock
    const audioBuffer = generateMockAudioBuffer();
    const fileSize = audioBuffer.length;
    
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");
    
    // Suporte a Range requests para seek/streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", chunksize);
      res.send(audioBuffer.slice(start, end + 1));
    } else {
      // Sem Range: servir arquivo completo
      res.setHeader("Content-Length", fileSize);
      
      // Usar Content-Disposition inline para playback direto no navegador
      if (download) {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      } else {
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      }
      
      res.send(audioBuffer);
    }
  });

  // ─── WebSocket para eventos em tempo real ──────────────────────────────────
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[WebSocket] Cliente conectado: ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
    });
  });

  // Simular eventos de gravação a cada 45 segundos
  const recordingInterval = setInterval(() => {
    io.emit("recording:start");
    console.log("[WebSocket] Evento: recording:start");
    setTimeout(() => {
      io.emit("recording:stop");
      console.log("[WebSocket] Evento: recording:stop");
    }, 5000);
  }, 45000);
  
  // Limpar intervalo ao desligar
  process.on('SIGTERM', () => {
    clearInterval(recordingInterval);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Exportar io para uso em outros módulos se necessário
  (server as any).io = io;
  (global as any).recordingIO = io;

  // Limpar recursos ao desligar
  process.on('SIGINT', () => {
    console.log('[Server] Encerrando...');
    io.close();
    server.close(() => {
      console.log('[Server] Servidor encerrado');
      process.exit(0);
    });
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
