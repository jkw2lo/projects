#!/usr/bin/env node
// Makes resume.pdf by printing the site's own #resume page in headless Chrome, so the
// download always matches the page. This repo is served at /projects/ and everything
// else comes from the live site (the other projects' overviews).
//
//   node tools/resume-pdf.mjs        (CHROME=/path/to/chrome to override)
//
// The "Resume PDF" workflow runs this whenever resume.json or the site's code changes.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
if (!existsSync(join(root, "resume.json"))) { console.log("no resume.json, nothing to do"); process.exit(0); }
const CHROME = process.env.CHROME || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"
].find(existsSync);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.startsWith("/projects/")) {
    let file = normalize(join(root, path.slice("/projects/".length)));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }).end(readFileSync(file));
    return;
  }
  const r = await fetch("https://jkw2lo.github.io" + path).catch(() => null);
  if (!r) { res.writeHead(502).end(); return; }
  res.writeHead(r.status, { "Content-Type": r.headers.get("content-type") || "application/octet-stream" }).end(Buffer.from(await r.arrayBuffer()));
});
server.listen(0, "127.0.0.1", () => {
  const url = "http://127.0.0.1:" + server.address().port + "/projects/#resume";
  const out = join(root, "resume.pdf");
  const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
    "--run-all-compositor-stages-before-draw", "--virtual-time-budget=15000", "--print-to-pdf=" + out, url], { stdio: "inherit" });
  chrome.on("exit", (code) => {
    server.close();
    if (code) { console.error("Chrome exited with " + code); process.exit(1); }
    console.log("wrote resume.pdf");
  });
});
