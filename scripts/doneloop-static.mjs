import { existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";

const ROOT_FILES = new Set([
  "index.html",
  "style.css",
  "script.js",
  "services.html",
  "how-it-works.html",
  "problem-passport.html",
  "submit-problem.html",
  "about.html",
  "404.html",
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function mimeFor(rel) {
  const dot = rel.lastIndexOf(".");
  const ext = dot === -1 ? "" : rel.slice(dot).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

function attach(middlewares, root) {
  const rootPrefix = normalize(root + sep);
  middlewares.use((req, res, next) => {
    const raw = req.url ?? "/";
    if (raw.includes("install=1")) {
      next();
      return;
    }
    const method = (req.method ?? "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      next();
      return;
    }
    let pathOnly = raw.split("?")[0] ?? "/";
    try {
      pathOnly = decodeURIComponent(pathOnly);
    } catch {
      next();
      return;
    }
    const rel = pathOnly === "/" ? "index.html" : pathOnly.replace(/^\/+/, "");
    if (!rel || rel.includes("\0") || rel.split("/").includes("..")) {
      next();
      return;
    }
    if (!ROOT_FILES.has(rel) && !rel.startsWith("assets/")) {
      next();
      return;
    }
    const file = normalize(join(root, rel));
    if (file !== rootPrefix.slice(0, -1) && !file.startsWith(rootPrefix)) {
      next();
      return;
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      next();
      return;
    }
    res.statusCode = 200;
    res.setHeader("content-type", mimeFor(rel));
    res.setHeader("cache-control", "no-cache");
    if (method === "HEAD") {
      res.end();
      return;
    }
    res.end(readFileSync(file));
  });
}

/** Serve the GitHub Pages site for dev and preview without a backend. */
export function doneLoopStaticSite() {
  return {
    name: "doneloop-static-site",
    configureServer(server) {
      attach(server.middlewares, server.config.root);
    },
    configurePreviewServer(server) {
      attach(server.middlewares, server.config.root);
    },
  };
}
