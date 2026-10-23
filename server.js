/*
 * LOCAL TEST SERVER — for running the site on your own computer with `npm start`.
 * (Vercel does NOT use this file. Online, Vercel runs /api/generate.js by itself.)
 *
 * It reads your secret settings from a file called .env in this folder:
 *   OPENAI_API_KEY=sk-...
 *   OPENAI_MODEL=...
 * .env is listed in .gitignore, so it will not be uploaded to GitHub.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

// Many home and mobile networks don't handle IPv6 well, which makes calls to
// OpenAI time out (UND_ERR_CONNECT_TIMEOUT). Prefer IPv4 and allow fallback.
require("dns").setDefaultResultOrder("ipv4first");
try { require("net").setDefaultAutoSelectFamily(true); } catch (e) {}

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

// --- Load .env (no extra packages needed) ---
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  });
} else {
  console.warn("\n⚠  No .env file found. The pages will open, but letters cannot be written.");
  console.warn("   Copy .env.example to .env and put your OpenAI key and model name in it.\n");
}

const handler = require("./api/generate.js");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".mp4": "video/mp4", ".webm": "video/webm", ".json": "application/json", ".ico": "image/x-icon"
};
const BLOCKED = [".env", "server.js", "package.json", ".gitignore"];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  // --- API route: behave like Vercel ---
  if (url.pathname === "/api/generate") {
    let raw = "";
    req.on("data", c => { raw += c; if (raw.length > 20000) req.destroy(); });
    req.on("end", () => {
      try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
      res.status = code => { res.statusCode = code; return res; };
      res.json = obj => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); return res; };
      Promise.resolve(handler(req, res)).catch(err => {
        console.error(err);
        if (!res.headersSent) { res.statusCode = 500; res.end('{"error":"Server error"}'); }
      });
    });
    return;
  }

  // --- Static files ---
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === "/") filePath = "/index.html";
  const full = path.normalize(path.join(ROOT, filePath));
  if (!full.startsWith(ROOT) || BLOCKED.includes(path.basename(full))) {
    res.statusCode = 403; return res.end("Not allowed");
  }
  fs.readFile(full, (err, data) => {
    if (err) { res.statusCode = 404; return res.end("Not found"); }
    res.setHeader("Content-Type", TYPES[path.extname(full).toLowerCase()] || "application/octet-stream");
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Community Voice AI is running.`);
  console.log(`   Open this in your browser:  http://localhost:${PORT}\n`);
  console.log(`   Press Ctrl + C to stop.\n`);
});
