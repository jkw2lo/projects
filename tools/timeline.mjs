#!/usr/bin/env node
// Writes timeline.json: for each project in site.json, the days it had commits, so the
// home page can show when each one was built. Commits that only touched the overview
// (its message mentions "overview") don't count: that's writing about the project,
// not building it.
//
//   node tools/timeline.mjs          (GITHUB_TOKEN, if set, lifts the rate limit)
//
// The "Timeline" workflow runs this every day and commits the result when it changes.
// Projects marked "local" in site.json are read from local/<repo>/days.json instead.

import { readFileSync, writeFileSync } from "node:fs";

const OWNER = "jkw2lo";
const SKIP = /overview|about page/i;
const site = JSON.parse(readFileSync(new URL("../site.json", import.meta.url), "utf8"));
const headers = { Accept: "application/vnd.github+json", "User-Agent": "projects-timeline" };
if (process.env.GITHUB_TOKEN) headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN;

async function commits(repo) {
  const out = [];
  for (let page = 1; page < 30; page++) {
    const r = await fetch(`https://api.github.com/repos/${OWNER}/${repo}/commits?per_page=100&page=${page}`, { headers });
    if (!r.ok) throw new Error(repo + ": " + r.status + " " + (await r.text()).slice(0, 200));
    const batch = await r.json();
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

const projects = {};
for (const { repo, local } of site.projects) {
  let days = {};
  // a local-only project (private or not on GitHub) brings its own commit days in local/<repo>/days.json
  if (local) {
    try { days = JSON.parse(readFileSync(new URL(`../local/${repo}/days.json`, import.meta.url), "utf8")).days || {}; } catch {}
  } else for (const c of await commits(repo)) {
    const msg = c.commit.message.split("\n")[0];
    if (SKIP.test(msg) || c.parents.length > 1) continue;
    const day = c.commit.author.date.slice(0, 10);
    days[day] = (days[day] || 0) + 1;
  }
  const list = Object.keys(days).sort();
  if (!list.length) continue;
  projects[repo] = { first: list[0], last: list.at(-1), commits: Object.values(days).reduce((a, b) => a + b, 0), days };
  console.log(repo.padEnd(32), list[0], "→", list.at(-1), projects[repo].commits, "commits");
}

const path = new URL("../timeline.json", import.meta.url);
const next = JSON.stringify({ projects }, null, 2) + "\n";
let prev = "";
try { prev = readFileSync(path, "utf8"); } catch {}
if (prev !== next) writeFileSync(path, next);
console.log(prev === next ? "unchanged" : "wrote timeline.json");
