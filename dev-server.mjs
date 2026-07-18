import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 5173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

async function loadLocalEnv() {
  try {
    const envText = await readFile(join(root, ".env.local"), "utf8");
    envText.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index === -1) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key && !(key in process.env)) process.env[key] = value;
    });
  } catch {
    // Pas de .env.local, le serveur continue normalement.
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

async function proxyFootballData(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const league = url.searchParams.get("league");
  const season = url.searchParams.get("season");

  if (!league || !season || !/^[A-Z0-9]+$/.test(league) || !/^[0-9]{4}$/.test(season)) {
    send(res, 400, JSON.stringify({ error: "Paramètres invalides." }), {
      "content-type": "application/json; charset=utf-8",
    });
    return;
  }

  const remote = `https://www.football-data.co.uk/mmz4281/${season}/${league}.csv`;
  const response = await fetch(remote);
  if (!response.ok) {
    send(res, response.status, JSON.stringify({ error: `Fichier introuvable: ${league}_${season}` }), {
      "content-type": "application/json; charset=utf-8",
    });
    return;
  }

  send(res, 200, await response.text(), {
    "content-type": "text/csv; charset=latin1",
  });
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function liveDateRange(period) {
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (period === "today") return { dateFrom: isoDate(start), dateTo: isoDate(start) };
  if (period === "week") return { dateFrom: isoDate(start), dateTo: isoDate(addDays(start, 7)) };
  return { dateFrom: isoDate(addDays(start, -14)), dateTo: isoDate(addDays(start, 14)) };
}

async function proxyLiveMatches(req, res) {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    send(
      res,
      200,
      JSON.stringify({
        configured: false,
        error: "FOOTBALL_DATA_TOKEN n'est pas configuré dans Vercel.",
        matches: [],
      }),
      { "content-type": "application/json; charset=utf-8" },
    );
    return;
  }

  const url = new URL(req.url, `http://localhost:${port}`);
  const period = ["today", "week", "all"].includes(url.searchParams.get("period")) ? url.searchParams.get("period") : "week";
  const status = url.searchParams.get("status") || "SCHEDULED";
  const { dateFrom, dateTo } = liveDateRange(period);
  const allowedStatuses = new Set(["SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "FINISHED"]);
  const statuses = status
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => allowedStatuses.has(item));

  try {
    const responses = await Promise.all(
      (statuses.length ? statuses : ["SCHEDULED"]).map(async (singleStatus) => {
        const remoteParams = new URLSearchParams({ dateFrom, dateTo, status: singleStatus });
        const response = await fetch(`https://api.football-data.org/v4/matches?${remoteParams.toString()}`, {
          headers: { "X-Auth-Token": token },
        });
        if (!response.ok) {
          const error = new Error(`Football-data ${response.status}`);
          error.status = response.status;
          throw error;
        }
        const payload = await response.json();
        return payload.matches || [];
      }),
    );
    const uniqueMatches = [...new Map(responses.flat().map((match) => [match.id, match])).values()];
    const matches = uniqueMatches.map((match) => ({
      id: String(match.id),
      utcDate: match.utcDate,
      status: match.status,
      competition: match.competition?.name || "",
      home: match.homeTeam?.name || "",
      away: match.awayTeam?.name || "",
      score: {
        home: match.score?.fullTime?.home,
        away: match.score?.fullTime?.away,
      },
    }));
    send(res, 200, JSON.stringify({ configured: true, dateFrom, dateTo, matches }), {
      "content-type": "application/json; charset=utf-8",
    });
  } catch (error) {
    send(
      res,
      error.status || 500,
      JSON.stringify({ configured: true, error: error.message, matches: [] }),
      { "content-type": "application/json; charset=utf-8" },
    );
  }
}

await loadLocalEnv();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === "/api/football-data") {
      await proxyFootballData(req, res);
      return;
    }
    if (url.pathname === "/api/live-matches") {
      await proxyLiveMatches(req, res);
      return;
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(root, safePath);
    const body = await readFile(filePath);
    send(res, 200, body, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
    });
  } catch (error) {
    send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
  }
}).listen(port, () => {
  console.log(`Local preview: http://localhost:${port}`);
});
