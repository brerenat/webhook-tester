import http from "node:http";
import { Tunnel } from "cloudflared";

const PORT = Number(process.env.PORT) || 3000;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function format(body, req) {
  if (!body) return JSON.stringify(Object.fromEntries(new URL(req.url, "http://x").searchParams));
  try {
    return JSON.stringify(JSON.parse(body));
  } catch {
    return body;
  }
}

// Comma-separated status codes returned in order before falling back to 200,
// e.g. AUTH_STATUSES=503 or DATA_STATUSES=500,429
function parseStatuses(value) {
  return (value || "").split(",").map((s) => s.trim()).filter(Boolean).map(Number);
}

const routes = {
  "/auth": { label: "Auth endpoint called", statuses: parseStatuses(process.env.AUTH_STATUSES), calls: 0 },
  "/data": { label: "Data endpoint called", statuses: parseStatuses(process.env.DATA_STATUSES), calls: 0 },
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  const route = routes[pathname];
  if (!route) {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Not found" }));
  }
  const body = await readBody(req);
  const status = route.statuses[route.calls++] ?? 200;
  console.log(`${route.label}: ${format(body, req)} -> ${status}`);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: status < 400, status }));
});

server.listen(PORT, async () => {
  console.log(`Local server: http://localhost:${PORT}`);
  if (process.argv.includes("--no-tunnel")) return;

  const tunnel = Tunnel.quick(`http://localhost:${PORT}`);
  const publicUrl = await new Promise((resolve) => tunnel.once("url", resolve));
  console.log(`Tunnel ready:\n  Auth: ${publicUrl}/auth\n  Data: ${publicUrl}/data`);

  const shutdown = () => {
    tunnel.stop();
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});
